from app.services.connection_service import ConnectionService
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.dal.mysql_dal import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/connections", tags=["connections"])


@router.post("/")
def send_connection_request(
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Send a connection request"""
    return ConnectionService.send_connection_request(db, current_user.id, receiver_id)


@router.get("/pending")
def get_pending_requests(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Get pending connection requests"""
    return ConnectionService.get_pending_requests(db, current_user.id)


@router.get("/")
def get_connections(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Get all connections (friends)"""
    return ConnectionService.get_connections(db, current_user.id)


@router.get("/status/{other_user_id}")
def get_connection_status(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get connection status with another user"""
    return ConnectionService.get_connection_status(db, current_user.id, other_user_id)


@router.post("/{connection_id}/accept")
def accept_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Accept a connection request"""
    return ConnectionService.accept_connection_request(
        db, connection_id, current_user.id
    )


@router.post("/{connection_id}/reject")
def reject_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Reject a connection request"""
    return ConnectionService.reject_connection_request(
        db, connection_id, current_user.id
    )


@router.delete("/{connection_id}")
def remove_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Remove a connection (unfriend)"""
    return ConnectionService.remove_connection(db, connection_id, current_user.id)
