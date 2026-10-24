from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.dal.mysql_dal import get_db
from app.dal.mongodb_dal import get_mongodb
from app.models.user import UserCreate, UserUpdate, UserResponse
from app.services.user_service import UserService
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/admin", tags=["admin"])


# Dependency to check admin role
async def require_admin(current_user):
    """Require admin role - import from main.py dependencies"""
    if current_user.role.value != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# USER MANAGEMENT ROUTES
@router.post("/users", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Create a new user (admin only)
    
    - **email**: User's email address (must be unique)
    - **name**: User's full name
    - **password**: User's password (will be hashed)
    - **role**: ADMIN, STUDENT, or FACULTY
    - **course**: Required for students
    - **academic_position**: Required for faculty
    - **job_title**: Optional for admin
    """
    return UserService.create_user(db, user_data)


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Get all users (admin only)
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    """
    return UserService.get_users(db, skip, limit)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Get detailed user information (admin only)
    """
    return UserService.get_user(db, user_id)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Update user information (admin only)
    
    Admin can update any user's information including:
    - name, bio, image_url
    - course (for students)
    - academic_position (for faculty)
    - job_title (for admin)
    """
    return UserService.update_user(db, user_id, user_data, current_user.id, "ADMIN")


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Delete a user (admin only)
    
    Warning: This will cascade delete all related records:
    - Posts and comments
    - Connections
    - Notifications
    """
    return UserService.delete_user(db, user_id)

# ANALYTICS ROUTES
@router.get("/analytics/users")
def get_user_analytics(
    range_type: str = "week",
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Get user analytics (admin only)
    
    Returns statistics about total and active users by role
    
    - **range_type**: 'day', 'week', or 'month' for active user calculation
    """
    if range_type not in ["day", "week", "month"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="range_type must be 'day', 'week', or 'month'"
        )
    return AnalyticsService.get_user_analytics(db, range_type)


@router.get("/analytics/engagement")
async def get_engagement_analytics(
    range_type: str = "week",
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user = Depends(require_admin)
):
    """
    Get engagement analytics (admin only)
    
    Returns statistics about posts and comments volume
    
    - **range_type**: 'day', 'week', or 'month'
    """
    if range_type not in ["day", "week", "month"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="range_type must be 'day', 'week', or 'month'"
        )
    return await AnalyticsService.get_engagement_analytics(mongo_db, range_type)


@router.get("/analytics/popular-posts")
async def get_popular_posts(
    range_type: str = "week",
    limit: int = 10,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Get most popular posts (admin only)
    
    Returns top posts by comment count within specified time range
    
    - **range_type**: 'day', 'week', or 'month'
    - **limit**: Maximum number of posts to return (default 10)
    """
    if range_type not in ["day", "week", "month"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="range_type must be 'day', 'week', or 'month'"
        )
    return await AnalyticsService.get_popular_posts(mongo_db, mysql_db, range_type, limit)


@router.get("/analytics/user/{user_id}/stats")
async def get_user_statistics(
    user_id: int,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Get statistics for a specific user (admin only)
    
    Returns:
    - Total posts created
    - Total comments made
    - Total connections
    - Overall activity score
    """
    return await AnalyticsService.get_user_stats(mongo_db, mysql_db, user_id)

# BULK OPERATIONS
@router.post("/users/bulk-suspend")
def bulk_suspend_users(
    user_ids: List[int],
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Bulk suspend feature not yet implemented"
    )


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """
    Get summary data for admin dashboard (admin only)
    
    Returns all key metrics in one call:
    - User statistics
    - Engagement metrics
    - Popular posts
    """
    # Get all analytics for dashboard
    user_analytics = AnalyticsService.get_user_analytics(mysql_db, "week")
    engagement = await AnalyticsService.get_engagement_analytics(mongo_db, "week")
    popular = await AnalyticsService.get_popular_posts(mongo_db, mysql_db, "week", 5)
    
    return {
        "users": user_analytics,
        "engagement": engagement,
        "popular_posts": popular
    }