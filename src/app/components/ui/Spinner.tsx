import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {/* border-t uses link cobalt (#0d74ce) — widget accent */}
      <div
        className={`${sizes[size]} border-4 border-[#e0e1e6]/30 border-t-[#0d74ce] rounded-full animate-spin`}
      />
    </div>
  );
}
