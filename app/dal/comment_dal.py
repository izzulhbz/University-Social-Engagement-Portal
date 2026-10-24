from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict
from bson import ObjectId
from app.models.comment import CommentCreate, CommentUpdate
from app.utils.time_utils import get_current_timestamp


class CommentDAL:
    @staticmethod
    async def create_comment(db: AsyncIOMotorDatabase, post_id: str, author_id: int, comment_data: CommentCreate) -> str:
        """Create a new comment"""
        now = get_current_timestamp()
        
        comment_doc = {
            "post_id": post_id,
            "author_id": author_id,
            "content": comment_data.content,
            "created_at": now,
            "updated_at": now
        }
        
        result = await db.comments.insert_one(comment_doc)
        return str(result.inserted_id)
    
    @staticmethod
    async def get_comment_by_id(db: AsyncIOMotorDatabase, comment_id: str) -> Optional[Dict]:
        """Get comment by ID"""
        try:
            return await db.comments.find_one({"_id": ObjectId(comment_id)})
        except:
            return None
    
    @staticmethod
    async def get_comments_by_post(db: AsyncIOMotorDatabase, post_id: str, skip: int = 0, limit: int = 50) -> List[Dict]:
        """Get comments for a post"""
        cursor = db.comments.find({"post_id": post_id}).sort("created_at", 1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    @staticmethod
    async def count_comments_by_post(db: AsyncIOMotorDatabase, post_id: str) -> int:
        """Count comments for a post"""
        return await db.comments.count_documents({"post_id": post_id})
    
    @staticmethod
    async def count_comments_by_author(db: AsyncIOMotorDatabase, author_id: int) -> int:
        """Count comments by author"""
        return await db.comments.count_documents({"author_id": author_id})
    
    @staticmethod
    async def count_comments_in_range(db: AsyncIOMotorDatabase, start_time: int, end_time: int) -> int:
        """Count comments created within time range"""
        return await db.comments.count_documents({
            "created_at": {"$gte": start_time, "$lte": end_time}
        })
    
    @staticmethod
    async def update_comment(db: AsyncIOMotorDatabase, comment_id: str, comment_data: CommentUpdate) -> bool:
        """Update comment"""
        try:
            update_data = comment_data.model_dump(exclude_unset=True)
            if not update_data:
                return False
            
            update_data["updated_at"] = get_current_timestamp()
            
            result = await db.comments.update_one(
                {"_id": ObjectId(comment_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    async def delete_comment(db: AsyncIOMotorDatabase, comment_id: str) -> bool:
        """Delete comment"""
        try:
            result = await db.comments.delete_one({"_id": ObjectId(comment_id)})
            return result.deleted_count > 0
        except:
            return False