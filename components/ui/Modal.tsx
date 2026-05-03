"use client";

import React, { useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border-theme animate-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-theme">
          <h3 className="text-xl font-semibold tracking-tight text-text-theme-main">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-accent transition-colors text-text-theme-muted"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-surface">
          {children}
        </div>
      </div>
    </div>
  );
};
