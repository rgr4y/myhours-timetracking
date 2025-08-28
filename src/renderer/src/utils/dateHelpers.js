/**
 * Date and time utility functions for the MyHours application
 */

/**
 * Format duration in minutes to HH:MM format
 */
export const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes)) return '0:00';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Format a date string or Date object to a readable date format
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'Invalid Date';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a timestamp to time format (HH:MM AM/PM)
 */
export const formatTime = (timeInput) => {
  if (!timeInput) return 'Invalid Time';
  
  try {
    const date = new Date(timeInput);
    if (isNaN(date.getTime())) return 'Invalid Time';
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
};

/**
 * Format a date/time for form inputs (HH:MM format)
 */
export const formatTimeForForm = (timeInput) => {
  if (!timeInput) return '';
  
  try {
    const date = new Date(timeInput);
    if (isNaN(date.getTime())) return '';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting time for form:', error);
    return '';
  }
};

/**
 * Format a date for form inputs (YYYY-MM-DD format)
 */
export const formatDateForForm = (dateInput) => {
  if (!dateInput) return '';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date for form:', error);
    return '';
  }
};

/**
 * Parse time string (HH:MM) and date to create a full timestamp
 */
export const parseTimeWithDate = (timeString, dateString) => {
  if (!timeString || !dateString) return null;
  
  try {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    const date = new Date(dateString);
    
    if (isNaN(date.getTime()) || isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing time with date:', error);
    return null;
  }
};

/**
 * Calculate duration between start and end times in minutes
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60))); // Convert to minutes
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
};
