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

        namespace = f"company_{company_id}"

        embedding_model = get_embedding_model()
        query_embedding = await embedding_model.embed_query(query)

        vector_store = get_vector_store()

        raw_vector_results = await vector_store.similarity_search(
            namespace,
            query_embedding,
            top_k,
        )

        # --------------------------------------------
        # Normalize FAISS output
        # --------------------------------------------
        vector_chunks = []

        if raw_vector_results:
            for item in raw_vector_results:

                # Case 1: already structured dict
                if isinstance(item, dict) and "chunk_id" in item:
                    vector_chunks.append(item)

                # Case 2: FAISS returns dict with metadata
                elif isinstance(item, dict) and "metadata" in item:
                    metadata = item.get("metadata", {})

                    vector_chunks.append({
                        "chunk_id": metadata.get("chunk_id"),
                        "document_id": metadata.get("document_id"),
                        "chunk_index": metadata.get("chunk_index"),
                        "content": item.get("document"),
                    })

                else:
                    # Unknown format — skip safely
                    continue

        # --------------------------------------------
        # Keyword Search
        # --------------------------------------------
        keyword_result = await db.execute(
            select(DocumentChunk)
            .where(
                DocumentChunk.company_id == company_id,
                DocumentChunk.content.ilike(f"%{query}%"),
            )
            .limit(KEYWORD_LIMIT)
        )

        keyword_chunks = keyword_result.scalars().all()

        keyword_dicts = [
            {
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
            }
            for chunk in keyword_chunks
        ]

        # --------------------------------------------
        # Merge & Deduplicate
        # --------------------------------------------
        combined = {}

        for chunk in vector_chunks:
            if chunk.get("chunk_id"):
                combined[chunk["chunk_id"]] = chunk

        for chunk in keyword_dicts:
            if chunk["chunk_id"] not in combined:
                combined[chunk["chunk_id"]] = chunk

        final_chunks = list(combined.values())[:FINAL_LIMIT]

        return final_chunks