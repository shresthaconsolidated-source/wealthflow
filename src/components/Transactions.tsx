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
import { motion, AnimatePresence } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';

import SmartTransactionInput from '@/src/components/SmartTransactionInput';

interface TransactionsProps {
  setActiveTab: (tab: string) => void;
}

export default function Transactions({ setActiveTab }: TransactionsProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeType, setActiveType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 16),
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

  // Close action dropdown when clicking outside
  React.useEffect(() => {
    const close = () => setOpenMenuId(null);
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
        date: data.date || new Date().toISOString().slice(0, 16),
        note: data.note || '',
        category_id: data.category_id || '',
        from_account_id: data.from_account_id || '',
        to_account_id: data.to_account_id || ''
      });
    } else {
      setFormData({
        amount: '',
        date: new Date().toISOString().slice(0, 16),
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
      date: t.date ? t.date.slice(0, 16) : new Date().toISOString().slice(0, 16),
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
      fetchTransactions();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto pb-12 lg:pb-0">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-zinc-500 mt-1 text-sm lg:text-base">Manage and track every movement of your wealth.</p>
        </div>
        <button
          onClick={() => handleSmartEdit('expense')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 text-sm lg:text-base"
        >
          <Plus className="w-5 h-5" />
          New Transaction
        </button>
      </div>

      {/* Smart Input Area */}
      <SmartTransactionInput
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        onConfirm={handleSmartConfirm}
        onEditManual={handleSmartEdit}
        onNavigate={() => setActiveTab('settings')}
      />

      {/* Filters & History */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full bg-[#151518] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/5 bg-[#151518] text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/5 bg-[#151518] text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest">
              <Calendar className="w-4 h-4" />
              <span>Date Range</span>
            </button>
          </div>
        </div>

        {/* Desktop Table / Mobile Cards */}
        <div className="bg-[#151518] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02] text-zinc-500 text-[10px] uppercase tracking-widest">
                  <th className="px-8 py-5 font-bold">Date</th>
                  <th className="px-8 py-5 font-bold">Transaction</th>
                  <th className="px-8 py-5 font-bold">Category / Account</th>
                  <th className="px-8 py-5 font-bold">Amount</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-zinc-500">
                      No transactions found. Start by adding your first one!
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <p className="text-white font-bold text-sm">{new Date(t.date).toLocaleDateString()}</p>
                        <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                            t.type === 'income' ? "bg-emerald-400/10 text-emerald-400" :
                              t.type === 'expense' ? "bg-red-400/10 text-red-400" :
                                "bg-blue-400/10 text-blue-400"
                          )}>
                            {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> :
                              t.type === 'expense' ? <ArrowDownRight className="w-5 h-5" /> :
                                <ArrowLeftRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{t.note || 'No description'}</p>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{t.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                            <Tag className="w-3 h-3" />
                            {t.category_name || 'Uncategorized'}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                            <CreditCard className="w-3 h-3" />
                            {t.from_account_name || t.to_account_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className={cn(
                          "font-bold text-lg tracking-tight",
                          t.type === 'income' ? "text-emerald-400" :
                            t.type === 'expense' ? "text-red-400" :
                              "text-blue-400"
                        )}>
                          {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                          {formatCurrency(t.amount)}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === t.id ? null : t.id);
                            }}
                            className="p-3 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === t.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-12 z-50 bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[140px]"
                            >
                              <button
                                onClick={() => handleEditTransaction(t)}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                              >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all border-t border-white/5"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-white/5">
            {transactions.length === 0 ? (
              <div className="px-6 py-16 text-center text-zinc-500">
                No transactions found.
              </div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="p-6 flex items-center justify-between active:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                      t.type === 'income' ? "bg-emerald-400/10 text-emerald-400 shadow-emerald-500/5" :
                        t.type === 'expense' ? "bg-red-400/10 text-red-400 shadow-red-500/5" :
                          "bg-blue-400/10 text-blue-400 shadow-blue-500/5"
                    )}>
                      {t.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> :
                        t.type === 'expense' ? <ArrowDownRight className="w-6 h-6" /> :
                          <ArrowLeftRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">{t.note || 'No description'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{t.category_name || 'Misc'}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{t.from_account_name || t.to_account_name}</span>
                      </div>
                      <p className="text-zinc-600 text-[10px] mt-1 font-medium uppercase tracking-wider">
                        {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold text-base tracking-tight",
                      t.type === 'income' ? "text-emerald-400" :
                        t.type === 'expense' ? "text-red-400" :
                          "text-blue-400"
                    )}>
                      {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                      {formatCurrency(t.amount)}
                    </p>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === t.id ? null : t.id);
                        }}
                        className="p-2 -mr-2 text-zinc-600 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === t.id && (
                        <div
                          onClick={e => e.stopPropagation()}
                          className="absolute right-0 top-8 z-50 bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[140px]"
                        >
                          <button
                            onClick={() => handleEditTransaction(t)}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all border-t border-white/5"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-[#151518] border-t lg:border border-white/10 rounded-t-[40px] lg:rounded-[40px] w-full max-w-xl relative z-10 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="p-8 border-b border-white/5 sticky top-0 bg-[#151518]/80 backdrop-blur-xl z-20">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-white capitalize">{editingId ? 'Edit' : 'New'} Transaction</h2>
                    <p className="text-zinc-500 mt-1 text-sm">Fill in the details below.</p>
                  </div>
                  <button
                    onClick={() => { setShowAddModal(false); setEditingId(null); }}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>
                {/* Type switcher tabs */}
                {!editingId && (
                  <div className="flex p-1 bg-white/5 rounded-2xl gap-1">
                    {(['expense', 'income', 'transfer'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActiveType(type)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all capitalize',
                          activeType === type
                            ? type === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : type === 'expense' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'text-zinc-500 hover:text-white'
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Amount</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Date</label>
                    <input
                      required
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">
                    {activeType === 'income' ? 'To Account' : activeType === 'expense' ? 'From Account' : 'From Account'}
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
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm appearance-none [&>option]:bg-[#151518] [&>option]:text-white"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                    ))}
                  </select>
                </div>

                {activeType === 'transfer' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">To Account</label>
                    <select
                      required
                      value={formData.to_account_id}
                      onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm appearance-none [&>option]:bg-[#151518] [&>option]:text-white"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {activeType !== 'transfer' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Category</label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm appearance-none [&>option]:bg-[#151518] [&>option]:text-white"
                    >
                      <option value="">Select Category</option>
                      {categories.filter(c => c.type === activeType).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="What was this for?"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-32 resize-none text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-8 lg:pb-0">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingId(null); }}
                    className="order-2 sm:order-1 flex-1 px-6 py-5 rounded-2xl border border-white/5 text-zinc-400 font-bold hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      "order-1 sm:order-2 flex-1 px-6 py-5 rounded-2xl text-white font-bold transition-all shadow-xl text-sm uppercase tracking-widest",
                      activeType === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' :
                        activeType === 'expense' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                          'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                    )}
                  >
                    {editingId ? 'Save Changes' : 'Save Transaction'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
