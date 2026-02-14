from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from fastapi import HTTPException

from db.models import Company, User
from core.security import hash_password, verify_password
from core.utils import generate_slug


class CompanyService:

    # =============================
    # Register Company + Admin
    # =============================
    @staticmethod
    async def create_company_with_admin(
        db: AsyncSession,
        company_name: str,
        admin_email: str,
        admin_password: str,
        custom_slug: str | None = None,
    ):
        slug = custom_slug or generate_slug(company_name)

        new_company = Company(
            name=company_name,
            slug=slug,
        )

        new_admin = User(
            email=admin_email,
            hashed_password=hash_password(admin_password),
            role="admin",
            company=new_company,
        )

        try:
            db.add(new_company)
            db.add(new_admin)

            await db.commit()

            await db.refresh(new_company)
            await db.refresh(new_admin)

            return new_company, new_admin

        except IntegrityError:
            await db.rollback()
            raise ValueError("Company slug or admin email already exists.")

    # =============================
    # Authenticate User (Login)
    # =============================
    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        company_slug: str,
        email: str,
        password: str,
    ):
        # 1️⃣ Find company
        result = await db.execute(
            select(Company).where(Company.slug == company_slug)
        )
        company = result.scalar_one_or_none()

        if not company:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # 2️⃣ Find user inside that company
        result = await db.execute(
            select(User).where(
                User.company_id == company.id,
                User.email == email,
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # 3️⃣ Verify password (Argon2)
        if not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # 4️⃣ Check if active
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Inactive account")

        return user, company
