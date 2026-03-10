import React from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import type { Forecast } from '@/src/lib/forecastEngine';
import { buildForecastChartData } from '@/src/lib/forecastEngine';
import type { MonthlyData } from '@/src/lib/insightsEngine';
import {
    ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
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
        <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-zinc-400 mb-1 font-bold">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-zinc-300">{p.name}:</span>
                    <span className="text-white font-bold">{formatCurrency(p.value ?? 0)}</span>
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
                {cards.map(c => (
                    <div key={c.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{c.label}</p>
                        <p className="text-white font-bold text-base lg:text-lg">{formatCurrency(c.value)}</p>
                        <p className={cn(
                            "text-xs font-bold mt-1",
                            c.diff >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                            {c.diff >= 0 ? '+' : ''}{formatCurrency(c.diff)} ({c.diff >= 0 ? '+' : ''}{c.pct}%)
                        </p>
                    </div>
                ))}
            </div>

            {/* Conservative / Optimistic labels */}
            {!compact && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3">
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1">Conservative (12m)</p>
                        <p className="text-white font-bold">{formatCurrency(forecast.conservative.in12)}</p>
                        <p className="text-zinc-500">{formatCurrency(forecast.conservative.monthlySavings)}/mo</p>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3">
                        <p className="text-emerald-500 font-bold uppercase tracking-widest text-[10px] mb-1">Optimistic (12m)</p>
                        <p className="text-white font-bold">{formatCurrency(forecast.optimistic.in12)}</p>
                        <p className="text-zinc-500">{formatCurrency(forecast.optimistic.monthlySavings)}/mo</p>
                    </div>
                </div>
            )}

            {/* Chart */}
            {!compact && (
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={40} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area dataKey="actual" name="Actual" fill="rgba(52,211,153,0.08)" stroke="#34D399" strokeWidth={2} dot={false} connectNulls />
                            <Line dataKey="conservative" name="Conservative" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                            <Line dataKey="normal" name="Normal" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls />
                            <Line dataKey="optimistic" name="Optimistic" stroke="#34D399" strokeWidth={2} dot={false} connectNulls />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
