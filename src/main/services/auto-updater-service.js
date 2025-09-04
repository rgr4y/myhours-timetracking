const electronBuiltin = require('electron');
const logger = require('./logger-service');

class AutoUpdaterService {
  constructor(mainWindow, versionService, isDev, electronModule) {
    this.mainWindow = mainWindow;
    this.versionService = versionService;
    this.isDev = isDev;
    this.electron = electronModule || electronBuiltin;
    this._autoUpdater = null; // lazy-loaded in native setup
    this.updater = {
      mode: null, // 'mock' | 'native' | 'disabled'
      lastInfo: null,
      inProgress: false,
      feedUrl: null
    };
  }

  setup() {
    // Only support macOS for updater features per requirement
    if (process.platform !== 'darwin') {
      logger.debug('[UPDATER] Disabled: non-macOS platform');
      this.updater.mode = 'disabled';
      return;
    }

    if (this.isDev) {
      this.setupMockUpdater();
    } else {
      this.setupNativeUpdater();
    }
  }

  setupMockUpdater() {
    const defaultUrl = 'http://127.0.0.1:3010/mock-update.json';
    const feedUrl = process.env.MYHOURS_DEV_UPDATE_URL || defaultUrl;
    logger.debug('[UPDATER] Dev mock enabled. Feed URL:', feedUrl);
    this.updater.mode = 'mock';
    this.updater.feedUrl = feedUrl;

    const sendEvent = (type, payload = {}) => {
      logger.debug('[UPDATER] (mock event)', type, payload);
      try { this.mainWindow?.webContents?.send('updater:event', { type, payload }); } catch (_) {}
    };

    const fetchJson = async (url) => {
      return new Promise((resolve, reject) => {
        try {
          const { URL } = require('url');
          const parsed = new URL(url);
          const isHttps = parsed.protocol === 'https:';
          const http = require(isHttps ? 'https' : 'http');
          const req = http.request({
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + (parsed.search || ''),
            method: 'GET',
            timeout: 4000,
            headers: { 'Accept': 'application/json' }
          }, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const json = JSON.parse(data);
                  resolve(json);
                } catch (e) {
                  reject(new Error(`Invalid JSON from feed: ${e.message}`));
                }
              } else {
                reject(new Error(`HTTP ${res.statusCode} from feed`));
              }
            });
          });
          req.on('timeout', () => {
            req.destroy(new Error('request timeout'));
          });
          req.on('error', reject);
          req.end();
        } catch (e) {
          reject(e);
        }
      });
    };

    // Simple semantic version compare: returns -1, 0, 1
    const cmp = (a, b) => {
      const sanitize = (v) => String(v).split('-')[0].split('.').map(x => parseInt(x, 10) || 0);
      const pa = sanitize(a); const pb = sanitize(b);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const da = pa[i] || 0; const db = pb[i] || 0;
        if (da < db) return -1; if (da > db) return 1;
      }
      return 0;
    };

    // IPC handlers for mock updater
    this.electron.ipcMain.handle('update:check', async () => {
      try {
        sendEvent('checking-for-update');
        const info = await fetchJson(this.updater.feedUrl);
        this.updater.lastInfo = info;
        const current = this.versionService.getBaseVersion();
        if (info && info.version && cmp(current, info.version) < 0) {
          const notesUrl = info.version ? `https://github.com/rgr4y/myhours-timetracking/releases/tag/v${info.version}` : undefined;
          sendEvent('update-available', { version: info.version, notes: info.notes || '', notesUrl });
          return { available: true, info };
        }
        sendEvent('update-not-available', { current });
        return { available: false, info: { current } };
      } catch (err) {
        logger.debug('[UPDATER] Mock check error:', err);
        sendEvent('error', { message: err && err.message ? err.message : String(err) });
        return { error: err.message };
      }
    });

    this.electron.ipcMain.handle('update:getFeedUrl', async () => {
      return { url: this.updater.feedUrl };
    });

    this.electron.ipcMain.handle('update:setFeedUrl', async (_e, url) => {
      try {
        if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
          throw new Error('Invalid URL');
        }
        this.updater.feedUrl = url;
        logger.debug('[UPDATER] Dev mock feed URL set to:', url);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    this.electron.ipcMain.handle('update:download', async () => {
      // Simulate download progress
      if (!this.updater.lastInfo) return { error: 'No update info. Call update:check first.' };
      if (this.updater.inProgress) return { error: 'Download already in progress' };
      this.updater.inProgress = true;
      try {
        let percent = 0;
        while (percent < 100) {
          await new Promise(r => setTimeout(r, 120));
          percent = Math.min(100, percent + Math.random() * 18);
          const transferred = Math.round(percent * 1000000 / 100);
          const total = 1000000;
          const bytesPerSecond = 200000 + Math.round(Math.random() * 150000);
          logger.debug('[UPDATER] (mock) progress', percent.toFixed(1) + '%');
          sendEvent('download-progress', { percent, transferred, total, bytesPerSecond });
        }
        sendEvent('update-downloaded', { version: this.updater.lastInfo.version });
        // Prompt to install (dev mock)
        try {
          const res = await this.electron.dialog.showMessageBox(this.mainWindow, {
            type: 'question',
            buttons: ['Install Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
            title: 'Update Ready',
            message: `Version ${this.updater.lastInfo.version} has been downloaded. Install now?`
          });
          if (res.response === 0) {
            sendEvent('will-install');
            logger.debug('[UPDATER] (mock) install triggered via prompt');
          }
        } catch (_) {}
        return { downloaded: true };
      } finally {
        this.updater.inProgress = false;
      }
    });

    this.electron.ipcMain.handle('update:install', async () => {
      // In dev, just simulate a relaunch
      sendEvent('will-install');
      logger.debug('[UPDATER] (mock) install triggered');
      return { installed: true };
    });
  }

  setupNativeUpdater() {
    try {
      // Lazy load electron-updater only in native setup
      const { autoUpdater } = require('electron-updater');
      this._autoUpdater = autoUpdater;
      // Configure auto-updater
      this._autoUpdater.logger = console;
      if (this._autoUpdater.logger.transports && this._autoUpdater.logger.transports.file) {
        this._autoUpdater.logger.transports.file.level = 'info';
      }
      // Prod: check-only, do not auto-download
      try { this._autoUpdater.autoDownload = false; } catch (_) {}
      try { this._autoUpdater.autoInstallOnAppQuit = true; } catch (_) {}
      this.updater.mode = 'native';
      logger.debug('[UPDATER] Setting up electron-updater (macOS) ...');

      // Explicitly point to GitHub releases (also embedded via app-update.yml)
      try {
        this._autoUpdater.setFeedURL({
          provider: 'github',
          owner: 'rgr4y',
          repo: 'myhours-timetracking',
          releaseType: 'release'
        });
        logger.debug('[UPDATER] Feed set to GitHub releases: rgr4y/myhours-timetracking');
      } catch (e) {
        logger.warn('[UPDATER] setFeedURL failed (will use embedded config):', e.message);
      }

      // Diagnostics
      try {
        logger.debug('[UPDATER] updateConfigPath:', this._autoUpdater.updateConfigPath);
      } catch (_) {}

      const forward = (type, payload = {}) => {
        try { this.mainWindow?.webContents?.send('updater:event', { type, payload }); } catch (_) {}
      };

      this._autoUpdater.on('checking-for-update', () => {
        logger.debug('[UPDATER] Checking for update...');
        forward('checking-for-update');
      });
      this._autoUpdater.on('update-available', (info) => {
        const version = info?.version;
        const notes = info?.releaseNotes;
        const notesUrl = version ? `https://github.com/rgr4y/myhours-timetracking/releases/tag/v${version}` : undefined;
        logger.debug('[UPDATER] Update available:', version);
        forward('update-available', { version, notes, notesUrl });
      });
      this._autoUpdater.on('update-not-available', (info) => {
        logger.debug('[UPDATER] Update not available:', info?.version);
        forward('update-not-available', { version: info?.version });
      });
      this._autoUpdater.on('error', (err) => {
        logger.debug('[UPDATER] Error in auto-updater:', err);
        forward('error', { message: err?.message || String(err) });
      });
      this._autoUpdater.on('download-progress', (progressObj) => {
        forward('download-progress', progressObj);
      });
      this._autoUpdater.on('update-downloaded', async (info) => {
        const version = info?.version;
        logger.debug('[UPDATER] Update downloaded:', version);
        forward('update-downloaded', { version });
        // Prompt to install now
        try {
          const res = await this.electron.dialog.showMessageBox(this.mainWindow, {
            type: 'question',
            buttons: ['Install Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
            title: 'Update Ready',
            message: `Version ${version || ''} has been downloaded. Install now?`
          });
          if (res.response === 0) {
            this._autoUpdater.quitAndInstall();
          }
        } catch (e) {
          logger.warn('[UPDATER] Install prompt failed:', e);
        }
      });

      // IPC wrappers to control native updater too
      ipcMain.handle('update:check', async () => {
        try { await this._autoUpdater.checkForUpdates(); return { started: true }; } catch (e) { return { error: e.message }; }
      });
      ipcMain.handle('update:download', async () => {
        try { await this._autoUpdater.downloadUpdate(); return { started: true }; } catch (e) { return { error: e.message }; }
      });
      ipcMain.handle('update:install', async () => {
        try { 
          forward('will-install');
          this._autoUpdater.quitAndInstall(); 
          return { quitting: true }; 
        } catch (e) { 
          return { error: e.message }; 
        }
      });
    } catch (e) {
      logger.warn('[UPDATER] Failed to set up native updater:', e);
      this.updater.mode = 'disabled';
    }
  }

  async checkForUpdates() {
    if (!this.isDev && process.platform === 'darwin' && this.updater.mode === 'native' && this._autoUpdater) {
      try {
        await this._autoUpdater.checkForUpdates(); // check-only (no auto download)
      } catch (e) {
        logger.warn('[UPDATER] checkForUpdates failed:', e.message);
      }
    }
  }

  getUpdaterMode() {
    return this.updater.mode;
  }
}

module.exports = AutoUpdaterService;
