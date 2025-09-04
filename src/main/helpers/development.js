const { app, ipcMain } = require('electron');
const logger = require('../services/logger-service');

/**
 * Wait for the CRA dev server to be reachable before loading it in Electron
 */


if (process.env.NODE_ENV !== 'development') {
  console.warn('[development.js] 🟡 Skipping setup in non-development environment');
  return;
}

async function waitForDevServer(url, timeoutMs = 15000, intervalMs = 250) {
  const { URL } = require('url');
  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';
  const http = require(isHttps ? 'https' : 'http');
  const startedAt = Date.now();
  const tryOnce = () => new Promise((resolve, reject) => {
    const req = http.get({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      timeout: Math.min(2000, intervalMs)
    }, (res) => {
      // Treat any response as a signal the server is up
      res.resume();
      resolve(res.statusCode);
    });
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
  });
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const code = await tryOnce();
      logger.debug('[MAIN-DEV] Dev server responded with status:', code);
      return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('[MAIN-DEV] Dev server not reachable within timeout');
}

/**
 * Set up WebSocket server for browser debugging (dev mode only)
 */
async function setupWebSocketServer() {
  const WebSocket = require('ws');
  
  logger.debug('[WEBSOCKET] Starting WebSocket server on port 3001...');
  const wsServer = new WebSocket.Server({ port: 3001 });

  wsServer.on('connection', (ws) => {
    logger.debug('[WEBSOCKET] Browser client connected');

    ws.on('message', async (message) => {
      try {
        const request = JSON.parse(message);

        // Create a mock event object for IPC handler compatibility
        const mockEvent = {
          sender: {
            send: () => {},
            webContents: {
              send: () => {}
            }
          }
        };

        // Dynamically forward the IPC call to the main process handler
        const handler = ipcMain._invokeHandlers?.get(request.channel);
        
        if (!handler) {
          throw new Error(`No handler registered for channel: ${request.channel}`);
        }

        const result = await handler(mockEvent, ...(request.args || []));

        ws.send(JSON.stringify({
          id: request.id,
          result: result,
          error: null
        }));
      } catch (error) {
        logger.error('[WEBSOCKET] Error handling IPC request:', error);
        ws.send(JSON.stringify({
          id: request.id,
          result: null,
          error: error.message
        }));
      }
    });

    ws.on('close', () => {
      logger.debug('[WEBSOCKET] Browser client disconnected');
    });

    ws.on('error', (error) => {
      logger.error('[WEBSOCKET] Client error:', error);
    });
  });

  wsServer.on('error', (error) => {
    logger.error('[WEBSOCKET] Server error:', error);
  });

  logger.debug('[WEBSOCKET] WebSocket server started successfully');
  return wsServer;
}

/**
 * Configure development-specific Electron settings
 */
function configureDevelopment() {
  logger.main('info', '[MAIN-DEV] Configuring development environment');

  // Enhanced logging for development
  if (process.env.ELECTRON_ENABLE_LOGGING) {
    logger.debug('[MAIN-DEV] Enhanced logging enabled');
    
    // Log unhandled errors
    process.on('uncaughtException', (error) => {
      logger.error('[MAIN-DEV] Uncaught Exception:', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[MAIN-DEV] Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }
}

module.exports = {
  configureDevelopment,
  waitForDevServer,
  setupWebSocketServer
};
