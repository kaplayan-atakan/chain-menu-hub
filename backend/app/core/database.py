import logging
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Supabase client singleton — service_role key ile oluşturulur.
    Service role RLS'yi bypass eder; yetkilendirme Python API katmanında yönetilir.
    """
    logger.info("Initializing Supabase client for %s", settings.supabase_url)
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
