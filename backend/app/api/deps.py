import asyncio
import logging
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_supabase_client
from app.models.user import UserContext, UserRole

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> UserContext:
    """
    FastAPI dependency: Authorization header'daki JWT'yi Supabase Auth ile doğrular,
    ardından profiles + branch_users tablolarından kullanıcı bağlamını oluşturur.

    Başarısız olursa 401 Unauthorized döner.
    """
    token = credentials.credentials
    client = get_supabase_client()

    # ── 1. Token doğrulama (Supabase Auth API) ──
    try:
        auth_response = await asyncio.to_thread(client.auth.get_user, token)
    except Exception as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if auth_response is None or auth_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = auth_response.user.id

    # ── 2. Profil sorgula (rol bilgisi) ──
    profile_resp = await asyncio.to_thread(
        lambda: client.table("profiles")
        .select("role")
        .eq("id", user_id)
        .is_("deleted_at", "null")
        .single()
        .execute()
    )

    if not profile_resp.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User profile not found or deactivated.",
        )

    try:
        role = UserRole(profile_resp.data["role"])
    except ValueError as exc:
        logger.error("Unknown role '%s' for user %s", profile_resp.data["role"], user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unknown user role.",
        ) from exc

    # ── 3. Atanmış şubeleri çek (branch_users) ──
    branch_ids: list[UUID] = []

    if role == UserRole.branch_official:
        branch_resp = await asyncio.to_thread(
            lambda: client.table("branch_users")
            .select("branch_id")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .execute()
        )
        branch_ids = [UUID(row["branch_id"]) for row in (branch_resp.data or [])]

    return UserContext(id=UUID(user_id), role=role, branch_ids=branch_ids)


# ──────────────────────────────────────────────
# Rol bazlı alt dependency'ler
# ──────────────────────────────────────────────


async def get_current_admin(
    user: UserContext = Depends(get_current_user),
) -> UserContext:
    """Sadece admin rolüne izin verir; aksi halde 403."""
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return user


async def get_current_branch_official(
    user: UserContext = Depends(get_current_user),
) -> UserContext:
    """Sadece branch_official rolüne izin verir; aksi halde 403."""
    if user.role != UserRole.branch_official:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Branch official privileges required.",
        )
    return user
