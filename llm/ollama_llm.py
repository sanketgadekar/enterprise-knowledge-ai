import httpx
from llm.base import BaseLLM


class OllamaLLM(BaseLLM):

    def __init__(self, model: str = "phi3"):
        self.model = model

    async def generate(self, system_prompt: str, user_prompt: str) -> str:

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": self.model,  # DO NOT change this
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False,
                },
            )

        if response.status_code != 200:
            raise Exception(f"Ollama error: {response.text}")

        data = response.json()

        # Safe parsing
        if "response" not in data:
            raise Exception(f"Unexpected Ollama response: {data}")

        return data["response"].strip()
