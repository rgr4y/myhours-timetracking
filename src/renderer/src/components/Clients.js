import React, { useState, useEffect } from 'react';
import { Plus, Building, Edit3, Trash2 } from 'lucide-react';
import styled from 'styled-components';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { colors } from '../styles/theme';
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

const Clients = () => {
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

  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [, setIsLoadingTasks] = useState(false);

  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    hourly_rate: ''
  });

  const [projectForm, setProjectForm] = useState({
    client_id: '',
    name: '',
    description: '',
    hourly_rate: '',
    isDefault: false
  });

  const [taskForm, setTaskForm] = useState({
    project_id: '',
    name: '',
    description: '',
    is_recurring: false,
    hourly_rate: ''
  });

  useEffect(() => {
    console.log('[RNDR->CLIENTS] Component mounted, electronAPI available:', !!window.electronAPI);
    const loadData = async () => {
      if (window.electronAPI) {
        // console.log('Loading clients from electronAPI...');
        try {
          const clientList = await window.electronAPI.clients.getAll();
          setClients(clientList);
          if (clientList.length > 0 && !selectedClient) {
            setSelectedClient(clientList[0]);
          }
        } catch (error) {
          console.error('Error loading clients:', error);
        }
      }
    };
    loadData();
  }, [selectedClient]);

  // Load projects when client changes
  useEffect(() => {
    const loadProjects = async () => {
      if (window.electronAPI && selectedClient) {
        setIsLoadingProjects(true);
        try {
          const projectList = await window.electronAPI.projects.getAll(selectedClient.id);
          // console.log('Projects loaded for client', selectedClient.id, ':', projectList);
          setProjects(projectList);
          // Auto-select first project if there are projects available
          if (projectList.length > 0) {
            setSelectedProject(projectList[0]);
          } else {
            setSelectedProject(null);
          }
        } catch (error) {
          console.error('Error loading projects:', error);
        } finally {
          setIsLoadingProjects(false);
        }
      } else {
        setProjects([]);
        setSelectedProject(null);
        setIsLoadingProjects(false);
      }
    };
    loadProjects();
  }, [selectedClient]); // selectedClient changes trigger project reload

  // Load tasks when project changes
  useEffect(() => {
    const loadTasks = async () => {
      if (window.electronAPI && selectedProject) {
        setIsLoadingTasks(true);
        try {
          const taskList = await window.electronAPI.tasks.getAll(selectedProject.id);
          // console.log('Tasks loaded for project', selectedProject.id, ':', taskList);          
          setTasks(taskList);
        } catch (error) {
          console.error('Error loading tasks:', error);
        } finally {
          setIsLoadingTasks(false);
        }
      } else {
        setTasks([]);
        setIsLoadingTasks(false);
      }
    };
    loadTasks();
  }, [selectedProject, setIsLoadingTasks]);

  const handleCreateClient = async () => {
    console.log('handleCreateClient called', { clientForm, electronAPI: !!window.electronAPI });
    if (window.electronAPI && clientForm.name) {
      try {
        const clientData = {
          name: clientForm.name,
          email: clientForm.email || null,
          hourlyRate: clientForm.hourly_rate ? parseFloat(clientForm.hourly_rate) : 0
        };
        console.log('Creating client with data:', clientData);
        const result = await window.electronAPI.clients.create(clientData);
        console.log('Client created successfully:', result);
        setClientForm({ name: '', email: '', hourly_rate: '' });
        setShowClientModal(false);
        // Reload clients with debugging
        console.log('Reloading clients after creation...');
        const clientList = await window.electronAPI.clients.getAll();
        console.log('Clients after reload:', clientList);
        setClients(clientList);
        // Optionally select the newly created client
        try {
          const newlyCreated = clientList.find(c => c.id === result.id);
          if (newlyCreated) setSelectedClient(newlyCreated);
        } catch (_) {}
      } catch (error) {
        console.error('Error creating client:', error);
      }
    } else {
      console.log('Cannot create client - missing electronAPI or name', { 
        hasElectronAPI: !!window.electronAPI, 
        hasName: !!clientForm.name,
        clientForm 
      });
    }
  };

  const handleUpdateClient = async () => {
    if (window.electronAPI && editingClient && clientForm.name) {
      try {
        const clientData = {
          name: clientForm.name,
          email: clientForm.email || null,
          hourlyRate: clientForm.hourly_rate ? parseFloat(clientForm.hourly_rate) : 0
        };
        const result = await window.electronAPI.clients.update(editingClient.id, clientData);
        console.log('Client updated successfully:', result);
        setClientForm({ name: '', email: '', hourly_rate: '' });
        setEditingClient(null);
        setShowClientInfoModal(false); // Close info modal instead of client modal
        // Reload clients
        const clientList = await window.electronAPI.clients.getAll();
        setClients(clientList);
        // Update selectedClient if it was the one being edited
        if (selectedClient && selectedClient.id === editingClient.id) {
          setSelectedClient(result);
        }
      } catch (error) {
        console.error('Error updating client:', error);
      }
    }
  };

  const handleSubmitClient = () => {
    if (editingClient) {
      handleUpdateClient();
    } else {
      handleCreateClient();
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
        setProjectForm({ client_id: '', name: '', description: '', hourly_rate: '', isDefault: false });
        setShowProjectModal(false);
        // Reload projects
        const projectList = await window.electronAPI.projects.getAll(selectedClient.id);
        setProjects(projectList);
      } catch (error) {
        console.error('Error creating project:', error);
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
        console.error('Error creating task:', error);
      }
    }
  };

  const handleUpdateProject = async () => {
    if (window.electronAPI && projectForm.name && editingProject) {
      try {
        const projectData = {
          name: projectForm.name,
          hourlyRate: projectForm.hourly_rate ? parseFloat(projectForm.hourly_rate) : null,
          isDefault: projectForm.isDefault
        };
        console.log('Updating project with data:', projectData);
        await window.electronAPI.projects.update(editingProject.id, projectData);
        console.log('Project updated successfully');
        setShowProjectModal(false);
        setEditingProject(null);
        // Reload projects
        const projectList = await window.electronAPI.projects.getAll(selectedClient.id);
        setProjects(projectList);
      } catch (error) {
        console.error('Error updating project:', error);
        alert('Failed to update project: ' + error.message);
      }
    }
  };

  const handleUpdateTask = async () => {
    if (window.electronAPI && taskForm.name && editingTask) {
      try {
        const taskData = {
          name: taskForm.name,
          description: taskForm.description || null
        };
        console.log('Updating task with data:', taskData);
        await window.electronAPI.tasks.update(editingTask.id, taskData);
        console.log('Task updated successfully');
        setShowTaskModal(false);
        setEditingTask(null);
        // Reload tasks
        const taskList = await window.electronAPI.tasks.getAll(selectedProject.id);
        setTasks(taskList);
      } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task: ' + error.message);
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
        console.error('Error deleting client:', error);
        alert('Failed to delete client: ' + error.message);
      }
    }
  };

  const handleDeleteProject = async (projectToDelete) => {
    if (window.confirm(`Are you sure you want to delete "${projectToDelete.name}"? This will also delete all associated tasks.`)) {
      try {
        console.log('Deleting project:', projectToDelete.id);
        await window.electronAPI.projects.delete(projectToDelete.id);
        console.log('Project deleted successfully');
        
        // Clear selections if deleted project was selected
        if (selectedProject?.id === projectToDelete.id) {
          setSelectedProject(null);
        }
        
        setShowProjectModal(false);
        
        // Reload projects for the current client
        if (selectedClient) {
          const projectList = await window.electronAPI.projects.getAll(selectedClient.id);
          setProjects(projectList);
          // Auto-select first project if there are projects available
          if (projectList.length > 0) {
            setSelectedProject(projectList[0]);
          }
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project: ' + error.message);
      }
    }
  };

  const handleDeleteTask = async (taskToDelete) => {
    if (window.confirm(`Are you sure you want to delete "${taskToDelete.name}"?`)) {
      try {
        console.log('Deleting task:', taskToDelete.id);
        await window.electronAPI.tasks.delete(taskToDelete.id);
        console.log('Task deleted successfully');
        
        // Reload tasks for the current project
        if (selectedProject) {
          const taskList = await window.electronAPI.tasks.getAll(selectedProject.id);
          setTasks(taskList);
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task: ' + error.message);
      }
    }
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setSelectedProject(null); // Clear selected project when client changes
  };

  const handleClientInfo = (client, event) => {
    event.stopPropagation(); // Prevent triggering the card click
    setEditingClient(client);
    setClientForm({
      name: client.name,
      email: client.email || '',
      hourly_rate: client.hourlyRate || ''
    });
    setShowClientInfoModal(true); // Use the info modal for editing
  };

  // Keyboard shortcuts for modals
  useModalKeyboard({
    isOpen: showClientModal,
    onSubmit: editingClient ? handleUpdateClient : handleCreateClient,
    onClose: () => {
      setShowClientModal(false);
      setEditingClient(null);
      setClientForm({ name: '', email: '', hourly_rate: '' });
    },
    formData: clientForm
  });

  useModalKeyboard({
    isOpen: showProjectModal,
    onSubmit: editingProject ? handleUpdateProject : handleCreateProject,
    onClose: () => {
      setShowProjectModal(false);
      setEditingProject(null);
      setProjectForm({ client_id: '', name: '', description: '', hourly_rate: '', isDefault: false });
    },
    formData: projectForm
  });

  useModalKeyboard({
    isOpen: showTaskModal,
    onSubmit: editingTask ? handleUpdateTask : handleCreateTask,
    onClose: () => {
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ project_id: '', name: '', description: '', is_recurring: false, hourly_rate: '' });
    },
    formData: taskForm
  });

  useModalKeyboard({
    isOpen: showClientInfoModal,
    onSubmit: handleUpdateClient,
    onClose: () => {
      setShowClientInfoModal(false);
      setEditingClient(null);
      setClientForm({ name: '', email: '', hourly_rate: '' });
    },
    formData: clientForm
  });

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
          {/* Add Project button - show always, gray out if loading projects or no clients */}
          <Button 
            variant="secondary" 
            disabled={clients.length === 0 || isLoadingProjects}
            onClick={() => {
              setEditingProject(null);
              setProjectForm({ client_id: '', name: '', description: '', hourly_rate: '', isDefault: false });
              setShowProjectModal(true);
            }}
            style={{ 
              opacity: (clients.length === 0 || isLoadingProjects) ? 0.5 : 1,
              cursor: (clients.length === 0 || isLoadingProjects) ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus size={16} />
            Add Project
          </Button>
          {/* Add Task button - show always, gray out if client loading or no projects exist */}
          <Button 
            variant="secondary" 
            disabled={isLoadingProjects || projects.length === 0}
            onClick={() => {
              setEditingTask(null);
              setTaskForm({ project_id: '', name: '', description: '', is_recurring: false });
              setShowTaskModal(true);
            }}
            style={{ 
              opacity: (isLoadingProjects || projects.length === 0) ? 0.5 : 1,
              cursor: (isLoadingProjects || projects.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus size={16} />
            Add Task
          </Button>
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
                    border: selectedClient?.id === client.id ? `2px solid ${colors.primary}` : `1px solid ${colors.borderDefault}`
                  }}
                  onClick={() => handleClientClick(client)}
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
                      style={{ padding: '6px', fontSize: '12px' }}
                    >
                      <Edit3 size={14} />
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
                      border: selectedProject?.id === project.id ? `2px solid ${colors.primary}` : `1px solid ${colors.borderDefault}`
                    }}
                    onClick={() => setSelectedProject(project)}
                  >
                    <FlexBox justify="space-between" align="center">
                      <div>
                        <FlexBox align="center" gap="8px">
                          <Heading size="small" margin="0">{project.name}</Heading>
                          {project.isDefault && (
                            <Text size="small" style={{ color: colors.primary, fontWeight: 'bold' }}>Default</Text>
                          )}
                        </FlexBox>
                        {project.description && (
                          <Text variant="secondary" size="small" style={{ marginTop: '4px' }}>{project.description}</Text>
                        )}
                        {project.hourly_rate && (
                          <Text size="small">${project.hourly_rate}/hr</Text>
                        )}
                      </div>
                      <Button 
                        size="small" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                          setProjectForm({
                            client_id: project.client_id,
                            name: project.name,
                            description: project.description || '',
                            hourly_rate: project.hourly_rate || '',
                            isDefault: project.isDefault || false
                          });
                          setShowProjectModal(true);
                        }}
                        style={{ padding: '6px', fontSize: '12px' }}
                      >
                        <Edit3 size={14} />
                      </Button>
                    </FlexBox>
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
                    style={{ cursor: 'pointer' }}
                  >
                    <FlexBox justify="space-between" align="center">
                      <div>
                        <Heading size="small" margin="0 0 4px 0">{task.name}</Heading>
                        {task.description && (
                          <Text variant="secondary" size="small">{task.description}</Text>
                        )}
                        {task.hourly_rate && (
                          <Text size="small">${task.hourly_rate}/hr</Text>
                        )}
                        {task.is_recurring && (
                          <Text size="small" style={{ color: colors.recurringText }}>Recurring</Text>
                        )}
                      </div>
                      <FlexBox gap="8px">
                        <Button 
                          size="small" 
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                            setTaskForm({
                              project_id: task.project_id,
                              name: task.name,
                              description: task.description || '',
                              is_recurring: task.is_recurring || false,
                              hourly_rate: task.hourly_rate || ''
                            });
                            setShowTaskModal(true);
                          }}
                          style={{ padding: '6px', fontSize: '12px' }}
                        >
                          <Edit3 size={14} />
                        </Button>
                        <Button 
                          size="small" 
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task);
                          }}
                          style={{ padding: '6px', fontSize: '12px' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </FlexBox>
                    </FlexBox>
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
                <Label>Name *</Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Client name"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="client@example.com"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="text"
                  value={clientForm.hourly_rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow numbers, decimal point, and empty string
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setClientForm(prev => ({ ...prev, hourly_rate: value }));
                    }
                  }}
                  placeholder="30.00"
                />
              </FlexBox>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setShowClientModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSubmitClient}
                  disabled={!clientForm.name}
                >
                  {editingClient ? 'Update' : 'Create'} Client
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
                  type="text"
                  value={projectForm.hourly_rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow numbers, decimal point, and empty string
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setProjectForm(prev => ({ ...prev, hourly_rate: value }));
                    }
                  }}
                  placeholder="100"
                />
              </FlexBox>
              
              <FlexBox align="center" gap="10px">
                <input
                  type="checkbox"
                  id="defaultProject"
                  checked={projectForm.isDefault}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                />
                <Label htmlFor="defaultProject">Set as Default Project</Label>
              </FlexBox>
              
              <FlexBox gap="10px" justify="space-between" style={{ marginTop: '20px' }}>
                <div>
                  {editingProject && (
                    <Button 
                      variant="danger" 
                      onClick={() => handleDeleteProject(editingProject)}
                    >
                      Delete Project
                    </Button>
                  )}
                </div>
                <FlexBox gap="10px">
                  <Button variant="secondary" onClick={() => setShowProjectModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={editingProject ? handleUpdateProject : handleCreateProject}
                    disabled={!projectForm.name}
                  >
                    {editingProject ? 'Update' : 'Create'} Project
                  </Button>
                </FlexBox>
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

              <FlexBox direction="column" gap="5px">
                <Label>Hourly Rate</Label>
                <Input
                  type="text"
                  value={taskForm.hourly_rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow numbers, decimal point, and empty string
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setTaskForm(prev => ({ ...prev, hourly_rate: value }));
                    }
                  }}
                  placeholder="Override project/client rate"
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
                  onClick={editingTask ? handleUpdateTask : handleCreateTask}
                  disabled={!taskForm.name}
                >
                  {editingTask ? 'Update' : 'Create'} Task
                </Button>
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}

      {/* Client Info/Edit Modal */}
      {showClientInfoModal && editingClient && (
        <Modal onClick={() => setShowClientInfoModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Edit Client</ModalTitle>
              <ModalCloseButton onClick={() => setShowClientInfoModal(false)}>×</ModalCloseButton>
            </ModalHeader>
            
            <FlexBox direction="column" gap="15px">
              <FlexBox direction="column" gap="5px">
                <Label>Name *</Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Client name"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="client@example.com"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="text"
                  value={clientForm.hourly_rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow numbers, decimal point, and empty string
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setClientForm(prev => ({ ...prev, hourly_rate: value }));
                    }
                  }}
                  placeholder="30.00"
                />
              </FlexBox>
              
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${colors.borderDark}` }}>
                <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '5px' }}>
                  Created: {editingClient.createdAt ? new Date(editingClient.createdAt).toLocaleDateString() : 'Unknown'}
                </Text>
                {editingClient.updatedAt && editingClient.updatedAt !== editingClient.createdAt && (
                  <Text variant="secondary" size="small" style={{ display: 'block', marginBottom: '5px' }}>
                    Last Updated: {new Date(editingClient.updatedAt).toLocaleDateString()}
                  </Text>
                )}
              </div>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
                <Button 
                  variant="danger" 
                  onClick={() => handleDeleteClient(editingClient)}
                >
                  Delete Client
                </Button>
                <Button variant="secondary" onClick={() => setShowClientInfoModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    if (clientForm.name) {
                      handleUpdateClient();
                    }
                  }}
                  disabled={!clientForm.name}
                >
                  Update Client
                </Button>
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}
    </ResponsiveContainer>
  );
};

export default Clients;
