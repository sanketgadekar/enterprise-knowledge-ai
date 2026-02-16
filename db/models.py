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
    Enum as SqlEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.session import Base
from core.constants import UserRole


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

    # 🔐 Production-grade enum role
    role = Column(
        SqlEnum(UserRole, name="user_role_enum"),
        nullable=False,
    )

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


# =========================
# Document Model
# =========================
class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)

    status = Column(String(50), default="pending")  # pending | processing | completed | failed

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company")

    __table_args__ = (
        Index("idx_document_company", "company_id"),
    )

    def __repr__(self):
        return f"<Document id={self.id} status={self.status}>"

# =========================
# Document Chunk Model
# =========================
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )

    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    content = Column(String, nullable=False)
    chunk_index = Column(String(50), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_chunk_company", "company_id"),
        Index("idx_chunk_document", "document_id"),
    )
