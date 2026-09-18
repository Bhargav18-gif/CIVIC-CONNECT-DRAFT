"""
Pydantic schemas and standard data contracts for CivicConnect AI Gateway.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TopPrediction(BaseModel):
    department: str
    confidence: float
    percentage: Optional[str] = None


class DistilBertPrediction(BaseModel):
    department: str
    confidence: float
    top3: List[TopPrediction]
    model: str = "distilbert"
    model_version: str


class YOLODetectionItem(BaseModel):
    class_name: str = Field(..., alias="class")
    class_id: int
    confidence: float
    department: str
    box: List[float]


class YOLOTopDetection(BaseModel):
    class_name: str = Field(..., alias="class")
    confidence: float
    department: str


class YOLOPrediction(BaseModel):
    detections: List[Dict[str, Any]] = []
    top_detection: Optional[Dict[str, Any]] = None
    model: str = "civic-yolo"
    model_version: str
    status: str = "success"
    message: Optional[str] = None


class ConfidenceRouterResult(BaseModel):
    case_code: str
    decision: str  # AUTO_APPROVE, GEMINI_FALLBACK, ADMIN_REVIEW
    reason: str
    requires_gemini: bool
    requires_admin: bool
    text_confidence: float
    vision_confidence: Optional[float] = None
    recommended_department: Optional[str] = None


class LocationInfo(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[Dict[str, Any]] = None
    isValid: bool = True


class PipelineAnalyzeRequest(BaseModel):
    description: str
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    location: Optional[LocationInfo] = None
    existing_complaints: Optional[List[Dict[str, Any]]] = []
