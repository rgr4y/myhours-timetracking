import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FileText, Download, DollarSign, Trash2, Filter } from 'lucide-react';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
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
  Select,
  Label,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
  EmptyState,
  TabContainer,
  TabList,
  Tab,
  TabPanel,
  Chip,
  ChipGroup,
  ClientSelect,
  ProjectSelect,
  TaskSelect,
  DataTable
} from './ui';

// Styled component for sticky summary bar
const StickyBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  background: #2a2a2a;
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const Invoice = () => {
  const [activeTab, setActiveTab] = useState('generated');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredTimeEntries, setFilteredTimeEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const { waitForReady } = useElectronAPI();
  const filtersRef = useRef(null);

  // Invoice generation form state
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    start_date: '',
    end_date: '',
    invoice_number: '',
    due_date: ''
  });

  // Filtering state for the new tab
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    clientId: '',
    projectId: '',
    taskId: ''
  });

  const loadInvoices = useCallback(async () => {
    try {
      const api = await waitForReady();
      if (api && api.invoices) {
        const invoiceList = await api.invoices.getAll();
        setInvoices(invoiceList);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  }, [waitForReady]);

  const loadClients = useCallback(async () => {
    try {
      const api = await waitForReady();
      if (api && api.clients) {
        const clientList = await api.clients.getAll();
        setClients(clientList);
        
        // Extract projects and tasks
        const allProjects = [];
        const allTasks = [];
        
        clientList.forEach(client => {
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
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, [waitForReady]);

  const loadTimeEntries = useCallback(async () => {
    try {
      const api = await waitForReady();
      if (api && api.timeEntries) {
        const entries = await api.timeEntries.getAll();
        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  }, [waitForReady]);

  useEffect(() => {
    loadInvoices();
    loadClients();
    loadTimeEntries();
  }, [loadInvoices, loadClients, loadTimeEntries]);

  // Add scroll detection for sticky bar
  useEffect(() => {
    const handleScroll = () => {
      if (filtersRef.current && activeTab === 'create') {
        const rect = filtersRef.current.getBoundingClientRect();
        setShowStickyBar(rect.bottom < 0);
      }
    };

    // Add scroll listener to window
    window.addEventListener('scroll', handleScroll);
    
    // Also check for scroll on the container
    const container = document.querySelector('[data-testid="invoice-container"]');
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeTab]);

  // Filter time entries based on current filters
  useEffect(() => {
    let filtered = timeEntries.filter(entry => !entry.isInvoiced); // Only uninvoiced entries
    
    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(entry => new Date(entry.startTime) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire day
      filtered = filtered.filter(entry => new Date(entry.startTime) <= toDate);
    }
    
    // Apply client filter
    if (filters.clientId) {
      filtered = filtered.filter(entry => entry.clientId === parseInt(filters.clientId));
    }
    
    // Apply project filter
    if (filters.projectId) {
      filtered = filtered.filter(entry => entry.projectId === parseInt(filters.projectId));
    }
    
    // Apply task filter
    if (filters.taskId) {
      filtered = filtered.filter(entry => entry.taskId === parseInt(filters.taskId));
    }
    
    setFilteredTimeEntries(filtered);
    
    // Clear selections for entries that are no longer visible
    const visibleIds = filtered.map(entry => entry.id);
    setSelectedEntries(prev => prev.filter(id => visibleIds.includes(id)));
  }, [timeEntries, filters]);

  const handleGenerateInvoice = async () => {
    if (invoiceForm.client_id && invoiceForm.start_date && invoiceForm.end_date) {
      try {
        setIsGenerating(true);
        setErrorMessage('');
        const api = await waitForReady();
        if (api && api.invoices) {
          const result = await api.invoices.generate(invoiceForm);
          if (result.success) {
            setInvoiceForm({
              client_id: '',
              start_date: '',
              end_date: '',
              invoice_number: '',
              due_date: ''
            });
            setShowModal(false);
            await loadInvoices();
          } else {
            console.error('Invoice generation failed:', result.error);
            setErrorMessage(result.error || 'Invoice generation failed');
          }
        }
      } catch (error) {
        console.error('Error generating invoice:', error);
        setErrorMessage(error.message || 'An error occurred while generating the invoice');
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleGenerateFromSelected = async () => {
    // Check if client is selected
    if (!filters.clientId) {
      setErrorMessage('Please select a client before generating an invoice.');
      return;
    }
    
    if (selectedEntries.length === 0) {
      setErrorMessage('Please select at least one time entry to invoice');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage('');
      const api = await waitForReady();
      if (api && api.invoices) {
        const result = await api.invoices.generateFromSelected({
          selectedEntryIds: selectedEntries,
          invoice_number: invoiceForm.invoice_number || undefined
        });
        
        if (result.success) {
          // Clear selections and reload data
          setSelectedEntries([]);
          setFilters({
            dateFrom: '',
            dateTo: '',
            clientId: '',
            projectId: '',
            taskId: ''
          });
          await loadInvoices();
          await loadTimeEntries();
          setActiveTab('generated'); // Switch to generated invoices tab
        } else {
          console.error('Invoice generation failed:', result.error);
          setErrorMessage(result.error || 'Invoice generation failed');
        }
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      setErrorMessage(error.message || 'An error occurred while generating the invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  // Add keyboard shortcuts to modal
  useModalKeyboard({
    isOpen: showModal,
    onClose: () => setShowModal(false),
    onSubmit: handleGenerateInvoice,
    formData: invoiceForm
  });

  const handleDownloadInvoice = async (invoiceId) => {
    console.log('[FRONTEND] handleDownloadInvoice called with invoiceId:', invoiceId);
    
    if (downloadingIds.has(invoiceId)) {
      console.log('[FRONTEND] Download already in progress for invoice:', invoiceId);
      return;
    }

    try {
      setDownloadingIds(prev => new Set([...prev, invoiceId]));
      console.log('[FRONTEND] Starting download for invoice:', invoiceId);
      
      const api = await waitForReady();
      if (api && api.invoices) {
        const result = await api.invoices.download(invoiceId);
        console.log('[FRONTEND] Download result:', result);
        
        if (!result.success) {
          console.error('[FRONTEND] Download failed:', result.error);
          alert('Download failed: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('[FRONTEND] Error downloading invoice:', error);
      alert('Failed to download invoice: ' + error.message);
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice? This will make the associated time entries available for invoicing again.')) {
      try {
        const api = await waitForReady();
        if (api && api.invoices) {
          await api.invoices.delete(invoiceId);
          await loadInvoices();
          await loadTimeEntries(); // Refresh to show uninvoiced entries again
        }
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice: ' + error.message);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getClientTimeEntries = (clientId) => {
    return timeEntries.filter(entry => entry.clientId === parseInt(clientId));
  };

  // Helper functions for date chips
  const setDateRange = (type) => {
    const today = new Date();
    let dateFrom, dateTo;

    switch (type) {
      case 'thisMonth':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        dateTo = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        dateTo = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last2Weeks':
        dateTo = new Date(today);
        dateFrom = new Date(today.getTime() - (14 * 24 * 60 * 60 * 1000));
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0]
    }));
  };

  // Table columns for time entries
  const tableColumns = [
    {
      header: 'Date',
      accessor: 'startTime',
      render: (entry) => new Date(entry.startTime).toLocaleDateString()
    },
    {
      header: 'Client',
      accessor: 'client',
      render: (entry) => entry.client?.name || 'No Client'
    },
    {
      header: 'Project',
      accessor: 'project',
      render: (entry) => entry.project?.name || 'No Project'
    },
    {
      header: 'Task',
      accessor: 'task',
      render: (entry) => entry.task?.name || 'No Task'
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (entry) => entry.description || 'No description'
    },
    {
      header: 'Duration',
      accessor: 'duration',
      render: (entry) => {
        const hours = ((entry.duration || 0) / 60).toFixed(2);
        return `${hours} hrs`;
      }
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (entry) => {
        const hours = (entry.duration || 0) / 60;
        const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
        return formatCurrency(hours * rate);
      }
    }
  ];

  const groupByDay = (entry) => {
    return new Date(entry.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const totalSelectedAmount = useMemo(() => {
    return filteredTimeEntries
      .filter(entry => selectedEntries.includes(entry.id))
      .reduce((total, entry) => {
        const hours = (entry.duration || 0) / 60;
        const rate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
        return total + (hours * rate);
      }, 0);
  }, [filteredTimeEntries, selectedEntries]);

  const totalSelectedHours = useMemo(() => {
    return filteredTimeEntries
      .filter(entry => selectedEntries.includes(entry.id))
      .reduce((total, entry) => total + (entry.duration || 0), 0) / 60;
  }, [filteredTimeEntries, selectedEntries]);

  return (
    <Container padding="40px" style={{ height: '100vh', overflowY: 'auto' }} data-testid="invoice-container">
      <FlexBox justify="space-between" align="center" margin="0 0 30px 0">
        <Title>Invoices</Title>
      </FlexBox>

      <TabContainer>
        <TabList>
          <Tab 
            $active={activeTab === 'create'} 
            onClick={() => setActiveTab('create')}
          >
            Create Invoice
          </Tab>
          <Tab 
            $active={activeTab === 'generated'} 
            onClick={() => setActiveTab('generated')}
          >
            Generated Invoices
          </Tab>
        </TabList>

        {/* Generated Invoices Tab */}
        <TabPanel $active={activeTab === 'generated'}>
          <FlexBox justify="space-between" align="center" margin="0 0 20px 0">
            <Heading>Your Invoices</Heading>
            <Button variant="primary" onClick={() => {
              const today = new Date();
              const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              
              setInvoiceForm({
                client_id: '',
                start_date: firstOfMonth.toISOString().split('T')[0],
                end_date: lastOfMonth.toISOString().split('T')[0],
                invoice_number: '',
                due_date: ''
              });
              setShowModal(true);
              setErrorMessage('');
            }}>
              <FileText size={16} />
              Quick Generate
            </Button>
          </FlexBox>

          {invoices.length === 0 ? (
            <EmptyState>
              <FileText size={48} />
              <h3>No Invoices</h3>
              <p>Generate your first invoice from your time entries</p>
            </EmptyState>
          ) : (
            <Grid columns="repeat(auto-fill, minmax(350px, 1fr))" gap="20px">
              {invoices.map(invoice => (
                <Card key={invoice.id} padding="20px">
                  <FlexBox justify="space-between" align="flex-start" margin="0 0 15px 0">
                    <div>
                      <Heading size="small" margin="0 0 5px 0">
                        Invoice #{invoice.invoiceNumber}
                      </Heading>
                      <Text variant="secondary">{invoice.client?.name || 'Unknown Client'}</Text>
                    </div>
                    <Text variant={invoice.status === 'generated' ? 'success' : 'warning'} size="small">
                      {invoice.status || 'pending'}
                    </Text>
                  </FlexBox>
                  
                  <FlexBox direction="column" gap="8px" margin="0 0 15px 0">
                    <FlexBox justify="space-between">
                      <Text size="small">Period:</Text>
                      <Text size="small">{invoice.periodStart} - {invoice.periodEnd}</Text>
                    </FlexBox>
                    <FlexBox justify="space-between">
                      <Text size="small">Amount:</Text>
                      <Text size="small" variant="success">{formatCurrency(invoice.totalAmount)}</Text>
                    </FlexBox>
                    <FlexBox justify="space-between">
                      <Text size="small">Due Date:</Text>
                      <Text size="small">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</Text>
                    </FlexBox>
                  </FlexBox>
                  
                  <FlexBox gap="10px">
                    <Button 
                      variant="danger" 
                      size="small" 
                      onClick={() => handleDeleteInvoice(invoice.id)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="small" 
                      style={{ flex: 1 }}
                      disabled={downloadingIds.has(invoice.id)}
                      onClick={() => handleDownloadInvoice(invoice.id)}
                    >
                      <Download size={14} />
                      {downloadingIds.has(invoice.id) ? 'Downloading...' : 'Download'}
                    </Button>
                  </FlexBox>
                </Card>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Create Invoice Tab */}
        <TabPanel $active={activeTab === 'create'}>
          <FlexBox direction="column" gap="24px">
            {/* Sticky Summary Bar */}
            {showStickyBar && filteredTimeEntries.length > 0 && (
              <StickyBar>
                <FlexBox justify="space-between" align="center">
                  <Text size="small" variant="secondary">
                    {selectedEntries.length} of {filteredTimeEntries.length} entries selected
                  </Text>
                  <FlexBox gap="20px">
                    <div>
                      <Text size="small" variant="secondary">Total Hours:</Text>
                      <Text weight="bold">{totalSelectedHours.toFixed(2)} hrs</Text>
                    </div>
                    <div>
                      <Text size="small" variant="secondary">Total Amount:</Text>
                      <Text weight="bold" variant="success">{formatCurrency(totalSelectedAmount)}</Text>
                    </div>
                  </FlexBox>
                </FlexBox>
              </StickyBar>
            )}
            
            {/* Filters Section */}
            <Card padding="20px" ref={filtersRef}>
              <Heading size="small" margin="0 0 20px 0">
                <Filter size={20} style={{ marginRight: '10px' }} />
                Filter Time Entries
              </Heading>
              
              {/* Date Range Filters */}
              <FlexBox direction="column" gap="15px">
                <FlexBox gap="10px" align="center" wrap>
                  <FlexBox direction="column" gap="5px" style={{ flex: 1, minWidth: '150px' }}>
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </FlexBox>
                  
                  <FlexBox direction="column" gap="5px" style={{ flex: 1, minWidth: '150px' }}>
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </FlexBox>
                  
                  <FlexBox direction="column" gap="5px">
                    <Label>Quick Filters</Label>
                    <ChipGroup>
                      <Chip onClick={() => setDateRange('thisMonth')}>
                        This Month
                      </Chip>
                      <Chip onClick={() => setDateRange('lastMonth')}>
                        Last Month
                      </Chip>
                      <Chip onClick={() => setDateRange('last2Weeks')}>
                        Last 2 Weeks
                      </Chip>
                    </ChipGroup>
                  </FlexBox>
                </FlexBox>

                {/* Client/Project/Task Filters */}
                <FlexBox gap="15px" wrap>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <ClientSelect
                      clients={clients}
                      value={filters.clientId}
                      onChange={(value) => setFilters(prev => ({ 
                        ...prev, 
                        clientId: value, 
                        projectId: '', 
                        taskId: '' 
                      }))}
                      label="Client"
                    />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <ProjectSelect
                      projects={projects}
                      value={filters.projectId}
                      onChange={(value) => setFilters(prev => ({ 
                        ...prev, 
                        projectId: value, 
                        taskId: '' 
                      }))}
                      label="Project"
                      clientId={filters.clientId}
                    />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <TaskSelect
                      tasks={tasks}
                      value={filters.taskId}
                      onChange={(value) => setFilters(prev => ({ 
                        ...prev, 
                        taskId: value 
                      }))}
                      label="Task"
                      projectId={filters.projectId}
                    />
                  </div>
                </FlexBox>
              </FlexBox>
            </Card>

            {/* Summary Card */}
            {filteredTimeEntries.length > 0 && (
              <Card padding="20px">
                <FlexBox justify="space-between" align="center">
                  <div>
                    <Text size="small" variant="secondary">
                      {selectedEntries.length} of {filteredTimeEntries.length} entries selected
                    </Text>
                    <FlexBox gap="20px" margin="8px 0 0 0">
                      <div>
                        <Text size="small" variant="secondary">Total Hours:</Text>
                        <Text weight="bold">{totalSelectedHours.toFixed(2)} hrs</Text>
                      </div>
                      <div>
                        <Text size="small" variant="secondary">Total Amount:</Text>
                        <Text weight="bold" variant="success">{formatCurrency(totalSelectedAmount)}</Text>
                      </div>
                    </FlexBox>
                  </div>
                  
                  <FlexBox gap="10px">
                    <FlexBox direction="column" gap="5px" style={{ minWidth: '150px' }}>
                      <Label>Invoice Number</Label>
                      <Input
                        value={invoiceForm.invoice_number}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                        placeholder="Auto-generated"
                        size="small"
                      />
                    </FlexBox>
                    
                    <Button 
                      variant="primary" 
                      onClick={handleGenerateFromSelected}
                      disabled={!filters.clientId || selectedEntries.length === 0 || isGenerating}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      <DollarSign size={16} />
                      {isGenerating ? 'Generating...' : 'Generate Invoice'}
                    </Button>
                  </FlexBox>
                </FlexBox>
              </Card>
            )}

            {/* Error Message */}
            {errorMessage && (
              <Card 
                padding="15px" 
                style={{ 
                  backgroundColor: '#dc2626', 
                  border: '1px solid #dc2626',
                  color: 'white'
                }}
              >
                <Text style={{ whiteSpace: 'pre-line' }}>{errorMessage}</Text>
              </Card>
            )}

            {/* Time Entries Table */}
            <Card padding="0">
              <DataTable
                data={filteredTimeEntries}
                columns={tableColumns}
                selectedItems={selectedEntries}
                onSelectionChange={setSelectedEntries}
                groupBy={groupByDay}
                emptyMessage="No uninvoiced time entries found. Adjust your filters or add some time entries first."
              />
            </Card>
          </FlexBox>
        </TabPanel>
      </TabContainer>

      {/* Quick Generate Invoice Modal */}
      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Quick Generate Invoice</ModalTitle>
              <ModalCloseButton onClick={() => setShowModal(false)}>×</ModalCloseButton>
            </ModalHeader>
            
            {errorMessage && (
              <FlexBox 
                style={{ 
                  backgroundColor: '#dc2626', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}
              >
                <Text style={{ whiteSpace: 'pre-line' }}>{errorMessage}</Text>
              </FlexBox>
            )}
            
            <FlexBox direction="column" gap="15px">
              <FlexBox direction="column" gap="5px">
                <Label>Client *</Label>
                <Select
                  value={invoiceForm.client_id}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, client_id: e.target.value }))}
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </Select>
                {invoiceForm.client_id && (
                  <Text size="small" variant="secondary">
                    {getClientTimeEntries(invoiceForm.client_id).length} time entries available
                  </Text>
                )}
              </FlexBox>
              
              <FlexBox gap="10px">
                <FlexBox direction="column" gap="5px" style={{ flex: 1 }}>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={invoiceForm.start_date}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </FlexBox>
                
                <FlexBox direction="column" gap="5px" style={{ flex: 1 }}>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={invoiceForm.end_date}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </FlexBox>
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Invoice Number</Label>
                <Input
                  value={invoiceForm.invoice_number}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="Auto-generated if empty"
                />
              </FlexBox>
              
              <FlexBox direction="column" gap="5px">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </FlexBox>
              
              <FlexBox gap="10px" justify="flex-end" style={{ marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleGenerateInvoice}
                  disabled={!invoiceForm.client_id || !invoiceForm.start_date || !invoiceForm.end_date || isGenerating}
                >
                  <DollarSign size={16} />
                  {isGenerating ? 'Generating...' : 'Generate Invoice'}
                </Button>
              </FlexBox>
            </FlexBox>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default Invoice;
