import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Calendar, Download } from 'lucide-react';
import { colors } from '../styles/theme';
import {
  Container,
  Grid,
  Card,
  FlexBox,
  Title,
  Heading,
  Text,
  BigNumber,
  Button,
  Input,
  Select,
  Label,
  IconContainer
} from './ui';

const Reports = () => {
  const [stats, setStats] = useState({
    totalHours: 0,
    totalEarnings: 0,
    completedTasks: 0
  });
  
  // Set default dates to current month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [filterData, setFilterData] = useState({
    startDate: firstOfMonth.toISOString().split('T')[0],
    endDate: lastOfMonth.toISOString().split('T')[0],
    client: '',
    project: ''
  });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  useEffect(() => {
    loadData();
    loadClients();
  }, []);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        const timeEntries = await window.electronAPI.timeEntries.getAll();
        const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
        const totalEarnings = timeEntries.reduce((sum, entry) => {
          const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
          return sum + (rate * (entry.duration || 0) / 60);
        }, 0);
        
        setStats({
          totalHours: totalHours.toFixed(1),
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          completedTasks: timeEntries.length
        });
      } catch (error) {
        console.error('Error loading stats:', error);
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

  const loadProjects = async (clientId) => {
    if (window.electronAPI && clientId) {
      try {
        const projectList = await window.electronAPI.projects.getAll(clientId);
        setProjects(projectList);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
  };

  const handleFilterChange = (field, value) => {
    setFilterData(prev => ({ ...prev, [field]: value }));
    if (field === 'client' && value) {
      loadProjects(value);
    }
  };

  const exportToCSV = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.export.csv();
      } catch (error) {
        console.error('Error exporting to CSV:', error);
      }
    }
  };

  const exportToJSON = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.export.json();
      } catch (error) {
        console.error('Error exporting to JSON:', error);
      }
    }
  };

  return (
    <Container padding="40px" style={{ height: '100vh', overflowY: 'auto' }}>
      <Title margin="0 0 30px 0">Reports</Title>
      
      <Grid gap="20px" margin="0 0 40px 0">
        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background={colors.success} rounded>
              <Clock size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Total Hours</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">{stats.totalHours}</BigNumber>
          <Text variant="secondary" size="small">This month</Text>
        </Card>

        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background={colors.primary} rounded>
              <DollarSign size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Total Earnings</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">{formatCurrency(stats.totalEarnings)}</BigNumber>
          <Text variant="secondary" size="small">This month</Text>
        </Card>

        <Card>
          <FlexBox align="center" gap="12px" margin="0 0 16px 0">
            <IconContainer background={colors.warning} rounded>
              <Calendar size={20} />
            </IconContainer>
            <div>
              <Heading margin="0" size="small">Completed Tasks</Heading>
            </div>
          </FlexBox>
          <BigNumber size="32px" margin="0 0 8px 0">{stats.completedTasks}</BigNumber>
          <Text variant="secondary" size="small">This month</Text>
        </Card>
      </Grid>

      <Card margin="0 0 30px 0">
        <Heading margin="0 0 20px 0">Filter Reports</Heading>
        <Grid columns="repeat(auto-fit, minmax(200px, 1fr))" gap="20px">
          <FlexBox direction="column" gap="8px">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={filterData.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </FlexBox>
          
          <FlexBox direction="column" gap="8px">
            <Label>End Date</Label>
            <Input
              type="date"
              value={filterData.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </FlexBox>
          
          <FlexBox direction="column" gap="8px">
            <Label>Client</Label>
            <Select
              value={filterData.client}
              onChange={(e) => handleFilterChange('client', e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </Select>
          </FlexBox>
          
          <FlexBox direction="column" gap="8px">
            <Label>Project</Label>
            <Select
              value={filterData.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
              disabled={!filterData.client}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </Select>
          </FlexBox>
        </Grid>
      </Card>

      <Card>
        <Heading margin="0 0 20px 0">Export Data</Heading>
        <FlexBox gap="15px" wrap>
          <Button variant="primary" onClick={exportToCSV}>
            <Download size={16} />
            Export to CSV
          </Button>
          <Button variant="secondary" onClick={exportToJSON}>
            <Download size={16} />
            Export to JSON
          </Button>
        </FlexBox>
      </Card>
    </Container>
  );
};

export default Reports;
