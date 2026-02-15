from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr


from db.session import get_db
from db.models import User
from app.schemas.user_schema import UserResponse
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.roles import get_current_admin
from core.constants import UserRole
from services.user_service import UserService
from app.dependencies.permission import require_permission
from core.permissions import Permission

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

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


@router.post("/")
async def create_user(
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        user = await UserService.create_user(
            db=db,
            current_user=current_user,
            email=payload.email,
            password=payload.password,
            role=payload.role,
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
        }

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


@router.post("/")
async def create_user(
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(
    require_permission(Permission.USERS_CREATE)
),
):
    try:
        user = await UserService.create_user(
            db=db,
            current_user=current_user,
            email=payload.email,
            password=payload.password,
            role=payload.role,
        )

        return {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
        }

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
