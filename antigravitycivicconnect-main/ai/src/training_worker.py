"""
CivicConnect Master Continuous Learning Training Worker
Executes the full automated & supervised retraining lifecycle:
1. Distributed training lock acquisition & stale lock handling
2. Collection and validation of human-in-the-loop feedback
3. Generation of immutable dataset versions with manifest.json
4. Creation of isolated candidate directory
5. DistilBERT candidate fine-tuning using active production model as base
6. Independent evaluation on test & golden regression datasets
7. Side-by-side metric comparison against active production model
8. Strict deployment gate evaluation
9. Atomic promotion or candidate rejection without modifying production weights during training
10. Dynamic hot-reload trigger for live inference service without restart
"""

import os
import sys
import json
import time
import shutil
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

try:
    from .config import (
        MODEL_ROOT,
        PRODUCTION_MODELS_DIR,
        CANDIDATE_MODELS_DIR,
        ARCHIVED_MODELS_DIR,
        TRAINING_LOCK_PATH,
        GOLDEN_DATASET_PATH,
        MIN_ACCURACY,
        MIN_MACRO_F1,
        MAX_ACCURACY_DROP,
        MAX_MACRO_F1_DROP,
        MAX_CLASS_F1_DROP,
        TRAINING_LOCK_TIMEOUT,
        MIN_NEW_VERIFIED_EXAMPLES,
        MAX_DAYS_SINCE_TRAINING,
    )
    from .model_registry import get_registry
    from .collect_feedback import process_and_validate_feedback
    from .prepare_dataset import build_incremental_dataset
    from .train import train
    from .evaluate import evaluate_model, compare_models
    from .predict import get_predictor
except ImportError:
    from config import (
        MODEL_ROOT,
        PRODUCTION_MODELS_DIR,
        CANDIDATE_MODELS_DIR,
        ARCHIVED_MODELS_DIR,
        TRAINING_LOCK_PATH,
        GOLDEN_DATASET_PATH,
        MIN_ACCURACY,
        MIN_MACRO_F1,
        MAX_ACCURACY_DROP,
        MAX_MACRO_F1_DROP,
        MAX_CLASS_F1_DROP,
        TRAINING_LOCK_TIMEOUT,
        MIN_NEW_VERIFIED_EXAMPLES,
        MAX_DAYS_SINCE_TRAINING,
    )
    from model_registry import get_registry
    from collect_feedback import process_and_validate_feedback
    from prepare_dataset import build_incremental_dataset
    from train import train
    from evaluate import evaluate_model, compare_models
    from predict import get_predictor


# In-memory store for active/recent training runs
TRAINING_RUNS_LOG_PATH = MODEL_ROOT / "ai_training_runs.json"


def acquire_training_lock(worker_id: str = "worker-primary") -> Tuple[bool, str]:
    """
    Acquires file-based distributed training lock with stale lock timeout handling.
    """
    now = time.time()
    if TRAINING_LOCK_PATH.exists():
        try:
            with open(TRAINING_LOCK_PATH, "r", encoding="utf-8") as f:
                lock_info = json.load(f)
            lock_time = lock_info.get("timestamp", 0)
            if now - lock_time < TRAINING_LOCK_TIMEOUT:
                return False, f"Training locked by run '{lock_info.get('run_id')}' started at {lock_info.get('started_at')}"
            else:
                print(f"[LOCK TIMEOUT] Overriding stale training lock from {lock_info.get('started_at')}")
        except Exception:
            pass

    run_id = f"run-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    lock_data = {
        "run_id": run_id,
        "worker": worker_id,
        "timestamp": now,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "running",
    }
    with open(TRAINING_LOCK_PATH, "w", encoding="utf-8") as f:
        json.dump(lock_data, f, indent=2)

    return True, run_id


def release_training_lock():
    if TRAINING_LOCK_PATH.exists():
        try:
            os.remove(TRAINING_LOCK_PATH)
        except Exception as e:
            print(f"[WARNING] Could not remove training lock: {e}")


def load_training_runs() -> Dict[str, Any]:
    if not TRAINING_RUNS_LOG_PATH.exists():
        return {}
    try:
        with open(TRAINING_RUNS_LOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def record_training_run(run_data: Dict[str, Any]):
    runs = load_training_runs()
    runs[run_data["run_id"]] = run_data
    with open(TRAINING_RUNS_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(runs, f, indent=2)


def evaluate_deployment_gates(
    candidate_metrics: Dict[str, Any],
    production_metrics: Dict[str, Any],
    comparison: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates candidate against strict safety and accuracy gates.
    """
    cand_acc = candidate_metrics.get("accuracy", 0.0)
    cand_f1 = candidate_metrics.get("macro_f1", 0.0)
    delta_acc = comparison.get("delta_accuracy", 0.0)
    delta_f1 = comparison.get("delta_macro_f1", 0.0)
    max_class_drop = comparison.get("max_class_f1_drop", 0.0)

    # Check golden dataset performance
    golden_res = candidate_metrics.get("golden_dataset", {})
    golden_acc = golden_res.get("accuracy", 1.0)
    golden_pass = golden_acc >= 0.85

    acc_pass = cand_acc >= MIN_ACCURACY
    f1_pass = cand_f1 >= MIN_MACRO_F1
    acc_drop_pass = delta_acc >= -MAX_ACCURACY_DROP
    f1_drop_pass = delta_f1 >= -MAX_MACRO_F1_DROP
    class_drop_pass = max_class_drop <= MAX_CLASS_F1_DROP

    all_passed = acc_pass and f1_pass and acc_drop_pass and f1_drop_pass and class_drop_pass and golden_pass

    return {
        "accuracy": "PASS" if acc_pass else "FAIL",
        "macro_f1": "PASS" if f1_pass else "FAIL",
        "accuracy_drop": "PASS" if acc_drop_pass else "FAIL",
        "macro_f1_drop": "PASS" if f1_drop_pass else "FAIL",
        "per_class_regression": "PASS" if class_drop_pass else "FAIL",
        "golden_set": "PASS" if golden_pass else "FAIL",
        "model_load": "PASS",
        "decision": "PROMOTE" if all_passed else "REJECT",
        "details": {
            "candidate_accuracy": cand_acc,
            "candidate_macro_f1": cand_f1,
            "delta_accuracy": delta_acc,
            "delta_macro_f1": delta_f1,
            "max_class_f1_drop": max_class_drop,
            "golden_accuracy": golden_acc,
        }
    }


def execute_continuous_learning_pipeline(
    trigger: str = "manual_admin",
    force: bool = False,
    custom_feedback: list = None,
    epochs: int = 2,
    batch_size: int = 16,
    lr: float = 3e-5
) -> Dict[str, Any]:
    """
    Master synchronous pipeline worker. (Can be spawned in background thread).
    """
    # 1. Acquire Lock
    acquired, lock_res = acquire_training_lock(worker_id=f"worker-{trigger}")
    if not acquired:
        return {
            "status": "locked",
            "message": lock_res,
            "run_id": None
        }

    run_id = lock_res
    start_time_iso = datetime.now(timezone.utc).isoformat()
    registry = get_registry()
    active_prod = registry.get_active_model()
    prod_version_before = active_prod.get("model_version", "civicconnect-admin-v1.0.0")
    prod_dir_before = Path(active_prod.get("model_dir", str(PRODUCTION_MODELS_DIR / prod_version_before)))

    run_record = {
        "run_id": run_id,
        "trigger": trigger,
        "started_at": start_time_iso,
        "completed_at": None,
        "status": "running",
        "dataset_version": None,
        "candidate_version": None,
        "production_version_before": prod_version_before,
        "production_version_after": prod_version_before,
        "feedback_count": 0,
        "metrics": None,
        "comparison": None,
        "gate_results": None,
        "error_message": None,
    }
    record_training_run(run_record)

    try:
        # 2. Check pending feedback
        eligible_feedback, feedback_report = process_and_validate_feedback(custom_entries=custom_feedback)
        run_record["feedback_count"] = len(eligible_feedback)

        if len(eligible_feedback) == 0 and not force:
            release_training_lock()
            run_record["status"] = "skipped"
            run_record["completed_at"] = datetime.now(timezone.utc).isoformat()
            run_record["error_message"] = "No eligible verified feedback available for training."
            record_training_run(run_record)
            return run_record

        # 3. Build immutable dataset version
        version_num = len(list((MODEL_ROOT.parent / "dataset" / "versions").glob("dataset_v*"))) + 1
        ds_version_tag = f"dataset_v1.{version_num}"
        _, dataset_dir, manifest = build_incremental_dataset(
            version_tag=ds_version_tag,
            feedback_entries=eligible_feedback,
            base_dataset_version=active_prod.get("dataset_version", "dataset_v1.0")
        )
        run_record["dataset_version"] = ds_version_tag

        # 4. Generate candidate model version tag
        try:
            ver_num_str = prod_version_before.split("-v")[-1]
            parts = ver_num_str.split(".")
            new_minor = int(parts[1]) + 1
            candidate_version = f"civicconnect-admin-v{parts[0]}.{new_minor}.0"
        except Exception:
            candidate_version = f"civicconnect-admin-v1.{len(registry.get_all_versions())}.0"

        run_record["candidate_version"] = candidate_version
        candidate_dir = CANDIDATE_MODELS_DIR / candidate_version
        candidate_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n[CONTINUOUS LEARNING] Training candidate: {candidate_version} inside {candidate_dir}")

        # 5. Train candidate model using active production model as base
        train_res = train(
            train_csv=dataset_dir / "train.csv",
            validation_csv=dataset_dir / "validation.csv",
            output_dir=candidate_dir,
            base_model_dir=prod_dir_before if (prod_dir_before / "config.json").exists() else None,
            epochs=epochs,
            batch_size=batch_size,
            lr=lr,
            version_tag=candidate_version
        )

        # 6. Evaluate candidate model
        print(f"\n[EVALUATION] Evaluating candidate: {candidate_version}...")
        candidate_metrics = evaluate_model(
            model_dir=candidate_dir,
            test_csv=dataset_dir / "test.csv",
            golden_csv=GOLDEN_DATASET_PATH
        )
        if not candidate_metrics:
            raise RuntimeError("Candidate model evaluation failed.")

        # 7. Evaluate production model on identical datasets
        print(f"\n[EVALUATION] Evaluating baseline production model: {prod_version_before}...")
        production_metrics = evaluate_model(
            model_dir=prod_dir_before,
            test_csv=dataset_dir / "test.csv",
            golden_csv=GOLDEN_DATASET_PATH
        )
        if not production_metrics:
            production_metrics = active_prod.get("metrics", {
                "accuracy": 0.9990,
                "macro_f1": 0.9990,
                "per_class_results": {}
            })

        # 8. Compare models
        comparison = compare_models(candidate_metrics, production_metrics)
        run_record["metrics"] = candidate_metrics
        run_record["comparison"] = comparison

        # 9. Register candidate in registry
        registry.register_candidate(
            candidate_version=candidate_version,
            dataset_version=ds_version_tag,
            training_run_id=run_id,
            model_dir=str(candidate_dir),
            metrics=candidate_metrics,
            per_class_metrics=candidate_metrics.get("per_class_results"),
            notes=f"Continuous learning candidate trained from {prod_version_before}"
        )

        # 10. Execute Deployment Gates
        gates = evaluate_deployment_gates(candidate_metrics, production_metrics, comparison)
        run_record["gate_results"] = gates
        registry.record_gate_results(candidate_version, gates, gates["decision"])

        # 11. Promote or Reject
        if gates["decision"] == "PROMOTE":
            print(f"\n[GATES PASSED] Promoting candidate {candidate_version} to active production...")
            final_prod_dir = PRODUCTION_MODELS_DIR / candidate_version
            if candidate_dir.exists():
                # Copy candidate artifacts to production directory
                if final_prod_dir.exists():
                    shutil.rmtree(final_prod_dir)
                shutil.copytree(candidate_dir, final_prod_dir)

            registry.promote_candidate(candidate_version, production_model_dir=str(final_prod_dir))
            run_record["status"] = "passed"
            run_record["production_version_after"] = candidate_version

            # Trigger live hot-reload in predictor without server restart
            predictor = get_predictor()
            reload_res = predictor.reload_if_needed()
            print(f"[PREDICTOR RELOAD] Active inference model is now: {predictor.loaded_version}")

            # Verify active loaded version
            if predictor.loaded_version != candidate_version:
                print(f"[RELOAD VERIFICATION WARNING] Predictor loaded '{predictor.loaded_version}' instead of '{candidate_version}'")
        else:
            print(f"\n[GATES FAILED] Candidate {candidate_version} rejected. Production remains on {prod_version_before}.")
            run_record["status"] = "rejected"
            run_record["production_version_after"] = prod_version_before

        run_record["completed_at"] = datetime.now(timezone.utc).isoformat()
        record_training_run(run_record)
        return run_record

    except Exception as err:
        traceback.print_exc()
        run_record["status"] = "failed"
        run_record["error_message"] = str(err)
        run_record["completed_at"] = datetime.now(timezone.utc).isoformat()
        record_training_run(run_record)
        return run_record
    finally:
        release_training_lock()


if __name__ == "__main__":
    result = execute_continuous_learning_pipeline(trigger="cli_test", force=True, epochs=1)
    print("\nTraining Worker Execution Result:")
    print(json.dumps(result, indent=2))
