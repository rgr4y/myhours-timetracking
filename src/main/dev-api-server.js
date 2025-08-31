const express = require('express');
const cors = require('cors');

class DevApiServer {
  constructor(database, invoiceGenerator) {
    this.database = database;
    this.invoiceGenerator = invoiceGenerator;
    this.app = express();
    this.server = null;
    this.ipcHandlers = new Map();
  }

  // Register all IPC handlers that exist in main.js
  registerIpcHandlers(ipcMain) {
    // Store reference to existing IPC handlers by capturing their calls
    const originalHandle = ipcMain.handle.bind(ipcMain);
    
    ipcMain.handle = (channel, handler) => {
      this.ipcHandlers.set(channel, handler);
      return originalHandle(channel, handler);
    };
  }

  setupRoutes() {
    this.app.use(cors());
    this.app.use(express.json());

    // IPC forwarding endpoint
    this.app.post('/api/ipc/:channel', async (req, res) => {
      try {
        const { channel } = req.params;
        const { args = [] } = req.body;

        console.log(`[DEV-API] IPC call: ${channel}`, args);

        const handler = this.ipcHandlers.get(channel);
        if (!handler) {
          return res.status(404).json({ error: `No handler for channel: ${channel}` });
        }

        // Create mock event object
        const event = {};
        const result = await handler(event, ...args);
        
        res.json({ result });
      } catch (error) {
        console.error(`[DEV-API] Error handling ${req.params.channel}:`, error);
        res.status(500).json({ 
          error: error.message,
          stack: error.stack 
        });
      }
    });

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Dev API server running' });
    });
  }

  start(port = 3001) {
    if (process.env.NODE_ENV !== 'development') {
      console.log('[DEV-API] Skipping dev API server in production');
      return;
    }

    this.setupRoutes();

    this.server = this.app.listen(port, () => {
      console.log(`[DEV-API] Development API server running on http://localhost:${port}`);
    });

    return this.server;
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = DevApiServer;
