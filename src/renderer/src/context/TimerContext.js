import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const { waitForReady } = useElectronAPI();

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
  }, [isRunning, activeTimer, waitForReady]);

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

  const startTimer = async (timerData = {}, timerDescription = '') => {
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
  };

  const stopTimer = async (roundTo = 15) => {
    console.log('[TimerContext] Stopping timer:', activeTimer?.id, 'roundTo:', roundTo);
    
    if (activeTimer) {
      try {
        const api = await waitForReady();
        if (api && api.invoke) {
          const stoppedEntry = await api.invoke('db:stopTimer', activeTimer.id, roundTo);
          console.log('[TimerContext] Timer stopped successfully:', stoppedEntry);
          
          // Only clear state after successful database operation
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
        throw error;
      }
    }
  };

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

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
