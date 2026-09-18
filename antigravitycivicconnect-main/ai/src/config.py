import os
from pathlib import Path

# ==============================================================================
# Paths Configuration
# ==============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_ROOT = Path(os.getenv("MODEL_ROOT", str(BASE_DIR / "model")))
DATASET_DIR = BASE_DIR / "dataset"

PRODUCTION_MODELS_DIR = MODEL_ROOT / "production"
CANDIDATE_MODELS_DIR = MODEL_ROOT / "candidates"
ARCHIVED_MODELS_DIR = MODEL_ROOT / "archived"
MODEL_DIR = PRODUCTION_MODELS_DIR / "civicconnect-admin-v1.0.0"
CHECKPOINT_DIR = MODEL_ROOT / "checkpoints"
TRAINING_LOCK_PATH = MODEL_ROOT / ".training_lock.json"

FEEDBACK_LOG_PATH = DATASET_DIR / "admin_feedback.jsonl"
YOLO_WEIGHTS_DIR = BASE_DIR / "vision" / "weights"

TRAIN_CSV = DATASET_DIR / "train.csv"
VALIDATION_CSV = DATASET_DIR / "validation.csv"
TEST_CSV = DATASET_DIR / "test.csv"
GOLDEN_DATASET_PATH = Path(os.getenv("GOLDEN_DATASET_PATH", str(DATASET_DIR / "golden_real_world.csv")))

# Ensure core directories exist
PRODUCTION_MODELS_DIR.mkdir(parents=True, exist_ok=True)
CANDIDATE_MODELS_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATASET_DIR.mkdir(parents=True, exist_ok=True)

# ==============================================================================
# Model & Architecture Configuration
# ==============================================================================
MODEL_VERSION = os.getenv("MODEL_VERSION", "civicconnect-admin-v1.0.0")
BASE_MODEL_NAME = "distilbert-base-uncased"
YOLO_MODEL_VERSION = os.getenv("YOLO_MODEL_VERSION", "civic-yolo-v1.0")

# ==============================================================================
# Label Mappings (Department Classifier Head)
# ==============================================================================
ID_TO_LABEL = {
    0: "Roads",
    1: "Water",
    2: "Electricity",
    3: "Sanitation",
    4: "Drainage",
    5: "Traffic",
    6: "Public Health",
    7: "Municipal Services",
}

LABEL_TO_ID = {v: k for k, v in ID_TO_LABEL.items()}
NUM_LABELS = len(ID_TO_LABEL)

# ==============================================================================
# Administrative Action & Work Type Guidance
# (Rule-based heuristics for operational dispatch guidance)
# ==============================================================================
DEPARTMENT_ACTION_MAP = {
    "Roads": {
        "work_type": "Road & Pavement Repair",
        "default_priority": "High",
        "recommended_action": "Assign Road Maintenance Team for inspection and pothole/pavement restoration.",
    },
    "Water": {
        "work_type": "Water Supply & Pipeline Restoration",
        "default_priority": "High",
        "recommended_action": "Dispatch Water Works Plumbing Crew to halt leakage and test pressure.",
    },
    "Electricity": {
        "work_type": "Electrical Infrastructure & Lighting",
        "default_priority": "High",
        "recommended_action": "Deploy Electrical Maintenance Squad to repair lines/transformers/streetlights.",
    },
    "Sanitation": {
        "work_type": "Waste Collection & Clearance",
        "default_priority": "Medium",
        "recommended_action": "Route Municipal Sanitation Truck for garbage pickup and site disinfection.",
    },
    "Drainage": {
        "work_type": "Stormwater Drainage & Desilting",
        "default_priority": "High",
        "recommended_action": "Dispatch Stormwater Drainage Unit to clear blockages and pump stagnant water.",
    },
    "Traffic": {
        "work_type": "Traffic Signal & Signage Maintenance",
        "default_priority": "Medium",
        "recommended_action": "Alert Traffic Management Cell to fix broken signal/road markings.",
    },
    "Public Health": {
        "work_type": "Vector Control & Public Hygiene",
        "default_priority": "High",
        "recommended_action": "Notify Public Health Inspector for fumigation and sanitary inspection.",
    },
    "Municipal Services": {
        "work_type": "Public Facility & Park Maintenance",
        "default_priority": "Low",
        "recommended_action": "Notify Civic Services Ward Officer to inspect and schedule municipal repair.",
    },
}

# ==============================================================================
# Centralized Confidence & Routing Thresholds
# ==============================================================================
TEXT_HIGH_CONFIDENCE = float(os.getenv("TEXT_HIGH_CONFIDENCE", "0.90"))
TEXT_MEDIUM_CONFIDENCE = float(os.getenv("TEXT_MEDIUM_CONFIDENCE", "0.70"))

VISION_HIGH_CONFIDENCE = float(os.getenv("VISION_HIGH_CONFIDENCE", "0.85"))
VISION_MEDIUM_CONFIDENCE = float(os.getenv("VISION_MEDIUM_CONFIDENCE", "0.60"))

DUPLICATE_SIMILARITY_THRESHOLD = float(os.getenv("DUPLICATE_SIMILARITY_THRESHOLD", "0.82"))
DUPLICATE_DISTANCE_METERS = float(os.getenv("DUPLICATE_DISTANCE_METERS", "100.0"))
DUPLICATE_MAX_AGE_DAYS = int(os.getenv("DUPLICATE_MAX_AGE_DAYS", "14"))

CONFIDENCE_HIGH_THRESHOLD = TEXT_HIGH_CONFIDENCE
CONFIDENCE_MEDIUM_THRESHOLD = TEXT_MEDIUM_CONFIDENCE

# ==============================================================================
# Training Hyperparameters
# ==============================================================================
MAX_LENGTH = 64
TRAIN_BATCH_SIZE = int(os.getenv("TRAIN_BATCH_SIZE", "16"))
EVAL_BATCH_SIZE = int(os.getenv("EVAL_BATCH_SIZE", "32"))
LEARNING_RATE = float(os.getenv("LEARNING_RATE", "3e-5"))
NUM_EPOCHS = int(os.getenv("NUM_EPOCHS", "2"))
WEIGHT_DECAY = 0.01
WARMUP_RATIO = 0.1

# ==============================================================================
# Model Registry & Continuous Learning Paths & Deployment Gates
# ==============================================================================
MODEL_REGISTRY_PATH = MODEL_ROOT / "model_registry.json"
DATASET_VERSIONS_DIR = DATASET_DIR / "versions"

MIN_NEW_VERIFIED_EXAMPLES = int(os.getenv("MIN_NEW_VERIFIED_EXAMPLES", "10"))
MAX_DAYS_SINCE_TRAINING = int(os.getenv("MAX_DAYS_SINCE_TRAINING", "7"))
MIN_NEW_TRAINING_EXAMPLES = MIN_NEW_VERIFIED_EXAMPLES
RETRAIN_INTERVAL_DAYS = MAX_DAYS_SINCE_TRAINING
MIN_CLASS_EXAMPLES = int(os.getenv("MIN_CLASS_EXAMPLES", "3"))

REAL_FEEDBACK_OVERSAMPLE = int(os.getenv("REAL_FEEDBACK_OVERSAMPLE", "2"))
TRAINING_LOCK_TIMEOUT = int(os.getenv("TRAINING_LOCK_TIMEOUT", "1800"))

# Production Deployment Gate Thresholds
MIN_ACCURACY = float(os.getenv("MIN_ACCURACY", "0.90"))
MIN_MACRO_F1 = float(os.getenv("MIN_MACRO_F1", "0.90"))
MAX_ACCURACY_DROP = float(os.getenv("MAX_ACCURACY_DROP", "0.01"))
MAX_MACRO_F1_DROP = float(os.getenv("MAX_MACRO_F1_DROP", "0.01"))
MAX_CLASS_F1_DROP = float(os.getenv("MAX_CLASS_F1_DROP", "0.03"))
IMPROVEMENT_MARGIN = MAX_MACRO_F1_DROP

# ==============================================================================
# FastAPI Service Configuration
# ==============================================================================
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_DEBUG = os.getenv("API_DEBUG", "false").lower() == "true"
