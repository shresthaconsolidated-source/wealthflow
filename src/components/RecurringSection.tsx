import React, { useState } from 'react';
import { RefreshCw, Calendar, X } from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import type { RecurringResult, RecurringItem } from '@/src/lib/recurringDetectionEngine';
import { motion } from 'motion/react';
import { EmptyState, Badge } from '@/src/components/ui';

interface Props {
    result: RecurringResult;
}

function RecurringCard({ item, onIgnore }: { item: RecurringItem; onIgnore: (id: string) => void }) {
    return (
        <motion.div
            layout
            exit={{ opacity: 0, x: 40 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-1)] group hover:bg-white/[0.06] transition-all"
        >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                item.type === 'expense' ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"
            )}>
                <RefreshCw className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] font-semibold text-sm capitalize truncate">{item.label}</p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    {item.category && <span className="capitalize">{item.category}</span>}
                    <span>·</span>
                    <Calendar className="w-3 h-3" />
                    <span>{item.count}x detected</span>
                    {item.isMonthly && <Badge tone="accent" className="bg-blue-500/15 text-blue-400">Monthly</Badge>}
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className={cn(
                    "tnum font-bold text-sm",
                    item.type === 'expense' ? "text-[var(--danger)]" : "text-[var(--accent)]"
                )}>
                    {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                </p>
                {item.estimatedNext && (
                    <p className="text-[10px] text-[var(--text-tertiary)]">Next: {item.estimatedNext}</p>
                )}
            </div>
            <button
                onClick={() => onIgnore(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--danger)]"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
}

export default function RecurringSection({ result }: Props) {
    const [ignored, setIgnored] = useState<Set<string>>(new Set());
    const ignore = (id: string) => setIgnored(prev => new Set([...prev, id]));

    const expenses = result.recurringExpenses.filter(r => !ignored.has(r.id));
    const income = result.recurringIncome.filter(r => !ignored.has(r.id));

    if (!expenses.length && !income.length) return (
        <EmptyState icon={RefreshCw} title="No recurring patterns detected yet." description="Add more transactions over time." />
    );

    return (
        <div className="space-y-8">
            {/* Summary */}
            {expenses.length > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--danger-soft)] border border-[var(--danger)]/15">
                    <RefreshCw className="w-5 h-5 text-[var(--danger)] shrink-0" />
                    <div>
                        <p className="text-[var(--text-primary)] font-bold text-sm">Estimated Recurring Expenses</p>
                        <p className="text-[var(--text-secondary)] text-xs">{expenses.length} pattern{expenses.length > 1 ? 's' : ''} detected</p>
                    </div>
                    <p className="tnum ml-auto text-[var(--danger)] font-bold text-lg">{formatCurrency(result.estimatedMonthlyTotal)}<span className="text-xs text-[var(--text-tertiary)] font-normal">/mo</span></p>
                </div>
            )}

            {/* Recurring Expenses */}
            {expenses.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Recurring Expenses</h4>
                    {expenses.map(item => (
                        <React.Fragment key={item.id}>
                            <RecurringCard item={item} onIgnore={ignore} />
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Recurring Income */}
            {income.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Recurring Income</h4>
                    {income.map(item => (
                        <React.Fragment key={item.id}>
                            <RecurringCard item={item} onIgnore={ignore} />
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
}
