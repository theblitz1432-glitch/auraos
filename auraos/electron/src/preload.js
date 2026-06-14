const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('aura', {
  aiCommand:    (msg)                        => ipcRenderer.invoke('ai-command', msg),
  aiChat:       (msg)                        => ipcRenderer.invoke('ai-chat', msg),
  executeAI:    (intent, url, profile, vault)=> ipcRenderer.invoke('execute-ai', intent, url, profile, vault),
  automate:     (type, url, task)            => ipcRenderer.invoke('automate', type, url, task),
  applyPlan:    (plan)                       => ipcRenderer.invoke('apply-plan', plan),
  getProfile:   ()                           => ipcRenderer.invoke('get-profile'),
  checkBlocked: (url)                        => ipcRenderer.invoke('check-blocked', url),
  backend:      (path, body, method)         => ipcRenderer.invoke('backend-call', path, body, method),
  openFile:     (path)                       => ipcRenderer.invoke('open-file', path),
  showInFolder: (path)                       => ipcRenderer.invoke('show-in-folder', path),
  minimize:     ()                           => ipcRenderer.send('minimize-window'),
  maximize:     ()                           => ipcRenderer.send('maximize-window'),
  close:        ()                           => ipcRenderer.send('close-window'),
  onDownloadStarted:  (cb) => ipcRenderer.on('download-started',  (e, data) => cb(data)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (e, data) => cb(data)),
  onDownloadDone:     (cb) => ipcRenderer.on('download-done',     (e, data) => cb(data)),
})