'use client';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">

      {/* Label — caption size, slate text */}
      {label && (
        <label className="block text-[14px] font-medium mb-2 text-[#60646c] dark:text-[#b0b4ba] transition-colors">
          {label}
        </label>
      )}

      {/* Input — white bg, #d9d9e0 border, 6px radius (input-border token) */}
      <input
        className={`
          w-full px-4 py-2 rounded-[6px]
          bg-[#ffffff] border border-[#d9d9e0] text-[#1c2024]
          placeholder-[#b0b4ba]
          dark:bg-[#1a1a1a] dark:border-white/10 dark:text-white dark:placeholder-[#60646c]
          focus:outline-none focus:ring-2 focus:ring-[#0d74ce] focus:border-[#0d74ce]
          transition-all duration-200
          ${error ? 'border-[#eb8e90] focus:ring-[#eb8e90] focus:border-[#eb8e90]' : ''}
          ${className}
        `}
        {...props}
      />

      {/* Error */}
      {error && (
        <p className="mt-1 text-[12px] text-[#eb8e90]">{error}</p>
      )}

    </div>
  );
}
