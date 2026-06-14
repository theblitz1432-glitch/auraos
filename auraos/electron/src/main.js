const { app, BrowserWindow, ipcMain, session, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

let mainWindow
const DATA_DIR = path.join(__dirname, '../../data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) }
  catch { return {} }
}
function writeJSON(file, data) {
  try { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2)) }
  catch(e) { console.error('writeJSON error:', e) }
}

let blockedDomains = []

function applyFirewall(ses) {
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    try {
      const hostname = new URL(details.url).hostname.toLowerCase()
      const blocked = blockedDomains.some(d => {
        const domain = d.toLowerCase().replace(/^www\./, '').trim()
        if (!domain) return false
        const host = hostname.replace(/^www\./, '')
        return host === domain || host.endsWith('.' + domain)
      })
      callback({ cancel: blocked })
    } catch { callback({ cancel: false }) }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 900, minHeight: 600,
    frame: false,
    backgroundColor: '#07090F',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
    }
  })

  mainWindow.loadFile(path.join(__dirname, '../ui/index.html'))

  // ── Configure the persist:main session used by webviews ──
  const webviewSession = session.fromPartition('persist:main')
  
  // Allow all permissions in webviews
  webviewSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  // Fix mixed content, allow all protocols
  webviewSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    // Remove restrictive headers that block content
    delete headers['x-frame-options']
    delete headers['X-Frame-Options']
    delete headers['content-security-policy']
    delete headers['Content-Security-Policy']
    callback({ responseHeaders: headers })
  })

  // Load firewall rules
  const rules = readJSON('rules.json')
  blockedDomains = rules.blocked_domains || []
  if (blockedDomains.length > 0) applyFirewall(webviewSession)

  // ── Download handler ──
  webviewSession.on('will-download', (event, item) => {
    const filename = item.getFilename()
    const url = item.getURL()
    const downloadPath = path.join(os.homedir(), 'Downloads', filename)
    item.setSavePath(downloadPath)

    mainWindow.webContents.send('download-started', { filename, url, path: downloadPath, status: 'downloading', size: 'Downloading...' })

    item.on('updated', (e, state) => {
      if (state === 'progressing') {
        const received = item.getReceivedBytes()
        const total = item.getTotalBytes()
        const progress = total > 0 ? Math.round((received / total) * 100) : 0
        mainWindow.webContents.send('download-progress', { filename, progress, size: formatBytes(total || received), url })
      }
    })

    item.once('done', (e, state) => {
      const finalInfo = {
        filename, url,
        path: downloadPath,
        size: formatBytes(item.getTotalBytes()),
        status: state === 'completed' ? 'completed' : 'failed'
      }
      mainWindow.webContents.send('download-done', finalInfo)
      fetch('http://localhost:8000/downloads/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, filename, size: finalInfo.size, status: finalInfo.status })
      }).catch(() => {})
    })
  })

  // Also handle downloads from the main session
  mainWindow.webContents.session.on('will-download', (event, item) => {
    const filename = item.getFilename()
    const downloadPath = path.join(os.homedir(), 'Downloads', filename)
    item.setSavePath(downloadPath)
  })
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i]
}

// ── IPC ──────────────────────────────────────────────────────
ipcMain.handle('ai-command', async (e, message) => {
  try {
    const res = await fetch('http://localhost:8000/ai/command', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message}) })
    return await res.json()
  } catch { return { error: 'Backend not running.' } }
})

ipcMain.handle('execute-ai', async (e, intent, currentUrl, profileCtx, vaultCtx) => {
  try {
    const res = await fetch('http://localhost:8000/ai/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, current_url: currentUrl, profile_context: profileCtx, vault_context: vaultCtx })
    })
    return await res.json()
  } catch { return { success: false, plan: { action: 'reply', message: 'Backend not running.' } } }
})

ipcMain.handle('automate', async (e, type, url, task) => {
  try {
    const res = await fetch(`http://localhost:8000/automate/${type}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url,task}) })
    return await res.json()
  } catch { return { success: false, error: 'Backend not running.' } }
})

ipcMain.handle('backend-call', async (e, urlPath, body, method) => {
  try {
    const m = method || (body ? 'POST' : 'GET')
    const opts = { method: m, headers: { 'Content-Type': 'application/json' } }
    if (body && m !== 'GET' && m !== 'DELETE') opts.body = JSON.stringify(body)
    const res = await fetch(`http://localhost:8000${urlPath}`, opts)
    return await res.json()
  } catch { return { error: 'Backend not running.' } }
})

ipcMain.handle('apply-plan', async (e, plan) => {
  try {
    const profile = readJSON('user_profile.json')
    Object.assign(profile, plan, { configured: true })
    writeJSON('user_profile.json', profile)
    const rules = readJSON('rules.json')
    rules.blocked_domains = plan.blocked_sites || []
    rules.allowed_domains = plan.allowed_sites || []
    writeJSON('rules.json', rules)
    blockedDomains = rules.blocked_domains
    const webviewSession = session.fromPartition('persist:main')
    if (blockedDomains.length > 0) {
      applyFirewall(webviewSession)
    } else {
      webviewSession.webRequest.onBeforeRequest(null)
    }
    return { success: true }
  } catch(e) { return { error: e.message } }
})

ipcMain.handle('get-profile', () => readJSON('user_profile.json'))

ipcMain.handle('check-blocked', (e, url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const blocked = blockedDomains.some(d => {
      const domain = d.toLowerCase().replace(/^www\./, '').trim()
      if (!domain) return false
      const host = hostname.replace(/^www\./, '')
      return host === domain || host.endsWith('.' + domain)
    })
    return { blocked, domain: hostname }
  } catch { return { blocked: false } }
})

ipcMain.handle('open-file', async (e, filePath) => {
  try { await shell.openPath(filePath); return { success: true } }
  catch(err) { return { success: false, error: err.message } }
})

ipcMain.handle('show-in-folder', async (e, filePath) => {
  shell.showItemInFolder(filePath); return { success: true }
})

ipcMain.on('minimize-window', () => mainWindow.minimize())
ipcMain.on('maximize-window', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
ipcMain.on('close-window', () => mainWindow.close())

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })