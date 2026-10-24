from pydantic import BaseModel
from enum import Enum
from typing import Optional


class NotificationType(str, Enum):
    NEW_POST = "NEW_POST"
    COMMENT = "COMMENT"
    CONN_REQUEST = "CONN_REQUEST"
    CONN_ACCEPTED = "CONN_ACCEPTED"


class NotificationTargetType(str, Enum):
    POST = "POST"
    CONNECTION = "CONNECTION"


class NotificationResponse(BaseModel):
    id: int
    recipient_id: int
    notifier_id: int
    notifier_name: str
    notifier_image_url: Optional[str] = None
    type: NotificationType
    target_type: NotificationTargetType
    target_id: str
    read_status: bool
    created_at: int

    class Config:
        from_attributes = True