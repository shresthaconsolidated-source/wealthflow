import React from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { HealthScore } from '@/src/lib/healthScoreEngine';
import { motion } from 'motion/react';

interface Props {
    score: HealthScore;
    compact?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
    A: 'text-emerald-400',
    B: 'text-blue-400',
    C: 'text-amber-400',
    D: 'text-orange-400',
    F: 'text-red-400',
};

const LABEL_COLORS: Record<string, string> = {
    'Excellent': 'text-emerald-400',
    'Good': 'text-blue-400',
    'Fair': 'text-amber-400',
    'Needs Attention': 'text-red-400',
};

export default function HealthScoreCard({ score, compact = false }: Props) {
    const circumference = 2 * Math.PI * 44;
    const progress = circumference - (score.total / 100) * circumference;
    const gradeColor = GRADE_COLORS[score.grade] || 'text-zinc-400';

    return (
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white">Financial Health Score</h3>
                    <p className="text-zinc-500 text-sm">Based on your last 12 months of activity</p>
                </div>
                <Shield className={cn("w-6 h-6", gradeColor)} />
            </div>

            {/* Score circle + factors */}
            <div className={cn("flex gap-6", compact ? "flex-col items-center" : "flex-col sm:flex-row sm:items-center")}>
                {/* Circular progress */}
                <div className="relative flex-shrink-0 flex items-center justify-center w-32 h-32 mx-auto sm:mx-0">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <motion.circle
                            cx="50" cy="50" r="44"
                            fill="none"
                            stroke={score.total >= 70 ? '#34D399' : score.total >= 50 ? '#60a5fa' : '#f59e0b'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: progress }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                    </svg>
                    <div className="absolute text-center">
                        <div className={cn("text-3xl font-black", gradeColor)}>{score.total}</div>
                        <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">/ 100</div>
                    </div>
                </div>

                {/* Factor rows */}
                <div className="flex-1 w-full space-y-3">
                    {score.factors.map((f, i) => (
                        <div key={f.name}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-zinc-400">{f.name}</span>
                                <span className={cn("text-xs font-bold", LABEL_COLORS[f.label])}>{f.label}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className={cn(
                                        "h-full rounded-full",
                                        f.label === 'Excellent' ? "bg-emerald-400" :
                                            f.label === 'Good' ? "bg-blue-400" :
                                                f.label === 'Fair' ? "bg-amber-400" : "bg-red-400"
                                    )}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(f.score / f.max) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.1 * i }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Suggestions */}
            {!compact && score.suggestions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Suggestions</p>
                    {score.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                            <ChevronRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
