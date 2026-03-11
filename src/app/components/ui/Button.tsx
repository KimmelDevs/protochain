import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export default function Button({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';

  // Button variants
  const variants = {
    default:
      'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-black dark:text-white shadow-lg hover:shadow-xl',
    outline:
      'border-2 border-purple-500/50 text-black dark:text-white hover:bg-purple-500/10 hover:border-purple-500',
    ghost:
      'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white',
    danger:
      'bg-red-500 hover:bg-red-600 text-black dark:text-white shadow-lg',
    orange:
      'bg-orange-600 hover:bg-orange-500 text-white shadow-lg hover:opacity-90',
  };

  // Button sizes
  const sizes = {
    sm: 'px-8 py-3 text-sm gap-2',
    md: 'px-10 py-3 text-base gap-2',
    lg: 'px-12 py-4 text-lg gap-2',
  };

  return (
    <button
      {...props}
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}