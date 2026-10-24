from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session
from typing import Dict, List
from app.dal.user_dal import UserDAL
from app.dal.post_dal import PostDAL
from app.dal.comment_dal import CommentDAL
from app.utils.time_utils import get_timestamp_range
from app.models.user import UserRole

class AnalyticsService:
    @staticmethod
    def get_user_analytics(db: Session, range_type: str = "week") -> Dict:
        """
        Get user analytics: total users and active users by role
        range_type: 'day', 'week', or 'month'
        """
        start_time, end_time = get_timestamp_range(range_type)
        
        # Total users by role
        total_students = UserDAL.count_users_by_role(db, UserRole.STUDENT)
        total_faculty = UserDAL.count_users_by_role(db, UserRole.FACULTY)
        total_admins = UserDAL.count_users_by_role(db, UserRole.ADMIN)
        
        # Active users (logged in within time range) by role
        active_users = UserDAL.count_active_users(db, start_time, end_time)
        
        return {
            "range": range_type,
            "total_users": {
                "student": total_students,
                "faculty": total_faculty,
                "admin": total_admins,
                "all": total_students + total_faculty + total_admins
            },
            "active_users": {
                "student": active_users.get(UserRole.STUDENT, 0),
                "faculty": active_users.get(UserRole.FACULTY, 0),
                "admin": active_users.get(UserRole.ADMIN, 0),
                "all": sum(active_users.values())
            },
            "inactive_users": {
                "student": total_students - active_users.get(UserRole.STUDENT, 0),
                "faculty": total_faculty - active_users.get(UserRole.FACULTY, 0),
                "admin": total_admins - active_users.get(UserRole.ADMIN, 0)
            }
        }
    
    @staticmethod
    async def get_engagement_analytics(mongo_db: AsyncIOMotorDatabase, range_type: str = "week") -> Dict:
        """
        Get engagement analytics: posts and comments counts
        range_type: 'day', 'week', or 'month'
        """
        start_time, end_time = get_timestamp_range(range_type)
        
        posts_count = await PostDAL.count_posts_in_range(mongo_db, start_time, end_time)
        comments_count = await CommentDAL.count_comments_in_range(mongo_db, start_time, end_time)
        
        return {
            "range": range_type,
            "posts": posts_count,
            "comments": comments_count,
            "total_engagement": posts_count + comments_count
        }
    
    @staticmethod
    async def get_popular_posts(
        mongo_db: AsyncIOMotorDatabase,
        mysql_db: Session,
        range_type: str = "week",
        limit: int = 10
    ) -> List[Dict]:
        """
        Get most popular posts (by comment count) within time range
        range_type: 'day', 'week', or 'month'
        """
        start_time, end_time = get_timestamp_range(range_type)
        
        popular_posts = await PostDAL.get_popular_posts(mongo_db, start_time, end_time, limit)
        
        # Enrich with author information
        result = []
        for post in popular_posts:
            author = UserDAL.get_user_by_id(mysql_db, post["author_id"])
            
            result.append({
                "id": str(post["_id"]),
                "title": post.get("title", ""),
                "content": post["content"][:100] + "..." if len(post["content"]) > 100 else post["content"],
                "author_id": post["author_id"],
                "author_name": author.name if author else "Unknown",
                "author_role": author.role.value if author else "UNKNOWN",
                "comment_count": post.get("comment_count", 0),
                "created_at": post["created_at"]
            })
        
        return result
    
    @staticmethod
    async def get_user_stats(mongo_db: AsyncIOMotorDatabase, mysql_db: Session, user_id: int) -> Dict:
        """Get statistics for a specific user"""
        # Get user info
        user = UserDAL.get_user_by_id(mysql_db, user_id)
        if not user:
            return {}
        
        # Count posts and comments
        post_count = await PostDAL.count_posts_by_author(mongo_db, user_id)
        comment_count = await CommentDAL.count_comments_by_author(mongo_db, user_id)
        
        # Count connections
        connection_count = 0
        if user.role != UserRole.ADMIN:
            from app.dal.connection_dal import ConnectionDAL
            connections = ConnectionDAL.get_connections(mysql_db, user_id)
            connection_count = len(connections)
        
        return {
            "user_id": user_id,
            "name": user.name,
            "role": user.role.value,
            "posts": post_count,
            "comments": comment_count,
            "connections": connection_count,
            "total_activity": post_count + comment_count
        }

    @staticmethod
    def get_network_analysis(db: Session) -> Dict:
        """Get social network analysis"""
        from app.dal.analytics_dal import AdvancedAnalyticsDAL
        return AdvancedAnalyticsDAL.get_connection_network_stats(db)
    
    @staticmethod
    def get_role_insights(db: Session) -> Dict:
        """Get role-based insights"""
        from app.dal.analytics_dal import AdvancedAnalyticsDAL
        return AdvancedAnalyticsDAL.get_role_based_insights(db)
    
    @staticmethod
    def get_cross_role_analysis(db: Session) -> Dict:
        """Get cross-role connection analysis"""
        from app.dal.analytics_dal import AdvancedAnalyticsDAL
        
        connections = AdvancedAnalyticsDAL.get_cross_role_connections(db)
        return {
            "cross_role_connections": connections,
            "description": "Connection patterns between different user roles"
        }