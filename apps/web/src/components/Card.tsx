import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-surface rounded-3xl p-6 shadow-card border border-border transition-colors duration-300 ${className}`}
    >
      {children}
    </div>
  );
};

