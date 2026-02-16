from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from app.dependencies.auth_dependency import get_current_user
from services.retrieval_service import RetrievalService

router = APIRouter(prefix="/chat", tags=["chat"])


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
