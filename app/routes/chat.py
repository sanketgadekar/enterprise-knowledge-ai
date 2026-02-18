from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from app.dependencies.auth_dependency import get_current_user
from services.retrieval_service import RetrievalService
from services.rag_service import RAGService
from db.models import ChatSession, ChatMessage

router = APIRouter(prefix="/chat", tags=["chat"])


# ------------------------------
# Debug Retrieval Endpoint
# ------------------------------
@router.get("/test-retrieval")
async def test_retrieval(
    query: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    context = await RetrievalService.retrieve_context(
        db=db,
        company_id=current_user["company_id"],
        query=query,
        top_k=5,
    )

    return {
        "query": query,
        "retrieved_chunks": context,
        "count": len(context),
    }


# ------------------------------
# Full RAG Chat Endpoint (WITH MEMORY)
# ------------------------------
@router.post("/")
async def chat(
    query: str,
    session_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    # ---------------------------------
    # 1️⃣ Get or create chat session
    # ---------------------------------
    if session_id:
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()
    else:
        session = ChatSession(
            company_id=current_user["company_id"],
            user_id=current_user["user_id"],
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # ---------------------------------
    # 2️⃣ Store user message
    # ---------------------------------
    user_message = ChatMessage(
        session_id=session.id,
        role="user",
        content=query,
    )
    db.add(user_message)
    await db.commit()

    # ---------------------------------
    # 3️⃣ Generate AI answer
    # ---------------------------------
    result = await RAGService.generate_answer(
        db=db,
        company_id=current_user["company_id"],
        query=query,
        session_id=session.id,
    )

    # ---------------------------------
    # 4️⃣ Store assistant response
    # ---------------------------------
    assistant_message = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result["answer"],
    )
    db.add(assistant_message)
    await db.commit()

    return {
        "session_id": str(session.id),
        "answer": result["answer"],
        "sources": result["sources"],
    }
