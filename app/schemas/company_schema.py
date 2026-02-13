from pydantic import BaseModel, EmailStr
from typing import Optional


class CompanyRegistrationRequest(BaseModel):
    company_name: str
    admin_email: EmailStr
    admin_password: str
    custom_slug: Optional[str] = None


class CompanyRegistrationResponse(BaseModel):
    company_id: str
    company_slug: str
    access_token: str
    token_type: str = "bearer"
