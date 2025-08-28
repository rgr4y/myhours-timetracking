import styled from 'styled-components';

export const Dropdown = styled.div`
  position: relative;
  width: 100%;
`;

export const DropdownButton = styled.button`
  width: 100%;
  background: #404040;
  border: 1px solid #505050;
  border-radius: 8px;
  padding: 12px 15px;
  color: white;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: #505050;
  }
  
  &:focus {
    outline: none;
    border-color: #007AFF;
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #404040;
  border: 1px solid #505050;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

export const DropdownItem = styled.div`
  padding: 12px 15px;
  color: white;
  cursor: pointer;
  border-bottom: 1px solid #505050;
  transition: background-color 0.2s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #505050;
  }
  
  &.selected {
    background: #007AFF;
  }
`;

export const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

export const ModalContent = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'maxWidth'
})`
  background: #2a2a2a;
  border-radius: 12px;
  padding: 24px;
  max-width: ${props => props.maxWidth || '500px'};
  width: 90%;
  max-height: 90%;
  overflow-y: auto;
  border: 1px solid #404040;
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const ModalTitle = styled.h2`
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

export const ModalCloseButton = styled.button`
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  
  &:hover {
    color: white;
  }
`;
