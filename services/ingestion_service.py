from pathlib import Path

from pypdf import PdfReader

from sqlalchemy.ext.asyncio import AsyncSession

from db.session import async_session_maker
from db.models import Document, DocumentChunk
from core.text_splitter import simple_chunk_text
from embeddings.factory import get_embedding_model
from vector_store.factory import get_vector_store


def extract_document_text(file_path: str) -> str:
    """Extract readable text from a supported document."""

    path = Path(file_path)
    extension = path.suffix.lower()

    if extension == ".pdf":
        reader = PdfReader(str(path))

        pages = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            pages.append(page_text)

        return "\n".join(pages)

    elif extension in {".txt", ".md", ".csv"}:
        return path.read_text(encoding="utf-8-sig")

    else:
        raise ValueError(
            f"Unsupported file type: {extension}. "
            "Supported formats: PDF, TXT, MD, CSV."
        )


class IngestionService:

    @staticmethod
    async def process_document(document_id: str):

        async with async_session_maker() as db:

            document = await db.get(Document, document_id)

            if not document:
                return

            try:
                # 1. Mark document as processing
                document.status = "processing"
                await db.commit()

                # 2. Extract actual text from the file
                text = extract_document_text(document.file_path)

                if not text.strip():
                    raise ValueError(
                        "No readable text found in the document. "
                        "If this is a scanned PDF, OCR may be required."
                    )

                # 3. Split extracted text into chunks
                chunks = simple_chunk_text(text)

                if not chunks:
                    raise ValueError(
                        "Text splitting produced no chunks."
                    )

                # 4. Store text chunks in PostgreSQL
                chunk_objects = []

                for idx, chunk_text in enumerate(chunks):
                    chunk = DocumentChunk(
                        document_id=document.id,
                        company_id=document.company_id,
                        content=chunk_text,
                        chunk_index=str(idx),
                    )
                    chunk_objects.append(chunk)

                db.add_all(chunk_objects)
                await db.commit()

                # Retrieve generated database IDs
                for chunk in chunk_objects:
                    await db.refresh(chunk)

                # 5. Generate embeddings from extracted text chunks
                embedding_model = get_embedding_model()

                texts = [chunk.content for chunk in chunk_objects]

                embeddings = await embedding_model.embed_documents(
                    texts
                )

                # 6. Store embeddings in FAISS
                # Keep each company's vectors isolated
                namespace = f"company_{document.company_id}"

                vector_store = get_vector_store()

                await vector_store.add_documents(
                    namespace=namespace,
                    embeddings=embeddings,
                    documents=texts,
                    metadatas=[
                        {
                            "chunk_id": str(chunk.id),
                            "document_id": str(document.id),
                            "company_id": str(document.company_id),
                        }
                        for chunk in chunk_objects
                    ],
                )

                # 7. Mark ingestion as completed
                document.status = "completed"
                await db.commit()

            except Exception:
                # First recover the failed transaction
                await db.rollback()

                # Then attempt to record the failure
                try:
                    document = await db.get(
                        Document, document_id
                    )

                    if document:
                        document.status = "failed"
                        await db.commit()

                except Exception:
                    await db.rollback()

                # Preserve the original exception
                raise