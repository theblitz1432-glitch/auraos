export interface AuraPlanItem {
  id: string;
  category: 'theme' | 'mode' | 'bookmarks' | 'security' | 'widget' | 'ai';
  title: string;
  proposedChange: string;
  reason: string;
  iconName: 'Moon' | 'BookOpen' | 'Bookmark' | 'ShieldAlert' | 'Trophy' | 'Sparkles';
}

export interface AuraPlan {
  id: string;
  intent: string;
  title: string;
  summary: string;
  createdAt: string;
  items: AuraPlanItem[];
  isFallback?: boolean;
  fallbackNote?: string | null;
}
