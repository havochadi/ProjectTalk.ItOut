import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils';

export interface CardProps extends HTMLMotionProps<'div'> {
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -4, boxShadow: '0 12px 32px rgba(124, 58, 237, 0.18)' } : undefined}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
        className={cn(
          'rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-card',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mb-4', className)} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('text-xl font-bold font-display text-[var(--text)]', className)} {...props} />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-[var(--muted)] mt-1', className)} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('', className)} {...props} />
);
