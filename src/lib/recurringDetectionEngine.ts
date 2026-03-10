// recurringDetectionEngine.ts — Detects recurring transactions by pattern
// No AI API — pure code grouping and cadence detection.

export interface Transaction {
    id: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    date: string;
    note?: string;
    category_name?: string;
}

export interface RecurringItem {
    id: string;
    label: string;
    amount: number;
    category?: string;
    type: 'income' | 'expense';
    months: string[]; // YYYY-MM keys where it appeared
    count: number;
    isMonthly: boolean;
    estimatedNext?: string; // YYYY-MM
}

export interface RecurringResult {
    recurringExpenses: RecurringItem[];
    recurringIncome: RecurringItem[];
    estimatedMonthlyTotal: number;
}

function bucketKey(amount: number): string {
    // Group amounts within ±10% into same bucket
    const bucket = Math.round(amount / 50) * 50;
    return String(bucket);
}

function labelFor(tx: Transaction): string {
    return (tx.note?.trim() || tx.category_name || 'Unknown').toLowerCase().slice(0, 40);
}

function areMonthsMonthly(months: string[]): boolean {
    if (months.length < 2) return false;
    const sorted = [...months].sort();
    let consecutiveGaps = 0;
    for (let i = 1; i < sorted.length; i++) {
        const [ay, am] = sorted[i - 1].split('-').map(Number);
        const [by, bm] = sorted[i].split('-').map(Number);
        const gap = (by - ay) * 12 + (bm - am);
        if (gap === 1) consecutiveGaps++;
    }
    return consecutiveGaps >= sorted.length - 2; // allow 1 miss
}

export function detectRecurring(transactions: Transaction[]): RecurringResult {
    if (!transactions.length) return { recurringExpenses: [], recurringIncome: [], estimatedMonthlyTotal: 0 };

    // Group by label + bucket
    const groups: Record<string, { txs: Transaction[]; months: Set<string> }> = {};

    for (const tx of transactions) {
        if (tx.type === 'transfer') continue;
        const key = `${labelFor(tx)}_${bucketKey(tx.amount)}`;
        if (!groups[key]) groups[key] = { txs: [], months: new Set() };
        groups[key].txs.push(tx);
        groups[key].months.add(tx.date.slice(0, 7));
    }

    const recurringExpenses: RecurringItem[] = [];
    const recurringIncome: RecurringItem[] = [];

    for (const [key, { txs, months }] of Object.entries(groups)) {
        if (months.size < 2) continue; // must appear in at least 2 months

        const monthsArr = [...months].sort();
        const isMonthly = areMonthsMonthly(monthsArr);
        if (!isMonthly && months.size < 3) continue; // non-monthly needs 3+ occurrences

        const representative = txs[0];
        const avgAmount = txs.reduce((s, t) => s + t.amount, 0) / txs.length;

        // Estimate next occurrence
        const lastMonth = monthsArr[monthsArr.length - 1];
        const [ly, lm] = lastMonth.split('-').map(Number);
        const nextYear = lm === 12 ? ly + 1 : ly;
        const nextMonth = lm === 12 ? 1 : lm + 1;
        const estimatedNext = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

        const item: RecurringItem = {
            id: key,
            label: txs[0].note?.trim() || txs[0].category_name || 'Unknown',
            amount: Math.round(avgAmount),
            category: txs[0].category_name,
            type: representative.type as 'income' | 'expense',
            months: monthsArr,
            count: months.size,
            isMonthly,
            estimatedNext,
        };

        if (representative.type === 'expense') recurringExpenses.push(item);
        else if (representative.type === 'income') recurringIncome.push(item);
    }

    // Sort by amount desc
    recurringExpenses.sort((a, b) => b.amount - a.amount);
    recurringIncome.sort((a, b) => b.amount - a.amount);

    const estimatedMonthlyTotal = recurringExpenses.reduce((s, r) => s + r.amount, 0);

    return { recurringExpenses, recurringIncome, estimatedMonthlyTotal };
}
