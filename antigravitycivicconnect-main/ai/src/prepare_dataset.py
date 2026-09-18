"""
CivicConnect Admin Classifier - Dataset Versioning & Incremental Preparation
Generates immutable dataset snapshots containing train.csv, validation.csv, test.csv,
dataset_meta.json, and a strict manifest.json recording exact feedback records used.
Implements configurable oversampling for verified real-world examples to prevent
catastrophic forgetting.
"""

import os
import csv
import sys
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Tuple

try:
    from .config import (
        DATASET_DIR,
        DATASET_VERSIONS_DIR,
        TRAIN_CSV,
        VALIDATION_CSV,
        TEST_CSV,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MIN_CLASS_EXAMPLES,
        REAL_FEEDBACK_OVERSAMPLE,
    )
    from .dataset import load_csv_raw
    from .collect_feedback import process_and_validate_feedback
except ImportError:
    from config import (
        DATASET_DIR,
        DATASET_VERSIONS_DIR,
        TRAIN_CSV,
        VALIDATION_CSV,
        TEST_CSV,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
        MIN_CLASS_EXAMPLES,
        REAL_FEEDBACK_OVERSAMPLE,
    )
    from dataset import load_csv_raw
    from collect_feedback import process_and_validate_feedback


def build_incremental_dataset(
    version_tag: str = None,
    feedback_entries: List[Dict[str, Any]] = None,
    oversample_factor: int = None,
    base_dataset_version: str = "dataset_v1.0"
) -> Tuple[str, Path, Dict[str, Any]]:
    """
    Creates an immutable versioned dataset directory under ai/dataset/versions/<version_tag>/
    Includes train.csv, validation.csv, test.csv, dataset_meta.json, and manifest.json.
    """
    DATASET_VERSIONS_DIR.mkdir(parents=True, exist_ok=True)
    oversample = oversample_factor if oversample_factor is not None else REAL_FEEDBACK_OVERSAMPLE

    # 1. Load base records
    base_train = load_csv_raw(TRAIN_CSV)
    base_val = load_csv_raw(VALIDATION_CSV)
    base_test = load_csv_raw(TEST_CSV)

    # 2. Collect verified human feedback
    eligible_feedback, feedback_report = process_and_validate_feedback(custom_entries=feedback_entries)

    # 3. Deduplicate feedback against base training texts
    seen_texts = set(r["complaint"].strip().lower() for r in base_train + base_val + base_test)
    added_feedback = []
    feedback_ids_used = []

    for rec in eligible_feedback:
        norm = rec["complaint"].strip().lower()
        if norm not in seen_texts:
            added_feedback.append({
                "complaint": rec["complaint"],
                "department": rec["department"],
                "complaint_id": rec.get("complaint_id"),
                "feedback_id": rec.get("feedback_id"),
            })
            seen_texts.add(norm)
            feedback_ids_used.append(rec.get("feedback_id") or rec.get("complaint_id"))

    # 4. Apply oversampling to verified real-world examples to prevent catastrophic forgetting
    oversampled_new_data = []
    for row in added_feedback:
        for _ in range(max(1, oversample)):
            oversampled_new_data.append({
                "complaint": row["complaint"],
                "department": row["department"]
            })

    full_train = base_train + oversampled_new_data

    # 5. Resolve dataset version tag
    if not version_tag:
        existing_versions = list(DATASET_VERSIONS_DIR.glob("dataset_v*"))
        version_num = len(existing_versions) + 1
        version_tag = f"dataset_v1.{version_num}"

    version_dir = DATASET_VERSIONS_DIR / version_tag
    version_dir.mkdir(parents=True, exist_ok=True)

    # 6. Save versioned CSV files
    train_file = version_dir / "train.csv"
    val_file = version_dir / "validation.csv"
    test_file = version_dir / "test.csv"

    for file_path, data in [(train_file, full_train), (val_file, base_val), (test_file, base_test)]:
        with open(file_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["complaint", "department"])
            for row in data:
                writer.writerow([row["complaint"], row["department"]])

    # 7. Class distribution
    class_dist = {dept: 0 for dept in ID_TO_LABEL.values()}
    for r in full_train:
        class_dist[r["department"]] = class_dist.get(r["department"], 0) + 1

    now_iso = datetime.now(timezone.utc).isoformat()

    # 8. Manifest
    manifest = {
        "datasetVersion": version_tag,
        "creationTime": now_iso,
        "baseDatasetVersion": base_dataset_version,
        "number_of_base_examples": len(base_train),
        "number_of_feedback_examples": len(added_feedback),
        "oversample_factor": oversample,
        "total_train_examples": len(full_train),
        "validation_examples": len(base_val),
        "test_examples": len(base_test),
        "exact_feedback_ids_used": feedback_ids_used,
        "class_distribution": class_dist,
        "preprocessing_version": "pii_sanitized_v1",
    }

    with open(version_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    with open(version_dir / "dataset_meta.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return version_tag, version_dir, manifest


if __name__ == "__main__":
    v_tag, v_dir, meta = build_incremental_dataset()
    print(f"Created versioned dataset {v_tag} at {v_dir}")
