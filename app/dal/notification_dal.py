from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, BigInteger, Boolean, Enum as SQLEnum, ForeignKey
from typing import List
from enum import Enum
from app.dal.mysql_dal import Base
from app.utils.time_utils import get_current_timestamp


class NotificationType(str, Enum):
    NEW_POST = "NEW_POST"
    COMMENT = "COMMENT"
    CONN_REQUEST = "CONN_REQUEST"
    CONN_ACCEPTED = "CONN_ACCEPTED"


class NotificationTargetType(str, Enum):
    POST = "POST"
    CONNECTION = "CONNECTION"


class NotificationORM(Base):
    __tablename__ = "notification"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    recipient_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    notifier_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    target_type = Column(SQLEnum(NotificationTargetType), nullable=False)
    target_id = Column(String(255), nullable=False)
    read_status = Column(Boolean, default=False, nullable=False)
    created_at = Column(BigInteger, nullable=False)


class NotificationDAL:
    @staticmethod
    def create_notification(
        db: Session,
        recipient_id: int,
        notifier_id: int,
        notif_type: NotificationType,
        target_type: NotificationTargetType,
        target_id: str
    ) -> NotificationORM:
        notification = NotificationORM(
            recipient_id=recipient_id,
            notifier_id=notifier_id,
            type=notif_type,
            target_type=target_type,
            target_id=target_id,
            read_status=False,
            created_at=get_current_timestamp()
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    
    @staticmethod
    def get_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> List[NotificationORM]:
        return db.query(NotificationORM).filter(
            NotificationORM.recipient_id == user_id
        ).order_by(NotificationORM.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        return db.query(NotificationORM).filter(
            NotificationORM.recipient_id == user_id,
            NotificationORM.read_status == False
        ).count()
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: int) -> bool:
        notification = db.query(NotificationORM).filter(NotificationORM.id == notification_id).first()
        if not notification:
            return False
        
        notification.read_status = True
        db.commit()
        return True
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> None:
        db.query(NotificationORM).filter(
            NotificationORM.recipient_id == user_id,
            NotificationORM.read_status == False
        ).update({"read_status": True})
        db.commit()
    
    @staticmethod
    def delete_notification(db: Session, notification_id: int) -> bool:
        notification = db.query(NotificationORM).filter(NotificationORM.id == notification_id).first()
        if not notification:
            return False
        
        db.delete(notification)
        db.commit()
        return True