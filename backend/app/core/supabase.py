"""
Supabase Privileged Backend Service
Allows server-side operations using the Service Role Key.
Never expose this key or client to browser frontend code.
"""

import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("vyom.backend.supabase")

class SupabaseBackendClient:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.is_configured = bool(
            self.url 
            and self.service_key 
            and "your-project" not in self.url
            and "your-supabase" not in self.service_key
        )
        if self.is_configured:
            logger.info("Supabase backend service client initialized.")
        else:
            logger.info("Supabase not configured; operating in local in-memory persistence mode.")

    async def log_telemetry_event(self, event_type: str, payload: Dict[str, Any]) -> bool:
        if not self.is_configured:
            return True
        # Future Supabase RPC or table insert
        return True

supabase_client = SupabaseBackendClient()

