// insightsEngine.ts — Deterministic insight generation from monthly history
// No AI API — pure code-based template logic.

export interface MonthlyData {
    month: string;   // YYYY-MM
    label: string;
    income: number;
    expense: number;
    savings: number;
    netWorth: number;
}

export interface Insight {
    id: string;
    type: 'positive' | 'warning' | 'info';
    title: string;
    body: string;
    metric?: string;
}

function pct(a: number, b: number): number {
    if (b === 0) return a === 0 ? 0 : (a > 0 ? 100 : -100);
    return Math.round(((a - b) / Math.abs(b)) * 100);
}

function avg(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function generateInsights(history: MonthlyData[]): Insight[] {
    if (history.length < 2) return [];
    const insights: Insight[] = [];

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const last6 = history.slice(-6);
    const last3 = history.slice(-3);

    // ---- 1. Savings rate change ----
    const currRate = current.income > 0 ? (current.savings / current.income) * 100 : 0;
    const prevRate = previous.income > 0 ? (previous.savings / previous.income) * 100 : 0;
    const rateDelta = currRate - prevRate;
    if (rateDelta >= 5) {
        insights.push({
            id: 'savings-improved',
            type: 'positive',
            title: 'Savings Rate Improved',
            body: `Your savings rate went from ${prevRate.toFixed(1)}% to ${currRate.toFixed(1)}% — up ${rateDelta.toFixed(1)} points.`,
            metric: `${currRate.toFixed(1)}%`,
        });
    } else if (rateDelta <= -5) {
        insights.push({
            id: 'savings-declined',
            type: 'warning',
            title: 'Savings Rate Declined',
            body: `Your savings rate dropped from ${prevRate.toFixed(1)}% to ${currRate.toFixed(1)}%. Review expenses to protect your savings.`,
            metric: `${currRate.toFixed(1)}%`,
        });
    }

    // ---- 2. Expense change ----
    const expPct = pct(current.expense, previous.expense);
    if (expPct >= 20) {
        insights.push({
            id: 'expense-spike',
            type: 'warning',
            title: 'Expense Spike Detected',
            body: `Total expenses increased by ${expPct}% compared to last month. Check your spending categories.`,
            metric: `+${expPct}%`,
        });
    } else if (expPct <= -15) {
        insights.push({
            id: 'expense-reduced',
            type: 'positive',
            title: 'Expenses Reduced',
            body: `Great job! You spent ${Math.abs(expPct)}% less than last month.`,
            metric: `${expPct}%`,
        });
    }

    // ---- 3. Income change ----
    const incPct = pct(current.income, previous.income);
    if (incPct <= -20) {
        insights.push({
            id: 'income-drop',
            type: 'warning',
            title: 'Income Dropped',
            body: `Your income fell by ${Math.abs(incPct)}% compared to last month. Make sure this was expected.`,
            metric: `${incPct}%`,
        });
    } else if (incPct >= 20) {
        insights.push({
            id: 'income-increase',
            type: 'positive',
            title: 'Income Increased',
            body: `Your income grew ${incPct}% this month — great progress!`,
            metric: `+${incPct}%`,
        });
    }

    // ---- 4. Net worth consecutive growth ----
    let streak = 0;
    for (let i = history.length - 1; i > 0; i--) {
        if (history[i].netWorth > history[i - 1].netWorth) streak++;
        else break;
    }
    if (streak >= 3) {
        insights.push({
            id: 'nw-streak',
            type: 'positive',
            title: `Net Worth Growing for ${streak} Months`,
            body: `Your net worth has increased for ${streak} consecutive months — you're on a great trend.`,
            metric: `${streak}mo`,
        });
    }

    // ---- 5. Best / Worst savings month in recent history ----
    const savings6 = last6.map(m => m.savings);
    const maxSavings = Math.max(...savings6);
    const minSavings = Math.min(...savings6);
    if (current.savings === maxSavings && last6.length >= 4) {
        insights.push({
            id: 'best-savings',
            type: 'positive',
            title: 'Best Savings Month in 6 Months',
            body: `This month's savings are the highest in the last 6 months. Keep it up!`,
        });
    } else if (current.savings === minSavings && current.savings < 0 && last6.length >= 4) {
        insights.push({
            id: 'worst-savings',
            type: 'warning',
            title: 'Lowest Savings Month in 6 Months',
            body: `This month had the lowest savings in recent history. Consider reviewing large expenses.`,
        });
    }

    // ---- 6. Overspending (expenses > income) ----
    if (current.income > 0 && current.expense > current.income) {
        insights.push({
            id: 'overspending',
            type: 'warning',
            title: 'Overspending Alert',
            body: `Expenses exceeded income this month by $${(current.expense - current.income).toLocaleString()}. This reduces your net worth.`,
        });
    }

    // ---- 7. 6-month average savings vs current ----
    const avgSavings6 = avg(last6.map(m => m.savings));
    if (current.savings > avgSavings6 * 1.3 && avgSavings6 > 0) {
        insights.push({
            id: 'above-avg',
            type: 'positive',
            title: 'Above-Average Savings Month',
            body: `You saved ${Math.round((current.savings / avgSavings6 - 1) * 100)}% more than your 6-month average.`,
        });
    }

    // ---- 8. High savings rate reward ----
    if (currRate >= 30) {
        insights.push({
            id: 'high-savings-rate',
            type: 'positive',
            title: 'Excellent Savings Rate',
            body: `A ${currRate.toFixed(1)}% savings rate is well above the recommended 20% threshold. Outstanding discipline!`,
        });
    }

    return insights.slice(0, 8); // cap at 8
}
