import React, { useState } from 'react';
import { RefreshCw, Calendar, X } from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import type { RecurringResult, RecurringItem } from '@/src/lib/recurringDetectionEngine';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
    result: RecurringResult;
}

function RecurringCard({ item, onIgnore }: { item: RecurringItem; onIgnore: (id: string) => void }) {
    return (
        <motion.div
            layout
            exit={{ opacity: 0, x: 40 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.06] transition-all"
        >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                item.type === 'expense' ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
            )}>
                <RefreshCw className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm capitalize truncate">{item.label}</p>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {item.category && <span className="capitalize">{item.category}</span>}
                    <span>·</span>
                    <Calendar className="w-3 h-3" />
                    <span>{item.count}x detected</span>
                    {item.isMonthly && <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded-md font-bold text-[10px] uppercase">Monthly</span>}
                </div>
            </div>
            <div className="text-right flex-shrink-0">
                <p className={cn(
                    "font-bold text-sm",
                    item.type === 'expense' ? "text-red-400" : "text-emerald-400"
                )}>
                    {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                </p>
                {item.estimatedNext && (
                    <p className="text-[10px] text-zinc-600">Next: {item.estimatedNext}</p>
                )}
            </div>
            <button
                onClick={() => onIgnore(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-zinc-600 hover:text-red-400"
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
        <div className="text-center py-12 text-zinc-600">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No recurring patterns detected yet. Add more transactions over time.</p>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Summary */}
            {expenses.length > 0 && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/15">
                    <RefreshCw className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-white font-bold text-sm">Estimated Recurring Expenses</p>
                        <p className="text-zinc-400 text-xs">{expenses.length} pattern{expenses.length > 1 ? 's' : ''} detected</p>
                    </div>
                    <p className="ml-auto text-red-400 font-black text-lg">{formatCurrency(result.estimatedMonthlyTotal)}<span className="text-xs text-zinc-500 font-normal">/mo</span></p>
                </div>
            )}

            {/* Recurring Expenses */}
            {expenses.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recurring Expenses</h4>
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
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recurring Income</h4>
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
