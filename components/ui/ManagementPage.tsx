"use client";

import React from 'react';
import { 
  CRUDTable, 
  Column, 
  ManagementTemplate
} from "@/components/ui";
import { LucideIcon } from 'lucide-react';

interface ManagementPageProps<T> {
  title: string;
  description: string;
  icon?: LucideIcon;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  filters?: React.ReactNode;
  
  // Table Props
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearch?: (query: string) => void;
  onSort?: (key: string, order: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  
  // Custom slots
  children?: React.ReactNode;
  afterTable?: React.ReactNode;
  beforeTable?: React.ReactNode;
}

export function ManagementPage<T extends Record<string, unknown>>({
  title,
  description,
  icon,
  primaryAction,
  secondaryActions,
  filters,
  data,
  columns,
  loading,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onSort,
  sortBy,
  sortOrder,
  onRowClick,
  searchPlaceholder,
  children,
  afterTable,
  beforeTable,
}: ManagementPageProps<T>) {
  return (
    <ManagementTemplate
      title={title}
      description={description}
      icon={icon}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      filters={filters}
    >
      {beforeTable}
      <CRUDTable
        data={data}
        columns={columns}
        loading={loading}
        totalItems={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onSearch={onSearch}
        onSort={onSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onRowClick={onRowClick}
        searchPlaceholder={searchPlaceholder}
        hideHeader={true}
      />
      {afterTable}
      {children}
    </ManagementTemplate>
  );
}
