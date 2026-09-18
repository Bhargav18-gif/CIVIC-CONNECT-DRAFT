"""
CivicConnect Centralized Confidence Router
Implements the exact multi-tier confidence evaluation:
CASE A: Both models >= high threshold and agree -> AUTO APPROVE
CASE B: One model >= high threshold and the other is unavailable -> AUTO APPROVE (low risk)
CASE C: Medium confidence -> GEMINI FALLBACK
CASE D: Text and vision disagree -> GEMINI FALLBACK
CASE E: Gemini agrees with available model evidence -> AUTO APPROVE
CASE F: Gemini disagrees with model evidence -> ADMIN REVIEW
CASE G: Very low confidence -> ADMIN REVIEW
CASE H: High risk / urgent -> ADMIN REVIEW
"""

from typing import Dict, Any, Optional
from .config import (
    TEXT_HIGH_CONFIDENCE,
    TEXT_MEDIUM_CONFIDENCE,
    VISION_HIGH_CONFIDENCE,
    VISION_MEDIUM_CONFIDENCE,
)


def evaluate_confidence_routing(
    text_pred: Dict[str, Any],
    vision_pred: Optional[Dict[str, Any]],
    is_urgent: bool = False
) -> Dict[str, Any]:
    text_conf = float(text_pred.get("confidence", 0.0))
    text_dept = text_pred.get("department")

    has_vision = False
    vision_conf = 0.0
    vision_dept = None

    if vision_pred and vision_pred.get("status") == "success" and vision_pred.get("top_detection"):
        has_vision = True
        top_det = vision_pred["top_detection"]
        vision_conf = float(top_det.get("confidence", 0.0))
        vision_dept = top_det.get("department")

    # CASE H: Potential high-risk or urgent complaint
    if is_urgent:
        return {
            "case_code": "CASE_H",
            "decision": "ADMIN_REVIEW",
            "reason": "Complaint flagged as urgent/high-risk; requires supervisor authorization.",
            "requires_gemini": False,
            "requires_admin": True,
            "text_confidence": text_conf,
            "vision_confidence": vision_conf if has_vision else None,
            "recommended_department": text_dept,
        }

    # If vision model is active and produced a detection
    if has_vision:
        models_agree = (text_dept.lower() == vision_dept.lower())

        # CASE A: Both models >= high threshold AND agree
        if (
            text_conf >= TEXT_HIGH_CONFIDENCE
            and vision_conf >= VISION_HIGH_CONFIDENCE
            and models_agree
        ):
            return {
                "case_code": "CASE_A",
                "decision": "AUTO_APPROVE",
                "reason": f"Both DistilBERT ({text_conf:.2f}) and YOLO ({vision_conf:.2f}) agree on {text_dept}.",
                "requires_gemini": False,
                "requires_admin": False,
                "text_confidence": text_conf,
                "vision_confidence": vision_conf,
                "recommended_department": text_dept,
            }

        # CASE D: Text and vision disagree
        if not models_agree:
            return {
                "case_code": "CASE_D",
                "decision": "GEMINI_FALLBACK",
                "reason": f"Model conflict: Text indicates '{text_dept}' ({text_conf:.2f}) but vision indicates '{vision_dept}' ({vision_conf:.2f}).",
                "requires_gemini": True,
                "requires_admin": False,
                "text_confidence": text_conf,
                "vision_confidence": vision_conf,
                "recommended_department": None,
            }

        # CASE C: Medium confidence agreement
        if text_conf >= TEXT_MEDIUM_CONFIDENCE and vision_conf >= VISION_MEDIUM_CONFIDENCE:
            return {
                "case_code": "CASE_C",
                "decision": "GEMINI_FALLBACK",
                "reason": "Medium confidence evidence from models; reconciling via multimodal reasoning.",
                "requires_gemini": True,
                "requires_admin": False,
                "text_confidence": text_conf,
                "vision_confidence": vision_conf,
                "recommended_department": text_dept,
            }

    # Vision unavailable or no detection in image
    else:
        # CASE B: Text model is highly confident and vision is unavailable
        if text_conf >= TEXT_HIGH_CONFIDENCE:
            return {
                "case_code": "CASE_B",
                "decision": "AUTO_APPROVE",
                "reason": f"High text confidence ({text_conf:.2f}) with vision unavailable or uninformative.",
                "requires_gemini": False,
                "requires_admin": False,
                "text_confidence": text_conf,
                "vision_confidence": None,
                "recommended_department": text_dept,
            }

        # CASE C: Medium text confidence
        if text_conf >= TEXT_MEDIUM_CONFIDENCE:
            return {
                "case_code": "CASE_C",
                "decision": "GEMINI_FALLBACK",
                "reason": f"Medium text confidence ({text_conf:.2f}); sending to Gemini for multimodal reconciliation.",
                "requires_gemini": True,
                "requires_admin": False,
                "text_confidence": text_conf,
                "vision_confidence": None,
                "recommended_department": text_dept,
            }

    # CASE G: Very low confidence
    return {
        "case_code": "CASE_G",
        "decision": "ADMIN_REVIEW",
        "reason": f"Low model confidence ({text_conf:.2f}); routing to admin exception queue.",
        "requires_gemini": False,
        "requires_admin": True,
        "text_confidence": text_conf,
        "vision_confidence": vision_conf if has_vision else None,
        "recommended_department": text_dept,
    }
