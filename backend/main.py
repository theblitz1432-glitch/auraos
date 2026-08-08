from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, get_activities, add_activity
from config_store import init_config, get_config, apply_config, rollback_config
from schemas import HealthResponse, ConfigModel, ActivityCreate, ActivityResponse, RollbackResponse
from groq_service import generate_plan_ai, generate_summary_ai

app = FastAPI(
    title="AuraOS Backend Service",
    description="Local Python FastAPI backend for AuraOS desktop application",
    version="1.0.0"
)

# CORS middleware for Electron/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlanGenerateRequest(BaseModel):
    intent: str

class SummarizeRequest(BaseModel):
    title: Optional[str] = "Active Web Page"
    url: Optional[str] = "aura://current-page"
    text: Optional[str] = ""

@app.on_event("startup")
def startup_event():
    init_db()
    init_config()

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        service="auraos-backend",
        timestamp=datetime.now().isoformat()
    )

@app.get("/api/config")
def read_configuration():
    return get_config()

@app.post("/api/apply-config")
def save_configuration(config: ConfigModel):
    new_data = config.dict(exclude_unset=True)
    updated = apply_config(new_data)
    return {
        "status": "success",
        "message": "Configuration saved and rollback snapshot created",
        "config": updated
    }

@app.post("/api/rollback", response_model=RollbackResponse)
def rollback_configuration():
    restored = rollback_config()
    return RollbackResponse(
        status="success",
        message="Configuration rolled back to previous snapshot successfully",
        config=restored
    )

@app.get("/api/activity")
def list_activities():
    return get_activities()

@app.post("/api/activity", response_model=ActivityResponse)
def create_activity_event(activity: ActivityCreate):
    created = add_activity(
        title=activity.title,
        event_type=activity.event_type,
        status=activity.status,
        description=activity.description,
        timestamp=activity.timestamp
    )
    return ActivityResponse(**created)

# Groq AI Endpoints
@app.post("/api/generate-plan")
def generate_plan_endpoint(req: PlanGenerateRequest):
    plan, is_fallback, fallback_note = generate_plan_ai(req.intent)
    return {
        "status": "success",
        "plan": plan,
        "is_fallback": is_fallback,
        "fallback_note": fallback_note if is_fallback else None
    }

@app.post("/api/summarize-page")
def summarize_page_endpoint(req: SummarizeRequest):
    summary, is_fallback, fallback_note = generate_summary_ai(req.title or "", req.url or "", req.text or "")
    return {
        "status": "success",
        "summary": summary,
        "is_fallback": is_fallback,
        "fallback_note": fallback_note if is_fallback else None
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
