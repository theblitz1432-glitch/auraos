import React from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Home, 
  Lock, 
  Sparkles, 
  X, 
  Globe, 
  Loader2,
  Search
} from 'lucide-react';
import { RouteType } from '../App';

export type ActiveTab = 'home' | 'browser';

interface TopNavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentRoute: RouteType;
  onNavigate: (route: RouteType) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  addressUrl: string;
  setAddressUrl: (url: string) => void;
  isLoading: boolean;
  toggleAssistant: () => void;
  isAssistantOpen: boolean;
  onSearchSubmit: (input: string) => void;
  browserTitle: string;
  hasActiveBrowserSession: boolean;
  onCloseBrowserTab: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onSelectTab,
  currentRoute,
  onNavigate,
  onBack,
  onForward,
  onReload,
  canGoBack,
  canGoForward,
  addressUrl,
  setAddressUrl,
  isLoading,
  toggleAssistant,
  isAssistantOpen,
  onSearchSubmit,
  browserTitle,
  hasActiveBrowserSession,
  onCloseBrowserTab,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(addressUrl);
  };

  return (
    <header className="h-14 bg-[#090e1c] border-b border-cyan-500/20 flex items-center justify-between px-3 select-none z-30 shrink-0 shadow-lg">
      {/* Left Navigation Controls & Brand */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 pr-2 border-r border-cyan-500/15">
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className={`p-1.5 rounded-lg transition-colors ${
              canGoBack 
                ? 'text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-200' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onForward}
            disabled={!canGoForward}
            className={`p-1.5 rounded-lg transition-colors ${
              canGoForward 
                ? 'text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-200' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Go Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onReload}
            className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-200 rounded-lg transition-colors"
            title="Reload Page"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Tab System Controls */}
        <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-cyan-500/15">
          <button
            onClick={() => {
              onSelectTab('home');
              onNavigate(currentRoute || 'home');
            }}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'home'
                ? 'bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/10'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>AuraOS Home</span>
          </button>

          {hasActiveBrowserSession && (
            <div className="flex items-center">
              <button
                onClick={() => onSelectTab('browser')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all max-w-44 truncate ${
                  activeTab === 'browser'
                    ? 'bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/10'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{browserTitle || 'Browser Session'}</span>
              </button>

              <button
                onClick={onCloseBrowserTab}
                className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors ml-0.5"
                title="Close Browser Session"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Address & Search Bar */}
      <div className="flex-1 max-w-2xl mx-4">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none text-cyan-400">
            {addressUrl.startsWith('aura://') ? (
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Search className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </div>

          <input
            type="text"
            value={addressUrl}
            onChange={(e) => setAddressUrl(e.target.value)}
            placeholder="Type URL (e.g. github.com) or search plain text..."
            className="w-full pl-9 pr-24 py-1.5 bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
          />

          {/* Dedicated Search Button */}
          <button
            type="submit"
            className="absolute right-1 px-3 py-1 bg-cyan-500/25 hover:bg-cyan-400 text-cyan-200 hover:text-slate-950 font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5 border border-cyan-400/40 shadow-md"
            title="Search or Navigate URL"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleAssistant}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            isAssistantOpen
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
              : 'bg-[#050811] border-cyan-500/20 text-slate-300 hover:text-cyan-300'
          }`}
          title="Toggle Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Assistant</span>
        </button>
      </div>
    </header>
  );
};
