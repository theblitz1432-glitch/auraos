import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  ChevronRight,
  Zap,
  Compass,
  FileText,
  Lock,
  Sliders,
  AlertTriangle,
  Loader2,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { generateFivePointSummary, PageSummaryResult } from '../utils/summarizer';
import { createActivity, summarizePageApi, AuraConfig } from '../services/api';

interface AssistantMessage {
  id: string;
  sender: 'assistant' | 'user';
  text?: string;
  time: string;
  cardType?: 'summary' | 'changes' | 'blocked' | 'confirm_disable';
  summaryData?: PageSummaryResult;
  isSummaryFallback?: boolean;
  configData?: AuraConfig | null;
}

interface AuraAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (promptText: string) => void;
  activeConfig: AuraConfig | null;
  onDisableStudyMode: () => Promise<void>;
}

export const AuraAssistantPanel: React.FC<AuraAssistantPanelProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  activeConfig,
  onDisableStudyMode
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: 'Hello, I am Aura Assistant. Describe your goal, or try one of the instant commands below.',
      time: 'Just now'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const addAssistantMessage = (msg: Partial<AssistantMessage>) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'assistant',
        time: timeStr,
        ...msg
      }
    ]);
  };

  const handleCommandSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text: trimmed, time: timeStr }
    ]);

    const lower = trimmed.toLowerCase();
    setIsProcessing(true);

    // Command 1: Summarize Page
    if (lower.includes('summarize') || lower.includes('five points')) {
      if (window.auraOS) {
        const pageData = await window.auraOS.extractBrowserText();
        let summary: PageSummaryResult;
        let isFallback = false;

        const apiRes = await summarizePageApi(pageData.title, pageData.url, pageData.text);
        if (apiRes && apiRes.summary) {
          summary = apiRes.summary;
          isFallback = apiRes.is_fallback;
        } else {
          summary = generateFivePointSummary(pageData.title, pageData.url, pageData.text);
          isFallback = true;
        }

        // Log SQLite event
        await createActivity({
          title: `AI Page Summary Generated`,
          event_type: 'plans',
          status: 'Completed',
          description: `Extracted ${summary.characterCount} chars from "${summary.title}" and generated 5 bullet points.`
        });

        setIsProcessing(false);
        addAssistantMessage({
          cardType: 'summary',
          summaryData: summary,
          isSummaryFallback: isFallback
        });
      } else {
        setIsProcessing(false);
        addAssistantMessage({ text: 'Unable to connect to Electron browser process for text extraction.' });
      }
      return;
    }

    // Command 2: What changed in my browser?
    if (lower.includes('what changed') || lower.includes('changes')) {
      setIsProcessing(false);
      addAssistantMessage({
        cardType: 'changes',
        configData: activeConfig
      });
      return;
    }

    // Command 3: Show my blocked websites
    if (lower.includes('blocked') || lower.includes('show blocked')) {
      setIsProcessing(false);
      addAssistantMessage({
        cardType: 'blocked',
        configData: activeConfig
      });
      return;
    }

    // Command 4: Turn off study mode
    if (lower.includes('turn off study') || lower.includes('disable study')) {
      setIsProcessing(false);
      addAssistantMessage({
        cardType: 'confirm_disable'
      });
      return;
    }

    // Generic Intent handling
    setTimeout(() => {
      setIsProcessing(false);
      addAssistantMessage({
        text: `Intent acknowledged: "${trimmed}". Executing workflow pipeline.`
      });
      onSelectPrompt(trimmed);
    }, 600);
  };

  const handleFormSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const v = inputVal;
    setInputVal('');
    handleCommandSubmit(v);
  };

  const handleConfirmDisableStudyMode = async () => {
    setIsProcessing(true);
    await onDisableStudyMode();
    setIsProcessing(false);
    addAssistantMessage({
      text: 'Study Mode has been disabled. Default workspace settings and quick links restored.'
    });
  };

  const commandButtons = [
    { label: 'Summarize this page in five points', icon: FileText },
    { label: 'What changed in my browser?', icon: Sliders },
    { label: 'Show my blocked websites', icon: Lock },
    { label: 'Turn off study mode', icon: BookOpen },
  ];

  return (
    <aside className="w-84 bg-[#090e1c]/95 border-l border-cyan-500/20 flex flex-col justify-between select-none z-20 shrink-0 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/15 flex items-center justify-between bg-[#0d1424]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              Aura Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </h3>
            <p className="text-[10px] text-cyan-400/80 font-medium">Autonomous Intent Engine</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-md transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Workflow Step Tracker */}
      <div className="p-3 bg-cyan-950/20 border-b border-cyan-500/10">
        <div className="text-[10px] font-bold text-cyan-400/90 tracking-wider uppercase mb-2 flex items-center justify-between">
          <span>Active Pipeline</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Ready
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
          <div className="p-1.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200">
            Intent
          </div>
          <div className="p-1.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200">
            Plan
          </div>
          <div className="p-1.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200">
            Approve
          </div>
          <div className="p-1.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200">
            Browser
          </div>
        </div>
      </div>

      {/* Chat & Logs Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1 ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
              {msg.sender === 'assistant' ? (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span className="font-semibold text-cyan-300">Aura Core</span>
                </>
              ) : (
                <span className="font-semibold text-slate-300">User</span>
              )}
              <span>• {msg.time}</span>
            </div>

            {/* Normal Text Message */}
            {msg.text && (
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed max-w-[95%] border ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600/25 border-cyan-400/40 text-slate-100 rounded-tr-none'
                    : 'bg-[#0d1425] border-cyan-500/20 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* Card 1: 5-Point Page Summary Card */}
            {msg.cardType === 'summary' && msg.summaryData && (
              <div className="w-full p-3.5 bg-[#0d1425] border border-cyan-400/30 rounded-xl space-y-2.5 shadow-xl text-xs">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    5-Point Page Summary
                  </span>
                  <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono rounded">
                    {msg.summaryData.characterCount} chars
                  </span>
                </div>

                {/* Small Non-Blocking Note if Fallback */}
                {msg.isSummaryFallback && (
                  <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center gap-1.5 text-[10px] text-cyan-300 font-medium">
                    <AlertCircle className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Using demo fallback because AI service is unavailable.</span>
                  </div>
                )}

                <div className="text-[11px] font-semibold text-slate-300 truncate">
                  Page: <span className="text-cyan-200">{msg.summaryData.title}</span>
                </div>

                <div className="space-y-1.5 pl-1">
                  {msg.summaryData.bulletPoints.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-200 leading-relaxed">
                      <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 2: What changed in my browser? Card */}
            {msg.cardType === 'changes' && (
              <div className="w-full p-3.5 bg-[#0d1425] border border-blue-400/30 rounded-xl space-y-2.5 shadow-xl text-xs">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    Browser Configuration Digest
                  </span>
                  <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-mono rounded">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between p-1.5 bg-[#070a12] rounded border border-blue-500/15">
                    <span className="text-slate-400">Study Mode:</span>
                    <span className="text-cyan-300 font-bold">
                      {msg.configData?.study_mode_active ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>

                  <div className="flex justify-between p-1.5 bg-[#070a12] rounded border border-blue-500/15">
                    <span className="text-slate-400">Theme Appearance:</span>
                    <span className="text-blue-300 font-bold capitalize">
                      {msg.configData?.active_theme || 'Dark Navy'}
                    </span>
                  </div>

                  <div className="flex justify-between p-1.5 bg-[#070a12] rounded border border-blue-500/15">
                    <span className="text-slate-400">Pinned Sites:</span>
                    <span className="text-emerald-400 font-bold">
                      {msg.configData?.study_mode_active ? 'GitHub, Kaggle, Scholar, LeetCode' : 'Default 5 Sites'}
                    </span>
                  </div>

                  <div className="flex justify-between p-1.5 bg-[#070a12] rounded border border-blue-500/15">
                    <span className="text-slate-400">Blocked Social Sites:</span>
                    <span className="text-rose-400 font-bold">
                      {msg.configData?.study_mode_active ? '4 Domains Blocked' : '0 Blocked'}
                    </span>
                  </div>

                  <div className="flex justify-between p-1.5 bg-[#070a12] rounded border border-blue-500/15">
                    <span className="text-slate-400">Cricket Scorecard:</span>
                    <span className="text-amber-400 font-bold">
                      {msg.configData?.cricket_widget_enabled ? 'India 184/4 (18.2)' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: Show my blocked websites Card */}
            {msg.cardType === 'blocked' && (
              <div className="w-full p-3.5 bg-[#0d1425] border border-rose-400/30 rounded-xl space-y-2.5 shadow-xl text-xs">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-rose-400" />
                    Blocked Websites List
                  </span>
                  <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[10px] font-mono rounded">
                    Study Protection
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {['instagram.com', 'facebook.com', 'x.com', 'twitter.com'].map((site) => (
                    <div key={site} className="p-2 bg-[#070a12] border border-rose-500/20 rounded-lg text-slate-300 font-mono text-[10px] flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-rose-400" />
                      <span className="truncate">{site}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 4: Confirmation Dialog - Turn Off Study Mode */}
            {msg.cardType === 'confirm_disable' && (
              <div className="w-full p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-3 shadow-xl text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Disable Study Mode?</span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Are you sure you want to disable Study Mode? This will unblock social media websites and restore default quick links.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleConfirmDisableStudyMode}
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs transition-colors"
                  >
                    Confirm Disable
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-cyan-300 p-2 bg-[#0d1425] rounded-xl border border-cyan-500/20">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Processing assistant command...</span>
          </div>
        )}

        {/* Instant Assistant Commands Section */}
        <div className="pt-2">
          <div className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> Instant Assistant Commands:
          </div>
          <div className="space-y-1.5">
            {commandButtons.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleCommandSubmit(cmd.label)}
                  className="w-full text-left p-2 rounded-lg bg-[#0d1424] hover:bg-cyan-500/15 border border-cyan-500/15 hover:border-cyan-400/30 text-[11px] text-slate-300 hover:text-cyan-200 transition-all flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{cmd.label}</span>
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Input Footer */}
      <form onSubmit={handleFormSend} className="p-3 border-t border-cyan-500/15 bg-[#070b16]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask Aura Assistant or type command..."
            className="w-full pl-3 pr-9 py-2 bg-[#0d1322] border border-cyan-500/25 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
          />
          <button
            type="submit"
            className="absolute right-1.5 p-1.5 bg-cyan-500/30 hover:bg-cyan-400 text-cyan-200 hover:text-slate-950 rounded-lg transition-all"
            title="Send Command"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};
