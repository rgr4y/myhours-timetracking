import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  // Check for active timer on initialization
  const checkActiveTimer = useCallback(async () => {
    console.log('[TimerContext] Checking for active timer...');
    // Don't check if we already have an active timer running
    if (isRunning && activeTimer) {
      console.log('[TimerContext] Skipping check - timer already running');
      return;
    }
    
    if (window.electronAPI && window.electronAPI.invoke) {
      try {
        const timer = await window.electronAPI.invoke('db:getActiveTimer');
        console.log('[TimerContext] Active timer check result:', timer);
        
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
                const clients = await window.electronAPI.invoke('db:getClients');
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
      } catch (error) {
        console.error('[TimerContext] Error checking active timer:', error);
      }
    }
  }, [isRunning, activeTimer]);

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

  const startTimer = async (timerData = {}, timerDescription = '') => {
    console.log('[TimerContext] Starting timer with data:', timerData, 'description:', timerDescription);
    console.log('[TimerContext] electronAPI available:', !!window.electronAPI);
    console.log('[TimerContext] electronAPI.invoke available:', !!window.electronAPI?.invoke);
    
    if (window.electronAPI) {
      try {
        // Extract clientId and description from the data object
        const clientId = timerData.clientId || null;
        const description = timerData.description || timerDescription || '';
        
        const timer = await window.electronAPI.invoke('db:startTimer', {
          clientId,
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
              const clients = await window.electronAPI.invoke('db:getClients');
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
          
          return timer;
        } else {
          throw new Error('Failed to start timer - no response from backend');
        }
      } catch (error) {
        console.error('[TimerContext] Error starting timer:', error);
        throw error;
      }
    } else {
      throw new Error('electronAPI not available');
    }
  };

  const stopTimer = async (roundTo = 15) => {
    console.log('[TimerContext] Stopping timer:', activeTimer?.id, 'roundTo:', roundTo);
    console.log('[TimerContext] electronAPI available:', !!window.electronAPI);
    console.log('[TimerContext] electronAPI.invoke available:', !!window.electronAPI?.invoke);
    
    if (activeTimer && window.electronAPI) {
      try {
        const stoppedEntry = await window.electronAPI.invoke('db:stopTimer', activeTimer.id, roundTo);
        console.log('[TimerContext] Timer stopped successfully:', stoppedEntry);
        
        // Only clear state after successful database operation
        setActiveTimer(null);
        setIsRunning(false);
        setTime(0);
        setDescription('');
        setSelectedClient(null);
      } catch (error) {
        console.error('[TimerContext] Error stopping timer:', error);
        throw error;
      }
    }
  };

  const updateTimerDescription = (newDescription) => {
    setDescription(newDescription);
  };

  const updateTimerClient = async (client) => {
    console.log('[TimerContext] Updating timer client to:', client);
    setSelectedClient(client);
    
    // If there's an active timer, update it in the database
    if (activeTimer && window.electronAPI) {
      try {
        const updatedTimer = await window.electronAPI.invoke('db:updateTimeEntry', activeTimer.id, {
          clientId: client ? client.id : null
        });
        console.log('[TimerContext] Timer client updated in database:', updatedTimer);
        
        // Update the activeTimer state with the new client info
        setActiveTimer(prevTimer => ({
          ...prevTimer,
          clientId: client ? client.id : null,
          client: client
        }));
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
    if (activeTimer && window.electronAPI) {
      try {
        const updatedTimer = await window.electronAPI.invoke('db:updateTimeEntry', activeTimer.id, {
          taskId: task ? task.id : null
        });
        console.log('[TimerContext] Timer task updated in database:', updatedTimer);
        
        // Update the activeTimer state with the new task info
        setActiveTimer(prevTimer => ({
          ...prevTimer,
          taskId: task ? task.id : null,
          task: task
        }));
      } catch (error) {
        console.error('[TimerContext] Error updating timer task:', error);
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
