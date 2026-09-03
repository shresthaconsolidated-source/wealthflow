import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  MoreVertical,
  Tag,
  CreditCard,
  Edit2,
  Trash2
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';

/**
 * Memoized transaction rows.
 *
 * These live outside Transactions.tsx so a re-render of the page (search box,
 * filter state, bulk selection) doesn't rebuild every row in the history.
 * Every prop here is a primitive or a stable callback so React.memo actually
 * holds — keep it that way.
 */
export const typeStyles: Record<string, { icon: any; text: string; bg: string }> = {
  income: { icon: ArrowUpRight, text: 'text-[var(--accent)]', bg: 'bg-[var(--accent-soft)]' },
  expense: { icon: ArrowDownRight, text: 'text-[var(--danger)]', bg: 'bg-[var(--danger-soft)]' },
  transfer: { icon: ArrowLeftRight, text: 'text-blue-400', bg: 'bg-blue-400/10' },
};

const checkboxClasses =
  'w-4 h-4 rounded border-[var(--border-2)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-ring)] focus:ring-offset-0 cursor-pointer';

export interface TransactionRowProps {
  t: any;
  isSelected: boolean;
  isMenuOpen: boolean;
  onToggleSelect: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
}

const RowMenu = ({ t, onEdit, onDelete, className }: {
  t: any;
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
  className: string;
}) => (
  <div
    onClick={e => e.stopPropagation()}
    className={cn(
      'absolute right-0 z-50 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl shadow-2xl overflow-hidden min-w-[140px]',
      className
    )}
  >
    <button
      onClick={() => onEdit(t)}
      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
    >
      <Edit2 className="w-4 h-4 text-blue-400" />
      Edit
    </button>
    <button
      onClick={() => onDelete(t.id)}
      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all border-t border-[var(--border-1)]"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  </div>
);

const amountPrefix = (type: string) => (type === 'expense' ? '-' : type === 'income' ? '+' : '');

export const TransactionTableRow = React.memo(function TransactionTableRow({
  t, isSelected, isMenuOpen, onToggleSelect, onToggleMenu, onEdit, onDelete
}: TransactionRowProps) {
  const style = typeStyles[t.type] || typeStyles.transfer;
  const date = new Date(t.date);

  return (
    <tr
      className={cn(
        'transition-colors group cursor-pointer',
        isSelected ? 'bg-[var(--accent-soft)]' : 'hover:bg-white/[0.02]'
      )}
      onClick={() => onToggleSelect(t.id)}
    >
      <td className="px-8 py-6 w-12" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          className={checkboxClasses}
          checked={isSelected}
          onChange={() => onToggleSelect(t.id)}
        />
      </td>
      <td className="px-4 py-6">
        <p className="text-[var(--text-primary)] font-bold text-sm">{date.toLocaleDateString()}</p>
        <p className="text-[var(--text-tertiary)] text-[10px] font-medium uppercase tracking-wider">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', style.bg, style.text)}>
            <style.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[var(--text-primary)] font-bold text-sm">{t.note || 'No description'}</p>
            <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest">{t.type}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-medium">
            <Tag className="w-3 h-3" />
            {t.category_name || 'Uncategorized'}
          </div>
          <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest">
            <CreditCard className="w-3 h-3" />
            {t.from_account_name || t.to_account_name}
          </div>
        </div>
      </td>
      <td className="px-8 py-6">
        <p className={cn('tnum font-bold text-lg tracking-tight', style.text)}>
          {amountPrefix(t.type)}{formatCurrency(t.amount)}
        </p>
      </td>
      <td className="px-8 py-6 text-right">
        <div className="relative row-menu">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMenu(t.id); }}
            className="p-3 rounded-xl hover:bg-white/5 text-[var(--text-tertiary)] hover:text-white transition-all"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {isMenuOpen && <RowMenu t={t} onEdit={onEdit} onDelete={onDelete} className="top-12" />}
        </div>
      </td>
    </tr>
  );
});

export const TransactionCard = React.memo(function TransactionCard({
  t, isSelected, isMenuOpen, onToggleSelect, onToggleMenu, onEdit, onDelete
}: TransactionRowProps) {
  const style = typeStyles[t.type] || typeStyles.transfer;
  const date = new Date(t.date);

  return (
    <div
      className={cn(
        'p-5 flex items-center justify-between active:bg-white/[0.02] transition-colors cursor-pointer',
        isSelected ? 'bg-[var(--accent-soft)]' : ''
      )}
      onClick={() => onToggleSelect(t.id)}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <input
            type="checkbox"
            className={checkboxClasses}
            checked={isSelected}
            onChange={() => onToggleSelect(t.id)}
          />
        </div>
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', style.bg, style.text)}>
          <style.icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{t.note || 'No description'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest truncate">{t.category_name || 'Misc'}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--border-3)] shrink-0" />
            <span className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest truncate">{t.from_account_name || t.to_account_name}</span>
          </div>
          <p className="text-[var(--text-tertiary)] text-[10px] mt-1 font-medium uppercase tracking-wider">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 pl-2">
        <p className={cn('tnum font-bold text-base tracking-tight', style.text)}>
          {amountPrefix(t.type)}{formatCurrency(t.amount)}
        </p>
        <div className="relative row-menu">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMenu(t.id); }}
            className="p-2.5 -mr-2 text-[var(--text-tertiary)] hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && <RowMenu t={t} onEdit={onEdit} onDelete={onDelete} className="top-9" />}
        </div>
      </div>
    </div>
  );
});
