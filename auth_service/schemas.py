from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Literal

# Model for creating a new user (for DMT admin)
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal['public', 'police', 'dmt'] # Ensures role is one of these

# Model for the login form
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Model for what the API returns (hides password)
class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str

    class Config:
        from_attributes = True # Changed from orm_mode

# Model for the token
class Token(BaseModel):
    access_token: str
    token_type: str