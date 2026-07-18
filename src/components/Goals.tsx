import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Target, Plus, Pencil, Trash2, CalendarDays, Trophy, Landmark } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, Input, Skeleton } from '@/src/components/ui';
import { cn, formatCurrency } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  type Goal,
  loadGoals,
  saveGoals,
  computeGoalProgress,
  monthsToTarget,
  GOALS_UPDATED_EVENT,
} from '@/src/lib/goalEngine';

const EASE = [0.16, 1, 0.3, 1] as const;
const EMOJI_SUGGESTIONS = ['🎯', '🏠', '🚗', '✈️', '💍', '🎓', '🏝️', '💰'];

interface Account {
  id: string;
  name: string;
  type?: string;
  balance: number;
}

interface HistoryRow {
  month: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  netWorth: number;
}

// ---------- shared helpers ----------

function avgMonthlySavingsFrom(history: HistoryRow[]): number {
  const active = (history || []).filter(
    h => Number(h?.income || 0) !== 0 || Number(h?.expense || 0) !== 0
  );
  if (!active.length) return 0;
  return active.reduce((sum, h) => sum + Number(h?.savings || 0), 0) / active.length;
}

/** Fractional months from now until the given date (negative if past). */
function monthsUntilDate(dateStr?: string): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return null;
  return (t - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
}

function formatTargetDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function newGoalId(): string {
  return `goal_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- progress ring ----------

function ProgressRing({ pct, achieved, size = 72 }: { pct: number; achieved: boolean; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const color = achieved ? 'var(--gold)' : 'var(--accent)';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('tnum text-xs font-bold', achieved ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]')}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

// ---------- goal card ----------

function GoalCard({
  goal,
  accounts,
  avgMonthlySavings,
  onEdit,
  index,
}: {
  goal: Goal;
  accounts: Account[];
  avgMonthlySavings: number;
  onEdit: (goal: Goal) => void;
  index: number;
}) {
  const progress = computeGoalProgress(goal, accounts);
  const eta = monthsToTarget(goal, progress.current, avgMonthlySavings);
  const monthsLeft = monthsUntilDate(goal.targetDate);

  let paceBadge: React.ReactNode = null;
  if (progress.achieved) {
    paceBadge = (
      <Badge tone="gold">
        <Trophy className="w-3 h-3" />
        Achieved
      </Badge>
    );
  } else if (goal.targetDate && monthsLeft !== null) {
    if (monthsLeft <= 0) {
      paceBadge = <Badge tone="danger">Past due</Badge>;
    } else {
      const neededMonthly = progress.remaining / monthsLeft;
      const onTrack = avgMonthlySavings >= neededMonthly;
      paceBadge = onTrack
        ? <Badge tone="success" trend="up">On track</Badge>
        : <Badge tone="danger" trend="down">Behind</Badge>;
    }
  }

  const trackedLabel = goal.accountIds.length === 0
    ? 'Net worth'
    : `${goal.accountIds.length} account${goal.accountIds.length > 1 ? 's' : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: index * 0.05 }}
    >
      <Card
        level={1}
        padding="md"
        interactive
        className={cn('group h-full flex flex-col', progress.achieved && 'border-[var(--gold)]/30')}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0',
                progress.achieved ? 'bg-[var(--gold-soft)]' : 'bg-white/5'
              )}
            >
              {goal.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-[var(--text-primary)] font-bold text-sm truncate">{goal.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-0.5">
                {trackedLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => onEdit(goal)}
            aria-label={`Edit ${goal.name}`}
            className="p-2 rounded-xl bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] active:scale-95 transition-all lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 shrink-0"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-5 mt-6">
          <ProgressRing pct={progress.pct} achieved={progress.achieved} />
          <div className="min-w-0">
            <p className="tnum text-xl font-bold text-[var(--text-primary)]">
              {formatCurrency(progress.current)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              of <span className="tnum font-semibold text-[var(--text-secondary)]">{formatCurrency(goal.target)}</span>
            </p>
            {!progress.achieved && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                {eta !== null && eta > 0
                  ? `≈ ${eta} mo at current pace`
                  : `${formatCurrency(progress.remaining)} to go`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-5 pt-4 border-t border-[var(--border-1)]">
          {paceBadge}
          {goal.targetDate && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/5 text-[var(--text-secondary)]">
              <CalendarDays className="w-3 h-3" />
              {formatTargetDate(goal.targetDate)}
            </span>
          )}
          {!paceBadge && !goal.targetDate && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              No deadline
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ---------- goal form modal ----------

interface GoalFormState {
  name: string;
  emoji: string;
  target: string;
  targetDate: string;
  accountIds: string[];
}

const EMPTY_FORM: GoalFormState = { name: '', emoji: '🎯', target: '', targetDate: '', accountIds: [] };

// ---------- main page ----------

export default function Goals() {
  const { fetchWithAuth } = useApi();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalFormState>(EMPTY_FORM);

  useEffect(() => {
    fetchWithAuth('/api/accounts')
      .then(res => res.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching accounts:', err);
        setAccounts([]);
      });
    fetchWithAuth('/api/dashboard/history?months=12')
      .then(res => res.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching history:', err));
  }, [fetchWithAuth]);

  useEffect(() => {
    setGoals(loadGoals(user?.id));
  }, [user?.id]);

  const avgMonthlySavings = useMemo(() => avgMonthlySavingsFrom(history), [history]);

  const persist = useCallback((next: Goal[]) => {
    setGoals(next);
    saveGoals(user?.id, next);
  }, [user?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm({
      name: goal.name,
      emoji: goal.emoji,
      target: String(goal.target || ''),
      targetDate: goal.targetDate || '',
      accountIds: [...goal.accountIds],
    });
    setModalOpen(true);
  };

  const toggleAccount = (id: string) => {
    setForm(f => ({
      ...f,
      accountIds: f.accountIds.includes(id)
        ? f.accountIds.filter(a => a !== id)
        : [...f.accountIds, id],
    }));
  };

  const targetNum = Number(form.target);
  const formValid = form.name.trim().length > 0 && Number.isFinite(targetNum) && targetNum > 0;

  const handleSave = () => {
    if (!formValid) return;
    const goal: Goal = {
      id: editing?.id ?? newGoalId(),
      name: form.name.trim(),
      emoji: form.emoji.trim() || '🎯',
      target: targetNum,
      targetDate: form.targetDate || undefined,
      accountIds: form.accountIds,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    persist(editing ? goals.map(g => (g.id === editing.id ? goal : g)) : [...goals, goal]);
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!editing) return;
    persist(goals.filter(g => g.id !== editing.id));
    setModalOpen(false);
  };

  // Sort: active goals nearest completion first, achieved last.
  const sortedGoals = useMemo(() => {
    const list = accounts ? [...goals] : goals;
    if (!accounts) return list;
    return list.sort((a, b) => {
      const pa = computeGoalProgress(a, accounts);
      const pb = computeGoalProgress(b, accounts);
      if (pa.achieved !== pb.achieved) return pa.achieved ? 1 : -1;
      return pb.pct - pa.pct;
    });
  }, [goals, accounts]);

  if (accounts === null) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12 lg:pb-0 animate-pulse">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-12 w-36 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-[28px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section-level header — this component embeds inside the Budgets & Goals page */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">Savings Goals</h2>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Set targets, link accounts, and watch your progress.</p>
        </div>
        {goals.length > 0 && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <Card level={1} padding="lg">
          <EmptyState
            icon={Target}
            title="No savings goals yet"
            description="Create a goal to track progress toward the things that matter."
            action={
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Create your first goal
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {sortedGoals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                accounts={accounts}
                avgMonthlySavings={avgMonthlySavings}
                onEdit={openEdit}
                index={i}
              />
            ))}
          </div>
          <p className="text-[var(--text-tertiary)] text-xs">Goals are stored on this device.</p>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Goal' : 'New Goal'}
        description={editing ? 'Update your target or tracked accounts.' : 'Define a target and how to measure it.'}
        footer={
          <div className="flex items-center gap-3">
            {editing && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!formValid}>
              {editing ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Input
            label="Goal Name"
            placeholder="e.g. House down payment"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          <div className="space-y-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Emoji</span>
            <div className="flex items-center gap-2">
              <input
                value={form.emoji}
                onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                maxLength={4}
                aria-label="Goal emoji"
                className="w-14 h-12 text-center text-xl bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
              />
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_SUGGESTIONS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, emoji: em }))}
                    className={cn(
                      'w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all active:scale-90',
                      form.emoji === em
                        ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/40'
                        : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Input
            label="Target Amount"
            type="number"
            min="0"
            step="any"
            placeholder="25000"
            value={form.target}
            onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
          />

          <Input
            label="Target Date (Optional)"
            type="date"
            value={form.targetDate}
            onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
            hint="Used to tell you if you're on track at your current savings pace."
          />

          <div className="space-y-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Tracked Accounts</span>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, accountIds: [] }))}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border',
                  form.accountIds.length === 0
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30'
                    : 'bg-white/5 text-[var(--text-secondary)] border-transparent hover:bg-white/10'
                )}
              >
                <Landmark className="w-3.5 h-3.5" />
                Entire net worth
              </button>
              {accounts.map(acc => {
                const selected = form.accountIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => toggleAccount(acc.id)}
                    className={cn(
                      'px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border',
                      selected
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30'
                        : 'bg-white/5 text-[var(--text-secondary)] border-transparent hover:bg-white/10'
                    )}
                  >
                    {acc.name || 'Account'}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-[var(--text-tertiary)] block">
              Leave empty to measure the goal against your total net worth.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- dashboard summary card ----------

export function GoalSummaryCard() {
  const { fetchWithAuth } = useApi();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetchWithAuth('/api/accounts')
      .then(res => res.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching accounts:', err);
        setAccounts([]);
      });
  }, [fetchWithAuth]);

  useEffect(() => {
    const refresh = () => setGoals(loadGoals(user?.id));
    refresh();
    window.addEventListener(GOALS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(GOALS_UPDATED_EVENT, refresh);
  }, [user?.id]);

  const featured = useMemo(() => {
    if (!accounts || goals.length === 0) return null;
    const withProgress = goals.map(g => ({ goal: g, progress: computeGoalProgress(g, accounts) }));
    const active = withProgress
      .filter(g => !g.progress.achieved)
      .sort((a, b) => b.progress.pct - a.progress.pct);
    // Nearest-to-completion active goal; fall back to an achieved one.
    return active[0] || withProgress.sort((a, b) => b.progress.pct - a.progress.pct)[0] || null;
  }, [goals, accounts]);

  if (goals.length === 0 || !featured) return null;

  const { goal, progress } = featured;
  const barColor = progress.achieved ? 'var(--gold)' : 'var(--accent)';

  return (
    <Card level={1} padding="md">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0',
              progress.achieved ? 'bg-[var(--gold-soft)]' : 'bg-white/5'
            )}
          >
            {goal.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Savings Goal
            </p>
            <p className="text-[var(--text-primary)] font-bold text-sm truncate">{goal.name}</p>
          </div>
        </div>
        {progress.achieved ? (
          <Badge tone="gold">
            <Trophy className="w-3 h-3" />
            Achieved
          </Badge>
        ) : (
          <Badge tone="accent">{Math.round(progress.pct)}%</Badge>
        )}
      </div>

      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${progress.pct}%` }}
          transition={{ duration: 1, ease: EASE }}
        />
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="tnum text-sm font-bold text-[var(--text-primary)]">{formatCurrency(progress.current)}</p>
        <p className="tnum text-xs text-[var(--text-tertiary)]">of {formatCurrency(goal.target)}</p>
      </div>
    </Card>
  );
}
