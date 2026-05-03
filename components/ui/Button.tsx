"use client";

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer';
    
    const variants = {
      primary: 'bg-primary-theme text-white hover:opacity-90',
      secondary: 'bg-surface-accent text-text-theme-main hover:opacity-80',
      outline: 'border border-border-theme bg-transparent hover:bg-surface-muted text-text-theme-main',
      ghost: 'bg-transparent hover:bg-surface-muted text-text-theme-main',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button
        ref={ref}
        className={combinedClassName}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
