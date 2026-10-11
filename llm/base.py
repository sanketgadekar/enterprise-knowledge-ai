from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator


class BaseLLM(ABC):

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        pass

    @abstractmethod
    async def stream_generate(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> AsyncGenerator[str, None]:
        pass