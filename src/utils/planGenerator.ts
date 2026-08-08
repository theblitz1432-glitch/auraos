import { AuraPlan, AuraPlanItem } from '../types/plan';

export function generateAuraPlan(intentInput: string): AuraPlan {
  const trimmed = intentInput.trim();
  const lower = trimmed.toLowerCase();

  const isDemo = lower.includes('cricket') || lower.includes('data science') || lower.includes('distraction');

  const items: AuraPlanItem[] = [
    {
      id: 'item-theme',
      category: 'theme',
      title: 'Professional Dark Theme',
      proposedChange: 'Set UI Accent to Electric Cyan & High-Contrast Dark Navy',
      reason: 'Complements premium technology preferences and reduces visual fatigue during extended coding sessions.',
      iconName: 'Moon',
    },
    {
      id: 'item-mode',
      category: 'mode',
      title: 'Study & Focus Mode Enabled',
      proposedChange: 'Enable Study Mode with Notification Suppression',
      reason: 'Creates an uninterrupted environment optimized for data science coursework and complex problem solving.',
      iconName: 'BookOpen',
    },
    {
      id: 'item-bookmarks',
      category: 'bookmarks',
      title: 'Pinned Workspace Quick Links',
      proposedChange: 'Pin GitHub, Kaggle, Google Scholar & LeetCode to Speed Dial',
      reason: 'Provides 1-click access to data science repositories, ML datasets, research papers, and coding benchmarks.',
      iconName: 'Bookmark',
    },
    {
      id: 'item-blocked',
      category: 'security',
      title: 'Distraction Domain Blocklist',
      proposedChange: 'Block instagram.com, facebook.com, x.com & twitter.com',
      reason: 'Enforces strict focus boundaries by preventing access to high-distraction social feeds during active study hours.',
      iconName: 'ShieldAlert',
    },
    {
      id: 'item-widget',
      category: 'widget',
      title: 'Live Cricket Score Widget',
      proposedChange: 'Pin Live Match Scorecard to Aura Assistant Side Panel',
      reason: 'Delivers real-time score updates directly inside the OS shell without needing distracting external browser tabs.',
      iconName: 'Trophy',
    },
    {
      id: 'item-ai',
      category: 'ai',
      title: 'AI Page & Research Summarizer',
      proposedChange: 'Enable Automatic Article & Research Paper Summarization',
      reason: 'Instantly distills complex machine learning papers and documentation into key takeaways.',
      iconName: 'Sparkles',
    },
  ];

  return {
    id: `plan-${Date.now()}`,
    intent: trimmed || 'Custom Productivity & Focus Intent',
    title: isDemo ? 'Tailored Data Science & High-Focus Environment Plan' : 'Personalized Intent Execution Plan',
    summary: 'Aura Autonomous Engine synthesized 6 rules to optimize focus, integrate live sports updates, and pin data science workspace tools.',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items,
  };
}
