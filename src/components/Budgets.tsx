import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Target, SlidersHorizontal, PiggyBank, HardDrive } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, Skeleton } from '@/src/components/ui';
import { inputBaseClasses } from '@/src/components/ui/Input';
import { cn, formatCurrency, getCurrencySymbol } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  type Budget,
  type BudgetStatus,
  loadBudgets,
  saveBudgets,
  computeBudgetStatus,
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
  useEffect(() => {
    const refresh = () => setMonth(localMonthISO());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  useEffect(() => {
    if (user) setBudgets(loadBudgets(user.id));
  }, [user?.id]);

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

  return { user, month, categories, budgets, setBudgets, statuses, loading, fetchFailed };
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
  const { user, month, budgets, setBudgets, categories, statuses, loading, fetchFailed } = useBudgetData();
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

  const openEditor = () => {
    const next: Record<string, string> = {};
    for (const b of budgets) next[b.categoryId] = String(b.limit);
    setDraft(next);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!user) return;
    // Merge, never rebuild: budgets for categories absent from the current fetch
    // (failed request, type changed) must survive a save untouched — this
    // localStorage copy is the only copy.
    const known = new Set(expenseCategories.map((c: any) => String(c.id)));
    const next: Budget[] = budgets.filter(b => !known.has(String(b.categoryId)));
    for (const c of expenseCategories) {
      const raw = (draft[c.id] ?? '').trim();
      if (!raw) continue;
      const value = Number(raw);
      if (Number.isFinite(value) && value > 0) {
        next.push({ categoryId: String(c.id), limit: value });
      }
    }
    setBudgets(next); // optimistic — UI updates immediately
    saveBudgets(user.id, next);
    setEditOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-5 lg:space-y-6">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-72 rounded-[28px]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {budgets.length === 0 ? (
        <Card level={1} padding="lg">
          <EmptyState
            icon={Target}
            title="No budgets configured"
            description="Set monthly limits per category to keep your spending on track."
            action={
              <Button onClick={openEditor}>
                <SlidersHorizontal className="w-4 h-4" />
                Set budgets
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
        <HardDrive className="w-3 h-3" />
        Budgets are stored on this device.
      </p>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Set budgets"
        description="Monthly spending limits per category. Leave blank for no budget."
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
            {expenseCategories.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                <div className="relative w-36 shrink-0">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)] pointer-events-none">
                    {getCurrencySymbol()}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="—"
                    value={draft[c.id] ?? ''}
                    onChange={e => setDraft(prev => ({ ...prev, [c.id]: e.target.value }))}
                    className={cn(inputBaseClasses, 'pl-9 tnum')}
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
