from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str

class ConfigModel(BaseModel):
    system_name: Optional[str] = "AuraOS"
    version: Optional[str] = "1.0.0-aura"
    model_engine: Optional[str] = "aura-pro-v1"
    temperature: Optional[float] = 0.7
    theme_accent: Optional[str] = "cyan"
    auto_approve_plans: Optional[bool] = False
    hardware_acceleration: Optional[bool] = True
    max_history_items: Optional[int] = 50
    security_sandbox: Optional[bool] = True
    study_mode_active: Optional[bool] = False
    active_theme: Optional[str] = "dark-navy"
    pinned_sites: Optional[List[str]] = None
    blocked_websites: Optional[List[str]] = None
    cricket_widget_enabled: Optional[bool] = False
    cricket_score: Optional[str] = ""
    page_summarization: Optional[bool] = False
    applied_plan_title: Optional[str] = ""

class ActivityCreate(BaseModel):
    title: str
    event_type: str
    status: str
    description: str
    timestamp: Optional[str] = None

class ActivityResponse(BaseModel):
    event_id: str
    title: str
    event_type: str
    status: str
    description: str
    timestamp: str

class RollbackResponse(BaseModel):
    status: str
    message: str
    config: Dict[str, Any]
