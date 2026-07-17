// breakdownEngine.ts — client-side category breakdowns + CAGR/passive-income metrics.
// Works entirely off /api/transactions and /api/dashboard/history; no backend changes.

export interface CategoryTotal {
    name: string;
    total: number;
    count: number;
    pct: number;
}

export interface BreakdownResult {
    items: CategoryTotal[];
    total: number;
}

export function categoryBreakdown(transactions: any[], type: 'expense' | 'income'): BreakdownResult {
    const totals: Record<string, { total: number; count: number }> = {};
    let grand = 0;

    for (const t of transactions) {
        if (t.type !== type) continue;
        const amt = Number(t.amount || 0);
        if (!amt || amt <= 0) continue;
        const name = t.category_name || 'Uncategorized';
        if (!totals[name]) totals[name] = { total: 0, count: 0 };
        totals[name].total += amt;
        totals[name].count += 1;
        grand += amt;
    }

    const items = Object.entries(totals)
        .map(([name, v]) => ({
            name,
            total: v.total,
            count: v.count,
            pct: grand > 0 ? (v.total / grand) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

    return { items, total: grand };
}

// Salary is identified by category or note; everything else counted as passive/other income.
const isSalary = (t: any) =>
    (t.category_name || '').toLowerCase().includes('salary') ||
    (t.note || '').toLowerCase().includes('salary');

export interface NetWorthCAGR {
    cagr: number;
    months: number;
    start: number;
    end: number;
}

/**
 * Annualized growth of net worth over the available history window.
 * Uses the first month with a positive net worth as the baseline.
 */
export function computeNetWorthCAGR(history: any[]): NetWorthCAGR | null {
    const firstIdx = history.findIndex(h => Number(h.netWorth) > 0);
    if (firstIdx === -1 || firstIdx >= history.length - 1) return null;

    const start = Number(history[firstIdx].netWorth);
    const end = Number(history[history.length - 1].netWorth);
    const months = history.length - 1 - firstIdx;
    if (start <= 0 || end <= 0 || months < 1) return null;

    const cagr = (Math.pow(end / start, 12 / months) - 1) * 100;
    return { cagr, months, start, end };
}

export interface PassiveMetrics {
    salaryT12: number;
    passiveT12: number;
    passivePrev12: number;
    /** Trailing-12-month passive income as % of average net worth — the "return besides salary". */
    yieldPct: number | null;
    /** Year-over-year growth of passive income (this 12m vs previous 12m). */
    passiveGrowthPct: number | null;
    avgNetWorth: number;
}

export function computePassiveMetrics(allTransactions: any[], history: any[]): PassiveMetrics {
    const now = new Date();
    const cutoff12 = new Date(now);
    cutoff12.setMonth(now.getMonth() - 12);
    const cutoff24 = new Date(now);
    cutoff24.setMonth(now.getMonth() - 24);

    let salaryT12 = 0;
    let passiveT12 = 0;
    let passivePrev12 = 0;

    for (const t of allTransactions) {
        if (t.type !== 'income') continue;
        const amt = Number(t.amount || 0);
        if (!amt || amt <= 0) continue;
        const d = new Date(t.date);
        if (isNaN(d.getTime())) continue;

        if (d >= cutoff12) {
            if (isSalary(t)) salaryT12 += amt;
            else passiveT12 += amt;
        } else if (d >= cutoff24) {
            if (!isSalary(t)) passivePrev12 += amt;
        }
    }

    const nwValues = history.map(h => Number(h.netWorth || 0)).filter(v => v > 0);
    const avgNetWorth = nwValues.length ? nwValues.reduce((s, v) => s + v, 0) / nwValues.length : 0;

    const yieldPct = avgNetWorth > 0 && passiveT12 > 0 ? (passiveT12 / avgNetWorth) * 100 : null;
    const passiveGrowthPct = passivePrev12 > 0 ? ((passiveT12 - passivePrev12) / passivePrev12) * 100 : null;

    return { salaryT12, passiveT12, passivePrev12, yieldPct, passiveGrowthPct, avgNetWorth };
}
