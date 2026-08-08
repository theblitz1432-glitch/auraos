import React, { useState, useEffect } from 'react';
import { 
  Workflow, 
  CheckSquare, 
  Square, 
  Sparkles, 
  CheckCircle2, 
  Database,
  Info,
  Loader2,
  Search,
  Filter,
  RotateCcw,
  User,
  Users,
  FileCode,
  AlertTriangle,
  Tag,
  Download,
  FileText
} from 'lucide-react';
import { generateAuraPlan } from '../utils/planGenerator';
import { AuraPlan } from '../types/plan';
import { generatePlanApi, createActivity } from '../services/api';
import { generateReviewPacketHtml, downloadReviewPacketFile } from '../utils/reviewPacketGenerator';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  completed: boolean;
}

export interface TaskRecord {
  id: string;
  title: string;
  status: 'Ready' | 'Missing Data' | 'Completed';
  section: 'Sources' | 'Generated Content' | 'Review Packets';
  owner: 'Me' | 'Team';
  missingData: boolean;
  sources: string[];
  notes: string;
  generatedContent: string;
  timestamp: string;
}

const CHECKLIST_STORAGE_KEY = 'auraos_agent_checklist';
const TASKS_STORAGE_KEY = 'auraos_agent_tasks';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: 'user_intent',
    label: 'User Intent / Prompt',
    description: 'Plain language prompt describing primary user goal, study focus, and workspace preferences.',
    required: true,
    completed: true,
  },
  {
    id: 'approved_config',
    label: 'Approved Browser Configuration',
    description: 'JSON schema store for active workspace themes, pinned tools, and study mode settings.',
    required: true,
    completed: true,
  },
  {
    id: 'browsing_context',
    label: 'Current Browsing Context',
    description: 'Active tab URL, page title, and extracted WebContents text snippet from Electron view.',
    required: true,
    completed: true,
  },
  {
    id: 'privacy_consent',
    label: 'Privacy Consent Status',
    description: 'User permission granted to parse page metadata and execute local plan synthesis.',
    required: true,
    completed: true,
  },
  {
    id: 'optional_notes',
    label: 'Optional Notes & Constraints',
    description: 'User-specified custom constraints, custom themes, or domain exception rules.',
    required: false,
    completed: false,
  },
];

const DEFAULT_TASKS: TaskRecord[] = [
  {
    id: 'task-101',
    title: 'Generate AuraOS Personalization Plan',
    status: 'Ready',
    section: 'Sources',
    owner: 'Me',
    missingData: false,
    sources: [
      'User Intent / Prompt',
      'Approved Browser Configuration',
      'Current Browsing Context',
      'Privacy Consent Status'
    ],
    notes: 'Approved for hackathon demonstration',
    generatedContent: 'Rule 1: Professional Dark Theme; Rule 2: Study Mode Active; Rule 3: Pinned GitHub, Kaggle, Scholar, LeetCode; Rule 4: Social Domains Blocked; Rule 5: Live Cricket Scorecard (India 184/4 — 18.2 overs); Rule 6: WebContents Summarizer.',
    timestamp: 'Today at 11:00 AM'
  },
  {
    id: 'task-102',
    title: 'Research Paper Synthesis Pipeline',
    status: 'Missing Data',
    section: 'Sources',
    owner: 'Me',
    missingData: true,
    sources: [
      'User Intent / Prompt',
      'Approved Browser Configuration',
      'Privacy Consent Status'
    ],
    notes: 'Awaiting WebContents PDF text extraction snippet before synthesizing research paper digest.',
    generatedContent: 'Pending input source: Browsing Context snippet required for PDF page vector analysis.',
    timestamp: 'Today at 10:45 AM'
  },
  {
    id: 'task-103',
    title: 'WebContents 5-Point Article Summary',
    status: 'Completed',
    section: 'Generated Content',
    owner: 'Me',
    missingData: false,
    sources: [
      'Current Browsing Context',
      'Privacy Consent Status'
    ],
    notes: 'Extracted 12,000 characters from active GitHub repository page via executeJavaScript.',
    generatedContent: 'Point 1: Repository Overview; Point 2: Architecture Focus; Point 3: Vector Indexing Speed; Point 4: Docker Quickstart; Point 5: Verified benchmarks.',
    timestamp: 'Today at 09:30 AM'
  },
  {
    id: 'task-104',
    title: 'Team Workspace Security Audit Packet',
    status: 'Completed',
    section: 'Review Packets',
    owner: 'Team',
    missingData: false,
    sources: [
      'Approved Browser Configuration',
      'Privacy Consent Status',
      'Security Compliance Rules'
    ],
    notes: 'Cross-origin IPC security inspection and sandbox isolation compliance packet for team deployment.',
    generatedContent: 'Audit Status: PASSED. Electron sandbox context isolation verified. Zero high-severity IPC surface vulnerabilities detected.',
    timestamp: 'Yesterday at 04:15 PM'
  }
];

// Word Highlighting Helper
const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-cyan-500/40 text-cyan-100 font-extrabold px-1 py-0.5 rounded border border-cyan-400/50">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

interface AgentWorkspacePageProps {
  onOpenPlanModal: (plan: AuraPlan) => void;
  intentText: string;
}

export const AgentWorkspacePage: React.FC<AgentWorkspacePageProps> = ({
  onOpenPlanModal,
  intentText
}) => {
  // Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load checklist from localStorage:', e);
    }
    return DEFAULT_CHECKLIST;
  });

  // Task Records State
  const [tasks, setTasks] = useState<TaskRecord[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load tasks from localStorage:', e);
    }
    return DEFAULT_TASKS;
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Ready' | 'Missing Data' | 'Completed'>('All');
  const [sectionFilter, setSectionFilter] = useState<'All' | 'Sources' | 'Generated Content' | 'Review Packets'>('All');
  const [ownerFilter, setOwnerFilter] = useState<'All' | 'Me' | 'Team'>('All');
  const [missingOnly, setMissingOnly] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
    } catch (e) {}
  }, [checklist]);

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const totalRequired = checklist.filter(i => i.required).length;
  const completedRequired = checklist.filter(i => i.required && i.completed).length;
  const totalCompleted = checklist.filter(i => i.completed).length;
  const allRequiredReady = completedRequired === totalRequired;

  const handleGeneratePlan = async () => {
    if (!allRequiredReady) return;
    setIsGenerating(true);

    const promptToUse = intentText || "I am a data science student who loves cricket and expensive technology, and I want fewer distractions.";

    try {
      const res = await generatePlanApi(promptToUse);
      if (res && res.plan) {
        const p = res.plan;
        p.isFallback = res.is_fallback;
        p.fallbackNote = res.fallback_note;
        setIsGenerating(false);
        onOpenPlanModal(p);
        return;
      }
    } catch (err) {
      console.warn('FastAPI generate-plan failed, using fallback:', err);
    }

    setTimeout(() => {
      const fallbackPlan = generateAuraPlan(promptToUse);
      fallbackPlan.isFallback = true;
      fallbackPlan.fallbackNote = "Using demo fallback because AI service is unavailable.";
      setIsGenerating(false);
      onOpenPlanModal(fallbackPlan);
    }, 1000);
  };

  const handleGenerateReviewPacket = async (task: TaskRecord) => {
    if (task.missingData || task.status === 'Missing Data') {
      const confirm = window.confirm(
        `Warning: Task "${task.title}" has missing required input sources.\n\nDo you still want to generate an incomplete Review Packet HTML report?`
      );
      if (!confirm) return;
    }

    const htmlContent = generateReviewPacketHtml(task, checklist);
    const cleanTitle = task.title.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `AuraOS_Review_Packet_${cleanTitle}.html`;

    downloadReviewPacketFile(filename, htmlContent);

    // Log SQLite activity
    await createActivity({
      title: `Review Packet Generated: ${task.title}`,
      event_type: 'system',
      status: 'Completed',
      description: `Exported AuraOS Agent Task Review Packet HTML report for task: "${task.title}".`
    });

    setToastMessage(`Review packet downloaded for "${task.title}"`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setSectionFilter('All');
    setOwnerFilter('All');
    setMissingOnly(false);
  };

  const handleResetDefaults = () => {
    setChecklist(DEFAULT_CHECKLIST);
    setTasks(DEFAULT_TASKS);
    handleResetFilters();
  };

  // Filter Tasks Engine
  const filteredTasks = tasks.filter(task => {
    if (missingOnly && !task.missingData && task.status !== 'Missing Data') {
      return false;
    }
    if (statusFilter !== 'All' && task.status !== statusFilter) {
      return false;
    }
    if (sectionFilter !== 'All' && task.section !== sectionFilter) {
      return false;
    }
    if (ownerFilter !== 'All' && task.owner !== ownerFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesSources = task.sources.some(s => s.toLowerCase().includes(q));
      const matchesNotes = task.notes.toLowerCase().includes(q);
      const matchesContent = task.generatedContent.toLowerCase().includes(q);
      const matchesSection = task.section.toLowerCase().includes(q);
      const matchesOwner = task.owner.toLowerCase().includes(q);

      return matchesTitle || matchesSources || matchesNotes || matchesContent || matchesSection || matchesOwner;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 bg-gradient-to-b from-[#070a12] via-[#0b101d] to-[#070a12] relative">
      {/* Download Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 p-4 bg-emerald-950/95 border border-emerald-400/50 rounded-2xl shadow-[0_0_35px_rgba(52,211,153,0.4)] text-emerald-100 text-xs font-extrabold flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
          <Download className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/15 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <Workflow className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Agent Task Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track required input sources, filter task records, and export downloadable HTML review packets
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all self-start md:self-auto flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
        </button>
      </div>

      {/* Main Agent Task Card with Source Checklist */}
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-6 bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl space-y-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/15 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold rounded uppercase">
                  Active Execution
                </span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Ready to Execute
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-100 mt-1">
                Generate AuraOS Personalization Plan
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono block">Engine: Aura Autonomous AI</span>
              <span className="text-xs font-bold text-cyan-300">FastAPI + Electron IPC</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Synthesizes personalized workspace environment rules (Dark-Blue theme, Study Mode, pinned developer tools, live scorecard widget, and domain blocklist) based on verified input sources below.
          </p>

          {/* Source Checklist Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#070a12] p-3 rounded-xl border border-cyan-500/20">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Source Checklist ({completedRequired} of {totalRequired} Required Ready)
                </h3>
              </div>

              {/* Overall Completion Indicator */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                  allRequiredReady
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {completedRequired} of {totalRequired} required sources ready ({totalCompleted}/5 total)
                </span>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    item.completed
                      ? 'bg-[#0b1222] border-cyan-500/30 hover:border-cyan-400/50'
                      : item.required
                      ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400/50'
                      : 'bg-[#070a12] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="mt-0.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-950" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${item.completed ? 'text-slate-100' : 'text-slate-300'}`}>
                          {item.label}
                        </span>
                        {item.required ? (
                          <span className="text-[9px] font-mono font-bold text-rose-400 uppercase bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.2 rounded">
                            Required
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    item.completed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : item.required
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {item.completed ? 'Complete' : item.required ? 'Missing' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Footer Action Bar */}
          <div className="p-4 bg-[#070a12] border border-cyan-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                {allRequiredReady
                  ? 'All 4 required inputs verified. Ready to synthesize Aura Plan.'
                  : 'Complete all 4 required sources to enable plan generation.'}
              </span>
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={!allRequiredReady || isGenerating}
              className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all shrink-0 ${
                !allRequiredReady
                  ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                  : isGenerating
                  ? 'bg-cyan-950 border border-cyan-400/40 text-cyan-300 cursor-wait'
                  : 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Synthesizing Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className={`w-4 h-4 ${allRequiredReady ? 'fill-slate-950 text-cyan-300' : 'text-slate-600'}`} />
                  <span>Generate Plan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section-Level Search & Multi-Faceted Filter Controls */}
        <div className="p-5 bg-[#0d1322] border border-cyan-500/25 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-cyan-500/15 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Section Search & Filter Controls
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-cyan-300 font-mono">
                {filteredTasks.length} matching task{filteredTasks.length === 1 ? '' : 's'}
              </span>

              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition-all border border-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, content, or sources…"
              className="w-full pl-10 pr-4 py-2.5 bg-[#070a12] border border-cyan-500/25 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
            />
          </div>

          {/* Filter Bar Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full p-2 bg-[#070a12] border border-cyan-500/20 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="All">All Statuses</option>
                <option value="Ready">Ready</option>
                <option value="Missing Data">Missing Data</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Section Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section Filter</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value as any)}
                className="w-full p-2 bg-[#070a12] border border-cyan-500/20 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="All">All Sections</option>
                <option value="Sources">Sources</option>
                <option value="Generated Content">Generated Content</option>
                <option value="Review Packets">Review Packets</option>
              </select>
            </div>

            {/* Ownership Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ownership Filter</label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value as any)}
                className="w-full p-2 bg-[#070a12] border border-cyan-500/20 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="All">All Owners</option>
                <option value="Me">Me Only</option>
                <option value="Team">Team Only</option>
              </select>
            </div>

            {/* Missing Data Toggle */}
            <div className="space-y-1 flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setMissingOnly(!missingOnly)}
                className={`w-full p-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                  missingOnly
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'bg-[#070a12] text-slate-400 border-cyan-500/20 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${missingOnly ? 'text-rose-400' : 'text-slate-500'}`} />
                <span>Missing Data Only</span>
              </button>
            </div>
          </div>
        </div>

        {/* Task Record Cards List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Task Execution Records & Content ({filteredTasks.length})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Persisted in localStorage
            </span>
          </h3>

          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center bg-[#0d1322] border border-cyan-500/20 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">No matching records</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No task records match your current search query or filter criteria. Click below to clear filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs rounded-xl transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isMissing = task.status === 'Missing Data';
              const isCompleted = task.status === 'Completed';

              return (
                <div
                  key={task.id}
                  className="p-5 bg-[#0d1322] border border-cyan-500/20 hover:border-cyan-400/40 rounded-2xl space-y-4 shadow-xl transition-all group"
                >
                  {/* Top Metadata Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : isMissing
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isMissing ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            <HighlightText text={task.title} query={searchQuery} />
                          </h4>
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[9px] font-mono text-cyan-300 rounded uppercase flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-cyan-400" />
                            <HighlightText text={task.section} query={searchQuery} />
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{task.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Owner Badge */}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1">
                        {task.owner === 'Team' ? (
                          <Users className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <User className="w-3 h-3 text-blue-400" />
                        )}
                        <span><HighlightText text={task.owner} query={searchQuery} /></span>
                      </span>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : isMissing
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>

                  {/* Sources List */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified Sources</span>
                    <div className="flex flex-wrap gap-1.5">
                      {task.sources.map((src, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-[#070a12] border border-cyan-500/20 rounded text-[10px] font-mono text-cyan-200"
                        >
                          <HighlightText text={src} query={searchQuery} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Task Notes */}
                  <div className="text-xs text-slate-300 leading-relaxed font-medium">
                    <strong className="text-slate-400 font-semibold">Notes: </strong>
                    <HighlightText text={task.notes} query={searchQuery} />
                  </div>

                  {/* Generated Content Box */}
                  <div className="p-3 bg-[#070a12] border border-cyan-500/15 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 uppercase">
                      <span>Generated Output Content</span>
                      <FileCode className="w-3 h-3 text-cyan-400" />
                    </div>
                    <p className="text-xs text-slate-200 font-mono leading-relaxed">
                      <HighlightText text={task.generatedContent} query={searchQuery} />
                    </p>
                  </div>

                  {/* Action Bar - Generate Review Packet */}
                  <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Review Packet HTML Report</span>
                    </div>

                    <button
                      onClick={() => handleGenerateReviewPacket(task)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                        isMissing
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-extrabold hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <Download className={`w-3.5 h-3.5 ${isMissing ? 'text-amber-400' : 'text-slate-950 stroke-[2.5]'}`} />
                      <span>Generate Review Packet</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
