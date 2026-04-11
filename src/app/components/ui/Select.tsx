'use client';
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  className?: string;
}

export default function Select({
  label,
  error,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full relative">

      {/* Label — caption size, slate text */}
      {label && (
        <label className="block text-[14px] font-medium mb-2 text-[#60646c] dark:text-[#b0b4ba] transition-colors">
          {label}
        </label>
      )}

      {/* Select — input-border token, 6px radius */}
      <select
        {...props}
        className={`
          w-full px-4 py-2 pr-10 rounded-[6px] appearance-none
          bg-[#ffffff] text-[#1c2024] border border-[#d9d9e0]
          dark:bg-[#1a1a1a] dark:text-white dark:border-white/10
          focus:outline-none focus:ring-2 focus:ring-[#0d74ce] focus:border-[#0d74ce]
          transition-colors duration-200
          ${error ? 'border-[#eb8e90] focus:ring-[#eb8e90]' : ''}
          ${className}
        `}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#ffffff] text-[#1c2024] dark:bg-[#1a1a1a] dark:text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Arrow */}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#60646c] dark:text-[#b0b4ba]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Error */}
      {error && <p className="mt-1 text-[12px] text-[#eb8e90]">{error}</p>}
    </div>
  );
}
