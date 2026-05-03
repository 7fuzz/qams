"use client";

import React from 'react';
import { Button } from './Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 50,
  onPageSizeChange,
  totalItems = 0
}: PaginationProps) => {
  // Defensive calculations to prevent NaN
  const safeCurrentPage = Math.max(1, Number(currentPage) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 50);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);

  const startItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;
  const endItem = Math.min(safeCurrentPage * safePageSize, safeTotalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface border-t border-border-theme">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <p className="text-xs text-text-theme-muted font-medium">
            Showing <span className="font-bold text-text-theme-main">{startItem}</span> to <span className="font-bold text-text-theme-main">{endItem}</span> of <span className="font-bold text-text-theme-main">{totalItems}</span> results
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-theme-subtle uppercase tracking-widest">Rows per page</span>
            <select
              className="h-8 text-xs rounded border border-border-theme bg-surface text-text-theme-main px-2"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[5, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-4">
            <span className="text-xs text-text-theme-subtle">Page</span>
            <span className="text-xs font-bold text-text-theme-main">{currentPage}</span>
            <span className="text-xs text-text-theme-subtle">of {totalPages}</span>
          </div>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
