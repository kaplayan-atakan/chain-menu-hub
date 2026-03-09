import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.core.database import get_supabase_client
from app.models.user import AssignedBranch, UserCreate, UserResponse, UserRole

logger = logging.getLogger(__name__)


async def get_user(user_id: UUID) -> UserResponse:
    """Tek bir kullanıcının profil + şube bilgilerini döndürür."""
    client = get_supabase_client()

    profile_resp = await asyncio.to_thread(
        lambda: client.table("profiles")
        .select("id, role, created_at")
        .eq("id", str(user_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not profile_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )

    # E-posta
    try:
        auth_resp = await asyncio.to_thread(
            lambda: client.auth.admin.get_user_by_id(str(user_id))
        )
        email = auth_resp.user.email or ""
    except Exception:
        email = ""

    # Atanmış şubeler
    branch_resp = await asyncio.to_thread(
        lambda: client.table("branch_users")
        .select("branch_id, branches(name)")
        .eq("user_id", str(user_id))
        .is_("deleted_at", "null")
        .execute()
    )
    branches: list[AssignedBranch] = []
    for row in branch_resp.data or []:
        branch_name = ""
        if row.get("branches") and isinstance(row["branches"], dict):
            branch_name = row["branches"].get("name", "")
        branches.append(
            AssignedBranch(branch_id=UUID(row["branch_id"]), branch_name=branch_name)
        )

    return UserResponse(
        id=UUID(profile_resp.data["id"]),
        email=email,
        role=UserRole(profile_resp.data["role"]),
        created_at=profile_resp.data["created_at"],
        branches=branches,
    )


async def list_users() -> list[UserResponse]:
    """
    Soft-delete edilmemiş tüm kullanıcıları, atanmış şubeleriyle birlikte döndürür.
    Supabase Auth admin API + profiles + branch_users tabloları kullanılır.
    """
    client = get_supabase_client()

    # 1. Aktif profilleri çek
    profiles_resp = await asyncio.to_thread(
        lambda: client.table("profiles")
        .select("id, role, created_at")
        .is_("deleted_at", "null")
        .order("created_at")
        .execute()
    )

    if not profiles_resp.data:
        return []

    user_ids = [p["id"] for p in profiles_resp.data]

    # 2. Auth kullanıcılarını toplu çek (e-posta bilgisi için)
    auth_users_resp = await asyncio.to_thread(
        lambda: client.auth.admin.list_users()
    )
    email_map: dict[str, str] = {}
    for u in auth_users_resp:
        if hasattr(u, "id") and hasattr(u, "email"):
            email_map[str(u.id)] = u.email or ""

    # 3. Branch atamaları — şube adlarıyla birlikte
    branch_users_resp = await asyncio.to_thread(
        lambda: client.table("branch_users")
        .select("user_id, branch_id, branches(name)")
        .is_("deleted_at", "null")
        .in_("user_id", user_ids)
        .execute()
    )

    # user_id → list[AssignedBranch] mapping
    branch_map: dict[str, list[AssignedBranch]] = {}
    for row in branch_users_resp.data or []:
        uid = row["user_id"]
        branch_name = ""
        if row.get("branches") and isinstance(row["branches"], dict):
            branch_name = row["branches"].get("name", "")
        ab = AssignedBranch(branch_id=UUID(row["branch_id"]), branch_name=branch_name)
        branch_map.setdefault(uid, []).append(ab)

    # 4. Birleştir
    result: list[UserResponse] = []
    for profile in profiles_resp.data:
        pid = profile["id"]
        result.append(
            UserResponse(
                id=UUID(pid),
                email=email_map.get(pid, ""),
                role=UserRole(profile["role"]),
                created_at=profile["created_at"],
                branches=branch_map.get(pid, []),
            )
        )

    return result


async def create_user(payload: UserCreate) -> UserResponse:
    """
    Yeni kullanıcı oluşturur:
    1. Supabase Auth'ta kullanıcı oluştur
    2. profiles tablosuna ekle
    3. branch_ids belirtilmişse branch_users tablosuna ata
    """
    client = get_supabase_client()

    # 1. Supabase Auth ile kullanıcı oluştur
    try:
        auth_resp = await asyncio.to_thread(
            lambda: client.auth.admin.create_user(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "email_confirm": True,
                    "user_metadata": {"role": payload.role.value},
                }
            )
        )
    except Exception as exc:
        logger.error("Failed to create auth user %s: %s", payload.email, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kullanıcı oluşturulamadı: {exc}",
        ) from exc

    user_id = str(auth_resp.user.id)

    # 2. profiles tablosuna ekle
    await asyncio.to_thread(
        lambda: client.table("profiles")
        .insert({"id": user_id, "role": payload.role.value})
        .execute()
    )

    # 3. branch_users atamaları
    assigned_branches: list[AssignedBranch] = []
    if payload.branch_ids:
        # Şubelerin var olduğunu doğrula
        branch_ids_str = [str(bid) for bid in payload.branch_ids]
        branches_resp = await asyncio.to_thread(
            lambda: client.table("branches")
            .select("id, name")
            .in_("id", branch_ids_str)
            .is_("deleted_at", "null")
            .execute()
        )

        found_ids = {row["id"] for row in branches_resp.data or []}
        for bid_str in branch_ids_str:
            if bid_str not in found_ids:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Branch {bid_str} not found.",
                )

        # Toplu insert
        inserts = [
            {"user_id": user_id, "branch_id": bid_str}
            for bid_str in branch_ids_str
        ]
        await asyncio.to_thread(
            lambda: client.table("branch_users").insert(inserts).execute()
        )

        for row in branches_resp.data or []:
            assigned_branches.append(
                AssignedBranch(branch_id=UUID(row["id"]), branch_name=row["name"])
            )

    return UserResponse(
        id=UUID(user_id),
        email=payload.email,
        role=payload.role,
        created_at=datetime.now(timezone.utc),
        branches=assigned_branches,
    )
