from fastapi import APIRouter, Query
from app.schemas.prediction import PredictionOverviewResponse
from app.services.predictor import predictor_service

router = APIRouter()

@router.get("", response_model=PredictionOverviewResponse)
def get_fault_predictions(
    horizon_hours: int = Query(24, description="Forecast horizon in flight hours (e.g. 6, 24, 50, 100)")
):
    """Retrieve predictive maintenance assessment, fault risks, and RUL calculations."""
    return predictor_service.get_prediction_overview(horizon_hours)

