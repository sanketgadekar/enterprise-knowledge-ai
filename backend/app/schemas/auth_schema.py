from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    company_slug: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
