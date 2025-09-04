const { ipcMain, dialog, app } = require('electron');
const logger = require('./logger-service');

class IpcService {
  constructor(mainWindow, database, invoiceGenerator, versionService) {
    this.mainWindow = mainWindow;
    this.database = database;
    this.invoiceGenerator = invoiceGenerator;
    this.versionService = versionService;
    this.trayService = null; // Will be set later
  }

  setTrayService(trayService) {
    this.trayService = trayService;
  }

  setupHandlers() {
    this.setupAppHandlers();
    this.setupDatabaseHandlers();
    this.setupInvoiceHandlers();
    this.setupExportHandlers();
    this.setupTrayHandlers();
    this.setupConsoleHandlers();
    this.setupDevHandlers();
  }

  setupAppHandlers() {
    // App version
    ipcMain.handle('app:getVersion', async () => {
      try {
        return this.versionService.getDisplayVersion();
      } catch (e) {
        logger.error('[VERSION] Error getting display version:', e);
        return this.versionService.getBaseVersion();
      }
    });

    // External URL handler
    ipcMain.handle('app:openExternal', async (_event, url) => {
      try {
        const { shell } = require('electron');
        await shell.openExternal(url);
        return true;
      } catch (error) {
        logger.error('[MAIN] Error opening external URL:', url, error);
        return false;
      }
    });

    // Window size helper
    ipcMain.handle('app:getWindowSize', async () => {
      try {
        if (this.mainWindow) {
          const { width, height } = this.mainWindow.getContentBounds();
          return { width, height };
        }
      } catch (e) {}
      return { width: 1200, height: 840 };
    });
  }

  setupDatabaseHandlers() {
    // Client operations
    ipcMain.handle('db:getClients', async () => {
      try {
        const clients = await this.database.getClients();
        return clients;
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting clients:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getClientsWithRelationships', async () => {
      try {
        // logger.main('debug', 'IPC: Getting clients with relationships');
        const clients = await this.database.getClients();
        // logger.main('info', 'IPC: Retrieved clients', { count: clients.length });
        return clients;
      } catch (error) {
        logger.main('error', 'IPC: Error getting clients with relationships', { error: error.message, stack: error.stack });
        throw error;
      }
    });
    
    ipcMain.handle('db:createClient', async (event, client) => {
      logger.debug('[MAIN] IPC: Creating client:', JSON.stringify(client, null, 2));
      try {
        const newClient = await this.database.createClient(client);
        logger.debug('[MAIN] IPC: Client created successfully:', JSON.stringify(newClient, null, 2));
        return newClient;
      } catch (error) {
        logger.error('[MAIN] IPC: Error creating client:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:updateClient', async (event, id, client) => {
      try {
        return await this.database.updateClient(id, client);
      } catch (error) {
        logger.error('[MAIN] IPC: Error updating client:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:deleteClient', async (event, id) => {
      try {
        return await this.database.deleteClient(id);
      } catch (error) {
        logger.error('[MAIN] IPC: Error deleting client:', error);
        throw error;
      }
    });

    // Project operations
    ipcMain.handle('db:getProjects', async (event, clientId) => {
      try {
        return await this.database.getProjects(clientId);
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting projects:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:createProject', async (event, project) => {
      try {
        return await this.database.createProject(project);
      } catch (error) {
        logger.error('[MAIN] IPC: Error creating project:', error);
        throw error;
      }
    });

    ipcMain.handle('db:updateProject', async (event, id, project) => {
      try {
        return await this.database.updateProject(id, project);
      } catch (error) {
        logger.error('[MAIN] IPC: Error updating project:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteProject', async (event, id) => {
      try {
        return await this.database.deleteProject(id);
      } catch (error) {
        logger.error('[MAIN] IPC: Error deleting project:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getDefaultProject', async (event, clientId) => {
      try {
        return await this.database.getDefaultProject(clientId);
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting default project:', error);
        throw error;
      }
    });

    // Task operations
    ipcMain.handle('db:getTasks', async (event, projectId) => {
      try {
        const tasks = await this.database.getTasks(projectId);
        return tasks;
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting tasks:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:createTask', async (event, task) => {
      try {
        return await this.database.createTask(task);
      } catch (error) {
        logger.error('[MAIN] IPC: Error creating task:', error);
        throw error;
      }
    });

    ipcMain.handle('db:updateTask', async (event, id, task) => {
      try {
        return await this.database.updateTask(id, task);
      } catch (error) {
        logger.error('[MAIN] IPC: Error updating task:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteTask', async (event, id) => {
      try {
        return await this.database.deleteTask(id);
      } catch (error) {
        logger.error('[MAIN] IPC: Error deleting task:', error);
        throw error;
      }
    });

    // Time entry operations
    ipcMain.handle('db:getTimeEntries', async (event, filters) => {
      try {
        // logger.main('debug', 'IPC: Getting time entries', { filters });
        const entries = await this.database.getTimeEntries(filters);
        // logger.main('info', 'IPC: Retrieved time entries', { count: entries.length });
        return entries;
      } catch (error) {
        logger.main('error', 'IPC: Error getting time entries', { error: error.message, stack: error.stack });
        throw error;
      }
    });
    
    ipcMain.handle('db:createTimeEntry', async (event, data) => {
      try {
        // logger.debug('[MAIN] IPC: Creating time entry with data:', data);
        return await this.database.createTimeEntry(data);
      } catch (error) {
        logger.error('[MAIN] IPC: Error creating time entry:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:updateTimeEntry', async (event, id, data) => {
      try {
        logger.debug('[MAIN] IPC: Updating time entry with id:', id, 'data:', data);
        return await this.database.updateTimeEntry(id, data);
      } catch (error) {
        logger.error('[MAIN] IPC: Error updating time entry:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:deleteTimeEntry', async (event, id) => {
      try {
        return await this.database.deleteTimeEntry(id);
      } catch (error) {
        logger.error('[MAIN] IPC: Error deleting time entry:', error);
        throw error;
      }
    });

    // Timer operations
    ipcMain.handle('db:startTimer', async (event, data) => {
      logger.debug('[MAIN] IPC: Starting timer with data:', JSON.stringify(data, null, 2));
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
        
        logger.debug('[MAIN] IPC: Timer started successfully:', JSON.stringify(timer, null, 2));
        return timer;
      } catch (error) {
        logger.error('[MAIN] IPC: Error starting timer:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:stopTimer', async (event, entryId, roundTo) => {
      logger.debug('[MAIN] IPC: Stopping timer with ID:', entryId, 'roundTo:', roundTo);
      try {
        const entry = await this.database.stopTimer(entryId, roundTo);
        logger.debug('[MAIN] IPC: Timer stopped successfully:', JSON.stringify(entry, null, 2));
        return entry;
      } catch (error) {
        logger.error('[MAIN] IPC: Error stopping timer:', error);
        throw error;
      }
    });

    ipcMain.handle('db:resumeTimer', async (event, entryId) => {
      logger.debug('[MAIN] IPC: Resuming timer with ID:', entryId);
      try {
        const entry = await this.database.resumeTimer(entryId);
        logger.debug('[MAIN] IPC: Timer resumed successfully:', JSON.stringify(entry, null, 2));
        return entry;
      } catch (error) {
        logger.error('[MAIN] IPC: Error resuming timer:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getActiveTimer', async () => {
      try {
        const activeTimer = await this.database.getActiveTimer();
        logger.debug('[MAIN] IPC: Active timer:', activeTimer ? 'found' : 'none');
        return activeTimer;
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting active timer:', error);
        throw error;
      }
    });

    // Last used items
    ipcMain.handle('db:getLastUsedClient', async () => {
      try {
        const lastClientId = await this.database.getSetting('lastUsedClientId');
        if (lastClientId) {
          const clients = await this.database.getClients();
          return clients.find(client => client.id === parseInt(lastClientId)) || null;
        }
        return null;
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting last used client:', error);
        return null;
      }
    });
    
    ipcMain.handle('db:getLastUsedProject', async () => {
      try {
        const lastProjectId = await this.database.getSetting('lastUsedProjectId');
        if (lastProjectId) {
          const clients = await this.database.getClients();
          for (const client of clients) {
            const proj = (client.projects || []).find(p => p.id === parseInt(lastProjectId));
            if (proj) return proj;
          }
        }
        return null;
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting last used project:', error);
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
        logger.error('[MAIN] IPC: Error getting last used task:', error);
        return null;
      }
    });

    // Settings operations
    ipcMain.handle('db:getSetting', async (event, key) => {
      try {
        return await this.database.getSetting(key);
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting setting:', error);
        throw error;
      }
    });
    
    ipcMain.handle('db:setSetting', async (event, key, value) => {
      try {
        return await this.database.setSetting(key, value);
      } catch (error) {
        logger.error('[MAIN] IPC: Error setting value:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getSettings', async () => {
      try {
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
        logger.error('[MAIN] IPC: Error getting settings:', error);
        throw error;
      }
    });

    ipcMain.handle('db:updateSettings', async (event, settings) => {
      try {
        for (const [key, value] of Object.entries(settings)) {
          await this.database.setSetting(key, value);
        }
        
        return { success: true };
      } catch (error) {
        logger.error('[MAIN] IPC: Error updating settings:', error);
        throw error;
      }
    });

    // Danger operations
    ipcMain.handle('db:removeDemoData', async (event, confirmationText) => {
      try {
        logger.debug('[MAIN] db:removeDemoData: Checking confirmation text');
        
        if (confirmationText !== 'yes, clear all data') {
          logger.debug('[MAIN] db:removeDemoData: Invalid confirmation text:', confirmationText);
          return { 
            success: false, 
            error: 'Confirmation text must match exactly: "yes, clear all data"' 
          };
        }
        
        const finalConfirm = await dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'FINAL WARNING',
          message: 'This will PERMANENTLY DELETE ALL DATA.\n\nClients, Projects, Tasks, Time Entries, Invoices - EVERYTHING will be lost.',
          detail: 'This action cannot be undone.',
          buttons: ['Cancel', 'Yes, Delete Everything'],
          defaultId: 0,
          cancelId: 0
        });
        
        if (finalConfirm.response !== 1) {
          logger.debug('[MAIN] db:removeDemoData: User cancelled at final confirmation');
          return { success: false, error: 'Operation cancelled by user' };
        }
        
        logger.debug('[MAIN] db:removeDemoData: User confirmed, proceeding with nuke');
        
        await this.database.nukeDatabase();
        
        logger.debug('[MAIN] db:removeDemoData: Database cleared successfully');
        return { success: true };
      } catch (error) {
        logger.error('[MAIN] Error clearing all data:', error);
        return { success: false, error: error.message };
      }
    });

    // Invoice database operations
    ipcMain.handle('db:getInvoices', async () => {
      try {
        const invoices = await this.database.getInvoices();
        logger.debug('[MAIN] IPC: Got invoices:', invoices.length);
        return invoices;
      } catch (error) {
        logger.error('[MAIN] IPC: Error getting invoices:', error);
        throw error;
      }
    });

    ipcMain.handle('db:deleteInvoice', async (event, id) => {
      try {
        const result = await this.database.deleteInvoice(id);
        logger.debug('[MAIN] IPC: Invoice deleted:', id);
        return result;
      } catch (error) {
        logger.error('[MAIN] IPC: Error deleting invoice:', error);
        throw error;
      }
    });
  }

  setupInvoiceHandlers() {
    ipcMain.handle('invoice:generate', async (event, data) => {
      try {
        logger.debug('[MAIN] invoice:generate called with data:', data);
        const filePath = await this.invoiceGenerator.generateInvoice(data);
        return { success: true, filePath };
      } catch (error) {
        logger.debug('[MAIN] invoice:generate error:', error.message);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('invoice:generateFromSelected', async (event, data) => {
      try {
        logger.debug('[MAIN] invoice:generateFromSelected called with data:', data);
        const filePath = await this.invoiceGenerator.generateInvoiceFromSelectedEntries(data);
        return { success: true, filePath };
      } catch (error) {
        logger.debug('[MAIN] invoice:generateFromSelected error:', error.message);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('invoice:download', async (event, invoiceId) => {
      try {
        logger.debug('[MAIN] invoice:download called with invoiceId:', invoiceId);
        const invoice = await this.database.getInvoiceById(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        const filePath = await this.invoiceGenerator.generateInvoicePDF(invoice);
        
        const defaultFilename = this.invoiceGenerator.createInvoiceFilename(
          invoice.client?.name || 'Unknown Client', 
          invoice.invoiceNumber
        );
        
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: 'Save Invoice',
          defaultPath: defaultFilename,
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          const fs = require('fs').promises;
          await fs.copyFile(filePath, result.filePath);
          logger.debug('[MAIN] invoice:download completed successfully');
          return { success: true, filePath: result.filePath };
        } else {
          logger.debug('[MAIN] invoice:download cancelled by user');
          return { success: false, error: 'Download cancelled' };
        }
      } catch (error) {
        logger.error('[MAIN] Error downloading invoice:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('invoice:view', async (event, invoiceId) => {
      try {
        logger.debug('[MAIN] invoice:view called with invoiceId:', invoiceId);
        const invoice = await this.database.getInvoiceById(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        const filePath = await this.invoiceGenerator.generatePDFFromStoredData(invoice);
        
        const defaultFilename = this.invoiceGenerator.createInvoiceFilename(
          invoice.client?.name || 'Unknown Client', 
          invoice.invoiceNumber
        );
        
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: 'Save Invoice',
          defaultPath: defaultFilename,
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          const fs = require('fs').promises;
          await fs.copyFile(filePath, result.filePath);
          logger.debug('[MAIN] invoice:view completed successfully');
          return { success: true, filePath: result.filePath };
        } else {
          logger.debug('[MAIN] invoice:view cancelled by user');
          return { success: false, error: 'Download cancelled' };
        }
      } catch (error) {
        logger.error('[MAIN] Error viewing invoice:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('invoice:regenerate', async (event, invoiceId) => {
      try {
        logger.debug('[MAIN] invoice:regenerate called with invoiceId:', invoiceId);
        
        const filePath = await this.invoiceGenerator.regenerateInvoice(invoiceId);
        
        logger.debug('[MAIN] invoice:regenerate completed successfully');
        return { success: true, filePath };
      } catch (error) {
        logger.error('[MAIN] Error regenerating invoice:', error);
        return { success: false, error: error.message };
      }
    });
  }

  setupExportHandlers() {
    ipcMain.handle('export:csv', async (event, filters) => {
      try {
        let timeEntries;
        if (filters && filters.ids && filters.ids.length > 0) {
          timeEntries = await this.database.getTimeEntriesByIds(filters.ids);
        } else {
          timeEntries = await this.database.getTimeEntries(filters || {});
        }
        
        const csvHeader = 'Date,Client,Project,Task,Description,Duration (hours),Start Time,End Time,Hourly Rate,Amount\n';
        const csvRows = timeEntries.map(entry => {
          const date = new Date(entry.startTime).toLocaleDateString();
          const client = entry.client?.name || '';
          const project = entry.project?.name || '';
          const task = entry.task?.name || '';
          const description = (entry.description || '').replace(/"/g, '""');
          const hours = ((entry.duration || 0) / 60).toFixed(2);
          const startTime = new Date(entry.startTime).toLocaleString();
          const endTime = entry.endTime ? new Date(entry.endTime).toLocaleString() : '';
          const hourlyRate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          const amount = (hours * hourlyRate).toFixed(2);
          
          return `"${date}","${client}","${project}","${task}","${description}","${hours}","${startTime}","${endTime}","${hourlyRate}","${amount}"`;
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
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
        logger.error('[MAIN] Error exporting to CSV:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('export:json', async (event, filters) => {
      try {
        let timeEntries;
        if (filters && filters.ids && filters.ids.length > 0) {
          timeEntries = await this.database.getTimeEntriesByIds(filters.ids);
        } else {
          timeEntries = await this.database.getTimeEntries(filters || {});
        }
        
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
        logger.error('[MAIN] Error exporting to JSON:', error);
        return { success: false, error: error.message };
      }
    });
  }

  setupTrayHandlers() {
    ipcMain.on('tray:timer-status-changed', (event, timerData) => {
      logger.debug('[MAIN] Timer status changed:', timerData);
      if (this.trayService) {
        this.trayService.updateTimerStatus(timerData);
        
        if (timerData) {
          this.trayService.startTimerUpdates();
        } else {
          this.trayService.stopTimerUpdates();
        }
      }
    });
  }

  setupConsoleHandlers() {
    ipcMain.on('console:log', (event, level, ...args) => {
      const message = args.join(' ');
      
      const logLevel = level === 'log' ? 'info' : level;
      
      if (['error', 'warn', 'info', 'debug'].includes(logLevel)) {
        logger.renderer(logLevel, message);
      } else {
        logger.renderer('info', `[${level.toUpperCase()}] ${message}`);
      }
    });
  }

  setupDevHandlers() {
    ipcMain.handle('dev:runSeed', async () => {
      try {
        if (app.isPackaged) {
          throw new Error('Seeding is only available in development.');
        }
        
        logger.debug('[MAIN] dev:runSeed: Starting database nuke and reseed');
        
        try {
          logger.debug('[MAIN] dev:runSeed: Nuking database...');
          await this.database.nukeDatabase();
          logger.debug('[MAIN] dev:runSeed: Database nuked successfully');
        } catch (nukeError) {
          logger.error('[MAIN] dev:runSeed: Error nuking database:', nukeError);
          throw new Error('Failed to clear database: ' + nukeError.message);
        }
        
        const { execFile } = require('child_process');
        const path = require('path');
        const projectRoot = path.join(__dirname, '..', '..', '..');
        const seedPath = path.join(projectRoot, 'prisma', 'seed.js');
        const env = {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          DATABASE_URL: `file:${path.join(projectRoot, 'prisma', process.env.MAIN_DB ?? 'myhours.db')}`,
        };
        
        logger.debug('[MAIN] dev:runSeed: Running seed script...');
        await new Promise((resolve, reject) => {
          const child = execFile(process.execPath, [seedPath], { env, cwd: projectRoot }, (err) => {
            if (err) return reject(err);
            resolve();
          });
          child.stdout?.on('data', (d) => logger.debug('[SEED]', d.toString().trim()));
          child.stderr?.on('data', (d) => logger.error('[SEED]', d.toString().trim()));
        });
        
        logger.debug('[MAIN] dev:runSeed: Completed successfully');
        return { success: true };
      } catch (error) {
        logger.error('[MAIN] dev:runSeed error:', error);
        return { success: false, error: error.message };
      }
    });
  }
}

module.exports = IpcService;
