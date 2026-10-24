from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Dict
from app.dal.connection_dal import ConnectionDAL
from app.dal.user_dal import UserDAL
from app.dal.notification_dal import NotificationDAL
from app.models.connection import ConnectionCreate, ConnectionResponse, ConnectionStatus
from app.models.notification import NotificationType, NotificationTargetType


class ConnectionService:
    @staticmethod
    def send_connection_request(db: Session, requester_id: int, receiver_id: int) -> ConnectionResponse:
        """Send a connection request"""
        if requester_id == receiver_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot send connection request to yourself"
            )
        
        # Check if receiver exists
        receiver = UserDAL.get_user_by_id(db, receiver_id)
        if not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        connection = ConnectionDAL.create_connection_request(db, requester_id, receiver_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connection request already exists"
            )
        
        # Create notification
        NotificationDAL.create_notification(
            db,
            recipient_id=receiver_id,
            notifier_id=requester_id,
            notif_type=NotificationType.CONN_REQUEST,
            target_type=NotificationTargetType.CONNECTION,
            target_id=str(connection.id)
        )
        
        return ConnectionService._build_connection_response(db, connection)
    
    @staticmethod
    def accept_connection_request(db: Session, connection_id: int, user_id: int) -> ConnectionResponse:
        """Accept a connection request"""
        connection = ConnectionDAL.get_connection_by_id(db, connection_id)
        
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection request not found"
            )
        
        # Verify user is the receiver
        if connection.receiver_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to accept this request"
            )
        
        connection = ConnectionDAL.accept_connection(db, connection_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connection request already processed"
            )
        
        # Create notification
        NotificationDAL.create_notification(
            db,
            recipient_id=connection.requester_id,
            notifier_id=connection.receiver_id,
            notif_type=NotificationType.CONN_ACCEPTED,
            target_type=NotificationTargetType.CONNECTION,
            target_id=str(connection.id)
        )
        
        return ConnectionService._build_connection_response(db, connection)
    
    @staticmethod
    def reject_connection_request(db: Session, connection_id: int, user_id: int) -> dict:
        """Reject a connection request"""
        connection = ConnectionDAL.get_connection_by_id(db, connection_id)
        
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection request not found"
            )
        
        # Verify user is the receiver
        if connection.receiver_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to reject this request"
            )
        
        success = ConnectionDAL.delete_connection(db, connection_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reject connection request"
            )
        
        return {"message": "Connection request rejected"}
    
    @staticmethod
    def remove_connection(db: Session, connection_id: int, user_id: int) -> dict:
        """Remove a connection (unfriend)"""
        connection = ConnectionDAL.get_connection_by_id(db, connection_id)
        
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection not found"
            )
        
        # Verify user is part of the connection
        if connection.requester_id != user_id and connection.receiver_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to remove this connection"
            )
        
        success = ConnectionDAL.delete_connection(db, connection_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove connection"
            )
        
        return {"message": "Connection removed"}
    
    @staticmethod
    def get_pending_requests(db: Session, user_id: int) -> List[ConnectionResponse]:
        """Get pending connection requests"""
        connections = ConnectionDAL.get_pending_requests(db, user_id)
        return [ConnectionService._build_connection_response(db, conn) for conn in connections]
    
    @staticmethod
    def get_connections(db: Session, user_id: int) -> List[ConnectionResponse]:
        """Get all connections (friends)"""
        connections = ConnectionDAL.get_connections(db, user_id)
        return [ConnectionService._build_connection_response(db, conn) for conn in connections]
    
    @staticmethod
    def get_connection_status(db: Session, user_id: int, other_user_id: int) -> Dict:
        """Get connection status between two users"""
        connection = ConnectionDAL.get_connection_between_users(db, user_id, other_user_id)
        
        if not connection:
            return {"status": "none", "connection_id": None}
        
        # Determine perspective
        if connection.status == ConnectionStatus.PENDING:
            if connection.requester_id == user_id:
                return {"status": "sent", "connection_id": connection.id}
            else:
                return {"status": "received", "connection_id": connection.id}
        else:  # ACCEPTED
            return {"status": "connected", "connection_id": connection.id}
    
    @staticmethod
    def _build_connection_response(db: Session, connection) -> ConnectionResponse:
        """Build connection response with user info"""
        requester = UserDAL.get_user_by_id(db, connection.requester_id)
        receiver = UserDAL.get_user_by_id(db, connection.receiver_id)
        
        return ConnectionResponse(
            id=connection.id,
            requester_id=connection.requester_id,
            receiver_id=connection.receiver_id,
            status=connection.status,
            created_at=connection.created_at,
            updated_at=connection.updated_at,
            requester_name=requester.name if requester else None,
            requester_image_url=requester.image_url if requester else None,
            requester_role=requester.role.value if requester else None,
            receiver_name=receiver.name if receiver else None,
            receiver_image_url=receiver.image_url if receiver else None,
            receiver_role=receiver.role.value if receiver else None
        )


