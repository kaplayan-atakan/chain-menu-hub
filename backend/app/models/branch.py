from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BranchBase(BaseModel):
    name: str
    brand_id: UUID
    location_info: str | None = None
    is_active: bool = True


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: str | None = None
    location_info: str | None = None
    is_active: bool | None = None


class BranchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand_id: UUID
    name: str
    location_info: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
