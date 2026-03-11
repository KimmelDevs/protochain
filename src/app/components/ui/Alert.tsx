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
    info: {
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      border: 'border-blue-300 dark:border-blue-500/30',
      text: 'text-blue-700 dark:text-blue-400',
      icon: Info,
    },
    success: {
      bg: 'bg-green-100 dark:bg-green-500/20',
      border: 'border-green-300 dark:border-green-500/30',
      text: 'text-green-700 dark:text-green-400',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-500/20',
      border: 'border-yellow-300 dark:border-yellow-500/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: AlertTriangle,
    },
    error: {
      bg: 'bg-red-100 dark:bg-red-500/20',
      border: 'border-red-300 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-400',
      icon: AlertCircle,
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={`
        relative p-4 rounded-lg border
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
          <div className="text-sm text-gray-800 dark:text-gray-300">
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