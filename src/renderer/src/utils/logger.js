/**
 * Logger utility that forwards all console methods to the backend logger via IPC
 * while maintaining full console.* compatibility using Proxy
 * Features message queueing when IPC is unavailable
 */

const createLogger = () => {
  // Message queue for when IPC is not available
  let messageQueue = [];
  let isFlushingQueue = false;
  
  // Check if electronAPI is available
  const hasElectronAPI = () => typeof window !== 'undefined' && window.electronAPI && window.electronAPI.console;

  // Flush queued messages when IPC becomes available
  const flushQueue = async () => {
    if (isFlushingQueue || !hasElectronAPI() || messageQueue.length === 0) {
      return;
    }
    
    isFlushingQueue = true;
    const queueToFlush = [...messageQueue];
    messageQueue = [];
    
    try {
      for (const { method, args, timestamp } of queueToFlush) {
        await window.electronAPI.console.log(method, `[QUEUED ${timestamp}]`, ...args);
      }
    } catch (error) {
      // If flushing fails, put messages back in queue
      messageQueue = [...queueToFlush, ...messageQueue];
    } finally {
      isFlushingQueue = false;
    }
  };

  // Periodically check if IPC becomes available
  const startQueueMonitor = () => {
    const checkInterval = setInterval(() => {
      if (hasElectronAPI()) {
        flushQueue();
        // Keep checking in case more messages are queued
      }
    }, 1000);
    
    // Clean up after 30 seconds to avoid memory leaks
    setTimeout(() => clearInterval(checkInterval), 30000);
  };

  // Start monitoring immediately
  if (typeof window !== 'undefined') {
    // Use a short delay to allow electronAPI to be set up
    setTimeout(startQueueMonitor, 100);
  }

  // Create proxy that forwards all method calls to IPC
  return new Proxy({}, {
    get(target, prop) {
      return (...args) => {
        // Always call local console first for immediate feedback
        if (console[prop] && typeof console[prop] === 'function') {
          console[prop](`[RNDRLOG-${prop.toUpperCase()}]`, ...args);
        } else {
          console.log(`[RNDRLOG-${prop.toUpperCase()}]`, ...args);
        }

        // Forward to backend logger via IPC or queue for later
        if (hasElectronAPI()) {
          try {
            // Call the appropriate method on electronAPI.console
            if (window.electronAPI.console[prop] && typeof window.electronAPI.console[prop] === 'function') {
              window.electronAPI.console[prop](...args);
            } else {
              // Fallback for unsupported methods
              window.electronAPI.console.log(prop, ...args);
            }
            // If we have queued messages, flush them now
            if (messageQueue.length > 0) {
              flushQueue();
            }
          } catch (error) {
            // If IPC fails, queue the message
            messageQueue.push({
              method: prop,
              args,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          // Queue the message for when IPC becomes available
          messageQueue.push({
            method: prop,
            args,
            timestamp: new Date().toISOString()
          });
        }
      };
    }
  });
};

// Create and export the logger instance
const logger = createLogger();

export default logger;