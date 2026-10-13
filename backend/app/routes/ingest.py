import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import Document
from app.dependencies.permission import require_permission
from core.permissions import Permission
from services.ingestion_service import IngestionService


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
