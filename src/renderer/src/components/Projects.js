import React, { useState, useEffect } from 'react';
import { Plus, Building } from 'lucide-react';
import styled from 'styled-components';
import {
  Container,
  Grid,
  Card,
  FlexBox,
  Title,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
  EmptyState
} from './ui';

// Custom logger that ensures messages reach the terminal
const logger = {
  log: (...args) => {
    console.log(...args); // Keep browser devtools
    // Create terminal output by triggering database activity
    if (window.electronAPI) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Use DB call to ensure terminal visibility
      window.electronAPI.clients.getAll().then(clients => {
        console.log(`🟢 [${new Date().toLocaleTimeString()}] ${message} | DB: ${clients.length} clients`);
      }).catch(err => {
        console.log(`🔴 [LOGGER-FAILED] ${message}`);
      });
    }
  },
  error: (...args) => {
    console.error(...args);
    console.log('❌ ERROR:', ...args);
  }
};

const ResponsiveContainer = styled(Container)`
  padding: 40px;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const ResponsiveFlexBox = styled(FlexBox)`
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
    
    & > * {
      width: 100%;
    }
  }
`;

const ResponsiveGrid = styled(Grid)`
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`;

const Projects = () => {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showClientInfoModal, setShowClientInfoModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    hourly_rate: ''
  });

  const [projectForm, setProjectForm] = useState({
    client_id: '',
    name: '',
    description: '',
    hourly_rate: ''
  });

  const [taskForm, setTaskForm] = useState({
    project_id: '',
    name: '',
    description: '',
    is_recurring: false
  });

  useEffect(() => {
    console.log('Projects component mounted, electronAPI available:', !!window.electronAPI);
    const loadData = async () => {
      if (window.electronAPI) {
        console.log('Loading clients from electronAPI...');
        try {
          const clientList = await window.electronAPI.clients.getAll();
          console.log('Clients loaded:', clientList);
          setClients(clientList);
          if (clientList.length > 0 && !selectedClient) {
            setSelectedClient(clientList[0]);
          }
        } catch (error) {
          logger.error('Error loading clients:', error);
        }
      }
    };
    loadData();
  }, [selectedClient]);

  // Load projects when client changes
  useEffect(() => {
    const loadProjects = async () => {
      if (window.electronAPI && selectedClient) {
        try {
          const projectList = await window.electronAPI.projects.getAll(selectedClient.id);
          console.log('Projects loaded for client', selectedClient.id, ':', projectList);
          setProjects(projectList);
          if (projectList.length > 0 && !selectedProject) {
            setSelectedProject(projectList[0]);
          }
        } catch (error) {
          logger.error('Error loading projects:', error);
        }
      } else {
        setProjects([]);
        setSelectedProject(null);
      }
    };
    loadProjects();
  }, [selectedClient, selectedProject]);

  // Load tasks when project changes
  useEffect(() => {
    const loadTasks = async () => {
      if (window.electronAPI && selectedProject) {
        try {
          const taskList = await window.electronAPI.tasks.getAll(selectedProject.id);
          console.log('Tasks loaded for project', selectedProject.id, ':', taskList);
          setTasks(taskList);
        } catch (error) {
          logger.error('Error loading tasks:', error);
        }
      } else {
        setTasks([]);
      }
    };
    loadTasks();
  }, [selectedProject]);

  const handleCreateClient = async () => {
    console.log('handleCreateClient called', { clientForm, electronAPI: !!window.electronAPI });
    if (window.electronAPI && clientForm.name) {
      try {
        console.log('Creating client with data:', clientForm);
        const result = await window.electronAPI.clients.create(clientForm);
        console.log('Client created successfully:', result);
        setClientForm({ name: '', email: '', hourly_rate: '' });
        setShowClientModal(false);
        // Reload clients with debugging
        console.log('Reloading clients after creation...');
        const clientList = await window.electronAPI.clients.getAll();
        console.log('Clients after reload:', clientList);
        setClients(clientList);
      } catch (error) {
        logger.error('Error creating client:', error);
      }
    } else {
      console.log('Cannot create client - missing electronAPI or name', { 
        hasElectronAPI: !!window.electronAPI, 
        hasName: !!clientForm.name,
        clientForm 
      });
    }
  };

  const handleCreateProject = async () => {
    if (window.electronAPI && projectForm.name && selectedClient) {
      try {
        const projectData = {
          ...projectForm,
          clientId: selectedClient.id
        };
        console.log('Creating project with data:', projectData);
        const result = await window.electronAPI.projects.create(projectData);
        console.log('Project created successfully:', result);
        setProjectForm({ client_id: '', name: '', description: '', hourly_rate: '' });
        setShowProjectModal(false);
        // Reload projects
        const projectList = await window.electronAPI.projects.getAll(selectedClient.id);
        setProjects(projectList);
      } catch (error) {
        logger.error('Error creating project:', error);
      }
    }
  };

  const handleCreateTask = async () => {
    if (window.electronAPI && taskForm.name && selectedProject) {
      try {
        const taskData = {
          ...taskForm,
          projectId: selectedProject.id
        };
        console.log('Creating task with data:', taskData);
        const result = await window.electronAPI.tasks.create(taskData);
        console.log('Task created successfully:', result);
        setTaskForm({ project_id: '', name: '', description: '', is_recurring: false });
        setShowTaskModal(false);
        // Reload tasks
        const taskList = await window.electronAPI.tasks.getAll(selectedProject.id);
        setTasks(taskList);
      } catch (error) {
        logger.error('Error creating task:', error);
      }
    }
  };

  const handleDeleteClient = async (clientToDelete) => {
    if (window.confirm(`Are you sure you want to delete "${clientToDelete.name}"? This will also delete all associated projects and tasks.`)) {
      try {
        console.log('Deleting client:', clientToDelete.id);
        await window.electronAPI.clients.delete(clientToDelete.id);
        console.log('Client deleted successfully');
        
        // Clear selections if deleted client was selected
        if (selectedClient?.id === clientToDelete.id) {
          setSelectedClient(null);
          setSelectedProject(null);
        }
        
        setShowClientInfoModal(false);
        
        // Reload clients
        const clientList = await window.electronAPI.clients.getAll();
        setClients(clientList);
      } catch (error) {
        logger.error('Error deleting client:', error);
        alert('Failed to delete client: ' + error.message);
      }
    }
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
  };

  const handleClientInfo = (client, event) => {
    event.stopPropagation(); // Prevent triggering the card click
    setEditingClient(client);
    setShowClientInfoModal(true);
  };

  return (
    <ResponsiveContainer padding="40px" style={{ height: '100vh', overflowY: 'auto' }}>
      <ResponsiveFlexBox justify="space-between" align="center" margin="0 0 30px 0" wrap>
        <Title>Clients & Projects</Title>
        <ResponsiveFlexBox gap="10px" wrap>
          <Button variant="primary" onClick={() => {
            setEditingClient(null);
            setClientForm({ name: '', email: '', hourly_rate: '' });
            setShowClientModal(true);
          }}>
            <Plus size={16} />
            Add Client
          </Button>
          {selectedClient && (
            <Button variant="secondary" onClick={() => {
              setEditingProject(null);
              setProjectForm({ client_id: '', name: '', description: '', hourly_rate: '' });
              setShowProjectModal(true);
            }}>
              <Plus size={16} />
              Add Project
            </Button>
          )}
          {selectedProject && (
            <Button variant="secondary" onClick={() => {
              setEditingTask(null);
              setTaskForm({ project_id: '', name: '', description: '', is_recurring: false });
              setShowTaskModal(true);
            }}>
              <Plus size={16} />
              Add Task
            </Button>
          )}
        </ResponsiveFlexBox>
      </ResponsiveFlexBox>

      <ResponsiveGrid>
        {/* Clients */}
        <Card>
          <Heading margin="0 0 20px 0">
            <Building size={20} style={{ marginRight: '10px' }} />
            Clients
          </Heading>
          {clients.length === 0 ? (
            <EmptyState>
              <h3>No Clients</h3>
              <p>Add your first client to get started</p>
            </EmptyState>
          ) : (
            <div>
              {clients.map(client => (
                <Card 
                  key={client.id} 
                  padding="16px" 
                  margin="0 0 12px 0"
                  hoverable
                  style={{ 
                    cursor: 'pointer',
                    border: selectedClient?.id === client.id ? '2px solid #007AFF' : '1px solid #404040'
                  }}
                  onClick={() => handleClientClick(client)}
                  onDoubleClick={(e) => handleClientInfo(client, e)}
                >
                  <FlexBox justify="space-between" align="center">
                    <div>
                      <Heading size="small" margin="0 0 4px 0">{client.name}</Heading>
                      <Text variant="secondary" size="small">{client.email}</Text>
                      {client.hourly_rate && (
                        <Text size="small">${client.hourly_rate}/hr</Text>
                      )}
                    </div>
                    <Button 
                      size="small" 
                      variant="secondary"
                      onClick={(e) => handleClientInfo(client, e)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Info
                    </Button>
                  </FlexBox>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Projects */}
        {selectedClient && (
          <Card>
            <Heading margin="0 0 20px 0">
              Projects for {selectedClient.name}
            </Heading>
            {projects.length === 0 ? (
              <EmptyState>
                <h3>No Projects</h3>
                <p>Add a project for this client</p>
              </EmptyState>
            ) : (
              <div>
                {projects.map(project => (
                  <Card 
                    key={project.id} 
                    padding="16px" 
                    margin="0 0 12px 0"
                    hoverable
                    style={{ 
                      cursor: 'pointer',
                      border: selectedProject?.id === project.id ? '2px solid #007AFF' : '1px solid #404040'
                    }}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div>
                      <Heading size="small" margin="0 0 4px 0">{project.name}</Heading>
                      {project.description && (
                        <Text variant="secondary" size="small">{project.description}</Text>
                      )}
                      {project.hourly_rate && (
                        <Text size="small">${project.hourly_rate}/hr</Text>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tasks */}
        {selectedProject && (
          <Card>
            <Heading margin="0 0 20px 0">
              Tasks for {selectedProject.name}
            </Heading>
            {tasks.length === 0 ? (
              <EmptyState>
                <h3>No Tasks</h3>
                <p>Add a task for this project</p>
              </EmptyState>
            ) : (
              <div>
                {tasks.map(task => (
                  <Card 
                    key={task.id} 
                    padding="16px" 
                    margin="0 0 12px 0"
                    hoverable
                  >
                    <div>
                      <Heading size="small" margin="0 0 4px 0">{task.name}</Heading>
                      {task.description && (
                        <Text variant="secondary" size="small">{task.description}</Text>
                      )}
                      {task.is_recurring && (
                        <Text size="small" style={{ color: '#007AFF' }}>Recurring</Text>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}
      </ResponsiveGrid>

      {/* Client Modal */}
      {showClientModal && (
        <Modal onClick={() => setShowClientModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</ModalTitle>
              <ModalCloseButton onClick={() => setShowClientModal(false)}>×</ModalCloseButton>
            </ModalHeader>
            
            <FlexBox direction="column" gap="15px">
              <FlexBox direction="column" gap="5px">
                <Label>Client Name *</Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter client name"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="client@company.com"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  value={clientForm.hourly_rate}
                  onChange={(e) => setClientForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="75"
                />
              </FlexBox>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setShowClientModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleCreateClient}
                  disabled={!clientForm.name}
                >
                  Create Client
                </Button>
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <Modal onClick={() => setShowProjectModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</ModalTitle>
              <ModalCloseButton onClick={() => setShowProjectModal(false)}>×</ModalCloseButton>
            </ModalHeader>
            
            <FlexBox direction="column" gap="15px">
              <FlexBox direction="column" gap="5px">
                <Label>Project Name *</Label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Description</Label>
                <Input
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Project description"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Hourly Rate (overrides client rate)</Label>
                <Input
                  type="number"
                  value={projectForm.hourly_rate}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                  placeholder="100"
                />
              </FlexBox>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setShowProjectModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleCreateProject}
                  disabled={!projectForm.name}
                >
                  Create Project
                </Button>
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <Modal onClick={() => setShowTaskModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</ModalTitle>
              <ModalCloseButton onClick={() => setShowTaskModal(false)}>×</ModalCloseButton>
            </ModalHeader>
            
            <FlexBox direction="column" gap="15px">
              <FlexBox direction="column" gap="5px">
                <Label>Task Name *</Label>
                <Input
                  value={taskForm.name}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter task name"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Description</Label>
                <Input
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Task description"
                />
              </FlexBox>
              
              <FlexBox align="center" gap="10px">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={taskForm.is_recurring}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
                />
                <Label htmlFor="recurring">Recurring Task</Label>
              </FlexBox>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleCreateTask}
                  disabled={!taskForm.name}
                >
                  Create Task
                </Button>
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}

      {/* Client Info Modal */}
      {showClientInfoModal && editingClient && (
        <Modal onClick={() => setShowClientInfoModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Client Information</ModalTitle>
              <ModalCloseButton onClick={() => setShowClientInfoModal(false)}>×</ModalCloseButton>
            </ModalHeader>
            
            <FlexBox direction="column" gap="20px">
              <div>
                <Heading size="medium" margin="0 0 10px 0">{editingClient.name}</Heading>
                <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '5px' }}>
                  Email: {editingClient.email || 'No email provided'}
                </Text>
                {editingClient.hourly_rate && (
                  <Text size="small" style={{ display: 'block', marginBottom: '5px' }}>
                    Hourly Rate: ${editingClient.hourly_rate}/hr
                  </Text>
                )}
                <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '5px' }}>
                  Created: {new Date(editingClient.created_at).toLocaleDateString()}
                </Text>
                {editingClient.updated_at !== editingClient.created_at && (
                  <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '5px' }}>
                    Last Updated: {new Date(editingClient.updated_at).toLocaleDateString()}
                  </Text>
                )}
              </div>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
                <Button 
                  variant="danger" 
                  onClick={() => handleDeleteClient(editingClient)}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  Delete Client
                </Button>
                <Button variant="secondary" onClick={() => setShowClientInfoModal(false)}>
                  Close
                </Button>
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}
    </ResponsiveContainer>
  );
};

export default Projects;
