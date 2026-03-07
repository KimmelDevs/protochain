'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

interface DropdownProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  align?: 'left' | 'right';
  className?: string;
}

export default function Dropdown({ trigger, options, align = 'left', className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute top-full mt-2 min-w-[200px] z-50
            bg-white dark:bg-[#1a1a2e]
            border border-gray-200 dark:border-white/10
            rounded-lg shadow-xl
            py-2
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                option.onClick?.();
                setIsOpen(false);
              }}
              className="
                w-full px-4 py-2 text-left text-sm
                text-gray-900 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-white/5
                hover:text-black dark:hover:text-white
                transition-colors
                flex items-center gap-3
              "
            >
              {option.icon && (
                <span className="text-gray-500 dark:text-gray-400">
                  {option.icon}
                </span>
              )}

              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


// Simple button dropdown variant
interface ButtonDropdownProps {
  label: string;
  options: DropdownOption[];
  align?: 'left' | 'right';
}

export function ButtonDropdown({ label, options, align = 'left' }: ButtonDropdownProps) {
  return (
    <Dropdown
      trigger={
        <button
          className="
            inline-flex items-center gap-2 px-4 py-2
            bg-gray-100 dark:bg-white/5
            border border-gray-200 dark:border-white/10
            rounded-lg
            text-gray-900 dark:text-white
            hover:bg-gray-200 dark:hover:bg-white/10
            transition-colors
          "
        >
          {label}
          <ChevronDown className="w-4 h-4" />
        </button>
      }
      options={options}
      align={align}
    />
  );
}