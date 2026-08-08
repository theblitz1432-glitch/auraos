import { contextBridge, ipcRenderer } from 'electron';

export interface SystemInfo {
  version: string;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
}

export interface BrowserState {
  url?: string;
  title?: string;
  isLoading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  visible?: boolean;
}

export interface StudyModeRules {
  studyModeActive: boolean;
  blockedDomains: string[];
}

export interface ExtractedPageText {
  title: string;
  url: string;
  text: string;
}

export interface AuraAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  getSystemInfo: () => Promise<SystemInfo>;
  // Browser View APIs
  navigateBrowser: (url: string) => Promise<void>;
  browserGoBack: () => Promise<void>;
  browserGoForward: () => Promise<void>;
  browserReload: () => Promise<void>;
  setBrowserBounds: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
  setBrowserVisible: (visible: boolean) => Promise<void>;
  onBrowserStateChange: (callback: (state: BrowserState) => void) => () => void;
  // Domain Blocking Rules API
  updateStudyModeRules: (rules: StudyModeRules) => Promise<void>;
  // WebContents Text Extraction
  extractBrowserText: () => Promise<ExtractedPageText>;
}

const auraAPI: AuraAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  getSystemInfo: () => ipcRenderer.invoke('system:get-info'),

  navigateBrowser: (url: string) => ipcRenderer.invoke('browser:navigate', url),
  browserGoBack: () => ipcRenderer.invoke('browser:go-back'),
  browserGoForward: () => ipcRenderer.invoke('browser:go-forward'),
  browserReload: () => ipcRenderer.invoke('browser:reload'),
  setBrowserBounds: (bounds) => ipcRenderer.invoke('browser:set-bounds', bounds),
  setBrowserVisible: (visible) => ipcRenderer.invoke('browser:set-visible', visible),

  onBrowserStateChange: (callback) => {
    const handler = (_: any, state: BrowserState) => callback(state);
    ipcRenderer.on('browser:state-changed', handler);
    return () => {
      ipcRenderer.removeListener('browser:state-changed', handler);
    };
  },

  updateStudyModeRules: (rules) => ipcRenderer.invoke('browser:update-study-rules', rules),
  extractBrowserText: () => ipcRenderer.invoke('browser:extract-text'),
};

contextBridge.exposeInMainWorld('auraOS', auraAPI);
