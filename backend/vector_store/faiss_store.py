
import os
import pickle
import tempfile
from typing import List, Dict, Any

import faiss
import numpy as np

from vector_store.base import BaseVectorStore


class FAISSVectorStore(BaseVectorStore):
    """
    FAISS implementation with per-company isolated indexes.

    Each company has:
      - index.faiss: vector embeddings
      - metadata.pkl: corresponding document text and metadata

    Vector positions must always match metadata positions.
    """

    def __init__(self, base_path: str = "storage/vector"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    # --------------------------------------------------
    # Internal helpers
    # --------------------------------------------------

    def _get_company_path(self, namespace: str) -> str:
        path = os.path.join(self.base_path, namespace)
        os.makedirs(path, exist_ok=True)
        return path

    def _get_index_path(self, namespace: str) -> str:
        return os.path.join(
            self._get_company_path(namespace),
            "index.faiss",
        )

    def _get_metadata_path(self, namespace: str) -> str:
        return os.path.join(
            self._get_company_path(namespace),
            "metadata.pkl",
        )

    def _load_index(self, namespace: str, dim: int):
        index_path = self._get_index_path(namespace)

        if os.path.exists(index_path):
            index = faiss.read_index(index_path)

            if index.d != dim:
                raise ValueError(
                    f"Embedding dimension mismatch: "
                    f"existing={index.d}, new={dim}"
                )

            return index

        return faiss.IndexFlatL2(dim)

    def _save_index(self, namespace: str, index) -> None:
        faiss.write_index(index, self._get_index_path(namespace))

    def _load_metadata(self, namespace: str):
        metadata_path = self._get_metadata_path(namespace)

        if not os.path.exists(metadata_path):
            return []

        with open(metadata_path, "rb") as file:
            return pickle.load(file)

    def _save_metadata(self, namespace: str, metadata) -> None:
        with open(self._get_metadata_path(namespace), "wb") as file:
            pickle.dump(metadata, file)

    def _replace_index_and_metadata(
        self,
        namespace: str,
        index,
        metadata: List[Dict[str, Any]],
    ) -> None:
        """
        Write replacement files before replacing the current files.

        This reduces the risk of leaving partially written files.
        It does not provide a fully atomic transaction across both files.
        """
        directory = self._get_company_path(namespace)
        index_path = self._get_index_path(namespace)
        metadata_path = self._get_metadata_path(namespace)

        temp_index_path = None
        temp_metadata_path = None

        try:
            with tempfile.NamedTemporaryFile(
                dir=directory,
                suffix=".faiss",
                delete=False,
            ) as temp_file:
                temp_index_path = temp_file.name

            with tempfile.NamedTemporaryFile(
                dir=directory,
                suffix=".pkl",
                delete=False,
            ) as temp_file:
                temp_metadata_path = temp_file.name

            faiss.write_index(index, temp_index_path)

            with open(temp_metadata_path, "wb") as file:
                pickle.dump(metadata, file)

            # Replace the existing files after both temporary files
            # have been written successfully.
            os.replace(temp_index_path, index_path)
            temp_index_path = None

            os.replace(temp_metadata_path, metadata_path)
            temp_metadata_path = None

        finally:
            for path in (temp_index_path, temp_metadata_path):
                if path and os.path.exists(path):
                    os.remove(path)

    # --------------------------------------------------
    # Add documents
    # --------------------------------------------------

    async def add_documents(
        self,
        namespace: str,
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:

        if not (len(embeddings) == len(documents) == len(metadatas)):
            raise ValueError(
                "Embeddings, documents, and metadata must "
                "have the same number of entries."
            )

        if not embeddings:
            return

        vectors = np.asarray(embeddings, dtype=np.float32)

        if vectors.ndim != 2 or vectors.shape[1] == 0:
            raise ValueError("Invalid embedding dimensions.")

        if not np.isfinite(vectors).all():
            raise ValueError("Embeddings contain invalid values.")

        index = self._load_index(namespace, vectors.shape[1])
        metadata_store = self._load_metadata(namespace)

        if index.ntotal != len(metadata_store):
            raise RuntimeError(
                "FAISS index and metadata count mismatch. "
                "Repair the index before adding documents."
            )

        # Create updated copies so metadata and vectors stay aligned.
        updated_index = faiss.clone_index(index)
        updated_index.add(vectors)

        updated_metadata = list(metadata_store)

        for document_text, metadata in zip(documents, metadatas):
            updated_metadata.append(
                {
                    "document": document_text,
                    "metadata": metadata,
                }
            )

        self._replace_index_and_metadata(
            namespace,
            updated_index,
            updated_metadata,
        )

    # --------------------------------------------------
    # Similarity search
    # --------------------------------------------------

    async def similarity_search(
        self,
        namespace: str,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:

        if top_k <= 0:
            return []

        index_path = self._get_index_path(namespace)
        metadata_path = self._get_metadata_path(namespace)

        if not os.path.exists(index_path):
            return []

        index = faiss.read_index(index_path)

        if not os.path.exists(metadata_path):
            if index.ntotal:
                raise RuntimeError(
                    "FAISS index exists but metadata is missing."
                )
            return []

        metadata_store = self._load_metadata(namespace)

        if index.ntotal != len(metadata_store):
            raise RuntimeError(
                "FAISS index and metadata count mismatch. "
                "Repair the index before searching."
            )

        if index.ntotal == 0:
            return []

        query_vector = np.asarray(
            [query_embedding],
            dtype=np.float32,
        )

        if query_vector.shape[1] != index.d:
            raise ValueError(
                f"Query embedding dimension {query_vector.shape[1]} "
                f"does not match index dimension {index.d}."
            )

        if not np.isfinite(query_vector).all():
            raise ValueError("Query embedding contains invalid values.")

        k = min(top_k, index.ntotal)
        distances, indices = index.search(query_vector, k)

        results = []

        for idx, distance in zip(indices[0], distances[0]):
            if idx < 0:
                continue

            result = dict(metadata_store[int(idx)])
            result["distance"] = float(distance)
            results.append(result)

        return results

    # --------------------------------------------------
    # Permanently delete one document's vectors
    # --------------------------------------------------

    async def delete_by_document(
        self,
        namespace: str,
        document_id: str,
    ) -> None:

        index_path = self._get_index_path(namespace)
        metadata_path = self._get_metadata_path(namespace)

        metadata_store = self._load_metadata(namespace)

        if not os.path.exists(index_path):
            if metadata_store:
                remaining_metadata = [
                    item
                    for item in metadata_store
                    if str(item.get("metadata", {}).get("document_id"))
                    != str(document_id)
                ]

                self._save_metadata(namespace, remaining_metadata)

            return

        index = faiss.read_index(index_path)

        if index.ntotal != len(metadata_store):
            raise RuntimeError(
                "FAISS index and metadata count mismatch. "
                "Back up and repair/rebuild the index before deletion."
            )

        keep_indices = [
            idx
            for idx, item in enumerate(metadata_store)
            if str(item.get("metadata", {}).get("document_id"))
            != str(document_id)
        ]

        if len(keep_indices) == len(metadata_store):
            return

        # Rebuild the index from the vectors belonging to other documents.
        remaining_index = faiss.IndexFlatL2(index.d)
        remaining_metadata = []

        for idx in keep_indices:
            vector = index.reconstruct(idx)

            remaining_index.add(
                np.asarray(vector, dtype=np.float32).reshape(1, -1)
            )

            remaining_metadata.append(metadata_store[idx])

        self._replace_index_and_metadata(
            namespace,
            remaining_index,
            remaining_metadata,
        )

    # --------------------------------------------------
    # Delete an entire company namespace
    # --------------------------------------------------

    async def delete_namespace(self, namespace: str) -> None:
        """
        Delete a company's complete FAISS index directory.

        WARNING: This deletes every vector in this namespace.
        Never use this method to delete a single document.
        """
        company_path = os.path.abspath(
            os.path.join(self.base_path, namespace)
        )
        base_path = os.path.abspath(self.base_path)

        # Prevent paths outside the vector storage directory.
        if os.path.commonpath([base_path, company_path]) != base_path:
            raise ValueError("Invalid vector namespace path.")

        if company_path == base_path:
            raise ValueError("Cannot delete the vector storage root.")

        if not os.path.isdir(company_path):
            return

        # Only delete the expected FAISS files.
        for filename in ("index.faiss", "metadata.pkl"):
            file_path = os.path.join(company_path, filename)

            if os.path.isfile(file_path):
                os.remove(file_path)

        # Remove the directory only if empty.
        os.rmdir(company_path)

    # --------------------------------------------------
    # Health check
    # --------------------------------------------------

    async def health_check(self) -> bool:
        return True
