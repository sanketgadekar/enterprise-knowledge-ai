from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from db.models import User
from core.security import hash_password
from core.constants import UserRole, ROLE_HIERARCHY


class UserService:

    @staticmethod
    async def create_user(
        db: AsyncSession,
        current_user: dict,
        email: str,
        password: str,
        role: UserRole,
    ):
        # 1️⃣ Only admin can create users
        if current_user["role"] != UserRole.ADMIN:
            raise PermissionError("Only admin can create users.")

        # 2️⃣ Prevent privilege escalation
        if ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[current_user["role"]]:
            raise PermissionError("Cannot assign equal or higher role.")

        new_user = User(
            email=email,
            hashed_password=hash_password(password),
            role=role,
            company_id=current_user["company_id"],
        )

        try:
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            return new_user

        except IntegrityError:
            await db.rollback()
            raise ValueError("Email already exists in this company.")
