from pydantic import BaseModel, EmailStr
from app.services.auth_service import AuthService
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.dal.mysql_dal import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint"""
    return AuthService.authenticate_user(db, login_data.email, login_data.password)


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    """Get current user info"""
    from app.services.auth_service import AuthService

    return AuthService._build_user_response(current_user)
