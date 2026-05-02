import React from 'react';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', onCheckedChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={`h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:focus-visible:ring-gray-600 ${className}`}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
