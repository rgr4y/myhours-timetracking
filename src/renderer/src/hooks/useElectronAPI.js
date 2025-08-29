import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to safely access electronAPI with race condition protection
 * @returns {Object} { electronAPI, isReady, waitForReady }
 */
export const useElectronAPI = () => {
  const [isReady, setIsReady] = useState(false);
  const [electronAPI, setElectronAPI] = useState(null);

  useEffect(() => {
    const initializeAPI = async () => {
      // Check if API is already available
      if (window.electronAPI) {
        setElectronAPI(window.electronAPI);
        setIsReady(true);
        // console.log('[useElectronAPI] electronAPI is immediately available');
        return;
      }

      // Retry mechanism with exponential backoff
      const maxRetries = 20; // 2 seconds total with increasing intervals
      let retries = 0;
      
      const retry = () => {
        retries++;
        if (window.electronAPI) {
          console.log(`[useElectronAPI] electronAPI found after ${retries} retries`);
          setElectronAPI(window.electronAPI);
          setIsReady(true);
        } else if (retries < maxRetries) {
          // Exponential backoff: 50ms, 100ms, 200ms, etc.
          const delay = Math.min(50 * Math.pow(2, retries - 1), 500);
          setTimeout(retry, delay);
        } else {
          console.error('[useElectronAPI] electronAPI not available after max retries');
          setIsReady(false);
        }
      };
      
      // Start retrying after a short initial delay
      setTimeout(retry, 50);
    };

    initializeAPI();
  }, []);

  const waitForReady = useCallback(async () => {
    if (isReady && electronAPI) {
      return electronAPI;
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for electronAPI'));
      }, 10000); // Increased to 10 seconds
      
      const checkReady = () => {
        if (isReady && electronAPI) {
          clearTimeout(timeout);
          resolve(electronAPI);
        } else if (window.electronAPI) {
          // Fallback - if window.electronAPI is available but our state isn't updated
          clearTimeout(timeout);
          setElectronAPI(window.electronAPI);
          setIsReady(true);
          resolve(window.electronAPI);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }, [isReady, electronAPI]);

  return { electronAPI, isReady, waitForReady };
};

/**
 * Higher-order function to wrap async functions that use electronAPI
 * @param {Function} asyncFn - Function that uses electronAPI
 * @returns {Function} Wrapped function that waits for electronAPI to be ready
 */
export const withElectronAPI = (asyncFn) => {
  return async (...args) => {
    // Simple retry mechanism for direct usage
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
      if (window.electronAPI) {
        try {
          return await asyncFn(window.electronAPI, ...args);
        } catch (error) {
          console.error('[withElectronAPI] Error:', error);
          throw error;
        }
      }
      
      retries++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('electronAPI not available after retries');
  };
};
