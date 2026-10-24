"""
Data Access Layer (DAL) Package

This package contains all database access logic for both MySQL and MongoDB.
"""

from app.dal.mysql_dal import get_db, Base, engine, SessionLocal
from app.dal.mongodb_dal import MongoDBConnection, get_mongodb
from app.dal.user_dal import UserDAL, UserORM, StudentORM, FacultyORM, AdminORM
from app.dal.connection_dal import ConnectionDAL, ConnectionORM
from app.dal.notification_dal import NotificationDAL, NotificationORM
from app.dal.post_dal import PostDAL
from app.dal.comment_dal import CommentDAL

__all__ = [
    # MySQL
    "get_db",
    "Base",
    "engine",
    "SessionLocal",
    
    # MongoDB
    "MongoDBConnection",
    "get_mongodb",
    
    # User DAL
    "UserDAL",
    "UserORM",
    "StudentORM",
    "FacultyORM",
    "AdminORM",
    
    # Connection DAL
    "ConnectionDAL",
    "ConnectionORM",
    
    # Notification DAL
    "NotificationDAL",
    "NotificationORM",
    
    # Post DAL
    "PostDAL",
    
    # Comment DAL
    "CommentDAL",
]