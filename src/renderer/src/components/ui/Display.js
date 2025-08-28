import styled from 'styled-components';

export const StatusBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== 'status'
})`
  background: ${props => {
    if (props.status === 'active') return '#34C759';
    if (props.status === 'inactive') return '#8E8E93';
    if (props.status === 'warning') return '#FF9500';
    if (props.status === 'error') return '#FF3B30';
    return '#8E8E93';
  }};
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const IconContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['size', 'rounded', 'background', 'margin'].includes(prop)
})`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  border-radius: ${props => props.rounded ? '50%' : '8px'};
  background: ${props => props.background || '#007AFF'};
  color: white;
  margin: ${props => props.margin || '0'};
`;

export const TableContainer = styled.div`
  background: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #404040;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableHeader = styled.thead`
  background: #1a1a1a;
`;

export const TableHeaderCell = styled.th`
  padding: 16px;
  color: #ccc;
  font-weight: 600;
  text-align: left;
  border-bottom: 1px solid #404040;
  font-size: 14px;
`;

export const TableRow = styled.tr`
  border-bottom: 1px solid #404040;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: #333;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

export const TableCell = styled.td`
  padding: 16px;
  color: white;
  font-size: 14px;
  vertical-align: middle;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;
  
  h3 {
    color: #ccc;
    margin-bottom: 8px;
    font-size: 18px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;
