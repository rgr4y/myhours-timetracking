const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const VersionService = require('./services/version-service');
const logger = require('./services/logger-service');

// Initialize logger early
logger.initialize();

logger.main('info', '=== MAIN PROCESS STARTING ===');
logger.main('info', 'Node version', { version: process.version });
logger.main('info', 'Electron version', { version: process.versions.electron });
logger.main('info', 'Working directory', { cwd: process.cwd() });

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
logger.main('info', 'Environment', { isDev, isPackaged: app.isPackaged });

// Configure development-specific settings
if (isDev) {
  const { configureDevelopment } = require('./helpers/development');
  configureDevelopment();
}

// Disable GPU acceleration for better stability (My GPU has major issues)
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
logger.main('warn', '[MAIN-DEV] GPU acceleration disabled for development');

// Single instance lock to prevent multiple app launches
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.debug('[MAIN] Another instance is already running, quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    logger.debug('[MAIN] Second instance attempted, focusing existing window');
    // Someone tried to run a second instance, we should focus our window instead
    const myHoursApp = global.myHoursAppInstance;
    if (myHoursApp && myHoursApp.mainWindow) {
      if (myHoursApp.mainWindow.isMinimized()) myHoursApp.mainWindow.restore();
      myHoursApp.mainWindow.focus();
    }
  });
}

const DatabaseService = require('./services/database-service');
const InvoiceGenerator = require('./services/invoice-service');
const IpcService = require('./services/ipc-service');
const AutoUpdaterService = require('./services/auto-updater-service');

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
    this.ipcService = null;
    this.autoUpdaterService = null;
    this.trayService = null;
    this.versionService = new VersionService();
    this.wsServer = null;
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 860,
      minWidth: 800,
      minHeight: 840,
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
      logger.debug('[MAIN] Loading app in development mode...');
      const devUrl = 'http://localhost:3010';
      logger.debug('[MAIN] Waiting for dev server:', devUrl);
      try {
        const { waitForDevServer } = require('./helpers/development');
        await waitForDevServer(devUrl, 2000, 300);
      } catch (e) {
        logger.warn('[MAIN] Dev server wait timed out, attempting to load anyway');
      }
      logger.debug('[MAIN] Loading URL:', devUrl);
      this.mainWindow.loadURL(devUrl);
      this.mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, '../renderer/build/index.html');
      logger.debug('[MAIN] Loading production file:', indexPath);
      const fs = require('fs');
      logger.debug('[MAIN] index.html exists?', fs.existsSync(indexPath));
      this.mainWindow.loadFile(indexPath);
    }

    this.mainWindow.once('ready-to-show', () => {
      logger.debug('[MAIN] Window ready to show');
      // Ensure the window title stays consistent regardless of document.title
      try {
        this.mainWindow.setTitle('myHours');
      } catch (e) {}
      this.mainWindow.show();
    });

    // Broadcast content size to renderer on window size changes
    const sendSize = () => {
      try {
        const { width, height } = this.mainWindow.getContentBounds();
        this.mainWindow.webContents.send('app:window-resize', { width, height });
      } catch (_) {}
    };
    this.mainWindow.on('resize', sendSize);
    this.mainWindow.on('maximize', sendSize);
    this.mainWindow.on('unmaximize', sendSize);
    this.mainWindow.on('enter-full-screen', sendSize);
    this.mainWindow.on('leave-full-screen', sendSize);

    // Prevent renderer from overriding the window title
    this.mainWindow.on('page-title-updated', (event) => {
      event.preventDefault();
      try {
        this.mainWindow.setTitle('myHours');
      } catch (e) {}
    });

    // Helpful diagnostics + auto-retry if the renderer fails to load (common when dev server is still booting)
    let retryCount = 0;
    const maxRetries = 30; // ~9s with 300ms delay
    const retryDelayMs = 300;
    this.mainWindow.webContents.on('did-fail-load', async (_event, errorCode, errorDescription, validatedURL) => {
      logger.error('[MAIN] did-fail-load:', { errorCode, errorDescription, validatedURL });
      if (isDev && validatedURL && retryCount < maxRetries) {
        retryCount += 1;
        logger.debug(`[MAIN] Retry ${retryCount}/${maxRetries} loading dev URL after ${retryDelayMs}ms...`);
        await new Promise(r => setTimeout(r, retryDelayMs));
        try { await this.mainWindow.loadURL(validatedURL); } catch (_) {}
      }
    });
    this.mainWindow.webContents.on('render-process-gone', (event, details) => {
      logger.error('[MAIN] render-process-gone:', details);
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
    // Initialize IPC service
    this.ipcService = new IpcService(
      this.mainWindow,
      this.database,
      this.invoiceGenerator,
      this.versionService
    );
    
    // Set up all IPC handlers
    this.ipcService.setupHandlers();
    
    logger.debug('[MAIN] IPC service initialized');
  }

  async initialize() {
    logger.debug('[MAIN] App initializing...');
    await app.whenReady();
    logger.debug('[MAIN] App ready');
    
    // Initialize database
    this.database = new DatabaseService();
    await this.database.initialize();
    logger.debug('[MAIN] Database initialized');
    
    // Initialize invoice generator
    this.invoiceGenerator = new InvoiceGenerator({ database: this.database });
    
    // Setup IPC handlers
    this.setupIPC();
    logger.debug('[MAIN] IPC handlers set up');
    
    // Setup WebSocket server for browser debugging (dev only)
    if (isDev) {
      const { setupWebSocketServer } = require('./helpers/development');
      this.wsServer = await setupWebSocketServer();
    }
    
    // Create main window
    await this.createWindow();
    logger.debug('[MAIN] Window created');

    // Setup updater service (mock in dev on macOS, native in prod macOS)
    this.autoUpdaterService = new AutoUpdaterService(this.mainWindow, this.versionService, isDev);
    this.autoUpdaterService.setup();

    // Check for updates in production
    if (!isDev && process.platform === 'darwin') {
      setTimeout(() => {
        this.autoUpdaterService.checkForUpdates();
      }, 3000); // Wait 3 seconds after startup
    }

    // Initialize tray service (cross-platform)
    if (TrayService) {
      this.trayService = new TrayService(this.mainWindow, this.database);
      const trayInitialized = this.trayService.initialize();
      if (trayInitialized) {
        logger.debug(`[MAIN] Tray service initialized for ${process.platform}`);
        // Connect tray service to IPC service
        this.ipcService.setTrayService(this.trayService);
      } else {
        logger.warn(`[MAIN] Failed to initialize tray service for ${process.platform}`);
      }
    } else {
      logger.debug(`[MAIN] No tray service available for platform: ${process.platform}`);
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
      if (this.wsServer) {
        logger.debug('[WEBSOCKET] Closing WebSocket server...');
        this.wsServer.close();
      }
    });
  }
}

const myHoursApp = new MyHoursApp();

// Store globally for single instance handling
global.myHoursAppInstance = myHoursApp;

logger.debug('[MAIN] === STARTING APP INITIALIZATION ===');
myHoursApp.initialize().catch((error) => {
  logger.error('[MAIN] === FATAL ERROR DURING INITIALIZATION ===');
  logger.error('[MAIN] Error:', error);
  logger.error('[MAIN] Stack:', error.stack);
  
  // Show an error dialog
  if (dialog) {
    dialog.showErrorBox('Startup Error', `Failed to start MyHours: ${error.message}`);
  }
  
  process.exit(1);
});
