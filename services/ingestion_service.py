from sqlalchemy.ext.asyncio import AsyncSession
from db.session import async_session_maker
from db.models import Document

from embeddings.factory import get_embedding_model
from vector_store.faiss_store import FAISSVectorStore


class IngestionService:

    @staticmethod
    async def process_document(document_id):
        async with async_session_maker() as db:

            document = await db.get(Document, document_id)

            if not document:
                return

            try:
                document.status = "processing"
                await db.commit()

                # 1️⃣ Load file
                with open(document.file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()

                # 2️⃣ Chunk (temporary simple split)
                chunks = [text[i:i+1000] for i in range(0, len(text), 1000)]

                # 3️⃣ Embed
                embedding_model = get_embedding_model()
                embeddings = await embedding_model.embed_documents(chunks)

                # 4️⃣ Store in vector store
                namespace = f"company_{document.company_id}"

                vector_store = FAISSVectorStore()
                await vector_store.add_documents(
                    namespace=namespace,
                    embeddings=embeddings,
                    documents=chunks,
                    metadatas=[
                        {
                            "document_id": str(document.id),
                            "company_id": str(document.company_id),
                        }
                        for _ in chunks
                    ],
                )

                document.status = "completed"
                await db.commit()

            except Exception:
                document.status = "failed"
                await db.commit()
