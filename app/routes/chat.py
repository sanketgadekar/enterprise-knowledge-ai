from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from app.dependencies.auth_dependency import get_current_user
from services.retrieval_service import RetrievalService
from services.rag_service import RAGService
from db.models import ChatSession, ChatMessage


from db.models import ChatSession
from sqlalchemy import select
from db.models import ChatMessage
from sqlalchemy import delete

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

# List User Chat Sessions

@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user["user_id"])
        .order_by(ChatSession.created_at.desc())
    )

    sessions = result.scalars().all()

    return [
        {
            "session_id": str(session.id),
            "created_at": session.created_at,
        }
        for session in sessions
    ]



#Get Messages of a Session

@router.get("/sessions/{session_id}")
async def get_session_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )

    messages = result.scalars().all()

    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at,
        }
        for msg in messages
    ]


# Delete a chat session and its messages

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await db.execute(
        delete(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user["user_id"],
        )
    )

    await db.commit()

    return {"message": "Session deleted successfully"}
