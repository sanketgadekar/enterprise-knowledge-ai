from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from embeddings.factory import get_embedding_model
from vector_store.factory import get_vector_store
from db.models import DocumentChunk


class RetrievalService:

    @staticmethod
    async def retrieve_context(
        db: AsyncSession,
        company_id: str,
        query: str,
        top_k: int = 5,
    ) -> List[Dict]:

        # 1️⃣ Embed query
        embedding_model = get_embedding_model()
        query_embedding = await embedding_model.embed_query(query)

        # 2️⃣ Search FAISS
        namespace = f"company_{company_id}"
        vector_store = get_vector_store()

        search_results = await vector_store.similarity_search(
            namespace=namespace,
            query_embedding=query_embedding,
            top_k=top_k,
        )

        if not search_results:
            return []

        chunk_ids = [
            item["metadata"]["chunk_id"]
            for item in search_results
            if "metadata" in item and "chunk_id" in item["metadata"]
        ]

        if not chunk_ids:
            return []

        # 3️⃣ Fetch full chunk objects from SQL
        result = await db.execute(
            select(DocumentChunk).where(
                DocumentChunk.id.in_(chunk_ids),
                DocumentChunk.company_id == company_id,
            )
        )

        chunks = result.scalars().all()

        # 4️⃣ Return structured data
        return [
            {
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
            }
            for chunk in chunks
        ]
