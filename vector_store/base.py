from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseVectorStore(ABC):
    """
    Abstract base class for all vector store implementations.
    Multi-tenant safe by requiring namespace (company_id).
    """

    @abstractmethod
    async def add_documents(
        self,
        namespace: str,
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        """
        Add documents to vector store under a namespace.
        """

    @abstractmethod
    async def similarity_search(
        self,
        namespace: str,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Perform similarity search within namespace.
        """

    @abstractmethod
    async def delete_by_document(
        self,
        namespace: str,
        document_id: str,
    ) -> None:
        """
        Delete all vectors belonging to a document.
        """

    @abstractmethod
    async def delete_namespace(
        self,
        namespace: str,
    ) -> None:
        """
        Delete all vectors for a company.
        """

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Check if vector store is healthy.
        """
