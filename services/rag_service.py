from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.retrieval_service import RetrievalService
from llm.factory import get_llm
from db.models import Company, ChatMessage


class RAGService:

    @staticmethod
    async def generate_answer(
        db: AsyncSession,
        company_id: str,
        query: str,
        session_id: str,
    ) -> Dict:

        # -------------------------------------------------
        # 1️⃣ Get company (for LLM provider selection)
        # -------------------------------------------------
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()

        if not company:
            return {
                "answer": "Company not found.",
                "sources": [],
            }

        # -------------------------------------------------
        # 2️⃣ Load recent conversation history
        # -------------------------------------------------
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(5)
        )

        history_messages = history_result.scalars().all()

        history_text = ""
        for msg in reversed(history_messages):
            history_text += f"{msg.role.upper()}: {msg.content}\n"

        # -------------------------------------------------
        # 3️⃣ Retrieve structured chunks
        # -------------------------------------------------
        chunks: List[Dict] = await RetrievalService.retrieve_context(
            db=db,
            company_id=company_id,
            query=query,
            top_k=5,
        )

        if not chunks:
            return {
                "answer": "I could not find relevant information in your documents.",
                "sources": [],
            }

        # -------------------------------------------------
        # 4️⃣ Build structured context
        # -------------------------------------------------
        formatted_chunks = []

        for chunk in chunks:
            formatted_chunks.append(
                f"[Chunk {chunk['chunk_index']}]\n{chunk['content']}"
            )

        context_text = "\n\n".join(formatted_chunks)

        system_prompt = """
You are an enterprise AI assistant.
Answer strictly using the provided context.
Cite the chunk number like [Chunk 2] when referencing.
If the answer is not in the context, say you don't know.
"""

        user_prompt = f"""
Previous Conversation:
{history_text}

Context:
{context_text}

Current Question:
{query}
"""

        # -------------------------------------------------
        # 5️⃣ Get LLM for THIS company
        # -------------------------------------------------
        llm = get_llm(company)

        answer = await llm.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        # -------------------------------------------------
        # 6️⃣ Return structured response
        # -------------------------------------------------
        return {
            "answer": answer,
            "sources": [
                {
                    "chunk_id": chunk["chunk_id"],
                    "document_id": chunk["document_id"],
                    "chunk_index": chunk["chunk_index"],
                }
                for chunk in chunks
            ],
        }
