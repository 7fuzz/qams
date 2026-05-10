"use client";

import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from './Table';
import { Pagination } from './Pagination';
import { Input } from './Input';
import { Button } from './Button';
import { Search, Plus, ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface CRUDTableProps<T> {
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
  onCreate?: () => void;
  onRowClick?: (item: T) => void;
  createLabel?: string;
  searchPlaceholder?: string;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  hideHeader?: boolean;
}

export function CRUDTable<T extends { [key: string]: any }>({
  data,
  columns,
  loading = false,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onSort,
  sortBy,
  sortOrder,
  onCreate,
  onRowClick,
  createLabel = "Add New",
  searchPlaceholder = "Search...",
  title,
  description,
  icon: Icon,
  hideHeader = false,
}: CRUDTableProps<T>) {
  const [localSearch, setLocalSearch] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(localSearch);
  };

  const handleSortClick = (key: string) => {
    if (!onSort) return;
    const nextOrder = sortBy === key && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    onSort(key, nextOrder);
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const header = (title || onCreate || onSearch) && !hideHeader && (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        {title && (
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {Icon && <Icon size={24} className="text-primary-theme" />} {title}
          </h1>
        )}
        {description && (
          <p className="text-text-theme-muted font-medium uppercase tracking-wider text-[10px]">
            {description}
          </p>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        {onSearch && (
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-theme-muted" size={16} />
            <Input
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 h-10 w-full sm:w-64"
            />
          </form>
        )}
        {onCreate && (
          <Button onClick={onCreate} className="h-10">
            <Plus size={18} className="mr-2" /> {createLabel}
          </Button>
        )}
      </div>
    </div>
  );

  const searchAndActionsOnly = hideHeader && (onSearch || onCreate) && (
    <div className="flex flex-col sm:flex-row gap-2 justify-end">
        {onSearch && (
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-theme-muted" size={16} />
            <Input
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 h-10 w-full sm:w-64"
            />
          </form>
        )}
        {onCreate && (
          <Button onClick={onCreate} className="h-10">
            <Plus size={18} className="mr-2" /> {createLabel}
          </Button>
        )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {header}
      {searchAndActionsOnly}

      <div className="w-full border border-border-theme rounded-lg overflow-hidden bg-surface shadow-sm">
        <Table>
          <TableHeader className="bg-surface-muted">
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={idx}
                  className={`${col.sortable ? 'cursor-pointer hover:bg-surface-accent transition-colors' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && col.accessorKey && handleSortClick(col.accessorKey as string)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && col.accessorKey && sortBy === col.accessorKey && (
                      sortOrder === 'ASC' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-20 text-text-theme-muted uppercase tracking-widest text-xs font-bold animate-pulse">
                  Syncing Matrix...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-20 text-text-theme-muted italic">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, rowIdx) => (
                <TableRow
                  key={item.id || rowIdx}
                  className={`${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className={col.className}>
                      {col.cell ? col.cell(item) : (col.accessorKey ? item[col.accessorKey as string] : null)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
