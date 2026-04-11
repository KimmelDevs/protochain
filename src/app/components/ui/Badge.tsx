import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pending' | 'approved' | 'rejected' | 'default' | 'beta';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    // pending → warning semantic (#ab6400)
    pending:
      'bg-[#ab6400]/15 text-[#ab6400] border-[#ab6400]/30',
    // approved → green (kept as semantic success, no override in design system)
    approved:
      'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
    // rejected → destructive (#eb8e90)
    rejected:
      'bg-[#eb8e90]/15 text-[#eb8e90] border-[#eb8e90]/30',
    // default → link cobalt (#0d74ce)
    default:
      'bg-[#0d74ce]/15 text-[#0d74ce] border-[#0d74ce]/30',
    // beta → preview purple (#8145b5)
    beta:
      'bg-[#8145b5]/15 text-[#8145b5] border-[#8145b5]/30',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-[12px] font-semibold border
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
