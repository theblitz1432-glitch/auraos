

export interface SuggestedPin {
  id: string;
  name: string;
  url: string;
  reason: string;
  iconName: string;
  category: string;
  isBehavioral?: boolean;
}

export const INITIAL_SUGGESTIONS: SuggestedPin[] = [
  {
    id: 'sug-kaggle',
    name: 'Kaggle',
    url: 'https://kaggle.com',
    reason: 'Recommended for data science datasets and competitions.',
    iconName: 'Layers',
    category: 'Data Science'
  },
  {
    id: 'sug-scholar',
    name: 'Google Scholar',
    url: 'https://scholar.google.com',
    reason: 'Recommended for research papers and study.',
    iconName: 'GraduationCap',
    category: 'Research'
  },
  {
    id: 'sug-leetcode',
    name: 'LeetCode',
    url: 'https://leetcode.com',
    reason: 'Recommended for technical practice.',
    iconName: 'Terminal',
    category: 'Coding'
  },
  {
    id: 'sug-cricinfo',
    name: 'ESPNcricinfo',
    url: 'https://espncricinfo.com',
    reason: 'Recommended because you enjoy cricket.',
    iconName: 'Trophy',
    category: 'Sports'
  },
  {
    id: 'sug-techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com',
    reason: 'Recommended because you are interested in technology.',
    iconName: 'Cpu',
    category: 'Tech News'
  }
];

const PINNED_STORAGE_KEY = 'auraos_pinned_sites';
const DISMISSED_STORAGE_KEY = 'auraos_dismissed_suggestions';
const VISITS_STORAGE_KEY = 'auraos_local_visits';
const BEHAVIORAL_OPTIN_KEY = 'auraos_behavioral_optin';

export function getBehavioralOptIn(): boolean {
  try {
    return localStorage.getItem(BEHAVIORAL_OPTIN_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function setBehavioralOptIn(val: boolean) {
  try {
    localStorage.setItem(BEHAVIORAL_OPTIN_KEY, val ? 'true' : 'false');
  } catch (e) {}
}

export function getPinnedSitesFromStorage(): string[] {
  try {
    const saved = localStorage.getItem(PINNED_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export function getDismissedSuggestionsFromStorage(): string[] {
  try {
    const saved = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export function savePinnedSiteToStorage(siteName: string) {
  const current = getPinnedSitesFromStorage();
  if (!current.includes(siteName)) {
    const updated = [...current, siteName];
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(updated));
  }
}

export function saveDismissedSuggestionToStorage(id: string) {
  const current = getDismissedSuggestionsFromStorage();
  if (!current.includes(id)) {
    const updated = [...current, id];
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(updated));
  }
}

export function recordLocalVisit(url: string) {
  if (!getBehavioralOptIn()) return;
  try {
    const raw = localStorage.getItem(VISITS_STORAGE_KEY);
    const visits: Record<string, number> = raw ? JSON.parse(raw) : {};
    visits[url] = (visits[url] || 0) + 1;
    localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
  } catch (e) {}
}

export function getAvailableSuggestions(): SuggestedPin[] {
  const dismissed = getDismissedSuggestionsFromStorage();
  const pinned = getPinnedSitesFromStorage();

  const activeIntentSuggestions = INITIAL_SUGGESTIONS.filter(
    s => !dismissed.includes(s.id) && !pinned.includes(s.name)
  );

  // If behavioral opt-in is enabled, check local visit counts
  if (getBehavioralOptIn()) {
    try {
      const raw = localStorage.getItem(VISITS_STORAGE_KEY);
      const visits: Record<string, number> = raw ? JSON.parse(raw) : {};
      
      if (visits['https://github.com'] && visits['https://github.com'] >= 2 && !pinned.includes('GitHub') && !dismissed.includes('sug-github-freq')) {
        activeIntentSuggestions.unshift({
          id: 'sug-github-freq',
          name: 'GitHub',
          url: 'https://github.com',
          reason: 'You visit GitHub frequently. Pin it to your dashboard?',
          iconName: 'Code',
          category: 'Behavioral Suggestion',
          isBehavioral: true
        });
      }
    } catch (e) {}
  }

  return activeIntentSuggestions;
}
