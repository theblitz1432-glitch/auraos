import json
import os
import shutil
from typing import Dict, Any

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'auraos_config.json')
SNAPSHOT_FILE = os.path.join(os.path.dirname(__file__), 'auraos_config_snapshot.json')

DEFAULT_CONFIG: Dict[str, Any] = {
    "system_name": "AuraOS",
    "version": "1.0.0-aura",
    "model_engine": "aura-pro-v1",
    "temperature": 0.7,
    "theme_accent": "cyan",
    "auto_approve_plans": False,
    "hardware_acceleration": True,
    "max_history_items": 50,
    "security_sandbox": True,
    "study_mode_active": False,
    "active_theme": "dark-navy",
    "pinned_sites": ["Google", "GitHub", "YouTube", "Notion", "Google Scholar"],
    "blocked_websites": [],
    "cricket_widget_enabled": False,
    "cricket_score": "",
    "page_summarization": False,
    "applied_plan_title": ""
}

def init_config():
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
    if not os.path.exists(SNAPSHOT_FILE):
        with open(SNAPSHOT_FILE, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)

def get_config() -> Dict[str, Any]:
    init_config()
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return DEFAULT_CONFIG

def apply_config(new_config: Dict[str, Any]) -> Dict[str, Any]:
    init_config()
    current = get_config()
    with open(SNAPSHOT_FILE, 'w', encoding='utf-8') as f:
        json.dump(current, f, indent=2)

    updated = {**current, **new_config}
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(updated, f, indent=2)

    return updated

def rollback_config() -> Dict[str, Any]:
    init_config()
    if os.path.exists(SNAPSHOT_FILE):
        with open(SNAPSHOT_FILE, 'r', encoding='utf-8') as f:
            snapshot = json.load(f)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(snapshot, f, indent=2)
        return snapshot
    return get_config()
