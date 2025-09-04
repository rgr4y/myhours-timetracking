const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');
const TrayService = require('./tray-service');
const logger = require('./logger-service');
class WindowsTrayService extends TrayService {
  constructor(mainWindow, databaseService) {
    super(mainWindow, databaseService);
    // Use the main app icon instead of the tray-specific icon
    this.iconPath = path.join(__dirname, '../../../assets/icon.png');
  }

  // Windows-specific icon loading
  loadIcon(size = { width: 16, height: 16 }) {
    try {
      logger.debug('[TRAY-WINDOWS] Loading icon from:', this.iconPath);
      
      const iconBuffer = fs.readFileSync(this.iconPath);
      const icon = nativeImage.createFromBuffer(iconBuffer);
      
      if (icon.isEmpty()) {
        logger.error('[TRAY-WINDOWS] Failed to load tray icon from:', this.iconPath);
        return null;
      }
      
      // Windows doesn't use template images
      const resizedIcon = icon.resize(size);
      return resizedIcon;
    } catch (error) {
      logger.error('[TRAY-WINDOWS] Error loading icon:', error);
      return null;
    }
  }

  initialize() {
    logger.log('[TRAY-WINDOWS] Initializing Windows tray...');
    
    try {
      logger.log('[TRAY-WINDOWS] Icon path exists:', fs.existsSync(this.iconPath));
      
      const icon = this.loadIcon();
      if (!icon) {
        return false;
      }
      
      this.tray = new Tray(icon);
      this.tray.setToolTip('myHours Time Tracker');
      
      // Set up tray interactions
      this.createContextMenu();
      this.setupTrayEvents();
      
      // Check for active timer and restore tray state
      this.restoreTimerState();
      
      logger.log('[TRAY-WINDOWS] Tray initialized successfully');
      return true;
    } catch (error) {
      logger.error('[TRAY-WINDOWS] Error initializing tray:', error);
      return false;
    }
  }

  async createContextMenu() {
    // Early return if tray is not initialized
    if (!this.tray) {
      logger.warn('[TRAY-WINDOWS] Tray not initialized, cannot setup menu');
      return;
    }
    
    // Get clients for the quick start menu
    let quickStartSubmenu = [];
    try {
      const clients = await this.getRecentClients();
      
      if (clients.length > 0) {
        clients.forEach(client => {
          quickStartSubmenu.push({
            label: client.name,
            click: () => this.quickStartTimer({
              clientId: client.id,
              clientName: client.name
            })
          });
        });
        quickStartSubmenu.push({ type: 'separator' });
      }
      
      quickStartSubmenu.push({
        label: 'Choose Client...',
        click: () => {
          this.showWindow();
          this.showTimerSetup();
        }
      });
    } catch (error) {
      logger.error('[TRAY-WINDOWS] Error loading clients for quick start menu:', error);
      quickStartSubmenu = [
        {
          label: 'Choose Client...',
          click: () => {
            this.showWindow();
            this.showTimerSetup();
          }
        }
      ];
    }

    this.contextMenu = Menu.buildFromTemplate([
      {
        label: 'myHours',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Show myHours',
        click: () => this.showWindow(),
        accelerator: 'Ctrl+Shift+M'
      },
      { type: 'separator' },
      {
        label: this.currentTimer ? 'Stop Timer' : 'Start Timer',
        id: 'timer-toggle',
        click: () => this.toggleTimer(),
        accelerator: 'Ctrl+Shift+T',
        enabled: this.currentTimer ? true : false
      },
      {
        label: 'Quick Start Timer...',
        submenu: quickStartSubmenu,
        enabled: !this.currentTimer
      },
      { type: 'separator' },
      {
        label: 'Timer Status',
        enabled: false,
        visible: !!this.currentTimer
      },
      {
        label: this.getTimerStatusText(),
        enabled: false,
        visible: !!this.currentTimer
      },
      { type: 'separator', visible: !!this.currentTimer },
      {
        label: 'Settings...',
        click: () => this.openSettings(),
        accelerator: 'Ctrl+,'
      },
      { type: 'separator' },
      {
        label: 'Quit myHours',
        click: () => this.quitApplication(),
        accelerator: 'Ctrl+Q'
      }
    ]);

    this.tray.setContextMenu(this.contextMenu);
  }

  setupTrayEvents() {
    if (!this.tray) return;
    
    // Windows typically shows context menu on right-click
    // and toggles window on left-click
    this.tray.on('click', this.handleTrayClick);
    this.tray.on('double-click', () => {
      this.showWindow();
    });
  }

  // Windows-specific timer toggle
  async toggleTimer() {
    try {
      if (this.currentTimer) {
        logger.log('[TRAY-WINDOWS] Stopping timer from tray');
        await this.stopTimer();
      } else {
        logger.log('[TRAY-WINDOWS] Starting timer from tray');
        await this.startTimer();
      }
    } catch (error) {
      logger.error('[TRAY-WINDOWS] Error toggling timer:', error);
    }
  }

  async openSettings() {
    logger.log('[TRAY-WINDOWS] Opening settings...');
    this.showWindow();
    
    // Wait for window to be ready
    await new Promise(resolve => {
      if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
        resolve();
      } else {
        this.mainWindow.once('show', resolve);
        setTimeout(resolve, 200); // Fallback
      }
    });
    
    this.mainWindow.webContents.send('tray-open-settings');
  }

  // Override updateTimerStatus to add Windows-specific behavior
  updateTimerStatus(timerData = null) {
    // Call the base class method first
    super.updateTimerStatus(timerData);
    
    // Early return if tray is not initialized
    if (!this.tray) {
      logger.warn('[TRAY-WINDOWS] Tray not initialized, cannot update timer status');
      return;
    }
    
    if (timerData) {
      // Windows might show different indication
      this.tray.setImage(this.loadIcon()); // Keep same icon for now
      
      // Start timer updates
      this.startTimerUpdates();
    } else {
      // Clear tray status
      this.tray.setImage(this.loadIcon());
      
      // Stop timer updates
      this.stopTimerUpdates();
    }
    
    // Refresh the menu
    this.createContextMenu();
  }

  getTimerStatusText() {
    if (!this.currentTimer) return '';
    
    const clientName = this.currentTimer.clientName || 'Unknown Client';
    const description = this.currentTimer.description || 'No description';
    const elapsed = this.formatTimerDuration(this.currentTimer.startTime);
    
    return `${clientName} - ${elapsed}`;
  }

  async restoreTimerState() {
    try {
      const activeTimer = await this.database.getActiveTimer();
      if (activeTimer) {
        logger.log('[TRAY-WINDOWS] Restoring timer state:', activeTimer);
        this.updateTimerStatus({
          id: activeTimer.id,
          clientName: activeTimer.client?.name || 'Unknown Client',
          description: activeTimer.description || '',
          startTime: activeTimer.startTime
        });
      }
    } catch (error) {
      logger.error('[TRAY-WINDOWS] Error restoring timer state:', error);
    }
  }

  startTimerUpdates() {
    this.stopTimerUpdates(); // Clear any existing interval
    
    this.timerUpdateInterval = setInterval(() => {
      if (this.currentTimer) {
        this.createContextMenu();
      }
    }, 60000); // Update every minute
  }

  stopTimerUpdates() {
    if (this.timerUpdateInterval) {
      clearInterval(this.timerUpdateInterval);
      this.timerUpdateInterval = null;
    }
  }

  destroy() {
    logger.log('[TRAY-WINDOWS] Destroying Windows tray service');
    this.stopTimerUpdates();
    super.destroy();
  }
}

module.exports = WindowsTrayService;
