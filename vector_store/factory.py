from vector_store.faiss_store import FAISSVectorStore


def get_vector_store(company_slug: str):
    return FAISSVectorStore(company_slug=company_slug)
