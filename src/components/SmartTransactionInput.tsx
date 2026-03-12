import React, { useState, useEffect, useRef } from 'react';
import { Send, Zap, Sparkles, CheckCircle, Edit3, X } from 'lucide-react';
import { parseTransactionMessage, type ParsedTransaction } from '@/src/lib/transactionParser';
import { QUICK_ACTIONS, type QuickAction } from '@/src/lib/quickEntryConfig';
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  accounts: any[];
  categories: any[];
  transactions?: any[];
  onConfirm: (data: any) => Promise<void>;
  onEditManual: (type: 'income' | 'expense' | 'transfer', data?: any) => void;
  onNavigate: () => void;
}

const TYPE_COLORS = {
  income: 'emerald',
  expense: 'red',
  transfer: 'blue',
};

const TYPE_LABELS = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

export default function SmartTransactionInput({ accounts, categories, transactions, onConfirm, onEditManual, onNavigate }: Props) {
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
      
      if (result && transactions) {
        // 1. Try to resolve the current keyword
        const directCat = resolveCategory(result.category_keyword, result.type);
        
        // 2. If no direct match or high-confidence keyword found, try history
        if (!directCat || result.confidence !== 'high') {
          const histMatch = transactions.find(t => 
            t.type === result.type && 
            t.note?.toLowerCase().trim() === result.note?.toLowerCase().trim()
          );
          if (histMatch) {
            // Found a past transaction with same note — use its category
            result.category_keyword = histMatch.category?.name || histMatch.category_name;
          }
        }
      }
      
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [input, accounts, categories]);

  const resolveAccount = (name?: string) =>
    name ? accounts.find(a => a.name?.toLowerCase() === name?.toLowerCase()) : undefined;

  const resolveCategory = (keyword?: string, type?: string) => {
    if (!keyword) return undefined;
    const kw = keyword.toLowerCase();
    
    // Exact or substring match
    const match = categories?.find(c =>
      c.type === type && (c.name?.toLowerCase().includes(kw))
    );
    if (match) return match;

    // Hardcoded synonym bridge for common CATEGORY_MAP keys
    const synonyms: Record<string, string[]> = {
      food: ['grocery', 'dining', 'eat', 'restaurant', 'meal'],
      transport: ['taxi', 'fuel', 'commute', 'travel'],
      shopping: ['amazon', 'clothes', 'purchase'],
      housing: ['utilities', 'rent', 'home'],
      health: ['medical', 'doctor', 'pharmacy'],
    };

    if (synonyms[kw]) {
      return categories?.find(c => 
        c.type === type && synonyms[kw].some(s => c.name?.toLowerCase().includes(s))
      );
    }

    return undefined;
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

  const color = parsed ? TYPE_COLORS[parsed.type] : 'emerald';

  return (
    <div className="space-y-4">
      {/* --- Text Input Bar --- */}
      <div className="relative">
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3 focus-within:border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && parsed) handleConfirmParsed(); }}
            placeholder='Try: "lunch 450" or "salary 120000 to main bank"…'
            className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-600 focus:outline-none"
          />
          {input && (
            <button onClick={() => { setInput(''); setParsed(null); }} className="text-zinc-600 hover:text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={parsed ? handleConfirmParsed : undefined}
            disabled={!parsed || saving}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              parsed ? "bg-emerald-500 text-white hover:bg-emerald-400" : "text-zinc-700"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Parse preview card */}
        <AnimatePresence>
          {parsed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl border p-4 backdrop-blur-xl shadow-2xl",
                parsed.type === 'income' ? "bg-emerald-500/10 border-emerald-500/20" :
                  parsed.type === 'expense' ? "bg-red-500/10 border-red-500/20" :
                    "bg-blue-500/10 border-blue-500/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                      parsed.type === 'income' ? "bg-emerald-500/20 text-emerald-400" :
                        parsed.type === 'expense' ? "bg-red-500/20 text-red-400" :
                          "bg-blue-500/20 text-blue-400"
                    )}>
                      {TYPE_LABELS[parsed.type]}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      parsed.confidence === 'high' ? "bg-emerald-500/10 text-emerald-500" :
                        parsed.confidence === 'medium' ? "bg-amber-500/10 text-amber-500" :
                          "bg-zinc-500/10 text-zinc-500"
                    )}>
                      {parsed.confidence} confidence
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(parsed.amount)}</p>
                  <div className="text-xs text-zinc-400 space-x-3">
                    {parsed.note && <span>📝 {parsed.note}</span>}
                    {parsed.category_keyword && <span>🏷️ {parsed.category_keyword}</span>}
                    {parsed.from_account_name && <span>From {parsed.from_account_name}</span>}
                    {parsed.to_account_name && <span>To {parsed.to_account_name}</span>}
                    <span>📅 {parsed.date}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={handleConfirmParsed}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {saving ? '...' : 'Confirm'}
                  </button>
                  <button
                    onClick={handleEditParsed}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
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
            className="flex items-center gap-2 text-emerald-400 text-sm font-medium px-2"
          >
            <CheckCircle className="w-4 h-4" />
            Transaction saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Quick Action Buttons --- */}
      <div>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-1">Quick Entry</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {dynamicActions.map(action => (
            <button
              key={action.id}
              onClick={() => { setQuickAction(action); setQuickAmount(''); setQuickNote(''); setQuickAccount(accounts[0]?.id || ''); }}
              className="group flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all text-center"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{action.emoji}</span>
              <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Quick Entry Bottom Sheet --- */}
      <AnimatePresence>
        {quickAction && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickAction(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#151518] border-t border-white/10 rounded-t-[32px] p-6 pb-10 shadow-2xl max-w-lg mx-auto"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{quickAction.emoji}</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">{quickAction.label}</h3>
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      quickAction.type === 'income' ? "text-emerald-400" :
                        quickAction.type === 'expense' ? "text-red-400" : "text-blue-400"
                    )}>{TYPE_LABELS[quickAction.type]}</span>
                  </div>
                </div>
                <button onClick={() => setQuickAction(null)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</span>
                    <input
                      autoFocus
                      type="number"
                      placeholder="0.00"
                      value={quickAmount}
                      onChange={e => setQuickAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleQuickConfirm(); }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Account */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Account</label>
                  <select
                    value={quickAccount}
                    onChange={e => setQuickAccount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [&>option]:bg-[#151518] [&>option]:text-white"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Note (optional)</label>
                  <input
                    type="text"
                    placeholder={`e.g. ${quickAction.label}…`}
                    value={quickNote}
                    onChange={e => setQuickNote(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-zinc-600 transition-all"
                  />
                </div>

                {/* Confirm */}
                <button
                  onClick={handleQuickConfirm}
                  disabled={!quickAmount || saving}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold rounded-2xl text-base transition-all shadow-lg shadow-emerald-500/20"
                >
                  {saving ? 'Saving…' : `Save ${quickAction.label}`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Clarification Modal ---- */}
      <AnimatePresence>
        {clarifyData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setClarifyData(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-[#151518] border-t border-white/10 rounded-t-[32px] p-6 pb-10 shadow-2xl max-w-lg mx-auto"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">⚠️ Need a bit more info</p>
                  <h3 className="text-white font-bold text-lg">Confirm Details</h3>
                  <p className="text-zinc-500 text-sm mt-0.5">
                    We parsed <span className="text-white font-bold">{formatCurrency(clarifyData.parsed.amount)}</span> as a{' '}
                    <span className={cn(
                      'font-bold',
                      clarifyData.parsed.type === 'income' ? 'text-emerald-400' :
                        clarifyData.parsed.type === 'expense' ? 'text-red-400' : 'text-blue-400'
                    )}>{clarifyData.parsed.type}</span>.
                    Please confirm the missing fields below.
                  </p>
                </div>
                <button onClick={() => setClarifyData(null)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Category Selection */}
                {clarifyData.needCategory && clarifyData.parsed.type !== 'transfer' && !clarifyData.resolvedCategoryId && (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
                      📂 Select Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.filter(c => c.type === clarifyData.parsed.type).map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleClarifyConfirm({ resolvedCategoryId: c.id })}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-left group"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500/50 group-hover:bg-emerald-500" />
                          <span className="text-zinc-300 text-xs font-medium group-hover:text-white">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* From Account Selection */}
                {clarifyData.needFrom && !clarifyData.resolvedFromId && (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
                      {clarifyData.parsed.type === 'income' ? '🏦 Select To Account' : '🏦 Select From Account'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {accounts.map(a => (
                        <button
                          key={a.id}
                          onClick={() => handleClarifyConfirm({ resolvedFromId: a.id })}
                          className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-left group"
                        >
                          <span className="text-zinc-300 text-xs font-bold group-hover:text-white">{a.name}</span>
                          <span className="text-[10px] text-zinc-500">{formatCurrency(a.balance)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* To Account Selection (transfers only) */}
                {clarifyData.needTo && !clarifyData.resolvedToId && (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">
                      {clarifyData.parsed.type === 'transfer' ? '➡️ Select To Account' : '🏦 Select Account'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {accounts.map(a => (
                        <button
                          key={a.id}
                          onClick={() => handleClarifyConfirm({ resolvedToId: a.id })}
                          disabled={a.id === clarifyData.resolvedFromId}
                          className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-left group disabled:opacity-20 disabled:pointer-events-none"
                        >
                          <span className="text-zinc-300 text-xs font-bold group-hover:text-white">{a.name}</span>
                          <span className="text-[10px] text-zinc-500">{formatCurrency(a.balance)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback Confirm Button (only if everything is somehow already set but it still needs confirmation) */}
                {((clarifyData.needCategory && clarifyData.resolvedCategoryId) ||
                  (clarifyData.needFrom && clarifyData.resolvedFromId) ||
                  (clarifyData.needTo && clarifyData.resolvedToId)) && (
                    <button
                      onClick={() => handleClarifyConfirm({})}
                      disabled={saving}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold rounded-2xl text-base transition-all shadow-lg shadow-emerald-500/20 mt-2"
                    >
                      {saving ? 'Saving…' : 'Confirm & Save'}
                    </button>
                  )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
