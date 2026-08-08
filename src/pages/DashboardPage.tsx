import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Globe, 
  Code, 
  Video, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  Compass, 
  ExternalLink,
  Loader2,
  ShieldAlert,
  Trophy,
  Lock,
  Terminal,
  Search,
  Cpu,
  Database,
  Flame,
  FileCode,
  Bookmark,
  X,
  Plus
} from 'lucide-react';
import { generateAuraPlan } from '../utils/planGenerator';
import { AuraPlan } from '../types/plan';
import { AuraConfig, generatePlanApi, createActivity } from '../services/api';
import { 
  getAvailableSuggestions, 
  savePinnedSiteToStorage, 
  saveDismissedSuggestionToStorage, 
  SuggestedPin 
} from '../utils/suggestionStore';

interface DashboardPageProps {
  intentText: string;
  setIntentText: (text: string) => void;
  onNavigateToUrl: (url: string, title: string) => void;
  onOpenAssistant: () => void;
  onOpenPlanModal: (plan: AuraPlan) => void;
  activeConfig: AuraConfig | null;
  onExecuteSearch?: (query: string) => void;
  onPinSite?: (siteName: string, siteUrl: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  intentText,
  setIntentText,
  onNavigateToUrl,
  onOpenAssistant,
  onOpenPlanModal,
  activeConfig,
  onExecuteSearch,
  onPinSite
}) => {
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedPin[]>([]);

  // Load active suggestions from store
  useEffect(() => {
    setSuggestions(getAvailableSuggestions());
  }, []);

  const defaultDemoIntent = "I am a data science student who loves cricket and expensive technology, and I want fewer distractions.";

  const handleCreatePlan = async () => {
    const textToUse = intentText.trim() || defaultDemoIntent;
    setIsGeneratingPlan(true);

    try {
      const res = await generatePlanApi(textToUse);
      if (res && res.plan) {
        const p = res.plan;
        p.isFallback = res.is_fallback;
        p.fallbackNote = res.fallback_note;
        setIsGeneratingPlan(false);
        onOpenPlanModal(p);
        return;
      }
    } catch (e) {
      console.warn('FastAPI generate-plan failed, using client fallback:', e);
    }

    // Local client fallback if backend API fails or is offline
    setTimeout(() => {
      const fallbackPlan = generateAuraPlan(textToUse);
      fallbackPlan.isFallback = true;
      fallbackPlan.fallbackNote = "Using demo fallback because AI service is unavailable.";
      setIsGeneratingPlan(false);
      onOpenPlanModal(fallbackPlan);
    }, 1000);
  };

  const handlePinSuggestion = async (sug: SuggestedPin) => {
    savePinnedSiteToStorage(sug.name);
    setSuggestions(prev => prev.filter(s => s.id !== sug.id));

    if (onPinSite) {
      onPinSite(sug.name, sug.url);
    }

    await createActivity({
      title: `Pinned Suggested Website: ${sug.name}`,
      event_type: 'browsing',
      status: 'Completed',
      description: `User approved recommendation: Pinned ${sug.name} (${sug.url}) to Dashboard.`
    });
  };

  const handleDismissSuggestion = async (sug: SuggestedPin) => {
    saveDismissedSuggestionToStorage(sug.id);
    setSuggestions(prev => prev.filter(s => s.id !== sug.id));

    await createActivity({
      title: `Dismissed Suggestion: ${sug.name}`,
      event_type: 'browsing',
      status: 'Completed',
      description: `User dismissed recommendation for ${sug.name} without pinning.`
    });
  };

  const isStudyModeActive = activeConfig?.study_mode_active ?? false;
  const isDarkBlueTheme = activeConfig?.active_theme === 'dark-blue';

  // 5 Clickable Suggested Searches
  const suggestedSearches = [
    {
      query: 'Latest AI news',
      icon: Cpu,
      category: 'AI & Tech',
      color: 'from-purple-500/20 to-cyan-500/20 border-cyan-500/30 text-cyan-300'
    },
    {
      query: 'Data science resources',
      icon: Database,
      category: 'Data Science',
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300'
    },
    {
      query: 'Cricket live scores',
      icon: Trophy,
      category: 'Live Sports',
      color: 'from-amber-500/20 to-rose-500/20 border-amber-500/30 text-amber-300'
    },
    {
      query: 'GitHub trending projects',
      icon: Flame,
      category: 'Developer',
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300'
    },
    {
      query: 'Research papers on machine learning',
      icon: FileCode,
      category: 'Academic ML',
      color: 'from-sky-500/20 to-blue-600/20 border-sky-500/30 text-sky-300'
    }
  ];

  // Default Quick Links
  const defaultQuickLinks = [
    {
      id: 'google',
      name: 'Google',
      url: 'https://www.google.com',
      icon: Globe,
      color: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/30',
      iconColor: 'text-cyan-400',
      description: 'Search engine & web index',
    },
    {
      id: 'github',
      name: 'GitHub',
      url: 'https://github.com',
      icon: Code,
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
      iconColor: 'text-purple-400',
      description: 'Repositories, code & actions',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      url: 'https://youtube.com',
      icon: Video,
      color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30',
      iconColor: 'text-rose-400',
      description: 'Video streaming & tutorials',
    },
    {
      id: 'notion',
      name: 'Notion',
      url: 'https://notion.so',
      icon: BookOpen,
      color: 'from-slate-500/20 to-zinc-500/20 border-slate-500/30',
      iconColor: 'text-slate-300',
      description: 'Notes, docs & workspace',
    },
    {
      id: 'scholar',
      name: 'Google Scholar',
      url: 'https://scholar.google.com',
      icon: GraduationCap,
      color: 'from-sky-500/20 to-blue-500/20 border-sky-500/30',
      iconColor: 'text-sky-400',
      description: 'Research papers & articles',
    },
  ];

  // Approved Quick Links (Post-Plan Approval Transformation)
  const approvedQuickLinks = [
    {
      id: 'github',
      name: 'GitHub',
      url: 'https://github.com',
      icon: Code,
      color: 'from-blue-600/25 to-indigo-600/25 border-blue-400/40 shadow-[0_0_20px_rgba(37,99,235,0.2)]',
      iconColor: 'text-blue-300',
      description: 'AI & Data Science repositories',
    },
    {
      id: 'kaggle',
      name: 'Kaggle',
      url: 'https://kaggle.com',
      icon: Layers,
      color: 'from-cyan-600/25 to-blue-600/25 border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
      iconColor: 'text-cyan-300',
      description: 'Datasets, models & competitions',
    },
    {
      id: 'scholar',
      name: 'Google Scholar',
      url: 'https://scholar.google.com',
      icon: GraduationCap,
      color: 'from-sky-600/25 to-blue-700/25 border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.2)]',
      iconColor: 'text-sky-300',
      description: 'ML research papers & citations',
    },
    {
      id: 'leetcode',
      name: 'LeetCode',
      url: 'https://leetcode.com',
      icon: Terminal,
      color: 'from-indigo-600/25 to-blue-800/25 border-indigo-400/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]',
      iconColor: 'text-indigo-300',
      description: 'Algorithms & data structures',
    },
  ];

  const currentQuickLinks = isStudyModeActive ? approvedQuickLinks : defaultQuickLinks;
  const blockedSites = activeConfig?.blocked_websites && activeConfig.blocked_websites.length > 0
    ? activeConfig.blocked_websites
    : ['instagram.com', 'facebook.com', 'x.com', 'twitter.com'];

  const cricketScoreText = activeConfig?.cricket_score || 'India 184/4 — 18.2 overs';

  const renderIconByName = (iconName: string) => {
    switch (iconName) {
      case 'Layers': return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'GraduationCap': return <GraduationCap className="w-4 h-4 text-sky-400" />;
      case 'Terminal': return <Terminal className="w-4 h-4 text-indigo-400" />;
      case 'Trophy': return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'Code': return <Code className="w-4 h-4 text-blue-400" />;
      default: return <Bookmark className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 transition-colors duration-500 ${
      isDarkBlueTheme
        ? 'bg-gradient-to-b from-[#030712] via-[#08132b] to-[#030712]'
        : 'bg-gradient-to-b from-[#070a12] via-[#0b101d] to-[#070a12]'
    }`}>
      {/* Top Banner: Study Mode Active Indicator */}
      {isStudyModeActive && (
        <div className="max-w-4xl mx-auto p-3.5 bg-gradient-to-r from-blue-950/80 via-cyan-950/80 to-blue-950/80 border border-blue-400/40 rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.3)] flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/50 text-blue-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-blue-200 tracking-wider uppercase">
                  Study Mode Active
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-[11px] text-blue-300/80 font-medium">
                High-Focus Data Science Environment • Social Distractions Blocked
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-900/40 border border-blue-400/30 rounded-lg text-xs font-mono text-cyan-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>4 Social Sites Blocked</span>
          </div>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="max-w-4xl mx-auto text-center space-y-4 pt-2">
        {/* Aura Logo Emblem */}
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-purple-600/10 border border-cyan-400/30 shadow-[0_0_40px_rgba(6,182,212,0.3)] mb-1 animate-subtle-float">
          <Layers className="w-10 h-10 text-cyan-300" />
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight cyan-gradient-text">
            Aura<span className="text-cyan-400">OS</span> Desktop
          </h1>
          <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto font-medium leading-relaxed">
            Next-Gen Intent-Driven Operating Environment & Adaptive Web Shell
          </p>
        </div>

        {/* Workflow Step Indicators */}
        <div className="flex justify-center pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0d1322] border border-cyan-500/20 rounded-full text-xs">
            {[
              { name: '1. State Intent', active: true },
              { name: '2. Review Aura Plan', active: isStudyModeActive },
              { name: '3. Approve & Apply', active: isStudyModeActive },
              { name: '4. Workspace Active', active: isStudyModeActive },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.name}>
                <span className={`font-semibold flex items-center gap-1.5 ${
                  step.active ? 'text-cyan-300 font-bold' : 'text-slate-500'
                }`}>
                  {step.active && <CheckCircle2 className="w-3 h-3 text-cyan-300" />}
                  <span>{step.name}</span>
                </span>
                {idx < arr.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-cyan-400/60" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Intent Input Box Section */}
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>

          <div className="relative bg-[#0d1322] border border-cyan-500/30 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                State Your Intent
              </label>

              <span className="text-[11px] text-slate-400 font-mono">
                Aura AI Router • Active
              </span>
            </div>

            <textarea
              value={intentText}
              onChange={(e) => setIntentText(e.target.value)}
              rows={3}
              placeholder={defaultDemoIntent}
              className="w-full bg-[#070a12]/90 border border-cyan-500/20 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 resize-none transition-all"
            />

            {/* Action Button */}
            <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
              <button
                onClick={onOpenAssistant}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Need help crafting your prompt?
              </button>

              <button
                onClick={handleCreatePlan}
                disabled={isGeneratingPlan}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  isGeneratingPlan
                    ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300 cursor-wait'
                    : 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Synthesizing Aura Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950 text-cyan-300" />
                    <span>Create My Aura Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Suggestive Pins Section ("Suggested for You") */}
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Suggested for You ({suggestions.length} Active Recommendations)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Requires User Approval Before Pinning
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="p-4 bg-[#0d1322] border border-cyan-500/20 rounded-2xl text-center text-xs text-slate-400 space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="font-bold text-slate-200">All suggestions handled!</p>
            <p className="text-[11px] text-slate-400">Your dashboard pins are completely up to date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-3.5 bg-[#0d1322] border border-cyan-500/20 hover:border-cyan-400/40 rounded-2xl space-y-2.5 shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        {renderIconByName(sug.iconName)}
                      </div>
                      <h4 className="text-xs font-bold text-slate-100">{sug.name}</h4>
                    </div>

                    <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[9px] font-mono rounded">
                      {sug.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                    {sug.reason}
                  </p>

                  <div className="text-[10px] font-mono text-cyan-400/80 truncate">
                    {sug.url}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-cyan-500/10">
                  <button
                    onClick={() => handlePinSuggestion(sug)}
                    className="flex-1 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                    <span>Pin to Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleDismissSuggestion(sug)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-[11px] font-semibold rounded-xl transition-all"
                    title="Dismiss Suggestion"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Web Searches Section */}
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            Suggested Web Searches
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Click to search in Embedded WebContentsView
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {suggestedSearches.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onExecuteSearch && onExecuteSearch(item.query)}
                className={`p-3 bg-gradient-to-br ${item.color} bg-[#0d1322] border hover:border-cyan-400/60 rounded-xl text-left transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between space-y-2 group`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase opacity-80">{item.category}</span>
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-90 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-200 leading-snug">
                  "{item.query}"
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Cricket Widget & Blocked Sites Widgets (Shown when Study Mode is Active) */}
      {isStudyModeActive && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Live Cricket Widget */}
          <div className="p-4 bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border border-cyan-400/30 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Live Cricket Score</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-100">{cricketScoreText}</h4>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 border border-cyan-500/30 px-2 py-1 rounded-lg">
              Live
            </span>
          </div>

          {/* Blocked Websites Card */}
          <div className="p-4 bg-gradient-to-r from-rose-950/60 to-slate-950/60 border border-rose-400/30 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Active Domain Blocks</span>
                <div className="flex items-center gap-1.5 text-xs text-slate-200 font-mono mt-0.5">
                  {blockedSites.map((site) => (
                    <span key={site} className="px-1.5 py-0.5 bg-rose-950/80 border border-rose-500/30 rounded text-[10px]">
                      {site}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
        </div>
      )}

      {/* Quick Launch Pad Grid Section */}
      <div className="max-w-4xl mx-auto space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            {isStudyModeActive ? 'Pinned Workspace Tools' : 'Quick Launch Pad'}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {currentQuickLinks.length} Pinned Sites
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentQuickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => onNavigateToUrl(link.url, link.name)}
                className={`group p-4 rounded-2xl bg-gradient-to-br ${link.color} bg-[#0d1322] border hover:border-cyan-400/60 transition-all duration-300 text-left space-y-2.5 shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:scale-[1.02] active:scale-[0.98]`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 ${link.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 transition-colors" />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {link.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                    {link.description}
                  </p>
                </div>

                <div className="text-[10px] text-cyan-400/80 font-mono truncate pt-1">
                  {link.url}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
