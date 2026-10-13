from openai import AsyncOpenAI
from llm.base import BaseLLM


class OpenAILLM(BaseLLM):

    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    async def generate(self, system_prompt: str, user_prompt: str) -> str:

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )

        return response.choices[0].message.content
