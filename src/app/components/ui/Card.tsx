import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  variant?: 'standard' | 'whisper' | 'featured';
}

// Standard Card: white bg, 8px radius, Level 1 shadow
// Whisper: white bg, 8px radius, subtle shadow
// Featured: white bg, 16px radius, Level 3 shadow
export function Card({ children, className = '', hover = false, variant = 'standard' }: CardProps) {
  const variants = {
    standard: 'bg-[#ffffff] dark:bg-[#1a1a1a] rounded-[8px] shadow-[var(--shadow-1)]',
    whisper:  'bg-[#ffffff] dark:bg-[#1a1a1a] rounded-[8px] shadow-[var(--shadow-1)]',
    featured: 'bg-[#ffffff] dark:bg-[#1a1a1a] rounded-[16px] shadow-[var(--shadow-3)]',
  };

  return (
    <div
      className={`
        border border-[#e0e1e6] dark:border-white/10
        transition-colors duration-300
        ${variants[variant]}
        ${hover ? 'hover:shadow-[var(--shadow-2)] hover:border-[#0d74ce]/40 transition-all duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-6 border-b border-[#e0e1e6] dark:border-white/10 transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-[#1c2024] dark:text-white transition-colors duration-300 ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`p-6 text-[#1c2024] dark:text-white transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`p-6 border-t border-[#e0e1e6] dark:border-white/10 transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
}
