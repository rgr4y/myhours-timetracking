const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

console.log('[MAIN] === MAIN PROCESS STARTING ===');
console.log('[MAIN] Node version:', process.version);
console.log('[MAIN] Electron version:', process.versions.electron);
console.log('[MAIN] Working directory:', process.cwd());

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
console.log('[MAIN] Development mode:', isDev);

const DatabaseService = require('./database-service');
const InvoiceGenerator = require('./invoice-generator');

class MyHoursApp {
  constructor() {
    this.mainWindow = null;
    this.database = null;
    this.invoiceGenerator = null;
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#1a1a1a',
      show: false
    });

    // Load the app
    console.log('[MAIN] Loading app in development mode...');
    if (isDev) {
      console.log('[MAIN] Loading URL: http://localhost:3000');
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/build/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      console.log('[MAIN] Window ready to show');
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIPC() {
    // Database operations
    ipcMain.handle('db:getClients', async () => {
      try {
        const clients = await this.database.getClients();
        return clients;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting clients:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:createClient', async (event, client) => {
      console.log('[MAIN] IPC: Creating client:', JSON.stringify(client, null, 2));
      try {
        const newClient = await this.database.createClient(client);
        console.log('[MAIN] IPC: Client created successfully:', JSON.stringify(newClient, null, 2));
        return newClient;
      } catch (error) {
        console.error('[MAIN] IPC: Error creating client:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:updateClient', async (event, id, client) => {
      try {
        return await this.database.updateClient(id, client);
      } catch (error) {
        console.error('[MAIN] IPC: Error updating client:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:deleteClient', async (event, id) => {
      try {
        return await this.database.deleteClient(id);
      } catch (error) {
        console.error('[MAIN] IPC: Error deleting client:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getProjects', async (event, clientId) => {
      try {
        return await this.database.getProjects(clientId);
      } catch (error) {
        console.error('[MAIN] IPC: Error getting projects:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:createProject', async (event, project) => {
      try {
        return await this.database.createProject(project);
      } catch (error) {
        console.error('[MAIN] IPC: Error creating project:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getTasks', async (event, projectId) => {
      try {
        console.log('[MAIN] IPC: Getting tasks for project:', projectId);
        const tasks = await this.database.getTasks(projectId);
        console.log('[MAIN] IPC: Returning', tasks.length, 'tasks');
        return tasks;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting tasks:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:createTask', async (event, task) => {
      try {
        return await this.database.createTask(task);
      } catch (error) {
        console.error('[MAIN] IPC: Error creating task:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getTimeEntries', async (event, filters) => {
      console.log('[MAIN] IPC: Getting time entries with filters:', filters);
      try {
        const entries = await this.database.getTimeEntries(filters);
        console.log('[MAIN] IPC: Returning', entries.length, 'time entries');
        return entries;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting time entries:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:createTimeEntry', async (event, data) => {
      try {
        console.log('[MAIN] IPC: Creating time entry with data:', data);
        return await this.database.createTimeEntry(data);
      } catch (error) {
        console.error('[MAIN] IPC: Error creating time entry:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:updateTimeEntry', async (event, id, data) => {
      try {
        console.log('[MAIN] IPC: Updating time entry with id:', id, 'data:', data);
        return await this.database.updateTimeEntry(id, data);
      } catch (error) {
        console.error('[MAIN] IPC: Error updating time entry:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:deleteTimeEntry', async (event, id) => {
      try {
        return await this.database.deleteTimeEntry(id);
      } catch (error) {
        console.error('[MAIN] IPC: Error deleting time entry:', error);
        throw error;
      }
    });
    ipcMain.handle('db:startTimer', async (event, data) => {
      console.log('[MAIN] IPC: Starting timer with data:', JSON.stringify(data, null, 2));
      try {
        const timer = await this.database.startTimer(data);
        
        // Save the last used client if provided
        if (data.clientId) {
          await this.database.setSetting('lastUsedClientId', data.clientId.toString());
        }
        
        console.log('[MAIN] IPC: Timer started successfully:', JSON.stringify(timer, null, 2));
        return timer;
      } catch (error) {
        console.error('[MAIN] IPC: Error starting timer:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:stopTimer', async (event, entryId) => {
      console.log('[MAIN] IPC: Stopping timer with ID:', entryId);
      try {
        const entry = await this.database.stopTimer(entryId);
        console.log('[MAIN] IPC: Timer stopped successfully:', JSON.stringify(entry, null, 2));
        return entry;
      } catch (error) {
        console.error('[MAIN] IPC: Error stopping timer:', error);
        throw error;
      }
    });
    ipcMain.handle('db:getActiveTimer', async () => {
      try {
        const activeTimer = await this.database.getActiveTimer();
        console.log('[MAIN] IPC: Active timer:', activeTimer ? 'found' : 'none');
        return activeTimer;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting active timer:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getLastUsedClient', async () => {
      try {
        // Get the last used client from settings or return null
        const lastClientId = await this.database.getSetting('lastUsedClientId');
        if (lastClientId) {
          const clients = await this.database.getClients();
          return clients.find(client => client.id === parseInt(lastClientId)) || null;
        }
        return null;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting last used client:', error);
        return null;
      }
    });
    // Settings operations (optional for now)
    ipcMain.handle('db:getSetting', async (event, key) => {
      try {
        return await this.database.getSetting(key);
      } catch (error) {
        console.error('[MAIN] IPC: Error getting setting:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:setSetting', async (event, key, value) => {
      try {
        return await this.database.setSetting(key, value);
      } catch (error) {
        console.error('[MAIN] IPC: Error setting value:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getSettings', async () => {
      try {
        // Get all settings and return as an object
        const settingKeys = [
          'company_name',
          'company_email', 
          'company_phone',
          'company_website',
          'timer_rounding',
          'invoice_template'
        ];
        
        const settingsObj = {};
        for (const key of settingKeys) {
          const value = await this.database.getSetting(key);
          if (value !== null) {
            settingsObj[key] = value;
          }
        }
        
        return settingsObj;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting settings:', error);
        throw error;
      }
    });

    ipcMain.handle('db:updateSettings', async (event, settings) => {
      try {
        // Update each setting individually
        for (const [key, value] of Object.entries(settings)) {
          await this.database.setSetting(key, value);
        }
        
        return { success: true };
      } catch (error) {
        console.error('[MAIN] IPC: Error updating settings:', error);
        throw error;
      }
    });

    // Invoice operations
    ipcMain.handle('invoice:generate', async (event, data) => {
      try {
        const filePath = await this.invoiceGenerator.generateInvoice(data);
        return { success: true, filePath };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Export operations (TODO: implement with new DatabaseService)
    // Temporarily removed until we implement export methods in DatabaseService

    // Console forwarding from renderer
    ipcMain.on('console:log', (event, level, ...args) => {
      const prefix = `[RENDERER-${level.toUpperCase()}]`;
      console.log(prefix, ...args);
    });
  }

  async initialize() {
    console.log('[MAIN] App initializing...');
    await app.whenReady();
    console.log('[MAIN] App ready');
    
    // Initialize database
    this.database = new DatabaseService();
    await this.database.initialize();
    console.log('[MAIN] Database initialized');
    
    // Initialize invoice generator
    this.invoiceGenerator = new InvoiceGenerator(this.database);
    
    // Setup IPC handlers
    this.setupIPC();
    console.log('[MAIN] IPC handlers set up');
    
    // Create main window
    await this.createWindow();
    console.log('[MAIN] Window created');

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createWindow();
      }
    });
  }
}

const myHoursApp = new MyHoursApp();

console.log('[MAIN] === STARTING APP INITIALIZATION ===');
myHoursApp.initialize().catch((error) => {
  console.error('[MAIN] === FATAL ERROR DURING INITIALIZATION ===');
  console.error('[MAIN] Error:', error);
  console.error('[MAIN] Stack:', error.stack);
  
  // Show an error dialog
  if (dialog) {
    dialog.showErrorBox('Startup Error', `Failed to start MyHours: ${error.message}`);
  }
  
  process.exit(1);
});
