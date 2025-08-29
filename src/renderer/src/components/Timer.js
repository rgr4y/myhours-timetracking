import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Play, Square, ChevronDown } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { 
  Card, 
  FlexBox, 
  Button, 
  Heading, 
  Text, 
  BigNumber,
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  TextArea
} from './ui';

const TimerContainer = styled.div`
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
`;

const TimerDisplay = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const TimeText = styled(BigNumber)`
  font-size: 72px;
  font-weight: 300;
  margin-bottom: 10px;
  font-variant-numeric: tabular-nums;
`;

const TaskInfo = styled(Text)`
  font-size: 18px;
  margin-bottom: 30px;
  text-align: center;
`;

const ControlsContainer = styled(FlexBox)`
  justify-content: center;
  margin-bottom: 40px;
`;

const ControlButton = styled(Button)`
  border-radius: 50px;
  padding: 15px 30px;
  font-size: 16px;
`;

const TaskSelector = styled(Card)`
  margin-bottom: 30px;
  min-width: 400px;
`;

const SelectorHeader = styled(Heading)`
  margin-bottom: 15px;
`;

const ExpandingTextArea = styled(TextArea)`
  min-height: 40px;
  max-height: 200px;
  resize: none;
  overflow: hidden;
`;

const RoundingSelector = styled(FlexBox)`
  margin-top: 20px;
`;

const RoundingButton = styled(Button)`
  background: ${props => props.$active ? '#007AFF' : '#404040'};
  font-size: 14px;
  padding: 8px 12px;
  
  &:hover {
    background: ${props => props.$active ? '#0056CC' : '#505050'};
  }
`;

const Timer = () => {
  // Use timer context instead of local state
  const {
    isRunning,
    time,
    activeTimer,
    selectedClient,
    description,
    startTimer,
    stopTimer,
    updateTimerDescription,
    updateTimerClient,
    updateTimerTask,
    checkActiveTimer,
    formatTime
  } = useTimer();

  // Local state only for Timer page specific UI
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [localDescription, setLocalDescription] = useState('');
  const [localSelectedClient, setLocalSelectedClient] = useState(null);
  const [localSelectedProject, setLocalSelectedProject] = useState(null);
  const [localSelectedTask, setLocalSelectedTask] = useState(null);
  const [roundTo, setRoundTo] = useState(15);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  
  // Auto-save related state
  const [originalDescription, setOriginalDescription] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isUnloadingRef = useRef(false);
  const textAreaRef = useRef(null);

  // Sync local state with context when timer is running
  useEffect(() => {
    if (activeTimer) {
      setLocalDescription(description);
      setOriginalDescription(description);
      setLocalSelectedClient(selectedClient);
      
      // Restore project and task from active timer
      if (activeTimer.task) {
        setLocalSelectedTask(activeTimer.task);
        if (activeTimer.task.project) {
          setLocalSelectedProject(activeTimer.task.project);
        }
      } else {
        setLocalSelectedTask(null);
        setLocalSelectedProject(null);
      }
      
      setHasUnsavedChanges(false);
    }
  }, [activeTimer, description, selectedClient]);

  // Debug logging
  useEffect(() => {
    // console.log('Timer component state:', { isRunning, activeTimer, time });
  }, [isRunning, activeTimer, time]);

  // Handle page unload and navigation - save description if changed
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeTimer && hasUnsavedChanges) {
        isUnloadingRef.current = true;
        
        // Try to save synchronously (best effort)
        if (window.electronAPI) {
          window.electronAPI.timeEntries.update(activeTimer.id, {
            description: localDescription
          }).catch(err => console.error('Failed to save description on unload:', err));
        }
        
        // Standard way to show confirmation dialog
        e.preventDefault();
        e.returnValue = 'You have unsaved changes to your timer description. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clear timeout on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeTimer, hasUnsavedChanges, localDescription]);

  // Load data on component mount
  useEffect(() => {
    console.log('Timer component mounting...');
    
    const loadClients = async () => {
      console.log('Loading clients...');
      if (window.electronAPI) {
        try {
          // Use the same API call as Projects component
          const clientList = await window.electronAPI.clients.getAll();
          // console.log('Clients loaded:', clientList);
          setClients(clientList);
        } catch (error) {
          console.error('Error loading clients:', error);
          // Fallback to direct IPC call
          try {
            const clientList = await window.electronAPI.invoke('db:getClients');
            console.log('Clients loaded via direct IPC:', clientList);
            setClients(clientList);
          } catch (fallbackError) {
            console.error('Error loading clients via fallback:', fallbackError);
          }
        }
      }
    };

    const initializeData = async () => {
      // Check for active timer first (this will restore if one is running)
      await checkActiveTimer();
      await loadClients();
    };
    
    initializeData();
  }, [checkActiveTimer]);

  // Separate effect for loading last used client - only when timer stops
  useEffect(() => {
    const loadLastUsedClient = async () => {
      console.log('Timer stopped, checking if should load last used client...');
      // Only auto-select last used client when timer stops and no client is selected
      if (window.electronAPI && !activeTimer && !localSelectedClient) {
        try {
          const lastClient = await window.electronAPI.invoke('db:getLastUsedClient');
          
          if (lastClient) {
            console.log('Auto-selecting last used client after timer stop:', lastClient);
            setLocalSelectedClient(lastClient);
          }
        } catch (error) {
          console.error('Error loading last used client:', error);
        }
      }
    };

    // Only run when activeTimer becomes false (timer stops)
    if (!activeTimer) {
      loadLastUsedClient();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer]); // Intentionally not including localSelectedClient to avoid infinite loops

  // Load settings for timer rounding
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI) {
        try {
          const settings = await window.electronAPI.settings.get();
          if (settings.timer_rounding) {
            setRoundTo(parseInt(settings.timer_rounding));
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    };

    loadSettings();
  }, []);

  // Load projects when client changes
  useEffect(() => {
    const loadProjects = async () => {
      if (localSelectedClient && window.electronAPI) {
        try {
          const projectList = await window.electronAPI.projects.getAll(localSelectedClient.id);
          console.log('Projects loaded for client', localSelectedClient.id, ':', projectList);
          setProjects(projectList);
          // Reset project and task selection when client changes
          setLocalSelectedProject(null);
          setLocalSelectedTask(null);
          setTasks([]);
        } catch (error) {
          console.error('Error loading projects:', error);
          setProjects([]);
        }
      } else {
        setProjects([]);
        setLocalSelectedProject(null);
        setLocalSelectedTask(null);
        setTasks([]);
      }
    };

    loadProjects();
  }, [localSelectedClient]);

  // Load tasks when project changes
  useEffect(() => {
    const loadTasks = async () => {
      if (localSelectedProject && window.electronAPI) {
        try {
          const taskList = await window.electronAPI.tasks.getAll(localSelectedProject.id);
          console.log('Tasks loaded for project', localSelectedProject.id, ':', taskList);
          setTasks(taskList);
          // Reset task selection when project changes
          setLocalSelectedTask(null);
        } catch (error) {
          console.error('Error loading tasks:', error);
          setTasks([]);
        }
      } else {
        setTasks([]);
        setLocalSelectedTask(null);
      }
    };

    loadTasks();
  }, [localSelectedProject]);

  const handleStartTimer = async () => {
    console.log('Timer button clicked!');
    console.log('Starting timer with client:', localSelectedClient?.id, 'task:', localSelectedTask?.id, 'description:', localDescription);
    try {
      // Pass data as an object to match the new database service format
      const timerData = {
        clientId: localSelectedClient?.id || null,
        taskId: localSelectedTask?.id || null,
        description: localDescription || ''
      };
      await startTimer(timerData, localDescription);
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer: ' + error.message);
    }
  };

  const handleStopTimer = async () => {
    console.log('Stopping timer with roundTo:', roundTo);
    try {
      await stopTimer(roundTo);
      // Reset local state after stopping
      setLocalDescription('');
      setLocalSelectedClient(null);
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Failed to stop timer: ' + error.message);
    }
  };

  const handleClientSelect = async (client) => {
    console.log('Client selected:', client);
    setLocalSelectedClient(client);
    setDropdownOpen(false);
    
    // If timer is running, update the client in the database immediately
    if (isRunning && activeTimer) {
      try {
        await updateTimerClient(client);
        console.log('Timer client updated successfully');
      } catch (error) {
        console.error('Error updating timer client:', error);
        // Revert the local selection if database update fails
        setLocalSelectedClient(selectedClient);
        alert('Failed to update client: ' + error.message);
      }
    }
  };

  const handleProjectSelect = (project) => {
    console.log('Project selected:', project);
    setLocalSelectedProject(project);
    setProjectDropdownOpen(false);
  };

  const handleTaskSelect = async (task) => {
    console.log('Task selected:', task);
    setLocalSelectedTask(task);
    setTaskDropdownOpen(false);
    
    // If timer is running, update the task in the database immediately
    if (isRunning && activeTimer) {
      try {
        await updateTimerTask(task);
        console.log('Timer task updated successfully');
      } catch (error) {
        console.error('Error updating timer task:', error);
        // Revert the local selection if database update fails
        setLocalSelectedTask(activeTimer.task);
        alert('Failed to update task: ' + error.message);
      }
    }
  };

  // Auto-save function for description updates
  const saveDescriptionToDatabase = useCallback(async (description) => {
    if (!activeTimer || !hasUnsavedChanges || isUnloadingRef.current) {
      return;
    }

    try {
      console.log('Auto-saving description to database:', description);
      await window.electronAPI.timeEntries.update(activeTimer.id, {
        description: description
      });
      
      setOriginalDescription(description);
      setHasUnsavedChanges(false);
      console.log('Description auto-saved successfully');
    } catch (error) {
      console.error('Error auto-saving description:', error);
    }
  }, [activeTimer, hasUnsavedChanges]);

  // Auto-resize textarea based on content
  const autoResizeTextarea = useCallback(() => {
    if (textAreaRef.current) {
      const textarea = textAreaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  // Auto-resize textarea when description changes
  useEffect(() => {
    autoResizeTextarea();
  }, [localDescription, autoResizeTextarea]);

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    
    // Auto-resize the textarea
    setTimeout(autoResizeTextarea, 0);
    
    // Track if there are unsaved changes
    setHasUnsavedChanges(newDescription !== originalDescription);
    
    // Update context description if timer is running
    if (activeTimer) {
      updateTimerDescription(newDescription);
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for 5-second auto-save
    if (activeTimer && newDescription !== originalDescription) {
      saveTimeoutRef.current = setTimeout(() => {
        saveDescriptionToDatabase(newDescription);
      }, 5000);
    }
  };

  // Handle blur (focus lost) event
  const handleDescriptionBlur = () => {
    if (activeTimer && hasUnsavedChanges) {
      // Clear timeout since we're saving immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveDescriptionToDatabase(localDescription);
    }
  };

  return (
    <TimerContainer>
      <TimerDisplay>
        <TimeText>{formatTime(time)}</TimeText>
        {activeTimer && (
          <TaskInfo>
            {selectedClient ? selectedClient.name : 'No Client'}
            {activeTimer.task?.project && ` • ${activeTimer.task.project.name}`}
            {activeTimer.task && ` • ${activeTimer.task.name}`}
            {description && ` • ${description}`}
          </TaskInfo>
        )}
      </TimerDisplay>

      <ControlsContainer gap="20px">
        {!isRunning ? (
          <ControlButton variant="primary" onClick={handleStartTimer}>
            <Play size={20} />
            Start Timer
          </ControlButton>
        ) : (
          <ControlButton variant="danger" onClick={handleStopTimer}>
            <Square size={20} />
            Stop Timer
          </ControlButton>
        )}
      </ControlsContainer>

      <TaskSelector>
        <SelectorHeader>{isRunning ? 'Timer Controls' : 'Timer Settings'}</SelectorHeader>

        <div className="mb20">
          <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '10px' }}>
            Description (Optional):
          </Text>
          <ExpandingTextArea
            ref={textAreaRef}
            value={localDescription}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            placeholder="What are you working on?"
            rows={1}
          />
        </div>

        <div className="mb20">
          <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '10px' }}>
            Client (Optional):
          </Text>
          <Dropdown>
            <DropdownButton onClick={() => setDropdownOpen(!dropdownOpen)}>
              {localSelectedClient ? localSelectedClient.name : 'No Client Selected'}
              <ChevronDown size={20} />
            </DropdownButton>
            {dropdownOpen && (
              <DropdownMenu>
                <DropdownItem onClick={() => handleClientSelect(null)}>
                  No Client
                </DropdownItem>
                {clients.map(client => (
                  <DropdownItem key={client.id} onClick={() => handleClientSelect(client)}>
                    {client.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            )}
          </Dropdown>
        </div>

        <div className="mb20">
          <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '10px' }}>
            Project (Optional):
          </Text>
          <Dropdown>
            <DropdownButton 
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              disabled={!localSelectedClient}
              style={{ opacity: !localSelectedClient ? 0.5 : 1 }}
            >
              {localSelectedProject ? localSelectedProject.name : 'No Project Selected'}
              <ChevronDown size={20} />
            </DropdownButton>
            {projectDropdownOpen && localSelectedClient && (
              <DropdownMenu>
                <DropdownItem onClick={() => handleProjectSelect(null)}>
                  No Project
                </DropdownItem>
                {projects.map(project => (
                  <DropdownItem key={project.id} onClick={() => handleProjectSelect(project)}>
                    {project.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            )}
          </Dropdown>
        </div>

        <div className="mb20">
          <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '10px' }}>
            Task (Optional):
          </Text>
          <Dropdown>
            <DropdownButton 
              onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
              disabled={!localSelectedProject}
              style={{ opacity: !localSelectedProject ? 0.5 : 1 }}
            >
              {localSelectedTask ? localSelectedTask.name : 'No Task Selected'}
              <ChevronDown size={20} />
            </DropdownButton>
            {taskDropdownOpen && localSelectedProject && (
              <DropdownMenu>
                <DropdownItem onClick={() => handleTaskSelect(null)}>
                  No Task
                </DropdownItem>
                {tasks.map(task => (
                  <DropdownItem key={task.id} onClick={() => handleTaskSelect(task)}>
                    {task.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            )}
          </Dropdown>
        </div>

        {!isRunning && (
          <div>
            <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '10px' }}>
              Round to nearest:
            </Text>
            <RoundingSelector gap="10px">
              {[5, 10, 15, 30, 60].map(minutes => (
                <RoundingButton
                  key={minutes}
                  $active={roundTo === minutes}
                  variant={roundTo === minutes ? "primary" : "secondary"}
                  size="small"
                  onClick={() => setRoundTo(minutes)}
                >
                  {minutes}m
                </RoundingButton>
              ))}
            </RoundingSelector>
          </div>
        )}
      </TaskSelector>
    </TimerContainer>
  );
};

export default Timer;
