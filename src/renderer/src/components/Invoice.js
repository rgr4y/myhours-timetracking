import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, DollarSign, Trash2 } from 'lucide-react';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
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
  EmptyState
} from './ui';

const Invoice = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { waitForReady } = useElectronAPI();

  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    start_date: '',
    end_date: '',
    invoice_number: '',
    due_date: ''
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

  const handleGenerateInvoice = async () => {
    if (invoiceForm.client_id && invoiceForm.start_date && invoiceForm.end_date) {
      try {
        setIsGenerating(true);
        setErrorMessage(''); // Clear previous errors
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

  // Add keyboard shortcuts to modal
  useModalKeyboard({
    isOpen: showModal,
    onClose: () => setShowModal(false), // Close on Escape
    onSubmit: handleGenerateInvoice, // Submit on Enter
    formData: invoiceForm // Pass form data for validation
  });

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const api = await waitForReady();
      if (api && api.invoices) {
        await api.invoices.download(invoiceId);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice? All associated time entries will become available for invoicing again.')) {
      try {
        const api = await waitForReady();
        if (api && api.invoices) {
          await api.invoices.delete(invoiceId);
          await loadInvoices(); // Reload the invoice list
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

  return (
    <Container padding="40px" style={{ height: '100vh', overflowY: 'auto' }}>
      <FlexBox justify="space-between" align="center" margin="0 0 30px 0">
        <Title>Invoices</Title>
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
          setErrorMessage(''); // Clear any previous errors
        }}>
          <FileText size={16} />
          Generate Invoice
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
                <Text variant={invoice.status === 'paid' ? 'success' : 'warning'} size="small">
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
                  onClick={() => handleDownloadInvoice(invoice.id)}
                >
                  <Download size={14} />
                  Download
                </Button>
              </FlexBox>
            </Card>
          ))}
        </Grid>
      )}

      {/* Generate Invoice Modal */}
      {showModal && (
        <Modal onClick={() => setShowModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Generate Invoice</ModalTitle>
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
