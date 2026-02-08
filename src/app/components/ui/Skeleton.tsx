import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
}

export default function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-white/10';
  
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : '20px'),
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components for common use cases
export function SkeletonCard() {
  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
      <Skeleton variant="rectangular" height="20px" width="60%" />
      <Skeleton variant="rectangular" height="40px" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" height="16px" width="30%" />
        <Skeleton variant="rectangular" height="16px" width="40%" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="rectangular" height="40px" width="20%" />
          <Skeleton variant="rectangular" height="40px" width="30%" />
          <Skeleton variant="rectangular" height="40px" width="20%" />
          <Skeleton variant="rectangular" height="40px" width="30%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar() {
  return <Skeleton variant="circular" width="40px" height="40px" />;
}