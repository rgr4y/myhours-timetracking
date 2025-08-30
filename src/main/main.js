const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');

console.log('[MAIN] === MAIN PROCESS STARTING ===');
console.log('[MAIN] Node version:', process.version);
console.log('[MAIN] Electron version:', process.versions.electron);
console.log('[MAIN] Working directory:', process.cwd());

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
console.log('[MAIN] Development mode:', isDev);

// Enhanced logging for development
if (isDev) {
  // Enable more verbose logging
  if (process.env.ELECTRON_ENABLE_LOGGING) {
    console.log('[MAIN] Enhanced logging enabled');
    
    // Log unhandled errors
    process.on('uncaughtException', (error) => {
      console.error('[MAIN] Uncaught Exception:', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[MAIN] Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }
  
}

const DatabaseService = require('./database-service');
const InvoiceGenerator = require('./invoice-generator');

// Platform-specific tray services
let TrayService = null;
if (process.platform === 'darwin') {
  TrayService = require('./services/tray-macos');
} else if (process.platform === 'win32') {
  TrayService = require('./services/tray-windows');
}

class MyHoursApp {
  constructor() {
    this.mainWindow = null;
    this.database = null;
    this.invoiceGenerator = null;
    this.trayService = null;
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 840,
      minWidth: 800,
      minHeight: 820,
      title: 'myHours',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      // Use the default title bar on macOS to ensure traffic lights and window title are visible
      titleBarStyle: 'default',
      backgroundColor: '#1a1a1a',
      autoHideMenuBar: true,
      show: false
    });

    // Open external links in the user's default browser
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        try { shell.openExternal(url); } catch (_) {}
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (/^https?:\/\//i.test(url)) {
        event.preventDefault();
        try { shell.openExternal(url); } catch (_) {}
      }
    });

    // Load the app
    if (isDev) {
      console.log('[MAIN] Loading app in development mode...');
      console.log('[MAIN] Loading URL: http://localhost:3000');
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../renderer/build/index.html');
      console.log('[MAIN] Loading production file:', indexPath);
      const fs = require('fs');
      console.log('[MAIN] index.html exists?', fs.existsSync(indexPath));
      this.mainWindow.loadFile(indexPath);
    }

    this.mainWindow.once('ready-to-show', () => {
      console.log('[MAIN] Window ready to show');
      // Ensure the window title stays consistent regardless of document.title
      try {
        this.mainWindow.setTitle('myHours');
      } catch (e) {}
      this.mainWindow.show();
    });

    // Prevent renderer from overriding the window title
    this.mainWindow.on('page-title-updated', (event) => {
      event.preventDefault();
      try {
        this.mainWindow.setTitle('myHours');
      } catch (e) {}
    });

    // Helpful diagnostics if the renderer fails to load
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[MAIN] did-fail-load:', { errorCode, errorDescription, validatedURL });
    });
    this.mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('[MAIN] render-process-gone:', details);
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // macOS-specific window behavior
    if (process.platform === 'darwin') {
      // Prevent window from closing, hide instead
      this.mainWindow.on('close', (event) => {
        if (this.trayService && this.trayService.preventWindowClose()) {
          event.preventDefault();
          this.mainWindow.hide();
        }
      });

      // Show window when activated from dock
      app.on('activate', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
        }
      });
    }
  }

  setupIPC() {
    // Database operations
    ipcMain.handle('app:getVersion', async () => {
      try {
        return app.getVersion();
      } catch (e) {
        return '0.0.0';
      }
    });

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

    ipcMain.handle('db:updateProject', async (event, id, project) => {
      try {
        return await this.database.updateProject(id, project);
      } catch (error) {
        console.error('[MAIN] IPC: Error updating project:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteProject', async (event, id) => {
      try {
        return await this.database.deleteProject(id);
      } catch (error) {
        console.error('[MAIN] IPC: Error deleting project:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getTasks', async (event, projectId) => {
      try {
        // console.log('[MAIN] IPC: Getting tasks for project:', projectId);
        const tasks = await this.database.getTasks(projectId);
        // console.log('[MAIN] IPC: Returning', tasks.length, 'tasks');
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

    ipcMain.handle('db:updateTask', async (event, id, task) => {
      try {
        return await this.database.updateTask(id, task);
      } catch (error) {
        console.error('[MAIN] IPC: Error updating task:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteTask', async (event, id) => {
      try {
        return await this.database.deleteTask(id);
      } catch (error) {
        console.error('[MAIN] IPC: Error deleting task:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getTimeEntries', async (event, filters) => {
      // console.log('[MAIN] IPC: Getting time entries with filters:', filters);
      try {
        const entries = await this.database.getTimeEntries(filters);
        // console.log('[MAIN] IPC: Returning', entries.length, 'time entries');
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
        // Save last used project/task if provided
        if (data.projectId) {
          await this.database.setSetting('lastUsedProjectId', data.projectId.toString());
        }
        if (data.taskId) {
          await this.database.setSetting('lastUsedTaskId', data.taskId.toString());
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

    ipcMain.handle('db:resumeTimer', async (event, entryId) => {
      console.log('[MAIN] IPC: Resuming timer with ID:', entryId);
      try {
        const entry = await this.database.resumeTimer(entryId);
        console.log('[MAIN] IPC: Timer resumed successfully:', JSON.stringify(entry, null, 2));
        return entry;
      } catch (error) {
        console.error('[MAIN] IPC: Error resuming timer:', error);
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
    
    ipcMain.handle('db:getLastUsedProject', async () => {
      try {
        const lastProjectId = await this.database.getSetting('lastUsedProjectId');
        if (lastProjectId) {
          // Search across clients' projects
          const clients = await this.database.getClients();
          for (const client of clients) {
            const proj = (client.projects || []).find(p => p.id === parseInt(lastProjectId));
            if (proj) return proj;
          }
        }
        return null;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting last used project:', error);
        return null;
      }
    });

    ipcMain.handle('db:getLastUsedTask', async () => {
      try {
        const lastTaskId = await this.database.getSetting('lastUsedTaskId');
        if (lastTaskId) {
          const clients = await this.database.getClients();
          for (const client of clients) {
            for (const project of client.projects || []) {
              const task = (project.tasks || []).find(t => t.id === parseInt(lastTaskId));
              if (task) return task;
            }
          }
        }
        return null;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting last used task:', error);
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
          'invoice_template',
          'invoice_terms'
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

    // Danger ops: remove demo/seed data
    ipcMain.handle('db:removeDemoData', async () => {
      try {
        const result = await this.database.removeDemoData();
        return result;
      } catch (error) {
        console.error('[MAIN] Error removing demo data:', error);
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

    // Dev-only: re-run Prisma seed script against the dev SQLite DB
    ipcMain.handle('dev:runSeed', async () => {
      try {
        if (app.isPackaged) {
          throw new Error('Seeding is only available in development.');
        }
        const { execFile } = require('child_process');
        const path = require('path');
        const projectRoot = path.join(__dirname, '..', '..');
        const seedPath = path.join(projectRoot, 'prisma', 'seed.js');
        const env = {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          DATABASE_URL: `file:${path.join(projectRoot, 'prisma', 'myhours.db')}`,
        };
        await new Promise((resolve, reject) => {
          const child = execFile(process.execPath, [seedPath], { env, cwd: projectRoot }, (err) => {
            if (err) return reject(err);
            resolve();
          });
          child.stdout?.on('data', (d) => console.log('[SEED]', d.toString().trim()));
          child.stderr?.on('data', (d) => console.error('[SEED]', d.toString().trim()));
        });
        return { success: true };
      } catch (error) {
        console.error('[MAIN] dev:runSeed error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db:getInvoices', async () => {
      try {
        const invoices = await this.database.getInvoices();
        console.log('[MAIN] IPC: Got invoices:', invoices.length);
        return invoices;
      } catch (error) {
        console.error('[MAIN] IPC: Error getting invoices:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteInvoice', async (event, id) => {
      try {
        const result = await this.database.deleteInvoice(id);
        console.log('[MAIN] IPC: Invoice deleted:', id);
        return result;
      } catch (error) {
        console.error('[MAIN] IPC: Error deleting invoice:', error);
        throw error;
      }
    });

    // Invoice operations
    ipcMain.handle('invoice:generate', async (event, data) => {
      try {
        console.log('[MAIN] invoice:generate called with data:', data);
        const filePath = await this.invoiceGenerator.generateInvoice(data);
        return { success: true, filePath };
      } catch (error) {
        console.log('[MAIN] invoice:generate error:', error.message);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('invoice:download', async (event, invoiceId) => {
      try {
        console.log('[MAIN] invoice:download called with invoiceId:', invoiceId);
        // Get the invoice data from database
        const invoice = await this.database.getInvoiceById(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        // Generate the PDF using the existing invoice data
        const filePath = await this.invoiceGenerator.generateInvoicePDF(invoice);
        
        // Show save dialog
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: 'Save Invoice',
          defaultPath: `Invoice-${invoice.invoiceNumber}.pdf`,
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          // Copy the generated file to the chosen location
          const fs = require('fs').promises;
          await fs.copyFile(filePath, result.filePath);
          console.log('[MAIN] invoice:download completed successfully');
          return { success: true, filePath: result.filePath };
        } else {
          console.log('[MAIN] invoice:download cancelled by user');
          return { success: false, error: 'Download cancelled' };
        }
      } catch (error) {
        console.error('[MAIN] Error downloading invoice:', error);
        return { success: false, error: error.message };
      }
    });

    // Export operations
    ipcMain.handle('export:csv', async (event, filters) => {
      try {
        const { dialog } = require('electron');
        
        // Get time entries based on filters
        const timeEntries = await this.database.getTimeEntries(filters || {});
        
        // Convert to CSV format
        const csvHeader = 'Date,Client,Project,Task,Description,Duration (hours),Start Time,End Time,Hourly Rate,Amount\n';
        const csvRows = timeEntries.map(entry => {
          const date = new Date(entry.startTime).toLocaleDateString();
          const client = entry.client?.name || '';
          const project = entry.project?.name || '';
          const task = entry.task?.name || '';
          const description = (entry.description || '').replace(/"/g, '""'); // Escape quotes
          const hours = ((entry.duration || 0) / 60).toFixed(2);
          const startTime = new Date(entry.startTime).toLocaleString();
          const endTime = entry.endTime ? new Date(entry.endTime).toLocaleString() : '';
          const hourlyRate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          const amount = (hours * hourlyRate).toFixed(2);
          
          return `"${date}","${client}","${project}","${task}","${description}","${hours}","${startTime}","${endTime}","${hourlyRate}","${amount}"`;
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        // Show save dialog
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: 'Export Time Entries to CSV',
          defaultPath: `time-entries-${new Date().toISOString().split('T')[0]}.csv`,
          filters: [
            { name: 'CSV Files', extensions: ['csv'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          const fs = require('fs').promises;
          await fs.writeFile(result.filePath, csvContent, 'utf8');
          return { success: true, filePath: result.filePath, entriesCount: timeEntries.length };
        } else {
          return { success: false, error: 'Export cancelled' };
        }
      } catch (error) {
        console.error('[MAIN] Error exporting to CSV:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('export:json', async (event, filters) => {
      try {
        const { dialog } = require('electron');
        
        // Get time entries based on filters
        const timeEntries = await this.database.getTimeEntries(filters || {});
        
        // Format data for JSON export
        const exportData = {
          exportDate: new Date().toISOString(),
          filters: filters || {},
          entriesCount: timeEntries.length,
          timeEntries: timeEntries.map(entry => ({
            id: entry.id,
            date: new Date(entry.startTime).toLocaleDateString(),
            client: entry.client?.name || null,
            project: entry.project?.name || null,
            task: entry.task?.name || null,
            description: entry.description || null,
            startTime: entry.startTime,
            endTime: entry.endTime,
            duration: entry.duration,
            durationHours: ((entry.duration || 0) / 60).toFixed(2),
            hourlyRate: entry.project?.hourlyRate || entry.client?.hourlyRate || 0,
            amount: (((entry.duration || 0) / 60) * (entry.project?.hourlyRate || entry.client?.hourlyRate || 0)).toFixed(2),
            isInvoiced: entry.isInvoiced,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
          }))
        };
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        
        // Show save dialog
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: 'Export Time Entries to JSON',
          defaultPath: `time-entries-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          const fs = require('fs').promises;
          await fs.writeFile(result.filePath, jsonContent, 'utf8');
          return { success: true, filePath: result.filePath, entriesCount: timeEntries.length };
        } else {
          return { success: false, error: 'Export cancelled' };
        }
      } catch (error) {
        console.error('[MAIN] Error exporting to JSON:', error);
        return { success: false, error: error.message };
      }
    });

    // Tray-related IPC handlers
    ipcMain.on('tray:timer-status-changed', (event, timerData) => {
      console.log('[MAIN] Timer status changed:', timerData);
      if (this.trayService) {
        this.trayService.updateTimerStatus(timerData);
        
        // Start/stop timer updates
        if (timerData) {
          this.trayService.startTimerUpdates();
        } else {
          this.trayService.stopTimerUpdates();
        }
      }
    });

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

    // Initialize tray service (cross-platform)
    if (TrayService) {
      this.trayService = new TrayService(this.mainWindow, this.database);
      const trayInitialized = this.trayService.initialize();
      if (trayInitialized) {
        console.log(`[MAIN] Tray service initialized for ${process.platform}`);
      } else {
        console.warn(`[MAIN] Failed to initialize tray service for ${process.platform}`);
      }
    } else {
      console.log(`[MAIN] No tray service available for platform: ${process.platform}`);
    }

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

    // Handle app quit
    app.on('before-quit', () => {
      if (this.trayService) {
        this.trayService.isQuitting = true;
      }
    });

    app.on('will-quit', () => {
      if (this.trayService) {
        this.trayService.destroy();
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
    ipcMain.handle('app:openExternal', async (_event, url) => {
      try {
        await shell.openExternal(url);
        return true;
      } catch (error) {
        console.error('[MAIN] Error opening external URL:', url, error);
        return false;
      }
    });
