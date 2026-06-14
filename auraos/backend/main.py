from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import httpx
import os, json, sqlite3, re
from datetime import datetime
from pathlib import Path

load_dotenv(dotenv_path="../.env")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATA_DIR = Path("../data")
DATA_DIR.mkdir(exist_ok=True)

# ── ALL MODELS DEFINED FIRST ───────────────────────────────────
class CommandRequest(BaseModel):
    message: str

class AutomateRequest(BaseModel):
    url: str
    task: str = ""

class VisitRequest(BaseModel):
    url: str
    duration: int = 0

class CheckSiteRequest(BaseModel):
    domain: str
    mode: str
    context: str = ""
    user_goal: str = ""

class ExecuteRequest(BaseModel):
    intent: str
    current_url: str = ""
    profile_context: str = ""
    vault_context: str = ""

class DownloadRequest(BaseModel):
    url: str
    filename: str = ""
    size: str = ""
    status: str = "completed"

# ── GROQ WITH MODEL FALLBACK ───────────────────────────────────
MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
]

def ask(prompt, system=None, temperature=0.7, max_tokens=2000):
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    for model in MODELS:
        try:
            r = client.chat.completions.create(
                model=model, messages=messages,
                temperature=temperature, max_tokens=max_tokens
            )
            content = r.choices[0].message.content
            return content.strip() if content else ""
        except Exception as e:
            err = str(e).lower()
            if "rate_limit" in err or "429" in err or "quota" in err:
                continue
            raise e
    return '{"action":"reply","message":"AI is at capacity. Please try again in a moment."}'

def clean_json(text):
    if not text:
        return '{}'
    text = text.strip()
    if "```" in text:
        for part in text.split("```"):
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{") or part.startswith("["):
                return part.strip()
    if text.startswith("{") or text.startswith("["):
        return text
    m = re.search(r'\{[\s\S]*\}', text)
    if m:
        return m.group(0).strip()
    return text

def get_db():
    db = sqlite3.connect(DATA_DIR / "behaviour.db")
    db.execute("""CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT, url TEXT, visited_at TEXT, duration INTEGER)""")
    db.execute("""CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT, details TEXT, created_at TEXT, snapshot TEXT)""")
    db.execute("""CREATE TABLE IF NOT EXISTS realtime_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT, mode TEXT, reason TEXT, blocked_at TEXT)""")
    db.execute("""CREATE TABLE IF NOT EXISTS downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT, url TEXT, size TEXT,
        status TEXT, path TEXT, started_at TEXT)""")
    db.commit()
    return db

# ── WEB SEARCH WITHOUT PLAYWRIGHT ─────────────────────────────
SEARCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

async def web_search(query: str) -> list:
    """Search using DuckDuckGo HTML (no JS needed, no bot detection)"""
    results = []
    try:
        async with httpx.AsyncClient(headers=SEARCH_HEADERS, follow_redirects=True, timeout=10) as client_http:
            # DuckDuckGo HTML search — most reliable
            r = await client_http.get(
                f"https://html.duckduckgo.com/html/?q={query}",
            )
            text = r.text
            # Parse results with regex — no JS needed
            titles = re.findall(r'class="result__title"[^>]*>.*?<a[^>]*>(.*?)</a>', text, re.DOTALL)
            urls = re.findall(r'class="result__url"[^>]*>(.*?)</a>', text, re.DOTALL)
            snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', text, re.DOTALL)
            
            for i in range(min(8, len(titles))):
                title = re.sub(r'<[^>]+>', '', titles[i]).strip()
                url = urls[i].strip() if i < len(urls) else ''
                snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip() if i < len(snippets) else ''
                if title and url:
                    # Fix relative URLs
                    if not url.startswith('http'):
                        url = 'https://' + url
                    results.append({"title": title, "url": url, "snippet": snippet})
    except Exception as e:
        pass
    return results

async def fetch_page_text(url: str) -> str:
    """Fetch page content without Playwright"""
    try:
        async with httpx.AsyncClient(headers=SEARCH_HEADERS, follow_redirects=True, timeout=12) as client_http:
            r = await client_http.get(url)
            text = r.text
            # Strip HTML tags
            text = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', text, flags=re.IGNORECASE)
            text = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', text, flags=re.IGNORECASE)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:6000]
    except Exception as e:
        return ""

@app.get("/")
def root():
    return {"status": "AuraOS backend running"}

# ── SETUP BRAIN ────────────────────────────────────────────────
@app.post("/ai/command")
async def ai_command(req: CommandRequest):
    system = "You are the AI brain of AuraOS browser. Think independently. Return ONLY valid JSON, nothing else."
    prompt = f"""User described themselves: "{req.message}"

Configure their browser. Return ONLY this JSON:
{{
  "profile_name": "Short descriptive name",
  "theme": {{
    "name": "theme_name",
    "bg_primary": "#07090F",
    "bg_secondary": "#0D1117",
    "bg_card": "#161B22",
    "bg_card2": "#1C2333",
    "accent": "#3B82F6",
    "accent2": "#1D4ED8",
    "accent_glow": "rgba(59,130,246,0.15)",
    "green": "#10B981",
    "red": "#F87171",
    "orange": "#F59E0B",
    "purple": "#A78BFA",
    "text": "#E6EDF3",
    "muted": "#7D8590",
    "light": "#CDD9E5",
    "border": "#21262D",
    "border2": "#30363D",
    "font": "system-ui",
    "description": "Why this theme fits"
  }},
  "helpful_sites": [{{"domain":"site.com","label":"Name","emoji":"🔧","reason":"why"}}],
  "blocked_sites": ["think across ALL distraction categories — social, entertainment, gaming, shopping, gossip. No limit."],
  "allowed_sites": [],
  "active_mode": "mode_name",
  "realtime_monitoring": true,
  "realtime_context": "precise goal for judging new sites",
  "user_goal": "what they want to accomplish",
  "summary": "what was configured",
  "ai_message": "personal message to user"
}}"""
    return {"plan": clean_json(ask(prompt, system, max_tokens=3000))}

# ── CORE EXECUTE ENGINE ────────────────────────────────────────
@app.post("/ai/execute")
async def ai_execute(req: ExecuteRequest):
    system = """You are the AI core of AuraOS browser. Return ONLY JSON.

CRITICAL:
- "cricket score/match/today" → {"action":"search","query":"live cricket score today IPL 2026","message":"Searching live scores..."}
- "price of X / X rate / X cost" → {"action":"search","query":"X price today India 2026","message":"Searching..."}
- "news about X" → {"action":"search","query":"X latest news today","message":"Searching..."}
- "screenshot" when on aura:// page → {"action":"reply","message":"Please navigate to a website first, then I can take a screenshot."}
- "summarize" when on aura:// page → {"action":"reply","message":"Please navigate to a website first."}
- "screenshot" when on real URL → {"action":"screenshot","url":"USE_CURRENT_URL","message":"Taking screenshot..."}
- "summarize" when on real URL → {"action":"summarize","url":"USE_CURRENT_URL","message":"Summarizing..."}
- Any question you can answer → {"action":"reply","message":"complete helpful answer"}
- "developer/coding mode" → mode action with 25+ blocked sites, green terminal theme
- "study mode" → mode action with 30+ blocked sites, focused blue theme  
- "child mode" → mode action blocking adult/violent/social content
- "normal/relax mode" → {"action":"mode","mode":"normal_mode","blocked_sites":[],"helpful_sites":[],"theme":{"name":"default","bg_primary":"#07090F","bg_secondary":"#0D1117","bg_card":"#161B22","bg_card2":"#1C2333","accent":"#3B82F6","accent2":"#1D4ED8","accent_glow":"rgba(59,130,246,0.15)","green":"#10B981","red":"#F87171","orange":"#F59E0B","purple":"#A78BFA","text":"#E6EDF3","muted":"#7D8590","light":"#CDD9E5","border":"#21262D","border2":"#30363D","font":"system-ui","description":"Default theme"},"realtime_context":"","message":"Normal mode. All sites accessible."}

For MODE actions always include:
- blocked_sites: comprehensive list (20-35 domains), NEVER empty for focus modes
- helpful_sites: array of useful sites for that mode
- theme: complete theme object with ALL hex fields
- realtime_context: what to monitor for

AVAILABLE ACTIONS: search, navigate, screenshot, summarize, theme, mode, block, unblock, reply, stats, suggest, rollback, settings, vault"""

    prompt = f"""User: "{req.intent}"
Current page: {req.current_url or 'aura://home (new tab)'}
Profile: {req.profile_context[:120] if req.profile_context else 'none'}

Return JSON action."""

    text = ask(prompt, system, temperature=0.8, max_tokens=2500)
    text_clean = clean_json(text)
    try:
        parsed = json.loads(text_clean)
        # Fix: replace placeholder URL with actual current URL
        if parsed.get("url") == "USE_CURRENT_URL":
            parsed["url"] = req.current_url
        return {"success": True, "plan": parsed}
    except:
        return {"success": True, "plan": {"action": "reply", "message": text or "I couldn't process that. Try rephrasing."}}

# ── REALTIME SITE CHECK ────────────────────────────────────────
@app.post("/ai/check_site")
async def check_site(req: CheckSiteRequest):
    prompt = f"""Mode: {req.mode}
Goal: {req.user_goal or req.context}
Site: {req.domain}

Does visiting "{req.domain}" help or hurt the goal "{req.user_goal or req.context}"?
Return ONLY JSON: {{"should_block": false, "reason": "why"}}"""

    text = clean_json(ask(prompt, temperature=0.1, max_tokens=80))
    try:
        result = json.loads(text)
        if result.get("should_block"):
            db = get_db()
            db.execute("INSERT INTO realtime_blocks (domain,mode,reason,blocked_at) VALUES (?,?,?,?)",
                       (req.domain, req.mode, result.get("reason", ""), datetime.now().isoformat()))
            db.commit()
            db.close()
        return result
    except:
        return {"should_block": False, "reason": "Could not determine"}

# ── SEARCH — no Playwright needed ─────────────────────────────
@app.post("/automate/search")
async def search_web(req: AutomateRequest):
    if not req.task or not req.task.strip():
        return {"success": False, "error": "No query provided"}
    
    results = await web_search(req.task)
    
    if results:
        return {"success": True, "results": results, "query": req.task}
    
    # Fallback: AI answers from knowledge
    answer = ask(
        f"Answer this question with current knowledge: {req.task}\n\nBe specific and helpful.",
        max_tokens=600
    )
    return {"success": True, "results": [], "ai_answer": answer, "query": req.task}

# ── SCREENSHOT — fetch page and describe it ────────────────────
@app.post("/automate/screenshot")
async def take_screenshot(req: AutomateRequest):
    if not req.url or req.url.startswith('aura://'):
        return {"success": False, "error": "No webpage to screenshot. Navigate to a site first."}
    
    # Try to get page content and describe it
    text = await fetch_page_text(req.url)
    if text:
        description = ask(
            f"Describe what this webpage looks like and its main content:\nURL: {req.url}\nContent: {text[:2000]}",
            max_tokens=400
        )
        return {
            "success": True,
            "url": req.url,
            "description": description,
            "note": "Screenshot preview not available — Playwright requires Python 3.10. Showing page description instead."
        }
    return {"success": False, "error": "Could not load that page."}

# ── SUMMARIZE — fetch + AI summary ────────────────────────────
@app.post("/automate/summarize")
async def summarize_page(req: AutomateRequest):
    if not req.url or req.url.startswith('aura://'):
        return {"success": False, "error": "No webpage to summarize. Navigate to a site first."}
    
    text = await fetch_page_text(req.url)
    if not text:
        return {"success": False, "error": "Could not load that page. It may require JavaScript."}
    
    summary = ask(
        f"Summarize this webpage in 5 clear bullet points:\nURL: {req.url}\n\n{text[:4000]}",
        max_tokens=600
    )
    return {"success": True, "summary": summary, "url": req.url}

# ── EXTRACT ────────────────────────────────────────────────────
@app.post("/automate/extract")
async def extract_data(req: AutomateRequest):
    if not req.url or req.url.startswith('aura://'):
        return {"success": False, "error": "Navigate to a page first."}
    
    text = await fetch_page_text(req.url)
    if not text:
        return {"success": False, "error": "Could not load page."}
    
    result = ask(
        f"Task: {req.task}\nURL: {req.url}\nContent: {text[:5000]}\n\nComplete the task specifically.",
        max_tokens=800
    )
    return {"success": True, "result": result, "url": req.url}

# ── MULTI SEARCH ───────────────────────────────────────────────
@app.post("/automate/multi_search")
async def multi_search(req: AutomateRequest):
    results = await web_search(req.task)
    if results:
        results_text = "\n".join([f"- {r['title']}: {r['url']}" for r in results[:5]])
        analysis = ask(
            f"Task: {req.task}\nSearch results:\n{results_text}\n\nProvide a comprehensive helpful answer.",
            max_tokens=700
        )
        return {"success": True, "analysis": analysis, "sources": [r["url"] for r in results[:5]]}
    
    analysis = ask(f"Answer comprehensively from your knowledge: {req.task}", max_tokens=800)
    return {"success": True, "analysis": analysis, "sources": []}

# ── DOWNLOADS ──────────────────────────────────────────────────
@app.post("/downloads/add")
async def add_download(req: DownloadRequest):
    try:
        db = get_db()
        filename = req.filename or req.url.split("/")[-1].split("?")[0] or "download"
        db.execute(
            "INSERT INTO downloads (filename,url,size,status,path,started_at) VALUES (?,?,?,?,?,?)",
            (filename, req.url, req.size or "Unknown", req.status, "", datetime.now().isoformat())
        )
        db.commit()
        lid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.close()
        return {"success": True, "id": lid}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/downloads/list")
async def list_downloads():
    try:
        db = get_db()
        rows = db.execute(
            "SELECT id,filename,url,size,status,path,started_at FROM downloads ORDER BY id DESC LIMIT 100"
        ).fetchall()
        db.close()
        return {"downloads": [
            {"id": r[0], "filename": r[1], "url": r[2], "size": r[3],
             "status": r[4], "path": r[5], "started_at": r[6]}
            for r in rows
        ]}
    except Exception as e:
        return {"downloads": [], "error": str(e)}

@app.delete("/downloads/{download_id}")
async def delete_download(download_id: int):
    try:
        db = get_db()
        db.execute("DELETE FROM downloads WHERE id=?", (download_id,))
        db.commit()
        db.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/downloads")
async def clear_downloads():
    try:
        db = get_db()
        db.execute("DELETE FROM downloads")
        db.commit()
        db.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ── LOGGING ────────────────────────────────────────────────────
@app.post("/log/visit")
async def log_visit(req: VisitRequest):
    try:
        domain = req.url.split("/")[2] if "//" in req.url else req.url
        db = get_db()
        db.execute("INSERT INTO visits (domain,url,visited_at,duration) VALUES (?,?,?,?)",
                   (domain, req.url, datetime.now().isoformat(), req.duration))
        db.commit()
        db.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/stats")
async def get_stats():
    try:
        db = get_db()
        total = db.execute("SELECT COUNT(*) FROM visits").fetchone()[0]
        today_str = datetime.now().strftime("%Y-%m-%d") + "%"
        today = db.execute("SELECT COUNT(*) FROM visits WHERE visited_at LIKE ?", (today_str,)).fetchone()[0]
        top = db.execute(
            "SELECT domain,COUNT(*) as c FROM visits GROUP BY domain ORDER BY c DESC LIMIT 10"
        ).fetchall()
        rt = db.execute(
            "SELECT COUNT(*) FROM realtime_blocks WHERE blocked_at LIKE ?", (today_str,)
        ).fetchone()[0]
        recent_blocks = db.execute(
            "SELECT domain,reason,blocked_at FROM realtime_blocks ORDER BY id DESC LIMIT 5"
        ).fetchall()
        db.close()
        return {
            "total_visits": total,
            "today_visits": today,
            "realtime_blocked_today": rt,
            "top_domains": [{"domain": r[0], "count": r[1]} for r in top],
            "recent_blocks": [{"domain": r[0], "reason": r[1], "time": r[2]} for r in recent_blocks]
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/audit/log")
async def audit_log(req: CommandRequest):
    try:
        data = json.loads(req.message)
        db = get_db()
        snap = (DATA_DIR / "user_profile.json").read_text() \
            if (DATA_DIR / "user_profile.json").exists() else "{}"
        db.execute("INSERT INTO audit (action,details,created_at,snapshot) VALUES (?,?,?,?)",
                   (data.get("action"), data.get("details"), datetime.now().isoformat(), snap))
        db.commit()
        db.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/audit/rollback")
async def rollback():
    try:
        db = get_db()
        last = db.execute(
            "SELECT snapshot FROM audit ORDER BY id DESC LIMIT 1 OFFSET 1"
        ).fetchone()
        db.close()
        if last and last[0]:
            (DATA_DIR / "user_profile.json").write_text(last[0])
            return {"success": True, "message": "Rolled back to previous configuration"}
        return {"success": False, "message": "Nothing to roll back"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/learn/suggestions")
async def get_suggestions():
    try:
        db = get_db()
        top = db.execute(
            "SELECT domain,COUNT(*) as c FROM visits GROUP BY domain ORDER BY c DESC LIMIT 15"
        ).fetchall()
        db.close()
        if not top:
            return {"suggestions": []}
        domains = ", ".join([f"{r[0]}({r[1]}x)" for r in top])
        text = ask(
            f"Browsing habits: {domains}\n"
            f"Give 3 specific suggestions. Return ONLY JSON array:\n"
            f'[{{"type":"block","value":"domain.com","reason":"specific reason"}}]',
            max_tokens=400, temperature=0.5
        )
        return {"suggestions": json.loads(clean_json(text))}
    except Exception as e:
        return {"suggestions": [], "error": str(e)}