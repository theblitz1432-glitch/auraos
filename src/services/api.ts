import { AuraPlan } from '../types/plan';
import { PageSummaryResult } from '../utils/summarizer';

const BASE_URL = 'http://127.0.0.1:8000';

export interface BackendHealth {
  status: string;
  service: string;
  timestamp: string;
}

export interface AuraConfig {
  system_name?: string;
  version?: string;
  model_engine?: string;
  temperature?: number;
  theme_accent?: string;
  auto_approve_plans?: boolean;
  hardware_acceleration?: boolean;
  max_history_items?: number;
  security_sandbox?: boolean;
  study_mode_active?: boolean;
  active_theme?: string;
  pinned_sites?: string[];
  blocked_websites?: string[];
  cricket_widget_enabled?: boolean;
  cricket_score?: string;
  page_summarization?: boolean;
  applied_plan_title?: string;
}

export interface ActivityItem {
  event_id: string;
  title: string;
  event_type: string;
  status: string;
  description: string;
  timestamp: string;
}

export interface ActivityCreatePayload {
  title: string;
  event_type: string;
  status: string;
  description: string;
  timestamp?: string;
}

export interface PlanApiResponse {
  status: string;
  plan: AuraPlan;
  is_fallback: boolean;
  fallback_note?: string | null;
}

export interface SummaryApiResponse {
  status: string;
  summary: PageSummaryResult;
  is_fallback: boolean;
  fallback_note?: string | null;
}

export async function checkBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend health check failed:', err);
    return null;
  }
}

export async function fetchConfig(): Promise<AuraConfig | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/config`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch config:', err);
    return null;
  }
}

export async function applyConfig(config: AuraConfig): Promise<{ status: string; message: string; config: AuraConfig } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/apply-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to apply config:', err);
    return null;
  }
}

export async function rollbackConfig(): Promise<{ status: string; message: string; config: AuraConfig } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to rollback config:', err);
    return null;
  }
}

export async function fetchActivities(): Promise<ActivityItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/activity`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch activities:', err);
    return [];
  }
}

export async function createActivity(payload: ActivityCreatePayload): Promise<ActivityItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to create activity:', err);
    return null;
  }
}

export async function generatePlanApi(intent: string): Promise<PlanApiResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Generate plan API fallback:', err);
    return null;
  }
}

export async function summarizePageApi(title: string, url: string, text: string): Promise<SummaryApiResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/summarize-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url, text }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Summarize page API fallback:', err);
    return null;
  }
}
