from app.services.analytics_service import AnalyticsService
from fastapi import APIRouter, Depends
from app.dependencies import require_admin, get_current_user
from app.dal.mysql_dal import get_db
from app.dal.mongodb_dal import get_mongodb
from sqlalchemy.orm import Session
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/users")
def get_user_analytics(
    range_type: str = "week",
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Get user analytics (admin only)"""
    return AnalyticsService.get_user_analytics(db, range_type)


@router.get("/engagement")
async def get_engagement_analytics(
    range_type: str = "week",
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    current_user=Depends(require_admin),
):
    """Get engagement analytics (admin only)"""
    return await AnalyticsService.get_engagement_analytics(mongo_db, range_type)


@router.get("/popular-posts")
async def get_popular_posts(
    range_type: str = "week",
    limit: int = 10,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Get popular posts (admin only)"""
    return await AnalyticsService.get_popular_posts(
        mongo_db, mysql_db, range_type, limit
    )


@router.get("/advanced/network")
def get_network_analysis(
    db: Session = Depends(get_db), 
    current_user=Depends(require_admin)
):
    """
    Get social network analysis (admin only)
    Shows connection patterns, top connected users, acceptance rates
    """
    return AnalyticsService.get_network_analysis(db)


@router.get("/advanced/cross-role")
def get_cross_role_analysis(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """
    Get cross-role connection analysis (admin only)
    Shows connection patterns between different user types
    """
    return AnalyticsService.get_cross_role_analysis(db)


@router.get("/advanced/role-insights")
def get_role_insights(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """
    Get role-based insights (admin only)
    Shows top students and faculty by connections
    """
    return AnalyticsService.get_role_insights(db)


@router.get("/user/{user_id}")
async def get_user_stats(
    user_id: int,
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongodb),
    mysql_db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get statistics for a user"""
    return await AnalyticsService.get_user_stats(mongo_db, mysql_db, user_id)