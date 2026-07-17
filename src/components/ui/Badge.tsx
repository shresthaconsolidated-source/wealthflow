import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type Tone = 'neutral' | 'success' | 'danger' | 'gold' | 'accent';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  trend?: 'up' | 'down';
};

const tones: Record<Tone, string> = {
  neutral: 'bg-white/5 text-[var(--text-secondary)]',
  success: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
  gold: 'bg-[var(--gold-soft)] text-[var(--gold)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
};

export default function Badge({ className, tone = 'neutral', trend, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full',
        tones[tone],
        className
      )}
      {...rest}
    >
      {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
      {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
      {children}
    </span>
  );
}
