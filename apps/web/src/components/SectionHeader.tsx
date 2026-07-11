import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actions,
}) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-12 w-12 rounded-2xl bg-wellness-sage-50 flex items-center justify-center text-wellness-sage-600 shadow-card">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-text">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
};

