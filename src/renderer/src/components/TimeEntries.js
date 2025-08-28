import React, { useState, useEffect } from 'react';
import { Calendar, Edit, Trash2, Plus, Clock } from 'lucide-react';
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
  IconButton
} from './ui';
import { useTimer } from '../context/TimerContext';
import { formatDuration, formatTime, formatDate, formatTimeForForm, formatDateForForm, calculateDuration } from '../utils/dateHelpers';

const TimeEntries = () => {
  const { activeTimer } = useTimer();
  const [timeEntries, setTimeEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [entryForm, setEntryForm] = useState({
    clientId: '',
    projectId: '',
    taskId: '',
    description: '',
    startTime: '',
    endTime: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    console.log('TimeEntries component mounting, loading data...');
    loadTimeEntries();
    loadClients();
  }, []);

  // Update current time every second for active timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load projects when client changes
  useEffect(() => {
    const loadProjects = async () => {
      if (entryForm.clientId && window.electronAPI) {
        try {
          const projectList = await window.electronAPI.projects.getAll(parseInt(entryForm.clientId));
          console.log('Projects loaded for client', entryForm.clientId, ':', projectList);
          setProjects(projectList);
          // Reset project/task selection when client changes
          if (entryForm.projectId) {
            setEntryForm(prev => ({ ...prev, projectId: '', taskId: '' }));
          }
          setTasks([]);
        } catch (error) {
          console.error('Error loading projects:', error);
          setProjects([]);
        }
      } else {
        setProjects([]);
        setTasks([]);
      }
    };

    loadProjects();
  }, [entryForm.clientId, entryForm.projectId]);

  // Load tasks when project changes  
  useEffect(() => {
    const loadTasks = async () => {
      if (entryForm.projectId && window.electronAPI) {
        try {
          const taskList = await window.electronAPI.tasks.getAll(parseInt(entryForm.projectId));
          console.log('Tasks loaded for project', entryForm.projectId, ':', taskList);
          setTasks(taskList);
          // Reset task selection when project changes
          if (entryForm.taskId) {
            setEntryForm(prev => ({ ...prev, taskId: '' }));
          }
        } catch (error) {
          console.error('Error loading tasks:', error);
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
    };

    loadTasks();
  }, [entryForm.projectId, entryForm.taskId]);

  // Helper function to calculate elapsed time for active entries
  const getElapsedTime = (startTime) => {
    const start = new Date(startTime);
    const now = currentTime;
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    return formatDuration(minutes);
  };

  const loadTimeEntries = async () => {
    console.log('Loading time entries...');
    if (window.electronAPI) {
      try {
        const entries = await window.electronAPI.timeEntries.getAll();
        console.log('Time entries loaded:', entries.length, 'entries');
        setTimeEntries(entries);
      } catch (error) {
        console.error('Error loading time entries:', error);
      }
    }
  };

  const loadClients = async () => {
    if (window.electronAPI) {
      try {
        const clientList = await window.electronAPI.clients.getAll();
        setClients(clientList);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    }
  };

  const handleCreateEntry = async () => {
    if (window.electronAPI && entryForm.clientId && entryForm.taskId && entryForm.startTime && entryForm.endTime) {
      try {
        await window.electronAPI.timeEntries.create(entryForm);
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
      } catch (error) {
        console.error('Error creating time entry:', error);
      }
    }
  };

  const handleUpdateEntry = async () => {
    if (window.electronAPI && editingEntry) {
      try {
        await window.electronAPI.timeEntries.update(editingEntry.id, entryForm);
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

    if (window.electronAPI && window.confirm('Are you sure you want to delete this time entry?')) {
      try {
        await window.electronAPI.timeEntries.delete(entryId);
        await loadTimeEntries();
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
      projectId: entry.task?.project?.id || '',
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

  return (
    <Container padding="40px" style={{ height: '100vh', overflowY: 'auto' }}>
      <FlexBox justify="space-between" align="center" margin="0 0 30px 0">
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
        <FlexBox direction="column" gap="15px">
          {timeEntries.map(entry => (
            <Card 
              key={entry.id} 
              padding="20px"
              style={{
                border: entry.isActive ? '2px solid #007AFF' : undefined,
                backgroundColor: entry.isActive ? '#1a1a2e' : undefined
              }}
            >
              <FlexBox justify="space-between" align="center">
                <FlexBox direction="column" gap="5px">
                  <FlexBox align="center" gap="10px">
                    <Heading size="small">{entry.description || 'No description'}</Heading>
                    {entry.isActive && (
                      <Text size="small" variant="success" style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        backgroundColor: '#28a745',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        ACTIVE
                      </Text>
                    )}
                  </FlexBox>
                  <Text variant="secondary">{getClientName(entry.clientId)}</Text>
                  <FlexBox gap="15px">
                    <Text size="small">
                      <Calendar size={14} style={{ marginRight: '5px' }} />
                      {formatDate(entry.startTime)}
                    </Text>
                    <Text size="small">
                      <Clock size={14} style={{ marginRight: '5px' }} />
                      {entry.isActive 
                        ? `${formatTime(entry.startTime)} - Running`
                        : `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`
                      }
                    </Text>
                    <Text size="small" variant="success">
                      {entry.isActive 
                        ? getElapsedTime(entry.startTime)
                        : formatDuration(calculateDuration(entry.startTime, entry.endTime))
                      }
                    </Text>
                  </FlexBox>
                </FlexBox>
                
                <FlexBox gap="10px">
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
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </Select>
              </FlexBox>

              <FlexBox direction="column" gap="5px">
                <Label>Project *</Label>
                <Select
                  value={entryForm.projectId}
                  onChange={(e) => {
                    setEntryForm(prev => ({ ...prev, projectId: e.target.value, taskId: '' }));
                  }}
                  disabled={!entryForm.clientId}
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </Select>
              </FlexBox>

              <FlexBox direction="column" gap="5px">
                <Label>Task *</Label>
                <Select
                  value={entryForm.taskId}
                  onChange={(e) => {
                    setEntryForm(prev => ({ ...prev, taskId: e.target.value }));
                  }}
                  disabled={!entryForm.projectId}
                >
                  <option value="">Select a task</option>
                  {tasks.map(task => (
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
    </Container>
  );
};

export default TimeEntries;
