import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { 
  Play, 
  Square, 
  ChevronDown, 
  Edit, 
  Trash2, 
  Plus, 
  Clock, 
  Folder, 
  Building, 
  CheckSquare, 
  ChevronUp 
} from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { 
  Container,
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
  TextArea,
  Title,
  Input,
  Select,
  Label,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
  EmptyState,
  IconButton,
  LoadingOverlay
} from './ui';
import { formatDurationHumanFriendly, formatTime, formatTimeForForm, formatDateForForm, calculateDuration } from '../utils/dateHelpers';

// Styled components for Timer section (horizontal layout)
const TimerSection = styled.div`
  margin-bottom: 40px;
  border-bottom: 2px solid #404040;
  padding-bottom: 30px;
`;

const TimerContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const TimerTopRow = styled(FlexBox)`
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
  }
`;

const TimerDisplay = styled.div`
  text-align: left;
  min-width: 200px;
  
  @media (max-width: 768px) {
    text-align: center;
    min-width: auto;
  }
`;

const TimeText = styled(BigNumber)`
  font-size: 48px;
  font-weight: 300;
  margin-bottom: 5px;
  font-variant-numeric: tabular-nums;
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const TaskInfo = styled(Text)`
  font-size: 14px;
  margin-bottom: 10px;
`;

const ControlsContainer = styled(FlexBox)`
  justify-content: center;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ControlButton = styled(Button)`
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  min-width: 120px;
`;

const TimerSettingsRow = styled(FlexBox)`
  gap: 20px;
  flex-wrap: wrap;
  align-items: flex-start;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const SettingsGroup = styled.div`
  flex: 1;
  min-width: 200px;
  
  @media (max-width: 768px) {
    min-width: auto;
    width: 100%;
  }
`;

const SelectorHeader = styled(Text)`
  font-size: 12px;
  margin-bottom: 8px;
  display: block;
  font-weight: 500;
  color: #888;
`;

const ExpandingTextArea = styled(TextArea)`
  min-height: 44px;
  max-height: 120px;
  resize: none;
  overflow: hidden;
`;

const RoundingSelector = styled(FlexBox)`
  gap: 8px;
  flex-wrap: wrap;
`;

const RoundingButton = styled(Button)`
  background: ${props => props.$active ? '#007AFF' : '#404040'};
  font-size: 12px;
  padding: 6px 10px;
  min-width: 40px;
  
  &:hover {
    background: ${props => props.$active ? '#0056CC' : '#505050'};
  }
`;

// Styled components for Time Entries section
const TimeEntriesSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

// Color constants for time entries
const COLORS = {
  PRIMARY: '#007AFF',
  BORDER_DEFAULT: '#404040',
  BG_ACTIVE: '#1a1a2e',
  BG_INACTIVE: '#2a2a2a',
  SUCCESS: '#28a745'
};

// Additional styled components for inline style replacements
const MainContainer = styled(Container)`
  height: 100vh;
  overflow-y: auto;
  position: relative;
`;

const DisabledDropdownButton = styled(DropdownButton)`
  opacity: ${props => props.disabled ? 0.5 : 1};
`;

const DayGroupContainer = styled.div`
  margin-bottom: ${props => props.$isLast ? '0' : '20px'};
  border: ${props => props.$hasActiveEntry ? `2px solid ${COLORS.PRIMARY}` : 'none'};
  border-radius: 8px;
  padding: ${props => props.$hasActiveEntry ? '2px' : '0'};
`;

const DayHeaderCard = styled(Card)`
  cursor: pointer;
  background-color: ${props => props.$hasActiveEntry ? COLORS.BG_ACTIVE : COLORS.BG_INACTIVE};
  border: ${props => props.$hasActiveEntry ? 'none' : `1px solid ${COLORS.BORDER_DEFAULT}`};
  border-radius: ${props => props.$collapsed ? '8px' : '8px 8px 0 0'};
`;

const DayTotalText = styled(Text)`
  font-weight: bold;
`;

const EntryHeading = styled(Heading)`
  margin-bottom: 15px;
`;

const TaskIcon = styled(CheckSquare)`
  margin-right: 6px;
  vertical-align: text-bottom;
`;

const ActiveBadge = styled(Text)`
  padding: 2px 8px;
  border-radius: 12px;
  margin-bottom: 15px;
  background-color: ${COLORS.SUCCESS};
  color: white;
  font-size: 10px;
  font-weight: bold;
`;

const ClientIcon = styled(Building)`
  margin-right: 4px;
  vertical-align: text-bottom;
`;

const ProjectIcon = styled(Folder)`
  margin: 0 4px 0 10px;
  vertical-align: text-bottom;
`;

const TimeIcon = styled(Clock)`
  margin-right: 5px;
`;

const DisabledIconButton = styled(IconButton)`
  opacity: ${props => props.disabled ? 0.5 : 1};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

const FlexForm = styled(FlexBox)`
  flex: 1;
`;

const ModalFooter = styled(FlexBox)`
  margin-top: 20px;
`;

const TimeEntries = () => {

  // Helper functions for styling time entries (memoized)
  const getBorderStyle = useCallback((entry, hasActiveEntry) => {
    if (hasActiveEntry) {
      return entry.isActive ? 'none' : `1px solid ${COLORS.BORDER_DEFAULT}`;
    }
    return entry.isActive ? `2px solid ${COLORS.PRIMARY}` : `1px solid ${COLORS.BORDER_DEFAULT}`;
  }, []);

  const getEntryCardStyle = useCallback((entry, index, entries, hasActiveEntry) => ({
    borderLeft: getBorderStyle(entry, hasActiveEntry),
    borderRight: getBorderStyle(entry, hasActiveEntry),
    borderBottom: getBorderStyle(entry, hasActiveEntry),
    borderTop: index === 0 ? 'none' : `1px solid ${COLORS.BORDER_DEFAULT}`,
    borderRadius: index === entries.length - 1 ? '0 0 8px 8px' : '0',
    backgroundColor: entry.isActive ? COLORS.BG_ACTIVE : undefined
  }), [getBorderStyle]);

  // Timer context and hooks
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
    updateTimerProject,
    checkActiveTimer,
    formatTime: formatTimerTime
  } = useTimer();

  const { waitForReady } = useElectronAPI();

  // Timer state
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
  
  // Timer auto-save related state
  const [originalDescription, setOriginalDescription] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isUnloadingRef = useRef(false);
  const textAreaRef = useRef(null);

  // Time entries state
  const [timeEntries, setTimeEntries] = useState([]);
  const [settings, setSettings] = useState({ timer_rounding: '15' });
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [collapsedDays, setCollapsedDays] = useState(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [entryForm, setEntryForm] = useState({
    clientId: '',
    projectId: '',
    taskId: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Optimized load function that fetches all data in minimal calls
  const loadAllData = useCallback(async () => {
    const api = await waitForReady();
    if (api) {
      try {
        // Load all data in parallel for better performance
        const [clientsWithRelationships, timeEntriesData, settingsData] = await Promise.all([
          api.clients.getAllWithRelationships(),
          api.timeEntries.getAll(),
          api.settings.get()
        ]);

        // Set clients with all their projects and tasks already loaded
        setClients(clientsWithRelationships || []);
        
        // Extract all projects and tasks from the nested structure
        const allProjects = [];
        const allTasks = [];
        
        (clientsWithRelationships || []).forEach(client => {
          if (client.projects) {
            allProjects.push(...client.projects);
            client.projects.forEach(project => {
              if (project.tasks) {
                allTasks.push(...project.tasks);
              }
            });
          }
        });

        setProjects(allProjects);
        setTasks(allTasks);
        setTimeEntries(timeEntriesData || []);
        
        // Set settings
        setSettings(settingsData || { timer_rounding: '15' });
        if (settingsData?.timer_rounding) {
          setRoundTo(parseInt(settingsData.timer_rounding));
        }

        console.log('All data loaded:', {
          clients: clientsWithRelationships?.length || 0,
          projects: allProjects.length,
          tasks: allTasks.length,
          timeEntries: timeEntriesData?.length || 0
        });
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  }, [waitForReady]);

  const loadTimeEntries = useCallback(async () => {
    console.log('Loading time entries...');
    const api = await waitForReady();
    if (api) {
      try {
        const entries = await api.timeEntries.getAll();
        console.log('Time entries loaded:', entries.length, 'entries');
        setTimeEntries(entries);
      } catch (error) {
        console.error('Error loading time entries:', error);
      }
    }
  }, [waitForReady]);

  // Memoized grouped entries to prevent expensive recalculations
  const groupedEntries = useMemo(() => {
    const groups = {};
    timeEntries.forEach(entry => {
      const date = new Date(entry.startTime);
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric', 
        month: 'short',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const dateA = new Date(groups[a][0].startTime);
      const dateB = new Date(groups[b][0].startTime);
      return dateB - dateA;
    });
    const sortedGroups = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [timeEntries]);

  // Timer sync with context
  useEffect(() => {
    if (activeTimer) {
      setLocalDescription(description);
      setOriginalDescription(description);
      setLocalSelectedClient(selectedClient);
      
      // Restore project and task from active timer
      if (activeTimer.task) {
        setLocalSelectedTask(activeTimer.task);
      } else {
        setLocalSelectedTask(null);
      }

      if (activeTimer.project) {
        setLocalSelectedProject(activeTimer.project);
      } else if (activeTimer.task && activeTimer.task.project) {
        setLocalSelectedProject(activeTimer.task.project);
      } else {
        setLocalSelectedProject(null);
      }
      
      setHasUnsavedChanges(false);
    }
  }, [activeTimer, description, selectedClient]);

  // Initialize data on mount (only run once)
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsInitialLoading(true);
        await checkActiveTimer(); // Check for active timer first
        
        // Load all data in a single optimized call
        await loadAllData();
        
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 100);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsInitialLoading(false);
      }
    };
    
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once on mount

  // Restore last used client/project/task using pre-loaded data
  useEffect(() => {
    const restoreLastUsed = async () => {
      // Only restore if we have loaded the data and are not in initial loading state
      if (clients.length > 0 && projects.length > 0 && tasks.length > 0 && !isInitialLoading && !activeTimer) {
        try {
          const api = await waitForReady();
          if (api) {
            console.log('[TimeEntries] Attempting to restore last used client/project/task...');
            
            const [lastClient, lastProject, lastTask] = await Promise.all([
              api.settings.getLastUsedClient(),
              api.settings.getLastUsedProject(),
              api.settings.getLastUsedTask()
            ]);
            
            console.log('[TimeEntries] Last used values:', { lastClient, lastProject, lastTask });
            
            if (lastClient) {
              const clientExists = clients.some(c => c.id === lastClient.id);
              console.log('[TimeEntries] Client exists:', clientExists);
              
              if (clientExists) {
                console.log('[TimeEntries] Restored last client:', lastClient.name);
                setLocalSelectedClient(lastClient);
                
                // Since we have all data loaded, we can directly check and set
                if (lastProject) {
                  const projectExists = projects.some(p => p.id === lastProject.id && p.clientId === lastClient.id);
                  console.log('[TimeEntries] Project exists:', projectExists);
                  
                  if (projectExists) {
                    console.log('[TimeEntries] Restored last project:', lastProject.name);
                    setLocalSelectedProject(lastProject);
                    
                    if (lastTask) {
                      const taskExists = tasks.some(t => t.id === lastTask.id && t.projectId === lastProject.id);
                      console.log('[TimeEntries] Task exists:', taskExists);
                      
                      if (taskExists) {
                        console.log('[TimeEntries] Restored last task:', lastTask.name);
                        setLocalSelectedTask(lastTask);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error loading last used settings:', error);
        }
      }
    };
    
    restoreLastUsed();
  }, [clients, projects, tasks, activeTimer, isInitialLoading, waitForReady]);

  // Set up initial collapsed state for time entries
  useEffect(() => {
    if (timeEntries.length > 0) {
      const dates = Object.keys(groupedEntries);
      
      if (dates.length > 0) {
        const allDatesExceptMostRecent = new Set(dates.slice(1));
        setCollapsedDays(allDatesExceptMostRecent);
      }
    } else {
      setCollapsedDays(new Set());
    }
  }, [timeEntries, groupedEntries]);

  // Update current time every second for active timers (only if there are active timers)
  useEffect(() => {
    const hasActiveTimer = timeEntries.some(entry => entry.isActive);
    
    if (!hasActiveTimer) {
      return; // Don't set up interval if no active timers
    }
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [timeEntries]); // Re-run when timeEntries change to check for active timers

  // Listen for events
  useEffect(() => {
    const handleShowTimerModal = () => {
      console.log('[TimeEntries] Show timer modal requested from tray');
      setShowModal(true);
    };

    const handleRefreshTimeEntries = () => {
      console.log('[TimeEntries] Refresh time entries requested');
      loadTimeEntries();
    };

    const handleTimerStarted = () => {
      console.log('[TimeEntries] Timer started - refreshing time entries');
      loadTimeEntries();
    };

    const handleTimerStopped = () => {
      console.log('[TimeEntries] Timer stopped - refreshing time entries');
      loadTimeEntries();
    };

    window.addEventListener('show-timer-modal', handleShowTimerModal);
    window.addEventListener('refresh-time-entries', handleRefreshTimeEntries);
    window.addEventListener('timer-started', handleTimerStarted);
    window.addEventListener('timer-stopped', handleTimerStopped);
    
    return () => {
      window.removeEventListener('show-timer-modal', handleShowTimerModal);
      window.removeEventListener('refresh-time-entries', handleRefreshTimeEntries);
      window.removeEventListener('timer-started', handleTimerStarted);
      window.removeEventListener('timer-stopped', handleTimerStopped);
    };
  }, [loadTimeEntries]);

  // Filter projects when client changes (using already loaded data)
  const availableProjects = useMemo(() => {
    if (!localSelectedClient) return [];
    return projects.filter(project => project.clientId === localSelectedClient.id);
  }, [projects, localSelectedClient]);

  // Filter tasks when project changes (using already loaded data)
  const availableTasks = useMemo(() => {
    const projectId = localSelectedProject?.id 
      || activeTimer?.project?.id 
      || activeTimer?.task?.project?.id 
      || null;
    
    if (!projectId) return [];
    return tasks.filter(task => task.projectId === projectId);
  }, [tasks, localSelectedProject, activeTimer]);

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (!localSelectedClient) {
      setLocalSelectedProject(null);
      setLocalSelectedTask(null);
    } else if (localSelectedProject && !availableProjects.some(p => p.id === localSelectedProject.id)) {
      setLocalSelectedProject(null);
      setLocalSelectedTask(null);
    }
  }, [localSelectedClient, availableProjects, localSelectedProject]);

  useEffect(() => {
    if (!localSelectedProject) {
      setLocalSelectedTask(null);
    } else if (localSelectedTask && !availableTasks.some(t => t.id === localSelectedTask.id)) {
      setLocalSelectedTask(null);
    }
  }, [localSelectedProject, availableTasks, localSelectedTask]);

  // Filter projects and tasks for modal (using already loaded data)
  const modalProjects = useMemo(() => {
    if (!entryForm.clientId) return [];
    return projects.filter(project => project.clientId === parseInt(entryForm.clientId));
  }, [projects, entryForm.clientId]);

  const modalTasks = useMemo(() => {
    if (!entryForm.projectId) return [];
    return tasks.filter(task => task.projectId === parseInt(entryForm.projectId));
  }, [tasks, entryForm.projectId]);

  // Timer handlers
  const handleStartTimer = async () => {
    console.log('Starting timer with client:', localSelectedClient?.id, 'task:', localSelectedTask?.id, 'description:', localDescription);
    try {
      const timerData = {
        clientId: localSelectedClient?.id || null,
        projectId: localSelectedProject?.id || null,
        taskId: localSelectedTask?.id || null,
        description: localDescription || ''
      };
      const timer = await startTimer(timerData, localDescription);
      if (timer?.project) {
        setLocalSelectedProject(timer.project);
      } else if (timer?.task?.project) {
        setLocalSelectedProject(timer.task.project);
      }
      if (timer?.task) {
        setLocalSelectedTask(timer.task);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Failed to start timer: ' + error.message);
    }
  };

  const handleStopTimer = async () => {
    console.log('Stopping timer with roundTo:', roundTo);
    try {
      await stopTimer(roundTo);
      setLocalDescription('');
      setLocalSelectedClient(null);
      await loadTimeEntries(); // Refresh time entries after stopping
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Failed to stop timer: ' + error.message);
    }
  };

  const handleClientSelect = async (client) => {
    console.log('Client selected:', client);
    setLocalSelectedClient(client);
    setDropdownOpen(false);
    setLocalSelectedProject(null);
    setLocalSelectedTask(null);
    setProjects([]);
    setTasks([]);
    
    if (isRunning && activeTimer) {
      try {
        await updateTimerClient(client);
        console.log('Timer client updated successfully');
      } catch (error) {
        console.error('Error updating timer client:', error);
        setLocalSelectedClient(selectedClient);
        alert('Failed to update client: ' + error.message);
      }
    }
  };

  const handleProjectSelect = async (project) => {
    console.log('Project selected:', project);
    setLocalSelectedProject(project);
    setProjectDropdownOpen(false);
    setLocalSelectedTask(null);

    if (isRunning && activeTimer) {
      try {
        await updateTimerTask(null);
        await updateTimerProject(project);
        console.log('Timer project updated successfully');
      } catch (error) {
        console.error('Error updating timer project:', error);
        alert('Failed to update project: ' + error.message);
      }
    }
  };

  const handleTaskSelect = async (task) => {
    console.log('Task selected:', task);
    setLocalSelectedTask(task);
    setTaskDropdownOpen(false);
    
    if (isRunning && activeTimer) {
      try {
        await updateTimerTask(task);
        console.log('Timer task updated successfully');
      } catch (error) {
        console.error('Error updating timer task:', error);
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
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [localDescription, autoResizeTextarea]);

  const handleDescriptionChange = async (e) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    
    setTimeout(autoResizeTextarea, 0);
    
    setHasUnsavedChanges(newDescription !== originalDescription);
    
    if (activeTimer) {
      try {
        await updateTimerDescription(newDescription);
        setOriginalDescription(newDescription);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Error updating description in context:', error);
      }
    }

    // Only set the auto-save timeout if there are unsaved changes after the immediate save attempt
    if (activeTimer && hasUnsavedChanges) {
      saveTimeoutRef.current = setTimeout(() => {
        saveDescriptionToDatabase(newDescription);
      }, 1000);
    }
  };

  const handleDescriptionBlur = () => {
    if (activeTimer && hasUnsavedChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveDescriptionToDatabase(localDescription);
    }
  };

  // Time entries handlers
  const handlePlayEntry = async (entry) => {
    try {
      const api = await waitForReady();
      if (!api) return;
      
      const roundingMinutes = parseInt(settings.timer_rounding || '15');
      const canResume = entry.endTime && !entry.isActive;
      
      if (activeTimer) {
        const elapsedMinutes = Math.floor((new Date() - new Date(activeTimer.startTime)) / (1000 * 60));
        
        if (elapsedMinutes <= roundingMinutes) {
          await startTimer({
            clientId: entry.clientId,
            projectId: entry.projectId,
            taskId: entry.taskId,
            description: entry.description
          });
          await loadTimeEntries();
          return;
        } else {
          const confirmed = window.confirm(
            `Are you sure? This will overwrite the current timer's client, project, and task. Current timer has been running for ${elapsedMinutes} minutes.`
          );
          
          if (confirmed) {
            await startTimer({
              clientId: entry.clientId,
              projectId: entry.projectId,
              taskId: entry.taskId,
              description: entry.description
            });
            await loadTimeEntries();
          }
          return;
        }
      }

      if (canResume) {
        const timeSinceStop = canResume ? Math.floor((new Date() - new Date(entry.endTime)) / (1000 * 60)) : null;
        console.log(`Creating new entry from ${entry.id} (stopped ${timeSinceStop} minutes ago)`);
        
        await startTimer({
          clientId: entry.clientId,
          projectId: entry.projectId,
          taskId: entry.taskId,
          description: entry.description
        });
        await loadTimeEntries();
        return;
      }

      await startTimer({
        clientId: entry.clientId,
        projectId: entry.projectId,
        taskId: entry.taskId,
        description: entry.description
      });
      await loadTimeEntries();
    } catch (error) {
      console.error('Error starting timer from entry:', error);
    }
  };

  const handleCreateEntry = async () => {
    if (entryForm.clientId && entryForm.startTime && entryForm.endTime) {
      try {
        const api = await waitForReady();
        const createData = {
          ...entryForm,
          clientId: parseInt(entryForm.clientId),
          projectId: entryForm.projectId ? parseInt(entryForm.projectId) : null,
          taskId: entryForm.taskId ? parseInt(entryForm.taskId) : null
        };
        
        await api.invoke('db:createTimeEntry', createData);
        setEntryForm({
          clientId: '',
          projectId: '',
          taskId: '',
          description: '',
          startTime: '',
          endTime: '',
          date: new Date().toISOString().split('T')[0]
        });
        setShowModal(false);
        await loadTimeEntries();
        
        const updateEvent = new CustomEvent('time-entries-updated');
        window.dispatchEvent(updateEvent);
      } catch (error) {
        console.error('Error creating time entry:', error);
      }
    }
  };

  const handleUpdateEntry = async () => {
    if (editingEntry && entryForm.clientId && entryForm.startTime && entryForm.endTime) {
      try {
        const api = await waitForReady();
        const updateData = {
          ...entryForm,
          clientId: parseInt(entryForm.clientId),
          projectId: entryForm.projectId ? parseInt(entryForm.projectId) : null,
          taskId: entryForm.taskId ? parseInt(entryForm.taskId) : null
        };
        
        await api.invoke('db:updateTimeEntry', editingEntry.id, updateData);
        
        setEntryForm({
          clientId: '',
          projectId: '',
          taskId: '',
          description: '',
          startTime: '',
          endTime: '',
          date: new Date().toISOString().split('T')[0]
        });
        setEditingEntry(null);
        setShowModal(false);
        await loadTimeEntries();
        
        const updateEvent = new CustomEvent('time-entries-updated');
        window.dispatchEvent(updateEvent);
      } catch (error) {
        console.error('Error updating time entry:', error);
      }
    }
  };

  const handleDeleteEntry = async (entryId) => {
    const entry = timeEntries.find(e => e.id === entryId);
    
    if (entry?.isActive || (activeTimer && activeTimer.id === entryId)) {
      alert('Cannot delete an active time entry. Please stop the timer first.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this time entry?')) {
      try {
        const api = await waitForReady();
        await api.timeEntries.delete(entryId);
        await loadTimeEntries();
        
        const updateEvent = new CustomEvent('time-entries-updated');
        window.dispatchEvent(updateEvent);
      } catch (error) {
        console.error('Error deleting time entry:', error);
      }
    }
  };

  const openEditModal = (entry) => {
    if (entry.isActive) {
      alert('Cannot edit an active time entry. Please stop the timer first.');
      return;
    }
    
    setEditingEntry(entry);
    setEntryForm({
      clientId: entry.clientId || '',
      projectId: entry.projectId || '',
      taskId: entry.taskId || '',
      description: entry.description || '',
      startTime: formatTimeForForm(entry.startTime),
      endTime: formatTimeForForm(entry.endTime),
      date: formatDateForForm(entry.startTime)
    });
    setShowModal(true);
  };

  // Helper functions for time entries (memoized)
  const getClientName = useCallback((clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  }, [clients]);

  const getTaskName = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : null;
  }, [tasks]);

  const getElapsedTime = useCallback((startTime) => {
    const start = new Date(startTime);
    const now = currentTime;
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    return formatDurationHumanFriendly(minutes);
  }, [currentTime]);

  const calculateDayTotal = useCallback((entries) => {
    const totalMinutes = entries.reduce((total, entry) => {
      if (entry.isActive) {
        const start = new Date(entry.startTime);
        const now = currentTime;
        const diffMs = now.getTime() - start.getTime();
        const minutes = Math.floor(diffMs / (1000 * 60));
        return total + minutes;
      } else {
        return total + calculateDuration(entry.startTime, entry.endTime);
      }
    }, 0);
    
    return formatDurationHumanFriendly(totalMinutes);
  }, [currentTime]);

  const toggleDayCollapse = (date) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  return (
    <MainContainer padding="40px">
      {/* Timer Section */}
      <TimerSection>
        <TimerContainer>
          <TimerTopRow>
            <TimerDisplay>
              <TimeText>{formatTimerTime(time)}</TimeText>
              {activeTimer && (
                <TaskInfo>
                  {selectedClient ? selectedClient.name : 'No Client'}
                  {(activeTimer.project || activeTimer.task?.project) && ` • ${(activeTimer.project?.name || activeTimer.task?.project?.name)}`}
                  {activeTimer.task && ` • ${activeTimer.task.name}`}
                </TaskInfo>
              )}
            </TimerDisplay>

            <ControlsContainer gap="20px">
              {!isRunning ? (
                <ControlButton variant="primary" onClick={handleStartTimer}>
                  <Play size={16} />
                  Start Timer
                </ControlButton>
              ) : (
                <ControlButton variant="danger" onClick={handleStopTimer}>
                  <Square size={16} />
                  Stop Timer
                </ControlButton>
              )}
            </ControlsContainer>
          </TimerTopRow>

          <TimerSettingsRow>
            <SettingsGroup>
              <SelectorHeader>Description (Optional):</SelectorHeader>
              <ExpandingTextArea
                ref={textAreaRef}
                value={localDescription}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                placeholder="Describe this work"
                rows={1}
              />
            </SettingsGroup>

            <SettingsGroup>
              <SelectorHeader>Client (Optional):</SelectorHeader>
              <Dropdown>
                <DropdownButton onClick={() => setDropdownOpen(!dropdownOpen)}>
                  {localSelectedClient ? localSelectedClient.name : 'No Client Selected'}
                  <ChevronDown size={16} />
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
            </SettingsGroup>

            <SettingsGroup>
              <SelectorHeader>Project (Optional):</SelectorHeader>
              <Dropdown>
                <DisabledDropdownButton 
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  disabled={!localSelectedClient}
                >
                  {localSelectedProject?.name 
                    || activeTimer?.project?.name 
                    || activeTimer?.task?.project?.name 
                    || 'No Project Selected'}
                  <ChevronDown size={16} />
                </DisabledDropdownButton>
                {projectDropdownOpen && localSelectedClient && (
                  <DropdownMenu>
                    <DropdownItem onClick={() => handleProjectSelect(null)}>
                      No Project
                    </DropdownItem>
                    {availableProjects.map(project => (
                      <DropdownItem key={project.id} onClick={() => handleProjectSelect(project)}>
                        {project.name}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                )}
              </Dropdown>
            </SettingsGroup>

            <SettingsGroup>
              <SelectorHeader>Task (Optional):</SelectorHeader>
              <Dropdown>
                <DisabledDropdownButton 
                  onClick={() => setTaskDropdownOpen(!taskDropdownOpen)}
                  disabled={!(localSelectedProject || activeTimer?.project || activeTimer?.task?.project)}
                >
                  {localSelectedTask?.name 
                    || activeTimer?.task?.name 
                    || 'No Task Selected'}
                  <ChevronDown size={16} />
                </DisabledDropdownButton>
                {taskDropdownOpen && localSelectedProject && (
                  <DropdownMenu>
                    <DropdownItem onClick={() => handleTaskSelect(null)}>
                      No Task
                    </DropdownItem>
                    {availableTasks.map(task => (
                      <DropdownItem key={task.id} onClick={() => handleTaskSelect(task)}>
                        {task.name}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                )}
              </Dropdown>
            </SettingsGroup>

            {!isRunning && (
              <SettingsGroup>
                <SelectorHeader>Round to nearest:</SelectorHeader>
                <RoundingSelector>
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
              </SettingsGroup>
            )}
          </TimerSettingsRow>
        </TimerContainer>
      </TimerSection>

      {/* Time Entries Section */}
      <TimeEntriesSection>
        <FlexBox justify="space-between" align="center" margin="0 0 20px 0">
          <Title>Recent Time Entries</Title>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Manual Entry
          </Button>
        </FlexBox>

        {timeEntries.length === 0 ? (
          <EmptyState>
            <Clock size={48} />
            <h3>No Time Entries</h3>
            <p>Start tracking your time or add a manual entry</p>
          </EmptyState>
        ) : (
          <FlexBox direction="column" gap="0">
            {Object.entries(groupedEntries || {}).map(([date, entries], groupIndex) => {
              const hasActiveEntry = entries.some(entry => entry.isActive);
              const isLast = groupIndex >= Object.keys(groupedEntries).length - 1;
              
              return (
                <DayGroupContainer 
                  key={date} 
                  $hasActiveEntry={hasActiveEntry}
                  $isLast={isLast}
                >
                  <DayHeaderCard 
                    padding="15px" 
                    margin="0"
                    $hasActiveEntry={hasActiveEntry}
                    $collapsed={collapsedDays.has(date)}
                    onClick={() => toggleDayCollapse(date)}
                  >
                    <FlexBox justify="space-between" align="center">
                      <FlexBox align="center" gap="10px">
                        {collapsedDays.has(date) ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronUp size={20} />
                        )}
                        <Heading size="medium">{date}</Heading>
                      </FlexBox>
                      <DayTotalText size="medium" variant="success">
                        {calculateDayTotal(entries)}
                      </DayTotalText>
                    </FlexBox>
                  </DayHeaderCard>

                  {!collapsedDays.has(date) && (
                    <FlexBox direction="column" gap="0">
                      {(entries || []).map((entry, index) => (
                        <Card 
                          key={entry.id} 
                          padding="15px"
                          margin="0"
                          style={getEntryCardStyle(entry, index, entries, hasActiveEntry)}
                        >
                          <FlexBox justify="space-between" align="center">
                            <FlexBox direction="column" gap="5px">
                              <FlexBox align="center" gap="10px">
                                <EntryHeading size="small">
                                  {entry.taskId && getTaskName(entry.taskId) && (
                                    <>
                                      <TaskIcon size={16} />
                                      {getTaskName(entry.taskId)}
                                      {entry.description && ' • '}
                                    </>
                                  )}
                                  {entry.description || (!entry.taskId || !getTaskName(entry.taskId) ? 'No description' : '')}
                                </EntryHeading>
                                {entry.isActive && (
                                  <ActiveBadge size="small" variant="success">
                                    ACTIVE
                                  </ActiveBadge>
                                )}
                              </FlexBox>
                              <Text variant="secondary" size="small">
                                <ClientIcon size={14} />
                                {getClientName(entry.clientId)}
                                {entry.project && (
                                  <>
                                    {' '}
                                    <ProjectIcon size={14} />
                                    {entry.project.name}
                                  </>
                                )}
                              </Text>
                              <FlexBox gap="15px">
                                <Text size="small">
                                  <TimeIcon size={14} />
                                  {entry.isActive 
                                    ? `${formatTime(entry.startTime)} - Running`
                                    : `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`
                                  }
                                </Text>
                                <Text size="medium" variant="success">
                                  {entry.isActive 
                                    ? getElapsedTime(entry.startTime)
                                    : formatDurationHumanFriendly(calculateDuration(entry.startTime, entry.endTime))
                                  }
                                </Text>
                              </FlexBox>
                            </FlexBox>
                            
                            <FlexBox gap="10px">
                              {!entry.isActive && (
                                <IconButton 
                                  variant="primary" 
                                  size="small" 
                                  onClick={() => handlePlayEntry(entry)}
                                  title="Start timer with this entry's details"
                                >
                                  <Play size={14} />
                                </IconButton>
                              )}
                              <DisabledIconButton 
                                variant="secondary" 
                                size="small" 
                                onClick={() => openEditModal(entry)}
                                disabled={entry.isActive}
                                title={entry.isActive ? "Cannot edit active timer" : "Edit entry"}
                              >
                                <Edit size={14} />
                              </DisabledIconButton>
                              <DisabledIconButton 
                                variant={entry.isActive ? "secondary" : "danger"} 
                                size="small" 
                                onClick={() => handleDeleteEntry(entry.id)}
                                disabled={entry.isActive}
                                title={entry.isActive ? "Cannot delete active timer" : "Delete entry"}
                              >
                                <Trash2 size={14} />
                              </DisabledIconButton>
                            </FlexBox>
                          </FlexBox>
                        </Card>
                      ))}
                    </FlexBox>
                  )}
                </DayGroupContainer>
              );
            })}
          </FlexBox>
        )}
      </TimeEntriesSection>

      {/* Time Entry Modal */}
      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingEntry ? 'Edit Time Entry' : 'Manual Time Entry'}</ModalTitle>
              <ModalCloseButton onClick={() => setShowModal(false)}>×</ModalCloseButton>
            </ModalHeader>
            
            <FlexBox direction="column" gap="15px">
              <FlexBox direction="column" gap="5px">
                <Label>Client *</Label>
                <Select
                  value={entryForm.clientId}
                  onChange={(e) => {
                    setEntryForm(prev => ({ ...prev, clientId: e.target.value, projectId: '', taskId: '' }));
                  }}
                >
                  <option value="">Select a client</option>
                  {(clients || []).map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </Select>
              </FlexBox>

              <FlexBox direction="column" gap="5px">
                <Label>Project</Label>
                <Select
                  value={entryForm.projectId}
                  onChange={(e) => {
                    setEntryForm(prev => ({ ...prev, projectId: e.target.value, taskId: '' }));
                  }}
                  disabled={!entryForm.clientId}
                >
                  <option value="">Select a project (optional)</option>
                  {(modalProjects || []).map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </Select>
              </FlexBox>

              <FlexBox direction="column" gap="5px">
                <Label>Task</Label>
                <Select
                  value={entryForm.taskId}
                  onChange={(e) => {
                    setEntryForm(prev => ({ ...prev, taskId: e.target.value }));
                  }}
                  disabled={!entryForm.projectId}
                >
                  <option value="">Select a task (optional)</option>
                  {(modalTasks || []).map(task => (
                    <option key={task.id} value={task.id}>{task.name}</option>
                  ))}
                </Select>
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </FlexBox>
              
              <FlexBox gap="10px">
                <FlexForm direction="column" gap="5px">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={entryForm.startTime}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </FlexForm>
                
                <FlexForm direction="column" gap="5px">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={entryForm.endTime}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </FlexForm>
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Description</Label>
                <Input
                  value={entryForm.description}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What did you work on?"
                />
              </FlexBox>
              
              <ModalFooter gap="10px" justify="flex-end">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={editingEntry ? handleUpdateEntry : handleCreateEntry}
                  disabled={!entryForm.clientId || !entryForm.startTime || !entryForm.endTime}
                >
                  {editingEntry ? 'Update' : 'Create'} Entry
                </Button>
              </ModalFooter>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}

      <LoadingOverlay 
        isVisible={isInitialLoading} 
        text="Loading Time Entries..." 
        noFadeIn={true}
      />
    </MainContainer>
  );
};

export default TimeEntries;