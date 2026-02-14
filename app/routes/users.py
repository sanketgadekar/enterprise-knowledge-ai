from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from db.models import User
from app.schemas.user_schema import UserResponse
from app.dependencies.auth_dependency import get_current_user


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(User).where(
            User.company_id == current_user["company_id"]
        )
    )

    users = result.scalars().all()

    return users
