import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { inputBaseClasses } from './Input';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  pill?: boolean;
};

export default function Select({ label, pill = false, className, id, children, ...rest }: SelectProps) {
  const select = (
    <div className="relative">
      <select
        id={id}
        className={cn(
          pill
            ? 'appearance-none pr-8 pl-3.5 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold uppercase tracking-wider border border-[var(--accent)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] cursor-pointer'
            : cn(inputBaseClasses, 'appearance-none pr-10 cursor-pointer'),
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className={cn(
          'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5',
          pill ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
        )}
      />
    </div>
  );

  if (!label) return select;

  return (
    <label htmlFor={id} className="block space-y-2">
      <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
      {select}
    </label>
  );
}
