import React, { useState, useEffect, useCallback } from 'react';
import { Edit, Trash2, Plus, Clock, Play, Square, Folder, Building, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Container,
  Card,
  FlexBox,
  Title,
  Heading,
  Text,
  Button,
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
import { useTimer } from '../context/TimerContext';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { formatDurationHumanFriendly, formatTime, formatTimeForForm, formatDateForForm, calculateDuration } from '../utils/dateHelpers';

const TimeEntries = () => {
  const { activeTimer, startTimer, stopTimer } = useTimer();
  const { waitForReady } = useElectronAPI();
  const [timeEntries, setTimeEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState({ timer_rounding: '15' });
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [collapsedDays, setCollapsedDays] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [entryForm, setEntryForm] = useState({
    clientId: '',
    projectId: '',
    taskId: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load functions
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

  const loadClients = useCallback(async () => {
    const api = await waitForReady();
    if (api) {
      try {
        const clientList = await api.clients.getAll();
        setClients(clientList);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    }
  }, [waitForReady]);

  const loadAllTasks = useCallback(async () => {
    const api = await waitForReady();
    if (api) {
      try {
        // Load tasks from all projects to be able to resolve task names
        const allTasks = [];
        const clientList = await api.clients.getAll();
        
  for (const client of (clientList || [])) {
          try {
            const projects = await api.projects.getAll(client.id);
            for (const project of (projects || [])) {
              try {
                const projectTasks = await api.tasks.getAll(project.id);
                allTasks.push(...(projectTasks || []));
              } catch (error) {
                console.error(`Error loading tasks for project ${project.id}:`, error);
              }
            }
          } catch (error) {
            console.error(`Error loading projects for client ${client.id}:`, error);
          }
        }
        
        setTasks(allTasks);
        console.log('All tasks loaded:', allTasks.length, 'tasks');
      } catch (error) {
        console.error('Error loading all tasks:', error);
      }
    }
  }, [waitForReady]);

  const loadSettings = useCallback(async () => {
    const api = await waitForReady();
    if (api) {
      try {
        const settingsData = await api.settings.get();
        setSettings(settingsData || { timer_rounding: '15' });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, [waitForReady]);

  useEffect(() => {
    console.log('TimeEntries component mounting, loading data...');
    const loadAllData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          loadTimeEntries(),
          loadClients(),
          loadAllTasks(),
          loadSettings()
        ]);
        // Small delay to ensure rendering is complete
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    loadAllData();
  }, [loadTimeEntries, loadClients, loadAllTasks, loadSettings]);

  // Set up initial collapsed state: all days collapsed except the most recent
  useEffect(() => {
    if (timeEntries.length > 0) {
      const grouped = groupEntriesByDate(timeEntries);
      const dates = Object.keys(grouped);
      
      if (dates.length > 0) {
        // All days should be collapsed except the first one (most recent)
        const allDatesExceptMostRecent = new Set(dates.slice(1));
        setCollapsedDays(allDatesExceptMostRecent);
      }
    } else {
      // No entries, reset to empty set
      setCollapsedDays(new Set());
    }
  }, [timeEntries]);

  // Update current time every second for active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle stopping timer (used by tray and UI)
  const handleStopTimer = useCallback(async () => {
    try {
      const roundingMinutes = parseInt(settings.timer_rounding || '15');
      await stopTimer(roundingMinutes);
      await loadTimeEntries(); // Refresh the time entries list
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  }, [stopTimer, settings.timer_rounding, loadTimeEntries]);

  // Listen for tray events to show modal and timer events for refresh (events now handled in TimerContext)
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

  // Load projects when client changes
  useEffect(() => {
    const loadProjects = async () => {
      if (entryForm.clientId) {
        try {
          const api = await waitForReady();
          const projectList = await api.projects.getAll(parseInt(entryForm.clientId));
          console.log('Projects loaded for client', entryForm.clientId, ':', projectList);
          setProjects(projectList);
        } catch (error) {
          console.error('Error loading projects:', error);
          setProjects([]);
        }
      } else {
        setProjects([]);
      }
      // Always reset tasks when client changes
      setTasks([]);
    };

    loadProjects();
  }, [entryForm.clientId, waitForReady]);

  // Load tasks when project changes  
  useEffect(() => {
    const loadTasks = async () => {
      if (entryForm.projectId) {
        try {
          console.log('Attempting to load tasks for project:', entryForm.projectId);
          const api = await waitForReady();
          
          if (!api?.tasks?.getAll) {
            console.error('electronAPI.tasks.getAll is not available');
            setTasks([]);
            return;
          }
          
          const taskList = await api.tasks.getAll(parseInt(entryForm.projectId));
          console.log('Tasks loaded for project', entryForm.projectId, ':', taskList);
          setTasks(taskList || []);
        } catch (error) {
          console.error('Error loading tasks:', error);
          setTasks([]);
        }
      } else {
        console.log('No project selected, clearing tasks');
        setTasks([]);
      }
    };

    loadTasks();
  }, [entryForm.projectId, waitForReady]);

  // Helper function to calculate elapsed time for active entries
  const getElapsedTime = (startTime) => {
    const start = new Date(startTime);
    const now = currentTime;
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    return formatDurationHumanFriendly(minutes);
  };

  const handlePlayEntry = async (entry) => {
    try {
      await loadSettings(); // Ensure we have current settings
      const api = await waitForReady();
      if (!api) return;
      
      const roundingMinutes = parseInt(settings.timer_rounding || '15');
      
      // Check if this entry was stopped recently and can be resumed
      const canResume = entry.endTime && !entry.isActive;
      const timeSinceStop = canResume ? Math.floor((new Date() - new Date(entry.endTime)) / (1000 * 60)) : null;
      
      if (canResume && timeSinceStop <= roundingMinutes) {
        // Entry was stopped within rounding window - resume it
        console.log(`Resuming entry ${entry.id} (stopped ${timeSinceStop} minutes ago)`);
        
        const resumedEntry = await api.timeEntries.resumeTimer(entry.id);
        console.log('Timer resumed:', resumedEntry);
        
        await loadTimeEntries(); // Refresh the time entries list
        return;
      }
      
      if (activeTimer) {
        // Calculate elapsed time for active timer
        const elapsedMinutes = Math.floor((new Date() - new Date(activeTimer.startTime)) / (1000 * 60));
        
        if (elapsedMinutes <= roundingMinutes) {
          // Less than rounding time - copy details without confirmation
          await startTimer({
            clientId: entry.clientId,
            projectId: entry.projectId,
            taskId: entry.taskId,
            description: entry.description
          });
          await loadTimeEntries(); // Refresh the time entries list
        } else {
          // More than rounding time - ask for confirmation
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
            await loadTimeEntries(); // Refresh the time entries list
          }
        }
      } else {
        // No active timer - start new timer
        await startTimer({
          clientId: entry.clientId,
          projectId: entry.projectId,
          taskId: entry.taskId,
          description: entry.description
        });
        await loadTimeEntries(); // Refresh the time entries list
      }
    } catch (error) {
      console.error('Error starting timer from entry:', error);
    }
  };

  const handleCreateEntry = async () => {
    if (entryForm.clientId && entryForm.startTime && entryForm.endTime) {
      try {
        const api = await waitForReady();
        // Prepare data with proper type conversion
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
        
        // Emit time-entries-updated event for other components
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
        // Prepare data with proper type conversion
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
        
        // Emit time-entries-updated event for other components
        const updateEvent = new CustomEvent('time-entries-updated');
        window.dispatchEvent(updateEvent);
      } catch (error) {
        console.error('Error updating time entry:', error);
      }
    }
  };

  const handleDeleteEntry = async (entryId) => {
    // Find the entry to check if it's active
    const entry = timeEntries.find(e => e.id === entryId);
    
    // Prevent deleting active time entries
    if (entry?.isActive || (activeTimer && activeTimer.id === entryId)) {
      alert('Cannot delete an active time entry. Please stop the timer first.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this time entry?')) {
      try {
        const api = await waitForReady();
        await api.timeEntries.delete(entryId);
        await loadTimeEntries();
        
        // Emit time-entries-updated event for other components
        const updateEvent = new CustomEvent('time-entries-updated');
        window.dispatchEvent(updateEvent);
      } catch (error) {
        console.error('Error deleting time entry:', error);
      }
    }
  };

  const openEditModal = (entry) => {
    // Prevent editing active time entries
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
      date: formatDateForForm(entry.startTime) // Extract date from startTime
    });
    setShowModal(true);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getTaskName = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : null;
  };

  // Group time entries by date
  const groupEntriesByDate = (entries) => {
    const groups = {};
    entries.forEach(entry => {
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
    
    // Sort dates in descending order (newest first)
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
  };

  // Calculate total duration for a day's entries
  const calculateDayTotal = (entries) => {
    const totalMinutes = entries.reduce((total, entry) => {
      if (entry.isActive) {
        // For active entries, calculate elapsed time
        const start = new Date(entry.startTime);
        const now = currentTime;
        const diffMs = now.getTime() - start.getTime();
        const minutes = Math.floor(diffMs / (1000 * 60));
        return total + minutes;
      } else {
        // For completed entries, calculate the duration
        return total + calculateDuration(entry.startTime, entry.endTime);
      }
    }, 0);
    
    return formatDurationHumanFriendly(totalMinutes);
  };

  // Toggle day collapse state
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
    <Container padding="40px" style={{ height: '100vh', overflowY: 'auto', position: 'relative' }}>
      <FlexBox justify="space-between" align="center" margin="0 0 20px 0">
        <Title>Time Entries</Title>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Add Entry
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
          {Object.entries(groupEntriesByDate(timeEntries) || {}).map(([date, entries], groupIndex) => {
            // Check if any entry in this day group is active
            const hasActiveEntry = entries.some(entry => entry.isActive);
            
            return (
              <div 
                key={date} 
                style={{ 
                  marginBottom: groupIndex < Object.keys(groupEntriesByDate(timeEntries)).length - 1 ? '20px' : '0',
                  border: hasActiveEntry ? '2px solid #007AFF' : 'none',
                  borderRadius: '8px',
                  padding: hasActiveEntry ? '2px' : '0'
                }}
              >
                {/* Day Header */}
                <Card 
                  padding="15px" 
                  margin="0"
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: hasActiveEntry ? '#1a1a2e' : '#2a2a2a',
                    border: hasActiveEntry ? 'none' : '1px solid #404040',
                    borderRadius: collapsedDays.has(date) ? '8px' : '8px 8px 0 0'
                  }}
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
                  <Text size="medium" variant="success" style={{ fontWeight: 'bold' }}>
                    {calculateDayTotal(entries)}
                  </Text>
                </FlexBox>
              </Card>

              {/* Day Entries */}
              {!collapsedDays.has(date) && (
                <FlexBox direction="column" gap="0">
                  {(entries || []).map((entry, index) => (
                    <Card 
                      key={entry.id} 
                      padding="15px"
                      margin="0"
                      style={{
                        border: hasActiveEntry ? (entry.isActive ? 'none' : '1px solid #404040') : (entry.isActive ? '2px solid #007AFF' : '1px solid #404040'),
                        borderTop: index === 0 ? 'none' : '1px solid #404040',
                        borderRadius: index === entries.length - 1 ? '0 0 8px 8px' : '0',
                        backgroundColor: entry.isActive ? '#1a1a2e' : undefined
                      }}
                    >
                      <FlexBox justify="space-between" align="center">
                        <FlexBox direction="column" gap="5px">
                          <FlexBox align="center" gap="10px">
                            <Heading size="small" style={{ marginBottom: '15px' }}>
                              {entry.taskId && getTaskName(entry.taskId) && (
                                <>
                                  <CheckSquare size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                                  {getTaskName(entry.taskId)}
                                  {entry.description && ' • '}
                                </>
                              )}
                              {entry.description || (!entry.taskId || !getTaskName(entry.taskId) ? 'No description' : '')}
                            </Heading>
                            {entry.isActive && (
                              <Text size="small" variant="success" style={{ 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                marginBottom: '15px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>
                                ACTIVE
                              </Text>
                            )}
                          </FlexBox>
                          <Text variant="secondary" size="small">
                            <Building size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                            {getClientName(entry.clientId)}
                            {entry.project && (
                              <>
                                {' '}
                                <Folder size={14} style={{ margin: '0 4px 0 10px', verticalAlign: 'text-bottom' }} />
                                {entry.project.name}
                              </>
                            )}
                          </Text>
                          <FlexBox gap="15px">
                            <Text size="small">
                              <Clock size={14} style={{ marginRight: '5px' }} />
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
                          {entry.isActive && (
                            <IconButton 
                              variant="danger" 
                              size="small" 
                              onClick={handleStopTimer}
                              title="Stop the active timer"
                            >
                              <Square size={14} />
                            </IconButton>
                          )}
                          <IconButton 
                            variant="secondary" 
                            size="small" 
                            onClick={() => openEditModal(entry)}
                            disabled={entry.isActive}
                            style={{ 
                              opacity: entry.isActive ? 0.5 : 1,
                              cursor: entry.isActive ? 'not-allowed' : 'pointer'
                            }}
                            title={entry.isActive ? "Cannot edit active timer" : "Edit entry"}
                          >
                            <Edit size={14} />
                          </IconButton>
                          <IconButton 
                            variant={entry.isActive ? "secondary" : "danger"} 
                            size="small" 
                            onClick={() => handleDeleteEntry(entry.id)}
                            disabled={entry.isActive}
                            style={{ 
                              opacity: entry.isActive ? 0.5 : 1,
                              cursor: entry.isActive ? 'not-allowed' : 'pointer'
                            }}
                            title={entry.isActive ? "Cannot delete active timer" : "Delete entry"}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </FlexBox>
                      </FlexBox>
                    </Card>
                  ))}
                </FlexBox>
              )}
            </div>
            );
          })}
        </FlexBox>
      )}

      {/* Time Entry Modal */}
      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}</ModalTitle>
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
                  {(projects || []).map(project => (
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
                  {(tasks || []).map(task => (
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
                <FlexBox direction="column" gap="5px" style={{ flex: 1 }}>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={entryForm.startTime}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </FlexBox>
                
                <FlexBox direction="column" gap="5px" style={{ flex: 1 }}>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={entryForm.endTime}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </FlexBox>
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Description</Label>
                <Input
                  value={entryForm.description}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What did you work on?"
                />
              </FlexBox>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
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
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}

      {/* Loading Overlay */}
      <LoadingOverlay 
        isVisible={isLoading} 
        text="Loading Time Entries..." 
        noFadeIn={true}
      />
    </Container>
  );
};

export default TimeEntries;
