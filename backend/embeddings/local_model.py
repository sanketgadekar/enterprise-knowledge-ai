from typing import List
import asyncio

from embeddings.models import BaseEmbeddingModel


class LocalEmbeddingModel(BaseEmbeddingModel):
    """
    Local embedding model using SentenceTransformers.
    Lazy loads model to avoid torch import during app startup.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None  # Lazy init

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        loop = asyncio.get_event_loop()
        model = self._get_model()

        embeddings = await loop.run_in_executor(
            None,
            lambda: model.encode(texts, convert_to_numpy=True).tolist()
        )
        return embeddings

    async def embed_query(self, text: str) -> List[float]:
        loop = asyncio.get_event_loop()
        model = self._get_model()

        embedding = await loop.run_in_executor(
            None,
            lambda: model.encode([text], convert_to_numpy=True)[0].tolist()
        )
        return embedding
