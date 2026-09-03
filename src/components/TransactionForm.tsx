import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface TransactionFormValues {
  amount: string;
  date: string;
  note: string;
  category_id: string;
  from_account_id: string;
  to_account_id: string;
}

const fieldClasses =
  'w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-ring)] outline-none [&>option]:bg-[var(--surface-2)]';

interface Props {
  editingId: string | null;
  initialType: TransactionType;
  initialValues: TransactionFormValues;
  accounts: any[];
  categories: any[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (type: TransactionType, values: TransactionFormValues) => void;
}

/**
 * The form owns its state on purpose.
 *
 * When `formData` lived in Transactions.tsx, every keystroke re-rendered the
 * whole transaction history — 370ms to 1.4s per character with a few hundred
 * rows, which swallowed keypresses on phones and made the amount field feel
 * like it kept losing focus. Keeping the state here means typing re-renders
 * only the form. <Modal> mounts its children on open, so the props below are
 * the seed values and closing resets everything.
 */
export default function TransactionForm({
  editingId,
  initialType,
  initialValues,
  accounts,
  categories,
  isSubmitting,
  onCancel,
  onSubmit
}: Props) {
  const [activeType, setActiveType] = useState<TransactionType>(initialType);
  const [formData, setFormData] = useState<TransactionFormValues>(initialValues);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(activeType, formData);
  };

  return (
    <>
      {!editingId && (
        <div className="flex p-1 bg-white/5 rounded-2xl gap-1 mb-6">
          {(['expense', 'income', 'transfer'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all capitalize',
                activeType === type
                  ? type === 'income' ? 'bg-[var(--accent)] text-[#04140e]'
                    : type === 'expense' ? 'bg-[var(--danger)] text-white'
                      : 'bg-blue-500 text-white'
                  : 'text-[var(--text-tertiary)] hover:text-white'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                required
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl pl-12 pr-4 py-3.5 text-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Date</label>
            <input
              required
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-4 py-3.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">
            {activeType === 'income' ? 'To Account' : 'From Account'}
          </label>
          <select
            required
            value={activeType === 'income' ? formData.to_account_id : formData.from_account_id}
            onChange={(e) => {
              if (activeType === 'income') {
                setFormData({ ...formData, to_account_id: e.target.value })
              } else {
                setFormData({ ...formData, from_account_id: e.target.value })
              }
            }}
            className={fieldClasses + ' py-3.5'}
          >
            <option value="">Select Account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
            ))}
          </select>
        </div>

        {activeType === 'transfer' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">To Account</label>
            <select
              required
              value={formData.to_account_id}
              onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
              className={fieldClasses + ' py-3.5'}
            >
              <option value="">Select Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeType !== 'transfer' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Category</label>
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className={fieldClasses + ' py-3.5'}
            >
              <option value="">Select Category</option>
              {categories.filter(c => c.type === activeType).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Note</label>
          <textarea
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="What was this for?"
            className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-4 py-3.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] h-28 resize-none text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="order-2 sm:order-1 flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            variant={activeType === 'expense' ? 'danger' : 'primary'}
            className={cn(
              "order-1 sm:order-2 flex-1",
              activeType === 'transfer' && 'bg-blue-500 text-white hover:bg-blue-600 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.4)]'
            )}
          >
            {isSubmitting ? 'Saving…' : editingId ? 'Save Changes' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </>
  );
}
