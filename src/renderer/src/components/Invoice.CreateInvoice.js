import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, DollarSign, RotateCcw, Download, FileText } from 'lucide-react';
import styled from 'styled-components';
import { useDebounce } from '../hooks/useDebounce';
import {
  Card,
  FlexBox,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Chip,
  ChipGroup,
  ClientSelect,
  ProjectSelect,
  TaskSelect,
  DataTable,
  LoadingOverlay
} from './ui';

// Styled component for sticky summary bar
const StickyBar = styled.div`
  position: sticky;
  top: -24px;
  z-index: 100;
  background: linear-gradient(145deg, #7f1d1d 0%, #4d1414ff 100%);
  border: 1px solid #624f4fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);
`;

// Enhanced Summary Card
const SummaryCard = styled(Card)`
  background: linear-gradient(145deg, #7f1d1d 0%, #4d1414ff 100%);
  color: white;
  border: 1px solid #7F1D1D;
  box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);

  ${Text} {
    color: white !important;

    &[data-variant="secondary"] {
      color: rgba(255, 255, 255, 0.8) !important;
    }

    &[data-variant="success"] {
      color: #10b981 !important;
      font-weight: 600;
    }
  }
`;

// Export Toolbox
const ExportToolbox = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #404040;
  border-radius: 6px;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #007AFF;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 122, 255, 0.1);
    color: #0056b3;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CreateInvoice = ({
  clients,
  projects,
  tasks,
  timeEntries,
  filters,
  setFilters,
  filteredTimeEntries,
  setFilteredTimeEntries,
  selectedEntries,
  setSelectedEntries,
  invoiceForm,
  setInvoiceForm,
  handleGenerateFromSelected,
  isGenerating,
  errorMessage,
  formatCurrency,
  refreshTimeEntriesForFilters,
  isFiltering
}) => {
  const [showStickyBar, setShowStickyBar] = useState(false);
  const filtersRef = useRef(null);

  // Load filters from sessionStorage on mount
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('invoiceFilters');
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(parsedFilters);
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }
  }, [setFilters]);

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    if (filters.dateFrom || filters.dateTo || filters.clientId || filters.projectId || filters.taskId) {
      sessionStorage.setItem('invoiceFilters', JSON.stringify(filters));
    }
  }, [filters]);

  // Refresh time entries when client changes
  useEffect(() => {
    if (filters.clientId && refreshTimeEntriesForFilters) {
      refreshTimeEntriesForFilters();
    }
  }, [filters.clientId, refreshTimeEntriesForFilters]);

  // Add scroll detection for sticky bar
  useEffect(() => {
    const handleScroll = () => {
      if (filtersRef.current) {
        const rect = filtersRef.current.getBoundingClientRect();
        setShowStickyBar(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
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
  }, []);

  // Filter time entries based on current filters
  useEffect(() => {
    let filtered = filters.showInvoicedOnly 
      ? timeEntries.filter(entry => entry.isInvoiced)
      : timeEntries.filter(entry => !entry.isInvoiced);
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(entry => new Date(entry.startTime) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => new Date(entry.startTime) <= toDate);
    }
    
    if (filters.clientId) {
      filtered = filtered.filter(entry => entry.clientId === parseInt(filters.clientId));
    }
    
    if (filters.projectId) {
      filtered = filtered.filter(entry => entry.projectId === parseInt(filters.projectId));
    }
    
    if (filters.taskId) {
      filtered = filtered.filter(entry => entry.taskId === parseInt(filters.taskId));
    }
    
    setFilteredTimeEntries(filtered);
    
    const visibleIds = filtered.map(entry => entry.id);
    setSelectedEntries(prev => prev.filter(id => visibleIds.includes(id)));
  }, [timeEntries, filters, setFilteredTimeEntries, setSelectedEntries]);

  // Auto-select client when all selected entries have the same client
  const autoSelectClient = useDebounce((selectedEntryIds, timeEntries, currentClientId) => {
    // Only auto-select if no client is currently selected
    if (currentClientId) return;
    
    // Only proceed if we have selected entries
    if (!selectedEntryIds || selectedEntryIds.length === 0) return;
    
    // Get the selected time entries
    const selectedTimeEntries = timeEntries.filter(entry => selectedEntryIds.includes(entry.id));
    
    // Check if all selected entries have the same client
    const clientIds = [...new Set(selectedTimeEntries.map(entry => entry.clientId))];
    
    // If all entries have the same client, auto-select it
    if (clientIds.length === 1 && clientIds[0]) {
      console.log('[AUTO-SELECT] Auto-selecting client:', clientIds[0]);
      setFilters(prev => ({ 
        ...prev, 
        clientId: clientIds[0].toString(),
        projectId: '', // Reset project when client changes
        taskId: '' // Reset task when client changes
      }));
    }
  }, 300); // 300ms debounce

  // Watch for changes in selected entries to trigger auto-client selection
  useEffect(() => {
    autoSelectClient(selectedEntries, timeEntries, filters.clientId);
  }, [selectedEntries, timeEntries, filters.clientId, autoSelectClient]);

  // Reset filters function
  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      clientId: '',
      projectId: '',
      taskId: '',
      showInvoicedOnly: false
    });
    sessionStorage.removeItem('invoiceFilters');
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

  // Export functions
  const exportToCSV = async () => {
    if (window.electronAPI) {
      try {
        // Create filters object for the selected entries
        const exportFilters = {
          ids: selectedEntries.length > 0 ? selectedEntries : filteredTimeEntries.map(e => e.id)
        };
        await window.electronAPI.export.csv(exportFilters);
      } catch (error) {
        console.error('Error exporting to CSV:', error);
      }
    }
  };

  const exportToJSON = async () => {
    if (window.electronAPI) {
      try {
        // Create filters object for the selected entries
        const exportFilters = {
          ids: selectedEntries.length > 0 ? selectedEntries : filteredTimeEntries.map(e => e.id)
        };
        await window.electronAPI.export.json(exportFilters);
      } catch (error) {
        console.error('Error exporting to JSON:', error);
      }
    }
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.clientId || filters.projectId || filters.taskId || filters.showInvoicedOnly;

  return (
    <FlexBox direction="column" gap="24px">
      {/* Sticky Summary Bar */}
      {showStickyBar && filteredTimeEntries.length > 0 && (
        <StickyBar>
          <FlexBox justify="space-between" align="center">
            <Text size="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              {selectedEntries.length} of {filteredTimeEntries.length} entries selected
            </Text>
            <FlexBox gap="20px">
              <div>
                <Text size="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Total Hours:</Text>
                <Text weight="bold" style={{ color: 'white' }}>{totalSelectedHours.toFixed(2)} hrs</Text>
              </div>
              <div>
                <Text size="small" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Total Amount:</Text>
                <Text weight="bold" style={{ color: '#10b981' }}>{formatCurrency(totalSelectedAmount)}</Text>
              </div>
            </FlexBox>
          </FlexBox>
        </StickyBar>
      )}
      
      {/* Filters Section */}
      <Card padding="20px" ref={filtersRef}>
        <FlexBox justify="space-between" align="center" margin="0 0 20px 0">
          <Heading size="small">
            <Filter size={20} style={{ marginRight: '10px' }} />
            Filter Time Entries
          </Heading>
          <FlexBox gap="10px" align="center">
            {/* Export Toolbox */}
            <ExportToolbox>
              <Text size="small" style={{ color: '#888', marginRight: '8px' }}>Export:</Text>
              <ExportButton 
                onClick={exportToCSV}
                title="Export to CSV"
                disabled={filteredTimeEntries.length === 0}
              >
                <FileText size={16} />
              </ExportButton>
              <ExportButton 
                onClick={exportToJSON}
                title="Export to JSON"
                disabled={filteredTimeEntries.length === 0}
              >
                <Download size={16} />
              </ExportButton>
            </ExportToolbox>
            {hasActiveFilters && (
              <Button variant="secondary" size="small" onClick={resetFilters}>
                <RotateCcw size={16} />
                Reset Filters
              </Button>
            )}
          </FlexBox>
        </FlexBox>
        
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
                <Chip 
                  onClick={() => setFilters(prev => ({ ...prev, showInvoicedOnly: !prev.showInvoicedOnly }))}
                  variant={filters.showInvoicedOnly ? 'active' : 'default'}
                >
                  Invoiced
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
        <SummaryCard padding="20px">
          <FlexBox justify="space-between" align="center">
            <div>
              <Text size="small" data-variant="secondary">
                {selectedEntries.length} of {filteredTimeEntries.length} entries selected
              </Text>
              <FlexBox gap="20px" margin="8px 0 0 0">
                <div>
                  <Text size="small" data-variant="secondary">Total Hours:</Text>
                  <Text weight="bold">{totalSelectedHours.toFixed(2)} hrs</Text>
                </div>
                <div>
                  <Text size="small" data-variant="secondary">Total Amount:</Text>
                  <Text weight="bold" data-variant="success">{formatCurrency(totalSelectedAmount)}</Text>
                </div>
              </FlexBox>
            </div>
            
            <FlexBox gap="10px">
              <FlexBox direction="column" gap="5px" style={{ minWidth: '150px' }}>
                <Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Invoice Number</Label>
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
                disabled={!filters.clientId || selectedEntries.length === 0 || isGenerating || filters.showInvoicedOnly}
                style={{ alignSelf: 'flex-end' }}
              >
                <DollarSign size={16} />
                {isGenerating ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </FlexBox>
          </FlexBox>
        </SummaryCard>
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
      
      {/* Loading overlay for filter changes */}
      <LoadingOverlay 
        isVisible={isFiltering} 
        text="Refreshing time entries..."
      />
    </FlexBox>
  );
};

export default CreateInvoice;
