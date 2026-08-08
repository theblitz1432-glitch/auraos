import { app, BrowserWindow, WebContentsView, ipcMain, session } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

let mainWindow: BrowserWindow | null = null;
let browserView: WebContentsView | null = null;
let pythonBackendProcess: ChildProcess | null = null;
let isBrowserVisible = false;
let currentBounds = { x: 0, y: 0, width: 0, height: 0 };

// Domain Blocking Rules state
let isStudyModeActive = false;
let blockedDomains: string[] = ['instagram.com', 'facebook.com', 'x.com', 'twitter.com'];
let temporarilyAllowedDomains: Set<string> = new Set();

function startBackendProcess() {
  const backendScript = path.join(app.getAppPath(), 'backend', 'main.py');
  console.log('Starting Python FastAPI backend process:', backendScript);

  pythonBackendProcess = spawn('python', [backendScript], {
    cwd: path.join(app.getAppPath(), 'backend'),
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  pythonBackendProcess.on('error', (err) => {
    console.error('Failed to start Python backend process:', err);
  });

  pythonBackendProcess.on('exit', (code, signal) => {
    console.log(`Python backend process exited with code ${code}, signal ${signal}`);
    pythonBackendProcess = null;
  });
}

function stopBackendProcess() {
  if (pythonBackendProcess) {
    console.log('Stopping Python FastAPI backend process...');
    try {
      pythonBackendProcess.kill();
    } catch (e) {
      console.error('Error killing Python process:', e);
    }
    pythonBackendProcess = null;
  }
}

function parseUrlOrSearch(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'https://duckduckgo.com';
  if (/^(https?|ftp|file|aura):\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/.*)?$/;
  if (domainRegex.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

function sendBrowserState(state: Record<string, any>) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('browser:state-changed', state);
  }
}

function logActivityToBackend(title: string, description: string) {
  const data = JSON.stringify({
    title,
    event_type: 'system',
    status: 'Allowed',
    description
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/activity',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, () => {});

  req.on('error', (err) => {
    console.warn('Failed to log activity event from Electron main:', err);
  });
  req.write(data);
  req.end();
}

function generateBlockedHtml(hostname: string, domain: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AuraOS - Website Blocked</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background-color: #070a12;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }
    .card {
      background: #0d1322;
      border: 1px solid rgba(244, 63, 94, 0.4);
      box-shadow: 0 0 50px rgba(244, 63, 94, 0.25);
      border-radius: 24px;
      padding: 44px 36px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      backdrop-filter: blur(16px);
    }
    .icon-wrapper {
      width: 64px;
      height: 64px;
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.4);
      border-radius: 20px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fb7185;
      font-size: 30px;
    }
    .badge {
      display: inline-block;
      padding: 4px 14px;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(34, 211, 238, 0.3);
      color: #22d3ee;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #f1f5f9;
      margin: 0 0 10px;
      line-height: 1.3;
    }
    p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 24px;
      line-height: 1.6;
    }
    .domain-tag {
      font-family: monospace;
      color: #fb7185;
      font-weight: 700;
      background: rgba(244, 63, 94, 0.1);
      padding: 2px 8px;
      border-radius: 6px;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    button, a.btn {
      padding: 11px 22px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-back {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .btn-back:hover {
      background: #334155;
      color: #ffffff;
    }
    .btn-allow {
      background: linear-gradient(135deg, #06b6d4, #2563eb);
      color: #070a12;
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.35);
    }
    .btn-allow:hover {
      opacity: 0.95;
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">🛡️</div>
    <div class="badge">Study Mode Active</div>
    <h1>This website is blocked in Study Mode</h1>
    <p>AuraOS is protecting your focus.<br>Restricted domain: <span class="domain-tag">${hostname}</span></p>
    <div class="actions">
      <button class="btn-back" onclick="window.history.back()">Go Back</button>
      <a class="btn btn-allow" href="aura://allow-domain?domain=${encodeURIComponent(domain)}&target=${encodeURIComponent(targetUrl)}">Temporarily Allow</a>
    </div>
  </div>
</body>
</html>`;
}

function setupNetworkInterception() {
  const filter = { urls: ['*://*/*'] };

  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const requestUrl = details.url;

    // Handle aura://allow-domain protocol request
    if (requestUrl.startsWith('aura://allow-domain')) {
      try {
        const u = new URL(requestUrl);
        const domainToAllow = u.searchParams.get('domain');
        const targetUrl = u.searchParams.get('target') || 'https://duckduckgo.com';

        if (domainToAllow) {
          temporarilyAllowedDomains.add(domainToAllow.toLowerCase());
          logActivityToBackend(
            `Temporarily Allowed Domain: ${domainToAllow}`,
            `Temporarily permitted access to ${domainToAllow} for the current session.`
          );
        }

        callback({ redirectURL: targetUrl });
        return;
      } catch (err) {
        console.error('Error handling aura://allow-domain:', err);
      }
    }

    // Only intercept main frame navigation requests
    if (!isStudyModeActive || details.resourceType !== 'mainFrame') {
      callback({ cancel: false });
      return;
    }

    try {
      const parsedUrl = new URL(requestUrl);
      const hostname = parsedUrl.hostname.toLowerCase();

      // Check if domain matches any blocked website rule
      const matchedDomain = blockedDomains.find((domain) => {
        const clean = domain.toLowerCase();
        return hostname === clean || hostname.endsWith('.' + clean);
      });

      if (matchedDomain) {
        // If domain is temporarily allowed in memory for this session, allow request
        if (temporarilyAllowedDomains.has(matchedDomain.toLowerCase())) {
          callback({ cancel: false });
          return;
        }

        // Intercept & redirect to native AuraOS blocked HTML page
        const html = generateBlockedHtml(hostname, matchedDomain, requestUrl);
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        callback({ redirectURL: dataUrl });
        return;
      }
    } catch (e) {
      // Invalid URL format
    }

    callback({ cancel: false });
  });
}

function createBrowserView() {
  if (!mainWindow) return;

  browserView = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.contentView.addChildView(browserView);
  browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });

  const wc = browserView.webContents;

  wc.on('did-start-loading', () => {
    sendBrowserState({
      isLoading: true,
      url: wc.getURL(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    });
  });

  wc.on('did-stop-loading', () => {
    sendBrowserState({
      isLoading: false,
      url: wc.getURL(),
      title: wc.getTitle(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    });
  });

  wc.on('page-title-updated', (_, title) => {
    sendBrowserState({
      title,
      url: wc.getURL(),
    });
  });

  wc.on('did-navigate', (_, url) => {
    sendBrowserState({
      url,
      title: wc.getTitle(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    });
  });

  wc.on('did-navigate-in-page', (_, url) => {
    sendBrowserState({
      url,
      title: wc.getTitle(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    title: 'AuraOS Desktop',
    backgroundColor: '#070a12',
    show: false,
    frame: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    createBrowserView();
    setupNetworkInterception();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    browserView = null;
  });
}

// Window control handlers
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('system:get-info', () => {
  return {
    version: '1.0.0-aura',
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  };
});

// Embedded Browser View IPC Handlers
ipcMain.handle('browser:navigate', async (_, inputUrl: string) => {
  if (!browserView) return;
  const targetUrl = parseUrlOrSearch(inputUrl);
  try {
    await browserView.webContents.loadURL(targetUrl);
  } catch (err) {
    console.error('Failed to load URL:', targetUrl, err);
  }
});

ipcMain.handle('browser:go-back', () => {
  if (browserView && browserView.webContents.canGoBack()) {
    browserView.webContents.goBack();
  }
});

ipcMain.handle('browser:go-forward', () => {
  if (browserView && browserView.webContents.canGoForward()) {
    browserView.webContents.goForward();
  }
});

ipcMain.handle('browser:reload', () => {
  if (browserView) {
    browserView.webContents.reload();
  }
});

ipcMain.handle('browser:set-bounds', (_, bounds: { x: number; y: number; width: number; height: number }) => {
  currentBounds = {
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.max(0, Math.round(bounds.width)),
    height: Math.max(0, Math.round(bounds.height)),
  };

  if (browserView && isBrowserVisible) {
    browserView.setBounds(currentBounds);
  }
});

ipcMain.handle('browser:set-visible', (_, visible: boolean) => {
  isBrowserVisible = visible;
  if (browserView) {
    if (visible) {
      browserView.setBounds(currentBounds);
    } else {
      browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
});

// Study Mode Domain Rules IPC Sync
ipcMain.handle('browser:update-study-rules', (_, rules: { studyModeActive: boolean; blockedDomains: string[] }) => {
  isStudyModeActive = !!rules.studyModeActive;
  if (Array.isArray(rules.blockedDomains)) {
    blockedDomains = rules.blockedDomains;
  }
  console.log(`Updated Study Mode Rules: active=${isStudyModeActive}, domains=${blockedDomains.join(', ')}`);
});

// WebContents Text Extraction IPC Handler
ipcMain.handle('browser:extract-text', async () => {
  if (!browserView || !browserView.webContents) {
    return { title: 'AuraOS Desktop', url: '', text: 'No active browser page loaded.' };
  }

  try {
    const title = browserView.webContents.getTitle() || 'Untitled Page';
    const url = browserView.webContents.getURL() || '';
    const text = await browserView.webContents.executeJavaScript(
      `document.body ? document.body.innerText : ''`
    );
    const textStr = typeof text === 'string' ? text.trim() : '';
    const truncatedText = textStr.slice(0, 12000);

    return {
      title,
      url,
      text: truncatedText || `Page title: ${title}. Content loaded in viewport.`
    };
  } catch (err) {
    console.error('Error extracting text from WebContents:', err);
    return {
      title: browserView.webContents.getTitle() || 'Page',
      url: browserView.webContents.getURL() || '',
      text: 'Text extraction fallback.'
    };
  }
});

app.whenReady().then(() => {
  startBackendProcess();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  stopBackendProcess();
});

app.on('window-all-closed', () => {
  stopBackendProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
