const WebSocket = require('ws');

module.exports = function(app) {
  console.log('[SETUP-PROXY] IPC forwarding proxy middleware initialized');
  
  // Add JSON body parser for our API routes
  app.use('/api', require('express').json());
  
  // Store WebSocket connection
  let wsConnection = null;
  let isConnecting = false;
  let connectionAttempts = 0;
  const maxAttempts = 3;

  // Connect to Electron's WebSocket server
  function connectToElectron() {
    if (isConnecting || wsConnection) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      if (connectionAttempts >= maxAttempts) {
        console.log('[SETUP-PROXY] Max connection attempts reached, will retry on next request');
        connectionAttempts = 0; // Reset for future attempts
        reject(new Error('Max connection attempts reached'));
        return;
      }

      isConnecting = true;
      connectionAttempts++;
      console.log(`[SETUP-PROXY] Attempting to connect to Electron WebSocket server (attempt ${connectionAttempts}/${maxAttempts})...`);
      
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.on('open', () => {
        console.log('[SETUP-PROXY] Connected to Electron WebSocket server');
        wsConnection = ws;
        isConnecting = false;
        connectionAttempts = 0; // Reset on successful connection
        resolve();
      });
      
      ws.on('error', (error) => {
        console.warn('[SETUP-PROXY] WebSocket connection failed:', error.message);
        isConnecting = false;
        
        // Retry connection after a delay for failed attempts
        if (connectionAttempts < maxAttempts) {
          setTimeout(() => {
            connectToElectron().catch(() => {});
          }, 2000);
        }
        
        reject(error);
      });
      
      ws.on('close', () => {
        console.log('[SETUP-PROXY] WebSocket connection closed');
        wsConnection = null;
        isConnecting = false;
        
        // Auto-reconnect after a delay
        setTimeout(() => {
          connectionAttempts = 0; // Reset attempts for reconnection
          connectToElectron().catch(() => {});
        }, 2000);
      });
    });
  }

  // API endpoint for IPC forwarding
  app.post('/api/ipc/:channel', async (req, res) => {
    const channel = req.params.channel;
    const args = req.body?.args || [];
    
    // console.log('[SETUP-PROXY] IPC request:', channel);

    // Try to ensure WebSocket connection
    try {
      if (!wsConnection) {
        await connectToElectron();
      }
    } catch (error) {
      console.warn('[SETUP-PROXY] Failed to connect to Electron, using fallback data');
    }

    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      // Forward to Electron via WebSocket
      try {
        const requestId = Date.now() + Math.random();
        const request = {
          id: requestId,
          channel,
          args
        };

        wsConnection.send(JSON.stringify(request));

        // Wait for response
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket request timeout'));
          }, 5000);

          const responseHandler = (message) => {
            try {
              const data = JSON.parse(message);
              if (data.id === requestId) {
                clearTimeout(timeout);
                wsConnection.removeListener('message', responseHandler);
                resolve(data);
              }
            } catch (e) {
              // Ignore parsing errors for other messages
            }
          };

          wsConnection.on('message', responseHandler);
        });

        if (response.error) {
          throw new Error(response.error);
        }

        res.json({
          success: true,
          data: response.result
        });
        
      } catch (error) {
        console.error('[SETUP-PROXY] WebSocket request failed:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    } else {
      // No WebSocket connection - fail the request
      console.error('[SETUP-PROXY] WebSocket not available for:', channel);
      res.status(503).json({
        success: false,
        error: 'WebSocket connection to Electron not available'
      });
    }
  });

  // Initialize connection on startup
  setTimeout(() => {
    connectToElectron().catch(() => {
      console.log('[SETUP-PROXY] Initial connection failed, will retry on first request');
    });
  }, 2000);
};
