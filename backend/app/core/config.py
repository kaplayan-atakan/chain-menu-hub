from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Tüm ortam değişkenleri Pydantic ile doğrulanır.
    .env dosyasından otomatik yüklenir.
    """

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Upstash Redis
    upstash_redis_url: str
    upstash_redis_token: str

    # CORS
    cors_origins: str = "*"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS_ORIGINS string'ini listeye çevirir."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
