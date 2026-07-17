import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Calendar,
  Tag,
  CreditCard,
  DollarSign,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';

import SmartTransactionInput from '@/src/components/SmartTransactionInput';
import { Card, Button, PageHeader, Modal } from '@/src/components/ui';

const getLocalDatetimePattern = (dateStr?: string | null) => {
  if (!dateStr) {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
  if (dateStr.length === 16 && dateStr.includes('T')) return dateStr;
  if (dateStr.length === 10 && !dateStr.includes('T')) return `${dateStr}T00:00`;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mins}`;
};

interface TransactionsProps {
  setActiveTab: (tab: string) => void;
}

const typeStyles: Record<string, { icon: any; text: string; bg: string }> = {
  income: { icon: ArrowUpRight, text: 'text-[var(--accent)]', bg: 'bg-[var(--accent-soft)]' },
  expense: { icon: ArrowDownRight, text: 'text-[var(--danger)]', bg: 'bg-[var(--danger-soft)]' },
  transfer: { icon: ArrowLeftRight, text: 'text-blue-400', bg: 'bg-blue-400/10' },
};

const fieldClasses =
  'w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-xl px-3.5 py-2.5 text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-[var(--accent-ring)] outline-none [&>option]:bg-[var(--surface-2)]';

export default function Transactions({ setActiveTab }: TransactionsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeType, setActiveType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [formData, setFormData] = useState({
    amount: '',
    date: getLocalDatetimePattern(),
    note: '',
    category_id: '',
    from_account_id: '',
    to_account_id: ''
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const fetchTransactions = () => {
    fetchWithAuth('/api/transactions')
      .then(res => res.json())
      .then(setTransactions)
      .catch(console.error);
  };

  useEffect(() => {
    fetchTransactions();
    fetchWithAuth('/api/accounts').then(res => res.json()).then(setAccounts).catch(console.error);
    fetchWithAuth('/api/categories').then(res => res.json()).then(setCategories).catch(console.error);
  }, [fetchWithAuth]);

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

  // Bulk selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || isDeletingBulk) return;

    // Safety check with browser confirm since this is a destructive action
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions? This cannot be undone.`)) {
      return;
    }

    setIsDeletingBulk(true);
    setOpenMenuId(null);

    try {
      // Issue all delete requests concurrently
      await Promise.all(
        selectedIds.map(id => fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' }))
      );

      setSelectedIds([]); // Clear selection on success
      fetchTransactions(); // Refresh the list
    } catch (err) {
      console.error('Bulk delete failed', err);
      alert('Failed to delete some transactions. Please try again.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      ...formData,
      id: editingId || Math.random().toString(36).substr(2, 9),
      type: activeType,
      amount: parseFloat(formData.amount)
    };

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingId(null);
        fetchTransactions();
        setFormData({
          amount: '',
          date: new Date().toISOString().slice(0, 16),
          note: '',
          category_id: '',
          from_account_id: '',
          to_account_id: ''
        });
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

  const handleSmartEdit = (type: 'expense' | 'income' | 'transfer', data?: any) => {
    setActiveType(type);
    if (data) {
      setFormData({
        amount: data.amount?.toString() || '',
        date: getLocalDatetimePattern(data.date),
        note: data.note || '',
        category_id: data.category_id || '',
        from_account_id: data.from_account_id || '',
        to_account_id: data.to_account_id || ''
      });
    } else {
      setFormData({
        amount: '',
        date: getLocalDatetimePattern(),
        note: '',
        category_id: '',
        from_account_id: '',
        to_account_id: ''
      });
    }
    setShowAddModal(true);
  };

  // Pre-fill form from an existing transaction and open modal for editing
  const handleEditTransaction = (t: any) => {
    setEditingId(t.id);
    setActiveType(t.type);
    setFormData({
      amount: t.amount?.toString() || '',
      date: getLocalDatetimePattern(t.date),
      note: t.note || '',
      category_id: t.category_id || '',
      from_account_id: t.from_account_id || '',
      to_account_id: t.to_account_id || '',
    });
    setOpenMenuId(null);
    setShowAddModal(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    setOpenMenuId(null);
    try {
      await fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' });
      // Deselect if it was selected during a manual standard delete
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchTransactions();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

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

        {/* Desktop Table / Mobile Cards */}
        <Card level={1} padding="none" className="overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02] text-[var(--text-tertiary)] text-[10px] uppercase tracking-widest">
                  <th className="px-8 py-5 font-bold w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[var(--border-2)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-ring)] focus:ring-offset-0 cursor-pointer"
                      checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
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
                  filteredTransactions.map((t) => {
                    const style = typeStyles[t.type] || typeStyles.transfer;
                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          "transition-colors group cursor-pointer",
                          selectedIds.includes(t.id) ? "bg-[var(--accent-soft)]" : "hover:bg-white/[0.02]"
                        )}
                        onClick={() => handleToggleSelect(t.id)}
                      >
                        <td className="px-8 py-6 w-12" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-[var(--border-2)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-ring)] focus:ring-offset-0 cursor-pointer"
                            checked={selectedIds.includes(t.id)}
                            onChange={() => handleToggleSelect(t.id)}
                          />
                        </td>
                        <td className="px-4 py-6">
                          <p className="text-[var(--text-primary)] font-bold text-sm">{new Date(t.date).toLocaleDateString()}</p>
                          <p className="text-[var(--text-tertiary)] text-[10px] font-medium uppercase tracking-wider">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", style.bg, style.text)}>
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
                          <p className={cn("tnum font-bold text-lg tracking-tight", style.text)}>
                            {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                            {formatCurrency(t.amount)}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="relative row-menu">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === t.id ? null : t.id);
                              }}
                              className="p-3 rounded-xl hover:bg-white/5 text-[var(--text-tertiary)] hover:text-white transition-all"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {openMenuId === t.id && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-12 z-50 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl shadow-2xl overflow-hidden min-w-[140px]"
                              >
                                <button
                                  onClick={() => handleEditTransaction(t)}
                                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-400" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all border-t border-[var(--border-1)]"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-[var(--border-1)]">
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
                      checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                      onChange={handleToggleSelectAll}
                    />
                    <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">Select All</span>
                  </div>
                  <span className="text-[var(--text-tertiary)] text-xs font-medium">{filteredTransactions.length} items</span>
                </div>
                {filteredTransactions.map((t) => {
                  const style = typeStyles[t.type] || typeStyles.transfer;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "p-5 flex items-center justify-between active:bg-white/[0.02] transition-colors cursor-pointer",
                        selectedIds.includes(t.id) ? "bg-[var(--accent-soft)]" : ""
                      )}
                      onClick={() => handleToggleSelect(t.id)}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div onClick={e => e.stopPropagation()} className="shrink-0">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-[var(--border-2)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent-ring)] focus:ring-offset-0 cursor-pointer"
                            checked={selectedIds.includes(t.id)}
                            onChange={() => handleToggleSelect(t.id)}
                          />
                        </div>
                        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", style.bg, style.text)}>
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
                            {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <p className={cn("tnum font-bold text-base tracking-tight", style.text)}>
                          {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                          {formatCurrency(t.amount)}
                        </p>
                        <div className="relative row-menu">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === t.id ? null : t.id);
                            }}
                            className="p-2.5 -mr-2 text-[var(--text-tertiary)] hover:text-white rounded-lg hover:bg-white/5 transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === t.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-9 z-50 bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl shadow-2xl overflow-hidden min-w-[140px]"
                            >
                              <button
                                onClick={() => handleEditTransaction(t)}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                              >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all border-t border-[var(--border-1)]"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
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

      {/* Add/Edit Transaction Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingId(null); }}
        title={`${editingId ? 'Edit' : 'New'} Transaction`}
        description="Fill in the details below."
      >
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
              onClick={() => { setShowAddModal(false); setEditingId(null); }}
              className="order-2 sm:order-1 flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={activeType === 'income' ? 'primary' : activeType === 'expense' ? 'danger' : 'primary'}
              className={cn(
                "order-1 sm:order-2 flex-1",
                activeType === 'transfer' && 'bg-blue-500 text-white hover:bg-blue-600 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.4)]'
              )}
            >
              {editingId ? 'Save Changes' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
