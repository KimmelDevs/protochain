import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[14px] font-medium text-[#60646c] dark:text-[#b0b4ba] mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-2 rounded-[6px]
          bg-[#ffffff] text-[#1c2024] dark:bg-[#1a1a1a] dark:text-white
          border border-[#d9d9e0] dark:border-white/10
          placeholder-[#b0b4ba] dark:placeholder-[#60646c]
          focus:outline-none focus:ring-2 focus:ring-[#0d74ce] focus:border-[#0d74ce]
          transition-all duration-200
          resize-none
          ${error ? 'border-[#eb8e90] focus:ring-[#eb8e90]' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-[12px] text-[#eb8e90]">{error}</p>
      )}
    </div>
  );
}
