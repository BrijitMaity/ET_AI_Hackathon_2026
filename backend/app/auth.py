import hashlib
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional

from .db import get_db
from .models import User
from .rate_limiter import auth_limiter

router = APIRouter(prefix="/auth", tags=["auth"])

class AuthPayload(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field("Worker", pattern=r"^(Worker|Admin|Supervisor)$")
    email: Optional[str] = Field(None, pattern=r"^\S+@\S+\.\S+$", max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-\(\)]+$", max_length=20)
    employee_id: Optional[str] = Field(None, pattern=r"^[A-Z0-9-]+$", max_length=20)
    assigned_zone: Optional[str] = Field(None, max_length=50)

def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

@router.post("/register")
async def register(request: Request, payload: AuthPayload, db: AsyncSession = Depends(get_db)):
    await auth_limiter.check(request, identifier=payload.username)
    
    result = await db.execute(select(User).where(User.username == payload.username))
    if result.scalars().first():
        auth_limiter.record_failure(request, identifier=payload.username)
        raise HTTPException(status_code=400, detail="Username already exists")

    salt = os.urandom(16).hex()
    hashed = hash_password(payload.password, salt)

    new_user = User(
        username=payload.username,
        password_hash=hashed,
        salt=salt,
        role=payload.role,
        email=payload.email,
        phone=payload.phone,
        employee_id=payload.employee_id,
        assigned_zone=payload.assigned_zone
    )
    db.add(new_user)
    await db.commit()
    auth_limiter.record_success(request, identifier=payload.username)
    return {"status": "ok", "message": "User registered successfully"}

@router.post("/login")
async def login(request: Request, payload: AuthPayload, db: AsyncSession = Depends(get_db)):
    await auth_limiter.check(request, identifier=payload.username)
    
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalars().first()
    
    if not user:
        auth_limiter.record_failure(request, identifier=payload.username)
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    if user.role != payload.role:
        auth_limiter.record_failure(request, identifier=payload.username)
        raise HTTPException(status_code=401, detail=f"User is not registered for role: {payload.role}")

    hashed = hash_password(payload.password, user.salt)
    if hashed != user.password_hash:
        auth_limiter.record_failure(request, identifier=payload.username)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    auth_limiter.record_success(request, identifier=payload.username)
    return {
        "status": "ok", 
        "message": "Login successful", 
        "role": user.role, 
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "employee_id": user.employee_id,
        "assigned_zone": user.assigned_zone
    }
