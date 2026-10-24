from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.dal.user_dal import UserDAL
from app.utils.security import verify_password, create_access_token
from app.models.user import UserResponse, UserRole
from datetime import timedelta
from app.config import settings


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> dict:
        """Authenticate user and return access token"""
        user = UserDAL.get_user_by_email(db, email)
        
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        UserDAL.update_last_login(db, user.id)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value},
            expires_delta=access_token_expires
        )
        
        # Build user response
        user_response = AuthService._build_user_response(user)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
    
    @staticmethod
    def _build_user_response(user) -> UserResponse:
        """Build user response with role-specific data"""
        user_dict = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "bio": user.bio,
            "role": user.role,
            "image_url": user.image_url,
            "last_login_at": user.last_login_at,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "course": None,
            "academic_position": None,
            "job_title": None
        }
        
        if user.role == UserRole.STUDENT and user.student:
            user_dict["course"] = user.student.course
        elif user.role == UserRole.FACULTY and user.faculty:
            user_dict["academic_position"] = user.faculty.academic_position
        elif user.role == UserRole.ADMIN and user.admin:
            user_dict["job_title"] = user.admin.job_title
        
        return UserResponse(**user_dict)