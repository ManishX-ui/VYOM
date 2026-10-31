from pydantic import BaseModel
from typing import Optional, Dict, Any

class LoginRequest(BaseModel):
    email: str
    password: str = "demo"

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

