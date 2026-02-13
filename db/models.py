import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.session import Base


# =========================
# Company Model
# =========================
class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Display name (NOT unique)
    name = Column(String(255), nullable=False)

    # Unique tenant identifier
    slug = Column(String(100), nullable=False, unique=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship(
        "User",
        back_populates="company",
        cascade="all, delete",
    )

    def __repr__(self) -> str:
        return f"<Company id={self.id} slug={self.slug}>"


# =========================
# User Model
# =========================
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    email = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    role = Column(String(50), nullable=False)  # "admin" | "user"
    is_active = Column(Boolean, default=True)

    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="users")

    # Unique email per company
    __table_args__ = (
        UniqueConstraint("company_id", "email", name="uq_company_email"),
        Index("idx_user_company", "company_id"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
