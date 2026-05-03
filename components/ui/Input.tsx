"use client";

import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-10 w-full rounded-md border border-border-theme bg-surface px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-theme-subtle focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-theme focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
