import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Target, SlidersHorizontal, PiggyBank, Cloud, ChevronLeft, ChevronRight, CornerUpLeft, Copy } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, Skeleton, useToast } from '@/src/components/ui';
import { inputBaseClasses } from '@/src/components/ui/Input';
import { cn, formatCurrency, getCurrencySymbol } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  type Budget,
  type BudgetStatus,
  loadBudgets,
  fetchBudgets,
  pushBudgets,
  computeBudgetStatus,
  resolveBudgetsForMonth,
  hasOwnSheet,
  setMonthSheet,
  shiftMonth,
} from '@/src/lib/budgetEngine';

const EASE = [0.16, 1, 0.3, 1] as const;

const barColor: Record<BudgetStatus['state'], string> = {
  ok: 'bg-[var(--accent)]',
  warning: 'bg-[var(--gold)]',
  over: 'bg-[var(--danger)]',
};

const stateText: Record<BudgetStatus['state'], string> = {
  ok: 'text-[var(--accent)]',
  warning: 'text-[var(--gold)]',
  over: 'text-[var(--danger)]',
};

function ProgressBar({ status, delay = 0, thin = false }: { status: BudgetStatus; delay?: number; thin?: boolean }) {
  return (
    <div className={cn('w-full rounded-full bg-white/[0.06] overflow-hidden', thin ? 'h-1.5' : 'h-2')}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(status.pct, 100)}%` }}
        transition={{ duration: 0.8, ease: EASE, delay }}
        className={cn('h-full rounded-full', barColor[status.state])}
      />
    </div>
  );
}

// Local wall-clock month — transactions are stored as local datetime strings,
// so the budget window must be local too (UTC would misfile hours around month boundaries).
function localMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function useBudgetData() {
  const { user } = useAuth();
  const { fetchWithAuth } = useApi();
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  const [month, setMonth] = useState(localMonthISO);
  // Set once the user steps to another month, so the roll-over refresh below
  // doesn't drag them back to today while they're editing a future sheet.
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const refresh = () => { if (!pinned) setMonth(localMonthISO()); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [pinned]);

  const goToMonth = (next: string) => { setMonth(next); setPinned(next !== localMonthISO()); };

  // Paint from the local cache immediately, then reconcile with the account
  // copy. If the account has none but this device does, the device copy is
  // adopted and pushed up — that's the one-time migration off device-only
  // storage, and it must never be replaced by the server's empty default.
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    const cached = loadBudgets(userId);
    setBudgets(cached);

    (async () => {
      try {
        const remote = await fetchBudgets(fetchWithAuth, userId);
        if (cancelled) return;
        if (remote.length === 0 && cached.length > 0) {
          await pushBudgets(fetchWithAuth, userId, cached);
          if (!cancelled) setBudgets(cached);
        } else {
          setBudgets(remote);
        }
      } catch (err) {
        // Offline or API down — the cached copy above stays on screen.
        console.error('Could not load budgets from the account:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, fetchWithAuth]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchWithAuth('/api/categories').then(res => res.json()),
      fetchWithAuth('/api/transactions').then(res => res.json()),
    ])
      .then(([cats, txns]) => {
        if (cancelled) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setTransactions(Array.isArray(txns) ? txns : []);
        setFetchFailed(false);
      })
      .catch(err => {
        console.error('Error fetching budget data:', err);
        if (!cancelled) setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchWithAuth]);

  const statuses = useMemo(
    () => computeBudgetStatus(budgets, categories, transactions, month),
    [budgets, categories, transactions, month]
  );

  return { user, month, goToMonth, categories, budgets, setBudgets, statuses, loading, fetchFailed, fetchWithAuth };
}

/**
 * Compact top-N budget bars for embedding on the Dashboard.
 * Renders nothing while loading or when no budgets are configured.
 */
export function BudgetSummaryCard({ limit = 3 }: { limit?: number }) {
  const { budgets, statuses, loading } = useBudgetData();

  if (loading || budgets.length === 0 || statuses.length === 0) return null;

  const overCount = statuses.filter(s => s.state === 'over').length;
  const top = statuses.slice(0, limit);

  return (
    <Card level={1} padding="md">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
            <Target className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
            Budgets · This Month
          </p>
        </div>
        {overCount > 0 ? (
          <Badge tone="danger" trend="up">
            {overCount} over
          </Badge>
        ) : (
          <Badge tone="success">Under budget</Badge>
        )}
      </div>

      <div className="space-y-4">
        {top.map((s, i) => (
          <div key={s.categoryId}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-[var(--text-secondary)] truncate pr-3">{s.categoryName}</p>
              <p className="tnum text-xs font-bold text-[var(--text-primary)] shrink-0">
                {formatCurrency(s.spent)}
                <span className="text-[var(--text-tertiary)] font-medium"> / {formatCurrency(s.limit)}</span>
              </p>
            </div>
            <ProgressBar status={s} delay={i * 0.08} thin />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Budgets() {
  const { user, month, goToMonth, budgets, setBudgets, categories, statuses, loading, fetchFailed, fetchWithAuth } = useBudgetData();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const expenseCategories = useMemo(
    () => (categories || []).filter((c: any) => c?.type === 'expense'),
    [categories]
  );

  // Label derived from the same month key used for filtering, so they can never disagree
  const monthLabel = useMemo(
    () => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [month]
  );

  const totalLimit = statuses.reduce((sum, s) => sum + s.limit, 0);
  const totalSpent = statuses.reduce((sum, s) => sum + s.spent, 0);
  const totalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const totalRemaining = totalLimit - totalSpent;
  const overCount = statuses.filter(s => s.state === 'over').length;

  const overallState: BudgetStatus['state'] =
    totalSpent > totalLimit ? 'over' : totalPct >= 80 ? 'warning' : 'ok';

  // The sheet in force for the month on screen — either the month's own or the
  // one it inherits. Editing starts from whatever is actually being applied.
  const activeSheet = useMemo(() => resolveBudgetsForMonth(budgets, month), [budgets, month]);
  const monthIsAuthored = useMemo(() => hasOwnSheet(budgets, month), [budgets, month]);
  const isCurrentMonth = month === localMonthISO();

  // The month before the one on screen, and the sheet in force there — used by
  // the "copy from" action so a new month can start from last month's numbers.
  const prevMonth = shiftMonth(month, -1);
  const prevSheet = useMemo(() => resolveBudgetsForMonth(budgets, prevMonth), [budgets, prevMonth]);
  const prevMonthLabel = useMemo(
    () => new Date(`${prevMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [prevMonth]
  );

  const copyFromPrevious = () => {
    const next: Record<string, string> = {};
    for (const b of prevSheet) next[b.categoryId] = String(b.limit);
    setDraft(next);
  };

  const clearDraft = () => setDraft({});

  // Multi-character symbols (NPR, CHF...) need more room than a single glyph,
  // otherwise the prefix sits on top of the amount.
  const currencySymbol = getCurrencySymbol();
  const symbolPadding =
    currencySymbol.length >= 3 ? 'pl-14' : currencySymbol.length === 2 ? 'pl-12' : 'pl-9';

  const openEditor = () => {
    const next: Record<string, string> = {};
    for (const b of activeSheet) next[b.categoryId] = String(b.limit);
    setDraft(next);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    // Merge, never rebuild: limits for categories absent from the current fetch
    // (failed request, type changed) must survive a save untouched.
    const known = new Set(expenseCategories.map((c: any) => String(c.id)));
    const sheet: Budget[] = activeSheet.filter(b => !known.has(String(b.categoryId)));
    for (const c of expenseCategories) {
      const raw = (draft[c.id] ?? '').trim();
      if (!raw) continue;
      const value = Number(raw);
      if (Number.isFinite(value) && value > 0) {
        sheet.push({ categoryId: String(c.id), limit: value });
      }
    }
    // Only this month's sheet is replaced; other months keep theirs.
    const next = setMonthSheet(budgets, month, sheet);
    setBudgets(next); // optimistic — UI updates immediately
    setEditOpen(false);
    try {
      await pushBudgets(fetchWithAuth, user.id, next);
    } catch (err) {
      // pushBudgets already wrote the local cache, so the edit survives on this
      // device and will sync on the next successful save.
      console.error('Failed to save budgets to the account:', err);
      toast('Budgets saved on this device but could not reach your account. They will sync when you are back online.', { type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 lg:space-y-6">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-72 rounded-[28px]" />
      </div>
    );
  }

  const stepper = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => goToMonth(shiftMonth(month, -1))}
          aria-label="Previous month"
          className="p-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="min-w-[9.5rem] text-center text-sm font-bold text-[var(--text-primary)]">{monthLabel}</p>
        <button
          onClick={() => goToMonth(shiftMonth(month, 1))}
          aria-label="Next month"
          className="p-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isCurrentMonth && (
          <button
            onClick={() => goToMonth(localMonthISO())}
            className="ml-1 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-white hover:bg-white/5 transition-all"
          >
            <CornerUpLeft className="w-3 h-3" />
            This month
          </button>
        )}
      </div>
      {activeSheet.length > 0 && (
        monthIsAuthored
          ? <Badge tone="success">Budget set for this month</Badge>
          : <Badge tone="neutral">Carried forward</Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      {stepper}
      {activeSheet.length === 0 ? (
        <Card level={1} padding="lg">
          <EmptyState
            icon={Target}
            title={budgets.length === 0 ? 'No budgets configured' : `No budget for ${monthLabel}`}
            description={
              budgets.length === 0
                ? 'Set monthly limits per category to keep your spending on track.'
                : 'This month has no limits of its own and no earlier month to inherit from.'
            }
            action={
              <Button onClick={openEditor}>
                <SlidersHorizontal className="w-4 h-4" />
                Set budgets for {monthLabel}
              </Button>
            }
            bordered
          />
        </Card>
      ) : (
        <>
          {/* Month summary */}
          <Card level={1} padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
                  {monthLabel} · Total Budget
                </p>
                <p className="tnum text-3xl lg:text-4xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(totalSpent)}
                  <span className="text-[var(--text-tertiary)] text-lg lg:text-xl font-semibold">
                    {' '}of {formatCurrency(totalLimit)}
                  </span>
                </p>
                <p className={cn('text-sm font-semibold mt-2', stateText[overallState])}>
                  {totalRemaining >= 0
                    ? `${formatCurrency(totalRemaining)} left to spend`
                    : `${formatCurrency(Math.abs(totalRemaining))} over budget`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {overCount > 0 ? (
                  <Badge tone="danger" trend="up">
                    {overCount} {overCount === 1 ? 'category' : 'categories'} over
                  </Badge>
                ) : (
                  <Badge tone="success">On track</Badge>
                )}
                <Button variant="secondary" size="sm" onClick={openEditor}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Edit budgets
                </Button>
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(totalPct, 100)}%` }}
                transition={{ duration: 0.9, ease: EASE }}
                className={cn('h-full rounded-full', barColor[overallState])}
              />
            </div>
            <div className="flex justify-between mt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                {totalPct.toFixed(0)}% used
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                {statuses.length} {statuses.length === 1 ? 'budget' : 'budgets'}
              </p>
            </div>
          </Card>

          {/* Per-category breakdown */}
          <Card level={1} padding="lg">
            <h3 className="text-lg lg:text-xl font-bold text-[var(--text-primary)] mb-7">Category Budgets</h3>
            <div className="space-y-6">
              {statuses.map((s, i) => (
                <div key={s.categoryId}>
                  <div className="flex items-end justify-between mb-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{s.categoryName}</p>
                      <p className={cn('text-[11px] font-semibold mt-0.5', stateText[s.state])}>
                        {s.remaining >= 0
                          ? `${formatCurrency(s.remaining)} remaining`
                          : `${formatCurrency(Math.abs(s.remaining))} over`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="tnum text-sm font-bold text-[var(--text-primary)]">
                        {formatCurrency(s.spent)}
                        <span className="text-[var(--text-tertiary)] font-medium"> / {formatCurrency(s.limit)}</span>
                      </p>
                      <p className={cn('tnum text-[11px] font-bold mt-0.5', stateText[s.state])}>
                        {s.pct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <ProgressBar status={s} delay={i * 0.06} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
        <Cloud className="w-3 h-3" />
        Budgets are saved to your account and sync across devices.
      </p>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Set budgets — ${monthLabel}`}
        description="Limits per category for this month. They carry into later months until you set those months differently. Leave blank for no budget."
        footer={
          <div className="flex items-center justify-end gap-3">
            {fetchFailed && (
              <p className="mr-auto text-xs text-[var(--danger)]">Couldn't load categories — saving is disabled.</p>
            )}
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={expenseCategories.length === 0}>
              Save budgets
            </Button>
          </div>
        }
      >
        {expenseCategories.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No expense categories"
            description="Create expense categories in Settings first, then set budgets for them."
            bordered
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 pb-3 mb-1 border-b border-[var(--border-1)]">
              {prevSheet.length > 0 && (
                <Button variant="secondary" size="sm" onClick={copyFromPrevious}>
                  <Copy className="w-3.5 h-3.5" />
                  Copy from {prevMonthLabel}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearDraft}>
                Clear all
              </Button>
            </div>
            {expenseCategories.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                <div className="relative w-40 shrink-0">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)] pointer-events-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="—"
                    value={draft[c.id] ?? ''}
                    onChange={e => setDraft(prev => ({ ...prev, [c.id]: e.target.value }))}
                    className={cn(inputBaseClasses, symbolPadding, 'tnum')}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}


