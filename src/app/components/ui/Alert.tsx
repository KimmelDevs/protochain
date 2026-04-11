import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export default function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className = ''
}: AlertProps) {
  const variants = {
    // info → link cobalt (#0d74ce)
    info: {
      bg: 'bg-[#0d74ce]/10',
      border: 'border-[#0d74ce]/30',
      text: 'text-[#0d74ce]',
      icon: Info,
    },
    // success → green (no explicit token, kept semantic)
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-600 dark:text-green-400',
      icon: CheckCircle,
    },
    // warning → amber (#ab6400)
    warning: {
      bg: 'bg-[#ab6400]/10',
      border: 'border-[#ab6400]/30',
      text: 'text-[#ab6400]',
      icon: AlertTriangle,
    },
    // error → destructive (#eb8e90)
    error: {
      bg: 'bg-[#eb8e90]/10',
      border: 'border-[#eb8e90]/30',
      text: 'text-[#eb8e90]',
      icon: AlertCircle,
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={`
        relative p-4 rounded-[8px] border
        ${config.bg} ${config.border}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.text}`} />
        <div className="flex-1">
          {title && (
            <h5 className={`font-semibold mb-1 ${config.text}`}>
              {title}
            </h5>
          )}
          <div className="text-[14px] text-[#1c2024] dark:text-[#b0b4ba]">
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 ${config.text} hover:opacity-70 transition-opacity`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
