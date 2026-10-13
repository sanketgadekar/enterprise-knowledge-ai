import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from core.config import settings


def setup_logging() -> None:
    """
    Configure application-wide logging.

    This function should be called once during application startup.
    """

    log_level = settings.log_level.upper()
    log_file_path = settings.log_file

    # Ensure log directory exists
    log_path = Path(log_file_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    # Clear existing handlers to prevent duplicate logs
    root_logger = logging.getLogger()
    if root_logger.handlers:
        root_logger.handlers.clear()

    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    # Rotating file handler (10MB per file, keep 5 backups)
    file_handler = RotatingFileHandler(
        filename=log_file_path,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
    )
    file_handler.setFormatter(formatter)

    # Configure root logger
    root_logger.setLevel(getattr(logging, log_level, logging.INFO))
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    root_logger.propagate = False


def get_logger(name: str) -> logging.Logger:
    """
    Return a logger instance for a specific module.
    """
    return logging.getLogger(name)
