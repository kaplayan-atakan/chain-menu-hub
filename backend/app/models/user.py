from enum import Enum
from uuid import UUID

from pydantic import BaseModel


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
