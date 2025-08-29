const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executing...');

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

// Test console forwarding
console.log('Testing console forwarding from preload...');

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
    download: (id) => ipcRenderer.invoke('invoice:download', id)
  },
  
  export: {
    csv: (data) => ipcRenderer.invoke('export:csv', data),
    json: (data) => ipcRenderer.invoke('export:json', data)
  },

  // Direct IPC invoke method for flexibility
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
};

// Expose the API to the renderer process
console.log('Exposing electronAPI to main world...');
console.log('API object:', JSON.stringify(Object.keys(api), null, 2));
contextBridge.exposeInMainWorld('electronAPI', api);
console.log('electronAPI exposed successfully');

// Add a small delay and then verify the exposure worked
setTimeout(() => {
  console.log('✅ electronAPI exposed and ready');
}, 10);
