import { useEffect } from 'react';

/**
 * Custom hook for handling keyboard shortcuts in modals
 * @param {Object} options - Options object
 * @param {boolean} options.isOpen - Whether the modal is open
 * @param {function} options.onClose - Function to call when Escape is pressed
 * @param {function} options.onSubmit - Function to call when Enter is pressed (optional)
 * @param {Object} options.formData - Form data to validate (optional)
 */
export const useModalKeyboard = ({ isOpen, onClose, onSubmit = null, formData = null }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (event) => {
      // Escape key - close modal
      if (event.key === 'Escape') {
        event.preventDefault();
        if (typeof onClose === 'function') {
          onClose();
        }
        return;
      }

      // Enter key - submit form if valid and input is focused
      if (event.key === 'Enter' && onSubmit && typeof onSubmit === 'function') {
        // Only submit if an input/textarea/select is focused
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT'
        );

        if (isInputFocused) {
          // Basic form validation - check if required fields are filled
          let canSubmit = true;
          if (formData) {
            // For client forms, name is required
            if (formData.name !== undefined && !formData.name.trim()) {
              canSubmit = false;
            }
            // For invoice forms, client_id, start_date, and end_date are required
            if (formData.client_id !== undefined && !formData.client_id) {
              canSubmit = false;
            }
            if (formData.start_date !== undefined && !formData.start_date) {
              canSubmit = false;
            }
            if (formData.end_date !== undefined && !formData.end_date) {
              canSubmit = false;
            }
          }

          if (canSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, onClose, onSubmit, formData]);
};

export default useModalKeyboard;
