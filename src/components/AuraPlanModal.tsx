import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  Moon, 
  BookOpen, 
  Bookmark, 
  ShieldAlert, 
  Trophy,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { AuraPlan, AuraPlanItem } from '../types/plan';

interface AuraPlanModalProps {
  isOpen: boolean;
  plan: AuraPlan | null;
  onClose: () => void;
  onApproveAndApply: (plan: AuraPlan) => void;
}

export const AuraPlanModal: React.FC<AuraPlanModalProps> = ({
  isOpen,
  plan,
  onClose,
  onApproveAndApply
}) => {
  if (!isOpen || !plan) return null;

  const renderIcon = (iconName: AuraPlanItem['iconName']) => {
    switch (iconName) {
      case 'Moon':
        return <Moon className="w-4 h-4 text-cyan-400" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      case 'Bookmark':
        return <Bookmark className="w-4 h-4 text-emerald-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'Trophy':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0b101e] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-cyan-500/20 bg-[#0d1425] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                Your Aura Plan
                <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold rounded-full">
                  {plan.isFallback ? 'Demo Mode' : 'Groq AI Live'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Synthesized by Aura Autonomous Intent Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-lg transition-colors"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clear Status Warning Banner */}
        <div className="px-5 py-2.5 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between text-amber-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Notice: No changes have been applied yet. Review the proposed configuration below.</span>
          </div>
        </div>

        {/* Small Non-Blocking Note if AI Service Fallback */}
        {plan.isFallback && (
          <div className="px-5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 text-[11px] text-cyan-300 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Using demo fallback because AI service is unavailable.</span>
          </div>
        )}

        {/* Modal Body - Plan Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-3.5 bg-[#070a12] border border-cyan-500/20 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">User Intention</span>
            <p className="text-xs text-slate-200 italic font-medium">"{plan.intent}"</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Proposed Environment Rules ({plan.items.length} Items)</span>
              <span className="text-cyan-400 font-mono text-[11px]">Ready for Approval</span>
            </h3>

            <div className="space-y-2.5">
              {plan.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-[#0d1322] border border-cyan-500/15 hover:border-cyan-400/30 rounded-xl space-y-1.5 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        {renderIcon(item.iconName)}
                      </div>
                      <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                    </div>

                    <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300 rounded uppercase">
                      {item.category}
                    </span>
                  </div>

                  <div className="pl-8 space-y-1">
                    <div className="text-xs font-semibold text-cyan-200 flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{item.proposedChange}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      <strong className="text-slate-300 font-semibold">Reason: </strong>
                      {item.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-[#0d1425] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Rollback snapshot saved before applying</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>

            <button
              onClick={() => onApproveAndApply(plan)}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 fill-slate-950 text-cyan-300" />
              <span>Approve and Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
