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
      height: 840,
      minWidth: 800,
      minHeight: 820,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#1a1a1a',
      autoHideMenuBar: true,
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
