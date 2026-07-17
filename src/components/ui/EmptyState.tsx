import React from 'react';
import { cn } from '@/src/lib/utils';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, className, bordered = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center text-center px-6 py-10 gap-3',
        bordered && 'border border-dashed border-[var(--border-2)] rounded-3xl',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center text-[var(--text-tertiary)] mb-1">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
      {description && <p className="text-xs text-[var(--text-tertiary)] max-w-[26ch]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
