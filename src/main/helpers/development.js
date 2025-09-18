import { ipcMain } from 'electron';

import logger from '../services/logger-service.js';

const isDevelopment = process.env.NODE_ENV === 'development';

if (!isDevelopment) {
  console.warn('[development.js] 🟡 Skipping setup in non-development environment');
}

export async function waitForDevServer(url, timeoutMs = 15000, intervalMs = 250) {
  if (!isDevelopment) {
    return;
  }

  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';
  const httpModule = await import(isHttps ? 'https' : 'http');
  const httpClient = httpModule.default ?? httpModule;
  const startedAt = Date.now();

  const tryOnce = () => new Promise((resolve, reject) => {
    const req = httpClient.get({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      timeout: Math.min(2000, intervalMs)
    }, (res) => {
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
    } catch (error) {
      logger.debug('[MAIN-DEV] Dev server polling error:', error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('[MAIN-DEV] Dev server not reachable within timeout');
}

export async function setupWebSocketServer() {
  if (!isDevelopment) {
    logger.debug('[WEBSOCKET] Skipping WebSocket server outside of development');
    return null;
  }

  const { WebSocketServer } = await import('ws');

  logger.debug('[WEBSOCKET] Starting WebSocket server on port 3001...');
  const wsServer = new WebSocketServer({ port: 3001 });

  wsServer.on('connection', (ws) => {
    logger.debug('[WEBSOCKET] Browser client connected');

    ws.on('message', async (message) => {
      let request;
      try {
        request = JSON.parse(message);
        const mockEvent = {
          sender: {
            send: () => {},
            webContents: {
              send: () => {}
            }
          }
        };

        const handler = ipcMain._invokeHandlers?.get(request.channel);

        if (!handler) {
          throw new Error(`No handler registered for channel: ${request.channel}`);
        }

        const result = await handler(mockEvent, ...(request.args ?? []));

        ws.send(JSON.stringify({
          id: request.id,
          result,
          error: null
        }));
      } catch (error) {
        logger.error('[WEBSOCKET] Error handling IPC request:', error);
        ws.send(JSON.stringify({
          id: request?.id ?? null,
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

export function configureDevelopment() {
  if (!isDevelopment) {
    return;
  }

  logger.main('info', '[MAIN-DEV] Configuring development environment');

  if (process.env.ELECTRON_ENABLE_LOGGING) {
    logger.debug('[MAIN-DEV] Enhanced logging enabled');

    process.on('uncaughtException', (error) => {
      logger.error('[MAIN-DEV] Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[MAIN-DEV] Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }
}
