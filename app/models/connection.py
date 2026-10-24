from pydantic import BaseModel
from enum import Enum
from typing import Optional


class ConnectionStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"


class ConnectionCreate(BaseModel):
    receiver_id: int


class ConnectionResponse(BaseModel):
    id: int
    requester_id: int
    receiver_id: int
    status: ConnectionStatus
    created_at: int
    updated_at: int
    
    # Additional user info
    requester_name: Optional[str] = None
    requester_image_url: Optional[str] = None
    requester_role: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_image_url: Optional[str] = None
    receiver_role: Optional[str] = None

    class Config:
        from_attributes = True
