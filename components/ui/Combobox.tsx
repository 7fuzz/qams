"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface ComboboxProps {
  options: Option[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
}

export const Combobox = ({ options, value, onChange, placeholder = "Select...", className = "" }: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(option => option.value === value);

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-gray-400 dark:border-gray-800 dark:bg-gray-950"
      >
        <span className={!selectedOption ? "text-gray-500" : ""}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center border-b px-2 pb-1 dark:border-gray-800">
            <Search size={14} className="mr-2 text-gray-500" />
            <input
              autoFocus
              placeholder="Search..."
              className="w-full bg-transparent py-2 text-sm outline-hidden"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-500">No results found.</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center rounded-sm px-2 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    value === option.value ? "bg-gray-50 dark:bg-gray-900" : ""
                  }`}
                >
                  <Check
                    size={14}
                    className={`mr-2 transition-opacity ${
                      value === option.value ? "opacity-100" : "opacity-0"
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
