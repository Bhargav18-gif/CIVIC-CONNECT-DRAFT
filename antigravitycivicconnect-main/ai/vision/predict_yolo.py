"""
CivicConnect Real YOLO Vision Detection Module
Loads trained YOLO weights and detects civic damages/objects:
Classes:
0: pothole -> Roads
1: garbage_dump -> Sanitation
2: water_leak -> Water
3: broken_streetlight -> Electricity
4: drain_blockage -> Drainage
5: traffic_signal_damage -> Traffic
6: damaged_tree -> Municipal Services
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Optional

CIVIC_CLASS_MAP = {
    0: {"name": "pothole", "department": "Roads"},
    1: {"name": "garbage_dump", "department": "Sanitation"},
    2: {"name": "water_leak", "department": "Water"},
    3: {"name": "broken_streetlight", "department": "Electricity"},
    4: {"name": "drain_blockage", "department": "Drainage"},
    5: {"name": "traffic_signal_damage", "department": "Traffic"},
    6: {"name": "damaged_tree", "department": "Municipal Services"},
}

CLASS_NAME_TO_DEPT = {
    "pothole": "Roads",
    "garbage_dump": "Sanitation",
    "water_leak": "Water",
    "broken_streetlight": "Electricity",
    "drain_blockage": "Drainage",
    "traffic_signal_damage": "Traffic",
    "damaged_tree": "Municipal Services",
}

DEFAULT_WEIGHTS_PATH = Path(__file__).resolve().parent / "weights" / "best.pt"
MODEL_VERSION = os.getenv("YOLO_MODEL_VERSION", "civic-yolo-v1.0")

class CivicYOLOPredictor:
    def __init__(self, weights_path: Optional[Path] = None):
        self.weights_path = Path(weights_path) if weights_path else DEFAULT_WEIGHTS_PATH
        self.model = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        if not self.weights_path.exists():
            print(f"[INFO] YOLO weights not found at: {self.weights_path}")
            self.is_loaded = False
            return
        try:
            from ultralytics import YOLO
            self.model = YOLO(str(self.weights_path))
            self.is_loaded = True
            print(f"[INFO] Civic YOLO model loaded from {self.weights_path}")
        except Exception as e:
            print(f"[WARNING] Could not load YOLO model: {e}")
            self.is_loaded = False

    def predict_image(self, source, conf_threshold: float = 0.25) -> Dict[str, Any]:
        """
        Runs real YOLO inference on an image source (path, URL, or PIL Image).
        If model weights are unavailable, returns model_unavailable status without fabrication.
        """
        if not self.is_loaded or self.model is None:
            return {
                "detections": [],
                "top_detection": None,
                "model": "civic-yolo",
                "model_version": MODEL_VERSION,
                "status": "model_unavailable",
                "message": "Real YOLO weights not available. Routed to multimodal/supervision."
            }

        try:
            results = self.model.predict(source=source, conf=conf_threshold, verbose=False)
            detections = []

            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist()

                    # Resolve class & mapped department
                    class_info = CIVIC_CLASS_MAP.get(cls_id)
                    if class_info:
                        cls_name = class_info["name"]
                        dept = class_info["department"]
                    else:
                        # Standard YOLO COCO class fallback mapping if custom weights haven't overwritten names
                        raw_name = r.names.get(cls_id, f"class_{cls_id}").lower()
                        # Map common street/civic related items if standard COCO
                        dept = CLASS_NAME_TO_DEPT.get(raw_name, "Municipal Services")
                        cls_name = raw_name

                    detections.append({
                        "class": cls_name,
                        "class_id": cls_id,
                        "confidence": round(conf, 4),
                        "department": dept,
                        "box": [round(coord, 2) for coord in xyxy]
                    })

            detections.sort(key=lambda x: x["confidence"], reverse=True)
            top_detection = detections[0] if detections else None

            return {
                "detections": detections,
                "top_detection": top_detection,
                "model": "civic-yolo",
                "model_version": MODEL_VERSION,
                "status": "success",
                "message": f"Detected {len(detections)} civic objects" if detections else "No civic objects detected"
            }
        except Exception as e:
            return {
                "detections": [],
                "top_detection": None,
                "model": "civic-yolo",
                "model_version": MODEL_VERSION,
                "status": "error",
                "message": f"Inference error: {str(e)}"
            }

_yolo_predictor = None

def get_yolo_predictor(weights_path: Optional[str] = None) -> CivicYOLOPredictor:
    global _yolo_predictor
    if _yolo_predictor is None or weights_path is not None:
        _yolo_predictor = CivicYOLOPredictor(Path(weights_path) if weights_path else None)
    return _yolo_predictor
