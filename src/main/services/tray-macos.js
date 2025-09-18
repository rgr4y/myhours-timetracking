import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import TrayService from './tray-service.js';
import logger from './logger-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class MacOSTrayService extends TrayService {
  constructor(mainWindow, databaseService) {
    super(mainWindow, databaseService);
    this.iconPath = path.join(__dirname, '../../../assets/tray-icon.png');
  }

  // Centralized icon loading method with cache busting
  loadIcon(size = { width: 16, height: 16 }) {
    try {
      // logger.debug('[TRAY-MACOS] Loading icon from:', this.iconPath);
      
      // Force reload by reading file fresh to avoid caching
      const iconBuffer = fs.readFileSync(this.iconPath);
      const icon = nativeImage.createFromBuffer(iconBuffer);
      
      if (icon.isEmpty()) {
        logger.error('[TRAY-MACOS] Failed to load tray icon from:', this.iconPath);
        return null;
      }
      
      const resizedIcon = icon.resize(size);
      if (size.width === 16 && size.height === 16) {
        resizedIcon.setTemplateImage(true); // Makes icon adapt to system theme for tray
      }
      
      return resizedIcon;
    } catch (error) {
      logger.error('[TRAY-MACOS] Error loading icon:', error);
      return null;
    }
  }

  initialize() {
    logger.debug('[TRAY-MACOS] Initializing macOS tray...');
    
    try {
      // logger.debug('[TRAY-MACOS] Icon path exists:', fs.existsSync(this.iconPath));
      
      const icon = this.loadIcon();
      if (!icon) {
        return false;
      }
      
      // logger.debug('[TRAY-MACOS] Original icon size:', icon.getSize());
      
      this.tray = new Tray(icon);
      this.tray.setToolTip('myHours Time Tracker');
      
      // Set up tray interactions
      this.createContextMenu();
      this.setupTrayEvents();
      
      // Set up file watcher for development (hot reload icons)
      if (process.env.NODE_ENV === 'development') {
        this.setupIconWatcher();
      }
      
      // Check for active timer and restore tray/dock state
      this.restoreTimerState();
      
      // logger.debug('[TRAY-MACOS] Tray initialized successfully');
      return true;
    } catch (error) {
      logger.error('[TRAY-MACOS] Error initializing tray:', error);
      return false;
    }
  }

  // Set up file watcher for icon hot reload during development
  setupIconWatcher() {
    try {
      // logger.debug('[TRAY-MACOS] Setting up icon file watcher for development');
      
      this.iconWatcher = fs.watchFile(this.iconPath, { interval: 1000 }, (curr, prev) => {
        // logger.debug('[TRAY-MACOS] Icon file changed, refreshing...');
        setTimeout(() => {
          this.refreshIcon();
        }, 100); // Small delay to ensure file write is complete
      });
    } catch (error) {
      logger.error('[TRAY-MACOS] Error setting up icon watcher:', error);
    }
  }

  // Method to refresh the tray icon (useful for development)
  refreshIcon() {
    if (!this.tray) return;
    
    // logger.debug('[TRAY-MACOS] Refreshing icon...');
    const icon = this.loadIcon();
    if (icon) {
      this.tray.setImage(icon);
      logger.debug('[TRAY-MACOS] Icon refreshed successfully');
    }
  }

  // Check for active timer and restore tray/dock state on initialization
  async restoreTimerState() {
    try {
      // logger.debug('[TRAY-MACOS] Checking for active timer to restore state...');
      const activeTimer = await this.database.getActiveTimer();
      
      if (activeTimer) {
        // logger.debug('[TRAY-MACOS] Found active timer on startup, restoring tray state');

        // Prepare timer data for tray update
        const timerData = {
          id: activeTimer.id,
          clientName: activeTimer.client?.name || 'Unknown Client',
          description: activeTimer.description || 'No description',
          startTime: activeTimer.startTime
        };
        
        // Update tray and dock status
        this.updateTimerStatus(timerData);
      } else {
        logger.info('[TRAY-MACOS] No active timer found on startup');
      }
    } catch (error) {
      logger.error('[TRAY-MACOS] Error restoring timer state:', error);
    }
  }

  async createContextMenu() {
    // Early return if tray is not initialized
    if (!this.tray) {
      logger.warn('[TRAY-MACOS] Tray not initialized, cannot setup menu');
      return;
    }
    
    // Get clients for the quick start menu
    let quickStartSubmenu = [];
    try {
      const clients = await this.database.getClients();
      const recentClients = clients.slice(0, 5);
      
      if (recentClients.length > 0) {
        recentClients.forEach(client => {
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
      logger.error('[TRAY-MACOS] Error loading clients for quick start menu:', error);
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
        enabled: false,
        icon: this.getMenuIcon()
      },
      { type: 'separator' },
      {
        label: 'Show myHours',
        click: () => this.showWindow(),
        accelerator: 'Cmd+Shift+M'
      },
      { type: 'separator' },
      {
        label: this.currentTimer ? 'Stop Timer' : 'Start Timer',
        id: 'timer-toggle',
        click: () => this.toggleTimer(),
        accelerator: 'Cmd+Shift+T',
        enabled: this.currentTimer ? true : false // Only enable stop if timer is running
      },
      {
        label: 'Quick Start Timer...',
        submenu: quickStartSubmenu,
        enabled: !this.currentTimer // Only show when no timer is running
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
        accelerator: 'Cmd+,'
      },
      { type: 'separator' },
      {
        label: 'Quit myHours',
        click: () => this.quitApplication(),
        accelerator: 'Cmd+Q'
      }
    ]);

    this.tray.setContextMenu(this.contextMenu);
  }

  setupTrayEvents() {
    // Handle left click to show context menu instead of toggling window
    this.tray.on('click', () => {
      this.tray.popUpContextMenu();
    });
    
    // Handle right click (already handled by context menu)
    this.tray.on('right-click', () => {
      // Context menu will show automatically
    });
  }

  handleTrayClick() {
    // This method is no longer used since we changed the click behavior
    // Keeping it for potential future use
    if (this.mainWindow) {
      if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
        this.mainWindow.hide();
      } else {
        this.showWindow();
      }
    }
  }

  async toggleTimer() {
    try {
      if (this.currentTimer) {
        // Stop the current timer
        // logger.debug('[TRAY-MACOS] Stopping timer from tray');
        await this.stopTimer();
      } else {
        // Show quick start dialog or start with last used settings
        // logger.debug('[TRAY-MACOS] Starting timer from tray');
        await this.startTimer();
      }
    } catch (error) {
      logger.error('[TRAY-MACOS] Error toggling timer:', error);
    }
  }

  async getQuickStartSubmenu() {
    try {
      // Get recent clients for quick access
      const clients = await this.database.getClients();
      const recentClients = clients.slice(0, 5); // Show top 5 clients
      
      const submenu = [];
      
      if (recentClients.length > 0) {
        recentClients.forEach(client => {
          submenu.push({
            label: client.name,
            click: () => this.quickStartTimer({
              clientId: client.id,
              clientName: client.name
            })
          });
        });
        
        submenu.push({ type: 'separator' });
      }
      
      submenu.push({
        label: 'Choose Client...',
        click: () => {
          this.showWindow();
          this.showTimerSetup();
        }
      });
      
      return submenu;
    } catch (error) {
      logger.error('[TRAY-MACOS] Error creating quick start submenu:', error);
      return [
        {
          label: 'Choose Client...',
          click: () => {
            this.showWindow();
            this.showTimerSetup();
          }
        }
      ];
    }
  }

  async openSettings() {
    // logger.debug('[TRAY-MACOS] Opening settings...');
    this.showWindow();
    
    // Wait for the window to be ready before sending the navigation event
    await new Promise(resolve => {
      if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
        // Window is already ready
        // logger.debug('[TRAY-MACOS] Window already ready, proceeding...');
        resolve();
      } else {
        // Wait for the window to show and focus
        let resolved = false;
        const onShow = () => {
          // logger.debug('[TRAY-MACOS] Window shown, sending settings event');
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };
        this.mainWindow.once('show', onShow);
        
        // Fallback timeout
        setTimeout(() => {
          this.mainWindow.removeListener('show', onShow);
          if (!resolved) {
            resolved = true;
          }
          logger.warn('[TRAY-MACOS] Timeout reached, proceeding anyway');
          resolve();
        }, 200);
      }
    });
    
    // logger.debug('[TRAY-MACOS] Sending navigation event to settings');
    this.mainWindow.webContents.send('tray-open-settings');
  }

  // Override updateTimerStatus to add macOS-specific behavior
  updateTimerStatus(timerData = null) {
    // Call the base class method first
    super.updateTimerStatus(timerData);
    
    // Early return if tray is not initialized
    if (!this.tray) {
      logger.warn('[TRAY-MACOS] Tray not initialized, cannot update timer status');
      return;
    }
    
    if (timerData) {
      // Update tray to show active timer
      this.tray.setTitle('🟢'); // Shows green circle when timer is active
      
      // Set dock badge to show timer is active
      if (app.dock) {
        app.dock.setBadge(' '); // Use a bullet point as the badge
      }
      
      const clientName = timerData.clientName || 'Unknown Client';
      const description = timerData.description || 'No description';
      const startTime = new Date(timerData.startTime);
      const elapsed = this.formatElapsedTime(Date.now() - startTime.getTime());
      
      this.tray.setToolTip(`myHours - Timer Running\n${clientName}\n${description}\nElapsed: ${elapsed}`);
    } else {
      // Clear timer display
      this.tray.setTitle('');
      this.tray.setToolTip('myHours Time Tracker');
      
      // Clear dock badge
      if (app.dock) {
        app.dock.setBadge('');
      }
    }
    
    // Refresh the menu to update timer-related items
    this.createContextMenu();
  }

  getTimerStatusText() {
    if (!this.currentTimer) return '';
    
    const clientName = this.currentTimer.clientName || 'Unknown Client';
    const description = this.currentTimer.description || 'No description';
    const startTime = new Date(this.currentTimer.startTime);
    const elapsed = this.formatElapsedTime(Date.now() - startTime.getTime());
    
    return `${clientName} • ${elapsed}`;
  }

  formatElapsedTime(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  getMenuIcon() {
    return this.loadIcon({ width: 12, height: 12 });
  }

  preventWindowClose() {
    return !this.isQuitting;
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  // Start periodic timer updates when timer is active
  startTimerUpdates() {
    if (this.timerUpdateInterval) {
      clearInterval(this.timerUpdateInterval);
    }
    
    this.timerUpdateInterval = setInterval(() => {
      if (this.currentTimer) {
        // Update the menu with current elapsed time
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
}

export default MacOSTrayService;
