import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 5.0


class RedisCache:
    """
    Upstash Redis REST API istemcisi.

    Kırmızı Çizgi Kuralları:
    - set() metodu zorunlu TTL (ex) parametresi alır — süresiz key yasaktır.
    - Tüm işlemler try/except ile sarılmalı; Redis erişilemezse sistem çökmez.
    """

    def __init__(self, url: str, token: str) -> None:
        self._base_url = url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def _execute(self, command: list) -> Any:
        """Upstash REST API'ye tek bir Redis komutu gönderir."""
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                self._base_url,
                headers=self._headers,
                json=command,
            )
            response.raise_for_status()
            return response.json().get("result")

    async def ping(self) -> bool:
        """Redis bağlantı kontrolü."""
        result = await self._execute(["PING"])
        return result == "PONG"

    async def get(self, key: str) -> str | None:
        """Tek bir key'in değerini döndürür."""
        return await self._execute(["GET", key])

    async def set(self, key: str, value: str, ex: int) -> bool:
        """
        Key'e değer atar.
        ex (saniye): Zorunlu TTL. Süresiz key oluşturmak yasaktır.
        """
        result = await self._execute(["SET", key, value, "EX", str(ex)])
        return result == "OK"

    async def delete(self, *keys: str) -> int:
        """Bir veya daha fazla key'i siler. Silinen key sayısını döndürür."""
        return await self._execute(["DEL", *keys])


redis_cache = RedisCache(
    url=settings.upstash_redis_url,
    token=settings.upstash_redis_token,
)
