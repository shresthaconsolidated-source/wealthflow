import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import type { Forecast } from '@/src/lib/forecastEngine';
import { buildForecastChartData } from '@/src/lib/forecastEngine';
import type { MonthlyData } from '@/src/lib/insightsEngine';
import {
    ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface Props {
    forecast: Forecast;
    history: MonthlyData[];
    compact?: boolean;
}

function delta(current: number, projected: number) {
    const diff = projected - current;
    const pct = current !== 0 ? ((diff / Math.abs(current)) * 100).toFixed(1) : '—';
    return { diff, pct };
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl p-3 shadow-xl text-xs">
            <p className="text-[var(--text-secondary)] mb-1 font-bold">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-[var(--text-secondary)]">{p.name}:</span>
                    <span className="tnum text-[var(--text-primary)] font-bold">{formatCurrency(p.value ?? 0)}</span>
                </div>
            ))}
        </div>
    );
};

export default function ForecastSection({ forecast, history, compact = false }: Props) {
    const chartData = buildForecastChartData(history, forecast, 6);
    const now = forecast.currentNetWorth;

    const cards = [
        { label: '3 Months', value: forecast.normal.in3, ...delta(now, forecast.normal.in3) },
        { label: '6 Months', value: forecast.normal.in6, ...delta(now, forecast.normal.in6) },
        { label: '12 Months', value: forecast.normal.in12, ...delta(now, forecast.normal.in12) },
    ];

    return (
        <div className="space-y-6">
            {/* Projection Cards */}
            <div className="grid grid-cols-3 gap-3">
                {cards.map((c, idx) => (
                    <div
                        key={c.label}
                        className={cn(
                            "relative overflow-hidden border rounded-2xl p-4 text-center transition-all duration-300",
                            idx === 1 ? "bg-[var(--accent-soft)] border-[var(--accent)]/20" : "bg-white/[0.03] border-[var(--border-1)]"
                        )}
                    >
                        {idx === 1 && (
                            <div className="absolute top-0 right-0 p-1">
                                <TrendingUp className="w-3 h-3 text-[var(--accent)]/50" />
                            </div>
                        )}
                        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">{c.label}</p>
                        <p className="tnum text-[var(--text-primary)] font-bold text-base lg:text-lg">
                            {getCurrencySymbol()} {Math.round(c.value).toLocaleString()}
                        </p>
                        <p className={cn(
                            "tnum text-xs font-bold mt-1",
                            c.diff >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"
                        )}>
                            {c.diff >= 0 ? '+' : ''}{getCurrencySymbol()} {Math.round(c.diff).toLocaleString()}
                        </p>
                        <div className={cn(
                            "text-[10px] font-medium opacity-80",
                            c.diff >= 0 ? "text-[var(--accent)]/70" : "text-[var(--danger)]/70"
                        )}>
                            ({c.diff >= 0 ? '+' : ''}{c.pct}%)
                        </div>
                    </div>
                ))}
            </div>

            {/* Conservative / Optimistic labels */}
            {!compact && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-3">
                        <p className="text-[var(--text-tertiary)] font-bold uppercase tracking-widest text-[10px] mb-1">Conservative (12m)</p>
                        <p className="tnum text-[var(--text-primary)] font-bold">{formatCurrency(forecast.conservative.in12)}</p>
                        <p className="tnum text-[var(--text-tertiary)]">{formatCurrency(forecast.conservative.monthlySavings)}/mo</p>
                    </div>
                    <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/15 rounded-2xl p-3">
                        <p className="text-[var(--accent)] font-bold uppercase tracking-widest text-[10px] mb-1">Optimistic (12m)</p>
                        <p className="tnum text-[var(--text-primary)] font-bold">{formatCurrency(forecast.optimistic.in12)}</p>
                        <p className="tnum text-[var(--text-tertiary)]">{formatCurrency(forecast.optimistic.monthlySavings)}/mo</p>
                    </div>
                </div>
            )}

            {/* Chart */}
            {!compact && (
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8b8b94', fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#8b8b94', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `${getCurrencySymbol()}${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                                width={70}
                                domain={['dataMin * 0.8', 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area dataKey="actual" name="Actual" fill="rgba(46,230,166,0.08)" stroke="#2ee6a6" strokeWidth={2} dot={false} connectNulls />
                            <Line dataKey="conservative" name="Conservative" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                            <Line dataKey="normal" name="Normal" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls />
                            <Line dataKey="optimistic" name="Optimistic" stroke="#2ee6a6" strokeWidth={2} dot={false} connectNulls />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
