from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from db.models import Company, User
from core.security import hash_password
from core.utils import generate_slug


class CompanyService:

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

            # Refresh both explicitly
            await db.refresh(new_company)
            await db.refresh(new_admin)

            return new_company, new_admin

        except IntegrityError:
            await db.rollback()
            raise ValueError("Company slug or admin email already exists.")
