"""
CivicConnect DistilBERT Text Classifier - Dynamic Inference Engine & CLI
Features zero-downtime hot-reloading: dynamically loads new model weights upon
promotion or rollback without requiring a server restart.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional

try:
    from .config import (
        MODEL_DIR,
        PRODUCTION_MODELS_DIR,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MAX_LENGTH,
        CONFIDENCE_HIGH_THRESHOLD,
        CONFIDENCE_MEDIUM_THRESHOLD,
        DEPARTMENT_ACTION_MAP,
        MODEL_VERSION,
    )
    from .model_registry import get_registry
except ImportError:
    from config import (
        MODEL_DIR,
        PRODUCTION_MODELS_DIR,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MAX_LENGTH,
        CONFIDENCE_HIGH_THRESHOLD,
        CONFIDENCE_MEDIUM_THRESHOLD,
        DEPARTMENT_ACTION_MAP,
        MODEL_VERSION,
    )
    from model_registry import get_registry


class AdminClassifierPredictor:
    """
    Predictor class that caches DistilBERT model and tokenizer, and dynamically
    reloads when the active production model version changes in the registry.
    """
    def __init__(self, initial_model_dir: Path = None):
        self.model_dir = Path(initial_model_dir or MODEL_DIR)
        self.tokenizer = None
        self.model = None
        self.device = None
        self.is_loaded = False
        self.loaded_version = None
        self._load_active_production_model()

    def _load_active_production_model(self, force_reload: bool = False):
        registry = get_registry()
        active_model_info = registry.get_active_model()
        active_version = active_model_info.get("model_version", MODEL_VERSION)
        target_dir = Path(active_model_info.get("model_dir", str(PRODUCTION_MODELS_DIR / active_version)))

        # If already loaded with the same version, skip unless forced
        if not force_reload and self.is_loaded and self.loaded_version == active_version:
            return

        config_path = target_dir / "config.json"
        if not config_path.exists():
            # Check default model dir fallback
            if (MODEL_DIR / "config.json").exists():
                target_dir = MODEL_DIR
            else:
                self.is_loaded = False
                return

        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForSequenceClassification

            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            tokenizer = AutoTokenizer.from_pretrained(str(target_dir))
            model = AutoModelForSequenceClassification.from_pretrained(str(target_dir))
            model.to(self.device)
            model.eval()

            # Atomic swap
            self.tokenizer = tokenizer
            self.model = model
            self.model_dir = target_dir
            self.loaded_version = active_version
            self.is_loaded = True
            print(f"[HOT-RELOAD SUCCESS] Dynamically loaded model version '{active_version}' from {target_dir}")
        except Exception as e:
            print(f"[HOT-RELOAD WARNING] Could not load DistilBERT model from {target_dir}: {e}")
            if not self.is_loaded:
                self.is_loaded = False

    def reload_if_needed(self) -> Dict[str, Any]:
        """
        Public method to enforce dynamic check and reload against the model registry.
        """
        prev_version = self.loaded_version
        self._load_active_production_model(force_reload=True)
        return {
            "reloaded": self.loaded_version != prev_version,
            "previous_version": prev_version,
            "active_version": self.loaded_version,
            "model_dir": str(self.model_dir),
            "is_loaded": self.is_loaded,
        }

    def _fallback_heuristic_predict(self, text: str) -> List[float]:
        text_lower = text.lower()
        scores = [0.05] * NUM_LABELS

        keywords = {
            0: ["pothole", "road", "asphalt", "crater", "footpath", "curb", "speed breaker", "trench", "tar", "pavement"],
            1: ["water", "pipe", "drinking", "leak", "tap", "pressure", "tanker", "borewell", "reservoir", "muddy"],
            2: ["streetlight", "electric", "power", "transformer", "wire", "voltage", "blackout", "pole", "spark", "cable"],
            3: ["garbage", "waste", "dustbin", "trash", "carcass", "dump", "rubble", "sweeping", "debris", "compost"],
            4: ["drain", "drainage", "sewage", "gutter", "manhole", "sewer", "flood", "overflow", "culvert", "sludge"],
            5: ["traffic", "signal", "zebra", "sign", "junction", "parking", "one-way", "u-turn", "divider", "speed limit"],
            6: ["mosquito", "dengue", "dog", "food", "stray", "fumes", "malaria", "hygiene", "toilet", "rabies", "larvae"],
            7: ["park", "tree", "playground", "swing", "hall", "bench", "library", "crematorium", "statue", "cemetery", "garden"],
        }

        for label_id, kw_list in keywords.items():
            for kw in kw_list:
                if kw in text_lower:
                    scores[label_id] += 1.2

        import math
        exp_scores = [math.exp(s) for s in scores]
        total_exp = sum(exp_scores)
        return [s / total_exp for s in exp_scores]

    def predict(self, complaint: str, complaint_id: str = None) -> Dict[str, Any]:
        complaint_clean = complaint.strip()
        if not complaint_clean:
            raise ValueError("Complaint description cannot be empty.")

        # Check for active production version updates before predicting
        self._load_active_production_model(force_reload=False)

        current_ver = self.loaded_version or MODEL_VERSION

        if self.is_loaded and self.model is not None:
            import torch
            with torch.no_grad():
                inputs = self.tokenizer(
                    complaint_clean,
                    padding=True,
                    truncation=True,
                    max_length=MAX_LENGTH,
                    return_tensors="pt",
                ).to(self.device)

                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=-1)[0].cpu().numpy().tolist()
        else:
            probs = self._fallback_heuristic_predict(complaint_clean)

        indexed_probs = [(idx, float(prob)) for idx, prob in enumerate(probs)]
        indexed_probs.sort(key=lambda x: x[1], reverse=True)

        top_id, top_prob = indexed_probs[0]
        top_department = ID_TO_LABEL[top_id]

        if top_prob >= CONFIDENCE_HIGH_THRESHOLD:
            confidence_level = "high"
            requires_admin_review = False
        elif top_prob >= CONFIDENCE_MEDIUM_THRESHOLD:
            confidence_level = "medium"
            requires_admin_review = True
        else:
            confidence_level = "low"
            requires_admin_review = True

        top_predictions = [
            {
                "department": ID_TO_LABEL[idx],
                "confidence": round(prob, 4),
                "percentage": f"{prob * 100:.1f}%",
            }
            for idx, prob in indexed_probs[:3]
        ]

        top3 = [
            {
                "department": ID_TO_LABEL[idx],
                "confidence": round(prob, 4),
            }
            for idx, prob in indexed_probs[:3]
        ]

        guidance = DEPARTMENT_ACTION_MAP.get(top_department, {
            "work_type": "Municipal Action",
            "default_priority": "Medium",
            "recommended_action": "Review and assign to responsible department.",
        })

        return {
            "complaint_id": complaint_id,
            "complaint": complaint_clean,
            "department": top_department,
            "confidence": round(top_prob, 4),
            "top3": top3,
            "model": "distilbert",
            "model_version": current_ver,
            # Backward compatibility fields
            "confidence_percentage": f"{top_prob * 100:.1f}%",
            "confidence_level": confidence_level,
            "requires_admin_review": requires_admin_review,
            "work_type": guidance["work_type"],
            "priority": guidance["default_priority"],
            "recommended_action": guidance["recommended_action"],
            "top_predictions": top_predictions,
            "engine": "distilbert-base-uncased" if self.is_loaded else "demo-heuristic-fallback",
        }


_predictor = None


def get_predictor() -> AdminClassifierPredictor:
    global _predictor
    if _predictor is None:
        _predictor = AdminClassifierPredictor()
    return _predictor


def main():
    parser = argparse.ArgumentParser(description="Classify civic complaint using CivicConnect DistilBERT")
    parser.add_argument("complaint", type=str, nargs="?", help="Complaint text description")
    args = parser.parse_args()

    sample_text = args.complaint or "There is a huge pothole near the school and several people have fallen."
    predictor = get_predictor()
    result = predictor.predict(sample_text)

    print("-" * 60)
    print("CIVICCONNECT DISTILBERT TASK CLASSIFIER")
    print("-" * 60)
    print(f"Complaint   : {result['complaint']}")
    print(f"Department  : {result['department']}")
    print(f"Confidence  : {result['confidence']}")
    print(f"Model       : {result['model']} ({result['model_version']})")
    print(f"Top 3       : {result['top3']}")
    print("-" * 60)


if __name__ == "__main__":
    main()
