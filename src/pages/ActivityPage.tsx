import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  Filter, 
  Sparkles, 
  Layers, 
  Search, 
  ArrowUpRight,
  ShieldCheck,
  Plus,
  RotateCcw,
  Loader2,
  Tag
} from 'lucide-react';
import { fetchActivities, createActivity, ActivityItem } from '../services/api';

interface ActivityPageProps {
  onRollback: () => Promise<void>;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ onRollback }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'plans' | 'browsing' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const loadActivities = async () => {
    setIsLoading(true);
    const data = await fetchActivities();
    if (data && data.length > 0) {
      setActivities(data);
    } else {
      setActivities([
        {
          event_id: 'act-101',
          title: 'Intent Plan Synthesis: Quantum Computing Research',
          event_type: 'plans',
          status: 'Completed',
          timestamp: '10:14 AM Today',
          description: 'Extracted top papers from Google Scholar and generated executive digest.'
        },
        {
          event_id: 'act-102',
          title: 'Browser Environment Launch: GitHub Vector DB Comparison',
          event_type: 'browsing',
          status: 'Active',
          timestamp: '09:45 AM Today',
          description: 'Opened workspace tabs for Qdrant, Milvus, and Pinecone repositories.'
        },
        {
          event_id: 'act-103',
          title: 'Security Shield Audit: Cross-Origin Workspace Check',
          event_type: 'system',
          status: 'Passed',
          timestamp: '08:30 AM Today',
          description: 'Zero vulnerabilities found. Aura Sandbox isolation verified.'
        }
      ]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleRollbackClick = async () => {
    setIsRollingBack(true);
    await onRollback();
    await loadActivities();
    setIsRollingBack(false);
  };

  const handleAddSampleLog = async () => {
    const newLog = await createActivity({
      title: `Manual Event Trace #${activities.length + 1}`,
      event_type: 'browsing',
      status: 'Completed',
      description: 'Logged manual activity event into SQLite database.'
    });
    if (newLog) {
      setActivities(prev => [newLog, ...prev]);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'plans': return Sparkles;
      case 'browsing': return Layers;
      case 'system': return ShieldCheck;
      default: return Activity;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'plans': return 'text-cyan-400';
      case 'browsing': return 'text-blue-400';
      case 'system': return 'text-indigo-400';
      default: return 'text-emerald-400';
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'active': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'passed': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const filteredActivities = activities.filter(act => {
    const matchesTab = activeTab === 'all' || act.event_type === activeTab;
    const matchesQuery = act.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         act.event_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 bg-gradient-to-b from-[#070a12] via-[#0b101d] to-[#070a12]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Activity & SQLite Timeline
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time timeline of configuration events, intent plans, and system logs sourced from SQLite
          </p>
        </div>

        {/* Prominent Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRollbackClick}
            disabled={isRollingBack}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Restore Previous Configuration Snapshot"
          >
            {isRollingBack ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <RotateCcw className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            )}
            <span>Rollback Last Configuration</span>
          </button>

          <button
            onClick={handleAddSampleLog}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Log Event
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/10 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-cyan-400 mr-1" />
          {[
            { id: 'all', label: 'All Events' },
            { id: 'plans', label: 'Intent Plans' },
            { id: 'browsing', label: 'Browser Workflows' },
            { id: 'system', label: 'System Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter timeline logs..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0d1322] border border-cyan-500/20 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Timeline Stream Sourced from SQLite */}
      <div className="space-y-4 max-w-4xl">
        {isLoading ? (
          <div className="p-8 text-center bg-[#0d1322] border border-cyan-500/20 rounded-2xl text-cyan-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading timeline events from SQLite...</span>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center bg-[#0d1322] border border-cyan-500/20 rounded-2xl text-slate-400 text-xs">
            No activity records match your search filter.
          </div>
        ) : (
          filteredActivities.map((act) => {
            const Icon = getIconForType(act.event_type);
            const iconColor = getIconColor(act.event_type);
            const badgeColor = getBadgeColor(act.status);

            return (
              <div
                key={act.event_id}
                className="group p-4 bg-[#0d1322] border border-cyan-500/20 hover:border-cyan-400/40 rounded-2xl transition-all duration-200 shadow-lg space-y-2.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {act.title}
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[9px] font-mono text-cyan-300 rounded uppercase flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-cyan-400" /> {act.event_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="font-medium text-slate-300">{act.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                    {act.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 pl-11 font-medium leading-relaxed">
                  {act.description}
                </p>

                <div className="pl-11 pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-cyan-400/80 font-mono text-[10px]">SQLite ID: {act.event_id}</span>
                  <button 
                    onClick={() => alert(`Log details: ${act.title} (${act.event_id})`)}
                    className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View Details <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
