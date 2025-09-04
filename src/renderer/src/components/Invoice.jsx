import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign } from 'lucide-react';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import {
  Container,
  FlexBox,
  Title,
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
  TabContainer,
  TabList,
  Tab,
  TabPanel,
  LoadingOverlay
} from './ui';
import { useToast } from './ui/Toast';
import CreateInvoice from './Invoice.CreateInvoice';
import GeneratedInvoices from './Invoice.GeneratedInvoices';

const Invoice = () => {
  const [activeTab, setActiveTab] = useState('create');
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
  const [viewingIds, setViewingIds] = useState(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  
  // Loading states for initial data
  const [loadingStates, setLoadingStates] = useState({
    invoices: true,
    clients: true,
    timeEntries: true,
    filtering: false // Add filtering loading state
  });
  
  const { waitForReady } = useElectronAPI();
  const { addToast } = useToast();

  // Check if all data has been loaded
  const isInitialLoading = Object.values(loadingStates).some(loading => loading);

  // Invoice generation form state
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    start_date: '',
    end_date: '',
    invoice_number: '',
    due_date: ''
  });

  // Filtering state for the create tab
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    clientId: '',
    projectId: '',
    taskId: ''
  });

  const loadInvoices = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, invoices: true }));
      const api = await waitForReady();
      if (api && api.invoices) {
        const invoiceList = await api.invoices.getAll();
        setInvoices(invoiceList);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, invoices: false }));
    }
  }, [waitForReady]);

  const loadClients = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, clients: true }));
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
    } finally {
      setLoadingStates(prev => ({ ...prev, clients: false }));
    }
  }, [waitForReady]);

  const loadTimeEntries = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, timeEntries: true }));
      const api = await waitForReady();
      if (api && api.timeEntries) {
        const entries = await api.timeEntries.getAll();
        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Error loading time entries:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, timeEntries: false }));
    }
  }, [waitForReady]);

  const refreshTimeEntriesForFilters = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, filtering: true }));
      const api = await waitForReady();
      if (api && api.timeEntries) {
        const entries = await api.timeEntries.getAll();
        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Error refreshing time entries:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, filtering: false }));
    }
  }, [waitForReady]);

  useEffect(() => {
    loadInvoices();
    loadClients();
    loadTimeEntries();
  }, [loadInvoices, loadClients, loadTimeEntries]);

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
            
            // Show success toast and open invoice
            addToast({
              variant: 'success',
              title: 'Invoice Generated!',
              message: 'Your invoice has been successfully created and saved.',
              duration: 4000
            });
            
            // Open the invoice if available
            if (result.invoiceId) {
              setTimeout(() => {
                handleDownloadInvoice(result.invoiceId);
              }, 500);
            }
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
          // Clear selections and reset filters
          setSelectedEntries([]);
          setFilters({
            dateFrom: '',
            dateTo: '',
            clientId: '',
            projectId: '',
            taskId: ''
          });
          sessionStorage.removeItem('invoiceFilters');
          
          await loadInvoices();
          await loadTimeEntries();
          setActiveTab('generated'); // Switch to generated invoices tab
          
          // Show success toast and open invoice
          addToast({
            variant: 'success',
            title: 'Invoice Generated!',
            message: 'Your invoice has been successfully created and saved.',
            duration: 4000
          });
          
          // Open the invoice if available
          if (result.invoiceId) {
            setTimeout(() => {
              handleDownloadInvoice(result.invoiceId);
            }, 500);
          }
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
        
        if (result.success) {
          // Show success toast
          addToast({
            variant: 'success',
            title: 'Download Complete!',
            message: 'Invoice has been downloaded successfully.',
            duration: 3000
          });
        } else {
          console.error('[FRONTEND] Download failed:', result.error);
          addToast({
            variant: 'error',
            title: 'Download Failed',
            message: result.error || 'Unknown error occurred during download.',
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error('[FRONTEND] Error downloading invoice:', error);
      addToast({
        variant: 'error',
        title: 'Download Error',
        message: 'Failed to download invoice: ' + error.message,
        duration: 5000
      });
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
          
          addToast({
            variant: 'success',
            title: 'Invoice Deleted',
            message: 'Invoice has been deleted and time entries are now available for invoicing.',
            duration: 4000
          });
        }
      } catch (error) {
        console.error('Error deleting invoice:', error);
        addToast({
          variant: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete invoice: ' + error.message,
          duration: 5000
        });
      }
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    console.log('[FRONTEND] handleViewInvoice called with invoiceId:', invoiceId);
    
    if (viewingIds.has(invoiceId)) {
      console.log('[FRONTEND] View already in progress for invoice:', invoiceId);
      return;
    }

    try {
      setViewingIds(prev => new Set([...prev, invoiceId]));
      console.log('[FRONTEND] Starting view for invoice:', invoiceId);
      
      const api = await waitForReady();
      if (api && api.invoices) {
        const result = await api.invoices.view(invoiceId);
        console.log('[FRONTEND] View result:', JSON.stringify(result));
        
        if (result.success) {
          // Show success toast
          addToast({
            variant: 'success',
            title: 'Invoice Opened!',
            message: 'Invoice is now open in a new window.',
            duration: 3000
          });
        } else {
          console.error('[FRONTEND] View failed:', result.error);
          addToast({
            variant: 'error',
            title: 'View Failed',
            message: result.error || 'Unknown error occurred during view.',
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error('[FRONTEND] Error viewing invoice:', error);
      addToast({
        variant: 'error',
        title: 'View Error',
        message: 'Failed to open invoice: ' + error.message,
        duration: 5000
      });
    } finally {
      setViewingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  };

  const handleRegenerateInvoice = async (invoiceId) => {
    console.log('[FRONTEND] handleRegenerateInvoice called with invoiceId:', invoiceId);
    
    if (regeneratingIds.has(invoiceId)) {
      console.log('[FRONTEND] Regenerate already in progress for invoice:', invoiceId);
      return;
    }

    if (window.confirm('Are you sure you want to regenerate this invoice? This will void the current invoice and create a new one with current data.')) {
      try {
        setRegeneratingIds(prev => new Set([...prev, invoiceId]));
        console.log('[FRONTEND] Starting regenerate for invoice:', invoiceId);
        
        const api = await waitForReady();
        if (api && api.invoices) {
          const result = await api.invoices.regenerate(invoiceId);
          console.log('[FRONTEND] Regenerate result:', result);
          
          if (result.success) {
            // Refresh invoices list and time entries
            await loadInvoices();
            await loadTimeEntries();
            
            // Show success toast
            addToast({
              variant: 'success',
              title: 'Invoice Regenerated!',
              message: 'Invoice has been regenerated with current data.',
              duration: 4000
            });
          } else {
            console.error('[FRONTEND] Regenerate failed:', result.error);
            addToast({
              variant: 'error',
              title: 'Regenerate Failed',
              message: result.error || 'Unknown error occurred during regeneration.',
              duration: 5000
            });
          }
        }
      } catch (error) {
        console.error('[FRONTEND] Error regenerating invoice:', error);
        addToast({
          variant: 'error',
          title: 'Regenerate Error',
          message: 'Failed to regenerate invoice: ' + error.message,
          duration: 5000
        });
      } finally {
        setRegeneratingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(invoiceId);
          return newSet;
        });
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
          <GeneratedInvoices
            invoices={invoices}
            setInvoiceForm={setInvoiceForm}
            setShowModal={setShowModal}
            setErrorMessage={setErrorMessage}
            handleDownloadInvoice={handleDownloadInvoice}
            handleViewInvoice={handleViewInvoice}
            handleRegenerateInvoice={handleRegenerateInvoice}
            handleDeleteInvoice={handleDeleteInvoice}
            downloadingIds={downloadingIds}
            viewingIds={viewingIds}
            regeneratingIds={regeneratingIds}
            formatCurrency={formatCurrency}
          />
        </TabPanel>

        {/* Create Invoice Tab */}
        <TabPanel $active={activeTab === 'create'}>
          <CreateInvoice
            clients={clients}
            projects={projects}
            tasks={tasks}
            timeEntries={timeEntries}
            filters={filters}
            setFilters={setFilters}
            filteredTimeEntries={filteredTimeEntries}
            setFilteredTimeEntries={setFilteredTimeEntries}
            selectedEntries={selectedEntries}
            setSelectedEntries={setSelectedEntries}
            invoiceForm={invoiceForm}
            setInvoiceForm={setInvoiceForm}
            handleGenerateFromSelected={handleGenerateFromSelected}
            isGenerating={isGenerating}
            errorMessage={errorMessage}
            formatCurrency={formatCurrency}
            refreshTimeEntriesForFilters={refreshTimeEntriesForFilters}
            isFiltering={loadingStates.filtering}
          />
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
      
      {/* Loading overlay for initial data loading */}
      <LoadingOverlay 
        isVisible={isInitialLoading} 
        text="Loading invoice data..."
      />
    </Container>
  );
};

export default Invoice;
