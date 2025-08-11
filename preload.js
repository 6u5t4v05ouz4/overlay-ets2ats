const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  // State management
  saveState: async (state) => {
    return ipcRenderer.invoke('overlay:state:save', state);
  },
  getState: async () => {
    return ipcRenderer.invoke('overlay:state:get');
  },
  onInitState: (handler) => {
    const listener = (_, state) => handler && handler(state);
    ipcRenderer.on('overlay:state:init', listener);
    return () => ipcRenderer.removeListener('overlay:state:init', listener);
  },

  // Transcription and config
  transcribe: async (audioArrayBuffer, mimeType) => {
    return ipcRenderer.invoke('overlay:transcribe', { audioArrayBuffer, mimeType });
  },
  setApiKey: async (key) => {
    return ipcRenderer.invoke('overlay:config:setApiKey', key);
  },
  hasSavedApiKey: async () => {
    return ipcRenderer.invoke('overlay:config:getApiKeySaved');
  },
  setProvider: async (provider) => {
    return ipcRenderer.invoke('overlay:config:setProvider', provider);
  },
  getProvider: async () => {
    return ipcRenderer.invoke('overlay:config:getProvider');
  },

  // Telemetry
  onTelemetryUpdate: (handler) => {
    const listener = (_, data) => handler && handler(data);
    ipcRenderer.on('overlay:telemetry:update', listener);
    return () => ipcRenderer.removeListener('overlay:telemetry:update', listener);
  },
  onTelemetryError: (handler) => {
    const listener = (_, err) => handler && handler(err);
    ipcRenderer.on('overlay:telemetry:error', listener);
    return () => ipcRenderer.removeListener('overlay:telemetry:error', listener);
  },
  getLatestTelemetry: async () => {
    return ipcRenderer.invoke('overlay:telemetry:getLatest');
  },

  // UI control
  onSetView: (handler) => {
    const listener = (_, view) => handler && handler(view);
    ipcRenderer.on('overlay:view:set', listener);
    return () => ipcRenderer.removeListener('overlay:view:set', listener);
  },
  onToggleFocus: (handler) => {
    const listener = () => handler && handler();
    ipcRenderer.on('overlay:focus:toggle', listener);
    return () => ipcRenderer.removeListener('overlay:focus:toggle', listener);
  },
  resizeTo: async (width, height) => {
    return ipcRenderer.invoke('overlay:window:resize', { width, height });
  },

  // Stripe
  stripeCheckout: async (priceId) => {
    return ipcRenderer.invoke('stripe:checkout', priceId);
  },
});