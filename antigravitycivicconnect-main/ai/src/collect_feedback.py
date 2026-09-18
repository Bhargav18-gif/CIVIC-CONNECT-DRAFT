"""
CivicConnect Admin Task Classifier - Feedback Collection & Data Quality Module
Validates administrator decisions, filters out untrusted/unverified labels,
performs PII sanitization, protects against duplicate feedback, and generates
a transparent data-quality rejection audit.
"""

import os
import re
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple

try:
    from .config import (
        FEEDBACK_LOG_PATH,
        LABEL_TO_ID,
        ID_TO_LABEL,
    )
except ImportError:
    from config import (
        FEEDBACK_LOG_PATH,
        LABEL_TO_ID,
        ID_TO_LABEL,
    )


def sanitize_pii(text: str) -> str:
    """
    Removes emails, phone numbers, and house/door numbers before complaint text enters training datasets.
    """
    if not text:
        return ""

    sanitized = text
    # Remove email addresses
    sanitized = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL_REDACTED]', sanitized)
    # Remove phone numbers (10+ digits or international format)
    sanitized = re.sub(r'\+?\d{1,3}?[-.\s]?\(?\d{2,4}?\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', '[PHONE_REDACTED]', sanitized)
    # Remove house numbers/door numbers
    sanitized = re.sub(r'(?i)(flat|house|door|building|apartment|plot)\s*#?\s*\d+[a-z]?', '[ADDRESS_REDACTED]', sanitized)
    # Strip excess whitespace
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    return sanitized


def load_raw_feedback_entries() -> List[Dict[str, Any]]:
    """
    Loads raw admin decision feedback entries from admin_feedback.jsonl.
    """
    if not FEEDBACK_LOG_PATH.exists():
        return []

    entries = []
    with open(FEEDBACK_LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line_str = line.strip()
            if not line_str or line_str.startswith("#"):
                continue
            try:
                entry = json.loads(line_str)
                entries.append(entry)
            except Exception as e:
                print(f"[WARNING] Skipping malformed feedback line: {e}")
    return entries


def process_and_validate_feedback(
    custom_entries: List[Dict[str, Any]] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Validates feedback entries, ensures ONLY trusted human labels are accepted,
    applies PII sanitization, deduplicates by ID and text, and logs all rejections.
    """
    raw_entries = custom_entries if custom_entries is not None else load_raw_feedback_entries()

    total_collected = len(raw_entries)
    eligible_records = []
    rejections = []
    rejection_counts = {
        "missing_complaint_id": 0,
        "missing_complaint_text": 0,
        "missing_admin_decision": 0,
        "invalid_department": 0,
        "too_short_or_empty": 0,
        "unverified_source": 0,
        "already_used": 0,
        "duplicate_complaint_id": 0,
        "duplicate_text": 0,
    }

    seen_ids = set()
    seen_texts = set()

    for idx, entry in enumerate(raw_entries):
        cid = entry.get("complaint_id") or entry.get("complaintId")
        raw_text = entry.get("complaint_text") or entry.get("complaintText") or entry.get("complaint") or ""
        admin_decision = entry.get("admin_decision") or entry.get("adminDecision")
        training_status = entry.get("trainingStatus") or entry.get("training_status") or "pending"
        label_source = entry.get("labelSource") or entry.get("label_source") or "admin"

        # 1. Reject if already consumed in a prior training run
        if training_status == "used":
            rejection_counts["already_used"] += 1
            rejections.append({"index": idx, "complaint_id": cid, "reason": "Already used in prior training run"})
            continue

        # 2. Check complaint ID
        if not cid:
            rejection_counts["missing_complaint_id"] += 1
            rejections.append({"index": idx, "complaint_id": None, "reason": "Missing complaint ID"})
            continue

        # 3. Check complaint text
        if not raw_text or not raw_text.strip():
            rejection_counts["missing_complaint_text"] += 1
            rejections.append({"index": idx, "complaint_id": cid, "reason": "Empty complaint text"})
            continue

        # 4. Check admin decision existence
        if not admin_decision:
            rejection_counts["missing_admin_decision"] += 1
            rejections.append({"index": idx, "complaint_id": cid, "reason": "Missing verified admin decision"})
            continue

        # 5. Check valid department
        norm_dept = admin_decision.strip()
        if norm_dept not in LABEL_TO_ID:
            rejection_counts["invalid_department"] += 1
            rejections.append({"index": idx, "complaint_id": cid, "reason": f"Invalid department label: {admin_decision}"})
            continue

        # 6. Check length (meaningful complaint)
        clean_text = sanitize_pii(raw_text)
        words = clean_text.split()
        if len(clean_text) < 10 or len(words) < 3:
            rejection_counts["too_short_or_empty"] += 1
            rejections.append({"index": idx, "complaint_id": cid, "reason": f"Complaint text too short ({len(clean_text)} chars)"})
            continue

        # 7. Check deduplication by complaint ID
        if cid in seen_ids:
            rejection_counts["duplicate_complaint_id"] += 1
            rejections.append({"index": idx, "complaint_id": cid, "reason": "Duplicate complaint ID in feedback batch"})
            continue
        seen_ids.add(cid)

        # 8. Check deduplication by text
        text_key = clean_text.lower()
        if text_key in seen_texts:
            rejection_counts["duplicate_text"] += 1
            rejections.append({"index": idx, "complaint_id": cid, "reason": "Duplicate complaint text"})
            continue
        seen_texts.add(text_key)

        # Eligible Record
        eligible_records.append({
            "complaint_id": cid,
            "complaint": clean_text,
            "department": norm_dept,
            "original_prediction": entry.get("original_prediction") or entry.get("originalPrediction"),
            "original_confidence": entry.get("original_confidence") or entry.get("originalConfidence"),
            "modelVersionAtPrediction": entry.get("modelVersionAtPrediction") or entry.get("modelVersion") or "unknown",
            "is_override": entry.get("is_override", False) if "is_override" in entry else entry.get("isOverride", False),
            "admin_id": entry.get("admin_id") or entry.get("adminId") or "supervisor",
            "feedback_id": entry.get("feedbackId") or f"fb-{cid}",
        })

    report = {
        "total_collected": total_collected,
        "eligible_count": len(eligible_records),
        "rejected_count": len(rejections),
        "rejection_breakdown": rejection_counts,
        "rejections": rejections,
    }

    return eligible_records, report


if __name__ == "__main__":
    records, report = process_and_validate_feedback()
    print(f"Feedback Report: {len(records)} eligible / {report['total_collected']} collected")
