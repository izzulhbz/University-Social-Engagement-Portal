from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.dal.notification_dal import NotificationDAL
from app.dal.user_dal import UserDAL
from app.models.notification import NotificationResponse


class NotificationService:
    @staticmethod
    def get_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> List[NotificationResponse]:
        """Get notifications for a user"""
        notifications = NotificationDAL.get_notifications(db, user_id, skip, limit)
        return [NotificationService._build_notification_response(db, notif) for notif in notifications]
    
    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get unread notification count"""
        return NotificationDAL.get_unread_count(db, user_id)
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> dict:
        """Mark notification as read"""
        # Verify ownership
        notifications = NotificationDAL.get_notifications(db, user_id, skip=0, limit=1000)
        notification = next((n for n in notifications if n.id == notification_id), None)
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        success = NotificationDAL.mark_as_read(db, notification_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark notification as read"
            )
        
        return {"message": "Notification marked as read"}
    
    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> dict:
        """Mark all notifications as read"""
        NotificationDAL.mark_all_as_read(db, user_id)
        return {"message": "All notifications marked as read"}
    
    @staticmethod
    def delete_notification(db: Session, notification_id: int, user_id: int) -> dict:
        """Delete a notification"""
        # Verify ownership
        notifications = NotificationDAL.get_notifications(db, user_id, skip=0, limit=1000)
        notification = next((n for n in notifications if n.id == notification_id), None)
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        success = NotificationDAL.delete_notification(db, notification_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete notification"
            )
        
        return {"message": "Notification deleted"}
    
    @staticmethod
    def _build_notification_response(db: Session, notification) -> NotificationResponse:
        """Build notification response with notifier info"""
        notifier = UserDAL.get_user_by_id(db, notification.notifier_id)
        
        return NotificationResponse(
            id=notification.id,
            recipient_id=notification.recipient_id,
            notifier_id=notification.notifier_id,
            notifier_name=notifier.name if notifier else "Unknown",
            notifier_image_url=notifier.image_url if notifier else None,
            type=notification.type,
            target_type=notification.target_type,
            target_id=notification.target_id,
            read_status=notification.read_status,
            created_at=notification.created_at
        )