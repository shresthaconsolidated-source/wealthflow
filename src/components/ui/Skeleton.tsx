import React from 'react';
import { cn } from '@/src/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-white/[0.05]',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent',
        'before:animate-[shimmer_1.6s_infinite]',
        className
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 lg:pb-0 animate-pulse">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-12 w-40 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[28px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80 rounded-[32px]" />
        <Skeleton className="h-80 rounded-[32px]" />
      </div>
    </div>
  );
}
