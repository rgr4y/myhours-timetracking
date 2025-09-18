import { app } from 'electron';

/**
 * Cross-platform tray service that provides common tray APIs
 * Platform-specific implementations should extend this base class
 */
class TrayService {
  constructor(mainWindow, databaseService) {
    this.mainWindow = mainWindow;
    this.database = databaseService;
    this.tray = null;
    this.contextMenu = null;
    this.isQuitting = false;
    this.currentTimer = null;
    
    // Bind methods to maintain context
    this.updateTimerStatus = this.updateTimerStatus.bind(this);
    this.handleTrayClick = this.handleTrayClick.bind(this);
    this.showWindow = this.showWindow.bind(this);
    this.hideWindow = this.hideWindow.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.stopTimer = this.stopTimer.bind(this);
    this.quickStartTimer = this.quickStartTimer.bind(this);
    this.showTimerSetup = this.showTimerSetup.bind(this);
  }

  // Abstract methods to be implemented by platform-specific classes
  initialize() {
    throw new Error('initialize() must be implemented by platform-specific class');
  }

  loadIcon() {
    throw new Error('loadIcon() must be implemented by platform-specific class');
  }

  createContextMenu() {
    throw new Error('createContextMenu() must be implemented by platform-specific class');
  }

  // Common tray API methods that can be used across platforms

  /**
   * Show the main window
   */
  showWindow() {
    console.log('[TRAY-SERVICE] Showing main window');
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  /**
   * Hide the main window
   */
  hideWindow() {
    console.log('[TRAY-SERVICE] Hiding main window');
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  /**
   * Start a timer via tray
   */
  async startTimer() {
    console.log('[TRAY-SERVICE] Starting timer from tray');
    try {
      this.showWindow();
      this.mainWindow.webContents.send('tray-start-timer');
    } catch (error) {
      console.error('[TRAY-SERVICE] Error starting timer:', error);
    }
  }

  /**
   * Stop the current timer via tray
   */
  async stopTimer() {
    console.log('[TRAY-SERVICE] Stopping timer from tray');
    try {
      this.mainWindow.webContents.send('tray-stop-timer');
    } catch (error) {
      console.error('[TRAY-SERVICE] Error stopping timer:', error);
    }
  }

  /**
   * Quick start timer with specific client
   * @param {Object} clientData - Client data including clientId and clientName
   */
  async quickStartTimer(clientData) {
    console.log('[TRAY-SERVICE] Quick starting timer from tray:', clientData);
    try {
      this.mainWindow.webContents.send('tray-quick-start-timer', clientData);
    } catch (error) {
      console.error('[TRAY-SERVICE] Error quick starting timer:', error);
    }
  }

  /**
   * Show timer setup dialog
   */
  async showTimerSetup() {
    console.log('[TRAY-SERVICE] Showing timer setup from tray');
    try {
      this.showWindow();
      this.mainWindow.webContents.send('tray-show-timer-setup');
    } catch (error) {
      console.error('[TRAY-SERVICE] Error showing timer setup:', error);
    }
  }

  /**
   * Update timer status in tray
   * @param {Object} timerData - Timer data or null to clear
   */
  updateTimerStatus(timerData = null) {
    console.log('[TRAY-SERVICE] Updating timer status:', timerData ? 'Timer active' : 'No timer');
    this.currentTimer = timerData;
    this.createContextMenu();
  }

  /**
   * Quit the application
   */
  quitApplication() {
    console.log('[TRAY-SERVICE] Quitting application');
    this.isQuitting = true;
    app.quit();
  }

  /**
   * Handle tray icon click - default behavior
   */
  handleTrayClick() {
    console.log('[TRAY-SERVICE] Tray clicked');
    if (this.mainWindow.isVisible()) {
      this.hideWindow();
    } else {
      this.showWindow();
    }
  }

  /**
   * Format timer duration for display
   * @param {Date} startTime - Timer start time
   * @returns {string} Formatted time string
   */
  formatTimerDuration(startTime) {
    if (!startTime) return '00:00:00';
    
    try {
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('[TRAY-SERVICE] Error formatting timer duration:', error);
      return '00:00:00';
    }
  }

  /**
   * Get recent clients for quick start menu
   * @returns {Array} Array of recent clients
   */
  async getRecentClients() {
    try {
      const clients = await this.database.getClients();
      // Return first 5 clients for quick start menu
      return clients.slice(0, 5);
    } catch (error) {
      console.error('[TRAY-SERVICE] Error getting recent clients:', error);
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    console.log('[TRAY-SERVICE] Destroying tray service');
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

export default TrayService;
