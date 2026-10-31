import hashlib
import hmac
import time
from typing import Optional

def generate_session_token(email: str, secret_key: str) -> str:
    timestamp = str(int(time.time()))
    payload = f"{email}:{timestamp}"
    signature = hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"

def verify_session_token(token: str, secret_key: str, max_age_seconds: int = 86400) -> Optional[str]:
    parts = token.split(":")
    if len(parts) != 3:
        return None
    email, timestamp, signature = parts
    try:
        ts = int(timestamp)
        now = time.time()
        # Reject future skew > 300s or expired sessions
        if (ts > now + 300) or (now - ts > max_age_seconds):
            return None
    except (ValueError, TypeError):
        return None
    payload = f"{email}:{timestamp}"
    expected_sig = hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(signature, expected_sig):
        return email
    return None

