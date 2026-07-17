import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6', className)}
    >
      <div>
        <h1 className="text-2xl lg:text-[1.75rem] font-bold text-[var(--text-primary)] tracking-tight">{title}</h1>
        {description && <p className="text-[var(--text-tertiary)] mt-1.5 text-sm lg:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">{actions}</div>}
    </motion.div>
  );
}
