"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_http = __toESM(require("http"));
var mainWindow = null;
var browserView = null;
var pythonBackendProcess = null;
var isBrowserVisible = false;
var currentBounds = { x: 0, y: 0, width: 0, height: 0 };
var isStudyModeActive = false;
var blockedDomains = ["instagram.com", "facebook.com", "x.com", "twitter.com"];
var temporarilyAllowedDomains = /* @__PURE__ */ new Set();
function startBackendProcess() {
  const backendScript = import_path.default.join(import_electron.app.getAppPath(), "backend", "main.py");
  console.log("Starting Python FastAPI backend process:", backendScript);
  pythonBackendProcess = (0, import_child_process.spawn)("python", [backendScript], {
    cwd: import_path.default.join(import_electron.app.getAppPath(), "backend"),
    stdio: "inherit",
    env: { ...process.env, PYTHONUNBUFFERED: "1" }
  });
  pythonBackendProcess.on("error", (err) => {
    console.error("Failed to start Python backend process:", err);
  });
  pythonBackendProcess.on("exit", (code, signal) => {
    console.log(`Python backend process exited with code ${code}, signal ${signal}`);
    pythonBackendProcess = null;
  });
}
function stopBackendProcess() {
  if (pythonBackendProcess) {
    console.log("Stopping Python FastAPI backend process...");
    try {
      pythonBackendProcess.kill();
    } catch (e) {
      console.error("Error killing Python process:", e);
    }
    pythonBackendProcess = null;
  }
}
function parseUrlOrSearch(input) {
  const trimmed = input.trim();
  if (!trimmed) return "https://duckduckgo.com";
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
function sendBrowserState(state) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("browser:state-changed", state);
  }
}
function logActivityToBackend(title, description) {
  const data = JSON.stringify({
    title,
    event_type: "system",
    status: "Allowed",
    description
  });
  const req = import_http.default.request({
    hostname: "127.0.0.1",
    port: 8e3,
    path: "/api/activity",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  }, () => {
  });
  req.on("error", (err) => {
    console.warn("Failed to log activity event from Electron main:", err);
  });
  req.write(data);
  req.end();
}
function generateBlockedHtml(hostname, domain, targetUrl) {
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
    <div class="icon-wrapper">\u{1F6E1}\uFE0F</div>
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
  const filter = { urls: ["*://*/*"] };
  import_electron.session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const requestUrl = details.url;
    if (requestUrl.startsWith("aura://allow-domain")) {
      try {
        const u = new URL(requestUrl);
        const domainToAllow = u.searchParams.get("domain");
        const targetUrl = u.searchParams.get("target") || "https://duckduckgo.com";
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
        console.error("Error handling aura://allow-domain:", err);
      }
    }
    if (!isStudyModeActive || details.resourceType !== "mainFrame") {
      callback({ cancel: false });
      return;
    }
    try {
      const parsedUrl = new URL(requestUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      const matchedDomain = blockedDomains.find((domain) => {
        const clean = domain.toLowerCase();
        return hostname === clean || hostname.endsWith("." + clean);
      });
      if (matchedDomain) {
        if (temporarilyAllowedDomains.has(matchedDomain.toLowerCase())) {
          callback({ cancel: false });
          return;
        }
        const html = generateBlockedHtml(hostname, matchedDomain, requestUrl);
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        callback({ redirectURL: dataUrl });
        return;
      }
    } catch (e) {
    }
    callback({ cancel: false });
  });
}
function createBrowserView() {
  if (!mainWindow) return;
  browserView = new import_electron.WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.contentView.addChildView(browserView);
  browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  const wc = browserView.webContents;
  wc.on("did-start-loading", () => {
    sendBrowserState({
      isLoading: true,
      url: wc.getURL(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward()
    });
  });
  wc.on("did-stop-loading", () => {
    sendBrowserState({
      isLoading: false,
      url: wc.getURL(),
      title: wc.getTitle(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward()
    });
  });
  wc.on("page-title-updated", (_, title) => {
    sendBrowserState({
      title,
      url: wc.getURL()
    });
  });
  wc.on("did-navigate", (_, url) => {
    sendBrowserState({
      url,
      title: wc.getTitle(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward()
    });
  });
  wc.on("did-navigate-in-page", (_, url) => {
    sendBrowserState({
      url,
      title: wc.getTitle(),
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward()
    });
  });
}
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    title: "AuraOS Desktop",
    backgroundColor: "#070a12",
    show: false,
    frame: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: import_path.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  const isDev = process.env.NODE_ENV === "development" || !import_electron.app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(import_path.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    createBrowserView();
    setupNetworkInterception();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    browserView = null;
  });
}
import_electron.ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});
import_electron.ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
import_electron.ipcMain.handle("window:close", () => {
  mainWindow?.close();
});
import_electron.ipcMain.handle("system:get-info", () => {
  return {
    version: "1.0.0-aura",
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node
  };
});
import_electron.ipcMain.handle("browser:navigate", async (_, inputUrl) => {
  if (!browserView) return;
  const targetUrl = parseUrlOrSearch(inputUrl);
  try {
    await browserView.webContents.loadURL(targetUrl);
  } catch (err) {
    console.error("Failed to load URL:", targetUrl, err);
  }
});
import_electron.ipcMain.handle("browser:go-back", () => {
  if (browserView && browserView.webContents.canGoBack()) {
    browserView.webContents.goBack();
  }
});
import_electron.ipcMain.handle("browser:go-forward", () => {
  if (browserView && browserView.webContents.canGoForward()) {
    browserView.webContents.goForward();
  }
});
import_electron.ipcMain.handle("browser:reload", () => {
  if (browserView) {
    browserView.webContents.reload();
  }
});
import_electron.ipcMain.handle("browser:set-bounds", (_, bounds) => {
  currentBounds = {
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.max(0, Math.round(bounds.width)),
    height: Math.max(0, Math.round(bounds.height))
  };
  if (browserView && isBrowserVisible) {
    browserView.setBounds(currentBounds);
  }
});
import_electron.ipcMain.handle("browser:set-visible", (_, visible) => {
  isBrowserVisible = visible;
  if (browserView) {
    if (visible) {
      browserView.setBounds(currentBounds);
    } else {
      browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
});
import_electron.ipcMain.handle("browser:update-study-rules", (_, rules) => {
  isStudyModeActive = !!rules.studyModeActive;
  if (Array.isArray(rules.blockedDomains)) {
    blockedDomains = rules.blockedDomains;
  }
  console.log(`Updated Study Mode Rules: active=${isStudyModeActive}, domains=${blockedDomains.join(", ")}`);
});
import_electron.ipcMain.handle("browser:extract-text", async () => {
  if (!browserView || !browserView.webContents) {
    return { title: "AuraOS Desktop", url: "", text: "No active browser page loaded." };
  }
  try {
    const title = browserView.webContents.getTitle() || "Untitled Page";
    const url = browserView.webContents.getURL() || "";
    const text = await browserView.webContents.executeJavaScript(
      `document.body ? document.body.innerText : ''`
    );
    const textStr = typeof text === "string" ? text.trim() : "";
    const truncatedText = textStr.slice(0, 12e3);
    return {
      title,
      url,
      text: truncatedText || `Page title: ${title}. Content loaded in viewport.`
    };
  } catch (err) {
    console.error("Error extracting text from WebContents:", err);
    return {
      title: browserView.webContents.getTitle() || "Page",
      url: browserView.webContents.getURL() || "",
      text: "Text extraction fallback."
    };
  }
});
import_electron.app.whenReady().then(() => {
  startBackendProcess();
  createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron.app.on("will-quit", () => {
  stopBackendProcess();
});
import_electron.app.on("window-all-closed", () => {
  stopBackendProcess();
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vZWxlY3Ryb24vbWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgYXBwLCBCcm93c2VyV2luZG93LCBXZWJDb250ZW50c1ZpZXcsIGlwY01haW4sIHNlc3Npb24gfSBmcm9tICdlbGVjdHJvbic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHNwYXduLCBDaGlsZFByb2Nlc3MgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuXG5sZXQgbWFpbldpbmRvdzogQnJvd3NlcldpbmRvdyB8IG51bGwgPSBudWxsO1xubGV0IGJyb3dzZXJWaWV3OiBXZWJDb250ZW50c1ZpZXcgfCBudWxsID0gbnVsbDtcbmxldCBweXRob25CYWNrZW5kUHJvY2VzczogQ2hpbGRQcm9jZXNzIHwgbnVsbCA9IG51bGw7XG5sZXQgaXNCcm93c2VyVmlzaWJsZSA9IGZhbHNlO1xubGV0IGN1cnJlbnRCb3VuZHMgPSB7IHg6IDAsIHk6IDAsIHdpZHRoOiAwLCBoZWlnaHQ6IDAgfTtcblxuLy8gRG9tYWluIEJsb2NraW5nIFJ1bGVzIHN0YXRlXG5sZXQgaXNTdHVkeU1vZGVBY3RpdmUgPSBmYWxzZTtcbmxldCBibG9ja2VkRG9tYWluczogc3RyaW5nW10gPSBbJ2luc3RhZ3JhbS5jb20nLCAnZmFjZWJvb2suY29tJywgJ3guY29tJywgJ3R3aXR0ZXIuY29tJ107XG5sZXQgdGVtcG9yYXJpbHlBbGxvd2VkRG9tYWluczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG5cbmZ1bmN0aW9uIHN0YXJ0QmFja2VuZFByb2Nlc3MoKSB7XG4gIGNvbnN0IGJhY2tlbmRTY3JpcHQgPSBwYXRoLmpvaW4oYXBwLmdldEFwcFBhdGgoKSwgJ2JhY2tlbmQnLCAnbWFpbi5weScpO1xuICBjb25zb2xlLmxvZygnU3RhcnRpbmcgUHl0aG9uIEZhc3RBUEkgYmFja2VuZCBwcm9jZXNzOicsIGJhY2tlbmRTY3JpcHQpO1xuXG4gIHB5dGhvbkJhY2tlbmRQcm9jZXNzID0gc3Bhd24oJ3B5dGhvbicsIFtiYWNrZW5kU2NyaXB0XSwge1xuICAgIGN3ZDogcGF0aC5qb2luKGFwcC5nZXRBcHBQYXRoKCksICdiYWNrZW5kJyksXG4gICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICBlbnY6IHsgLi4ucHJvY2Vzcy5lbnYsIFBZVEhPTlVOQlVGRkVSRUQ6ICcxJyB9XG4gIH0pO1xuXG4gIHB5dGhvbkJhY2tlbmRQcm9jZXNzLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc3RhcnQgUHl0aG9uIGJhY2tlbmQgcHJvY2VzczonLCBlcnIpO1xuICB9KTtcblxuICBweXRob25CYWNrZW5kUHJvY2Vzcy5vbignZXhpdCcsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgUHl0aG9uIGJhY2tlbmQgcHJvY2VzcyBleGl0ZWQgd2l0aCBjb2RlICR7Y29kZX0sIHNpZ25hbCAke3NpZ25hbH1gKTtcbiAgICBweXRob25CYWNrZW5kUHJvY2VzcyA9IG51bGw7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzdG9wQmFja2VuZFByb2Nlc3MoKSB7XG4gIGlmIChweXRob25CYWNrZW5kUHJvY2Vzcykge1xuICAgIGNvbnNvbGUubG9nKCdTdG9wcGluZyBQeXRob24gRmFzdEFQSSBiYWNrZW5kIHByb2Nlc3MuLi4nKTtcbiAgICB0cnkge1xuICAgICAgcHl0aG9uQmFja2VuZFByb2Nlc3Mua2lsbCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGtpbGxpbmcgUHl0aG9uIHByb2Nlc3M6JywgZSk7XG4gICAgfVxuICAgIHB5dGhvbkJhY2tlbmRQcm9jZXNzID0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZVVybE9yU2VhcmNoKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB0cmltbWVkID0gaW5wdXQudHJpbSgpO1xuICBpZiAoIXRyaW1tZWQpIHJldHVybiAnaHR0cHM6Ly9kdWNrZHVja2dvLmNvbSc7XG4gIGlmICgvXihodHRwcz98ZnRwfGZpbGV8YXVyYSk6XFwvXFwvL2kudGVzdCh0cmltbWVkKSkge1xuICAgIHJldHVybiB0cmltbWVkO1xuICB9XG4gIGlmICgvXmxvY2FsaG9zdCg6XFxkKyk/KFxcLy4qKT8kL2kudGVzdCh0cmltbWVkKSkge1xuICAgIHJldHVybiBgaHR0cDovLyR7dHJpbW1lZH1gO1xuICB9XG4gIGNvbnN0IGRvbWFpblJlZ2V4ID0gL14oPzpbYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT9cXC4pK1thLXpBLVpdezIsfSg/OjpcXGQrKT8oPzpcXC8uKik/JC87XG4gIGlmIChkb21haW5SZWdleC50ZXN0KHRyaW1tZWQpKSB7XG4gICAgcmV0dXJuIGBodHRwczovLyR7dHJpbW1lZH1gO1xuICB9XG4gIHJldHVybiBgaHR0cHM6Ly9kdWNrZHVja2dvLmNvbS8/cT0ke2VuY29kZVVSSUNvbXBvbmVudCh0cmltbWVkKX1gO1xufVxuXG5mdW5jdGlvbiBzZW5kQnJvd3NlclN0YXRlKHN0YXRlOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSB7XG4gIGlmIChtYWluV2luZG93ICYmICFtYWluV2luZG93LmlzRGVzdHJveWVkKCkpIHtcbiAgICBtYWluV2luZG93LndlYkNvbnRlbnRzLnNlbmQoJ2Jyb3dzZXI6c3RhdGUtY2hhbmdlZCcsIHN0YXRlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dBY3Rpdml0eVRvQmFja2VuZCh0aXRsZTogc3RyaW5nLCBkZXNjcmlwdGlvbjogc3RyaW5nKSB7XG4gIGNvbnN0IGRhdGEgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgdGl0bGUsXG4gICAgZXZlbnRfdHlwZTogJ3N5c3RlbScsXG4gICAgc3RhdHVzOiAnQWxsb3dlZCcsXG4gICAgZGVzY3JpcHRpb25cbiAgfSk7XG5cbiAgY29uc3QgcmVxID0gaHR0cC5yZXF1ZXN0KHtcbiAgICBob3N0bmFtZTogJzEyNy4wLjAuMScsXG4gICAgcG9ydDogODAwMCxcbiAgICBwYXRoOiAnL2FwaS9hY3Rpdml0eScsXG4gICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgaGVhZGVyczoge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICdDb250ZW50LUxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKGRhdGEpXG4gICAgfVxuICB9LCAoKSA9PiB7fSk7XG5cbiAgcmVxLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBsb2cgYWN0aXZpdHkgZXZlbnQgZnJvbSBFbGVjdHJvbiBtYWluOicsIGVycik7XG4gIH0pO1xuICByZXEud3JpdGUoZGF0YSk7XG4gIHJlcS5lbmQoKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVCbG9ja2VkSHRtbChob3N0bmFtZTogc3RyaW5nLCBkb21haW46IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYDwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG48aGVhZD5cbiAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCI+XG4gIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MS4wXCI+XG4gIDx0aXRsZT5BdXJhT1MgLSBXZWJzaXRlIEJsb2NrZWQ8L3RpdGxlPlxuICA8c3R5bGU+XG4gICAgKiB7IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH1cbiAgICBib2R5IHtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6ICMwNzBhMTI7XG4gICAgICBjb2xvcjogI2YxZjVmOTtcbiAgICAgIGZvbnQtZmFtaWx5OiBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCBzYW5zLXNlcmlmO1xuICAgICAgaGVpZ2h0OiAxMDB2aDtcbiAgICAgIG1hcmdpbjogMDtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgICB1c2VyLXNlbGVjdDogbm9uZTtcbiAgICB9XG4gICAgLmNhcmQge1xuICAgICAgYmFja2dyb3VuZDogIzBkMTMyMjtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjQ0LCA2MywgOTQsIDAuNCk7XG4gICAgICBib3gtc2hhZG93OiAwIDAgNTBweCByZ2JhKDI0NCwgNjMsIDk0LCAwLjI1KTtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDI0cHg7XG4gICAgICBwYWRkaW5nOiA0NHB4IDM2cHg7XG4gICAgICBtYXgtd2lkdGg6IDQ4MHB4O1xuICAgICAgd2lkdGg6IDkwJTtcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgIGJhY2tkcm9wLWZpbHRlcjogYmx1cigxNnB4KTtcbiAgICB9XG4gICAgLmljb24td3JhcHBlciB7XG4gICAgICB3aWR0aDogNjRweDtcbiAgICAgIGhlaWdodDogNjRweDtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMjQ0LCA2MywgOTQsIDAuMTUpO1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNDQsIDYzLCA5NCwgMC40KTtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDIwcHg7XG4gICAgICBtYXJnaW46IDAgYXV0byAyMHB4O1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICAgIGNvbG9yOiAjZmI3MTg1O1xuICAgICAgZm9udC1zaXplOiAzMHB4O1xuICAgIH1cbiAgICAuYmFkZ2Uge1xuICAgICAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xuICAgICAgcGFkZGluZzogNHB4IDE0cHg7XG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDYsIDE4MiwgMjEyLCAwLjE1KTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMzQsIDIxMSwgMjM4LCAwLjMpO1xuICAgICAgY29sb3I6ICMyMmQzZWU7XG4gICAgICBib3JkZXItcmFkaXVzOiA5OTk5cHg7XG4gICAgICBmb250LXNpemU6IDExcHg7XG4gICAgICBmb250LXdlaWdodDogNzAwO1xuICAgICAgbGV0dGVyLXNwYWNpbmc6IDAuNXB4O1xuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICAgIG1hcmdpbi1ib3R0b206IDE2cHg7XG4gICAgfVxuICAgIGgxIHtcbiAgICAgIGZvbnQtc2l6ZTogMjJweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA4MDA7XG4gICAgICBjb2xvcjogI2YxZjVmOTtcbiAgICAgIG1hcmdpbjogMCAwIDEwcHg7XG4gICAgICBsaW5lLWhlaWdodDogMS4zO1xuICAgIH1cbiAgICBwIHtcbiAgICAgIGZvbnQtc2l6ZTogMTNweDtcbiAgICAgIGNvbG9yOiAjOTRhM2I4O1xuICAgICAgbWFyZ2luOiAwIDAgMjRweDtcbiAgICAgIGxpbmUtaGVpZ2h0OiAxLjY7XG4gICAgfVxuICAgIC5kb21haW4tdGFnIHtcbiAgICAgIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XG4gICAgICBjb2xvcjogI2ZiNzE4NTtcbiAgICAgIGZvbnQtd2VpZ2h0OiA3MDA7XG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI0NCwgNjMsIDk0LCAwLjEpO1xuICAgICAgcGFkZGluZzogMnB4IDhweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDZweDtcbiAgICB9XG4gICAgLmFjdGlvbnMge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGdhcDogMTJweDtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIH1cbiAgICBidXR0b24sIGEuYnRuIHtcbiAgICAgIHBhZGRpbmc6IDExcHggMjJweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDEycHg7XG4gICAgICBmb250LXNpemU6IDEycHg7XG4gICAgICBmb250LXdlaWdodDogNzAwO1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICAgICAgdHJhbnNpdGlvbjogYWxsIDAuMnMgZWFzZTtcbiAgICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIH1cbiAgICAuYnRuLWJhY2sge1xuICAgICAgYmFja2dyb3VuZDogIzFlMjkzYjtcbiAgICAgIGNvbG9yOiAjY2JkNWUxO1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgIzMzNDE1NTtcbiAgICB9XG4gICAgLmJ0bi1iYWNrOmhvdmVyIHtcbiAgICAgIGJhY2tncm91bmQ6ICMzMzQxNTU7XG4gICAgICBjb2xvcjogI2ZmZmZmZjtcbiAgICB9XG4gICAgLmJ0bi1hbGxvdyB7XG4gICAgICBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCAjMDZiNmQ0LCAjMjU2M2ViKTtcbiAgICAgIGNvbG9yOiAjMDcwYTEyO1xuICAgICAgYm94LXNoYWRvdzogMCAwIDIwcHggcmdiYSgzNCwgMjExLCAyMzgsIDAuMzUpO1xuICAgIH1cbiAgICAuYnRuLWFsbG93OmhvdmVyIHtcbiAgICAgIG9wYWNpdHk6IDAuOTU7XG4gICAgICB0cmFuc2Zvcm06IHNjYWxlKDEuMDIpO1xuICAgIH1cbiAgPC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgIDxkaXYgY2xhc3M9XCJpY29uLXdyYXBwZXJcIj5cdUQ4M0RcdURFRTFcdUZFMEY8L2Rpdj5cbiAgICA8ZGl2IGNsYXNzPVwiYmFkZ2VcIj5TdHVkeSBNb2RlIEFjdGl2ZTwvZGl2PlxuICAgIDxoMT5UaGlzIHdlYnNpdGUgaXMgYmxvY2tlZCBpbiBTdHVkeSBNb2RlPC9oMT5cbiAgICA8cD5BdXJhT1MgaXMgcHJvdGVjdGluZyB5b3VyIGZvY3VzLjxicj5SZXN0cmljdGVkIGRvbWFpbjogPHNwYW4gY2xhc3M9XCJkb21haW4tdGFnXCI+JHtob3N0bmFtZX08L3NwYW4+PC9wPlxuICAgIDxkaXYgY2xhc3M9XCJhY3Rpb25zXCI+XG4gICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuLWJhY2tcIiBvbmNsaWNrPVwid2luZG93Lmhpc3RvcnkuYmFjaygpXCI+R28gQmFjazwvYnV0dG9uPlxuICAgICAgPGEgY2xhc3M9XCJidG4gYnRuLWFsbG93XCIgaHJlZj1cImF1cmE6Ly9hbGxvdy1kb21haW4/ZG9tYWluPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGRvbWFpbil9JnRhcmdldD0ke2VuY29kZVVSSUNvbXBvbmVudCh0YXJnZXRVcmwpfVwiPlRlbXBvcmFyaWx5IEFsbG93PC9hPlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbjwvYm9keT5cbjwvaHRtbD5gO1xufVxuXG5mdW5jdGlvbiBzZXR1cE5ldHdvcmtJbnRlcmNlcHRpb24oKSB7XG4gIGNvbnN0IGZpbHRlciA9IHsgdXJsczogWycqOi8vKi8qJ10gfTtcblxuICBzZXNzaW9uLmRlZmF1bHRTZXNzaW9uLndlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0KGZpbHRlciwgKGRldGFpbHMsIGNhbGxiYWNrKSA9PiB7XG4gICAgY29uc3QgcmVxdWVzdFVybCA9IGRldGFpbHMudXJsO1xuXG4gICAgLy8gSGFuZGxlIGF1cmE6Ly9hbGxvdy1kb21haW4gcHJvdG9jb2wgcmVxdWVzdFxuICAgIGlmIChyZXF1ZXN0VXJsLnN0YXJ0c1dpdGgoJ2F1cmE6Ly9hbGxvdy1kb21haW4nKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdSA9IG5ldyBVUkwocmVxdWVzdFVybCk7XG4gICAgICAgIGNvbnN0IGRvbWFpblRvQWxsb3cgPSB1LnNlYXJjaFBhcmFtcy5nZXQoJ2RvbWFpbicpO1xuICAgICAgICBjb25zdCB0YXJnZXRVcmwgPSB1LnNlYXJjaFBhcmFtcy5nZXQoJ3RhcmdldCcpIHx8ICdodHRwczovL2R1Y2tkdWNrZ28uY29tJztcblxuICAgICAgICBpZiAoZG9tYWluVG9BbGxvdykge1xuICAgICAgICAgIHRlbXBvcmFyaWx5QWxsb3dlZERvbWFpbnMuYWRkKGRvbWFpblRvQWxsb3cudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgbG9nQWN0aXZpdHlUb0JhY2tlbmQoXG4gICAgICAgICAgICBgVGVtcG9yYXJpbHkgQWxsb3dlZCBEb21haW46ICR7ZG9tYWluVG9BbGxvd31gLFxuICAgICAgICAgICAgYFRlbXBvcmFyaWx5IHBlcm1pdHRlZCBhY2Nlc3MgdG8gJHtkb21haW5Ub0FsbG93fSBmb3IgdGhlIGN1cnJlbnQgc2Vzc2lvbi5gXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKHsgcmVkaXJlY3RVUkw6IHRhcmdldFVybCB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIGF1cmE6Ly9hbGxvdy1kb21haW46JywgZXJyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPbmx5IGludGVyY2VwdCBtYWluIGZyYW1lIG5hdmlnYXRpb24gcmVxdWVzdHNcbiAgICBpZiAoIWlzU3R1ZHlNb2RlQWN0aXZlIHx8IGRldGFpbHMucmVzb3VyY2VUeXBlICE9PSAnbWFpbkZyYW1lJykge1xuICAgICAgY2FsbGJhY2soeyBjYW5jZWw6IGZhbHNlIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBwYXJzZWRVcmwgPSBuZXcgVVJMKHJlcXVlc3RVcmwpO1xuICAgICAgY29uc3QgaG9zdG5hbWUgPSBwYXJzZWRVcmwuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgICAgLy8gQ2hlY2sgaWYgZG9tYWluIG1hdGNoZXMgYW55IGJsb2NrZWQgd2Vic2l0ZSBydWxlXG4gICAgICBjb25zdCBtYXRjaGVkRG9tYWluID0gYmxvY2tlZERvbWFpbnMuZmluZCgoZG9tYWluKSA9PiB7XG4gICAgICAgIGNvbnN0IGNsZWFuID0gZG9tYWluLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHJldHVybiBob3N0bmFtZSA9PT0gY2xlYW4gfHwgaG9zdG5hbWUuZW5kc1dpdGgoJy4nICsgY2xlYW4pO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChtYXRjaGVkRG9tYWluKSB7XG4gICAgICAgIC8vIElmIGRvbWFpbiBpcyB0ZW1wb3JhcmlseSBhbGxvd2VkIGluIG1lbW9yeSBmb3IgdGhpcyBzZXNzaW9uLCBhbGxvdyByZXF1ZXN0XG4gICAgICAgIGlmICh0ZW1wb3JhcmlseUFsbG93ZWREb21haW5zLmhhcyhtYXRjaGVkRG9tYWluLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgY2FsbGJhY2soeyBjYW5jZWw6IGZhbHNlIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEludGVyY2VwdCAmIHJlZGlyZWN0IHRvIG5hdGl2ZSBBdXJhT1MgYmxvY2tlZCBIVE1MIHBhZ2VcbiAgICAgICAgY29uc3QgaHRtbCA9IGdlbmVyYXRlQmxvY2tlZEh0bWwoaG9zdG5hbWUsIG1hdGNoZWREb21haW4sIHJlcXVlc3RVcmwpO1xuICAgICAgICBjb25zdCBkYXRhVXJsID0gYGRhdGE6dGV4dC9odG1sO2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoaHRtbCl9YDtcbiAgICAgICAgY2FsbGJhY2soeyByZWRpcmVjdFVSTDogZGF0YVVybCB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIEludmFsaWQgVVJMIGZvcm1hdFxuICAgIH1cblxuICAgIGNhbGxiYWNrKHsgY2FuY2VsOiBmYWxzZSB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJyb3dzZXJWaWV3KCkge1xuICBpZiAoIW1haW5XaW5kb3cpIHJldHVybjtcblxuICBicm93c2VyVmlldyA9IG5ldyBXZWJDb250ZW50c1ZpZXcoe1xuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBzYW5kYm94OiB0cnVlLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbjogZmFsc2UsXG4gICAgfSxcbiAgfSk7XG5cbiAgbWFpbldpbmRvdy5jb250ZW50Vmlldy5hZGRDaGlsZFZpZXcoYnJvd3NlclZpZXcpO1xuICBicm93c2VyVmlldy5zZXRCb3VuZHMoeyB4OiAwLCB5OiAwLCB3aWR0aDogMCwgaGVpZ2h0OiAwIH0pO1xuXG4gIGNvbnN0IHdjID0gYnJvd3NlclZpZXcud2ViQ29udGVudHM7XG5cbiAgd2Mub24oJ2RpZC1zdGFydC1sb2FkaW5nJywgKCkgPT4ge1xuICAgIHNlbmRCcm93c2VyU3RhdGUoe1xuICAgICAgaXNMb2FkaW5nOiB0cnVlLFxuICAgICAgdXJsOiB3Yy5nZXRVUkwoKSxcbiAgICAgIGNhbkdvQmFjazogd2MuY2FuR29CYWNrKCksXG4gICAgICBjYW5Hb0ZvcndhcmQ6IHdjLmNhbkdvRm9yd2FyZCgpLFxuICAgIH0pO1xuICB9KTtcblxuICB3Yy5vbignZGlkLXN0b3AtbG9hZGluZycsICgpID0+IHtcbiAgICBzZW5kQnJvd3NlclN0YXRlKHtcbiAgICAgIGlzTG9hZGluZzogZmFsc2UsXG4gICAgICB1cmw6IHdjLmdldFVSTCgpLFxuICAgICAgdGl0bGU6IHdjLmdldFRpdGxlKCksXG4gICAgICBjYW5Hb0JhY2s6IHdjLmNhbkdvQmFjaygpLFxuICAgICAgY2FuR29Gb3J3YXJkOiB3Yy5jYW5Hb0ZvcndhcmQoKSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgd2Mub24oJ3BhZ2UtdGl0bGUtdXBkYXRlZCcsIChfLCB0aXRsZSkgPT4ge1xuICAgIHNlbmRCcm93c2VyU3RhdGUoe1xuICAgICAgdGl0bGUsXG4gICAgICB1cmw6IHdjLmdldFVSTCgpLFxuICAgIH0pO1xuICB9KTtcblxuICB3Yy5vbignZGlkLW5hdmlnYXRlJywgKF8sIHVybCkgPT4ge1xuICAgIHNlbmRCcm93c2VyU3RhdGUoe1xuICAgICAgdXJsLFxuICAgICAgdGl0bGU6IHdjLmdldFRpdGxlKCksXG4gICAgICBjYW5Hb0JhY2s6IHdjLmNhbkdvQmFjaygpLFxuICAgICAgY2FuR29Gb3J3YXJkOiB3Yy5jYW5Hb0ZvcndhcmQoKSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgd2Mub24oJ2RpZC1uYXZpZ2F0ZS1pbi1wYWdlJywgKF8sIHVybCkgPT4ge1xuICAgIHNlbmRCcm93c2VyU3RhdGUoe1xuICAgICAgdXJsLFxuICAgICAgdGl0bGU6IHdjLmdldFRpdGxlKCksXG4gICAgICBjYW5Hb0JhY2s6IHdjLmNhbkdvQmFjaygpLFxuICAgICAgY2FuR29Gb3J3YXJkOiB3Yy5jYW5Hb0ZvcndhcmQoKSxcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdpbmRvdygpIHtcbiAgbWFpbldpbmRvdyA9IG5ldyBCcm93c2VyV2luZG93KHtcbiAgICB3aWR0aDogMTM4MCxcbiAgICBoZWlnaHQ6IDg4MCxcbiAgICBtaW5XaWR0aDogMTAyNCxcbiAgICBtaW5IZWlnaHQ6IDY4MCxcbiAgICB0aXRsZTogJ0F1cmFPUyBEZXNrdG9wJyxcbiAgICBiYWNrZ3JvdW5kQ29sb3I6ICcjMDcwYTEyJyxcbiAgICBzaG93OiBmYWxzZSxcbiAgICBmcmFtZTogdHJ1ZSxcbiAgICB0aXRsZUJhclN0eWxlOiAnaGlkZGVuSW5zZXQnLFxuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBwcmVsb2FkOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAncHJlbG9hZC5qcycpLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbjogZmFsc2UsXG4gICAgICBzYW5kYm94OiBmYWxzZSxcbiAgICB9LFxuICB9KTtcblxuICBjb25zdCBpc0RldiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnIHx8ICFhcHAuaXNQYWNrYWdlZDtcblxuICBpZiAoaXNEZXYpIHtcbiAgICBtYWluV2luZG93LmxvYWRVUkwoJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycpO1xuICB9IGVsc2Uge1xuICAgIG1haW5XaW5kb3cubG9hZEZpbGUocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Rpc3QvaW5kZXguaHRtbCcpKTtcbiAgfVxuXG4gIG1haW5XaW5kb3cub25jZSgncmVhZHktdG8tc2hvdycsICgpID0+IHtcbiAgICBtYWluV2luZG93Py5zaG93KCk7XG4gICAgY3JlYXRlQnJvd3NlclZpZXcoKTtcbiAgICBzZXR1cE5ldHdvcmtJbnRlcmNlcHRpb24oKTtcbiAgfSk7XG5cbiAgbWFpbldpbmRvdy5vbignY2xvc2VkJywgKCkgPT4ge1xuICAgIG1haW5XaW5kb3cgPSBudWxsO1xuICAgIGJyb3dzZXJWaWV3ID0gbnVsbDtcbiAgfSk7XG59XG5cbi8vIFdpbmRvdyBjb250cm9sIGhhbmRsZXJzXG5pcGNNYWluLmhhbmRsZSgnd2luZG93Om1pbmltaXplJywgKCkgPT4ge1xuICBtYWluV2luZG93Py5taW5pbWl6ZSgpO1xufSk7XG5cbmlwY01haW4uaGFuZGxlKCd3aW5kb3c6bWF4aW1pemUnLCAoKSA9PiB7XG4gIGlmIChtYWluV2luZG93Py5pc01heGltaXplZCgpKSB7XG4gICAgbWFpbldpbmRvdy51bm1heGltaXplKCk7XG4gIH0gZWxzZSB7XG4gICAgbWFpbldpbmRvdz8ubWF4aW1pemUoKTtcbiAgfVxufSk7XG5cbmlwY01haW4uaGFuZGxlKCd3aW5kb3c6Y2xvc2UnLCAoKSA9PiB7XG4gIG1haW5XaW5kb3c/LmNsb3NlKCk7XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoJ3N5c3RlbTpnZXQtaW5mbycsICgpID0+IHtcbiAgcmV0dXJuIHtcbiAgICB2ZXJzaW9uOiAnMS4wLjAtYXVyYScsXG4gICAgcGxhdGZvcm06IHByb2Nlc3MucGxhdGZvcm0sXG4gICAgYXJjaDogcHJvY2Vzcy5hcmNoLFxuICAgIGVsZWN0cm9uVmVyc2lvbjogcHJvY2Vzcy52ZXJzaW9ucy5lbGVjdHJvbixcbiAgICBub2RlVmVyc2lvbjogcHJvY2Vzcy52ZXJzaW9ucy5ub2RlLFxuICB9O1xufSk7XG5cbi8vIEVtYmVkZGVkIEJyb3dzZXIgVmlldyBJUEMgSGFuZGxlcnNcbmlwY01haW4uaGFuZGxlKCdicm93c2VyOm5hdmlnYXRlJywgYXN5bmMgKF8sIGlucHV0VXJsOiBzdHJpbmcpID0+IHtcbiAgaWYgKCFicm93c2VyVmlldykgcmV0dXJuO1xuICBjb25zdCB0YXJnZXRVcmwgPSBwYXJzZVVybE9yU2VhcmNoKGlucHV0VXJsKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBicm93c2VyVmlldy53ZWJDb250ZW50cy5sb2FkVVJMKHRhcmdldFVybCk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBsb2FkIFVSTDonLCB0YXJnZXRVcmwsIGVycik7XG4gIH1cbn0pO1xuXG5pcGNNYWluLmhhbmRsZSgnYnJvd3Nlcjpnby1iYWNrJywgKCkgPT4ge1xuICBpZiAoYnJvd3NlclZpZXcgJiYgYnJvd3NlclZpZXcud2ViQ29udGVudHMuY2FuR29CYWNrKCkpIHtcbiAgICBicm93c2VyVmlldy53ZWJDb250ZW50cy5nb0JhY2soKTtcbiAgfVxufSk7XG5cbmlwY01haW4uaGFuZGxlKCdicm93c2VyOmdvLWZvcndhcmQnLCAoKSA9PiB7XG4gIGlmIChicm93c2VyVmlldyAmJiBicm93c2VyVmlldy53ZWJDb250ZW50cy5jYW5Hb0ZvcndhcmQoKSkge1xuICAgIGJyb3dzZXJWaWV3LndlYkNvbnRlbnRzLmdvRm9yd2FyZCgpO1xuICB9XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoJ2Jyb3dzZXI6cmVsb2FkJywgKCkgPT4ge1xuICBpZiAoYnJvd3NlclZpZXcpIHtcbiAgICBicm93c2VyVmlldy53ZWJDb250ZW50cy5yZWxvYWQoKTtcbiAgfVxufSk7XG5cbmlwY01haW4uaGFuZGxlKCdicm93c2VyOnNldC1ib3VuZHMnLCAoXywgYm91bmRzOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyOyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9KSA9PiB7XG4gIGN1cnJlbnRCb3VuZHMgPSB7XG4gICAgeDogTWF0aC5tYXgoMCwgTWF0aC5yb3VuZChib3VuZHMueCkpLFxuICAgIHk6IE1hdGgubWF4KDAsIE1hdGgucm91bmQoYm91bmRzLnkpKSxcbiAgICB3aWR0aDogTWF0aC5tYXgoMCwgTWF0aC5yb3VuZChib3VuZHMud2lkdGgpKSxcbiAgICBoZWlnaHQ6IE1hdGgubWF4KDAsIE1hdGgucm91bmQoYm91bmRzLmhlaWdodCkpLFxuICB9O1xuXG4gIGlmIChicm93c2VyVmlldyAmJiBpc0Jyb3dzZXJWaXNpYmxlKSB7XG4gICAgYnJvd3NlclZpZXcuc2V0Qm91bmRzKGN1cnJlbnRCb3VuZHMpO1xuICB9XG59KTtcblxuaXBjTWFpbi5oYW5kbGUoJ2Jyb3dzZXI6c2V0LXZpc2libGUnLCAoXywgdmlzaWJsZTogYm9vbGVhbikgPT4ge1xuICBpc0Jyb3dzZXJWaXNpYmxlID0gdmlzaWJsZTtcbiAgaWYgKGJyb3dzZXJWaWV3KSB7XG4gICAgaWYgKHZpc2libGUpIHtcbiAgICAgIGJyb3dzZXJWaWV3LnNldEJvdW5kcyhjdXJyZW50Qm91bmRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnJvd3NlclZpZXcuc2V0Qm91bmRzKHsgeDogMCwgeTogMCwgd2lkdGg6IDAsIGhlaWdodDogMCB9KTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vLyBTdHVkeSBNb2RlIERvbWFpbiBSdWxlcyBJUEMgU3luY1xuaXBjTWFpbi5oYW5kbGUoJ2Jyb3dzZXI6dXBkYXRlLXN0dWR5LXJ1bGVzJywgKF8sIHJ1bGVzOiB7IHN0dWR5TW9kZUFjdGl2ZTogYm9vbGVhbjsgYmxvY2tlZERvbWFpbnM6IHN0cmluZ1tdIH0pID0+IHtcbiAgaXNTdHVkeU1vZGVBY3RpdmUgPSAhIXJ1bGVzLnN0dWR5TW9kZUFjdGl2ZTtcbiAgaWYgKEFycmF5LmlzQXJyYXkocnVsZXMuYmxvY2tlZERvbWFpbnMpKSB7XG4gICAgYmxvY2tlZERvbWFpbnMgPSBydWxlcy5ibG9ja2VkRG9tYWlucztcbiAgfVxuICBjb25zb2xlLmxvZyhgVXBkYXRlZCBTdHVkeSBNb2RlIFJ1bGVzOiBhY3RpdmU9JHtpc1N0dWR5TW9kZUFjdGl2ZX0sIGRvbWFpbnM9JHtibG9ja2VkRG9tYWlucy5qb2luKCcsICcpfWApO1xufSk7XG5cbi8vIFdlYkNvbnRlbnRzIFRleHQgRXh0cmFjdGlvbiBJUEMgSGFuZGxlclxuaXBjTWFpbi5oYW5kbGUoJ2Jyb3dzZXI6ZXh0cmFjdC10ZXh0JywgYXN5bmMgKCkgPT4ge1xuICBpZiAoIWJyb3dzZXJWaWV3IHx8ICFicm93c2VyVmlldy53ZWJDb250ZW50cykge1xuICAgIHJldHVybiB7IHRpdGxlOiAnQXVyYU9TIERlc2t0b3AnLCB1cmw6ICcnLCB0ZXh0OiAnTm8gYWN0aXZlIGJyb3dzZXIgcGFnZSBsb2FkZWQuJyB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB0aXRsZSA9IGJyb3dzZXJWaWV3LndlYkNvbnRlbnRzLmdldFRpdGxlKCkgfHwgJ1VudGl0bGVkIFBhZ2UnO1xuICAgIGNvbnN0IHVybCA9IGJyb3dzZXJWaWV3LndlYkNvbnRlbnRzLmdldFVSTCgpIHx8ICcnO1xuICAgIGNvbnN0IHRleHQgPSBhd2FpdCBicm93c2VyVmlldy53ZWJDb250ZW50cy5leGVjdXRlSmF2YVNjcmlwdChcbiAgICAgIGBkb2N1bWVudC5ib2R5ID8gZG9jdW1lbnQuYm9keS5pbm5lclRleHQgOiAnJ2BcbiAgICApO1xuICAgIGNvbnN0IHRleHRTdHIgPSB0eXBlb2YgdGV4dCA9PT0gJ3N0cmluZycgPyB0ZXh0LnRyaW0oKSA6ICcnO1xuICAgIGNvbnN0IHRydW5jYXRlZFRleHQgPSB0ZXh0U3RyLnNsaWNlKDAsIDEyMDAwKTtcblxuICAgIHJldHVybiB7XG4gICAgICB0aXRsZSxcbiAgICAgIHVybCxcbiAgICAgIHRleHQ6IHRydW5jYXRlZFRleHQgfHwgYFBhZ2UgdGl0bGU6ICR7dGl0bGV9LiBDb250ZW50IGxvYWRlZCBpbiB2aWV3cG9ydC5gXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZXh0cmFjdGluZyB0ZXh0IGZyb20gV2ViQ29udGVudHM6JywgZXJyKTtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6IGJyb3dzZXJWaWV3LndlYkNvbnRlbnRzLmdldFRpdGxlKCkgfHwgJ1BhZ2UnLFxuICAgICAgdXJsOiBicm93c2VyVmlldy53ZWJDb250ZW50cy5nZXRVUkwoKSB8fCAnJyxcbiAgICAgIHRleHQ6ICdUZXh0IGV4dHJhY3Rpb24gZmFsbGJhY2suJ1xuICAgIH07XG4gIH1cbn0pO1xuXG5hcHAud2hlblJlYWR5KCkudGhlbigoKSA9PiB7XG4gIHN0YXJ0QmFja2VuZFByb2Nlc3MoKTtcbiAgY3JlYXRlV2luZG93KCk7XG5cbiAgYXBwLm9uKCdhY3RpdmF0ZScsICgpID0+IHtcbiAgICBpZiAoQnJvd3NlcldpbmRvdy5nZXRBbGxXaW5kb3dzKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICBjcmVhdGVXaW5kb3coKTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbmFwcC5vbignd2lsbC1xdWl0JywgKCkgPT4ge1xuICBzdG9wQmFja2VuZFByb2Nlc3MoKTtcbn0pO1xuXG5hcHAub24oJ3dpbmRvdy1hbGwtY2xvc2VkJywgKCkgPT4ge1xuICBzdG9wQmFja2VuZFByb2Nlc3MoKTtcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09ICdkYXJ3aW4nKSB7XG4gICAgYXBwLnF1aXQoKTtcbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0JBQXNFO0FBQ3RFLGtCQUFpQjtBQUNqQiwyQkFBb0M7QUFDcEMsa0JBQWlCO0FBRWpCLElBQUksYUFBbUM7QUFDdkMsSUFBSSxjQUFzQztBQUMxQyxJQUFJLHVCQUE0QztBQUNoRCxJQUFJ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
