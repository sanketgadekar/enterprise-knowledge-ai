from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from pydantic import BaseModel

from core.config import settings


# Password Hashing

pwd_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_hasher.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False


# JWT Models

class TokenPayload(BaseModel):
    user_id: UUID
    company_id: UUID
    role: str
    exp: datetime


# JWT Creation

def create_access_token(
    user_id: UUID,
    company_id: UUID,
    role: str,
) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.jwt_expire_minutes
    )

    payload = {
        "user_id": str(user_id),
        "company_id": str(company_id),
        "role": role,
        "exp": expire,
    }

    encoded_jwt = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return encoded_jwt


# JWT Verification

def decode_access_token(token: str) -> Optional[TokenPayload]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        return TokenPayload(**payload)

    except JWTError:
        return None
