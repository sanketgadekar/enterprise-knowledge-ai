from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from services.company_service import CompanyService
from core.security import create_access_token
from app.schemas.company_schema import (
    CompanyRegistrationRequest,
    CompanyRegistrationResponse,
)
from app.schemas.auth_schema import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


# =============================
# Register Company
# =============================
@router.post("/register", response_model=CompanyRegistrationResponse)
async def register_company(
    payload: CompanyRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        company, admin_user = await CompanyService.create_company_with_admin(
            db=db,
            company_name=payload.company_name,
            admin_email=payload.admin_email,
            admin_password=payload.admin_password,
            custom_slug=payload.custom_slug,
        )

        access_token = create_access_token(
            user_id=admin_user.id,
            company_id=company.id,
            role=admin_user.role,
        )

        return CompanyRegistrationResponse(
            company_id=str(company.id),
            company_slug=company.slug,
            access_token=access_token,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================
# Login
# =============================
@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user, company = await CompanyService.authenticate_user(
        db=db,
        company_slug=payload.company_slug,
        email=payload.email,
        password=payload.password,
    )

    access_token = create_access_token(
        user_id=user.id,
        company_id=company.id,
        role=user.role,
    )

    return TokenResponse(access_token=access_token)
