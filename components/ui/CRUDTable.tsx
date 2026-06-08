"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  width?: number;
  minWidth?: number;
  pin?: 'left' | 'right';
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

export function CRUDTable<T extends object>({
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
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const resizingRef = useRef<{ idx: number; startX: number; startWidth: number } | null>(null);

  // Measure text helper
  const measureText = useCallback((text: string, font: string = '14px ui-sans-serif, system-ui, sans-serif') => {
      if (typeof window === 'undefined') return 0;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return 0;
      context.font = font;
      return context.measureText(text).width;
  }, []);

  const autoFitColumn = useCallback((idx: number) => {
      const col = columns[idx];
      let maxWidth = measureText(col.header, 'bold 14px ui-sans-serif, system-ui, sans-serif') + 40; 

      data.forEach(item => {
          let content = '';
          if (col.accessorKey) content = String((item as Record<string, unknown>)[col.accessorKey as string] || '');
          const width = measureText(content) + 32; 
          if (width > maxWidth) maxWidth = width;
      });

      const finalWidth = Math.min(600, Math.max(col.minWidth || 80, maxWidth));
      setColumnWidths(prev => {
          if (prev[idx] === finalWidth) return prev;
          return { ...prev, [idx]: finalWidth };
      });
  }, [columns, data, measureText]);

  // Initialize widths
  useEffect(() => {
    setColumnWidths(prev => {
        const initialWidths: Record<number, number> = { ...prev };
        let hasChanges = false;
        columns.forEach((col, idx) => {
            if (initialWidths[idx] === undefined || (col.width && initialWidths[idx] !== col.width)) {
                initialWidths[idx] = col.width || 150;
                hasChanges = true;
            }
        });
        return hasChanges ? initialWidths : prev;
    });
  }, [columns]); 

  // Reorder Resize Handlers to fix Lexical Initialization Error
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { idx, startX, startWidth } = resizingRef.current;
    const delta = e.pageX - startX;
    const minWidth = columns[idx]?.minWidth || 80;
    const newWidth = Math.max(minWidth, startWidth + delta);
    
    setColumnWidths((prev) => {
        if (prev[idx] === newWidth) return prev;
        return {
            ...prev,
            [idx]: newWidth,
        };
    });
  }, [columns]);

  const onMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // Add a tiny timeout to prevent the sort click from firing after resize
    setTimeout(() => {
        isResizingInternalRef.current = false;
    }, 50);
  }, [onMouseMove]);

  const isResizingInternalRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    isResizingInternalRef.current = true;
    resizingRef.current = {
      idx,
      startX: e.pageX,
      startWidth: columnWidths[idx] || 150,
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths, onMouseMove, onMouseUp]);

  // Clean up
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const getPinStyles = useCallback((col: Column<T>, idx: number) => {
      if (!col.pin) return {};
      
      const styles: React.CSSProperties = {
          position: 'sticky',
          zIndex: col.pin === 'left' ? 21 : 20, 
      };

      if (col.pin === 'left') {
          let left = 0;
          for (let i = 0; i < idx; i++) {
              left += columnWidths[i] || columns[i].width || 150;
          }
          styles.left = left;
      } else {
          let right = 0;
          for (let i = columns.length - 1; i > idx; i--) {
              right += columnWidths[i] || columns[i].width || 150;
          }
          styles.right = right;
      }

      return styles;
  }, [columns, columnWidths]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(localSearch);
  };

  const handleSortClick = (key: string) => {
    // DO NOT SORT IF WE ARE RESIZING
    if (isResizingInternalRef.current) return;
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
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-border-theme scrollbar-track-transparent max-h-[70vh] overflow-y-auto">
            <Table className="min-w-full table-fixed border-separate border-spacing-0">
              <TableHeader className="bg-surface-muted sticky top-0 z-30 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                <TableRow className="hover:bg-transparent border-b-0">
                  {columns.map((col, idx) => {
                    const pinStyles = getPinStyles(col, idx);
                    return (
                        <TableHead
                            key={idx}
                            style={{ 
                                width: columnWidths[idx] || 150,
                                minWidth: columnWidths[idx] || 150,
                                maxWidth: columnWidths[idx] || 150,
                                ...pinStyles,
                                zIndex: col.pin ? 31 : 30
                            }}
                            className={`relative group border-b border-border-theme ${
                                col.pin ? 'bg-surface-muted shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)]' : ''
                            } ${col.sortable ? 'cursor-pointer hover:bg-surface-accent transition-colors' : ''} ${col.className || ''}`}
                            onClick={() => col.sortable && col.accessorKey && handleSortClick(col.accessorKey as string)}
                        >
                            <div className="flex items-center gap-1 pr-4 whitespace-nowrap overflow-hidden text-ellipsis">
                                {col.header}
                                {col.sortable && col.accessorKey && sortBy === col.accessorKey && (
                                    sortOrder === 'ASC' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                )}
                            </div>
                            {/* Resize Handle */}
                            <div
                                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary-theme/50 active:bg-primary-theme transition-colors flex items-center justify-center group-hover:bg-border-theme/50 z-40"
                                onMouseDown={(e) => onMouseDown(e, idx)}
                                onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    autoFitColumn(idx);
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="opacity-0 group-hover:opacity-100">
                                    <div className="w-[1px] h-4 bg-border-theme" />
                                </div>
                            </div>
                        </TableHead>
                    );
                  })}
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
                      data.map((item, rowIdx) => {
                        const itemObj = item as Record<string, unknown>;
                        const idValue = itemObj.id || 
                                       itemObj.project_id || 
                                       itemObj.run_id || 
                                       itemObj.issue_id || 
                                       itemObj.module_id || 
                                       'row';
                        const uniqueKey = `${idValue}-${rowIdx}`;
                        
                        return (
                            <TableRow
                                key={uniqueKey}
                                className={`${onRowClick ? 'cursor-pointer' : ''} group/row`}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map((col, colIdx) => (
                                    <TableCell 
                                        key={colIdx} 
                                        style={{
                                            ...getPinStyles(col, colIdx),
                                            width: columnWidths[colIdx] || 150,
                                            minWidth: columnWidths[colIdx] || 150,
                                            maxWidth: columnWidths[colIdx] || 150,
                                        }}
                                        className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-border-theme py-3 ${
                                            col.pin ? 'bg-surface z-10 group-hover/row:bg-surface-accent shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.1)]' : ''
                                        } ${col.className || ''}`}
                                    >
                                        {col.cell ? col.cell(item) : (col.accessorKey ? (item[col.accessorKey as keyof T] as React.ReactNode) : null)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                      })
                )}
              </TableBody>
            </Table>
        </div>
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
