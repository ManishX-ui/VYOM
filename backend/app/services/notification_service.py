"""
VYOM MALE UAV - Real-Time Notification Queue Service (Phase 10)
Manages priority notifications, queue ordering, and WebSocket notification broadcasts.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

logger = logging.getLogger("vyom.backend.notifications")

class NotificationService:
    def __init__(self):
        self._queue: List[Dict[str, Any]] = []
        self._max_size = 100
        self._notification_counter = 1

    def enqueue_notification(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enqueues an alert as an actionable operator notification with priority ranking.
        """
        severity = alert.get("severity", "MEDIUM").upper()
        now_iso = datetime.now(timezone.utc).isoformat()
        
        notification_id = f"NOTIF-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{self._notification_counter:04d}"
        self._notification_counter += 1

        notification = {
            "id": notification_id,
            "alert_id": alert.get("id", "ALT-UNKNOWN"),
            "title": alert.get("title", "Telemetry Alert"),
            "message": alert.get("description", "Aero engine parameter deviation observed."),
            "severity": severity,
            "uav_id": alert.get("uav_id", "UAV-ROTAX-001"),
            "timestamp": alert.get("timestamp", now_iso),
            "read": False,
        }

        # Priority insertion: CRITICAL / HIGH inserted at the front
        if severity in ["CRITICAL", "HIGH"]:
            self._queue.insert(0, notification)
        else:
            self._queue.append(notification)

        # Enforce size limit
        if len(self._queue) > self._max_size:
            self._queue.pop()

        logger.info(f"Notification enqueued [{severity}]: {notification['title']} ({notification_id})")
        return notification

    def get_notifications(
        self,
        uav_id: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Retrieves notifications with optional filtering."""
        res = list(self._queue)
        target_uav = uav_id if isinstance(uav_id, str) else None
        target_unread = unread_only if isinstance(unread_only, bool) else False
        clean_limit = limit if isinstance(limit, int) else 50
        if target_uav:
            res = [n for n in res if n.get("uav_id") == target_uav]
        if target_unread:
            res = [n for n in res if not n.get("read", False)]
        return res[:clean_limit]

    def mark_as_read(self, notification_id: str) -> bool:
        """Marks a notification as read."""
        for n in self._queue:
            if n.get("id") == notification_id:
                n["read"] = True
                return True
        return False

    def get_unread_count(self, uav_id: Optional[str] = None) -> int:
        """Returns the count of unread notifications."""
        items = self.get_notifications(uav_id=uav_id, unread_only=True)
        return len(items)

notification_service = NotificationService()

