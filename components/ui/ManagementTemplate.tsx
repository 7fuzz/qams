"use client";

import React from 'react';
import { Card, CardContent } from './Card';
import { LucideIcon } from 'lucide-react';

interface ManagementTemplateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
}

export const ManagementTemplate = ({
  title,
  description,
  icon: Icon,
  primaryAction,
  secondaryActions,
  filters,
  children
}: ManagementTemplateProps) => {
  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col gap-8 max-w-full text-text-theme-main">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {Icon && <Icon size={32} className="text-primary-theme" />} {title}
          </h1>
          <p className="text-text-theme-muted font-medium uppercase tracking-wider text-[10px]">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {secondaryActions}
          {primaryAction}
        </div>
      </div>

      {filters && (
        <Card className="shadow-sm border border-border-theme">
          <CardContent className="p-4 mt-4">
            {filters}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
};
