import React from 'react';
import styled from 'styled-components';
import { colors } from '../../styles/theme';
import { FlexBox } from './Layout';
import { Text } from './Typography';

const TableContainer = styled.div`
  border: 1px solid #404040;
  border-radius: 8px;
  overflow: hidden;
  background: #2a2a2a;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: #333;
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  color: #ccc;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #404040;
  
  &:first-child {
    width: 40px;
  }
`;

const TableBody = styled.tbody``;

const TableCell = styled.td`
  padding: 12px 16px;
  color: white;
  font-size: 14px;
  vertical-align: middle;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #404040;
  transition: background-color 0.2s ease;
  
  /* Conventional zebra striping with grays */
  &:nth-child(even) {
    background: rgba(255, 255, 255, 0.03); /* Very subtle light gray */
  }
  
  &:nth-child(odd) {
    background: rgba(0, 0, 0, 0.1); /* Very subtle dark gray */
  }
  
  &:hover {
    background: #404040 !important;
    color: white !important;
    
    ${TableCell} {
      color: white !important;
    }
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const GroupHeader = styled.div`
  background: linear-gradient(145deg, #793333ff 0%, #5e1313ff 100%);
  padding: 16px 20px;
  font-weight: 700;
  font-size: 0.95em;
  color: white;
  border-bottom: 2px solid #B91C1C;
  border-top: 1px solid #B91C1C;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(185, 28, 28, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: ${colors.primary};
  cursor: pointer;
`;

export const DataTable = ({ 
  data = [], 
  columns = [], 
  selectedItems = [], 
  onSelectionChange = () => {},
  groupBy = null,
  emptyMessage = "No data available" 
}) => {
  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = data.map(item => item.id);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleSelectGroup = (groupItems, checked) => {
    const groupIds = groupItems.map(item => item.id);
    if (checked) {
      // Add all group items to selection
      const newSelection = [...new Set([...selectedItems, ...groupIds])];
      onSelectionChange(newSelection);
    } else {
      // Remove all group items from selection
      const newSelection = selectedItems.filter(id => !groupIds.includes(id));
      onSelectionChange(newSelection);
    }
  };

  const allSelected = data.length > 0 && selectedItems.length === data.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < data.length;

  // Group data if groupBy is specified
  const groupedData = React.useMemo(() => {
    if (!groupBy) return { '': data };
    
    const groups = data.reduce((acc, item) => {
      const key = groupBy(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    
    // Sort groups by date if they look like dates
    const sortedGroups = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Try to parse as dates first
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA - dateB;
      }
      
      // Check if the keys contain date-like patterns
      const datePatternA = a.match(/(\w+day,\s+\w+\s+\d+,\s+\d+)/);
      const datePatternB = b.match(/(\w+day,\s+\w+\s+\d+,\s+\d+)/);
      
      if (datePatternA && datePatternB) {
        return new Date(datePatternA[1]) - new Date(datePatternB[1]);
      }
      
      // Fall back to string comparison
      return a.localeCompare(b);
    });
    
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [data, groupBy]);

  if (data.length === 0) {
    return (
      <TableContainer>
        <FlexBox justify="center" align="center" style={{ padding: '40px' }}>
          <Text variant="secondary">{emptyMessage}</Text>
        </FlexBox>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <tr>
            <TableHeaderCell>
              <Checkbox
                checked={allSelected}
                ref={input => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </TableHeaderCell>
            {columns.map((column, index) => (
              <TableHeaderCell key={index}>
                {column.header}
              </TableHeaderCell>
            ))}
          </tr>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedData).map(([groupKey, groupItems]) => {
            // Calculate group selection state
            const groupIds = groupItems.map(item => item.id);
            const selectedInGroup = groupIds.filter(id => selectedItems.includes(id));
            const allGroupSelected = selectedInGroup.length === groupIds.length && groupIds.length > 0;
            const someGroupSelected = selectedInGroup.length > 0 && selectedInGroup.length < groupIds.length;
            
            return (
              <React.Fragment key={groupKey}>
                {groupKey && (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ padding: 0 }}>
                      <GroupHeader>
                        <Checkbox
                          checked={allGroupSelected}
                          ref={input => {
                            if (input) input.indeterminate = someGroupSelected;
                          }}
                          onChange={(e) => handleSelectGroup(groupItems, e.target.checked)}
                        />
                        {groupKey}
                      </GroupHeader>
                    </td>
                  </tr>
                )}
                {groupItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      />
                    </TableCell>
                    {columns.map((column, index) => (
                      <TableCell key={index}>
                        {column.render ? column.render(item) : item[column.accessor]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
