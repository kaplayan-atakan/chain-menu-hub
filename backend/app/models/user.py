from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRole(str, Enum):
    admin = "admin"
    branch_official = "branch_official"


class UserContext(BaseModel):
    """
    Doğrulanmış bir JWT'den çözümlenen kullanıcı bağlamı.
    Her authenticated endpoint bu modele erişir.
    """

    id: UUID
    role: UserRole
    branch_ids: list[UUID]


# ──────────────────────────────────────────────
# User CRUD şemaları
# ──────────────────────────────────────────────


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.branch_official
    branch_ids: list[UUID] = []


class AssignedBranch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    branch_id: UUID
    branch_name: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: UserRole
    created_at: datetime
    branches: list[AssignedBranch] = []
