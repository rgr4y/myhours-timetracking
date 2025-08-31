// Browser shim for electronAPI - only loaded in development when running in browser
// This provides a compatible API for Playwright testing

class BrowserElectronAPI {
  constructor() {
    this.isElectron = false;
    this.isBrowser = true;
    console.log('[BROWSER-SHIM] ElectronAPI shim initialized for browser debugging');
  }

  // Simple IPC invoke that forwards to our API endpoint
  async invoke(channel, ...args) {
    try {
      const response = await fetch(`/api/ipc/${encodeURIComponent(channel)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ args })
      });

      if (!response.ok) {
        throw new Error(`IPC call failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'IPC call failed');
      }

      return result.data;
    } catch (error) {
      console.error('[BROWSER-SHIM] IPC Error:', error);
      throw error;
    }
  }

  // Database operations - mirroring the structure from preload.js
  clients = {
    getAll: () => this.invoke('db:getClients'),
    getAllWithRelationships: () => this.invoke('db:getClientsWithRelationships'),
    create: (client) => this.invoke('db:createClient', client),
    update: (id, client) => this.invoke('db:updateClient', id, client),
    delete: (id) => this.invoke('db:deleteClient', id)
  };

  projects = {
    getAll: (clientId) => this.invoke('db:getProjects', clientId),
    create: (project) => this.invoke('db:createProject', project),
    update: (id, project) => this.invoke('db:updateProject', id, project),
    delete: (id) => this.invoke('db:deleteProject', id)
  };

  tasks = {
    getAll: (projectId) => this.invoke('db:getTasks', projectId),
    create: (task) => this.invoke('db:createTask', task),
    update: (id, task) => this.invoke('db:updateTask', id, task),
    delete: (id) => this.invoke('db:deleteTask', id)
  };

  timeEntries = {
    getAll: (filters = {}) => this.invoke('db:getTimeEntries', filters),
    create: (entry) => this.invoke('db:createTimeEntry', entry),
    update: (id, data) => this.invoke('db:updateTimeEntry', id, data),
    delete: (id) => this.invoke('db:deleteTimeEntry', id),
    startTimer: (clientId, description) => this.invoke('db:startTimer', clientId, description),
    stopTimer: (entryId, roundTo) => this.invoke('db:stopTimer', entryId, roundTo),
    resumeTimer: (entryId) => this.invoke('db:resumeTimer', entryId),
    getActiveTimer: () => this.invoke('db:getActiveTimer'),
    markAsInvoiced: (entryIds, invoiceId) => this.invoke('db:markAsInvoiced', entryIds, invoiceId)
  };

  reports = {
    get: (type, params) => this.invoke('db:getReports', type, params)
  };

  settings = {
    get: () => this.invoke('db:getSettings'),
    update: (settings) => this.invoke('db:updateSettings', settings),
    getLastUsedClient: () => this.invoke('db:getLastUsedClient'),
    getLastUsedProject: () => this.invoke('db:getLastUsedProject'),
    getLastUsedTask: () => this.invoke('db:getLastUsedTask')
  };

  invoices = {
    getAll: () => this.invoke('db:getInvoices'),
    generate: (data) => this.invoke('invoice:generate', data),
    download: (id) => this.invoke('invoice:download', id),
    delete: (id) => this.invoke('db:deleteInvoice', id)
  };

  export = {
    csv: (data) => this.invoke('export:csv', data),
    json: (data) => this.invoke('export:json', data)
  };

  // App helpers - simplified for browser
  openExternal = (url) => {
    window.open(url, '_blank');
    return Promise.resolve();
  };

  window = {
    getSize: () => Promise.resolve({ width: window.innerWidth, height: window.innerHeight }),
    onResize: (callback) => {
      window.addEventListener('resize', callback);
    },
    removeResizeListener: (callback) => {
      window.removeEventListener('resize', callback);
    }
  };

  // Tray-related methods - no-op for browser
  tray = {
    updateTimerStatus: () => Promise.resolve()
  };

  // Event listeners - simplified for browser
  on = (channel, callback) => {
    console.log(`[BROWSER-SHIM] Event listener added for ${channel} (no-op in browser)`);
  };

  removeListener = (channel, callback) => {
    console.log(`[BROWSER-SHIM] Event listener removed for ${channel} (no-op in browser)`);
  };
}

// Auto-detect environment and set up appropriate API
function setupElectronAPI() {
  // Check if we're running in Electron
  if (typeof window !== 'undefined' && window.electronAPI) {
    // Already have electronAPI, no need to shim
    return;
  }

  // Check if we're in a browser environment (not Electron)
  if (typeof window !== 'undefined' && !window.electronAPI && process.env.NODE_ENV === 'development') {
    // Only in development and only if electronAPI doesn't exist
    console.log('[BROWSER-SHIM] Detected browser environment, setting up electronAPI shim');
    window.electronAPI = new BrowserElectronAPI();
  }
}

// Only export in browser environments
if (typeof window !== 'undefined') {
  window.setupElectronAPIShim = setupElectronAPI;
  
  // Auto-setup when script loads
  setupElectronAPI();
}

export default BrowserElectronAPI;
