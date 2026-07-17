import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import Badge from './Badge';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  trend?: React.ReactNode;
  positive?: boolean;
  delay?: number;
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, trend, positive = true, delay = 0, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'min-w-[260px] lg:min-w-0 flex-1 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[28px] p-6 relative overflow-hidden group',
        'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--border-2)] hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="p-3 rounded-2xl bg-white/[0.04] text-[var(--text-secondary)] group-hover:text-[var(--accent)] group-hover:bg-[var(--accent-soft)] transition-colors duration-300">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <Badge tone={positive ? 'success' : 'danger'} trend={positive ? 'up' : 'down'}>
            {trend}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider">{label}</p>
        <h3 className="tnum text-2xl lg:text-[1.75rem] font-bold text-[var(--text-primary)] tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );
}
