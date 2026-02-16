from llm.openai_llm import OpenAILLM
from llm.ollama_llm import OllamaLLM


def get_llm(company):

    if company.llm_provider == "openai":
        if not company.openai_api_key:
            raise ValueError("OpenAI API key not configured.")
        return OpenAILLM(api_key=company.openai_api_key)

    return OllamaLLM()
