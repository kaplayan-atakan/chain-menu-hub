from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BrandBase(BaseModel):
    name: str


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: str | None = None


class BrandResponse(BrandBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime
