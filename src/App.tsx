import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopNavbar, ActiveTab } from './components/TopNavbar';
import { Sidebar } from './components/Sidebar';
import { AuraAssistantPanel } from './components/AuraAssistantPanel';
import { AuraPlanModal } from './components/AuraPlanModal';
import { DashboardPage } from './pages/DashboardPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { AgentWorkspacePage } from './pages/AgentWorkspacePage';
import { parseUrlOrSearch, isDirectUrlOrDomain } from './utils/urlParser';
import { BrowserState } from '../electron/preload';
import { AuraPlan } from './types/plan';
import { applyConfig, rollbackConfig, createActivity, fetchConfig, AuraConfig } from './services/api';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import { ThemeId, THEME_OPTIONS } from './types/theme';
import { recordLocalVisit } from './utils/suggestionStore';

export type RouteType = 'home' | 'activity' | 'settings' | 'agent-workspace';

interface HistoryItem {
  route: RouteType;
  url: string;
  title: string;
}

export const App: React.FC = () => {
  // Active primary tab state: 'home' (AuraOS Home) or 'browser' (Embedded Browser)
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [hasActiveBrowserSession, setHasActiveBrowserSession] = useState(false);

  // App Route State (for Home Tab sub-routes)
  const [currentRoute, setCurrentRoute] = useState<RouteType>('home');
  const [history, setHistory] = useState<HistoryItem[]>([
    { route: 'home', url: 'aura://dashboard', title: 'Home Dashboard' }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Active Backend Config State
  const [activeConfig, setActiveConfig] = useState<AuraConfig | null>(null);

  // Theme Studio States
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('professional-dark');
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId | null>(null);

  // Browser View State (from Electron WebContentsView)
  const [browserState, setBrowserState] = useState<BrowserState>({
    url: '',
    title: 'New Tab',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  });

  // Address Bar Text
  const [addressVal, setAddressVal] = useState('aura://dashboard');

  // Intent input state across app
  const [intentText, setIntentText] = useState('I am a data science student who loves cricket and expensive technology, and I want fewer distractions.');

  // Assistant drawer toggle state
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);

  // Plan Modal state
  const [activePlan, setActivePlan] = useState<AuraPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Success / Warning Notification Banner
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Ref to measure DOM viewport bounds for WebContentsView positioning
  const browserContainerRef = useRef<HTMLDivElement>(null);

  // Load initial backend configuration on startup (Reload Persistence)
  useEffect(() => {
    const loadInitialConfig = async () => {
      const cfg = await fetchConfig();
      if (cfg) {
        setActiveConfig(cfg);
        if (cfg.active_theme) {
          setCurrentThemeId(cfg.active_theme as ThemeId);
        }
      }
    };
    loadInitialConfig();
  }, []);

  // Sync Study Mode Domain Blocking Rules to Electron Main Process
  useEffect(() => {
    if (window.auraOS && activeConfig) {
      window.auraOS.updateStudyModeRules({
        studyModeActive: !!activeConfig.study_mode_active,
        blockedDomains: activeConfig.blocked_websites || ['instagram.com', 'facebook.com', 'x.com', 'twitter.com'],
      });
    }
  }, [activeConfig]);

  // Function to sync browser bounds with main process
  const syncBrowserBounds = useCallback(() => {
    if (!browserContainerRef.current || !window.auraOS) return;
    const rect = browserContainerRef.current.getBoundingClientRect();
    window.auraOS.setBrowserBounds({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  // Update visibility and bounds whenever activeTab, assistant state or window changes
  useEffect(() => {
    if (!window.auraOS) return undefined;

    if (activeTab === 'browser') {
      window.auraOS.setBrowserVisible(true);
      const timer = setTimeout(() => {
        syncBrowserBounds();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      window.auraOS.setBrowserVisible(false);
      return undefined;
    }
  }, [activeTab, isAssistantOpen, syncBrowserBounds]);

  // Window Resize Listener and ResizeObserver for smooth BrowserView resizing
  useEffect(() => {
    const handleResize = () => {
      if (activeTab === 'browser') {
        syncBrowserBounds();
      }
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (browserContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (activeTab === 'browser') {
          syncBrowserBounds();
        }
      });
      resizeObserver.observe(browserContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [activeTab, syncBrowserBounds]);

  // Subscribe to Electron Browser WebContents events
  useEffect(() => {
    if (!window.auraOS) return;

    const cleanup = window.auraOS.onBrowserStateChange((newState) => {
      setBrowserState((prev) => {
        const updated = { ...prev, ...newState };
        if (newState.url && activeTab === 'browser') {
          setAddressVal(newState.url);
          recordLocalVisit(newState.url);
        }
        return updated;
      });
    });

    return () => {
      cleanup();
    };
  }, [activeTab]);

  // Execute Browser Search / Navigation
  const executeBrowserNavigation = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setToastMessage({ text: 'Please enter a search query or URL.', isError: true });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const isDirect = isDirectUrlOrDomain(trimmed);
    const targetUrl = parseUrlOrSearch(trimmed);

    setHasActiveBrowserSession(true);
    setActiveTab('browser');
    setAddressVal(targetUrl);

    if (window.auraOS) {
      window.auraOS.navigateBrowser(targetUrl);
    }

    // Record local visit count for behavioral suggestions
    recordLocalVisit(targetUrl);

    // Log SQLite activity event for web search
    await createActivity({
      title: isDirect ? 'Web Navigation Executed' : 'Web Search Executed',
      event_type: 'browsing',
      status: 'Completed',
      description: isDirect ? `Navigated to: ${targetUrl}` : `Searched web for: "${trimmed}"`
    });
  };

  // Route change helper for Home Tab
  const navigateRoute = (newRoute: RouteType) => {
    setActiveTab('home');
    setCurrentRoute(newRoute);
    const title = newRoute === 'home' 
      ? 'Home Dashboard' 
      : newRoute === 'activity' 
      ? 'Activity Logs' 
      : newRoute === 'agent-workspace'
      ? 'Agent Workspace'
      : 'Settings';
    const url = `aura://${newRoute}`;

    setAddressVal(url);
    const newItem: HistoryItem = { route: newRoute, url, title };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItem);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Address Bar Submission
  const handleAddressSubmit = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setToastMessage({ text: 'Please enter a search query or URL.', isError: true });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (trimmed === 'aura://dashboard' || trimmed === 'aura://home') {
      navigateRoute('home');
    } else if (trimmed === 'aura://activity') {
      navigateRoute('activity');
    } else if (trimmed === 'aura://settings') {
      navigateRoute('settings');
    } else if (trimmed === 'aura://agent-workspace') {
      navigateRoute('agent-workspace');
    } else {
      executeBrowserNavigation(input);
    }
  };

  // Back Button Handler
  const handleBack = () => {
    if (activeTab === 'browser') {
      if (window.auraOS && browserState.canGoBack) {
        window.auraOS.browserGoBack();
      }
    } else {
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setCurrentRoute(history[prevIndex].route);
        setAddressVal(history[prevIndex].url);
      }
    }
  };

  // Forward Button Handler
  const handleForward = () => {
    if (activeTab === 'browser') {
      if (window.auraOS && browserState.canGoForward) {
        window.auraOS.browserGoForward();
      }
    } else {
      if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCurrentRoute(history[nextIndex].route);
        setAddressVal(history[nextIndex].url);
      }
    }
  };

  // Reload Handler
  const handleReload = () => {
    if (activeTab === 'browser' && window.auraOS) {
      window.auraOS.browserReload();
    }
  };

  // Close Browser Tab
  const handleCloseBrowserTab = () => {
    setHasActiveBrowserSession(false);
    setActiveTab('home');
    if (window.auraOS) {
      window.auraOS.setBrowserVisible(false);
    }
  };

  // Quick link navigate handler
  const handleNavigateToUrl = (url: string, _title: string) => {
    executeBrowserNavigation(url);
  };

  // Select prompt from Assistant
  const handleSelectAssistantPrompt = (prompt: string) => {
    setIntentText(prompt);
    executeBrowserNavigation(prompt);
  };

  // Sync address bar when switching tabs
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setAddressVal(`aura://${currentRoute}`);
    } else if (tab === 'browser') {
      setAddressVal(browserState.url || 'https://duckduckgo.com');
      if (!browserState.url) {
        executeBrowserNavigation('https://duckduckgo.com');
      }
    }
  };

  // Theme Studio Preview & Apply Handlers
  const handlePreviewTheme = (themeId: ThemeId) => {
    setPreviewThemeId(themeId);
  };

  const handleApplyTheme = async (themeId: ThemeId) => {
    const updatedConfigPayload: AuraConfig = {
      ...(activeConfig || {}),
      active_theme: themeId,
      study_mode_active: true
    };

    const backendRes = await applyConfig(updatedConfigPayload);
    const updatedCfg = (backendRes && backendRes.config) ? backendRes.config : updatedConfigPayload;

    setActiveConfig(updatedCfg);
    setCurrentThemeId(themeId);
    setPreviewThemeId(null);

    const themeName = THEME_OPTIONS[themeId]?.name || themeId;

    await createActivity({
      title: 'Theme Applied',
      event_type: 'system',
      status: 'Completed',
      description: `${themeName} theme applied from Aura Plan.`
    });

    setToastMessage({ text: `${themeName} theme applied successfully.` });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Pin Site Handler from Suggestive Pins
  const handlePinSiteFromSuggestions = async (siteName: string, _siteUrl: string) => {
    const currentPinned = activeConfig?.pinned_sites || ['GitHub', 'Kaggle', 'Google Scholar', 'LeetCode'];
    if (!currentPinned.includes(siteName)) {
      const updatedPinned = [...currentPinned, siteName];
      const updatedConfigPayload: AuraConfig = {
        ...(activeConfig || {}),
        pinned_sites: updatedPinned
      };

      const backendRes = await applyConfig(updatedConfigPayload);
      if (backendRes && backendRes.config) {
        setActiveConfig(backendRes.config);
      }
    }
  };

  // Plan Approval & Application Handler
  const handleApproveAndApplyPlan = async (plan: AuraPlan) => {
    const targetThemeId = 'professional-dark';
    const approvedConfigPayload: AuraConfig = {
      study_mode_active: true,
      active_theme: targetThemeId,
      theme_accent: 'blue',
      pinned_sites: ['GitHub', 'Kaggle', 'Google Scholar', 'LeetCode'],
      blocked_websites: ['instagram.com', 'facebook.com', 'x.com', 'twitter.com'],
      cricket_widget_enabled: true,
      cricket_score: 'India 184/4 — 18.2 overs',
      page_summarization: true,
      applied_plan_title: plan.title,
    };

    // 1. Save approved config to FastAPI JSON store (creates rollback snapshot)
    const backendRes = await applyConfig(approvedConfigPayload);
    const updatedCfg = (backendRes && backendRes.config) ? backendRes.config : approvedConfigPayload;

    setActiveConfig(updatedCfg);
    setCurrentThemeId(targetThemeId);
    setPreviewThemeId(null);

    // Sync rules to Electron Main Process
    if (window.auraOS) {
      window.auraOS.updateStudyModeRules({
        studyModeActive: true,
        blockedDomains: ['instagram.com', 'facebook.com', 'x.com', 'twitter.com'],
      });
    }

    // 2. Add 5 distinct activity records to SQLite database
    await createActivity({
      title: 'Professional Dark theme applied from Aura Plan.',
      event_type: 'system',
      status: 'Completed',
      description: 'Applied Professional Dark appearance theme based on user intent.',
    });

    await createActivity({
      title: 'Workspace Sites Pinned',
      event_type: 'browsing',
      status: 'Completed',
      description: 'Pinned workspace sites: GitHub, Kaggle, Google Scholar, LeetCode.',
    });

    await createActivity({
      title: 'Study Mode Activated',
      event_type: 'plans',
      status: 'Completed',
      description: 'Activated Study Mode with notification suppression and high-focus rules.',
    });

    await createActivity({
      title: 'Distraction Blocking Rules Added',
      event_type: 'system',
      status: 'Completed',
      description: 'Added domain blocking rules for: instagram.com, facebook.com, x.com, twitter.com.',
    });

    await createActivity({
      title: 'Live Cricket Scorecard Widget Pinned',
      event_type: 'plans',
      status: 'Completed',
      description: 'Enabled Cricket Widget displaying: India 184/4 — 18.2 overs.',
    });

    // 3. Display Toast Notification
    setToastMessage({ text: 'AuraOS has configured your workspace.' });
    setIsPlanModalOpen(false);

    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Rollback Configuration Handler
  const handleRollbackConfiguration = async () => {
    const res = await rollbackConfig();
    const restoredCfg = res && res.config ? res.config : {
      study_mode_active: false,
      active_theme: 'dark-navy',
      theme_accent: 'cyan',
      pinned_sites: ['Google', 'GitHub', 'YouTube', 'Notion', 'Google Scholar'],
      blocked_websites: [],
      cricket_widget_enabled: false,
      cricket_score: '',
      page_summarization: false,
      applied_plan_title: '',
    };

    setActiveConfig(restoredCfg);
    setCurrentThemeId((restoredCfg.active_theme as ThemeId) || 'dark-navy');
    setPreviewThemeId(null);

    // Sync rules to Electron Main Process
    if (window.auraOS) {
      window.auraOS.updateStudyModeRules({
        studyModeActive: !!restoredCfg.study_mode_active,
        blockedDomains: restoredCfg.blocked_websites || [],
      });
    }

    // Log SQLite Activity Record
    await createActivity({
      title: 'Previous AuraOS configuration restored',
      event_type: 'system',
      status: 'Completed',
      description: 'Restored previous snapshot configuration. Study mode, theme, widgets, and domain rules reverted.',
    });

    // Show Toast
    setToastMessage({ text: 'Previous AuraOS configuration restored.' });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Turn Off Study Mode Handler
  const handleDisableStudyMode = async () => {
    await handleRollbackConfiguration();
  };

  const effectiveThemeId = previewThemeId || currentThemeId;
  const effectiveTheme = THEME_OPTIONS[effectiveThemeId] || THEME_OPTIONS['professional-dark'];

  return (
    <div className={`flex flex-col h-screen w-screen text-slate-100 overflow-hidden font-sans select-none relative transition-colors duration-500 ${effectiveTheme.baseBg}`}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed top-16 right-6 z-50 p-4 border rounded-2xl shadow-2xl text-xs font-extrabold flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-2 duration-300 ${
          toastMessage.isError
            ? 'bg-rose-950/95 border-rose-400/50 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.4)]'
            : 'bg-blue-950/95 border-cyan-400/50 text-cyan-100 shadow-[0_0_35px_rgba(6,182,212,0.4)]'
        }`}>
          {toastMessage.isError ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-cyan-800/40 rounded-lg text-cyan-300 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preview Theme Indicator Bar */}
      {previewThemeId && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1 text-xs font-extrabold flex items-center justify-between z-50">
          <span>Previewing theme: <strong>{THEME_OPTIONS[previewThemeId]?.name}</strong> (Temporary)</span>
          <button
            onClick={() => setPreviewThemeId(null)}
            className="px-2 py-0.5 bg-slate-950 text-white rounded text-[10px] uppercase font-bold"
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* Top Navigation & Tab Bar */}
      <TopNavbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        currentRoute={currentRoute}
        onNavigate={navigateRoute}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        canGoBack={activeTab === 'browser' ? !!browserState.canGoBack : historyIndex > 0}
        canGoForward={activeTab === 'browser' ? !!browserState.canGoForward : historyIndex < history.length - 1}
        addressUrl={addressVal}
        setAddressUrl={setAddressVal}
        isLoading={activeTab === 'browser' ? !!browserState.isLoading : false}
        toggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)}
        isAssistantOpen={isAssistantOpen}
        onSearchSubmit={handleAddressSubmit}
        browserTitle={browserState.title || 'Browser Session'}
        hasActiveBrowserSession={hasActiveBrowserSession}
        onCloseBrowserTab={handleCloseBrowserTab}
      />

      {/* Main Workspace Layout Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={navigateRoute}
        />

        {/* Center Viewport Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* React Dashboard / Activity / Settings / Agent Workspace Views (Only active when activeTab === 'home') */}
          {activeTab === 'home' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {currentRoute === 'home' && (
                <DashboardPage
                  intentText={intentText}
                  setIntentText={setIntentText}
                  onNavigateToUrl={handleNavigateToUrl}
                  onOpenAssistant={() => setIsAssistantOpen(true)}
                  onOpenPlanModal={(plan) => {
                    setActivePlan(plan);
                    setIsPlanModalOpen(true);
                  }}
                  activeConfig={activeConfig}
                  onExecuteSearch={executeBrowserNavigation}
                  onPinSite={handlePinSiteFromSuggestions}
                />
              )}

              {currentRoute === 'agent-workspace' && (
                <AgentWorkspacePage
                  onOpenPlanModal={(plan) => {
                    setActivePlan(plan);
                    setIsPlanModalOpen(true);
                  }}
                  intentText={intentText}
                />
              )}

              {currentRoute === 'activity' && (
                <ActivityPage onRollback={handleRollbackConfiguration} />
              )}

              {currentRoute === 'settings' && (
                <SettingsPage
                  onPreviewTheme={handlePreviewTheme}
                  onApplyTheme={handleApplyTheme}
                  currentThemeId={currentThemeId}
                />
              )}
            </div>
          )}

          {/* Embedded Electron WebContentsView Host (Active when activeTab === 'browser') */}
          <div
            ref={browserContainerRef}
            className={`flex-1 w-full h-full relative ${
              activeTab === 'browser' ? 'block' : 'hidden'
            }`}
          >
            {/* Visual loader overlay when starting up */}
            {!browserState.url && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a12] text-slate-400 space-y-3 z-10">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-cyan-300">Initializing WebContentsView...</p>
              </div>
            )}
          </div>
        </main>

        {/* Right Assistant Side Panel */}
        <AuraAssistantPanel
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          onSelectPrompt={handleSelectAssistantPrompt}
          activeConfig={activeConfig}
          onDisableStudyMode={handleDisableStudyMode}
        />
      </div>

      {/* Aura Plan Modal Dialog */}
      <AuraPlanModal
        isOpen={isPlanModalOpen}
        plan={activePlan}
        onClose={() => setIsPlanModalOpen(false)}
        onApproveAndApply={handleApproveAndApplyPlan}
      />
    </div>
  );
};
