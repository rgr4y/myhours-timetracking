const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');

class MacOSTrayService {
  constructor(mainWindow, databaseService) {
    this.mainWindow = mainWindow;
    this.database = databaseService;
    this.tray = null;
    this.contextMenu = null;
    this.isQuitting = false;
    this.currentTimer = null;
    this.iconPath = path.join(__dirname, '../../../assets/tray-icon.png');
    
    // Bind methods to maintain context
    this.updateTimerStatus = this.updateTimerStatus.bind(this);
    this.handleTrayClick = this.handleTrayClick.bind(this);
  }

  // Centralized icon loading method with cache busting
  loadIcon(size = { width: 16, height: 16 }) {
    try {
      console.log('[TRAY-MACOS] Loading icon from:', this.iconPath);
      
      // Force reload by reading file fresh to avoid caching
      const iconBuffer = fs.readFileSync(this.iconPath);
      const icon = nativeImage.createFromBuffer(iconBuffer);
      
      if (icon.isEmpty()) {
        console.error('[TRAY-MACOS] Failed to load tray icon from:', this.iconPath);
        return null;
      }
      
      const resizedIcon = icon.resize(size);
      if (size.width === 16 && size.height === 16) {
        resizedIcon.setTemplateImage(true); // Makes icon adapt to system theme for tray
      }
      
      return resizedIcon;
    } catch (error) {
      console.error('[TRAY-MACOS] Error loading icon:', error);
      return null;
    }
  }

  initialize() {
    console.log('[TRAY-MACOS] Initializing macOS tray...');
    
    try {
      console.log('[TRAY-MACOS] Icon path exists:', fs.existsSync(this.iconPath));
      
      const icon = this.loadIcon();
      if (!icon) {
        return false;
      }
      
      console.log('[TRAY-MACOS] Original icon size:', icon.getSize());
      
      this.tray = new Tray(icon);
      this.tray.setToolTip('myHours Time Tracker');
      
      // Set up tray interactions
      this.setupTrayMenu();
      this.setupTrayEvents();
      
      // Set up file watcher for development (hot reload icons)
      if (process.env.NODE_ENV === 'development') {
        this.setupIconWatcher();
      }
      
      console.log('[TRAY-MACOS] Tray initialized successfully');
      return true;
    } catch (error) {
      console.error('[TRAY-MACOS] Error initializing tray:', error);
      return false;
    }
  }

  // Set up file watcher for icon hot reload during development
  setupIconWatcher() {
    try {
      console.log('[TRAY-MACOS] Setting up icon file watcher for development');
      
      this.iconWatcher = fs.watchFile(this.iconPath, { interval: 1000 }, (curr, prev) => {
        console.log('[TRAY-MACOS] Icon file changed, refreshing...');
        setTimeout(() => {
          this.refreshIcon();
        }, 100); // Small delay to ensure file write is complete
      });
    } catch (error) {
      console.error('[TRAY-MACOS] Error setting up icon watcher:', error);
    }
  }

  // Method to refresh the tray icon (useful for development)
  refreshIcon() {
    if (!this.tray) return;
    
    console.log('[TRAY-MACOS] Refreshing icon...');
    const icon = this.loadIcon();
    if (icon) {
      this.tray.setImage(icon);
      console.log('[TRAY-MACOS] Icon refreshed successfully');
    }
  }

  async setupTrayMenu() {
    // Get clients for the quick start menu
    let quickStartSubmenu = [];
    try {
      const clients = await this.database.getClients();
      const recentClients = clients.slice(0, 5);
      
      if (recentClients.length > 0) {
        recentClients.forEach(client => {
          quickStartSubmenu.push({
            label: client.name,
            click: () => this.startQuickTimer(client)
          });
        });
        quickStartSubmenu.push({ type: 'separator' });
      }
      
      quickStartSubmenu.push({
        label: 'Choose Client...',
        click: () => {
          this.showMainWindow();
          this.mainWindow.webContents.send('tray-show-timer-setup');
        }
      });
    } catch (error) {
      console.error('[TRAY-MACOS] Error loading clients for quick start menu:', error);
      quickStartSubmenu = [
        {
          label: 'Choose Client...',
          click: () => {
            this.showMainWindow();
            this.mainWindow.webContents.send('tray-show-timer-setup');
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
        click: () => this.showMainWindow(),
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
        click: () => this.quitApp(),
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
        this.showMainWindow();
      }
    }
  }

  showMainWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
      
      // Bring to front on macOS
      if (process.platform === 'darwin') {
        app.focus();
      }
    }
  }

  async toggleTimer() {
    try {
      if (this.currentTimer) {
        // Stop the current timer
        console.log('[TRAY-MACOS] Stopping timer from tray');
        this.mainWindow.webContents.send('tray-stop-timer');
      } else {
        // Show quick start dialog or start with last used settings
        console.log('[TRAY-MACOS] Starting timer from tray');
        this.mainWindow.webContents.send('tray-start-timer');
        this.showMainWindow(); // Show window for timer setup
      }
    } catch (error) {
      console.error('[TRAY-MACOS] Error toggling timer:', error);
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
            click: () => this.startQuickTimer(client)
          });
        });
        
        submenu.push({ type: 'separator' });
      }
      
      submenu.push({
        label: 'Choose Client...',
        click: () => {
          this.showMainWindow();
          this.mainWindow.webContents.send('tray-show-timer-setup');
        }
      });
      
      return submenu;
    } catch (error) {
      console.error('[TRAY-MACOS] Error creating quick start submenu:', error);
      return [
        {
          label: 'Choose Client...',
          click: () => {
            this.showMainWindow();
            this.mainWindow.webContents.send('tray-show-timer-setup');
          }
        }
      ];
    }
  }

  async startQuickTimer(client) {
    try {
      console.log('[TRAY-MACOS] Starting quick timer for client:', client.name);
      this.mainWindow.webContents.send('tray-quick-start-timer', {
        clientId: client.id,
        clientName: client.name
      });
    } catch (error) {
      console.error('[TRAY-MACOS] Error starting quick timer:', error);
    }
  }

  async openSettings() {
    console.log('[TRAY-MACOS] Opening settings...');
    this.showMainWindow();
    
    // Wait for the window to be ready before sending the navigation event
    await new Promise(resolve => {
      if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
        // Window is already ready
        console.log('[TRAY-MACOS] Window already ready, proceeding...');
        resolve();
      } else {
        // Wait for the window to be shown and focused
        console.log('[TRAY-MACOS] Waiting for window to be ready...');
        const onReady = () => {
          console.log('[TRAY-MACOS] Window focused, ready to navigate');
          this.mainWindow.removeListener('focus', onReady);
          resolve();
        };
        this.mainWindow.once('focus', onReady);
        
        // Fallback timeout in case focus event doesn't fire
        setTimeout(() => {
          console.log('[TRAY-MACOS] Timeout reached, proceeding anyway');
          resolve();
        }, 200);
      }
    });
    
    console.log('[TRAY-MACOS] Sending navigation event to settings');
    this.mainWindow.webContents.send('tray-open-settings');
  }

  quitApp() {
    this.isQuitting = true;
    app.quit();
  }

  updateTimerStatus(timerData) {
    this.currentTimer = timerData;
    
    if (timerData) {
      // Update tray to show active timer
      this.tray.setTitle('🟢'); // Shows green circle when timer is active
      
      const clientName = timerData.clientName || 'Unknown Client';
      const description = timerData.description || 'No description';
      const startTime = new Date(timerData.startTime);
      const elapsed = this.formatElapsedTime(Date.now() - startTime.getTime());
      
      this.tray.setToolTip(`myHours - Timer Running\n${clientName}\n${description}\nElapsed: ${elapsed}`);
    } else {
      // Clear timer display
      this.tray.setTitle('');
      this.tray.setToolTip('myHours Time Tracker');
    }
    
    // Refresh the menu to update timer-related items
    this.setupTrayMenu();
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
        this.setupTrayMenu();
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

module.exports = MacOSTrayService;
