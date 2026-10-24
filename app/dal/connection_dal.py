from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, BigInteger, Enum as SQLEnum, UniqueConstraint, ForeignKey
from typing import List, Optional
from enum import Enum
from app.dal.mysql_dal import Base
from app.utils.time_utils import get_current_timestamp


class ConnectionStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"


class ConnectionORM(Base):
    __tablename__ = "connection"
    __table_args__ = (
        UniqueConstraint('requester_id', 'receiver_id', name='_requester_receiver_uc'),
    )
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    requester_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ConnectionStatus), nullable=False)
    created_at = Column(BigInteger, nullable=False)
    updated_at = Column(BigInteger, nullable=False)


class ConnectionDAL:
    @staticmethod
    def create_connection_request(db: Session, requester_id: int, receiver_id: int) -> Optional[ConnectionORM]:
        """Create a connection request"""
        existing = db.query(ConnectionORM).filter(
            ((ConnectionORM.requester_id == requester_id) & (ConnectionORM.receiver_id == receiver_id)) |
            ((ConnectionORM.requester_id == receiver_id) & (ConnectionORM.receiver_id == requester_id))
        ).first()
        
        if existing:
            return None
        
        now = get_current_timestamp()
        connection = ConnectionORM(
            requester_id=requester_id,
            receiver_id=receiver_id,
            status=ConnectionStatus.PENDING,
            created_at=now,
            updated_at=now
        )
        
        db.add(connection)
        db.commit()
        db.refresh(connection)
        return connection
    
    @staticmethod
    def get_connection_by_id(db: Session, connection_id: int) -> Optional[ConnectionORM]:
        return db.query(ConnectionORM).filter(ConnectionORM.id == connection_id).first()
    
    @staticmethod
    def get_connection_between_users(db: Session, user1_id: int, user2_id: int) -> Optional[ConnectionORM]:
        return db.query(ConnectionORM).filter(
            ((ConnectionORM.requester_id == user1_id) & (ConnectionORM.receiver_id == user2_id)) |
            ((ConnectionORM.requester_id == user2_id) & (ConnectionORM.receiver_id == user1_id))
        ).first()
    
    @staticmethod
    def get_pending_requests(db: Session, user_id: int) -> List[ConnectionORM]:
        return db.query(ConnectionORM).filter(
            ConnectionORM.receiver_id == user_id,
            ConnectionORM.status == ConnectionStatus.PENDING
        ).all()
    
    @staticmethod
    def get_connections(db: Session, user_id: int) -> List[ConnectionORM]:
        return db.query(ConnectionORM).filter(
            ((ConnectionORM.requester_id == user_id) | (ConnectionORM.receiver_id == user_id)),
            ConnectionORM.status == ConnectionStatus.ACCEPTED
        ).all()
    
    @staticmethod
    def get_connected_user_ids(db: Session, user_id: int) -> List[int]:
        connections = ConnectionDAL.get_connections(db, user_id)
        user_ids = []
        for conn in connections:
            if conn.requester_id == user_id:
                user_ids.append(conn.receiver_id)
            else:
                user_ids.append(conn.requester_id)
        return user_ids
    
    @staticmethod
    def accept_connection(db: Session, connection_id: int) -> Optional[ConnectionORM]:
        connection = ConnectionDAL.get_connection_by_id(db, connection_id)
        if not connection or connection.status != ConnectionStatus.PENDING:
            return None
        
        connection.status = ConnectionStatus.ACCEPTED
        connection.updated_at = get_current_timestamp()
        db.commit()
        db.refresh(connection)
        return connection
    
    @staticmethod
    def delete_connection(db: Session, connection_id: int) -> bool:
        connection = ConnectionDAL.get_connection_by_id(db, connection_id)
        if not connection:
            return False
        
        db.delete(connection)
        db.commit()
        return True


