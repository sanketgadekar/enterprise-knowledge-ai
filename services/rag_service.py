from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.retrieval_service import RetrievalService
from db.models import Company
from llm.factory import get_llm


class RAGService:

    @staticmethod
    async def generate_answer(
        db: AsyncSession,
        company_id: str,
        query: str,
    ) -> dict:

        # 1️⃣ Get company config
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()

        if not company:
            return {
                "answer": "Company not found.",
                "sources": [],
            }

        # 2️⃣ Retrieve context
        chunks: List[str] = await RetrievalService.retrieve_context(
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

        # 3️⃣ Build prompt
        context_text = "\n\n".join(chunks)

        system_prompt = """
You are an enterprise AI assistant.
Answer strictly using the provided context.
If the answer is not in the context, say you don't know.
"""

        user_prompt = f"""
Context:
{context_text}

Question:
{query}
"""

        # 4️⃣ Get correct LLM
        llm = get_llm(company)

        answer = await llm.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        return {
            "answer": answer,
            "sources": chunks,
        }
