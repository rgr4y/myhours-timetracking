const { contextBridge, ipcRenderer } = require('electron');

console.info('[RNDR->PRELOAD] Script executing...');

// Constants
const VALID_TRAY_CHANNELS = [
  'tray-start-timer',
  'tray-stop-timer',
  'tray-quick-start-timer',
  'tray-show-timer-setup',
  'tray-open-settings'
];

// Determine dev mode without relying on main-process `app` (not available here)
// Works in both dev and packaged builds
const isDev = (
  process.env.ELECTRON_IS_DEV === '1' ||
  process.env.NODE_ENV === 'development' ||
  Boolean(process.defaultApp)
);

const api = {
  // Database operations
  clients: {
    getAll: () => ipcRenderer.invoke('db:getClients'),
    getAllWithRelationships: () => ipcRenderer.invoke('db:getClientsWithRelationships'),
    create: (client) => ipcRenderer.invoke('db:createClient', client),
    update: (id, client) => ipcRenderer.invoke('db:updateClient', id, client),
    delete: (id) => ipcRenderer.invoke('db:deleteClient', id)
  },
  
  projects: {
    getAll: (clientId) => ipcRenderer.invoke('db:getProjects', clientId),
    create: (project) => ipcRenderer.invoke('db:createProject', project),
    update: (id, project) => ipcRenderer.invoke('db:updateProject', id, project),
    delete: (id) => ipcRenderer.invoke('db:deleteProject', id),
    getDefault: (clientId) => ipcRenderer.invoke('db:getDefaultProject', clientId)
  },
  
  tasks: {
    getAll: (projectId) => ipcRenderer.invoke('db:getTasks', projectId),
    create: (task) => ipcRenderer.invoke('db:createTask', task),
    update: (id, task) => ipcRenderer.invoke('db:updateTask', id, task),
    delete: (id) => ipcRenderer.invoke('db:deleteTask', id)
  },
  
  timeEntries: {
    getAll: (filters = {}) => {
      // logger.log('[RNDR->PRELOAD] timeEntries.getAll called with filters:', filters);
      return ipcRenderer.invoke('db:getTimeEntries', filters);
    },
    create: (entry) => ipcRenderer.invoke('db:createTimeEntry', entry),
    update: (id, data) => ipcRenderer.invoke('db:updateTimeEntry', id, data),
    delete: (id) => ipcRenderer.invoke('db:deleteTimeEntry', id),
    startTimer: (clientId, description) => ipcRenderer.invoke('db:startTimer', clientId, description),
    stopTimer: (entryId, roundTo) => ipcRenderer.invoke('db:stopTimer', entryId, roundTo),
    resumeTimer: (entryId) => ipcRenderer.invoke('db:resumeTimer', entryId),
    getActiveTimer: () => ipcRenderer.invoke('db:getActiveTimer'),
    markAsInvoiced: (entryIds, invoiceId) => ipcRenderer.invoke('db:markAsInvoiced', entryIds, invoiceId)
  },
  
  reports: {
    get: (type, params) => ipcRenderer.invoke('db:getReports', type, params)
  },
  
  settings: {
    get: () => ipcRenderer.invoke('db:getSettings'),
    update: (settings) => ipcRenderer.invoke('db:updateSettings', settings),
    getLastUsedClient: () => ipcRenderer.invoke('db:getLastUsedClient'),
    getLastUsedProject: () => ipcRenderer.invoke('db:getLastUsedProject'),
    getLastUsedTask: () => ipcRenderer.invoke('db:getLastUsedTask')
  },
  
  invoices: {
    getAll: () => ipcRenderer.invoke('db:getInvoices'),
    generate: (data) => ipcRenderer.invoke('invoice:generate', data),
    generateFromSelected: (data) => ipcRenderer.invoke('invoice:generateFromSelected', data),
    download: (id) => ipcRenderer.invoke('invoice:download', id),
    view: (id) => ipcRenderer.invoke('invoice:view', id),
    regenerate: (id) => ipcRenderer.invoke('invoice:regenerate', id),
    delete: (id) => ipcRenderer.invoke('db:deleteInvoice', id)
  },
  
  export: {
    csv: (data) => ipcRenderer.invoke('export:csv', data),
    json: (data) => ipcRenderer.invoke('export:json', data)
  },

  // App helpers
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  window: {
    getSize: () => ipcRenderer.invoke('app:getWindowSize'),
    onResize: (callback) => {
      if (typeof callback === 'function') {
        ipcRenderer.on('app:window-resize', callback);
      }
    },
    removeResizeListener: (callback) => {
      if (typeof callback === 'function') {
        ipcRenderer.removeListener('app:window-resize', callback);
      }
    }
  },

  // Tray-related methods
  tray: {
    updateTimerStatus: (timerData) => ipcRenderer.send('tray:timer-status-changed', timerData)
  },

  // Event listeners for tray events
  on: (channel, callback) => {
    if (VALID_TRAY_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  removeListener: (channel, callback) => {
    if (VALID_TRAY_CHANNELS.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },

  // Direct IPC invoke method for flexibility
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // Console forwarding for renderer logger
  console: {
    log: (...args) => ipcRenderer.send('console:log', 'log', ...args),
    info: (...args) => ipcRenderer.send('console:log', 'info', ...args),
    warn: (...args) => ipcRenderer.send('console:log', 'warn', ...args),
    error: (...args) => ipcRenderer.send('console:log', 'error', ...args),
    debug: (...args) => ipcRenderer.send('console:log', 'debug', ...args)
  }
};

// Updater API (macOS only; dev uses mock, prod uses native)
const updaterListenerMap = new Map();
api.updater = {
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  onEvent: (callback) => {
    if (typeof callback === 'function') {
      const wrapper = (_event, data) => callback(data);
      updaterListenerMap.set(callback, wrapper);
      ipcRenderer.on('updater:event', wrapper);
    }
  },
  removeEventListener: (callback) => {
    const wrapper = updaterListenerMap.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener('updater:event', wrapper);
      updaterListenerMap.delete(callback);
    }
  }
};

// Expose the API to the renderer process
if (!isDev) {
  api.console.log('Exposing electronAPI to main world...');
  api.console.log('API object:', JSON.stringify(Object.keys(api), null, 2));
}

contextBridge.exposeInMainWorld('electronAPI', api);

if (isDev) {
  api.console.log('[RNDR->PRELOAD] electronAPI exposed successfully');

  setTimeout(() => {
    api.console.log("[RNDR->PRELOAD] ✅ electronAPI exposed and ready");
  }, 10);
}
