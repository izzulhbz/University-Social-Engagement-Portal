from app.models.user import UserCreate, UserUpdate
from app.services.user_service import UserService

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

from app.dependencies import require_admin, get_current_user
from app.dal.mysql_dal import get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/", dependencies=[Depends(require_admin)])
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user (admin only)"""
    return UserService.create_user(db, user_data)


@router.get("/")
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all users"""
    return UserService.get_users(db, skip, limit)


@router.get("/search")
def search_users(
    q: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search users by name or email (excludes admins and current user)"""
    return UserService.search_users(db, q, current_user.id)

@router.get("/{user_id}")
def get_user(
    user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    """Get user by ID"""
    return UserService.get_user(db, user_id)

@router.put("/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update user information"""
    return UserService.update_user(
        db, user_id, user_data, current_user.id, current_user.role.value
    )

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/{user_id}/change-password")
def change_password(
    user_id: int,
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Change user password"""
    return UserService.change_password(
        db,
        user_id,
        password_data.current_password,
        password_data.new_password,
        current_user.id,
    )

@router.post("/{user_id}/upload-profile-image")
async def upload_profile_image(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload profile image"""
    # Check permissions
    if current_user.id != user_id and current_user.role.value != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    from app.utils.file_handler import save_profile_image
    image_url = await save_profile_image(file)
    
    # Update user's image_url
    from app.models.user import UserUpdate
    UserService.update_user(db, user_id, UserUpdate(image_url=image_url), current_user.id, current_user.role.value)
    
    return {"image_url": image_url}

@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete user (admin only)"""
    return UserService.delete_user(db, user_id)
