import React from 'react';
import { cn } from '@/src/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export const inputBaseClasses = cn(
  'w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-4 py-3 text-sm',
  'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
  'focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)]/40',
  'transition-all duration-200'
);

export default function Input({ label, hint, icon: Icon, className, id, ...rest }: InputProps) {
  return (
    <label htmlFor={id} className="block space-y-2">
      {label && <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>}
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 text-[var(--text-tertiary)] absolute left-4 top-1/2 -translate-y-1/2" />}
        <input id={id} className={cn(inputBaseClasses, Icon && 'pl-11', className)} {...rest} />
      </div>
      {hint && <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>}
    </label>
  );
}
