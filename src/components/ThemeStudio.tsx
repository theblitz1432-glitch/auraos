import React, { useState } from 'react';
import { 
  Palette, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle
} from 'lucide-react';
import { ThemeId, THEME_OPTIONS, ThemeOption } from '../types/theme';

interface ThemeStudioProps {
  currentThemeId: ThemeId;
  onPreviewTheme: (themeId: ThemeId) => void;
  onApplyTheme: (themeId: ThemeId) => Promise<void>;
  suggestedThemeId?: ThemeId;
}

export const ThemeStudio: React.FC<ThemeStudioProps> = ({
  currentThemeId,
  onPreviewTheme,
  onApplyTheme,
  suggestedThemeId = 'professional-dark'
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>(currentThemeId);
  const [confirmTheme, setConfirmTheme] = useState<ThemeOption | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const availableThemes: ThemeOption[] = [
    THEME_OPTIONS['professional-dark'],
    THEME_OPTIONS['focus-light'],
    THEME_OPTIONS['midnight-violet'],
  ];

  const handlePreview = (theme: ThemeOption) => {
    setSelectedThemeId(theme.id);
    onPreviewTheme(theme.id);
  };

  const handleConfirmClick = (theme: ThemeOption) => {
    setConfirmTheme(theme);
  };

  const handleExecuteApply = async () => {
    if (!confirmTheme) return;
    setIsApplying(true);
    await onApplyTheme(confirmTheme.id);
    setSelectedThemeId(confirmTheme.id);
    setIsApplying(false);
    setConfirmTheme(null);
  };

  return (
    <div className="p-6 bg-[#0d1322] border border-cyan-500/30 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/15 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
              Theme Studio
              <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold rounded">
                Live Swatches
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Customize appearance themes with instant live preview and permanent persistence
            </p>
          </div>
        </div>

        {/* Active Theme Badge */}
        <div className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active: {THEME_OPTIONS[currentThemeId]?.name || 'Dark Navy'}</span>
        </div>
      </div>

      {/* Suggested Theme Banner */}
      {suggestedThemeId && (
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-cyan-950/80 border border-cyan-400/40 rounded-xl flex items-center justify-between text-xs text-cyan-100">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-300 shrink-0 animate-pulse" />
            <div>
              <span className="font-extrabold text-cyan-200 uppercase tracking-wider text-[10px] block">
                Aura Plan Intent Suggestion
              </span>
              <span>
                "{THEME_OPTIONS[suggestedThemeId]?.name}": {THEME_OPTIONS[suggestedThemeId]?.suggestedReason}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleConfirmClick(THEME_OPTIONS[suggestedThemeId])}
            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-lg text-xs transition-all shrink-0 ml-2"
          >
            Apply Suggested
          </button>
        </div>
      )}

      {/* Theme Swatch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {availableThemes.map((theme) => {
          const isSelected = selectedThemeId === theme.id;
          const isCurrentlyActive = currentThemeId === theme.id;
          const isSuggested = suggestedThemeId === theme.id;

          return (
            <div
              key={theme.id}
              className={`p-4 rounded-2xl border transition-all space-y-3.5 flex flex-col justify-between shadow-lg relative ${
                isSelected
                  ? 'bg-[#0f172a] border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                  : 'bg-[#070a12] border-cyan-500/15 hover:border-cyan-500/30'
              }`}
            >
              {/* Top Card Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-100">{theme.name}</h3>
                    {isSuggested && (
                      <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[9px] font-bold rounded">
                        Suggested
                      </span>
                    )}
                  </div>
                  {isCurrentlyActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  {theme.description}
                </p>
              </div>

              {/* Visual Swatch Preview Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Palette Swatch</span>
                <div className="h-12 rounded-xl border border-cyan-500/20 p-2 flex items-center justify-between bg-gradient-to-r shadow-inner ${theme.swatchGradient}">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700"></div>
                    <div className="w-5 h-5 rounded-md bg-cyan-400 border border-cyan-300"></div>
                    <div className="w-5 h-5 rounded-md bg-blue-600 border border-blue-500"></div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 font-bold px-1.5 py-0.5 bg-black/40 rounded">
                    {theme.id}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-cyan-500/10">
                <button
                  onClick={() => handlePreview(theme)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => handleConfirmClick(theme)}
                  className="flex-1 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 fill-cyan-300" />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog Overlay */}
      {confirmTheme && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0b101e] border border-cyan-400/40 rounded-2xl p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-cyan-300 font-extrabold text-base border-b border-cyan-500/20 pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Confirm Theme Application</span>
            </div>

            <p className="text-slate-200 leading-relaxed font-medium">
              Are you sure you want to permanently apply <strong className="text-cyan-300 font-bold">{confirmTheme.name}</strong>?
            </p>

            <div className="p-3 bg-[#070a12] border border-cyan-500/20 rounded-xl space-y-1 text-[11px] text-slate-400">
              <div>• Save preference to FastAPI backend store</div>
              <div>• Persist configuration across application reloads</div>
              <div>• Add event to SQLite Activity Timeline</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmTheme(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteApply}
                disabled={isApplying}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-xl shadow-lg flex items-center gap-2"
              >
                {isApplying ? (
                  <span>Applying Theme...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950 fill-cyan-300" />
                    <span>Confirm & Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
