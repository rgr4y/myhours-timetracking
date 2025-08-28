import styled from 'styled-components';

export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size', 'alignSelf', 'active'].includes(prop)
})`
  background: ${props => {
    if (props.variant === 'primary') return '#007AFF';
    if (props.variant === 'secondary') return '#404040';
    if (props.variant === 'danger') return '#FF3B30';
    if (props.variant === 'success') return '#34C759';
    return '#404040';
  }};
  border: none;
  border-radius: 8px;
  padding: ${props => {
    if (props.size === 'small') return '8px 16px';
    if (props.size === 'large') return '15px 30px';
    return '12px 24px';
  }};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${props => props.size === 'small' ? '13px' : '14px'};
  font-weight: 500;
  transition: all 0.2s ease;
  align-self: ${props => props.alignSelf || 'auto'};
  
  &:hover {
    background: ${props => {
      if (props.variant === 'primary') return '#0056CC';
      if (props.variant === 'secondary') return '#505050';
      if (props.variant === 'danger') return '#D70015';
      if (props.variant === 'success') return '#248A3D';
      return '#505050';
    }};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const IconButton = styled(Button)`
  padding: ${props => props.size === 'small' ? '6px' : '10px'};
  min-width: auto;
  width: auto;
`;
