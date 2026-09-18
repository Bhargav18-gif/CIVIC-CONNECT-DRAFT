"""
CivicConnect YOLO Model Training Pipeline
Trains YOLOv8 on civic complaint visual dataset with data.yaml.
Calculates real mAP, precision, and recall metrics.
"""

import os
from pathlib import Path
from typing import Dict, Any

DATA_YAML = Path(__file__).resolve().parent / "data.yaml"
WEIGHTS_DIR = Path(__file__).resolve().parent / "weights"

def train_yolo(epochs: int = 10, batch_size: int = 16, img_size: int = 640) -> Dict[str, Any]:
    print("=" * 60)
    print("   CIVICCONNECT REAL YOLO TRAINING PIPELINE")
    print("=" * 60)

    try:
        from ultralytics import YOLO
    except ImportError as e:
        print(f"[ERROR] ultralytics not installed: {e}")
        return {"status": "failed", "error": str(e)}

    base_model = "yolov8n.pt"
    model = YOLO(base_model)

    print(f"Training on: {DATA_YAML}")
    print(f"Epochs: {epochs}, Batch size: {batch_size}, Image size: {img_size}")

    try:
        results = model.train(
            data=str(DATA_YAML),
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            project=str(WEIGHTS_DIR.parent / "runs"),
            name="civic_yolo_run",
            exist_ok=True
        )

        metrics = model.val()
        map50 = float(metrics.box.map50)
        map50_95 = float(metrics.box.map)
        precision = float(metrics.box.mp)
        recall = float(metrics.box.mr)

        best_weight = WEIGHTS_DIR.parent / "runs" / "civic_yolo_run" / "weights" / "best.pt"
        if best_weight.exists():
            import shutil
            WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy(str(best_weight), str(WEIGHTS_DIR / "best.pt"))
            print(f"[SUCCESS] Trained weights saved to {WEIGHTS_DIR / 'best.pt'}")

        return {
            "status": "completed",
            "metrics": {
                "mAP50": round(map50, 4),
                "mAP50-95": round(map50_95, 4),
                "precision": round(precision, 4),
                "recall": round(recall, 4)
            }
        }
    except Exception as e:
        print(f"[ERROR] YOLO training error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    train_yolo(epochs=2)
