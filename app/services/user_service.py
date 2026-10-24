from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from app.dal.user_dal import UserDAL
from app.models.user import UserCreate, UserUpdate, UserResponse, UserRole
from app.services.auth_service import AuthService


class UserService:
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> UserResponse:
        """Create a new user (admin only)"""
        # Check if email already exists
        existing_user = UserDAL.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate role specific data
        if user_data.role == UserRole.STUDENT and not user_data.course:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course is required for students"
            )
        if user_data.role == UserRole.FACULTY and not user_data.academic_position:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Academic position is required for faculty"
            )
        
        user = UserDAL.create_user(db, user_data)
        return AuthService._build_user_response(user)
    
    @staticmethod
    def get_user(db: Session, user_id: int) -> UserResponse:
        """Get user by ID"""
        user = UserDAL.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return AuthService._build_user_response(user)
    
    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[UserResponse]:
        """Get all users"""
        users = UserDAL.get_users(db, skip, limit)
        return [AuthService._build_user_response(user) for user in users]
    
    @staticmethod
    def search_users(db: Session, query: str, current_user_id: int) -> List[UserResponse]:
        """Search users by name or email"""
        users = UserDAL.search_users(db, query, current_user_id)
        return [AuthService._build_user_response(user) for user in users]
    
    @staticmethod
    def update_user(db: Session, user_id: int, user_data: UserUpdate, current_user_id: int, current_user_role: str) -> UserResponse:
        """Update user information"""
        # Check permissions - users can only edit their own profile, admins can edit anyone
        if current_user_role != "ADMIN" and user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this user"
            )
        
        user = UserDAL.update_user(db, user_id, user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return AuthService._build_user_response(user)
    
    @staticmethod
    def change_password(db: Session, user_id: int, current_password: str, new_password: str, current_user_id: int) -> dict:
        """Change user password"""
        # Users can only change their own password
        if user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to change this password"
            )
        
        # Verify current password
        user = UserDAL.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        from app.utils.security import verify_password
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update password
        success = UserDAL.update_password(db, user_id, new_password)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {"message": "Password updated successfully"}
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> dict:
        """Delete user (admin only)"""
        success = UserDAL.delete_user(db, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return {"message": "User deleted successfully"}