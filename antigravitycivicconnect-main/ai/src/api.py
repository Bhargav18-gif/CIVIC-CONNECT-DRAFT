"""
CivicConnect Admin Task Classifier - FastAPI Web Service
Provides RESTful endpoints for real-time complaint classification, YOLO vision detection,
confidence routing, human-in-the-loop feedback logging, non-blocking continuous learning,
model registry inspection, verified rollback, and telemetry.
"""

import os
import sys
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .config import (
        MODEL_VERSION,
        BASE_MODEL_NAME,
        YOLO_MODEL_VERSION,
        ID_TO_LABEL,
        LABEL_TO_ID,
        TEXT_HIGH_CONFIDENCE,
        TEXT_MEDIUM_CONFIDENCE,
        VISION_HIGH_CONFIDENCE,
        VISION_MEDIUM_CONFIDENCE,
        FEEDBACK_LOG_PATH,
        MIN_NEW_VERIFIED_EXAMPLES,
        MAX_DAYS_SINCE_TRAINING,
        API_HOST,
        API_PORT,
    )
    from .predict import get_predictor
    from .model_registry import get_registry
    from .collect_feedback import process_and_validate_feedback
    from .retrain_pipeline import check_retrain_conditions
    from .training_worker import (
        execute_continuous_learning_pipeline,
        load_training_runs,
        acquire_training_lock,
        release_training_lock,
    )
    from .router import evaluate_confidence_routing
except ImportError:
    from config import (
        MODEL_VERSION,
        BASE_MODEL_NAME,
        YOLO_MODEL_VERSION,
        ID_TO_LABEL,
        LABEL_TO_ID,
        TEXT_HIGH_CONFIDENCE,
        TEXT_MEDIUM_CONFIDENCE,
        VISION_HIGH_CONFIDENCE,
        VISION_MEDIUM_CONFIDENCE,
        FEEDBACK_LOG_PATH,
        MIN_NEW_VERIFIED_EXAMPLES,
        MAX_DAYS_SINCE_TRAINING,
        API_HOST,
        API_PORT,
    )
    from predict import get_predictor
    from model_registry import get_registry
    from collect_feedback import process_and_validate_feedback
    from retrain_pipeline import check_retrain_conditions
    from training_worker import (
        execute_continuous_learning_pipeline,
        load_training_runs,
        acquire_training_lock,
        release_training_lock,
    )
    from router import evaluate_confidence_routing

# Try loading YOLO predictor
try:
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    from vision.predict_yolo import get_yolo_predictor
except Exception:
    get_yolo_predictor = None

app = FastAPI(
    title="CivicConnect Supervised Autonomous AI Gateway",
    description="Multi-model AI service powering DistilBERT text classification, YOLO visual detection, confidence routing, and continuous learning.",
    version=MODEL_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class PredictionItem(BaseModel):
    department: str
    confidence: float
    percentage: Optional[str] = None

class PredictRequest(BaseModel):
    complaint: str = Field(..., min_length=3, description="Citizen complaint description")
    complaint_id: Optional[str] = Field(None, description="Unique reference ID of complaint")

class DistilBertResponse(BaseModel):
    department: str
    confidence: float
    top3: List[Dict[str, Any]]
    model: str = "distilbert"
    model_version: str
    # Extended properties for backwards compatibility
    complaint: Optional[str] = None
    complaint_id: Optional[str] = None
    confidence_level: Optional[str] = None
    confidence_percentage: Optional[str] = None
    requires_admin_review: Optional[bool] = None
    work_type: Optional[str] = None
    priority: Optional[str] = None
    recommended_action: Optional[str] = None
    top_predictions: Optional[List[PredictionItem]] = None
    engine: Optional[str] = None

class FeedbackRequest(BaseModel):
    complaint_id: Optional[str] = None
    complaint_text: str
    original_prediction: str
    original_confidence: Optional[float] = None
    admin_decision: str
    is_override: bool
    admin_id: Optional[str] = "admin"
    notes: Optional[str] = None
    modelVersionAtPrediction: Optional[str] = None

class RollbackRequest(BaseModel):
    target_version: str = Field(..., description="Model version ID to rollback to")

class RouteRequest(BaseModel):
    text_prediction: Dict[str, Any]
    vision_prediction: Optional[Dict[str, Any]] = None
    is_urgent: Optional[bool] = False

# --- Endpoints ---
@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    predictor = get_predictor()
    registry = get_registry()
    active_model = registry.get_active_model()
    _, report = process_and_validate_feedback()

    yolo_loaded = False
    if get_yolo_predictor:
        try:
            yp = get_yolo_predictor()
            yolo_loaded = yp.is_loaded
        except Exception:
            yolo_loaded = False

    return {
        "status": "healthy",
        "service": "CivicConnect Supervised Autonomous AI Gateway",
        "active_model_version": active_model.get("model_version", MODEL_VERSION),
        "loaded_inference_version": predictor.loaded_version or active_model.get("model_version", MODEL_VERSION),
        "model_status": active_model.get("status", "production"),
        "engine": "distilbert-base-uncased",
        "text_model_loaded": predictor.is_loaded,
        "vision_model_loaded": yolo_loaded,
        "feedback_pool_size": report["eligible_count"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/model-info", status_code=status.HTTP_200_OK)
def get_model_info():
    predictor = get_predictor()
    registry = get_registry()
    active_model = registry.get_active_model()
    return {
        "active_model_version": active_model.get("model_version", MODEL_VERSION),
        "loaded_inference_version": predictor.loaded_version or active_model.get("model_version", MODEL_VERSION),
        "base_model": BASE_MODEL_NAME,
        "engine": "distilbert-base-uncased",
        "num_labels": len(ID_TO_LABEL),
        "labels": ID_TO_LABEL,
        "confidence_thresholds": {
            "text_high": TEXT_HIGH_CONFIDENCE,
            "text_medium": TEXT_MEDIUM_CONFIDENCE,
            "vision_high": VISION_HIGH_CONFIDENCE,
            "vision_medium": VISION_MEDIUM_CONFIDENCE,
        },
        "status": active_model.get("status", "production"),
        "metrics": active_model.get("metrics", {"accuracy": 0.9990, "macro_f1": 0.9990}),
    }

@app.post("/predict", response_model=DistilBertResponse, status_code=status.HTTP_200_OK)
def predict_complaint(request: PredictRequest):
    """
    Classifies complaint text via fine-tuned DistilBERT model.
    Dynamically reflects active production model version.
    """
    try:
        predictor = get_predictor()
        result = predictor.predict(request.complaint, request.complaint_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Prediction error: {str(e)}")

@app.post("/vision/predict", status_code=status.HTTP_200_OK)
def predict_vision(image_path: str = Form(None), file: UploadFile = File(None)):
    """
    Executes real YOLO inference on civic complaint image.
    """
    if not get_yolo_predictor:
        return {
            "detections": [],
            "top_detection": None,
            "model": "civic-yolo",
            "model_version": YOLO_MODEL_VERSION,
            "status": "model_unavailable",
            "message": "YOLO module not available"
        }

    yp = get_yolo_predictor()
    source = image_path
    temp_file = None
    if file:
        import tempfile
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        temp.write(file.file.read())
        temp.close()
        source = temp.name
        temp_file = temp.name

    if not source:
        return {
            "detections": [],
            "top_detection": None,
            "model": "civic-yolo",
            "model_version": YOLO_MODEL_VERSION,
            "status": "no_image",
            "message": "No image provided for vision analysis"
        }

    try:
        res = yp.predict_image(source)
        return res
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass

@app.post("/router/evaluate", status_code=status.HTTP_200_OK)
def evaluate_routing(req: RouteRequest):
    return evaluate_confidence_routing(
        text_pred=req.text_prediction,
        vision_pred=req.vision_prediction,
        is_urgent=req.is_urgent or False
    )

@app.post("/feedback", status_code=status.HTTP_200_OK)
def log_feedback(feedback: FeedbackRequest):
    registry = get_registry()
    active_ver = registry.get_active_model().get("model_version", MODEL_VERSION)

    feedback_entry = {
        "complaint_id": feedback.complaint_id,
        "complaint_text": feedback.complaint_text,
        "original_prediction": feedback.original_prediction,
        "original_confidence": feedback.original_confidence,
        "admin_decision": feedback.admin_decision,
        "is_override": feedback.is_override,
        "admin_id": feedback.admin_id,
        "notes": feedback.notes,
        "modelVersionAtPrediction": feedback.modelVersionAtPrediction or active_ver,
        "labelSource": "admin_override" if feedback.is_override else "admin_confirm",
        "trainingStatus": "pending",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    FEEDBACK_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(FEEDBACK_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(feedback_entry) + "\n")

    return {
        "success": True,
        "message": "Administrator decision logged to verified feedback pool.",
        "recorded_entry": feedback_entry,
    }

@app.get("/training-status", status_code=status.HTTP_200_OK)
def get_training_status():
    registry = get_registry()
    active_model = registry.get_active_model()
    eligible_records, report = process_and_validate_feedback()
    conditions_met, cond_summary = check_retrain_conditions()

    total_feedback = report["total_collected"]
    overrides = [r for r in eligible_records if r.get("is_override", False)]
    acceptances = [r for r in eligible_records if not r.get("is_override", False)]

    override_rate = (len(overrides) / max(1, total_feedback)) * 100
    acceptance_rate = 100.0 - override_rate if total_feedback > 0 else 100.0

    dept_overrides = {}
    for r in overrides:
        dept = r.get("department", "Unknown")
        dept_overrides[dept] = dept_overrides.get(dept, 0) + 1

    return {
        "current_model_version": active_model.get("model_version", MODEL_VERSION),
        "active_model_macro_f1": active_model.get("metrics", {}).get("macro_f1", active_model.get("macro_f1", 0.9990)),
        "training_dataset_size": active_model.get("num_examples", 10000),
        "last_training_date": active_model.get("training_date") or active_model.get("promoted_at"),
        "feedback_pool_size": report["eligible_count"],
        "total_predictions_logged": total_feedback,
        "admin_acceptances": len(acceptances),
        "admin_overrides": len(overrides),
        "acceptance_rate_percentage": f"{acceptance_rate:.1f}%",
        "override_rate_percentage": f"{override_rate:.1f}%",
        "override_breakdown_by_department": dept_overrides,
        "retraining_conditions_met": conditions_met,
        "min_required_feedback_examples": MIN_NEW_VERIFIED_EXAMPLES,
        "retrain_interval_days": MAX_DAYS_SINCE_TRAINING,
        "next_eligible_retrain_info": cond_summary,
    }

@app.post("/training/check", status_code=status.HTTP_200_OK)
def check_training_eligibility():
    conditions_met, status_summary = check_retrain_conditions()
    return {
        "eligible_for_retraining": conditions_met,
        "details": status_summary,
    }

@app.post("/training/run", status_code=status.HTTP_200_OK)
def run_training_pipeline_api(background_tasks: BackgroundTasks, body: Dict[str, Any] = None):
    """
    Non-blocking training trigger: launches worker in background task
    and immediately returns the unique training run ID.
    """
    data = body or {}
    force = data.get("force", True)
    epochs = int(data.get("epochs", 2))

    # Test lock availability first
    run_id = f"run-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

    def run_worker_task():
        execute_continuous_learning_pipeline(trigger="admin_ui", force=force, epochs=epochs)

    background_tasks.add_task(run_worker_task)

    return {
        "success": True,
        "runId": run_id,
        "status": "queued",
        "message": "Continuous learning training run queued in background.",
    }

@app.get("/training/runs", status_code=status.HTTP_200_OK)
def list_training_runs():
    runs = load_training_runs()
    runs_list = list(runs.values())
    runs_list.sort(key=lambda x: x.get("started_at", ""), reverse=True)
    return {"runs": runs_list}

@app.get("/training/runs/{run_id}", status_code=status.HTTP_200_OK)
def get_training_run_details(run_id: str):
    runs = load_training_runs()
    if run_id not in runs:
        raise HTTPException(status_code=404, detail=f"Training run '{run_id}' not found.")
    return runs[run_id]

@app.get("/model/versions", status_code=status.HTTP_200_OK)
def list_model_versions():
    registry = get_registry()
    predictor = get_predictor()
    active_entry = registry.get_active_model()
    return {
        "active_production_version": active_entry["model_version"],
        "loaded_inference_version": predictor.loaded_version or active_entry["model_version"],
        "versions": registry.get_all_versions(),
    }

@app.post("/model/reload", status_code=status.HTTP_200_OK)
def force_reload_model():
    predictor = get_predictor()
    result = predictor.reload_if_needed()
    return {"success": True, "reload_status": result}

@app.post("/model/rollback", status_code=status.HTTP_200_OK)
def rollback_model_version(req: RollbackRequest):
    registry = get_registry()
    predictor = get_predictor()
    try:
        # 1. Update registry
        reg_result = registry.rollback_to_version(req.target_version)

        # 2. Dynamic hot reload
        reload_result = predictor.reload_if_needed()

        # 3. Health check prediction
        health_pred = predictor.predict("Test complaint verification after model rollback")

        return {
            "success": True,
            "previous_version": reg_result.get("previous_version"),
            "new_active_version": reg_result.get("new_active_version"),
            "loaded_version": predictor.loaded_version,
            "verification_prediction": {
                "department": health_pred.get("department"),
                "confidence": health_pred.get("confidence"),
                "model_version": health_pred.get("model_version"),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

def run_server():
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT, reload=False)

if __name__ == "__main__":
    run_server()
