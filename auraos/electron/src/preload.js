const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('aura', {
  // View management (replaces webview)
  navigateView:  (tabId, url)           => ipcRenderer.invoke('navigate-view', tabId, url),
  showView:      (tabId)                => ipcRenderer.invoke('show-view', tabId),
  hideViews:     ()                     => ipcRenderer.invoke('hide-views'),
  destroyView:   (tabId)                => ipcRenderer.invoke('destroy-view', tabId),
  viewGoBack:    (tabId)                => ipcRenderer.invoke('view-go-back', tabId),
  viewGoForward: (tabId)                => ipcRenderer.invoke('view-go-forward', tabId),
  viewReload:    (tabId)                => ipcRenderer.invoke('view-reload', tabId),
  viewGetUrl:    (tabId)                => ipcRenderer.invoke('view-get-url', tabId),

  // View events from main process
  onViewLoading:   (cb) => ipcRenderer.on('view-loading',    (e, d) => cb(d)),
  onViewLoaded:    (cb) => ipcRenderer.on('view-loaded',     (e, d) => cb(d)),
  onViewError:     (cb) => ipcRenderer.on('view-error',      (e, d) => cb(d)),
  onViewNavigated: (cb) => ipcRenderer.on('view-navigated',  (e, d) => cb(d)),
  onViewTitle:     (cb) => ipcRenderer.on('view-title',      (e, d) => cb(d)),
  onViewBlocked:   (cb) => ipcRenderer.on('view-blocked',    (e, d) => cb(d)),
  onViewNewWindow: (cb) => ipcRenderer.on('view-new-window', (e, d) => cb(d)),

  // AI
  aiCommand:    (msg)                         => ipcRenderer.invoke('ai-command', msg),
  executeAI:    (intent, url, profile, vault) => ipcRenderer.invoke('execute-ai', intent, url, profile, vault),
  automate:     (type, url, task)             => ipcRenderer.invoke('automate', type, url, task),
  applyPlan:    (plan)                        => ipcRenderer.invoke('apply-plan', plan),
  getProfile:   ()                            => ipcRenderer.invoke('get-profile'),
  checkBlocked: (url)                         => ipcRenderer.invoke('check-blocked', url),
  backend:      (path, body, method)          => ipcRenderer.invoke('backend-call', path, body, method),
  openFile:     (path)                        => ipcRenderer.invoke('open-file', path),
  showInFolder: (path)                        => ipcRenderer.invoke('show-in-folder', path),
  minimize:     ()                            => ipcRenderer.send('minimize-window'),
  maximize:     ()                            => ipcRenderer.send('maximize-window'),
  close:        ()                            => ipcRenderer.send('close-window'),

  // Downloads
  onDownloadStarted:  (cb) => ipcRenderer.on('download-started',  (e, d) => cb(d)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (e, d) => cb(d)),
  onDownloadDone:     (cb) => ipcRenderer.on('download-done',     (e, d) => cb(d)),
})