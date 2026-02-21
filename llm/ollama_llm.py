import httpx
import json
from typing import AsyncGenerator
from llm.base import BaseLLM


OLLAMA_URL = "http://localhost:11434/api/generate"


class OllamaLLM(BaseLLM):

    def __init__(self, model: str = "phi3:mini"):
        self.model = model

    # =====================================================
    # NORMAL GENERATION
    # =====================================================
    async def generate(self, system_prompt: str, user_prompt: str) -> str:

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": self.model,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False,
                },
            )

        if response.status_code != 200:
            raise Exception(f"Ollama error: {response.text}")

        try:
            data = response.json()
        except Exception:
            raise Exception("Invalid JSON response from Ollama")

        if "response" not in data:
            raise Exception(f"Unexpected Ollama response format: {data}")

        return data["response"].strip()

    # =====================================================
    # STREAMING GENERATION
    # =====================================================
    async def stream_generate(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> AsyncGenerator[str, None]:

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                OLLAMA_URL,
                json={
                    "model": self.model,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": True,
                },
            ) as response:

                if response.status_code != 200:
                    raise Exception(f"Ollama streaming error: {response.text}")

                async for line in response.aiter_lines():
                    if not line:
                        continue

                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # Ollama sends chunks like:
                    # {"response": "text", "done": false}
                    if "response" in data:
                        yield data["response"]

                    if data.get("done", False):
                        break