'use client';
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  className?: string;
  darkMode?: boolean; // ✅ receive darkMode as prop
}

export default function Select({ label, error, options, className = '', darkMode = false, ...props }: SelectProps) {
  return (
    <div className="w-full relative">
      {/* Label */}
      {label && (
        <label
          className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
            darkMode ? 'text-gray-300' : 'text-gray-900'
          }`}
        >
          {label}
        </label>
      )}

      {/* Select box */}
      <select
        {...props}
        className={`
          w-full px-4 py-2 pr-10 rounded-lg appearance-none
          ${darkMode ? 'bg-[#1a1a2e] border border-white/10 text-white' : 'bg-white border border-gray-200 text-black'}
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
          transition-colors duration-300
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className={`${
              darkMode ? 'bg-[#1a1a2e] text-white' : 'bg-white text-black'
            } transition-colors duration-300`}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Custom arrow */}
      <div
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
          darkMode ? 'text-white' : 'text-gray-500'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}