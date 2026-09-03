import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Trash2,
  X
} from 'lucide-react';
import { cn, getLocalDatetimePattern } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';
import { useIsDesktop } from '@/src/hooks/useIsDesktop';

import SmartTransactionInput from '@/src/components/SmartTransactionInput';
import TransactionForm, { type TransactionType, type TransactionFormValues } from '@/src/components/TransactionForm';
import { TransactionTableRow, TransactionCard } from '@/src/components/TransactionRows';
import { Card, Button, PageHeader, Modal, useToast, useConfirm } from '@/src/components/ui';

const emptyForm = (): TransactionFormValues => ({
  amount: '',
  date: getLocalDatetimePattern(),
  note: '',
  category_id: '',
  from_account_id: '',
  to_account_id: ''
});

interface ModalState {
  editingId: string | null;
  type: TransactionType;
  values: TransactionFormValues;
}

interface TransactionsProps {
  setActiveTab: (tab: string) => void;
}

const fieldClasses =
  'w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-ring)] outline-none [&>option]:bg-[var(--surface-2)]';

export default function Transactions({ setActiveTab }: TransactionsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  // The add/edit form lives in TransactionForm with its own state (see the
  // note there). `null` means the modal is closed.
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterCurrentMonth, setFilterCurrentMonth] = useState(true);

  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Close row action dropdown when clicking outside
  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      if ((e.target as Element).closest('.row-menu')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const { fetchWithAuth } = useApi();
  const { toast } = useToast();
  const confirm = useConfirm();

  const fetchTransactions = useCallback(() => {
    fetchWithAuth('/api/transactions')
      .then(res => res.json())
      .then(setTransactions)
      .catch(console.error);
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchTransactions();
    fetchWithAuth('/api/accounts').then(res => res.json()).then(setAccounts).catch(console.error);
    fetchWithAuth('/api/categories').then(res => res.json()).then(setCategories).catch(console.error);
  }, [fetchWithAuth, fetchTransactions]);

  // Compute filtered transactions
  const filteredTransactions = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(t => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNote = t.note?.toLowerCase().includes(query);
        const matchesCategory = t.category_name?.toLowerCase().includes(query);
        const matchesAccount = t.from_account_name?.toLowerCase().includes(query) || t.to_account_name?.toLowerCase().includes(query);
        const matchesAmount = t.amount?.toString().includes(query);
        if (!matchesNote && !matchesCategory && !matchesAccount && !matchesAmount) return false;
      }

      // 2. Type Filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // 3. Category Filter
      if (filterCategoryId !== 'all' && t.category_id !== filterCategoryId) return false;

      // 4. Account Filter
      if (filterAccountId !== 'all') {
        if (t.from_account_id !== filterAccountId && t.to_account_id !== filterAccountId) return false;
      }

      // 5. Current Month Filter
      if (filterCurrentMonth && !dateStart && !dateEnd) {
        const tDate = new Date(t.date);
        if (tDate.getFullYear() !== currentYear || tDate.getMonth() !== currentMonth) {
          return false;
        }
      }

      // 6. Date Range Filter
      if (dateStart) {
        const tDate = new Date(t.date).getTime();
        const sDate = new Date(dateStart).getTime();
        if (tDate < sDate) return false;
      }
      if (dateEnd) {
        // Add 1 day to end date to make it inclusive of the end day
        const tDate = new Date(t.date).getTime();
        const eDate = new Date(dateEnd).getTime() + 86400000;
        if (tDate >= eDate) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, filterType, filterCategoryId, filterAccountId, dateStart, dateEnd, filterCurrentMonth]);

  // O(1) lookups so a selection change doesn't scan the array once per row
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  // Bulk selection handlers — passed to memoized rows, so they must keep a
  // stable identity across renders.
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleToggleMenu = useCallback((id: string) => {
    setOpenMenuId(prev => (prev === id ? null : id));
  }, []);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || isDeletingBulk) return;

    const ok = await confirm({
      title: `Delete ${selectedIds.length} transaction${selectedIds.length > 1 ? 's' : ''}?`,
      description: 'This cannot be undone. Account balances will be adjusted.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    setIsDeletingBulk(true);
    setOpenMenuId(null);

    try {
      // Issue all delete requests concurrently
      await Promise.all(
        selectedIds.map(id => fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' }))
      );

      const n = selectedIds.length;
      setSelectedIds([]); // Clear selection on success
      fetchTransactions(); // Refresh the list
      toast(`${n} transaction${n > 1 ? 's' : ''} deleted`, { type: 'success' });
    } catch (err) {
      console.error('Bulk delete failed', err);
      toast('Failed to delete some transactions. Please try again.', { type: 'error' });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleSubmit = async (type: TransactionType, values: TransactionFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const editingId = modalState?.editingId || null;
    const payload = {
      ...values,
      id: editingId || Math.random().toString(36).substr(2, 9),
      type,
      amount: parseFloat(values.amount)
    };

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalState(null);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Failed to submit transaction', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmartConfirm = async (data: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(data.amount)
    };

    try {
      const res = await fetchWithAuth('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchTransactions();
      }
    } catch (error) {
      console.error('Failed to submit smart transaction', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmartEdit = useCallback((type: TransactionType, data?: any) => {
    setModalState({
      editingId: null,
      type,
      values: data
        ? {
          amount: data.amount?.toString() || '',
          date: getLocalDatetimePattern(data.date),
          note: data.note || '',
          category_id: data.category_id || '',
          from_account_id: data.from_account_id || '',
          to_account_id: data.to_account_id || ''
        }
        : emptyForm()
    });
  }, []);

  // Pre-fill form from an existing transaction and open modal for editing
  const handleEditTransaction = useCallback((t: any) => {
    setOpenMenuId(null);
    setModalState({
      editingId: t.id,
      type: t.type,
      values: {
        amount: t.amount?.toString() || '',
        date: getLocalDatetimePattern(t.date),
        note: t.note || '',
        category_id: t.category_id || '',
        from_account_id: t.from_account_id || '',
        to_account_id: t.to_account_id || '',
      }
    });
  }, []);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    setOpenMenuId(null);
    const ok = await confirm({
      title: 'Delete this transaction?',
      description: 'This cannot be undone. Account balances will be adjusted.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' });
      // Deselect if it was selected during a manual standard delete
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchTransactions();
      toast('Transaction deleted', { type: 'success' });
    } catch (err) {
      console.error('Delete failed', err);
      toast('Failed to delete transaction', { type: 'error' });
    }
  }, [fetchWithAuth, fetchTransactions, confirm, toast]);

  // Only one of the two list layouts is rendered (see the list block below).
  const isDesktop = useIsDesktop();
  const allSelected = filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length;

  const hasActiveFilters = filterType !== 'all' || filterCategoryId !== 'all' || filterAccountId !== 'all' || !!dateStart || !!dateEnd || !filterCurrentMonth;
  const clearFilters = () => {
    setFilterType('all');
    setFilterCategoryId('all');
    setFilterAccountId('all');
    setDateStart('');
    setDateEnd('');
    // Clear actually means we want to see ALL data, so we turn OFF the current month filter
    setFilterCurrentMonth(false);
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto pb-12 lg:pb-0">
      <PageHeader
        title="Transactions"
        description="Manage and track every movement of your wealth."
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-3 bg-[var(--danger-soft)] border border-[var(--danger)]/20 rounded-2xl px-5 py-2.5">
              <span className="text-[var(--danger)] font-bold text-sm">{selectedIds.length} selected</span>
              <div className="w-px h-5 bg-[var(--danger)]/20" />
              <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={isDeletingBulk}>
                {isDeletingBulk ? 'Deleting…' : (<><Trash2 className="w-4 h-4" />Delete</>)}
              </Button>
              <button onClick={() => setSelectedIds([])} className="text-[var(--text-tertiary)] hover:text-white text-sm font-medium px-1">
                Cancel
              </button>
            </div>
          ) : (
            <Button onClick={() => handleSmartEdit('expense')} size="lg">
              <Plus className="w-5 h-5" />
              New Transaction
            </Button>
          )
        }
      />

      {/* Smart Input Area */}
      {selectedIds.length === 0 && (
        <SmartTransactionInput
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          onConfirm={handleSmartConfirm}
          onEditManual={handleSmartEdit}
          onNavigate={() => setActiveTab('settings')}
        />
      )}

      {/* Filters & History */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl pl-12 pr-4 py-3.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all text-xs font-bold uppercase tracking-widest"
              >
                Clear
              </button>
            )}

            <button
              onClick={() => {
                if (!filterCurrentMonth) {
                  setDateStart('');
                  setDateEnd('');
                }
                setFilterCurrentMonth(!filterCurrentMonth);
              }}
              className={cn(
                "shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest",
                filterCurrentMonth
                  ? "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
              )}
            >
              <Calendar className="w-4 h-4" />
              Current Month
            </button>

            <button
              onClick={() => setShowFiltersMenu(true)}
              className={cn(
                "shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest",
                (filterType !== 'all' || filterCategoryId !== 'all' || filterAccountId !== 'all')
                  ? "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <button
              onClick={() => setShowDateMenu(true)}
              className={cn(
                "shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest",
                (dateStart || dateEnd)
                  ? "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
              )}
            >
              <Calendar className="w-4 h-4" />
              Date Range
            </button>
          </div>
        </div>

        {/* Desktop table or mobile cards — one or the other, never both.
            Rendering both and hiding one with `lg:hidden` doubled the cost of
            every re-render of this page. */}
        <Card level={1} padding="none" className="overflow-hidden">
          {isDesktop ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-[var(--text-tertiary)] text-[10px] uppercase tracking-widest">
                    <th className="px-8 py-5 font-bold w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-[var(--border-2)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-ring)] focus:ring-offset-0 cursor-pointer"
                        checked={allSelected}
                        onChange={handleToggleSelectAll}
                        disabled={filteredTransactions.length === 0}
                      />
                    </th>
                    <th className="px-4 py-5 font-bold">Date</th>
                    <th className="px-8 py-5 font-bold">Transaction</th>
                    <th className="px-8 py-5 font-bold">Category / Account</th>
                    <th className="px-8 py-5 font-bold">Amount</th>
                    <th className="px-8 py-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-1)]">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-[var(--text-tertiary)]">
                        {transactions.length === 0 ? 'No transactions found. Start by adding your first one!' : 'No transactions match your current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TransactionTableRow
                        key={t.id}
                        t={t}
                        isSelected={selectedSet.has(t.id)}
                        isMenuOpen={openMenuId === t.id}
                        onToggleSelect={handleToggleSelect}
                        onToggleMenu={handleToggleMenu}
                        onEdit={handleEditTransaction}
                        onDelete={handleDeleteTransaction}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-1)]">
              {filteredTransactions.length === 0 ? (
                <div className="px-6 py-16 text-center text-[var(--text-tertiary)]">
                  {transactions.length === 0 ? 'No transactions found.' : 'No transactions match filters.'}
                </div>
              ) : (
                <>
                  <div className="px-5 py-3.5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-[var(--border-2)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-ring)] focus:ring-offset-0 cursor-pointer"
                        checked={allSelected}
                        onChange={handleToggleSelectAll}
                      />
                      <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">Select All</span>
                    </div>
                    <span className="text-[var(--text-tertiary)] text-xs font-medium">{filteredTransactions.length} items</span>
                  </div>
                  {filteredTransactions.map((t) => (
                    <TransactionCard
                      key={t.id}
                      t={t}
                      isSelected={selectedSet.has(t.id)}
                      isMenuOpen={openMenuId === t.id}
                      onToggleSelect={handleToggleSelect}
                      onToggleMenu={handleToggleMenu}
                      onEdit={handleEditTransaction}
                      onDelete={handleDeleteTransaction}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Filters Sheet */}
      <Modal open={showFiltersMenu} onClose={() => setShowFiltersMenu(false)} title="Filters">
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className={fieldClasses}>
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Category</label>
            <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} className={fieldClasses}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Account</label>
            <select value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)} className={fieldClasses}>
              <option value="all">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <Button className="w-full" onClick={() => setShowFiltersMenu(false)}>Apply Filters</Button>
        </div>
      </Modal>

      {/* Date Range Sheet */}
      <Modal open={showDateMenu} onClose={() => setShowDateMenu(false)} title="Date Range">
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Start Date</label>
            <input
              type="date"
              value={dateStart}
              onChange={e => { setDateStart(e.target.value); setFilterCurrentMonth(false); }}
              className={fieldClasses}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">End Date</label>
            <input
              type="date"
              value={dateEnd}
              onChange={e => { setDateEnd(e.target.value); setFilterCurrentMonth(false); }}
              className={fieldClasses}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => { setDateStart(''); setDateEnd(''); }}>Clear</Button>
            <Button className="flex-1" onClick={() => setShowDateMenu(false)}>Apply</Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Transaction Modal — the form is mounted only while open so
          its local state is seeded from modalState and reset on close. */}
      <Modal
        open={!!modalState}
        onClose={() => setModalState(null)}
        title={`${modalState?.editingId ? 'Edit' : 'New'} Transaction`}
        description="Fill in the details below."
      >
        {modalState && (
          <TransactionForm
            editingId={modalState.editingId}
            initialType={modalState.type}
            initialValues={modalState.values}
            accounts={accounts}
            categories={categories}
            isSubmitting={isSubmitting}
            onCancel={() => setModalState(null)}
            onSubmit={handleSubmit}
          />
        )}
      </Modal>
    </div>
  );
}


