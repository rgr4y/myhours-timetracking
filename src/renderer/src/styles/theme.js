/**
 * Central theme configuration for myHours application
 * Contains all color definitions, typography, spacing, and other design tokens
 * Used throughout the application for consistent styling
 */

// Color palette
export const colors = {
  // Primary brand colors
  primary: '#007AFF',
  primaryHover: '#0056CC',
  
  // Secondary colors
  secondary: '#404040',
  secondaryHover: '#505050',
  
  // Status colors
  success: '#34C759',
  successHover: '#248A3D',
  danger: '#FF3B30',
  dangerHover: '#D70015',
  warning: '#FF9500',
  info: '#007AFF',
  
  // Background colors
  bgPrimary: '#1a1a1a',
  bgSecondary: '#2a2a2a',
  bgActive: '#1a1a2e',
  bgInactive: '#2a2a2a',
  bgOverlay: 'rgba(0, 0, 0, 0.8)',
  
  // Border colors
  borderDefault: '#404040',
  borderDark: '#333',
  borderLight: '#505050',
  
  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#888',
  textMuted: '#666',
  
  // Specific component colors
  timerBorder: '#404040',
  selectorLabel: '#888',
  recurringText: '#007AFF',
  
  // Canvas/animation colors
  canvasBg: '#0b0f14',
  
  // Loading colors
  loadingBorder: '#007AFF',
  loadingBg: '#1a1a1a',
  loadingSpinner: '#007AFF',
};

// Typography
export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '24px',
    '3xl': '36px',
    '4xl': '48px',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  }
};

// Spacing
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

// Border radius
export const borderRadius = {
  none: '0',
  sm: '4px',
  base: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// Z-index values
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Transitions
export const transitions = {
  fast: '0.15s ease',
  base: '0.2s ease',
  slow: '0.3s ease',
  bounce: '0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Complete theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  transitions,
};

// Legacy COLORS export for backward compatibility during migration
export const COLORS = {
  PRIMARY: colors.primary,
  BORDER_DEFAULT: colors.borderDefault,
  BG_ACTIVE: colors.bgActive,
  BG_INACTIVE: colors.bgInactive,
  SUCCESS: colors.success,
};

export default theme;
