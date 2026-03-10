import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Insight } from '@/src/lib/insightsEngine';
import { motion } from 'motion/react';

interface Props {
    insights: Insight[];
    maxShow?: number;
}

const CONFIG = {
    positive: {
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/5',
        icon: TrendingUp,
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-500/15',
        badge: 'bg-emerald-500/15 text-emerald-400',
    },
    warning: {
        border: 'border-amber-500/20',
        bg: 'bg-amber-500/5',
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-500/15',
        badge: 'bg-amber-500/15 text-amber-400',
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
        <div className="text-center py-12 text-zinc-600">
            <Info className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Add more transactions to generate insights.</p>
        </div>
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
                        transition={{ delay: i * 0.07 }}
                        className={cn(
                            "p-5 rounded-[24px] border relative overflow-hidden group transition-all hover:scale-[1.01]",
                            cfg.bg, cfg.border
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn("p-2.5 rounded-xl flex-shrink-0", cfg.iconBg)}>
                                <Icon className={cn("w-4 h-4", cfg.iconColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="text-white font-bold text-sm leading-tight">{insight.title}</h4>
                                    {insight.metric && (
                                        <span className={cn("text-xs font-black px-2 py-0.5 rounded-lg flex-shrink-0", cfg.badge)}>
                                            {insight.metric}
                                        </span>
                                    )}
                                </div>
                                <p className="text-zinc-400 text-xs leading-relaxed">{insight.body}</p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
