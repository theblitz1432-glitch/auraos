# AuraOS Desktop 🌐⚡

> **Next-Gen Intent-Driven Operating Environment & Adaptive Web Shell**

AuraOS is an AI-native desktop environment built on **Electron 34**, **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, and a local **Python FastAPI** backend. It dynamically transforms your desktop workspace based on plain-language intentions—blocking social media distractions natively in Electron, pinning tailored developer tools, streaming live sports scorecards, extracting 5-point AI webpage summaries, and maintaining full state persistence with 1-click snapshot rollback.

---

## 🌟 Key Features

- 🧠 **Intent-Driven Workspace Generation**: State what you want to accomplish (e.g. *"I am a data science student who loves cricket and expensive technology, and I want fewer distractions."*), and AuraOS synthesizes a tailored workspace plan.
- 🛡️ **Real Native Electron Domain Interception**: Uses Electron `session.defaultSession.webRequest.onBeforeRequest` (no fake React overlays). Blocks restricted domains (`instagram.com`, `facebook.com`, `x.com`, `twitter.com`) natively, displaying a custom AuraOS blocked view with **"Go Back"** and **"Temporarily Allow"** session controls.
- 🔄 **1-Click Snapshot Rollback**: Reverts your desktop environment, theme, pinned links, and domain rules back to the previous snapshot instantly via FastAPI (`POST /api/rollback`).
- ⚡ **WebContents Text Extraction & 5-Point Summarizer**: Extracts up to 12,000 characters from active browser pages via `executeJavaScript` and distills them into **exactly 5 concise bullet points**.
- 🐍 **Local Python FastAPI Backend & SQLite Stream**: Spawns automatically when Electron starts and closes on exit. Logs real-time activity events into `auraos.db` and persists configuration in `auraos_config.json`.
- 🤖 **Optional Groq AI Engine (`llama-3.3-70b-versatile`)**: Connects to Groq API securely on the backend only (never exposes keys to the frontend). If offline or no key is set, AuraOS seamlessly uses local demo fallbacks without breaking.

---

## 🏗️ Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                       AuraOS Desktop                        │
 ├──────────────────────────────┬──────────────────────────────┤
 │  Electron 34 (Main Process)  │   React 19 + Vite Renderer   │
 │  - WebContentsView Engine    │   - Glassmorphism UI Shell   │
 │  - Native WebRequest Blocking│   - Aura Assistant Drawer    │
 │  - Python Process Manager    │   - Intent Plan Engine       │
 └──────────────┬───────────────┴──────────────┬───────────────┘
                │                              │
                ▼                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                 Local Python FastAPI Backend                │
 │  - http://127.0.0.1:8000                                    │
 │  - SQLite Database (`backend/auraos.db`)                    │
 │  - Persistent JSON Store (`backend/auraos_config.json`)     │
 │  - Snapshot Store (`backend/auraos_config_snapshot.json`)   │
 │  - Groq AI Client (`backend/groq_service.py`)               │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher) & `npm`
- **Python** (v3.9 or higher)

---

### 💻 Setup on Windows (PowerShell)

```powershell
# 1. Clone or navigate to project directory
cd C:\Users\Suhani\.gemini\antigravity\scratch\aura-os

# 2. Install Node.js dependencies
npm install

# 3. Install Python backend dependencies
python -m pip install -r backend/requirements.txt

# 4. Start dev environment (Spawns Vite, Electron, and Python FastAPI backend)
npm run dev
```

---

### 🍎 / 🐧 Setup on macOS / Linux (Bash / Zsh)

```bash
# 1. Navigate to project directory
cd aura-os

# 2. Install Node.js dependencies
npm install

# 3. Install Python backend dependencies
pip install -r backend/requirements.txt

# 4. Start dev environment
npm run dev
```

---

## 🔑 Groq AI API Key Configuration (Optional)

AuraOS works **100% offline** using built-in fallback generators. To enable live Groq AI intelligence:

1. Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Edit `backend/.env` and paste your Groq API Key:
   ```env
   GROQ_API_KEY=gsk_your_actual_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
3. Test backend Groq service standalone:
   ```bash
   python backend/test_groq.py
   ```
4. Restart `npm run dev`.

---

## 🎬 2-Minute Hackathon Demo Script

Follow this step-by-step walkthrough for a flawless 2-minute live demo:

### ⏱️ 0:00 – 0:30 | The Problem & The Vision
- **Say**: *"Current operating systems are static. When you need to study or research, you manually close tabs, open tools, and fight social media distractions. AuraOS is an intent-driven web OS that configures your desktop automatically."*
- **Action**: Show default Dashboard (Dark Navy theme, 5 standard links: Google, GitHub, YouTube, Notion, Google Scholar).

### ⏱0:30 – 1:00 | Intent Plan Generation & Approval
- **Say**: *"Watch as I enter a complex goal: 'I am a data science student who loves cricket and expensive technology, and I want fewer distractions.'"*
- **Action**: Click **"Create My Aura Plan"**. Show the modal titled **"Your Aura Plan"** with notice *"No changes have been applied yet."*. Point out the 6 proposed rules (Dark-Blue theme, Study Mode, Data Science Quick Links, 4 Social Blocks, Cricket Widget, AI Summarizer).
- **Action**: Click **"Approve and Apply"**. Notice the toast *"AuraOS has configured your workspace."*. The UI instantly transforms to professional Dark-Blue with Study Mode active, quick links replaced with GitHub, Kaggle, Scholar, LeetCode, and live Cricket Scorecard (*India 184/4 — 18.2 overs*).

### ⏱ 1:00 – 1:30 | Native Domain Blocking & 5-Point Page Summary
- **Say**: *"AuraOS enforces real native domain blocking in Electron—not just a CSS overlay. Let's try navigating to instagram.com."*
- **Action**: Type `instagram.com` in the top address bar. Electron network interception stops Instagram and renders the local AuraOS blocked view (*"This website is blocked in Study Mode"*).
- **Action**: Click **"Temporarily Allow"** -> Page reloads `https://instagram.com` and logs an activity record to SQLite.
- **Action**: Navigate to `github.com`. Open **Aura Assistant** on the right side and click **"Summarize this page in five points"**. Show the 5-point summary card generated from live page text extraction.

### ⏱ 1:30 – 2:00 | Rollback & SQLite Timeline Audit
- **Say**: *"All environment changes are audited in a local SQLite database, and you can undo everything with 1 click."*
- **Action**: Switch to **Activity** tab. Show the real-time timeline stream.
- **Action**: Click **"Rollback Last Configuration"**. Show the toast *"Previous AuraOS configuration restored."* and watch the workspace instantly revert back to the default Dark Navy dashboard!

---

## 🛠️ Verification Commands

```bash
# Run TypeScript compilation check
npm run type-check

# Run production bundle build
npm run build
```
