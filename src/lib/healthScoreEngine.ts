// healthScoreEngine.ts — Financial Health Score (0-100) from deterministic rules
// No AI API — pure code calculations.

import type { MonthlyData } from './insightsEngine';

export interface HealthFactor {
    name: string;
    score: number;
    max: number;
    label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
    suggestion?: string;
}

export interface HealthScore {
    total: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    factors: HealthFactor[];
    suggestions: string[];
}

function avg(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const mean = avg(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

function factorLabel(score: number, max: number): HealthFactor['label'] {
    const ratio = score / max;
    if (ratio >= 0.85) return 'Excellent';
    if (ratio >= 0.6) return 'Good';
    if (ratio >= 0.35) return 'Fair';
    return 'Needs Attention';
}

export function computeHealthScore(
    history: MonthlyData[],
    accounts: { balance: number }[]
): HealthScore {
    const months = history.slice(-12);
    const factors: HealthFactor[] = [];
    const suggestions: string[] = [];

    // ---- 1. Savings Rate (30 pts) ----
    const latestMonth = months[months.length - 1];
    const currRate = latestMonth && latestMonth.income > 0
        ? (latestMonth.savings / latestMonth.income) * 100 : 0;
    const savingsScore = Math.min(30, Math.round((currRate / 30) * 30));
    factors.push({
        name: 'Savings Rate',
        score: savingsScore,
        max: 30,
        label: factorLabel(savingsScore, 30),
        suggestion: currRate < 20 ? 'Aim to save at least 20% of your monthly income.' : undefined,
    });
    if (currRate < 20) suggestions.push('Try to increase your savings rate to at least 20% of income.');

    // ---- 2. Expense Stability (20 pts) ----
    // Lower std deviation = more stable = higher score
    const expArr = months.map(m => m.expense).filter(e => e > 0);
    const expAvg = avg(expArr);
    const expStd = stdDev(expArr);
    const expStability = expAvg > 0 ? Math.max(0, 1 - (expStd / expAvg)) : 0;
    const expScore = Math.round(expStability * 20);
    factors.push({
        name: 'Expense Stability',
        score: expScore,
        max: 20,
        label: factorLabel(expScore, 20),
        suggestion: expScore < 10 ? 'Large expense swings detected. Try to budget more consistently.' : undefined,
    });
    if (expScore < 10) suggestions.push('Your expenses vary a lot month-to-month. Building a budget can help smooth this out.');

    // ---- 3. Income Consistency (20 pts) ----
    const incomeMonths = months.filter(m => m.income > 0).length;
    const incScore = Math.round((incomeMonths / Math.max(months.length, 1)) * 20);
    factors.push({
        name: 'Income Consistency',
        score: incScore,
        max: 20,
        label: factorLabel(incScore, 20),
        suggestion: incScore < 14 ? 'Several months had no income recorded. Track all income sources.' : undefined,
    });
    if (incScore < 14) suggestions.push('Track all income sources consistently for better financial visibility.');

    // ---- 4. Net Worth Trend (20 pts) ----
    let growthMonths = 0;
    for (let i = months.length - 1; i > 0; i--) {
        if (months[i].netWorth > months[i - 1].netWorth) growthMonths++;
        else break;
    }
    const trendScore = Math.min(20, Math.round((growthMonths / 6) * 20));
    factors.push({
        name: 'Net Worth Trend',
        score: trendScore,
        max: 20,
        label: factorLabel(trendScore, 20),
        suggestion: growthMonths === 0 ? 'Your net worth hasn\'t grown recently. Focus on reducing expenses.' : undefined,
    });
    if (growthMonths === 0) suggestions.push('Focus on growing your net worth by reducing expenses or increasing income.');

    // ---- 5. Account Health (10 pts) ----
    const negativeAccounts = accounts.filter(a => a.balance < 0).length;
    const accScore = negativeAccounts === 0 ? 10 : Math.max(0, 10 - negativeAccounts * 4);
    factors.push({
        name: 'Account Health',
        score: accScore,
        max: 10,
        label: factorLabel(accScore, 10),
        suggestion: negativeAccounts > 0 ? `${negativeAccounts} account(s) have negative balance.` : undefined,
    });
    if (negativeAccounts > 0) suggestions.push('Bring negative account balances to zero before building savings.');

    const total = Math.min(100, factors.reduce((s, f) => s + f.score, 0));
    const grade: HealthScore['grade'] =
        total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';

    return { total, grade, factors, suggestions };
}
