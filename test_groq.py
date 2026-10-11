import asyncio

from core.config import settings
from llm.groq_llm import GroqLLM


async def main():

    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY is missing")

    llm = GroqLLM(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
    )

    response = await llm.generate(
        system_prompt="You are a helpful AI assistant.",
        user_prompt="Say hello in one short sentence.",
    )

    print("\nGroq response:")
    print(response)


if __name__ == "__main__":
    asyncio.run(main())