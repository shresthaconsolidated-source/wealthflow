// budgetEngine.ts — Pure budget helpers: persistence (localStorage) + status math.
// No React, no side effects beyond the explicit load/save functions.

export interface Budget {
    categoryId: string;
    limit: number;
}

export type BudgetState = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
    categoryId: string;
    categoryName: string;
    limit: number;
    spent: number;
    /** Percent of limit spent, 0-100+ (not capped). */
    pct: number;
    /** limit - spent; negative when over budget. */
    remaining: number;
    state: BudgetState;
}

/** Minimal structural shapes — API rows (any) satisfy these. */
export interface BudgetCategory {
    id: string;
    name: string;
    type?: string; // 'income' | 'expense'
}

export interface BudgetTransaction {
    type?: string;               // 'income' | 'expense' | 'transfer'
    amount?: number | string;
    date?: string;               // ISO-ish, starts with YYYY-MM
    category_id?: string | null;
}

const WARNING_THRESHOLD = 80; // percent

const storageKey = (userId: string) => `wf_budgets_${userId}`;

function isValidBudget(b: unknown): b is Budget {
    if (!b || typeof b !== 'object') return false;
    const candidate = b as Record<string, unknown>;
    return (
        typeof candidate.categoryId === 'string' &&
        candidate.categoryId.length > 0 &&
        typeof candidate.limit === 'number' &&
        Number.isFinite(candidate.limit) &&
        candidate.limit > 0
    );
}

export function loadBudgets(userId: string): Budget[] {
    if (typeof window === 'undefined' || !userId) return [];
    try {
        const raw = localStorage.getItem(storageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isValidBudget);
    } catch {
        return [];
    }
}

export function saveBudgets(userId: string, budgets: Budget[]): void {
    if (typeof window === 'undefined' || !userId) return;
    try {
        localStorage.setItem(storageKey(userId), JSON.stringify(budgets.filter(isValidBudget)));
    } catch {
        // Storage full / unavailable — budgets stay in memory for this session.
    }
}

function stateFor(spent: number, limit: number, pct: number): BudgetState {
    if (spent > limit) return 'over';
    if (pct >= WARNING_THRESHOLD) return 'warning';
    return 'ok';
}

/**
 * Sums the month's expense transactions per category and joins them against
 * the configured budgets. Budgets whose category no longer exists are dropped.
 * Result is sorted most-consumed first (pct desc).
 *
 * @param monthISO 'YYYY-MM'
 */
export function computeBudgetStatus(
    budgets: Budget[],
    categories: BudgetCategory[],
    transactions: BudgetTransaction[],
    monthISO: string
): BudgetStatus[] {
    const categoryById = new Map<string, BudgetCategory>();
    for (const c of categories || []) {
        if (c && c.id != null) categoryById.set(String(c.id), c);
    }

    const spentByCategory = new Map<string, number>();
    for (const t of transactions || []) {
        if (!t || t.type !== 'expense' || !t.category_id) continue;
        if (String(t.date || '').slice(0, 7) !== monthISO) continue;
        const amount = Number(t.amount);
        if (!Number.isFinite(amount)) continue;
        const key = String(t.category_id);
        spentByCategory.set(key, (spentByCategory.get(key) || 0) + amount);
    }

    const statuses: BudgetStatus[] = [];
    for (const b of budgets || []) {
        if (!isValidBudget(b)) continue;
        const category = categoryById.get(b.categoryId);
        if (!category) continue; // category was deleted — orphaned budget
        const spent = spentByCategory.get(b.categoryId) || 0;
        const pct = (spent / b.limit) * 100;
        statuses.push({
            categoryId: b.categoryId,
            categoryName: category.name || 'Category',
            limit: b.limit,
            spent,
            pct,
            remaining: b.limit - spent,
            state: stateFor(spent, b.limit, pct),
        });
    }

    return statuses.sort((a, b) => b.pct - a.pct);
}
