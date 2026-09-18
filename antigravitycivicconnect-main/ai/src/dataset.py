import csv
import sys
from pathlib import Path
from typing import Dict, Tuple, List, Optional, Any

try:
    from .config import (
        TRAIN_CSV,
        VALIDATION_CSV,
        TEST_CSV,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
    )
except ImportError:
    from config import (
        TRAIN_CSV,
        VALIDATION_CSV,
        TEST_CSV,
        ID_TO_LABEL,
        LABEL_TO_ID,
        NUM_LABELS,
    )


def load_csv_raw(file_path: Path) -> List[Dict[str, str]]:
    """
    Loads a CSV file using standard library csv, ignoring comments and stripping whitespace.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")
    
    rows = []
    with open(file_path, mode="r", encoding="utf-8") as f:
        # Filter out comment lines starting with '#'
        filtered_lines = [line for line in f if not line.strip().startswith("#")]
        reader = csv.DictReader(filtered_lines)
        for row in reader:
            if "complaint" in row and "department" in row:
                rows.append({
                    "complaint": row["complaint"].strip(),
                    "department": row["department"].strip()
                })
            else:
                raise ValueError(
                    f"File {file_path} must contain 'complaint' and 'department' columns. "
                    f"Found: {reader.fieldnames}"
                )
    return rows


def validate_records(records: List[Dict[str, str]], split_name: str) -> Dict[str, Any]:
    """
    Validates records and checks data quality rules.
    """
    issues = []
    total_rows = len(records)
    valid_records = []
    seen_complaints = set()
    duplicate_count = 0
    class_distribution = {label: 0 for label in LABEL_TO_ID.keys()}
    valid_departments = set(LABEL_TO_ID.keys())

    for idx, r in enumerate(records):
        comp = r.get("complaint", "")
        dept = r.get("department", "")

        # Check missing or empty
        if not comp:
            issues.append(f"Row {idx+1}: Missing/empty complaint text")
            continue
        if not dept:
            issues.append(f"Row {idx+1}: Missing department label")
            continue

        # Check extremely short (< 5 chars or < 2 words)
        words = comp.split()
        if len(comp) < 5 or len(words) < 2:
            issues.append(f"Row {idx+1}: Extremely short complaint ('{comp}')")

        # Check valid department
        if dept not in valid_departments:
            issues.append(f"Row {idx+1}: Invalid department '{dept}'")
            continue

        # Check duplicate
        norm_comp = comp.lower()
        if norm_comp in seen_complaints:
            duplicate_count += 1
        seen_complaints.add(norm_comp)

        class_distribution[dept] = class_distribution.get(dept, 0) + 1
        valid_records.append({"complaint": comp, "department": dept, "label": LABEL_TO_ID[dept]})

    if duplicate_count > 0:
        issues.append(f"{duplicate_count} duplicate complaints detected")

    return {
        "split_name": split_name,
        "total_rows": total_rows,
        "valid_rows": len(valid_records),
        "issues": issues,
        "class_distribution": class_distribution,
        "records": valid_records,
    }


def print_dataset_summary() -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Loads, validates, and prints a summary of all dataset splits.
    """
    print("\n" + "=" * 70)
    print("      CIVICCONNECT ADMIN TASK CLASSIFIER - DATASET VALIDATION")
    print("=" * 70)

    train_raw = load_csv_raw(TRAIN_CSV)
    val_raw = load_csv_raw(VALIDATION_CSV)
    test_raw = load_csv_raw(TEST_CSV)

    splits = [
        ("Train", train_raw),
        ("Validation", val_raw),
        ("Test", test_raw),
    ]

    validated_splits = {}
    for name, raw in splits:
        results = validate_records(raw, name)
        validated_splits[name] = results

        print(f"\n--- Split: {name.upper()} ---")
        print(f"Total rows: {results['total_rows']}")
        print(f"Valid rows: {results['valid_rows']}")

        if results["issues"]:
            print("Issues detected:")
            for issue in results["issues"][:5]:  # show top 5
                print(f"  [!] {issue}")
            if len(results["issues"]) > 5:
                print(f"  ... and {len(results['issues']) - 5} more issues")
        else:
            print("Data Quality: PASS (No missing values, empty strings, or invalid labels)")

        print("Class Distribution:")
        for label_id in range(NUM_LABELS):
            dept_name = ID_TO_LABEL[label_id]
            count = results["class_distribution"].get(dept_name, 0)
            print(f"  {dept_name:<20}: {count:>4} samples")

    total_samples = sum(r["total_rows"] for r in validated_splits.values())
    print("\n" + "-" * 70)
    print(f"Total Dataset Size across all splits: {total_samples} samples")
    print(f"Number of Target Classes: {NUM_LABELS}")

    if total_samples < 1000:
        print("\n" + "!" * 70)
        print("[WARNING] DEMONSTRATION DATASET DETECTED:")
        print("This dataset contains demonstration records curated to verify the pipeline,")
        print("tokenization, DeBERTa architecture, and training/evaluation loop.")
        print("Fine-tuning on this demo set will produce a working artifact, but real-world")
        print("production deployment requires thousands of verified municipal complaints.")
        print("!" * 70)
    else:
        print("\n[INFO] Dataset size is sufficient for production training.")

    print("=" * 70 + "\n")

    return (
        validated_splits["Train"]["records"],
        validated_splits["Validation"]["records"],
        validated_splits["Test"]["records"],
    )


def load_datasets_for_training():
    """
    Returns records or pandas DataFrames (if pandas is installed) with an added 'label' column.
    """
    train_rec, val_rec, test_rec = print_dataset_summary()
    try:
        import pandas as pd
        return pd.DataFrame(train_rec), pd.DataFrame(val_rec), pd.DataFrame(test_rec)
    except ImportError:
        return train_rec, val_rec, test_rec


if __name__ == "__main__":
    print_dataset_summary()
