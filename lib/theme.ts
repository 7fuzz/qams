import { themeQuartz } from 'ag-grid-community';

/**
 * Common parameters for our AG Grid theme.
 * Optimized for both light and dark modes with high visibility.
 */
export const baseGridParams = {
  accentColor: '#3b82f6', // blue-500
  backgroundColor: 'transparent',
  foregroundColor: 'inherit',
  headerBackgroundColor: 'rgba(0, 0, 0, 0.05)',
  headerTextColor: 'inherit',
  rowBorderColor: 'rgba(128, 128, 128, 0.15)',
  fontSize: '14px',
  wrapperBorderRadius: '8px',
  oddRowBackgroundColor: 'rgba(128, 128, 128, 0.04)',
  
  // High visibility checkboxes
  checkboxBorderColor: '#6366f1', // Indigo-500 for better contrast
  checkboxCheckedBackgroundColor: '#3b82f6',
  checkboxUncheckedBackgroundColor: 'transparent',
  
  // Ensure popups (like select editors) are opaque
  popupBackgroundColor: '#ffffff', // Will be overridden by dark mode logic if needed
  inputBackgroundColor: '#ffffff',
  inputBorderColor: 'rgba(128, 128, 128, 0.3)',
};

// Re-export the theme object with our params
export const unifiedGridTheme = themeQuartz.withParams(baseGridParams).withParams({
    // Forced dark overrides for when the system is in dark mode
    // (AG Grid doesn't always inherit transparent correctly for popups)
    popupBackgroundColor: 'var(--color-bg-popover, #ffffff)',
});

export const GRID_CONTAINER_CLASS = "w-full h-full border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm";
