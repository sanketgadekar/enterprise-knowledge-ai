from fastapi import FastAPI
from app.routes.auth import router as auth_router
from core.logging import setup_logging

setup_logging()

app = FastAPI()

app.include_router(auth_router)
