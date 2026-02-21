from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import DocumentChunk
from embeddings.factory import get_embedding_model
from vector_store.factory import get_vector_store


KEYWORD_LIMIT = 5
VECTOR_LIMIT = 6
FINAL_LIMIT = 5


class RetrievalService:

    @staticmethod
    async def retrieve_context(
        db: AsyncSession,
        company_id: str,
        query: str,
        top_k: int = VECTOR_LIMIT,
    ) -> List[Dict]:

        # --------------------------------------------------
        # 1️⃣ Vector Search (NO company_id here)
        # --------------------------------------------------
        embedding_model = get_embedding_model()
        query_embedding = await embedding_model.embed_query(query)

        vector_store = get_vector_store()

        vector_chunk_ids = await vector_store.similarity_search(
            query_embedding=query_embedding,
            top_k=top_k,
        )

        vector_chunks = []
        if vector_chunk_ids:
            result = await db.execute(
                select(DocumentChunk).where(
                    DocumentChunk.id.in_(vector_chunk_ids),
                    DocumentChunk.company_id == company_id,
                )
            )
            vector_chunks = result.scalars().all()

        # --------------------------------------------------
        # 2️⃣ Keyword Search (ILIKE)
        # --------------------------------------------------
        keyword_result = await db.execute(
            select(DocumentChunk)
            .where(
                DocumentChunk.company_id == company_id,
                DocumentChunk.content.ilike(f"%{query}%"),
            )
            .limit(KEYWORD_LIMIT)
        )

        keyword_chunks = keyword_result.scalars().all()

        # --------------------------------------------------
        # 3️⃣ Merge & Deduplicate
        # --------------------------------------------------
        combined = {chunk.id: chunk for chunk in vector_chunks}

        for chunk in keyword_chunks:
            combined[chunk.id] = chunk

        # --------------------------------------------------
        # 4️⃣ Final Structured Output
        # --------------------------------------------------
        final_chunks = list(combined.values())[:FINAL_LIMIT]

        return [
            {
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
            }
            for chunk in final_chunks
        ]