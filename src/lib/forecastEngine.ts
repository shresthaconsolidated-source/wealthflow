// forecastEngine.ts — Deterministic net worth forecast
// Uses historical monthly savings to project future net worth.

import type { MonthlyData } from './insightsEngine';

export interface Forecast {
    currentNetWorth: number;
    avgMonthlySavings: number;
    conservative: { in3: number; in6: number; in12: number; monthlySavings: number };
    normal: { in3: number; in6: number; in12: number; monthlySavings: number };
    optimistic: { in3: number; in6: number; in12: number; monthlySavings: number };
}

function avg(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function project(current: number, monthlySavings: number, months: number): number {
    return current + monthlySavings * months;
}

export function computeForecast(history: MonthlyData[]): Forecast | null {
    if (history.length < 2) return null;

    const currentNetWorth = history[history.length - 1].netWorth;
    const savings = history.map(m => m.savings);

    const avg12 = avg(savings.slice(-12));
    const avg6 = avg(savings.slice(-6));
    const avg3 = avg(savings.slice(-3));

    // Conservative: min of 3m and 12m (expect the worst recent trend)
    const conservativeSavings = Math.min(avg3, avg12);
    // Normal: 6-month average
    const normalSavings = avg6;
    // Optimistic: max of 3m average (recent momentum) and 6m average
    const optimisticSavings = Math.max(avg3, avg6);

    return {
        currentNetWorth,
        avgMonthlySavings: avg6,
        conservative: {
            monthlySavings: conservativeSavings,
            in3: project(currentNetWorth, conservativeSavings, 3),
            in6: project(currentNetWorth, conservativeSavings, 6),
            in12: project(currentNetWorth, conservativeSavings, 12),
        },
        normal: {
            monthlySavings: normalSavings,
            in3: project(currentNetWorth, normalSavings, 3),
            in6: project(currentNetWorth, normalSavings, 6),
            in12: project(currentNetWorth, normalSavings, 12),
        },
        optimistic: {
            monthlySavings: optimisticSavings,
            in3: project(currentNetWorth, optimisticSavings, 3),
            in6: project(currentNetWorth, optimisticSavings, 6),
            in12: project(currentNetWorth, optimisticSavings, 12),
        },
    };
}

/** Build a time-series array of projected net worth points for charting */
export function buildForecastChartData(
    history: MonthlyData[],
    forecast: Forecast,
    months: number = 6
) {
    const historicalPoints = history.slice(-6).map(m => ({
        label: m.label,
        actual: m.netWorth,
        conservative: undefined as number | undefined,
        normal: undefined as number | undefined,
        optimistic: undefined as number | undefined,
    }));

    const projectedPoints = [];
    const now = new Date();
    for (let i = 1; i <= months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        projectedPoints.push({
            label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            actual: undefined as number | undefined,
            conservative: forecast.conservative.in3 !== undefined
                ? project(forecast.currentNetWorth, forecast.conservative.monthlySavings, i)
                : undefined,
            normal: project(forecast.currentNetWorth, forecast.normal.monthlySavings, i),
            optimistic: project(forecast.currentNetWorth, forecast.optimistic.monthlySavings, i),
        });
    }

    return [...historicalPoints, ...projectedPoints];
}
