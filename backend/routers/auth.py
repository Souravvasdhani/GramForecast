"""Auth router — signup, login."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import uuid

from database import get_db
import models
from auth_utils import hash_password, verify_password, create_access_token

router = APIRouter()


class SignupRequest(BaseModel):
    business_name:     str
    owner_name:        str
    mobile:            str
    email:             str
    password:          str
    business_category: str = "kirana_store"
    location:          str = ""


class LoginRequest(BaseModel):
    mobile:   str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    business_id:  str
    name:         str
    business_name: str = ""
    mobile:       str = ""
    location:     str = ""


@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    # Check duplicate mobile
    existing = db.query(models.User).filter(models.User.mobile == req.mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    # Create business
    business = models.Business(
        name=req.business_name,
        owner_name=req.owner_name,
        category=req.business_category,
        location=req.location,
        email=req.email,
    )
    db.add(business)
    db.flush()

    # Create user
    user = models.User(
        business_id=business.id,
        name=req.owner_name,
        role="owner",
        mobile=req.mobile,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "bid": str(business.id)})
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        business_id=str(business.id),
        name=user.name,
        business_name=business.name,
        mobile=user.mobile or "",
        location=business.location or "",
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.mobile == req.mobile).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.last_login_at = datetime.utcnow()
    db.commit()

    token = create_access_token({"sub": str(user.id), "bid": str(user.business_id)})
    # Eager-load business for extra fields stored in the session
    business = db.query(models.Business).filter(models.Business.id == user.business_id).first()
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        business_id=str(user.business_id),
        name=user.name,
        business_name=business.name if business else "",
        mobile=user.mobile or "",
        location=business.location if business else "",
    )
