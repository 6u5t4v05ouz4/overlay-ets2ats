require('dotenv').config();
const { app, BrowserWindow, ipcMain, session, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
// Stripe integration removed in audit version

let telemetryInstance = null;
let latestTelemetry = null;
let telemetryInitErrorMessage = null;

// Objeto de configuração unificado
let config = {
  apiKey: null,
  provider: 'google',
  x: undefined,
  y: undefined,
  view: 'default',
  focus: false,
};
let configFilePath = null;

// Função para salvar a configuração
function saveConfig() {
  if (!configFilePath) return;
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save config:', e);
  }
}

// Função para carregar a configuração
function loadConfig() {
  try {
    configFilePath = path.join(app.getPath('userData'), 'overlay-config.json');
    if (fs.existsSync(configFilePath)) {
      const raw = fs.readFileSync(configFilePath, 'utf8');
      const savedConfig = JSON.parse(raw || '{}');
      config = { ...config, ...savedConfig };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    x: config.x,
    y: config.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  win.setIgnoreMouseEvents(false);

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'public/index.html'),
    protocol: 'file:',
    slashes: true,
    query: { t: Date.now() }
  }));

  // Salvar posição da janela ao fechar
  win.on('close', () => {
    try {
      const [x, y] = win.getPosition();
      config.x = x;
      config.y = y;
      saveConfig(); // Salva a posição imediatamente
    } catch (e) {
      console.error('Failed to get window position on close:', e);
    }
  });

  // Salvar posição da janela quando movida
  win.on('moved', () => {
    try {
      const [x, y] = win.getPosition();
      config.x = x;
      config.y = y;
      // Debounce para não salvar a cada pixel movido
      if (win._moveTimer) clearTimeout(win._moveTimer);
      win._moveTimer = setTimeout(() => saveConfig(), 500);
    } catch (e) {
      console.error('Failed to get window position on move:', e);
    }
  });

  return win;
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Salva a configuração antes de sair
  saveConfig();
  try {
    telemetryInstance && telemetryInstance.stop && telemetryInstance.stop();
  } catch (_) {}
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
});

app.whenReady().then(() => {
  loadConfig();

  // Permitir acesso ao microfone sem prompt no overlay
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    if (permission === 'media') {
      return callback(true);
    }
    callback(false);
  });

  // --- Handlers IPC ---

  ipcMain.handle('overlay:transcribe', async (event, payload) => {
    try {
      const { audioArrayBuffer, mimeType } = payload || {};
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return { ok: false, error: 'API Key ausente' };
      }
      if (!audioArrayBuffer) {
        return { ok: false, error: 'Áudio vazio' };
      }

      if (config.provider === 'google') {
        const model = 'gemini-1.5-flash';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const base64 = Buffer.from(Buffer.from(audioArrayBuffer)).toString('base64');
        const prompt = [
          'Você é um reconhecedor de comandos por voz em português do Brasil.',
          'Só ative comandos quando a frase contiver explícita e claramente a palavra "central" seguida do comando.',
          'Ouça o áudio e retorne apenas um dos tokens a seguir, sem texto adicional:',
          'truck_status (para: "central status do caminhão" ou "central status do caminhao"),',
          'cargo_status (para: "central status da carga"),',
          'back_default (para: "central voltar", "central retornar" ou "central inicial"),',
          'none (se a frase não contiver a palavra "central" antes do comando, se não entender, ou se for irrelevante).'
        ].join(' ');
        const body = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'audio/wav', data: base64 } },
              ],
            },
          ],
        };
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          return { ok: false, error: `HTTP ${resp.status}: ${txt}` };
        }
        const data = await resp.json();
        let textOut = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().toLowerCase();
        textOut = textOut.replace(/[^a-z_]/g, '');
        const allowed = new Set(['truck_status', 'cargo_status', 'back_default', 'none']);
        const command = allowed.has(textOut) ? textOut : 'none';
        return { ok: true, command };
      } else {
        const contentType = mimeType || 'audio/webm';
        const filename = contentType.includes('wav') ? 'audio.wav' : 'audio.webm';
        const blob = new Blob([Buffer.from(audioArrayBuffer)], { type: contentType });
        const form = new FormData();
        form.append('file', blob, filename);
        form.append('model', 'whisper-1');
        form.append('language', 'pt');
        const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          return { ok: false, error: `HTTP ${resp.status}: ${txt}` };
        }
        const data = await resp.json();
        return { ok: true, text: data.text || '' };
      }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  ipcMain.handle('overlay:config:setApiKey', (event, key) => {
    config.apiKey = (key || '').trim() || null;
    saveConfig(); // Salva imediatamente ao mudar a chave
    return { ok: true };
  });

  ipcMain.handle('overlay:config:getApiKeySaved', () => {
    return { ok: true, saved: !!(config.apiKey && config.apiKey.trim()) };
  });

  ipcMain.handle('overlay:config:setProvider', (event, next) => {
    if (next === 'google' || next === 'openai') {
      config.provider = next;
      saveConfig(); // Salva imediatamente ao mudar o provedor
    }
    return { ok: true, provider: config.provider };
  });

  ipcMain.handle('overlay:config:getProvider', () => {
    return { ok: true, provider: config.provider };
  });

  // Handlers para estado da aplicação
  ipcMain.handle('overlay:state:save', (event, state) => {
    try {
      if (state.view && ['default', 'truck', 'cargo'].includes(state.view)) {
        config.view = state.view;
      }
      if (typeof state.focus === 'boolean') {
        config.focus = state.focus;
      }
      saveConfig();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  ipcMain.handle('overlay:state:get', () => {
    return { ok: true, state: { view: config.view, focus: config.focus } };
  });

  ipcMain.handle('overlay:telemetry:getLatest', () => {
    return { ok: true, data: latestTelemetry };
  });

  ipcMain.handle('stripe:checkout', async (event, priceId) => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      shell.openExternal(session.url);

      return { ok: true, sessionId: session.id };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('overlay:window:resize', (event, payload) => {
    try {
      const { width, height } = payload || {};
      const bw = BrowserWindow.fromWebContents(event.sender);
      if (!bw) return { ok: false, error: 'BrowserWindow ausente' };
      const w = Math.max(140, Math.min(800, Math.round(Number(width) || 0)));
      const h = Math.max(140, Math.min(1000, Math.round(Number(height) || 0)));
      bw.setContentSize(w, h, false);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  // Inicializa telemetria do ETS2/ATS
  try {
    const TelemetryPkg = require('trucksim-telemetry');
    telemetryInstance = TelemetryPkg();
    if (telemetryInstance && typeof telemetryInstance.watch === 'function') {
      telemetryInstance.watch({ interval: 100 }, (data) => {
        latestTelemetry = data;
        for (const bw of BrowserWindow.getAllWindows()) {
          try { bw.webContents.send('overlay:telemetry:update', data); } catch (_) {}
        }
      });
    } else {
      telemetryInitErrorMessage = 'Falha ao inicializar trucksim-telemetry (API inesperada).';
    }
  } catch (e) {
    telemetryInitErrorMessage = `trucksim-telemetry indisponível: ${e && e.message ? e.message : e}`;
  }

  const win = createWindow();

  // Hotkeys globais
  try {
    const broadcastView = (view) => {
      for (const bw of BrowserWindow.getAllWindows()) {
        try { bw.webContents.send('overlay:view:set', view); } catch (_) {}
      }
    };
    globalShortcut.register('Control+Alt+1', () => broadcastView('default'));
    globalShortcut.register('Control+Alt+2', () => broadcastView('truck'));
    globalShortcut.register('Control+Alt+3', () => broadcastView('cargo'));
    globalShortcut.register('Control+Alt+H', () => {
      for (const bw of BrowserWindow.getAllWindows()) {
        try { bw.webContents.send('overlay:focus:toggle'); } catch (_) {}
      }
    });
  } catch (_) {}

  win.webContents.once('did-finish-load', () => {
    if (telemetryInitErrorMessage) {
      win.webContents.send('overlay:telemetry:error', telemetryInitErrorMessage);
    } else if (latestTelemetry) {
      win.webContents.send('overlay:telemetry:update', latestTelemetry);
    }
    // Envia estado inicial para o renderer
    win.webContents.send('overlay:state:init', { view: config.view, focus: config.focus });
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});