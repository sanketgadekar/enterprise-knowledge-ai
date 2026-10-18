import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import Document
from app.dependencies.permission import require_permission
from core.permissions import Permission
from services.ingestion_service import IngestionService
from pathlib import Path
from uuid import UUID

from sqlalchemy import delete, select
from db.models import Document, DocumentChunk
from vector_store.factory import get_vector_store


router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_permission(Permission.DOCUMENT_UPLOAD)),
):
    company_id = current_user["company_id"]
    document_id = uuid.uuid4()

    company_folder = f"storage/files/company_{company_id}"
    os.makedirs(company_folder, exist_ok=True)

    file_path = os.path.join(company_folder, f"{document_id}_{file.filename}")

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    new_doc = Document(
        id=document_id,
        company_id=company_id,
        filename=file.filename,
        file_path=file_path,
        status="pending",
    )

    db.add(new_doc)
    await db.commit()

    background_tasks.add_task(
        IngestionService.process_document,
        document_id,
    )

    return {
        "document_id": str(document_id),
        "status": "processing started",
    }


@router.get("/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(
        require_permission(Permission.DOCUMENT_SEARCH)
    ),
):
    result = await db.execute(
        select(Document)
        .where(Document.company_id == current_user["company_id"])
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()

    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status,
            "created_at": doc.created_at.isoformat(),
        }
        for doc in documents
    ]


@router.delete("/documents/{document_id}")
async def permanently_delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(
        require_permission(Permission.DOCUMENT_DELETE)
    ),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.company_id == current_user["company_id"],
        )
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    # Do not delete while a background ingestion job may still
    # be writing vectors. Pending jobs must finish or be cancelled.
    if document.status in {"pending", "processing"}:
        raise HTTPException(
            status_code=409,
            detail="This document is still processing. "
                   "Wait until processing finishes before deleting it.",
        )

    namespace = f"company_{document.company_id}"
    file_path = Path(document.file_path).resolve()
    company_folder = (
        Path("storage/files").resolve()
        / f"company_{document.company_id}"
    ).resolve()

    # Only delete files within this company's upload directory.
    if file_path.parent != company_folder:
        raise HTTPException(
            status_code=500,
            detail="Document storage path failed validation.",
        )

    # 1. Remove vectors and matching FAISS metadata.
    try:
        vector_store = get_vector_store()
        await vector_store.delete_by_document(
            namespace=namespace,
            document_id=str(document.id),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Vector deletion failed. Database record retained.",
        ) from exc

    # 2. Remove the original file.
    try:
        if file_path.exists():
            if not file_path.is_file():
                raise OSError("Expected a regular uploaded file.")
            file_path.unlink()
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Vector deletion completed, but file deletion failed. "
                   "Retry deletion after resolving the file error.",
        ) from exc

    # 3. Remove the document chunks and document record.
    try:
        await db.execute(
            delete(DocumentChunk).where(
                DocumentChunk.document_id == document.id,
                DocumentChunk.company_id == document.company_id,
            )
        )
        await db.delete(document)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail="File and vector deletion may have completed, "
                   "but database deletion failed. Reconciliation is needed.",
        ) from exc

    return {
        "success": True,
        "document_id": str(document.id),
        "message": "Document and its stored content deleted.",
    }
