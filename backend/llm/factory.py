from core.config import settings
from llm.groq_llm import GroqLLM


def get_llm(company=None):

    provider = settings.llm_provider.lower()

    if provider == "groq":

        if not settings.groq_api_key:
            raise ValueError(
                "GROQ_API_KEY is not configured."
            )

        return GroqLLM(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
        )

    raise ValueError(
        f"Unsupported LLM provider: {settings.llm_provider}"
    )