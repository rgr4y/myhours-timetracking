import styled from 'styled-components';
import { colors } from '../../styles/theme';

export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size', 'alignSelf', 'active'].includes(prop)
})`
  background: ${props => {
    if (props.variant === 'primary') return colors.primary;
    if (props.variant === 'secondary') return colors.secondary;
    if (props.variant === 'danger') return colors.danger;
    if (props.variant === 'success') return colors.success;
    return colors.secondary;
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
      if (props.variant === 'primary') return colors.primaryHover;
      if (props.variant === 'secondary') return colors.secondaryHover;
      if (props.variant === 'danger') return colors.dangerHover;
      if (props.variant === 'success') return colors.successHover;
      return colors.secondaryHover;
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
