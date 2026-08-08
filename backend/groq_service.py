import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple

ENV_FILE = os.path.join(os.path.dirname(__file__), '.env')

def load_env_vars():
    env_vars = {}
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env_vars[k.strip()] = v.strip()
        except Exception:
            pass
    return env_vars

def get_groq_config():
    env_vars = load_env_vars()
    api_key = env_vars.get('GROQ_API_KEY') or os.environ.get('GROQ_API_KEY') or ''
    model = env_vars.get('GROQ_MODEL') or os.environ.get('GROQ_MODEL') or 'llama-3.3-70b-versatile'
    return api_key.strip(), model.strip()

# Local Fallback Plan Generator
def get_fallback_plan(intent_text: str) -> Dict[str, Any]:
    trimmed = intent_text.strip()
    return {
        "id": f"plan-fallback-{os.urandom(4).hex()}",
        "intent": trimmed or "Custom Productivity & Focus Intent",
        "title": "Tailored Data Science & High-Focus Environment Plan",
        "summary": "Aura Autonomous Engine synthesized 6 rules to optimize focus, integrate live sports updates, and pin data science workspace tools.",
        "createdAt": "Just now",
        "items": [
            {
                "id": "item-theme",
                "category": "theme",
                "title": "Professional Dark Theme",
                "proposedChange": "Set UI Accent to Electric Cyan & High-Contrast Dark Navy",
                "reason": "Complements premium technology preferences and reduces visual fatigue during extended coding sessions.",
                "iconName": "Moon"
            },
            {
                "id": "item-mode",
                "category": "mode",
                "title": "Study & Focus Mode Enabled",
                "proposedChange": "Enable Study Mode with Notification Suppression",
                "reason": "Creates an uninterrupted environment optimized for data science coursework and complex problem solving.",
                "iconName": "BookOpen"
            },
            {
                "id": "item-bookmarks",
                "category": "bookmarks",
                "title": "Pinned Workspace Quick Links",
                "proposedChange": "Pin GitHub, Kaggle, Google Scholar & LeetCode to Speed Dial",
                "reason": "Provides 1-click access to data science repositories, ML datasets, research papers, and coding benchmarks.",
                "iconName": "Bookmark"
            },
            {
                "id": "item-blocked",
                "category": "security",
                "title": "Distraction Domain Blocklist",
                "proposedChange": "Block instagram.com, facebook.com, x.com & twitter.com",
                "reason": "Enforces strict focus boundaries by preventing access to high-distraction social feeds during active study hours.",
                "iconName": "ShieldAlert"
            },
            {
                "id": "item-widget",
                "category": "widget",
                "title": "Live Cricket Score Widget",
                "proposedChange": "Pin Live Match Scorecard to Aura Assistant Side Panel",
                "reason": "Delivers real-time score updates directly inside the OS shell without needing distracting external browser tabs.",
                "iconName": "Trophy"
            },
            {
                "id": "item-ai",
                "category": "ai",
                "title": "AI Page & Research Summarizer",
                "proposedChange": "Enable Automatic Article & Research Paper Summarization",
                "reason": "Instantly distills complex machine learning papers and documentation into key takeaways.",
                "iconName": "Sparkles"
            }
        ]
    }

# Local Fallback Summary Generator
def get_fallback_summary(title: str, url: str, raw_text: str) -> Dict[str, Any]:
    clean_title = title or "Active Web Page"
    clean_text = (raw_text or "").strip()
    char_count = min(len(clean_text), 12000)

    return {
        "title": clean_title,
        "url": url or "aura://current-page",
        "characterCount": char_count,
        "bulletPoints": [
            f"Overview: \"{clean_title}\" provides key insights and technical reference data.",
            "Core Concept: Highlights key documentation standards and system architecture.",
            "Key Feature: Built for high-performance workflow execution and modular integration.",
            "Usage Context: Designed for data science research and developer productivity.",
            f"Summary Takeaway: Structured content verified across {char_count:,} extracted characters."
        ]
    }

def generate_plan_ai(intent_text: str) -> Tuple[Dict[str, Any], bool, str]:
    api_key, model = get_groq_config()
    fallback_note = "Using demo fallback because AI service is unavailable."

    if not api_key:
        return get_fallback_plan(intent_text), True, fallback_note

    prompt = (
        f"You are AuraOS AI router. Generate a structured JSON intent plan for: \"{intent_text}\".\n"
        "Return ONLY a JSON object with this structure:\n"
        "{\n"
        "  \"title\": \"string\",\n"
        "  \"summary\": \"string\",\n"
        "  \"items\": [\n"
        "     {\"id\": \"1\", \"category\": \"theme\", \"title\": \"...\", \"proposedChange\": \"...\", \"reason\": \"...\", \"iconName\": \"Moon\"}\n"
        "  ]\n"
        "}\n"
        "Allowed iconNames: Moon, BookOpen, Bookmark, ShieldAlert, Trophy, Sparkles."
    )

    req_data = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful JSON-only assistant for AuraOS."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.5,
        "response_format": {"type": "json_object"}
    }).encode('utf-8')

    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=req_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            content = res_body['choices'][0]['message']['content']
            parsed = json.loads(content)

            # Validate response schema
            if "items" in parsed and isinstance(parsed["items"], list) and len(parsed["items"]) > 0:
                parsed["id"] = f"plan-groq-{os.urandom(4).hex()}"
                parsed["intent"] = intent_text
                parsed["createdAt"] = "Just now"
                return parsed, False, ""
    except Exception as e:
        print(f"Groq API error or validation failure: {e}")

    return get_fallback_plan(intent_text), True, fallback_note

def generate_summary_ai(title: str, url: str, raw_text: str) -> Tuple[Dict[str, Any], bool, str]:
    api_key, model = get_groq_config()
    fallback_note = "Using demo fallback because AI service is unavailable."

    if not api_key:
        return get_fallback_summary(title, url, raw_text), True, fallback_note

    clean_text = raw_text[:12000]
    prompt = (
        f"Summarize page titled \"{title}\" with URL \"{url}\". Extracted text snippet:\n"
        f"\"{clean_text[:4000]}\"\n\n"
        "Return ONLY a JSON object with this exact key:\n"
        "{\n"
        "  \"bulletPoints\": [\"Point 1\", \"Point 2\", \"Point 3\", \"Point 4\", \"Point 5\"]\n"
        "}\n"
        "Constraint: Exactly 5 concise bullet points."
    )

    req_data = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a JSON-only page summarizer."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"}
    }).encode('utf-8')

    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=req_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            content = res_body['choices'][0]['message']['content']
            parsed = json.loads(content)

            if "bulletPoints" in parsed and isinstance(parsed["bulletPoints"], list) and len(parsed["bulletPoints"]) == 5:
                return {
                    "title": title or "Web Page",
                    "url": url or "aura://current-page",
                    "characterCount": len(raw_text),
                    "bulletPoints": parsed["bulletPoints"]
                }, False, ""
    except Exception as e:
        print(f"Groq Summary API error: {e}")

    return get_fallback_summary(title, url, raw_text), True, fallback_note
