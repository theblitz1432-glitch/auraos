import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Palette, 
  Loader2,
  Lock,
  UserCheck
} from 'lucide-react';
import { checkBackendHealth, fetchConfig, applyConfig, rollbackConfig, AuraConfig } from '../services/api';
import { ThemeStudio } from '../components/ThemeStudio';
import { ThemeId } from '../types/theme';
import { getBehavioralOptIn, setBehavioralOptIn } from '../utils/suggestionStore';

interface SettingsPageProps {
  onPreviewTheme?: (themeId: ThemeId) => void;
  onApplyTheme?: (themeId: ThemeId) => Promise<void>;
  currentThemeId?: ThemeId;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onPreviewTheme = () => {},
  onApplyTheme = async () => {},
  currentThemeId = 'professional-dark'
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'backend' | 'behavioral' | 'general'>('appearance');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const [config, setConfig] = useState<AuraConfig>({
    system_name: 'AuraOS Core',
    version: '1.0.0-aura',
    model_engine: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    theme_accent: 'cyan',
    auto_approve_plans: false,
    hardware_acceleration: true,
    max_history_items: 50,
    security_sandbox: true,
    study_mode_active: false,
    active_theme: 'professional-dark'
  });

  const [behavioralOptIn, setBehavioralOptInState] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setBehavioralOptInState(getBehavioralOptIn());

    const loadData = async () => {
      setBackendStatus('checking');
      const health = await checkBackendHealth();
      if (health) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }

      const backendCfg = await fetchConfig();
      if (backendCfg) {
        setConfig(prev => ({ ...prev, ...backendCfg }));
      }
    };

    loadData();
  }, []);

  const handleToggleBehavioralOptIn = (val: boolean) => {
    setBehavioralOptInState(val);
    setBehavioralOptIn(val);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    const res = await applyConfig(config);
    setIsSaving(false);
    if (res) {
      setSaveSuccessMsg('Configuration and rollback snapshot saved successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleRollbackConfig = async () => {
    setIsRollingBack(true);
    const res = await rollbackConfig();
    setIsRollingBack(false);
    if (res && res.config) {
      setConfig(res.config);
      setSaveSuccessMsg('Configuration rolled back to previous snapshot.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 bg-gradient-to-b from-[#070a12] via-[#0b101d] to-[#070a12]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/15 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              AuraOS Settings & Theme Studio
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage appearance themes, behavioral suggestion preferences, and local FastAPI backend configuration
          </p>
        </div>

        {/* Backend Online Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1322] border border-cyan-500/20 rounded-xl text-xs">
          <span className="text-slate-400 font-medium">Backend API:</span>
          {backendStatus === 'checking' && (
            <span className="text-amber-400 flex items-center gap-1 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...
            </span>
          )}
          {backendStatus === 'online' && (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Online (127.0.0.1:8000)
            </span>
          )}
          {backendStatus === 'offline' && (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              Offline (Using Local Store)
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-3">
        {[
          { id: 'appearance', label: 'Theme Studio', icon: Palette },
          { id: 'behavioral', label: 'Behavioural Suggestions', icon: UserCheck },
          { id: 'backend', label: 'FastAPI Backend', icon: Database },
          { id: 'general', label: 'General & Security', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/10'
              }`}
            >
              <Icon className="w-4 h-4 text-cyan-400" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Tab 1: Theme Studio */}
      {activeTab === 'appearance' && (
        <ThemeStudio
          currentThemeId={currentThemeId}
          onPreviewTheme={onPreviewTheme}
          onApplyTheme={onApplyTheme}
          suggestedThemeId="professional-dark"
        />
      )}

      {/* Tab 2: Behavioural Suggestions Opt-In */}
      {activeTab === 'behavioral' && (
        <div className="p-6 bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-cyan-500/15 pb-4">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-100">
                Behavioural Suggestions Settings
              </h3>
              <p className="text-xs text-slate-400">
                Configure privacy preferences for local browsing pattern recommendations
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#070a12] border border-cyan-500/20 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100">
                  Behavioural suggestions — Opt-in
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  behavioralOptIn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {behavioralOptIn ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {behavioralOptIn
                  ? 'When ON: Analyzes local visit counts to suggest pinning frequently visited websites e.g. GitHub.'
                  : 'When OFF: Only intent-based suggestions from your approved Aura Plan will be displayed.'}
              </p>
            </div>

            <button
              onClick={() => handleToggleBehavioralOptIn(!behavioralOptIn)}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                behavioralOptIn
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {behavioralOptIn ? 'Turn OFF' : 'Turn ON (Opt-in)'}
            </button>
          </div>

          {/* Privacy Notice Card */}
          <div className="p-4 bg-cyan-950/30 border border-cyan-400/30 rounded-xl flex items-start gap-3 text-xs text-cyan-200">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-100 block mb-0.5">Strict Local Privacy Guarantee</span>
              <p className="text-[11px] text-cyan-300/80 leading-relaxed font-medium">
                Browsing patterns are analysed locally and only when you opt in. No browsing history or visit metrics are ever transmitted outside your machine.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: FastAPI Backend */}
      {activeTab === 'backend' && (
        <div className="p-6 bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">
                  Python FastAPI JSON & SQLite Store
                </h3>
                <p className="text-xs text-slate-400">
                  FastAPI service endpoint: <code className="text-cyan-300">http://127.0.0.1:8000</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRollbackConfig}
                disabled={isRollingBack}
                className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                {isRollingBack ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Rollback Snapshot</span>
              </button>

              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Configuration</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-[#070a12] border border-cyan-500/20 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">System Information</span>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">System Name:</span>
                  <span className="font-mono text-slate-100">{config.system_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">AI Model Engine:</span>
                  <span className="font-mono text-cyan-300">{config.model_engine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">FastAPI Status:</span>
                  <span className="font-mono text-emerald-400">{backendStatus}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#070a12] border border-cyan-500/20 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">Database Metadata</span>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">SQLite Database:</span>
                  <span className="font-mono text-slate-100">backend/auraos.db</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">JSON Store:</span>
                  <span className="font-mono text-slate-100">backend/auraos_config.json</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Snapshot File:</span>
                  <span className="font-mono text-slate-100">auraos_config_snapshot.json</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: General & Security */}
      {activeTab === 'general' && (
        <div className="p-6 bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-cyan-500/15 pb-4">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-100">
                IPC Security & Desktop Sandbox
              </h3>
              <p className="text-xs text-slate-400">
                Electron main process context isolation and webRequest domain rules
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#070a12] border border-cyan-500/20 rounded-xl space-y-2 text-xs">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Security Audit Passed</span>
            <p className="text-slate-300 leading-relaxed font-medium">
              Electron `contextIsolation` is enabled with `nodeIntegration: false`. Domain request interception is managed directly in the main process via `session.defaultSession.webRequest.onBeforeRequest`.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
