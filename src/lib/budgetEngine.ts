// budgetEngine.ts — Pure budget helpers: persistence (localStorage) + status math.
// No React, no side effects beyond the explicit load/save functions.

export interface Budget {
    categoryId: string;
    limit: number;
    /**
     * 'YYYY-MM' the limit was set for. Absent means "the original, undated
     * budget" — kept so budgets saved before per-month support still apply.
     *
     * Resolution is per whole month, not per category: a month that has any
     * entries is authoritative for that month, and a month with none inherits
     * the most recent earlier month that does. So clearing a category in an
     * authored month really removes it, instead of silently falling back.
     */
    month?: string;
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
    if (candidate.month !== undefined && !isMonthKey(candidate.month)) return false;
    return (
        typeof candidate.categoryId === 'string' &&
        candidate.categoryId.length > 0 &&
        typeof candidate.limit === 'number' &&
        Number.isFinite(candidate.limit) &&
        candidate.limit > 0
    );
}

/** 'YYYY-MM' */
export function isMonthKey(v: unknown): v is string {
    return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/** Step a 'YYYY-MM' key by whole months. */
export function shiftMonth(monthISO: string, delta: number): string {
    const [y, m] = monthISO.split('-').map(Number);
    const d = new Date(y, (m - 1) + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Months that have their own budget sheet, oldest first. Undated entries are '' . */
export function budgetMonths(budgets: Budget[]): string[] {
    const keys = new Set<string>();
    for (const b of budgets || []) {
        if (isValidBudget(b)) keys.add(b.month || '');
    }
    return [...keys].sort();
}

/**
 * The budget sheet in force for `monthISO`: that month's own entries if it has
 * any, otherwise the most recent earlier sheet (undated entries being the
 * earliest of all). Returns [] when nothing has ever been set.
 */
export function resolveBudgetsForMonth(budgets: Budget[], monthISO: string): Budget[] {
    const valid = (budgets || []).filter(isValidBudget);
    if (valid.length === 0) return [];

    const bySheet = new Map<string, Budget[]>();
    for (const b of valid) {
        const key = b.month || '';
        const bucket = bySheet.get(key);
        if (bucket) bucket.push(b);
        else bySheet.set(key, [b]);
    }

    const applicable = [...bySheet.keys()].filter(k => k === '' || k <= monthISO).sort();
    if (applicable.length === 0) return [];
    return bySheet.get(applicable[applicable.length - 1]) || [];
}

/** Whether `monthISO` has a sheet of its own, as opposed to inheriting one. */
export function hasOwnSheet(budgets: Budget[], monthISO: string): boolean {
    return (budgets || []).some(b => isValidBudget(b) && (b.month || '') === monthISO);
}

/**
 * Replace the sheet for `monthISO` with `entries`, leaving every other month
 * untouched. Passing [] clears that month, so it inherits again.
 */
export function setMonthSheet(budgets: Budget[], monthISO: string, entries: Budget[]): Budget[] {
    const others = (budgets || []).filter(b => isValidBudget(b) && (b.month || '') !== monthISO);
    const stamped = entries
        .filter(isValidBudget)
        .map(b => ({ categoryId: b.categoryId, limit: b.limit, month: monthISO }));
    return [...others, ...stamped];
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

/**
 * Server persistence. The `user_settings.budgets` column is the authoritative
 * copy so budgets follow the account across devices; localStorage above is kept
 * as an offline cache for instant paint and as a fallback when the API is down.
 *
 * The fetcher is passed in rather than imported so this module stays free of
 * React and of any transport of its own.
 */
type Fetcher = (url: string, options?: RequestInit) => Promise<Response>;

const SETTINGS_URL = '/api/user/settings';

/** Reads the account copy and refreshes the local cache. Throws if the request fails. */
export async function fetchBudgets(fetchWithAuth: Fetcher, userId: string): Promise<Budget[]> {
    const res = await fetchWithAuth(SETTINGS_URL);
    const data = await res.json();
    const budgets = Array.isArray(data?.budgets) ? data.budgets.filter(isValidBudget) : [];
    saveBudgets(userId, budgets);
    return budgets;
}

/**
 * Writes the account copy. The local cache is updated first so an edit is never
 * lost to a failed request — the caller surfaces the error and the cache is
 * reconciled on the next successful fetch.
 */
export async function pushBudgets(fetchWithAuth: Fetcher, userId: string, budgets: Budget[]): Promise<void> {
    const clean = budgets.filter(isValidBudget);
    saveBudgets(userId, clean);
    await fetchWithAuth(SETTINGS_URL, {
        method: 'POST',
        body: JSON.stringify({ budgets: clean }),
    });
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
    for (const b of resolveBudgetsForMonth(budgets, monthISO)) {
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
