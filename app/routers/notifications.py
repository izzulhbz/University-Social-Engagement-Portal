from app.services.notification_service import NotificationService
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.dal.mysql_dal import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/")
def get_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get notifications"""
    return NotificationService.get_notifications(db, current_user.id, skip, limit)


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Get unread notification count"""
    count = NotificationService.get_unread_count(db, current_user.id)
    return {"count": count}


@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark notification as read"""
    return NotificationService.mark_as_read(db, notification_id, current_user.id)


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Mark all notifications as read"""
    return NotificationService.mark_all_as_read(db, current_user.id)


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a notification"""
    return NotificationService.delete_notification(db, notification_id, current_user.id)
