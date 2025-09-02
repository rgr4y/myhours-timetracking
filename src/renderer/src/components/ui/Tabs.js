import styled from 'styled-components';
import { colors } from '../../styles/theme';

export const TabContainer = styled.div`
  width: 100%;
`;

export const TabList = styled.div`
  display: flex;
  border-bottom: 2px solid #404040;
  margin-bottom: 24px;
`;

export const Tab = styled.button`
  background: none;
  border: none;
  color: ${props => props.$active ? colors.primary : '#999'};
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 24px;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.$active ? colors.primary : '#ccc'};
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props => props.$active ? colors.primary : 'transparent'};
    transition: background 0.2s ease;
  }
`;

export const TabPanel = styled.div`
  display: ${props => props.$active ? 'block' : 'none'};
`;

export const Chip = styled.button`
  background: ${props => props.$active ? colors.primary : colors.secondary};
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$active ? colors.primaryHover : colors.secondaryHover};
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
