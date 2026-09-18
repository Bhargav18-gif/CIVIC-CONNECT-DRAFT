"""
CivicConnect Admin Task Classifier - Evaluation & Comparison Engine
Evaluates any model directory (candidate or production) on:
- Isolated test set
- Golden real-world regression set
Computes actual measured metrics without fabrication:
Accuracy, Macro F1, Per-Class F1, Confusion Matrix, and Delta Comparisons.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from .config import (
        MODEL_DIR,
        TEST_CSV,
        GOLDEN_DATASET_PATH,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MAX_LENGTH,
    )
    from .dataset import load_csv_raw
except ImportError:
    from config import (
        MODEL_DIR,
        TEST_CSV,
        GOLDEN_DATASET_PATH,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MAX_LENGTH,
    )
    from dataset import load_csv_raw


def evaluate_dataset(
    model,
    tokenizer,
    device,
    csv_path: Path,
    dataset_name: str = "Test Set"
) -> Dict[str, Any]:
    """
    Evaluates model inference across records in csv_path and returns computed metrics.
    """
    import torch
    from sklearn.metrics import (
        accuracy_score,
        precision_recall_fscore_support,
        confusion_matrix,
    )

    if not csv_path.exists():
        return {}

    raw_records = load_csv_raw(csv_path)
    texts = [r["complaint"] for r in raw_records]
    true_labels = [LABEL_TO_ID[r["department"]] for r in raw_records]
    target_names = [ID_TO_LABEL[i] for i in range(NUM_LABELS)]

    predicted_labels = []
    probabilities = []
    batch_size = 32

    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            inputs = tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=MAX_LENGTH,
                return_tensors="pt",
            ).to(device)

            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1).cpu().numpy()
            preds = probs.argmax(axis=-1)

            predicted_labels.extend(preds)
            probabilities.extend(probs)

    acc = float(accuracy_score(true_labels, predicted_labels))
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        true_labels, predicted_labels, average="macro", zero_division=0
    )
    weight_p, weight_r, weight_f1, _ = precision_recall_fscore_support(
        true_labels, predicted_labels, average="weighted", zero_division=0
    )
    per_class_p, per_class_r, per_class_f1, per_class_supp = precision_recall_fscore_support(
        true_labels, predicted_labels, average=None, zero_division=0
    )

    per_class_results = {}
    for i, name in enumerate(target_names):
        per_class_results[name] = {
            "precision": float(per_class_p[i]),
            "recall": float(per_class_r[i]),
            "f1": float(per_class_f1[i]),
            "support": int(per_class_supp[i]),
        }

    cm = confusion_matrix(true_labels, predicted_labels)

    return {
        "dataset_name": dataset_name,
        "sample_count": len(texts),
        "accuracy": float(acc),
        "macro_f1": float(macro_f1),
        "macro_precision": float(macro_p),
        "macro_recall": float(macro_r),
        "weighted_f1": float(weight_f1),
        "per_class_results": per_class_results,
        "confusion_matrix": cm.tolist(),
    }


def evaluate_model(
    model_dir: Path = None,
    test_csv: Path = None,
    golden_csv: Path = None,
) -> Optional[Dict[str, Any]]:
    """
    Evaluates a specific model directory on test.csv and optionally golden_real_world.csv.
    """
    target_dir = Path(model_dir or MODEL_DIR)
    target_test_csv = Path(test_csv or TEST_CSV)
    target_golden_csv = Path(golden_csv or GOLDEN_DATASET_PATH)

    config_file = target_dir / "config.json"
    if not config_file.exists():
        print(f"[ERROR] Trained model artifacts missing at: {target_dir}")
        return None

    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
    except ImportError as e:
        print(f"[ERROR] ML libraries missing: {e}")
        return None

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(str(target_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(target_dir))
    model.to(device)
    model.eval()

    test_metrics = evaluate_dataset(model, tokenizer, device, target_test_csv, "Isolated Test Set")
    
    golden_metrics = {}
    if target_golden_csv.exists():
        golden_metrics = evaluate_dataset(model, tokenizer, device, target_golden_csv, "Golden Real World Set")

    combined_results = {
        "model_dir": str(target_dir),
        "accuracy": test_metrics.get("accuracy", 0.0),
        "macro_f1": test_metrics.get("macro_f1", 0.0),
        "macro_precision": test_metrics.get("macro_precision", 0.0),
        "macro_recall": test_metrics.get("macro_recall", 0.0),
        "weighted_f1": test_metrics.get("weighted_f1", 0.0),
        "per_class_results": test_metrics.get("per_class_results", {}),
        "confusion_matrix": test_metrics.get("confusion_matrix", []),
        "test_dataset": test_metrics,
        "golden_dataset": golden_metrics,
    }

    # Save report inside model directory
    report_file = target_dir / "test_evaluation_report.json"
    try:
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(combined_results, f, indent=2)
    except Exception as e:
        print(f"[WARNING] Could not save evaluation report to {report_file}: {e}")

    return combined_results


def compare_models(
    candidate_metrics: Dict[str, Any],
    production_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes strict deltas between candidate and active production model.
    """
    cand_acc = candidate_metrics.get("accuracy", 0.0)
    prod_acc = production_metrics.get("accuracy", 0.0)
    delta_acc = round(cand_acc - prod_acc, 4)

    cand_f1 = candidate_metrics.get("macro_f1", 0.0)
    prod_f1 = production_metrics.get("macro_f1", 0.0)
    delta_f1 = round(cand_f1 - prod_f1, 4)

    # Compare per-class F1
    cand_classes = candidate_metrics.get("per_class_results", {})
    prod_classes = production_metrics.get("per_class_results", {})

    per_class_deltas = {}
    max_class_drop = 0.0

    for dept in ID_TO_LABEL.values():
        c_f1 = cand_classes.get(dept, {}).get("f1", 0.0)
        p_f1 = prod_classes.get(dept, {}).get("f1", 0.0)
        d_f1 = round(c_f1 - p_f1, 4)
        per_class_deltas[dept] = {
            "candidate_f1": c_f1,
            "production_f1": p_f1,
            "delta_f1": d_f1
        }
        if d_f1 < 0 and abs(d_f1) > max_class_drop:
            max_class_drop = abs(d_f1)

    return {
        "production_accuracy": prod_acc,
        "candidate_accuracy": cand_acc,
        "delta_accuracy": delta_acc,
        "production_macro_f1": prod_f1,
        "candidate_macro_f1": cand_f1,
        "delta_macro_f1": delta_f1,
        "per_class_deltas": per_class_deltas,
        "max_class_f1_drop": round(max_class_drop, 4),
    }


if __name__ == "__main__":
    res = evaluate_model()
    if res:
        print(f"Accuracy: {res['accuracy']:.4f}, Macro F1: {res['macro_f1']:.4f}")
