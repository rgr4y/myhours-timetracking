const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] Script executing...');

// Constants
const VALID_TRAY_CHANNELS = [
  'tray-start-timer',
  'tray-stop-timer',
  'tray-quick-start-timer',
  'tray-show-timer-setup',
  'tray-open-settings'
];

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Forward console logs to main process using proper one-way IPC
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Simple one-way console forwarding
console.log = (...args) => {
  originalConsole.log(...args);
  const message = args.map(arg => 
    typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  ipcRenderer.send('console:log', 'log', message);
};

console.error = (...args) => {
  originalConsole.error(...args);
  const message = args.map(arg => 
    typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  ipcRenderer.send('console:log', 'error', message);
};

console.warn = (...args) => {
  originalConsole.warn(...args);
  const message = args.map(arg => 
    typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  ipcRenderer.send('console:log', 'warn', message);
};

console.info = (...args) => {
  originalConsole.info(...args);
  const message = args.map(arg => 
    typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  ipcRenderer.send('console:log', 'info', message);
};

const api = {
  // Database operations
  clients: {
    getAll: () => ipcRenderer.invoke('db:getClients'),
    create: (client) => ipcRenderer.invoke('db:createClient', client),
    update: (id, client) => ipcRenderer.invoke('db:updateClient', id, client),
    delete: (id) => ipcRenderer.invoke('db:deleteClient', id)
  },
  
  projects: {
    getAll: (clientId) => ipcRenderer.invoke('db:getProjects', clientId),
    create: (project) => ipcRenderer.invoke('db:createProject', project),
    update: (id, project) => ipcRenderer.invoke('db:updateProject', id, project),
    delete: (id) => ipcRenderer.invoke('db:deleteProject', id)
  },
  
  tasks: {
    getAll: (projectId) => ipcRenderer.invoke('db:getTasks', projectId),
    create: (task) => ipcRenderer.invoke('db:createTask', task),
    update: (id, task) => ipcRenderer.invoke('db:updateTask', id, task),
    delete: (id) => ipcRenderer.invoke('db:deleteTask', id)
  },
  
  timeEntries: {
    getAll: (filters) => {
      console.log('[PRELOAD] timeEntries.getAll called with filters:', filters);
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
    update: (settings) => ipcRenderer.invoke('db:updateSettings', settings)
  },
  
  invoices: {
    getAll: () => ipcRenderer.invoke('db:getInvoices'),
    generate: (data) => ipcRenderer.invoke('invoice:generate', data),
    download: (id) => ipcRenderer.invoke('invoice:download', id),
    delete: (id) => ipcRenderer.invoke('db:deleteInvoice', id)
  },
  
  export: {
    csv: (data) => ipcRenderer.invoke('export:csv', data),
    json: (data) => ipcRenderer.invoke('export:json', data)
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
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
};

// Expose the API to the renderer process
if (!isDev) {
  console.log('Exposing electronAPI to main world...');
  console.log('API object:', JSON.stringify(Object.keys(api), null, 2));
}

contextBridge.exposeInMainWorld('electronAPI', api);

if (isDev) console.log('[PRELOAD] electronAPI exposed successfully');

// Add a small delay and then verify the exposure worked
if (isDev) {
  setTimeout(() => {
    console.log("[PRELOAD] ✅ electronAPI exposed and ready");
  }, 10);
}
