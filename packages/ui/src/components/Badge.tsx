import React from 'react';
import { cn } from '../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'positive' | 'neutral' | 'negative' | 'warning' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-wellness-sage-100 text-wellness-sage-800 border border-wellness-sage-200',
    positive: 'bg-green-100 text-green-800 border border-green-200',
    neutral: 'bg-blue-100 text-blue-800 border border-blue-200',
    negative: 'bg-red-100 text-red-800 border border-red-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    info: 'bg-sky-100 text-sky-800 border border-sky-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold font-display shadow-sm',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
