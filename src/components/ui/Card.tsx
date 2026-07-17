import React from 'react';
import { cn } from '@/src/lib/utils';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  level?: 1 | 2 | 3;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const surfaceByLevel: Record<number, string> = {
  1: 'bg-[var(--surface-1)]',
  2: 'bg-[var(--surface-2)]',
  3: 'bg-[var(--surface-3)]',
};

const paddingBySize: Record<string, string> = {
  none: '',
  sm: 'p-4 lg:p-5',
  md: 'p-6 lg:p-7',
  lg: 'p-6 lg:p-9',
};

export default function Card({
  className,
  interactive = false,
  level = 1,
  padding = 'md',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-[var(--border-1)] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]',
        surfaceByLevel[level],
        paddingBySize[padding],
        interactive &&
          'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--border-2)] hover:-translate-y-0.5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
