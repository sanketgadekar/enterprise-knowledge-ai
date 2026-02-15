import os
import pickle
from typing import List, Dict, Any

import faiss
import numpy as np

from vector_store.base import BaseVectorStore


class FAISSVectorStore(BaseVectorStore):
    """
    FAISS implementation with per-company isolated index.
    """

    def __init__(self, base_path: str = "storage/vector"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    # --------------------------
    # Internal Helpers
    # --------------------------

    def _get_company_path(self, namespace: str) -> str:
        path = os.path.join(self.base_path, namespace)
        os.makedirs(path, exist_ok=True)
        return path

    def _get_index_path(self, namespace: str) -> str:
        return os.path.join(self._get_company_path(namespace), "index.faiss")

    def _get_metadata_path(self, namespace: str) -> str:
        return os.path.join(self._get_company_path(namespace), "metadata.pkl")

    def _load_index(self, namespace: str, dim: int):
        index_path = self._get_index_path(namespace)

        if os.path.exists(index_path):
            return faiss.read_index(index_path)

        # Create new index
        return faiss.IndexFlatL2(dim)

    def _save_index(self, namespace: str, index):
        faiss.write_index(index, self._get_index_path(namespace))

    def _load_metadata(self, namespace: str):
        metadata_path = self._get_metadata_path(namespace)

        if os.path.exists(metadata_path):
            with open(metadata_path, "rb") as f:
                return pickle.load(f)

        return []

    def _save_metadata(self, namespace: str, metadata):
        with open(self._get_metadata_path(namespace), "wb") as f:
            pickle.dump(metadata, f)

    # --------------------------
    # Interface Implementation
    # --------------------------

    async def add_documents(
        self,
        namespace: str,
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:

        if not embeddings:
            return

        dim = len(embeddings[0])
        index = self._load_index(namespace, dim)

        vectors = np.array(embeddings).astype("float32")
        index.add(vectors)

        self._save_index(namespace, index)

        # Save metadata
        metadata_store = self._load_metadata(namespace)

        for doc, meta in zip(documents, metadatas):
            metadata_store.append({
                "document": doc,
                "metadata": meta,
            })

        self._save_metadata(namespace, metadata_store)

    async def similarity_search(
        self,
        namespace: str,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:

        index_path = self._get_index_path(namespace)
        if not os.path.exists(index_path):
            return []

        index = faiss.read_index(index_path)
        metadata_store = self._load_metadata(namespace)

        query_vector = np.array([query_embedding]).astype("float32")

        distances, indices = index.search(query_vector, top_k)

        results = []
        for idx in indices[0]:
            if idx < len(metadata_store):
                results.append(metadata_store[idx])

        return results

    async def delete_namespace(self, namespace: str) -> None:
        company_path = self._get_company_path(namespace)

        if os.path.exists(company_path):
            for file in os.listdir(company_path):
                os.remove(os.path.join(company_path, file))
            os.rmdir(company_path)

    async def delete_by_document(
        self,
        namespace: str,
        document_id: str,
    ) -> None:
        # Simplified version (full reindex required in production)
        metadata_store = self._load_metadata(namespace)

        filtered = [
            item for item in metadata_store
            if item["metadata"].get("document_id") != document_id
        ]

        self._save_metadata(namespace, filtered)

    async def health_check(self) -> bool:
        return True
