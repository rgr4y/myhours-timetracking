import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useElectronAPI } from '../hooks/useElectronAPI';
import logger from '../utils/logger';

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
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [description, setDescription] = useState('');
  const [isStoppingTimer, setIsStoppingTimer] = useState(false); // Prevent multiple stop operations
  const { waitForReady } = useElectronAPI();
  const trayListenersSetup = useRef(false); // Track if listeners are already setup
  
  // Refs to avoid stale closures in event handlers
  const activeTimerRef = useRef(activeTimer);
  const isStoppingTimerRef = useRef(isStoppingTimer);
  const startTimerRef = useRef(null);
  const stopTimerRef = useRef(null);

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
      logger.error('[TimerContext] Error updating tray status:', error);
    }
  }, [waitForReady]);

  // Check for active timer on initialization
  const checkActiveTimer = useCallback(async () => {
    // logger.log('[TimerContext] Checking for active timer...');
    // Don't check if we already have an active timer running
    if (isRunning && activeTimer) {
      // logger.log('[TimerContext] Skipping check - timer already running');
      return;
    }
    
    try {
      const api = await waitForReady();
      if (api && api.invoke) {
        const timer = await api.invoke('db:getActiveTimer');
        
        if (timer) {
          logger.log('[TimerContext] Found active timer:', timer);
          setActiveTimer(timer);
          setIsRunning(true);
          
          // Calculate elapsed time using the correct Prisma field names
          try {
            const startTime = new Date(timer.startTime); // Changed from timer.start_time
            logger.log('[TimerContext] Start time:', timer.startTime, 'Parsed:', startTime);
            
            if (isNaN(startTime.getTime())) {
              logger.error('[TimerContext] Invalid start time, defaulting to 0');
              setTime(0);
            } else {
              const elapsed = Math.floor((new Date() - startTime) / 1000);
              logger.log('[TimerContext] Calculated elapsed time:', elapsed, 'seconds');
              setTime(elapsed);
            }
          } catch (error) {
            logger.error('[TimerContext] Error calculating elapsed time:', error);
            setTime(0);
          }
          
          setDescription(timer.description || '');
          
          // Load client if timer has one - using correct Prisma field names
          if (timer.clientId || timer.client) { // Check both clientId and included client relation
            try {
              if (timer.client) {
                // Client is already included in the relation
                logger.log('[TimerContext] Using included client:', timer.client);
                setSelectedClient(timer.client);
              } else if (timer.clientId) {
                // Need to load client by ID
                logger.log('[TimerContext] Loading client by ID:', timer.clientId);
                const clients = await api.invoke('db:getClients');
                const client = clients.find(c => c.id === timer.clientId);
                if (client) {
                  setSelectedClient(client);
                }
              }
            } catch (error) {
              logger.error('[TimerContext] Error loading client for timer:', error);
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
          logger.log('[TimerContext] No active timer found');
          // Only reset if we don't currently have a running timer
          if (!isRunning) {
            setIsRunning(false);
            setTime(0);
            setActiveTimer(null);
          }
        }
      }
    } catch (error) {
      logger.error('[TimerContext] Error waiting for electronAPI:', error);
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
    logger.log('[TimerContext] Starting timer with data:', timerData, 'description:', timerDescription);
    
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
          logger.log('[TimerContext] Timer started successfully:', timer);
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
              logger.error('[TimerContext] Error loading client:', error);
            }
          } else {
            setSelectedClient(null);
          }
          
          // Load and set project if provided
          if (projectId) {
            try {
              const projects = await api.invoke('db:getProjects');
              const project = projects.find(p => p.id === projectId);
              if (project) {
                setSelectedProject(project);
              }
            } catch (error) {
              logger.error('[TimerContext] Error loading project:', error);
            }
          } else {
            setSelectedProject(null);
          }
          
          // Load and set task if provided
          if (taskId) {
            try {
              const tasks = await api.invoke('db:getTasks');
              const task = tasks.find(t => t.id === taskId);
              if (task) {
                setSelectedTask(task);
              }
            } catch (error) {
              logger.error('[TimerContext] Error loading task:', error);
            }
          } else {
            setSelectedTask(null);
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
          
          // Emit timer-started event to notify other components
          const startEvent = new CustomEvent('timer-started', { detail: timer });
          window.dispatchEvent(startEvent);
          
          return timer;
        } else {
          throw new Error('Failed to start timer - no response from backend');
        }
      } else {
        throw new Error('electronAPI not available');
      }
    } catch (error) {
      logger.error('[TimerContext] Error starting timer:', error);
      throw error;
    }
  }, [waitForReady, updateTrayStatus]);

  const stopTimer = useCallback(async (roundTo = 15) => {
    logger.log('[TimerContext] Stopping timer, roundTo:', roundTo);
    
    // Prevent multiple simultaneous stop operations
    if (isStoppingTimer) {
      logger.log('[TimerContext] Timer stop already in progress, skipping');
      return;
    }
    
    setIsStoppingTimer(true);
    
    try {
      // Always check for the latest active timer state first
      await checkActiveTimer();
      
      // Get the most current active timer (either from state or fresh from DB)
      let currentActiveTimer = activeTimerRef.current;
      
      // If we still don't have an active timer, try to get it directly from the database
      if (!currentActiveTimer) {
        logger.log('[TimerContext] No active timer in state, checking database directly...');
        try {
          const api = await waitForReady();
          if (api && api.invoke) {
            currentActiveTimer = await api.invoke('db:getActiveTimer');
            if (currentActiveTimer) {
              logger.log('[TimerContext] Found active timer in database:', currentActiveTimer);
              // Update state with the found timer
              setActiveTimer(currentActiveTimer);
              setIsRunning(true);
            }
          }
        } catch (error) {
          logger.error('[TimerContext] Error getting active timer from database:', error);
        }
      }
      
      if (!currentActiveTimer) {
        logger.log('[TimerContext] No active timer to stop');
        return;
      }
      
      logger.log('[TimerContext] Stopping timer:', currentActiveTimer.id);
      
      const api = await waitForReady();
      if (api && api.invoke) {
        const stoppedEntry = await api.invoke('db:stopTimer', currentActiveTimer.id, roundTo);
        logger.log('[TimerContext] Timer stopped successfully:', stoppedEntry);
        
        // Only clear state after successful database operation
        setActiveTimer(null);
        setIsRunning(false);
        setTime(0);
        // Keep description, selectedClient, selectedProject, and selectedTask so user can easily start a new timer
        // setDescription('');  // Don't clear description
        // setSelectedClient(null);  // Don't clear selected client
        // setSelectedProject(null);  // Don't clear selected project  
        // setSelectedTask(null);  // Don't clear selected task
        
        // Clear tray status
        updateTrayStatus(null);
        
        // Emit timer-stopped event to notify other components
        const stopEvent = new CustomEvent('timer-stopped', { detail: stoppedEntry });
        window.dispatchEvent(stopEvent);
        
        return stoppedEntry;
      }
    } catch (error) {
      logger.error('[TimerContext] Error stopping timer:', error);
      // Don't throw error anymore since we made stopTimer more forgiving
      // Just clear the timer state to prevent UI inconsistencies, but keep selection
      setActiveTimer(null);
      setIsRunning(false);
      setTime(0);
      // Keep description and selectedClient for user convenience
      // setDescription('');  // Don't clear description
      // setSelectedClient(null);  // Don't clear selected client
      updateTrayStatus(null);
    } finally {
      setIsStoppingTimer(false);
    }
  }, [waitForReady, updateTrayStatus, isStoppingTimer, checkActiveTimer]);

  // Update refs when timer functions change
  useEffect(() => {
    startTimerRef.current = startTimer;
  }, [startTimer]);

  useEffect(() => {
    stopTimerRef.current = stopTimer;
  }, [stopTimer]);

  const updateTimerDescription = async (newDescription) => {
    setDescription(newDescription);
    
    // If there's an active timer, update it in the database immediately
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.timeEntries) {
          logger.log('[TimerContext] Updating timer description in database:', newDescription);
          await api.timeEntries.update(activeTimer.id, {
            description: newDescription
          });
          logger.log('[TimerContext] Timer description updated successfully');
        }
      } catch (error) {
        logger.error('[TimerContext] Error updating timer description:', error);
        // Don't throw the error to avoid disrupting the UI
      }
    }
  };

  const updateTimerClient = async (client) => {
    logger.log('[TimerContext] Updating timer client to:', client);
    setSelectedClient(client);
    
    // If there's an active timer, update it in the database
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.invoke) {
          const updatedTimer = await api.invoke('db:updateTimeEntry', activeTimer.id, {
            clientId: client ? client.id : null
          });
          logger.log('[TimerContext] Timer client updated in database:', updatedTimer);
          
          // Update the activeTimer state with the new client info
          setActiveTimer(prevTimer => ({
            ...prevTimer,
            clientId: client ? client.id : null,
            client: client
          }));
        }
      } catch (error) {
        logger.error('[TimerContext] Error updating timer client:', error);
        // If database update fails, revert the client selection
        throw error;
      }
    }
  };

  const updateTimerTask = async (task) => {
    logger.log('[TimerContext] Updating timer task to:', task);
    
    // Update the selected task state
    setSelectedTask(task);
    
    // If there's an active timer, update it in the database
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.invoke) {
          const updatedTimer = await api.invoke('db:updateTimeEntry', activeTimer.id, {
            taskId: task ? task.id : null
          });
          logger.log('[TimerContext] Timer task updated in database:', updatedTimer);
          
          // Update the activeTimer state with the new task info
          setActiveTimer(prevTimer => ({
            ...prevTimer,
            taskId: task ? task.id : null,
            task: task
          }));
        }
      } catch (error) {
        logger.error('[TimerContext] Error updating timer task:', error);
        throw error;
      }
    }
  };

  const updateTimerProject = async (project) => {
    logger.log('[TimerContext] Updating timer project to:', project);
    
    // Update the selected project state and clear task when project changes
    setSelectedProject(project);
    setSelectedTask(null);
    
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.invoke) {
          const updatedTimer = await api.invoke('db:updateTimeEntry', activeTimer.id, {
            projectId: project ? project.id : null,
            // Ensure task is cleared if project changes
            taskId: null
          });
          logger.log('[TimerContext] Timer project updated in database:', updatedTimer);
          setActiveTimer(prevTimer => ({
            ...prevTimer,
            projectId: project ? project.id : null,
            taskId: null,
            task: null
          }));
        }
      } catch (error) {
        logger.error('[TimerContext] Error updating timer project:', error);
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
    selectedProject,
    selectedTask,
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
          logger.log('[TimerContext] Start timer requested from tray');
          // Emit event that components can listen to show timer modal
          const event = new CustomEvent('show-timer-modal');
          window.dispatchEvent(event);
        };
        
        const handleTrayStopTimer = async () => {
          logger.log('[TimerContext] Stop timer requested from tray');
          // stopTimer now handles finding the active timer internally
          try {
            // Use the current stopTimer function from context
            const currentStopTimer = stopTimerRef.current;
            if (currentStopTimer) {
              await currentStopTimer(15); // Use default rounding
            }
            // Emit event to refresh time entries
            const refreshEvent = new CustomEvent('refresh-time-entries');
            window.dispatchEvent(refreshEvent);
          } catch (error) {
            logger.error('[TimerContext] Error stopping timer from tray:', error);
          }
        };
        
        const handleTrayQuickStartTimer = async (event, data) => {
          logger.log('[TimerContext] Quick start timer from tray:', data);
          if (data && data.clientId) {
            try {
              // Use the current startTimer function from context
              const currentStartTimer = startTimerRef.current;
              if (currentStartTimer) {
                await currentStartTimer({
                  clientId: data.clientId,
                  description: `Quick timer for ${data.clientName}`
                });
              }
            } catch (error) {
              logger.error('[TimerContext] Error quick starting timer:', error);
            }
          }
        };
        
        const handleTrayShowTimerSetup = () => {
          logger.log('[TimerContext] Show timer setup from tray');
          const event = new CustomEvent('show-timer-modal');
          window.dispatchEvent(event);
        };
        
        // Register event listeners only once
        api.on('tray-start-timer', handleTrayStartTimer);
        api.on('tray-stop-timer', handleTrayStopTimer);
        api.on('tray-quick-start-timer', handleTrayQuickStartTimer);
        api.on('tray-show-timer-setup', handleTrayShowTimerSetup);
        
        trayListenersSetup.current = true;
        logger.log('[TimerContext] Tray event listeners setup complete');
        
        // Cleanup listeners on unmount
        return () => {
          logger.log('[TimerContext] Cleaning up tray event listeners');
          api.removeListener('tray-start-timer', handleTrayStartTimer);
          api.removeListener('tray-stop-timer', handleTrayStopTimer);
          api.removeListener('tray-quick-start-timer', handleTrayQuickStartTimer);
          api.removeListener('tray-show-timer-setup', handleTrayShowTimerSetup);
          trayListenersSetup.current = false;
        };
      }
    };

    setupTrayEventListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, use refs to access latest functions

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
