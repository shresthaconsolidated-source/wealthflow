import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, CheckCircle, Edit3, X, AlertTriangle } from 'lucide-react';
import { parseTransactionMessage, type ParsedTransaction } from '@/src/lib/transactionParser';
import { QUICK_ACTIONS, type QuickAction } from '@/src/lib/quickEntryConfig';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Modal } from '@/src/components/ui';

interface Props {
  accounts: any[];
  categories: any[];
  transactions?: any[];
  onConfirm: (data: any) => Promise<void>;
  onEditManual: (type: 'income' | 'expense' | 'transfer', data?: any) => void;
  onNavigate: () => void;
}

const TYPE_LABELS = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

const TYPE_TEXT: Record<string, string> = {
  income: 'text-[var(--accent)]',
  expense: 'text-[var(--danger)]',
  transfer: 'text-blue-400',
};

const TYPE_BG: Record<string, string> = {
  income: 'bg-[var(--accent-soft)] border-[var(--accent)]/20',
  expense: 'bg-[var(--danger-soft)] border-[var(--danger)]/20',
  transfer: 'bg-blue-500/10 border-blue-500/20',
};

const TYPE_BADGE: Record<string, string> = {
  income: 'bg-[var(--accent)]/20 text-[var(--accent)]',
  expense: 'bg-[var(--danger)]/20 text-[var(--danger)]',
  transfer: 'bg-blue-500/20 text-blue-400',
};

export default function SmartTransactionInput({ accounts, categories, transactions, onConfirm, onEditManual }: Props) {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [quickAction, setQuickAction] = useState<QuickAction | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickAccount, setQuickAccount] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Clarification state — holds fields that need user input before saving
  const [clarifyData, setClarifyData] = useState<{
    parsed: ParsedTransaction;
    resolvedCategoryId: string;
    resolvedFromId: string;
    resolvedToId: string;
    needCategory: boolean;
    needFrom: boolean;
    needTo: boolean;
  } | null>(null);

  // Compute dynamic quick actions
  const dynamicActions = React.useMemo(() => {
    // 1. Identify pinned actions
    const pinnedIds = ['salary', 'transfer'];
    const pinnedActions = QUICK_ACTIONS.filter(a => pinnedIds.includes(a.id));
    const availableSlots = 9 - pinnedActions.length; // usually 7

    // 2. Compute frequencies of expense notes from transactions
    const noteFrequencies: Record<string, { count: number, latestDate: string }> = {};
    if (transactions) {
      transactions.forEach(t => {
        if (t.type === 'expense' && t.note) {
          const rawNote = t.note.trim();
          const noteKey = rawNote.toLowerCase();

          // Only track reasonably short notes to avoid absurdly long buttons
          if (noteKey.length > 0 && noteKey.length <= 20) {
              if (!noteFrequencies[noteKey]) {
                noteFrequencies[noteKey] = { count: 0, latestDate: t.date };
              }
              noteFrequencies[noteKey].count += 1;
              if (t.date > noteFrequencies[noteKey].latestDate) {
                  noteFrequencies[noteKey].latestDate = t.date;
              }
          }
        }
      });
    }

    // 3. Filter for frequently used notes (e.g. >= 2 times) and sort by count/recency
    const frequentNotes = Object.entries(noteFrequencies)
      .filter(([_, stats]) => stats.count >= 2)
      .sort((a, b) => b[1].count - a[1].count || new Date(b[1].latestDate).getTime() - new Date(a[1].latestDate).getTime())
      .map(([noteKey]) => noteKey);

    // 4. Build custom actions based on frequent notes
    const customActions: QuickAction[] = [];
    const usedDefaultIds = new Set(pinnedIds);

    for (const note of frequentNotes) {
      if (customActions.length >= availableSlots) break;

      // Check if a default action perfectly matches this note (case-insensitive)
      const matchingDefault = QUICK_ACTIONS.find(a => !usedDefaultIds.has(a.id) && a.label.toLowerCase() === note);

      if (matchingDefault) {
        customActions.push(matchingDefault);
        usedDefaultIds.add(matchingDefault.id);
      } else {
        // Create a generic action for this note
        // Attempt to auto-categorize based on keyword matching
        const baseCategory = categories?.find(c => c.type === 'expense' && c.name?.toLowerCase().includes(note))?.name || 'misc';
        customActions.push({
          id: `custom-${note}`,
          label: note.charAt(0).toUpperCase() + note.slice(1),
          emoji: '✨', // Generic emoji for custom history entries
          type: 'expense',
          categoryKeyword: baseCategory,
          color: 'zinc',
        });
      }
    }

    // 5. Backfill with unused default actions to maintain exactly 9 buttons
    const backfillActions: QuickAction[] = [];
    for (const action of QUICK_ACTIONS) {
      if (customActions.length + backfillActions.length >= availableSlots) break;
      if (!usedDefaultIds.has(action.id) && action.type === 'expense') {
        backfillActions.push(action);
        usedDefaultIds.add(action.id);
      }
    }

    // Combine all
    return [...customActions, ...backfillActions, ...pinnedActions];
  }, [transactions, categories]);

  useEffect(() => {
    if (input.trim().length > 2) {
      const result = parseTransactionMessage(input, accounts, categories);
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [input, accounts, categories]);

  const resolveAccount = (name?: string) =>
    name ? accounts.find(a => a.name?.toLowerCase() === name?.toLowerCase()) : undefined;

  const resolveCategory = (keyword?: string, type?: string) => {
    if (!keyword) return undefined;
    return categories?.find(c =>
      c.type === type && (c.name?.toLowerCase().includes(keyword.toLowerCase()))
    );
  };

  const handleConfirmParsed = async () => {
    if (!parsed || saving) return;

    const fromAcc = resolveAccount(parsed.from_account_name);
    const toAcc = resolveAccount(parsed.to_account_name);
    const cat = resolveCategory(parsed.category_keyword, parsed.type);

    // Determine what's uncertain / missing
    const needCategory = parsed.type !== 'transfer' && !cat;
    const needFrom = (parsed.type === 'expense' || parsed.type === 'transfer') && !fromAcc;
    const needTo = (parsed.type === 'income' || parsed.type === 'transfer') && !toAcc;
    // Ambiguous if parsed confidence is low OR if anything essential is missing
    const isAmbiguous = parsed.confidence === 'low' || needCategory || needFrom || needTo;

    if (isAmbiguous) {
      setClarifyData({
        parsed,
        resolvedCategoryId: cat?.id || '',
        resolvedFromId: fromAcc?.id || '',
        resolvedToId: toAcc?.id || '',
        needCategory,
        needFrom,
        needTo,
      });
      return;
    }

    await doSave({
      type: parsed.type, amount: parsed.amount, note: parsed.note, date: parsed.date,
      from_account_id: fromAcc?.id || '', to_account_id: toAcc?.id || '', category_id: cat?.id || '',
    });
  };

  const doSave = async (data: any) => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm(data);
      // Reset everything on success
      setInput('');
      setParsed(null);
      setClarifyData(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to save transaction:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClarifyConfirm = async (updates: Partial<typeof clarifyData>) => {
    if (!clarifyData || saving) return;

    // Merge updates into the current state
    const newData = { ...clarifyData, ...updates };

    // Check if we still need anything
    const stillNeedCategory = newData.parsed.type !== 'transfer' && !newData.resolvedCategoryId;
    const stillNeedFrom = (newData.parsed.type === 'expense' || newData.parsed.type === 'transfer') && !newData.resolvedFromId;
    const stillNeedTo = (newData.parsed.type === 'income' || newData.parsed.type === 'transfer') && !newData.resolvedToId;

    if (stillNeedCategory || stillNeedFrom || stillNeedTo) {
      setClarifyData(newData);
      return;
    }

    // If everything is resolved, save
    await doSave({
      type: newData.parsed.type,
      amount: newData.parsed.amount,
      note: newData.parsed.note,
      date: newData.parsed.date,
      category_id: newData.resolvedCategoryId,
      from_account_id: newData.resolvedFromId,
      to_account_id: newData.resolvedToId,
    });
  };

  const handleEditParsed = () => {
    if (!parsed) return;
    onEditManual(parsed.type, {
      type: parsed.type,
      amount: parsed.amount,
      note: parsed.note,
      date: parsed.date,
      from_account_id: resolveAccount(parsed.from_account_name)?.id || '',
      to_account_id: resolveAccount(parsed.to_account_name)?.id || '',
      category_id: resolveCategory(parsed.category_keyword, parsed.type)?.id || '',
    });
    setInput('');
    setParsed(null);
  };

  const handleQuickConfirm = async () => {
    if (!quickAction || !quickAmount) return;
    setSaving(true);
    try {
      const amount = parseFloat(quickAmount);
      if (isNaN(amount) || amount <= 0) return;
      const cat = resolveCategory(quickAction.categoryKeyword, quickAction.type);
      const acc = accounts.find(a => a.id === quickAccount) || accounts[0];
      await onConfirm({
        type: quickAction.type,
        amount,
        note: quickNote || quickAction.label,
        date: new Date().toISOString().slice(0, 10),
        from_account_id: quickAction.type === 'income' ? '' : acc?.id || '',
        to_account_id: quickAction.type === 'income' ? acc?.id || '' : '',
        category_id: cat?.id || '',
      });
      setQuickAction(null);
      setQuickAmount('');
      setQuickNote('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch { /* handled */ }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* --- Text Input Bar --- */}
      <div>
        <div className="flex items-center gap-3 bg-[var(--surface-1)] border border-[var(--border-2)] rounded-2xl px-4 py-3.5 focus-within:border-[var(--accent)]/40 focus-within:ring-2 focus-within:ring-[var(--accent-ring)] transition-all">
          <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && parsed) handleConfirmParsed(); }}
            placeholder='Try: "lunch 450" or "salary 120000 to main bank"…'
            className="flex-1 min-w-0 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
          {input && (
            <button onClick={() => { setInput(''); setParsed(null); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={parsed ? handleConfirmParsed : undefined}
            disabled={!parsed || saving}
            className={cn(
              "p-2 rounded-lg transition-all shrink-0",
              parsed ? "bg-[var(--accent)] text-[#04140e]" : "text-[var(--text-tertiary)]"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Parse preview — sits in normal flow so it never covers quick-entry below on mobile */}
        <AnimatePresence>
          {parsed && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className={cn("rounded-2xl border p-4", TYPE_BG[parsed.type])}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", TYPE_BADGE[parsed.type])}>
                        {TYPE_LABELS[parsed.type]}
                      </span>
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full",
                        parsed.confidence === 'high' ? "bg-[var(--accent-soft)] text-[var(--accent)]" :
                          parsed.confidence === 'medium' ? "bg-[var(--gold-soft)] text-[var(--gold)]" :
                            "bg-white/5 text-[var(--text-tertiary)]"
                      )}>
                        {parsed.confidence} confidence
                      </span>
                    </div>
                    <p className="tnum text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(parsed.amount)}</p>
                    <div className="text-xs text-[var(--text-secondary)] flex flex-wrap gap-x-3 gap-y-1">
                      {parsed.note && <span>📝 {parsed.note}</span>}
                      {parsed.category_keyword && <span>🏷️ {parsed.category_keyword}</span>}
                      {parsed.from_account_name && <span>From {parsed.from_account_name}</span>}
                      {parsed.to_account_name && <span>To {parsed.to_account_name}</span>}
                      <span>📅 {parsed.date}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleConfirmParsed}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-[#04140e] text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {saving ? '…' : 'Confirm'}
                    </button>
                    <button
                      onClick={handleEditParsed}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-[var(--text-primary)] text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-[var(--accent)] text-sm font-medium px-2"
          >
            <CheckCircle className="w-4 h-4" />
            Transaction saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Quick Action Buttons --- */}
      <div>
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">Quick Entry</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {dynamicActions.map(action => (
            <button
              key={action.id}
              onClick={() => { setQuickAction(action); setQuickAmount(''); setQuickNote(''); setQuickAccount(accounts[0]?.id || ''); }}
              className="group flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-1)] hover:border-[var(--border-2)] hover:bg-white/[0.05] active:scale-95 transition-all text-center"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{action.emoji}</span>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors truncate max-w-full">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Quick Entry Sheet --- */}
      <Modal open={!!quickAction} onClose={() => setQuickAction(null)}>
        {quickAction && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{quickAction.emoji}</span>
                <div>
                  <h3 className="text-[var(--text-primary)] font-bold text-lg">{quickAction.label}</h3>
                  <span className={cn("text-xs font-bold uppercase tracking-widest", TYPE_TEXT[quickAction.type])}>
                    {TYPE_LABELS[quickAction.type]}
                  </span>
                </div>
              </div>
              <button onClick={() => setQuickAction(null)} className="p-2 rounded-xl bg-white/5 text-[var(--text-tertiary)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold text-lg">{getCurrencySymbol()}</span>
                  <input
                    autoFocus
                    type="number"
                    placeholder="0.00"
                    value={quickAmount}
                    onChange={e => setQuickAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickConfirm(); }}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl pl-10 pr-4 py-4 text-[var(--text-primary)] text-xl font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Account</label>
                <select
                  value={quickAccount}
                  onChange={e => setQuickAccount(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] [&>option]:bg-[var(--surface-2)]"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Note (optional)</label>
                <input
                  type="text"
                  placeholder={`e.g. ${quickAction.label}…`}
                  value={quickNote}
                  onChange={e => setQuickNote(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] placeholder:text-[var(--text-tertiary)] transition-all"
                />
              </div>

              <Button onClick={handleQuickConfirm} disabled={!quickAmount || saving} className="w-full" size="lg">
                {saving ? 'Saving…' : `Save ${quickAction.label}`}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ---- Clarification Sheet ---- */}
      <Modal open={!!clarifyData} onClose={() => setClarifyData(null)}>
        {clarifyData && (
          <>
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-1">
                  <AlertTriangle className="w-3 h-3" /> Need a bit more info
                </p>
                <h3 className="text-[var(--text-primary)] font-bold text-lg">Confirm Details</h3>
                <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
                  We parsed <span className="text-[var(--text-primary)] font-bold">{formatCurrency(clarifyData.parsed.amount)}</span> as{' '}
                  <span className={cn('font-bold', TYPE_TEXT[clarifyData.parsed.type])}>a {clarifyData.parsed.type}</span>.
                  Please confirm the missing fields below.
                </p>
              </div>
              <button onClick={() => setClarifyData(null)} className="p-2 rounded-xl bg-white/5 text-[var(--text-tertiary)] hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {clarifyData.needCategory && clarifyData.parsed.type !== 'transfer' && !clarifyData.resolvedCategoryId && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 block">Select Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.filter(c => c.type === clarifyData.parsed.type).map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleClarifyConfirm({ resolvedCategoryId: c.id })}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-[var(--border-1)] hover:bg-white/10 hover:border-[var(--accent)]/30 transition-all text-left group"
                      >
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)]/50 group-hover:bg-[var(--accent)]" />
                        <span className="text-[var(--text-secondary)] text-xs font-medium group-hover:text-white">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {clarifyData.needFrom && !clarifyData.resolvedFromId && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 block">
                    {clarifyData.parsed.type === 'income' ? 'Select To Account' : 'Select From Account'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {accounts.map(a => (
                      <button
                        key={a.id}
                        onClick={() => handleClarifyConfirm({ resolvedFromId: a.id })}
                        className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white/5 border border-[var(--border-1)] hover:bg-white/10 hover:border-[var(--accent)]/30 transition-all text-left group"
                      >
                        <span className="text-[var(--text-secondary)] text-xs font-bold group-hover:text-white">{a.name}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">{formatCurrency(a.balance)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {clarifyData.needTo && !clarifyData.resolvedToId && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 block">
                    {clarifyData.parsed.type === 'transfer' ? 'Select To Account' : 'Select Account'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {accounts.map(a => (
                      <button
                        key={a.id}
                        onClick={() => handleClarifyConfirm({ resolvedToId: a.id })}
                        disabled={a.id === clarifyData.resolvedFromId}
                        className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white/5 border border-[var(--border-1)] hover:bg-white/10 hover:border-[var(--accent)]/30 transition-all text-left group disabled:opacity-20 disabled:pointer-events-none"
                      >
                        <span className="text-[var(--text-secondary)] text-xs font-bold group-hover:text-white">{a.name}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">{formatCurrency(a.balance)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {((clarifyData.needCategory && clarifyData.resolvedCategoryId) ||
                (clarifyData.needFrom && clarifyData.resolvedFromId) ||
                (clarifyData.needTo && clarifyData.resolvedToId)) && (
                  <Button onClick={() => handleClarifyConfirm({})} disabled={saving} className="w-full">
                    {saving ? 'Saving…' : 'Confirm & Save'}
                  </Button>
                )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
