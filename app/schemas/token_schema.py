from pydantic import BaseModel
from uuid import UUID


class TokenPayload(BaseModel):
    user_id: UUID
    company_id: UUID
    role: str
    exp: int
