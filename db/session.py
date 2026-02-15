from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from core.config import settings


engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

Base = declarative_base()


async def get_db():
    async with async_session_maker() as session:
        yield session
