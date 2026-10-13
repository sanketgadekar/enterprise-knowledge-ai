from fastapi import FastAPI
from app.routes.auth import router as auth_router
from core.logging import setup_logging
from app.routes.users import router as users_router
from app.routes.ingest import router as ingest_router



setup_logging()

app = FastAPI()

app.include_router(auth_router)

app.include_router(users_router)

app.include_router(ingest_router)

from app.routes.chat import router as chat_router

app.include_router(chat_router)
