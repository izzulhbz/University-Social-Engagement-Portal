from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict
from bson import ObjectId
from app.models.post import PostCreate, PostUpdate
from app.utils.time_utils import get_current_timestamp


class PostDAL:
    @staticmethod
    async def create_post(db: AsyncIOMotorDatabase, author_id: int, post_data: PostCreate) -> str:
        """Create a new post"""
        now = get_current_timestamp()
        
        post_doc = {
            "author_id": author_id,
            "title": post_data.title,
            "content": post_data.content,
            "image_url": post_data.image_url,
            "created_at": now,
            "updated_at": now
        }
        
        result = await db.posts.insert_one(post_doc)
        return str(result.inserted_id)
    
    @staticmethod
    async def get_post_by_id(db: AsyncIOMotorDatabase, post_id: str) -> Optional[Dict]:
        """Get post by ID"""
        try:
            return await db.posts.find_one({"_id": ObjectId(post_id)})
        except:
            return None
    
    @staticmethod
    async def get_posts_by_author(db: AsyncIOMotorDatabase, author_id: int, skip: int = 0, limit: int = 20) -> List[Dict]:
        """Get posts by author"""
        cursor = db.posts.find({"author_id": author_id}).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    @staticmethod
    async def get_posts_by_authors(db: AsyncIOMotorDatabase, author_ids: List[int], skip: int = 0, limit: int = 20) -> List[Dict]:
        """Get posts by multiple authors (for news feed)"""
        cursor = db.posts.find(
            {"author_id": {"$in": author_ids}}
        ).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    
    @staticmethod
    async def update_post(db: AsyncIOMotorDatabase, post_id: str, post_data: PostUpdate) -> bool:
        """Update post"""
        try:
            update_data = post_data.model_dump(exclude_unset=True)
            if not update_data:
                return False
            
            update_data["updated_at"] = get_current_timestamp()
            
            result = await db.posts.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except:
            return False
    
    @staticmethod
    async def delete_post(db: AsyncIOMotorDatabase, post_id: str) -> bool:
        """Delete post"""
        try:
            result = await db.posts.delete_one({"_id": ObjectId(post_id)})
            # Also delete all comments for this post
            await db.comments.delete_many({"post_id": post_id})
            return result.deleted_count > 0
        except:
            return False
    
    @staticmethod
    async def count_posts_by_author(db: AsyncIOMotorDatabase, author_id: int) -> int:
        """Count posts by author"""
        return await db.posts.count_documents({"author_id": author_id})
    
    @staticmethod
    async def count_posts_in_range(db: AsyncIOMotorDatabase, start_time: int, end_time: int) -> int:
        """Count posts created within time range"""
        return await db.posts.count_documents({
            "created_at": {"$gte": start_time, "$lte": end_time}
        })
    
    @staticmethod
    async def get_popular_posts(db: AsyncIOMotorDatabase, start_time: int, end_time: int, limit: int = 10) -> List[Dict]:
        """Get most popular posts (by comment count) within time range"""
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_time, "$lte": end_time}
                }
            },
            {
                "$lookup": {
                    "from": "comments",
                    "let": {"post_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$post_id", "$$post_id"]}}}
                    ],
                    "as": "comments"
                }
            },
            {
                "$addFields": {
                    "comment_count": {"$size": "$comments"}
                }
            },
            {
                "$sort": {"comment_count": -1}
            },
            {
                "$limit": limit
            }
        ]
        
        cursor = db.posts.aggregate(pipeline)
        return await cursor.to_list(length=limit)



