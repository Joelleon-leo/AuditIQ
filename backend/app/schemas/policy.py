from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.control import ControlResponse


class PolicyBase(BaseModel):
    filename: str


class PolicyCreate(PolicyBase):
    raw_text: str
    file_size_bytes: Optional[int] = 0


class PolicyResponse(PolicyBase):
    id: str
    file_size_bytes: int
    raw_text: str
    status: str
    created_at: datetime
    controls: List[ControlResponse] = []

    # Frontend compatibility properties
    @property
    def policy_id(self) -> str:
        return self.id

    @property
    def extracted_controls_count(self) -> int:
        return len(self.controls)

    model_config = ConfigDict(from_attributes=True)


class PolicyUploadResponse(BaseModel):
    policy_id: str
    filename: str
    file_size_bytes: int
    raw_text: Optional[str] = None
    status: str
    total_controls_extracted: int
    controls: List[ControlResponse]
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PolicyListItem(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    status: str
    created_at: datetime
    controls_count: int

    model_config = ConfigDict(from_attributes=True)
