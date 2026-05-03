import { themeQuartz } from 'ag-grid-community';

/**
 * Common parameters for our AG Grid theme.
 * Optimized for both light and dark modes with high visibility.
 */
export const baseGridParams = {
  accentColor: 'var(--primary)',
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--text-main)',
  headerBackgroundColor: 'var(--surface-muted)',
  headerTextColor: 'var(--text-theme-muted)',
  rowBorderColor: 'var(--border-muted)',
  fontSize: '14px',
  wrapperBorderRadius: '8px',
  oddRowBackgroundColor: 'var(--surface-muted)',
  
  // High visibility checkboxes
  checkboxBorderColor: 'var(--primary)',
  checkboxCheckedBackgroundColor: 'var(--primary)',
  checkboxUncheckedBackgroundColor: 'transparent',
  
  // Ensure inputs are opaque
  inputBackgroundColor: 'var(--surface)',
  inputBorderColor: 'var(--border)',

  // Pagination Styles
  rowHeight: '42px',
  headerHeight: '48px',
};

// Re-export the theme object with our params
export const unifiedGridTheme = themeQuartz.withParams(baseGridParams);

export const GRID_CONTAINER_CLASS = "w-full border border-border-theme rounded-lg overflow-hidden bg-surface shadow-sm";
