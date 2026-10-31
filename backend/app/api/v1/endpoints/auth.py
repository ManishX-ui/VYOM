from fastapi import APIRouter
from app.core.config import settings
from app.core.security import generate_session_token
from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    """Authenticate mission engineer session."""
    token = generate_session_token(payload.email, settings.SECRET_KEY)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": payload.email,
            "name": "Omkar Sahu",
            "role": "Chief Avionics & Propulsion Engineer",
            "callsign": "OS",
        },
    }

@router.get("/me")
def get_current_user():
    """Get active authenticated session details."""
    return {
        "email": "admin@vyom.aero",
        "name": "Omkar Sahu",
        "role": "Chief Avionics & Propulsion Engineer",
        "callsign": "OS",
    }

