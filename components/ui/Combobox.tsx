"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface ComboboxProps {
  options: Option[];
  value?: string | number | (string | number)[];
  onChange: (value: string | number | (string | number)[]) => void;
  placeholder?: string;
  className?: string;
  multiSelect?: boolean;
  disabled?: boolean;
}

export const Combobox = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...", 
  className = "",
  multiSelect = false,
  disabled = false
}: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (val: string | number) => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(val);
    }
    return value === val;
  };

  const toggleOption = (val: string | number) => {
    if (disabled) return;
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(val)) {
        onChange(currentValues.filter(v => v !== val));
      } else {
        onChange([...currentValues, val]);
      }
    } else {
      onChange(val);
      setIsOpen(false);
      setSearch("");
    }
  };

  const removeValue = (e: React.MouseEvent, val: string | number) => {
    e.stopPropagation();
    if (disabled) return;
    if (multiSelect && Array.isArray(value)) {
      onChange(value.filter(v => v !== val));
    }
  };

  const getLabel = () => {
    if (multiSelect && Array.isArray(value)) {
        if (value.length === 0) return placeholder;
        return (
            <div className="flex flex-wrap gap-1">
                {value.map(v => {
                    const opt = options.find(o => o.value === v);
                    return (
                        <span key={v} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {opt?.label || v}
                            {!disabled && <X size={10} className="cursor-pointer hover:text-red-500" onClick={(e) => removeValue(e, v)} />}
                        </span>
                    );
                })}
            </div>
        );
    }
    const selectedOption = options.find(option => option.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex min-h-[40px] w-full items-center justify-between rounded-md border border-gray-300 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-gray-400 dark:border-gray-800 ${
            disabled ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900" : ""
        }`}
      >
        <div className="flex-1 text-left overflow-hidden">
            {getLabel()}
        </div>
        <ChevronDown size={16} className="text-gray-500 shrink-0 ml-2" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white dark:bg-gray-950 p-1 shadow-xl dark:border-gray-800">
          <div className="sticky top-0 z-10 flex items-center border-b bg-white dark:bg-gray-950 px-2 pb-1 dark:border-gray-800">
            <Search size={14} className="mr-2 text-gray-500" />
            <input
              autoFocus
              placeholder="Search..."
              className="w-full bg-transparent py-2 text-sm outline-hidden text-gray-900 dark:text-gray-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-1 bg-white dark:bg-gray-950">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-500 bg-white dark:bg-gray-950">No results found.</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className={`flex w-full items-center rounded-sm px-2 py-2 text-sm transition-colors bg-white dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    isSelected(option.value) ? "bg-gray-50 dark:bg-gray-900" : ""
                  }`}
                >
                  <Check
                    size={14}
                    className={`mr-2 transition-opacity ${
                      isSelected(option.value) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
