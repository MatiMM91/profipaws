from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.services.auth import get_current_user
from app.services.billing import require_pro
from app.services.alerts import upcoming_for_owner, dispatch_due_reminders

router = APIRouter(prefix="/alerts", tags=["Alerts"])
settings = get_settings()


@router.get("/upcoming")
def list_upcoming_alerts(
    days: int = Query(default=14, ge=1, le=60),
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db),
):
    """Pro: vaccines and calendar events due in the next N days."""
    return {"items": upcoming_for_owner(db, current_user, days=days)}


@router.post("/dispatch")
def dispatch_alerts(
    db: Session = Depends(get_db),
    x_alerts_secret: str | None = Header(default=None, alias="X-Alerts-Secret"),
):
    """
    Cron endpoint: email Pro owners about upcoming calendar reminders.
    Protect with ALERTS_CRON_SECRET header.
    """
    if not settings.alerts_cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ALERTS_CRON_SECRET is not configured",
        )
    if not x_alerts_secret or x_alerts_secret != settings.alerts_cron_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid secret")
    return dispatch_due_reminders(db)
