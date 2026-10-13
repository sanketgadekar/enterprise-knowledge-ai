from typing import List
from abc import ABC, abstractmethod


class BaseVectorStore(ABC):

    @abstractmethod
    async def add_embeddings(self, ids: List[str], embeddings: List[List[float]]):
        pass

    @abstractmethod
    async def search(self, query_embedding: List[float], top_k: int):
        pass
