import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';
import { colors } from '../../styles/theme';

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
`;

const ToastItem = styled.div`
  background: ${props => {
    switch (props.variant) {
      case 'success': return colors.success;
      case 'error': return colors.danger;
      case 'warning': return '#ff9500';
      case 'info': return colors.primary;
      default: return colors.secondary;
    }
  }};
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  cursor: pointer;
  animation: ${props => props.$isExiting ? slideOut : slideIn} 0.3s ease-in-out;
  
  &:hover {
    opacity: 0.9;
  }
`;

const ToastIcon = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const ToastContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ToastTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const ToastMessage = styled.div`
  font-size: 13px;
  opacity: 0.9;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
`;

// Toast context and provider
const ToastContext = React.createContext();

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = ++toastId;
    const newToast = { id, ...toast };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isExiting: true } : toast
    ));
    
    // Remove from DOM after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  };

  const getIcon = (variant) => {
    switch (variant) {
      case 'success': return <CheckCircle size={16} />;
      case 'error': return <AlertCircle size={16} />;
      case 'warning': return <AlertCircle size={16} />;
      case 'info': return <Info size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            variant={toast.variant}
            $isExiting={toast.isExiting}
            onClick={() => removeToast(toast.id)}
          >
            <ToastIcon>
              {getIcon(toast.variant)}
            </ToastIcon>
            <ToastContent>
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              <ToastMessage>{toast.message}</ToastMessage>
            </ToastContent>
            <CloseButton onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}>
              <X size={14} />
            </CloseButton>
          </ToastItem>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
