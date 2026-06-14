const { app, BrowserWindow, BrowserView, ipcMain, session, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-web-security')
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('allow-running-insecure-content')
app.commandLine.appendSwitch('disable-site-isolation-trials')

let mainWindow
const DATA_DIR = path.join(__dirname, '../../data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) }
  catch { return {} }
}
function writeJSON(file, data) {
  try { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2)) }
  catch(e) {}
}

let blockedDomains = []

// Track browser views per tab
let browserViews = {}      // tabId -> BrowserView
let activeViewId = null
const UI_HEIGHT = 80       // titlebar(36) + navbar(44)
const STATUS_HEIGHT = 22

function getBrowserViewBounds() {
  if (!mainWindow) return null
  const [w, h] = mainWindow.getContentSize()
  return {
    x: 0,
    y: UI_HEIGHT,
    width: w,
    height: h - UI_HEIGHT - STATUS_HEIGHT
  }
}

function createBrowserView(url, tabId) {
  const ses = session.fromPartition('persist:browser')
  
  const view = new BrowserView({
    webPreferences: {
      session: ses,
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      images: true,
      javascript: true,
    }
  })
  
  mainWindow.addBrowserView(view)
  view.setBounds(getBrowserViewBounds())
  view.setAutoResize({ width: true, height: true })
  
  browserViews[tabId] = view
  
  // Navigation events → tell frontend
  view.webContents.on('did-start-loading', () => {
    mainWindow.webContents.send('view-loading', { tabId, loading: true })
  })
  
  view.webContents.on('did-finish-load', () => {
    const url = view.webContents.getURL()
    const title = view.webContents.getTitle()
    mainWindow.webContents.send('view-loaded', { tabId, url, title })
  })
  
  view.webContents.on('did-fail-load', (e, errorCode, errorDesc, url) => {
    if (errorCode === -3) return // Aborted, normal
    mainWindow.webContents.send('view-error', { tabId, errorCode, url })
  })
  
  view.webContents.on('did-navigate', (e, url) => {
    const title = view.webContents.getTitle()
    mainWindow.webContents.send('view-navigated', { tabId, url, title })
  })
  
  view.webContents.on('did-navigate-in-page', (e, url, isMainFrame) => {
    if (isMainFrame) mainWindow.webContents.send('view-navigated', { tabId, url })
  })
  
  view.webContents.on('page-title-updated', (e, title) => {
    mainWindow.webContents.send('view-title', { tabId, title })
  })
  
  view.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    mainWindow.webContents.send('view-new-window', { url })
  })

  // Block check on navigation
  view.webContents.on('will-navigate', async (e, navUrl) => {
    let hostname = ''
    try { hostname = new URL(navUrl).hostname.toLowerCase().replace(/^www\./, '') } catch(x) {}
    if (!hostname) return
    if (navUrl.includes('google.com/search') || navUrl.includes('duckduckgo.com')) return
    const blocked = blockedDomains.some(d => {
      const domain = d.toLowerCase().replace(/^www\./, '').trim()
      return hostname === domain || hostname.endsWith('.' + domain)
    })
    if (blocked) {
      e.preventDefault()
      mainWindow.webContents.send('view-blocked', { tabId, hostname })
    }
  })
  
  view.webContents.loadURL(url)
  return view
}

function showView(tabId) {
  // Remove all views from window
  for (const [id, view] of Object.entries(browserViews)) {
    mainWindow.removeBrowserView(view)
  }
  // Show only active
  if (browserViews[tabId]) {
    mainWindow.addBrowserView(browserViews[tabId])
    browserViews[tabId].setBounds(getBrowserViewBounds())
    activeViewId = tabId
  }
}

function hideAllViews() {
  for (const view of Object.values(browserViews)) {
    mainWindow.removeBrowserView(view)
  }
  activeViewId = null
}

function destroyView(tabId) {
  if (browserViews[tabId]) {
    mainWindow.removeBrowserView(browserViews[tabId])
    browserViews[tabId].webContents.destroy()
    delete browserViews[tabId]
  }
}

function setupSession(ses) {
  ses.setPermissionRequestHandler((wc, permission, cb) => cb(true))
  ses.setPermissionCheckHandler(() => true)
  ses.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = {}
    for (const [k, v] of Object.entries(details.responseHeaders || {})) {
      const kl = k.toLowerCase()
      if (kl === 'x-frame-options' || kl === 'content-security-policy') continue
      headers[k] = v
    }
    callback({ responseHeaders: headers })
  })
}

function applyFirewall(ses) {
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    try {
      const hostname = new URL(details.url).hostname.toLowerCase().replace(/^www\./, '')
      const blocked = blockedDomains.some(d => {
        const domain = d.toLowerCase().replace(/^www\./, '').trim()
        if (!domain) return false
        return hostname === domain || hostname.endsWith('.' + domain)
      })
      callback({ cancel: blocked })
    } catch { callback({ cancel: false }) }
  })
}

function createWindow() {
  const ses = session.fromPartition('persist:browser')
  setupSession(ses)

  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 900, minHeight: 600,
    frame: false,
    backgroundColor: '#07090F',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    }
  })

  mainWindow.loadFile(path.join(__dirname, '../ui/index.html'))
  
  // Resize views when window resizes
  mainWindow.on('resize', () => {
    if (activeViewId && browserViews[activeViewId]) {
      browserViews[activeViewId].setBounds(getBrowserViewBounds())
    }
  })

  // Downloads
  ses.on('will-download', (event, item) => {
    const filename = item.getFilename()
    const url = item.getURL()
    const downloadPath = path.join(os.homedir(), 'Downloads', filename)
    item.setSavePath(downloadPath)
    mainWindow.webContents.send('download-started', { filename, url, path: downloadPath })
    item.on('updated', (e, state) => {
      if (state === 'progressing') {
        mainWindow.webContents.send('download-progress', {
          filename, url,
          progress: item.getTotalBytes() > 0 ? Math.round(item.getReceivedBytes() / item.getTotalBytes() * 100) : 0,
          size: formatBytes(item.getTotalBytes() || item.getReceivedBytes())
        })
      }
    })
    item.once('done', (e, state) => {
      const info = { filename, url, path: downloadPath, size: formatBytes(item.getTotalBytes()), status: state === 'completed' ? 'completed' : 'failed' }
      mainWindow.webContents.send('download-done', info)
      fetch('http://localhost:8000/downloads/add', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(info) }).catch(()=>{})
    })
  })

  // Load firewall
  const rules = readJSON('rules.json')
  blockedDomains = rules.blocked_domains || []
  if (blockedDomains.length > 0) applyFirewall(ses)
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const sizes = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i]
}

// ── IPC ──────────────────────────────────────────────────────
ipcMain.handle('navigate-view', async (e, tabId, url) => {
  if (browserViews[tabId]) {
    browserViews[tabId].webContents.loadURL(url)
  } else {
    createBrowserView(url, tabId)
    showView(tabId)
  }
  return { success: true }
})

ipcMain.handle('show-view', (e, tabId) => {
  showView(tabId); return { success: true }
})

ipcMain.handle('hide-views', () => {
  hideAllViews(); return { success: true }
})

ipcMain.handle('destroy-view', (e, tabId) => {
  destroyView(tabId); return { success: true }
})

ipcMain.handle('view-go-back', (e, tabId) => {
  if (browserViews[tabId]?.webContents.canGoBack()) {
    browserViews[tabId].webContents.goBack(); return { success: true }
  }
  return { success: false }
})

ipcMain.handle('view-go-forward', (e, tabId) => {
  if (browserViews[tabId]?.webContents.canGoForward()) {
    browserViews[tabId].webContents.goForward(); return { success: true }
  }
  return { success: false }
})

ipcMain.handle('view-reload', (e, tabId) => {
  browserViews[tabId]?.webContents.reload(); return { success: true }
})

ipcMain.handle('view-get-url', (e, tabId) => {
  return browserViews[tabId]?.webContents.getURL() || ''
})

ipcMain.handle('ai-command', async (e, message) => {
  try {
    const res = await fetch('http://localhost:8000/ai/command', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message}) })
    return await res.json()
  } catch { return { error: 'Backend not running.' } }
})

ipcMain.handle('execute-ai', async (e, intent, currentUrl, profileCtx, vaultCtx) => {
  try {
    const res = await fetch('http://localhost:8000/ai/execute', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ intent, current_url: currentUrl, profile_context: profileCtx, vault_context: vaultCtx })
    })
    return await res.json()
  } catch { return { success:false, plan:{ action:'reply', message:'Backend not running.' } } }
})

ipcMain.handle('automate', async (e, type, url, task) => {
  try {
    const res = await fetch(`http://localhost:8000/automate/${type}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url,task}) })
    return await res.json()
  } catch { return { success:false, error:'Backend not running.' } }
})

ipcMain.handle('backend-call', async (e, urlPath, body, method) => {
  try {
    const m = method || (body ? 'POST' : 'GET')
    const opts = { method:m, headers:{'Content-Type':'application/json'} }
    if (body && m !== 'GET' && m !== 'DELETE') opts.body = JSON.stringify(body)
    const res = await fetch(`http://localhost:8000${urlPath}`, opts)
    return await res.json()
  } catch { return { error:'Backend not running.' } }
})

ipcMain.handle('apply-plan', async (e, plan) => {
  try {
    const profile = readJSON('user_profile.json')
    Object.assign(profile, plan, { configured: true })
    writeJSON('user_profile.json', profile)
    const rules = readJSON('rules.json')
    rules.blocked_domains = plan.blocked_sites || []
    writeJSON('rules.json', rules)
    blockedDomains = rules.blocked_domains
    const ses = session.fromPartition('persist:browser')
    if (blockedDomains.length > 0) applyFirewall(ses)
    else ses.webRequest.onBeforeRequest(null)
    return { success:true }
  } catch(err) { return { error:err.message } }
})

ipcMain.handle('get-profile', () => readJSON('user_profile.json'))

ipcMain.handle('check-blocked', (e, url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    const blocked = blockedDomains.some(d => {
      const domain = d.toLowerCase().replace(/^www\./, '').trim()
      if (!domain) return false
      return hostname === domain || hostname.endsWith('.' + domain)
    })
    return { blocked, domain: hostname }
  } catch { return { blocked:false } }
})

ipcMain.handle('open-file', async (e, filePath) => {
  try { await shell.openPath(filePath); return { success:true } } catch(err) { return { success:false, error:err.message } }
})

ipcMain.handle('show-in-folder', (e, filePath) => {
  shell.showItemInFolder(filePath); return { success:true }
})

ipcMain.on('minimize-window', () => mainWindow.minimize())
ipcMain.on('maximize-window', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
ipcMain.on('close-window', () => mainWindow.close())

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })