import React from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import {
  Grid,
  Card,
  FlexBox,
  Heading,
  Text,
  Button,
  EmptyState
} from './ui';

const GeneratedInvoices = ({
  invoices,
  setInvoiceForm,
  setShowModal,
  setErrorMessage,
  handleDownloadInvoice,
  handleDeleteInvoice,
  downloadingIds,
  formatCurrency
}) => {
  const handleQuickGenerate = () => {
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
  };

  return (
    <>
      <FlexBox justify="space-between" align="center" margin="0 0 20px 0">
        <Heading>Your Invoices</Heading>
        <Button variant="primary" onClick={handleQuickGenerate}>
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
    </>
  );
};

export default GeneratedInvoices;
