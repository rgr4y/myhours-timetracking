import styled from 'styled-components';

export const Input = styled.input`
  background: #404040;
  border: 1px solid #505050;
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-size: 14px;
  width: 100%;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #007AFF;
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
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #007AFF;
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
    border-color: #007AFF;
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
