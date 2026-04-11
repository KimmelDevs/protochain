'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#000000]/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — Level 3 (Modal) elevation, 16px radius (featured card) */}
      <div
        className={`
          relative rounded-[16px] border
          bg-[#ffffff] dark:bg-[#1a1a1a]
          border-[#e0e1e6] dark:border-white/10
          shadow-[var(--shadow-3)] w-full ${sizes[size]} max-h-[90vh] overflow-y-auto
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-[#e0e1e6] dark:border-white/10">
            <h3 className="text-xl font-bold text-[#1c2024] dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#60646c] hover:text-[#1c2024] dark:text-[#b0b4ba] dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 text-[#1c2024] dark:text-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
