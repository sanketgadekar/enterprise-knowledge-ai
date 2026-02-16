from sqlalchemy.ext.asyncio import AsyncSession
from db.session import async_session_maker
from db.models import Document, DocumentChunk
from core.text_splitter import simple_chunk_text
from embeddings.factory import get_embedding_model
from vector_store.factory import get_vector_store


class IngestionService:

    @staticmethod
    async def process_document(document_id: str):

        async with async_session_maker() as db:

            document = await db.get(Document, document_id)

            if not document:
                return

            try:
                # --------------------------------------------------
                # 1️⃣ Mark document as processing
                # --------------------------------------------------
                document.status = "processing"
                await db.commit()

                # --------------------------------------------------
                # 2️⃣ Load file content
                # --------------------------------------------------
                with open(
                    document.file_path,
                    "r",
                    encoding="utf-8",
                    errors="ignore"
                ) as f:
                    text = f.read()

                # --------------------------------------------------
                # 3️⃣ Split text into chunks
                # --------------------------------------------------
                chunks = simple_chunk_text(text)

                if not chunks:
                    document.status = "failed"
                    await db.commit()
                    return

                # --------------------------------------------------
                # 4️⃣ Store chunks in SQL
                # --------------------------------------------------
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

                # Refresh to get chunk IDs
                for chunk in chunk_objects:
                    await db.refresh(chunk)

                # --------------------------------------------------
                # 5️⃣ Generate embeddings
                # --------------------------------------------------
                embedding_model = get_embedding_model()

                texts = [chunk.content for chunk in chunk_objects]

                embeddings = await embedding_model.embed_documents(texts)

                # --------------------------------------------------
                # 6️⃣ Store embeddings in FAISS (isolated per company)
                # --------------------------------------------------
                vector_store = get_vector_store()

                await vector_store.add_embeddings(
                    company_id=str(document.company_id),
                    ids=[str(chunk.id) for chunk in chunk_objects],
                    embeddings=embeddings,
                )

                # --------------------------------------------------
                # 7️⃣ Mark as completed
                # --------------------------------------------------
                document.status = "completed"
                await db.commit()

            except Exception:
                document.status = "failed"
                await db.commit()
                raise
