'use client';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">

      {/* Label */}
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-300 transition-colors">
          {label}
        </label>
      )}

      {/* Input */}
      <input
        className={`
          w-full px-4 py-2 rounded-lg
          bg-white border border-gray-300 text-gray-900
          placeholder-gray-500
          dark:bg-[#1a1a2e] dark:border-white/10 dark:text-white dark:placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
          transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />

      {/* Error */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

    </div>
  );
}