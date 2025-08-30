import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useElectronAPI } from '../hooks/useElectronAPI';

const TimerContext = createContext();

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export const TimerProvider = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [activeTimer, setActiveTimer] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [description, setDescription] = useState('');
  const [isStoppingTimer, setIsStoppingTimer] = useState(false); // Prevent multiple stop operations
  const { waitForReady } = useElectronAPI();
  const trayListenersSetup = useRef(false); // Track if listeners are already setup
  
  // Refs to avoid stale closures in event handlers
  const activeTimerRef = useRef(activeTimer);
  const isStoppingTimerRef = useRef(isStoppingTimer);

  // Update refs when state changes
  useEffect(() => {
    activeTimerRef.current = activeTimer;
  }, [activeTimer]);

  useEffect(() => {
    isStoppingTimerRef.current = isStoppingTimer;
  }, [isStoppingTimer]);

  // Update tray with timer status
  const updateTrayStatus = useCallback(async (timerData = null) => {
    try {
      const api = await waitForReady();
      if (api && api.tray) {
        api.tray.updateTimerStatus(timerData);
      }
    } catch (error) {
      console.error('[TimerContext] Error updating tray status:', error);
    }
  }, [waitForReady]);

  // Check for active timer on initialization
  const checkActiveTimer = useCallback(async () => {
    // console.log('[TimerContext] Checking for active timer...');
    // Don't check if we already have an active timer running
    if (isRunning && activeTimer) {
      // console.log('[TimerContext] Skipping check - timer already running');
      return;
    }
    
    try {
      const api = await waitForReady();
      if (api && api.invoke) {
        const timer = await api.invoke('db:getActiveTimer');
        
        if (timer) {
          console.log('[TimerContext] Found active timer:', timer);
          setActiveTimer(timer);
          setIsRunning(true);
          
          // Calculate elapsed time using the correct Prisma field names
          try {
            const startTime = new Date(timer.startTime); // Changed from timer.start_time
            console.log('[TimerContext] Start time:', timer.startTime, 'Parsed:', startTime);
            
            if (isNaN(startTime.getTime())) {
              console.error('[TimerContext] Invalid start time, defaulting to 0');
              setTime(0);
            } else {
              const elapsed = Math.floor((new Date() - startTime) / 1000);
              console.log('[TimerContext] Calculated elapsed time:', elapsed, 'seconds');
              setTime(elapsed);
            }
          } catch (error) {
            console.error('[TimerContext] Error calculating elapsed time:', error);
            setTime(0);
          }
          
          setDescription(timer.description || '');
          
          // Load client if timer has one - using correct Prisma field names
          if (timer.clientId || timer.client) { // Check both clientId and included client relation
            try {
              if (timer.client) {
                // Client is already included in the relation
                console.log('[TimerContext] Using included client:', timer.client);
                setSelectedClient(timer.client);
              } else if (timer.clientId) {
                // Need to load client by ID
                console.log('[TimerContext] Loading client by ID:', timer.clientId);
                const clients = await api.invoke('db:getClients');
                const client = clients.find(c => c.id === timer.clientId);
                if (client) {
                  setSelectedClient(client);
                }
              }
            } catch (error) {
              console.error('[TimerContext] Error loading client for timer:', error);
            }
          }
          
          // Update tray status with the restored timer
          const clientName = timer.client?.name || 
            (timer.clientId ? 'Loading...' : null);
          updateTrayStatus({
            id: timer.id,
            clientName: clientName,
            description: timer.description || '',
            startTime: timer.startTime
          });
        } else {
          console.log('[TimerContext] No active timer found');
          // Only reset if we don't currently have a running timer
          if (!isRunning) {
            setIsRunning(false);
            setTime(0);
            setActiveTimer(null);
          }
        }
      }
    } catch (error) {
      console.error('[TimerContext] Error waiting for electronAPI:', error);
    }
  }, [isRunning, activeTimer, waitForReady, updateTrayStatus]);

  // Initialize timer state on component mount
  useEffect(() => {
    checkActiveTimer();
  }, [checkActiveTimer]);

  // Timer tick effect - runs when timer is active
  useEffect(() => {
    let interval;
    if (isRunning && activeTimer) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

  // Recalculate elapsed time when window regains focus or becomes visible
  const recalcElapsed = useCallback(() => {
    if (!isRunning || !activeTimer) return;
    try {
      const start = new Date(activeTimer.startTime);
      if (!isNaN(start.getTime())) {
        const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
        setTime(elapsed);
      }
    } catch (_) {
      // ignore
    }
  }, [isRunning, activeTimer]);

  useEffect(() => {
    const onFocus = () => recalcElapsed();
    const onVisibility = () => {
      if (!document.hidden) recalcElapsed();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [recalcElapsed]);

  const startTimer = useCallback(async (timerData = {}, timerDescription = '') => {
    console.log('[TimerContext] Starting timer with data:', timerData, 'description:', timerDescription);
    
    try {
      const api = await waitForReady();
      if (api && api.invoke) {
        // Extract clientId, projectId, taskId and description from the data object
        const clientId = timerData.clientId || null;
        const projectId = timerData.projectId || null;
        const taskId = timerData.taskId || null;
        const description = timerData.description || timerDescription || '';
        
        const timer = await api.invoke('db:startTimer', {
          clientId,
          projectId,
          taskId,
          description
        });
        
        if (timer) {
          console.log('[TimerContext] Timer started successfully:', timer);
          setActiveTimer(timer);
          setIsRunning(true);
          setTime(0);
          setDescription(description);
          
          // Load and set client if provided
          if (clientId) {
            try {
              const clients = await api.invoke('db:getClients');
              const client = clients.find(c => c.id === clientId);
              if (client) {
                setSelectedClient(client);
              }
            } catch (error) {
              console.error('[TimerContext] Error loading client:', error);
            }
          } else {
            setSelectedClient(null);
          }
          
          // Update tray with timer info
          const clientName = clientId ? (await (async () => {
            try {
              const clients = await api.invoke('db:getClients');
              return clients.find(c => c.id === clientId)?.name || 'Unknown Client';
            } catch {
              return 'Unknown Client';
            }
          })()) : null;
          
          updateTrayStatus({
            id: timer.id,
            clientName: clientName,
            description: description,
            startTime: timer.startTime
          });
          
          return timer;
        } else {
          throw new Error('Failed to start timer - no response from backend');
        }
      } else {
        throw new Error('electronAPI not available');
      }
    } catch (error) {
      console.error('[TimerContext] Error starting timer:', error);
      throw error;
    }
  }, [waitForReady, updateTrayStatus]);

  const stopTimer = useCallback(async (roundTo = 15) => {
    console.log('[TimerContext] Stopping timer:', activeTimer?.id, 'roundTo:', roundTo);
    
    // Prevent multiple simultaneous stop operations
    if (isStoppingTimer) {
      console.log('[TimerContext] Timer stop already in progress, skipping');
      return;
    }
    
    if (!activeTimer) {
      console.log('[TimerContext] No active timer to stop');
      return;
    }
    
    setIsStoppingTimer(true);
    try {
      const api = await waitForReady();
      if (api && api.invoke) {
        const stoppedEntry = await api.invoke('db:stopTimer', activeTimer.id, roundTo);
        console.log('[TimerContext] Timer stopped successfully:', stoppedEntry);
        
        // Only clear state after successful database operation
        // (stopTimer now returns null if no timer was found, but that's ok)
        setActiveTimer(null);
        setIsRunning(false);
        setTime(0);
        setDescription('');
        setSelectedClient(null);
        
        // Clear tray status
        updateTrayStatus(null);
      }
    } catch (error) {
      console.error('[TimerContext] Error stopping timer:', error);
      // Don't throw error anymore since we made stopTimer more forgiving
      // Just clear the state to prevent UI inconsistencies
      setActiveTimer(null);
      setIsRunning(false);
      setTime(0);
      setDescription('');
      setSelectedClient(null);
      updateTrayStatus(null);
    } finally {
      setIsStoppingTimer(false);
    }
  }, [activeTimer, waitForReady, updateTrayStatus, isStoppingTimer]);

  const updateTimerDescription = async (newDescription) => {
    setDescription(newDescription);
    
    // If there's an active timer, update it in the database immediately
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.timeEntries) {
          console.log('[TimerContext] Updating timer description in database:', newDescription);
          await api.timeEntries.update(activeTimer.id, {
            description: newDescription
          });
          console.log('[TimerContext] Timer description updated successfully');
        }
      } catch (error) {
        console.error('[TimerContext] Error updating timer description:', error);
        // Don't throw the error to avoid disrupting the UI
      }
    }
  };

  const updateTimerClient = async (client) => {
    console.log('[TimerContext] Updating timer client to:', client);
    setSelectedClient(client);
    
    // If there's an active timer, update it in the database
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.invoke) {
          const updatedTimer = await api.invoke('db:updateTimeEntry', activeTimer.id, {
            clientId: client ? client.id : null
          });
          console.log('[TimerContext] Timer client updated in database:', updatedTimer);
          
          // Update the activeTimer state with the new client info
          setActiveTimer(prevTimer => ({
            ...prevTimer,
            clientId: client ? client.id : null,
            client: client
          }));
        }
      } catch (error) {
        console.error('[TimerContext] Error updating timer client:', error);
        // If database update fails, revert the client selection
        throw error;
      }
    }
  };

  const updateTimerTask = async (task) => {
    console.log('[TimerContext] Updating timer task to:', task);
    
    // If there's an active timer, update it in the database
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.invoke) {
          const updatedTimer = await api.invoke('db:updateTimeEntry', activeTimer.id, {
            taskId: task ? task.id : null
          });
          console.log('[TimerContext] Timer task updated in database:', updatedTimer);
          
          // Update the activeTimer state with the new task info
          setActiveTimer(prevTimer => ({
            ...prevTimer,
            taskId: task ? task.id : null,
            task: task
          }));
        }
      } catch (error) {
        console.error('[TimerContext] Error updating timer task:', error);
        throw error;
      }
    }
  };

  const updateTimerProject = async (project) => {
    console.log('[TimerContext] Updating timer project to:', project);
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.invoke) {
          const updatedTimer = await api.invoke('db:updateTimeEntry', activeTimer.id, {
            projectId: project ? project.id : null,
            // Ensure task is cleared if project changes
            taskId: null
          });
          console.log('[TimerContext] Timer project updated in database:', updatedTimer);
          setActiveTimer(prevTimer => ({
            ...prevTimer,
            projectId: project ? project.id : null,
            taskId: null,
            task: null
          }));
        }
      } catch (error) {
        console.error('[TimerContext] Error updating timer project:', error);
        throw error;
      }
    }
  };

  const formatTime = (seconds) => {
    // Handle invalid input
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '00:00:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const value = {
    // State
    isRunning,
    time,
    activeTimer,
    selectedClient,
    description,
    
    // Actions
    startTimer,
    stopTimer,
    updateTimerDescription,
    updateTimerClient,
    updateTimerTask,
    updateTimerProject,
    checkActiveTimer,
    
    // Utilities
    formatTime
  };

  // Set up tray event listeners - these belong in TimerContext not individual components
  useEffect(() => {
    // Only setup listeners once
    if (trayListenersSetup.current) {
      return;
    }

    const setupTrayEventListeners = async () => {
      const api = await waitForReady();
      if (api && api.on) {
        const handleTrayStartTimer = () => {
          console.log('[TimerContext] Start timer requested from tray');
          // Emit event that components can listen to show timer modal
          const event = new CustomEvent('show-timer-modal');
          window.dispatchEvent(event);
        };
        
        const handleTrayStopTimer = async () => {
          console.log('[TimerContext] Stop timer requested from tray');
          // Use current values via refs instead of stale closure values
          const currentActiveTimer = activeTimerRef.current;
          const currentIsStoppingTimer = isStoppingTimerRef.current;
          
          if (currentActiveTimer && !currentIsStoppingTimer) {
            try {
              await stopTimer(15); // Use default rounding
              // Emit event to refresh time entries
              const refreshEvent = new CustomEvent('refresh-time-entries');
              window.dispatchEvent(refreshEvent);
            } catch (error) {
              console.error('[TimerContext] Error stopping timer from tray:', error);
            }
          } else {
            console.log('[TimerContext] No active timer to stop or stop already in progress');
          }
        };
        
        const handleTrayQuickStartTimer = async (event, data) => {
          console.log('[TimerContext] Quick start timer from tray:', data);
          if (data && data.clientId) {
            try {
              await startTimer({
                clientId: data.clientId,
                description: `Quick timer for ${data.clientName}`
              });
            } catch (error) {
              console.error('[TimerContext] Error quick starting timer:', error);
            }
          }
        };
        
        const handleTrayShowTimerSetup = () => {
          console.log('[TimerContext] Show timer setup from tray');
          const event = new CustomEvent('show-timer-modal');
          window.dispatchEvent(event);
        };
        
        // Register event listeners only once
        api.on('tray-start-timer', handleTrayStartTimer);
        api.on('tray-stop-timer', handleTrayStopTimer);
        api.on('tray-quick-start-timer', handleTrayQuickStartTimer);
        api.on('tray-show-timer-setup', handleTrayShowTimerSetup);
        
        trayListenersSetup.current = true;
        console.log('[TimerContext] Tray event listeners setup complete');
        
        // Cleanup listeners on unmount
        return () => {
          console.log('[TimerContext] Cleaning up tray event listeners');
          api.removeListener('tray-start-timer', handleTrayStartTimer);
          api.removeListener('tray-stop-timer', handleTrayStopTimer);
          api.removeListener('tray-quick-start-timer', handleTrayQuickStartTimer);
          api.removeListener('tray-show-timer-setup', handleTrayShowTimerSetup);
          trayListenersSetup.current = false;
        };
      }
    };

    setupTrayEventListeners();
  }, [waitForReady, startTimer, stopTimer]); // Include the functions we now use directly

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
