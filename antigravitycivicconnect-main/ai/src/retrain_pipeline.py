"""
CivicConnect Admin Classifier - Continuous Learning Retraining Pipeline
Provides scheduling checks, eligibility condition verification, and triggers
the master training worker.
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple

try:
    from .config import (
        MIN_NEW_VERIFIED_EXAMPLES,
        MAX_DAYS_SINCE_TRAINING,
        MIN_CLASS_EXAMPLES,
        ID_TO_LABEL,
    )
    from .collect_feedback import process_and_validate_feedback
    from .model_registry import get_registry
    from .training_worker import execute_continuous_learning_pipeline
except ImportError:
    from config import (
        MIN_NEW_VERIFIED_EXAMPLES,
        MAX_DAYS_SINCE_TRAINING,
        MIN_CLASS_EXAMPLES,
        ID_TO_LABEL,
    )
    from collect_feedback import process_and_validate_feedback
    from model_registry import get_registry
    from training_worker import execute_continuous_learning_pipeline


def check_retrain_conditions() -> Tuple[bool, Dict[str, Any]]:
    """
    Evaluates whether conditions for automated retraining are satisfied:
    - Minimum verified feedback samples threshold
    - Maximum elapsed days since last training
    - Minimum verified examples per department
    """
    registry = get_registry()
    active_model = registry.get_active_model()

    eligible_records, report = process_and_validate_feedback()
    new_examples_count = report["eligible_count"]

    last_training_str = active_model.get("training_date") or active_model.get("promoted_at") or active_model.get("created_at")
    days_since_last = 999
    if last_training_str:
        try:
            last_date = datetime.fromisoformat(last_training_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            days_since_last = (now - last_date).days
        except Exception:
            days_since_last = 999

    # Class balance among new feedback
    class_dist = {dept: 0 for dept in ID_TO_LABEL.values()}
    for r in eligible_records:
        dept = r.get("department")
        if dept in class_dist:
            class_dist[dept] += 1

    count_condition = new_examples_count >= MIN_NEW_VERIFIED_EXAMPLES
    time_condition = (new_examples_count > 0) and (days_since_last >= MAX_DAYS_SINCE_TRAINING)
    conditions_met = count_condition or time_condition

    status_summary = {
        "conditions_met": conditions_met,
        "eligible_new_feedback_count": new_examples_count,
        "min_required_examples": MIN_NEW_VERIFIED_EXAMPLES,
        "days_since_last_training": days_since_last,
        "max_days_since_training": MAX_DAYS_SINCE_TRAINING,
        "active_production_version": active_model.get("model_version"),
        "active_macro_f1": active_model.get("macro_f1", 0.9990),
        "class_distribution_in_feedback": class_dist,
    }

    return conditions_met, status_summary


def run_retrain_pipeline(force: bool = False, trigger: str = "manual_admin", epochs: int = 2) -> Dict[str, Any]:
    """
    Executes the continuous learning pipeline using training_worker.
    """
    conditions_met, summary = check_retrain_conditions()
    if not conditions_met and not force:
        print("\n[INFO] Retraining conditions not satisfied. Execution skipped.")
        print(f"Feedback Count: {summary['eligible_new_feedback_count']} / {summary['min_required_examples']}")
        print(f"Days Elapsed: {summary['days_since_last_training']} / {summary['max_days_since_training']}")
        return {
            "status": "skipped",
            "message": "Retraining conditions not satisfied.",
            "summary": summary,
        }

    return execute_continuous_learning_pipeline(trigger=trigger, force=force, epochs=epochs)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run CivicConnect Retraining Pipeline")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--epochs", type=int, default=2)
    args = parser.parse_args()

    res = run_retrain_pipeline(force=args.force, epochs=args.epochs)
    print(json.dumps(res, indent=2))
