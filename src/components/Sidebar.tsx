import React from 'react';
import { 
  Home, 
  Activity, 
  Settings, 
  Sparkles, 
  ShieldCheck, 
  Workflow
} from 'lucide-react';
import { RouteType } from '../App';

interface SidebarProps {
  currentRoute: RouteType;
  onNavigate: (route: RouteType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate }) => {
  const navItems: { id: RouteType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'agent-workspace', label: 'Agent Workspace', icon: Workflow },
    { id: 'activity', label: 'Activity & Logs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-[#090e1c]/90 border-r border-cyan-500/20 flex flex-col justify-between p-4 select-none z-20 shrink-0 shadow-2xl backdrop-blur-xl">
      <div className="space-y-6">
        {/* Workspace Profile Header */}
        <div className="p-3 bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border border-cyan-500/30 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-slate-100 truncate">Aura Workspace</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online • Local</span>
            </div>
          </div>
        </div>

        {/* Primary Navigation Options */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-400/40 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security Status Badge Footer */}
      <div className="p-3 bg-[#0d1425] border border-cyan-500/15 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Core Security
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">v1.0.0</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          IPC Sandbox Enabled • Local SQLite Store
        </p>
      </div>
    </aside>
  );
};
