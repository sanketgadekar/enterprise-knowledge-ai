from core.config import settings
from embeddings.local_model import LocalEmbeddingModel
# from embeddings.openai_model import OpenAIEmbeddingModel


def get_embedding_model():
    if settings.embedding_model == "local":
        return LocalEmbeddingModel()

    # elif settings.embedding_model == "openai":
    #     return OpenAIEmbeddingModel()

    raise ValueError("Unsupported embedding model.")
