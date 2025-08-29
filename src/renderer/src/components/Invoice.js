import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, DollarSign } from 'lucide-react';
import { useElectronAPI } from '../hooks/useElectronAPI';
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
          }
        }
      } catch (error) {
        console.error('Error generating invoice:', error);
      } finally {
        setIsGenerating(false);
      }
    }
  };

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

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown Client';
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
        <Button variant="primary" onClick={() => setShowModal(true)}>
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
                    Invoice #{invoice.invoice_number}
                  </Heading>
                  <Text variant="secondary">{getClientName(invoice.client_id)}</Text>
                </div>
                <Text variant={invoice.status === 'paid' ? 'success' : 'warning'} size="small">
                  {invoice.status || 'pending'}
                </Text>
              </FlexBox>
              
              <FlexBox direction="column" gap="8px" margin="0 0 15px 0">
                <FlexBox justify="space-between">
                  <Text size="small">Period:</Text>
                  <Text size="small">{invoice.period_start} - {invoice.period_end}</Text>
                </FlexBox>
                <FlexBox justify="space-between">
                  <Text size="small">Amount:</Text>
                  <Text size="small" variant="success">{formatCurrency(invoice.total_amount)}</Text>
                </FlexBox>
                <FlexBox justify="space-between">
                  <Text size="small">Due Date:</Text>
                  <Text size="small">{invoice.due_date}</Text>
                </FlexBox>
              </FlexBox>
              
              <FlexBox gap="10px">
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
