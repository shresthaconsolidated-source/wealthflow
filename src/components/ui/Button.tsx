import React from 'react';
import { cn } from '@/src/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg' | 'icon';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-[#04140e] hover:bg-[var(--accent-strong)] shadow-[0_8px_24px_-8px_var(--accent-ring)]',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:border-[var(--border-3)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5',
  danger:
    'bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20',
  gold:
    'bg-[var(--gold-soft)] text-[var(--gold)] border border-[var(--gold)]/25 hover:bg-[var(--gold)]/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs gap-1.5 rounded-xl',
  md: 'h-12 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-14 px-7 text-base gap-2.5 rounded-2xl',
  icon: 'h-11 w-11 rounded-xl',
};

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap',
        'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
