import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pending' | 'approved' | 'rejected' | 'default';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    pending:
      'bg-yellow-600 text-white border-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30',
    approved:
      'bg-green-600 text-white border-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
    rejected:
      'bg-red-600 text-white border-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30',
    default:
      'bg-blue-600 text-white border-blue-700 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}