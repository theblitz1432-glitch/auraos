export type ThemeId = 'professional-dark' | 'focus-light' | 'midnight-violet' | 'dark-blue' | 'dark-navy';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  suggestedReason: string;
  baseBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accentBorder: string;
  accentText: string;
  swatchGradient: string;
}

export const THEME_OPTIONS: Record<ThemeId, ThemeOption> = {
  'professional-dark': {
    id: 'professional-dark',
    name: 'Professional Dark',
    description: 'Deep navy/black base with electric blue and cyan accents.',
    suggestedReason: 'Suggested for a focused, low-distraction study workspace.',
    baseBg: 'bg-gradient-to-b from-[#030712] via-[#08132b] to-[#030712]',
    cardBg: 'bg-[#0d1322]',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    accentBorder: 'border-cyan-400/40',
    accentText: 'text-cyan-300',
    swatchGradient: 'from-[#030712] via-[#08132b] to-cyan-500',
  },
  'focus-light': {
    id: 'focus-light',
    name: 'Focus Light',
    description: 'Clean white/soft grey base with crisp blue accents.',
    suggestedReason: 'High-visibility daytime theme for intensive reading.',
    baseBg: 'bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]',
    cardBg: 'bg-white',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    accentBorder: 'border-blue-500/40',
    accentText: 'text-blue-600',
    swatchGradient: 'from-white via-[#f1f5f9] to-blue-500',
  },
  'midnight-violet': {
    id: 'midnight-violet',
    name: 'Midnight Violet',
    description: 'Dark charcoal base with rich violet and purple accents.',
    suggestedReason: 'Sleek creative theme tailored for late-night research.',
    baseBg: 'bg-gradient-to-b from-[#090714] via-[#120f28] to-[#090714]',
    cardBg: 'bg-[#15112e]',
    textPrimary: 'text-purple-50',
    textSecondary: 'text-purple-200',
    accentBorder: 'border-purple-400/40',
    accentText: 'text-purple-300',
    swatchGradient: 'from-[#090714] via-[#120f28] to-purple-500',
  },
  'dark-blue': {
    id: 'dark-blue',
    name: 'Professional Dark-Blue',
    description: 'Deep dark-blue palette for Study Mode.',
    suggestedReason: 'Applied during active Study Mode.',
    baseBg: 'bg-gradient-to-b from-[#030712] via-[#08132b] to-[#030712]',
    cardBg: 'bg-[#0d1322]',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    accentBorder: 'border-cyan-400/40',
    accentText: 'text-cyan-300',
    swatchGradient: 'from-[#030712] via-[#08132b] to-cyan-500',
  },
  'dark-navy': {
    id: 'dark-navy',
    name: 'Default Dark Navy',
    description: 'Standard AuraOS dark navy aesthetic.',
    suggestedReason: 'Default baseline workspace theme.',
    baseBg: 'bg-gradient-to-b from-[#070a12] via-[#0b101d] to-[#070a12]',
    cardBg: 'bg-[#0d1322]',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    accentBorder: 'border-cyan-500/30',
    accentText: 'text-cyan-300',
    swatchGradient: 'from-[#070a12] via-[#0b101d] to-cyan-500',
  },
};
