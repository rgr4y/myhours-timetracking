import React, { useMemo } from 'react';
import { Select, Label } from './Input';
import { FlexBox } from './Layout';
import { Text } from './Typography';

export const ClientSelect = ({ 
  clients = [], 
  value, 
  onChange, 
  label = "Client", 
  required = false, 
  disabled = false,
  showCount = false,
  countData = null 
}) => {
  return (
    <FlexBox direction="column" gap="5px">
      <Label>{label} {required && '*'}</Label>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select a client{required ? '' : ' (optional)'}</option>
        {clients.map(client => (
          <option key={client.id} value={client.id}>{client.name}</option>
        ))}
      </Select>
      {showCount && value && countData && (
        <Text size="small" variant="secondary">
          {countData} entries available
        </Text>
      )}
    </FlexBox>
  );
};

export const ProjectSelect = ({ 
  projects = [], 
  value, 
  onChange, 
  label = "Project", 
  required = false, 
  disabled = false,
  clientId = null 
}) => {
  const filteredProjects = useMemo(() => {
    if (!clientId) return [];
    return projects.filter(project => project.clientId === parseInt(clientId));
  }, [projects, clientId]);

  return (
    <FlexBox direction="column" gap="5px">
      <Label>{label} {required && '*'}</Label>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || !clientId}
      >
        <option value="">Select a project{required ? '' : ' (optional)'}</option>
        {filteredProjects.map(project => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </Select>
    </FlexBox>
  );
};

export const TaskSelect = ({ 
  tasks = [], 
  value, 
  onChange, 
  label = "Task", 
  required = false, 
  disabled = false,
  projectId = null 
}) => {
  const filteredTasks = useMemo(() => {
    if (!projectId) return [];
    return tasks.filter(task => task.projectId === parseInt(projectId));
  }, [tasks, projectId]);

  return (
    <FlexBox direction="column" gap="5px">
      <Label>{label} {required && '*'}</Label>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || !projectId}
      >
        <option value="">Select a task{required ? '' : ' (optional)'}</option>
        {filteredTasks.map(task => (
          <option key={task.id} value={task.id}>{task.name}</option>
        ))}
      </Select>
    </FlexBox>
  );
};
