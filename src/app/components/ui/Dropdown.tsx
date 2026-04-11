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

      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Dropdown Menu — white bg, #e0e1e6 border, Level 2 shadow, 8px radius */}
      {isOpen && (
        <div
          className={`
            absolute top-full mt-2 min-w-[200px] z-50
            bg-[#ffffff] dark:bg-[#1a1a1a]
            border border-[#e0e1e6] dark:border-white/10
            rounded-[8px] shadow-[var(--shadow-2)]
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
                w-full px-4 py-2 text-left text-[14px]
                text-[#1c2024] dark:text-[#b0b4ba]
                hover:bg-[#f0f0f3] dark:hover:bg-white/5
                hover:text-[#000000] dark:hover:text-white
                transition-colors
                flex items-center gap-3
              "
            >
              {option.icon && (
                <span className="text-[#60646c] dark:text-[#b0b4ba]">
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
            bg-[#f0f0f3] dark:bg-white/5
            border border-[#e0e1e6] dark:border-white/10
            rounded-[8px]
            text-[#1c2024] dark:text-white
            hover:bg-[#e0e1e6] dark:hover:bg-white/10
            transition-colors text-[14px]
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
