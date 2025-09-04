import styled from 'styled-components';
import { transitions, colors } from '../../styles/theme';

export const Input = styled.input`
  background: #404040;
  border: 1px solid #505050;
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-size: 14px;
  width: 100%;
  transition: border-color ${transitions.base};
  
  &:focus {
    outline: none;
    border-color: #B91C1C;
  }
  
  &::placeholder {
    color: #999;
  }
`;

export const Select = styled.select`
  background: #404040;
  border: 1px solid #505050;
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-size: 14px;
  width: 100%;
  cursor: pointer;
  transition: border-color ${transitions.base};
  
  &:focus {
    outline: none;
    border-color: #B91C1C;
  }
  
  option {
    background: #404040;
    color: white;
  }
`;

export const TextArea = styled.textarea`
  background: #404040;
  border: 1px solid #505050;
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-size: 14px;
  width: 100%;
  min-height: 100px;
  resize: vertical;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #B91C1C;
  }
  
  &::placeholder {
    color: #999;
  }
`;

export const Label = styled.label`
  color: #ccc;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  display: block;
`;

export const Chip = styled.button`
  background: ${props => {
    if (props.variant === 'active' || props.$active) return colors.primary;
    return colors.secondary;
  }};
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  transition: all ${transitions.base};
  
  &:hover {
    background: ${props => {
      if (props.variant === 'active' || props.$active) return colors.primaryHover;
      return colors.secondaryHover;
    }};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ChipGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;
