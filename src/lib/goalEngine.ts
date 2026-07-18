// goalEngine.ts — Savings Goals: types, localStorage persistence, progress math.
// Pure, defensive helpers — no AI, no network.

export interface Goal {
    id: string;
    name: string;
    emoji: string;
    target: number;
    /** ISO date (YYYY-MM-DD). Optional deadline. */
    targetDate?: string;
    /** Account ids the goal tracks. Empty array = track total net worth. */
    accountIds: string[];
    /** ISO timestamp of creation. */
    createdAt: string;
}

export interface GoalProgress {
    current: number;
    /** 0–100, capped at 100. */
    pct: number;
    /** Amount still needed (never negative). */
    remaining: number;
    achieved: boolean;
}

export interface AccountLike {
    id: string;
    balance: number | string;
}

/** Fired on window whenever saveGoals persists, so other mounted views can refresh. */
export const GOALS_UPDATED_EVENT = 'wf-goals-updated';

const storageKey = (userId: string) => `wf_goals_${userId}`;

function toFiniteNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/** Coerce unknown stored data into a valid Goal, or null if unusable. */
function sanitizeGoal(raw: unknown): Goal | null {
    if (!raw || typeof raw !== 'object') return null;
    const g = raw as Record<string, unknown>;
    if (typeof g.id !== 'string' || !g.id) return null;
    const name = typeof g.name === 'string' ? g.name : '';
    if (!name) return null;

    return {
        id: g.id,
        name,
        emoji: typeof g.emoji === 'string' && g.emoji ? g.emoji : '🎯',
        target: Math.max(0, toFiniteNumber(g.target)),
        targetDate: typeof g.targetDate === 'string' && g.targetDate ? g.targetDate : undefined,
        accountIds: Array.isArray(g.accountIds)
            ? g.accountIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
            : [],
        createdAt: typeof g.createdAt === 'string' && g.createdAt ? g.createdAt : new Date(0).toISOString(),
    };
}

/** Load goals for a user from localStorage. Always returns an array. */
export function loadGoals(userId: string | undefined | null): Goal[] {
    if (!userId || typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(storageKey(userId));
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(sanitizeGoal)
            .filter((g): g is Goal => g !== null);
    } catch {
        return [];
    }
}

/** Persist goals for a user. Silently no-ops when storage is unavailable. */
export function saveGoals(userId: string | undefined | null, goals: Goal[]): void {
    if (!userId || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(Array.isArray(goals) ? goals : []));
        window.dispatchEvent(new CustomEvent(GOALS_UPDATED_EVENT));
    } catch {
        // storage full / unavailable — nothing sensible to do
    }
}

/**
 * Compute progress of a goal against the current account balances.
 * Empty goal.accountIds means the goal tracks total net worth (sum of all accounts).
 * Missing accounts and non-numeric balances are ignored/coerced.
 */
export function computeGoalProgress(goal: Goal, accounts: AccountLike[]): GoalProgress {
    const list = Array.isArray(accounts) ? accounts : [];
    const ids = Array.isArray(goal?.accountIds) ? goal.accountIds : [];

    const tracked = ids.length === 0
        ? list
        : list.filter(a => a && ids.includes(a.id));

    const current = tracked.reduce((sum, a) => sum + toFiniteNumber(a?.balance), 0);
    const target = Math.max(0, toFiniteNumber(goal?.target));

    const pct = target > 0
        ? Math.min(100, Math.max(0, (current / target) * 100))
        : 0;
    const remaining = Math.max(0, target - current);
    const achieved = target > 0 && current >= target;

    return { current, pct, remaining, achieved };
}

/**
 * Months until the goal is reached at the current average monthly savings pace.
 * Returns 0 when already achieved, null when the pace is zero/negative/unknown.
 */
export function monthsToTarget(
    goal: Goal,
    current: number,
    avgMonthlySavings: number
): number | null {
    const target = Math.max(0, toFiniteNumber(goal?.target));
    const cur = toFiniteNumber(current);
    const pace = toFiniteNumber(avgMonthlySavings);

    const remaining = target - cur;
    if (remaining <= 0) return 0;
    if (pace <= 0) return null;

    return Math.ceil(remaining / pace);
}
