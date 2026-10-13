from abc import ABC, abstractmethod
from typing import List


class BaseEmbeddingModel(ABC):
    """
    Abstract embedding model interface.
    """

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple documents.
        """

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding for a single query.
        """
