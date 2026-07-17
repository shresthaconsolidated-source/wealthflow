import React from 'react';
import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Insight } from '@/src/lib/insightsEngine';
import { motion } from 'motion/react';
import { EmptyState } from '@/src/components/ui';

interface Props {
    insights: Insight[];
    maxShow?: number;
}

const CONFIG = {
    positive: {
        border: 'border-[var(--accent)]/20',
        bg: 'bg-[var(--accent-soft)]',
        icon: TrendingUp,
        iconColor: 'text-[var(--accent)]',
        iconBg: 'bg-[var(--accent)]/15',
        badge: 'bg-[var(--accent)]/15 text-[var(--accent)]',
    },
    warning: {
        border: 'border-[var(--gold)]/20',
        bg: 'bg-[var(--gold-soft)]',
        icon: AlertTriangle,
        iconColor: 'text-[var(--gold)]',
        iconBg: 'bg-[var(--gold)]/15',
        badge: 'bg-[var(--gold)]/15 text-[var(--gold)]',
    },
    info: {
        border: 'border-blue-500/20',
        bg: 'bg-blue-500/5',
        icon: Info,
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-500/15',
        badge: 'bg-blue-500/15 text-blue-400',
    },
};

export default function InsightCards({ insights, maxShow = 6 }: Props) {
    if (!insights.length) return (
        <EmptyState icon={Info} title="Add more transactions to generate insights." />
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {insights.slice(0, maxShow).map((insight, i) => {
                const cfg = CONFIG[insight.type];
                const Icon = cfg.icon;
                return (
                    <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                            "p-5 rounded-[24px] border relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5",
                            cfg.bg, cfg.border
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn("p-2.5 rounded-xl shrink-0", cfg.iconBg)}>
                                <Icon className={cn("w-4 h-4", cfg.iconColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="text-[var(--text-primary)] font-bold text-sm leading-tight">{insight.title}</h4>
                                    {insight.metric && (
                                        <span className={cn("tnum text-xs font-bold px-2 py-0.5 rounded-lg shrink-0", cfg.badge)}>
                                            {insight.metric}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[var(--text-tertiary)] text-xs leading-relaxed">{insight.body}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
