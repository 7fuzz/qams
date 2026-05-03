"use client";

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  iconSize?: number;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
}

const variantStyles = {
  primary: 'bg-primary-theme text-white hover:opacity-90',
  secondary: 'bg-surface-accent text-text-theme-main hover:opacity-80',
  outline: 'border border-border-theme bg-transparent hover:bg-surface-muted text-text-theme-main',
  ghost: 'bg-transparent hover:bg-surface-muted text-text-theme-main',
};

const sizeStyles = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      iconSize,
      size = 'sm',
      variant = 'ghost',
      className = '',
      label,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const combinedClassName = `inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
    const computedIconSize = iconSize ?? iconSizes[size];

    return (
      <button
        ref={ref}
        type={type}
        aria-label={label ?? props['aria-label']}
        className={combinedClassName}
        {...props}
      >
        <Icon size={computedIconSize} />
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
