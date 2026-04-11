import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger' | 'primary' | 'dark-rounded' | 'orange';
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
  // Base: inline-flex, font-semibold, transition, disabled states
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    // Primary CTA (Orange) — #E8500A bg, white text, pill radius
    default:
      'bg-[#E8500A] text-white hover:opacity-90 shadow-[var(--shadow-1)]',
    // Primary Pill shape (explicit pill variant)
    primary:
      'bg-[#E8500A] text-white hover:opacity-90 shadow-[var(--shadow-1)] rounded-[9999px]',
    // Standard White — white bg, border #e0e1e6
    outline:
      'bg-[#ffffff] text-[#1c2024] border border-[#e0e1e6] hover:bg-[#f0f0f3] shadow-[var(--shadow-1)]',
    // Ghost — no bg, subtle hover
    ghost:
      'bg-transparent text-[#1c2024] dark:text-white hover:bg-[#f0f0f3] dark:hover:bg-white/5',
    // Danger — destructive semantic color
    danger:
      'bg-[#eb8e90] text-[#1c2024] hover:opacity-80 shadow-[var(--shadow-1)]',
    // Dark Rounded — kept dark for secondary/dark-surface use only
    'dark-rounded':
      'bg-[#000000] text-white hover:opacity-80 shadow-[var(--shadow-1)] rounded-[32px]',
    // Orange — explicit alias for default CTA orange
    orange:
      'bg-[#E8500A] text-white hover:opacity-90 shadow-[var(--shadow-1)]',
  };

  // Radius: default variant gets pill, others get 8px (design system standard card radius)
  const radiusMap: Record<string, string> = {
    default: 'rounded-[9999px]',
    primary: '', // already set inline above
    outline: 'rounded-[8px]',
    ghost: 'rounded-[8px]',
    danger: 'rounded-[8px]',
    'dark-rounded': '', // already set inline above
    orange: 'rounded-[9999px]',
  };

  const sizes = {
    sm: 'px-8 py-3 text-sm gap-2',
    md: 'px-10 py-3 text-base gap-2',
    lg: 'px-12 py-4 text-lg gap-2',
  };

  return (
    <button
      {...props}
      className={`${baseStyles} ${radiusMap[variant]} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}