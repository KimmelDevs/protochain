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
      
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-300 transition-colors">
          {label}
        </label>
      )}

      {/* Select */}
      <select
        {...props}
        className={`
          w-full px-4 py-2 pr-10 rounded-lg appearance-none
          bg-white text-gray-900 border border-gray-200
          dark:bg-[#1a1a2e] dark:text-white dark:border-white/10
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
          transition-colors duration-200
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-white text-black dark:bg-[#1a1a2e] dark:text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Arrow */}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Error */}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}