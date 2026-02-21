from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.responses import StreamingResponse

from services.retrieval_service import RetrievalService
from llm.factory import get_llm
from db.models import Company, ChatMessage, ChatSession


MAX_CONTEXT_CHARS = 2500
INITIAL_RETRIEVAL_K = 6
FINAL_CHUNK_LIMIT = 3
RECENT_MESSAGE_LIMIT = 4
COMPRESSION_THRESHOLD = 10


class RAGService:

    # =====================================================
    # NORMAL RESPONSE
    # =====================================================
    @staticmethod
    async def generate_answer(
        db: AsyncSession,
        company_id: str,
        query: str,
        session_id: str,
    ) -> Dict:

        company = await RAGService._get_company(db, company_id)
        if not company:
            return {"answer": "Company not found.", "sources": []}

        history_text = await RAGService._get_conversation_history(
            db, session_id
        )

        filtered_chunks, context_text = await RAGService._build_context(
            db, company_id, query
        )

        if not filtered_chunks:
            return {
                "answer": "I could not find relevant information in your documents.",
                "sources": [],
            }

        system_prompt, user_prompt = RAGService._build_prompt(
            history_text, context_text, query
        )

        llm = get_llm(company)

        answer = await llm.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        await RAGService._save_messages(
            db, session_id, query, answer, company
        )

        return {
            "answer": answer,
            "sources": RAGService._format_sources(filtered_chunks),
        }

    # =====================================================
    # STREAMING RESPONSE
    # =====================================================
    @staticmethod
    async def stream_answer(
        db: AsyncSession,
        company_id: str,
        query: str,
        session_id: str,
    ):

        company = await RAGService._get_company(db, company_id)
        history_text = await RAGService._get_conversation_history(
            db, session_id
        )
        filtered_chunks, context_text = await RAGService._build_context(
            db, company_id, query
        )

        system_prompt, user_prompt = RAGService._build_prompt(
            history_text, context_text, query
        )

        llm = get_llm(company)

        async def token_generator():
            full_answer = ""

            async for token in llm.stream_generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            ):
                full_answer += token
                yield token

            await RAGService._save_messages(
                db, session_id, query, full_answer, company
            )

        return StreamingResponse(token_generator(), media_type="text/plain")

    # =====================================================
    # HELPER METHODS
    # =====================================================

    @staticmethod
    async def _get_company(db: AsyncSession, company_id: str):
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        return result.scalar_one_or_none()

    # -----------------------------------------------------

    @staticmethod
    async def _get_conversation_history(
        db: AsyncSession,
        session_id: str,
    ) -> str:

        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            return ""

        history_text = ""

        # Inject summary first (compressed memory)
        if session.memory_summary:
            history_text += (
                f"Conversation Summary:\n"
                f"{session.memory_summary}\n\n"
            )

        # Inject last few raw messages
        messages_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(RECENT_MESSAGE_LIMIT)
        )

        recent_messages = messages_result.scalars().all()

        for msg in reversed(recent_messages):
            role = "User" if msg.role == "user" else "Assistant"
            history_text += f"{role}: {msg.content}\n"

        return history_text

    # -----------------------------------------------------

    @staticmethod
    async def _build_context(
        db: AsyncSession,
        company_id: str,
        query: str,
    ):

        chunks: List[Dict] = await RetrievalService.retrieve_context(
            db=db,
            company_id=company_id,
            query=query,
            top_k=INITIAL_RETRIEVAL_K,
        )

        if not chunks:
            return [], ""

        filtered_chunks = chunks[:FINAL_CHUNK_LIMIT]

        context_text = ""
        final_chunks = []

        for chunk in filtered_chunks:
            formatted = (
                f"[Chunk {chunk['chunk_index']}]\n"
                f"{chunk['content']}\n\n"
            )

            if len(context_text) + len(formatted) > MAX_CONTEXT_CHARS:
                break

            context_text += formatted
            final_chunks.append(chunk)

        return final_chunks, context_text

    # -----------------------------------------------------

    @staticmethod
    def _build_prompt(history_text, context_text, query):

        system_prompt = """
You are an enterprise AI assistant.
Answer strictly using the provided context.
Cite chunk numbers like [Chunk 2] when referencing.
If the answer is not in the context, say you don't know.
"""

        user_prompt = f"""
Conversation History:
{history_text}

Retrieved Context:
{context_text}

Current Question:
{query}
"""

        return system_prompt, user_prompt

    # -----------------------------------------------------

    @staticmethod
    async def _save_messages(
        db: AsyncSession,
        session_id: str,
        query: str,
        answer: str,
        company,
    ):

        user_message = ChatMessage(
            session_id=session_id,
            role="user",
            content=query,
        )

        assistant_message = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
        )

        db.add_all([user_message, assistant_message])
        await db.commit()

        # Trigger memory compression
        await RAGService._compress_memory(
            db, session_id, company
        )

    # -----------------------------------------------------

    @staticmethod
    async def _compress_memory(
        db: AsyncSession,
        session_id: str,
        company,
    ):

        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            return

        messages_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )

        messages = messages_result.scalars().all()

        if len(messages) < COMPRESSION_THRESHOLD:
            return

        conversation_text = ""
        for msg in messages:
            role = "User" if msg.role == "user" else "Assistant"
            conversation_text += f"{role}: {msg.content}\n"

        llm = get_llm(company)

        summary_prompt = f"""
Summarize this conversation into a concise memory.
Preserve important facts, decisions, and context.

Conversation:
{conversation_text}
"""

        summary = await llm.generate(
            system_prompt="You summarize conversations.",
            user_prompt=summary_prompt,
        )

        session.memory_summary = summary
        await db.commit()

    # -----------------------------------------------------

    @staticmethod
    def _format_sources(chunks):
        return [
            {
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "chunk_index": chunk["chunk_index"],
            }
            for chunk in chunks
        ]