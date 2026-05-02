import { themeQuartz } from 'ag-grid-community';

/**
 * Common parameters for our AG Grid theme.
 */
export const baseGridParams = {
  accentColor: '#3b82f6', // blue-500
  backgroundColor: 'transparent',
  foregroundColor: 'inherit',
  headerBackgroundColor: 'rgba(0, 0, 0, 0.05)',
  headerTextColor: 'inherit',
  rowBorderColor: 'rgba(128, 128, 128, 0.2)',
  fontSize: '14px',
  wrapperBorderRadius: '8px',
};

// Re-export the theme object with our params
export const unifiedGridTheme = themeQuartz.withParams(baseGridParams);

export const GRID_CONTAINER_CLASS = "w-full h-full border dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm";
