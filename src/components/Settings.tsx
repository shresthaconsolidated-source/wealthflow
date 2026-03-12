import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  CreditCard,
  Wallet,
  Briefcase,
  Tag,
  ChevronRight,
  X,
  Building,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Download,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';

export default function Settings() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'accounts' | 'categories'>('accounts');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'bank', initial_balance: '0' });
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'accounts' | 'categories', name: string } | null>(null);

  const [activeAccountTab, setActiveAccountTab] = useState<'bank' | 'cash' | 'asset'>('bank');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'income' | 'expense'>('income');
  const [baseCurrency, setBaseCurrency] = useState('USD');

  const { fetchWithAuth } = useApi();

  const showError = (message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const fetchData = useCallback(() => {
    Promise.all([
      fetchWithAuth('/api/accounts').then(res => res.json()),
      fetchWithAuth('/api/categories').then(res => res.json()),
      fetchWithAuth('/api/user/settings').then(res => res.json())
    ]).then(([accs, cats, settings]) => {
      setAccounts(accs);
      setCategories(cats);
      if (settings?.base_currency) {
        setBaseCurrency(settings.base_currency);
        localStorage.setItem('base_currency', settings.base_currency);
      }
      setLoading(false);
    }).catch(console.error);
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAddModal = (type: 'accounts' | 'categories', defaultSubType: string) => {
    setModalType(type);
    setEditingId(null);
    setFormData({ name: '', type: defaultSubType, initial_balance: '0' });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: any, type: 'accounts' | 'categories') => {
    setModalType(type);
    setEditingId(item.id);
    setFormData({
      name: item.name,
      type: item.type,
      initial_balance: item.initial_balance !== undefined ? item.initial_balance.toString() : '0'
    });
    setShowAddModal(true);
  };

  const promptDelete = (e: React.MouseEvent, id: string, type: 'accounts' | 'categories', name: string) => {
    e.stopPropagation();
    setItemToDelete({ id, type, name });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    setItemToDelete(null); // Clear the itemToDelete state immediately

    try {
      const res = await fetchWithAuth(`/api/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        showError('Failed to delete. Please ensure all API services are running.');
      }
    } catch (error: any) {
      console.error('Delete item error:', error);
      let msg = error.message || 'Network error';
      if (msg.includes('foreign key constraint') || msg.includes('violates foreign key')) {
        msg = `Cannot delete: this ${type === 'accounts' ? 'account' : 'category'} is currently used in your transactions. Please delete or re-assign those transactions first.`;
      }
      showError(msg);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAccount = modalType === 'accounts';
    const endpoint = isAccount ? '/api/accounts' : '/api/categories';
    const id = editingId || (isAccount ? 'acc-' : 'cat-') + Math.random().toString(36).substr(2, 9);

    const payload = isAccount ? {
      id, name: formData.name, type: formData.type || 'bank', initial_balance: parseFloat(formData.initial_balance || '0'), icon: 'Wallet', color: '#3b82f6'
    } : {
      id, name: formData.name, type: formData.type || 'expense', icon: 'Tag', color: '#8b5cf6'
    };

    try {
      const res = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ name: '', type: 'bank', initial_balance: '0' });
        fetchData();
      } else {
        showError('Failed to save. Ensure all API routes are running.');
      }
    } catch (error: any) {
      console.error('Save item error:', error);
      showError(`Save failed: ${error.message || 'Network error'}`);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setBaseCurrency(newCurrency);
    localStorage.setItem('base_currency', newCurrency);
    try {
      await fetchWithAuth('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_currency: newCurrency })
      });
    } catch (error) {
      console.error('Failed to save currency setting:', error);
      showError('Failed to save currency preference to the server.');
    }
  };


  const handleExport = async () => {
    try {
      const res = await fetchWithAuth('/api/transactions/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        showError('Export failed. Please check your connection.');
      }
    } catch (e) {
      console.error('Export error:', e);
      showError('Export failed due to a network error.');
    }
  };

  const accountSections = [
    { id: 'bank', title: 'Bank Accounts', description: 'Chequing and savings accounts.', items: accounts.filter(a => a.type === 'bank' || a.type === 'savings'), icon: Building, type: 'accounts', defaultSubType: 'bank' },
    { id: 'cash', title: 'Cash', description: 'Physical cash and wallets.', items: accounts.filter(a => a.type === 'cash' || a.type === 'wallet'), icon: Wallet, type: 'accounts', defaultSubType: 'cash' },
    { id: 'asset', title: 'Investments & Assets', description: 'Stocks, bonds, and other assets.', items: accounts.filter(a => a.type === 'asset' || a.type === 'investment' || a.type === 'property'), icon: Briefcase, type: 'accounts', defaultSubType: 'asset' }
  ];

  const categorySections = [
    { id: 'income', title: 'Income Categories', description: 'Sources of incoming money.', items: categories.filter(c => c.type === 'income'), icon: TrendingUp, type: 'categories', defaultSubType: 'income' },
    { id: 'expense', title: 'Expense Categories', description: 'Where your money goes.', items: categories.filter(c => c.type === 'expense'), icon: TrendingDown, type: 'categories', defaultSubType: 'expense' }
  ];

  const activeAccountSection = accountSections.find(s => s.id === activeAccountTab)!;
  const activeCategorySection = categorySections.find(s => s.id === activeCategoryTab)!;

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-12 lg:pb-0 relative">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldAlert className="w-4 h-4" /> Configuration
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">Settings</h1>
          <p className="text-zinc-400 mt-2 text-sm lg:text-base font-medium">Configure your financial structure and preferences.</p>
        </div>
      </div>

      {errorToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <p className="font-semibold text-sm">{errorToast}</p>
            <button onClick={() => setErrorToast(null)} className="ml-4 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-16">
        {/* Accounts Tabbed Area */}
        <div className="space-y-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400">
                  <Wallet className="w-5 h-5" />
                </div>
                Accounts
              </h3>
              <p className="text-zinc-500 text-sm mt-2">Manage your bank, cash, and asset accounts.</p>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/5 w-fit">
            {accountSections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveAccountTab(sec.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  activeAccountTab === sec.id
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                )}
              >
                <sec.icon className="w-4 h-4" />
                {sec.title}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white font-bold">{activeAccountSection.title}</h4>
            <button
              onClick={() => handleOpenAddModal('accounts', activeAccountSection.defaultSubType)}
              className="group relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 overflow-hidden transition-all hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="w-4 h-4 text-emerald-400 relative z-10" />
              <span className="text-white text-xs font-bold uppercase tracking-widest relative z-10">Add New</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeAccountSection.items.length === 0 ? (
              <div className="col-span-full p-12 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <activeAccountSection.icon className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No {activeAccountSection.title.toLowerCase()} configured yet.</p>
              </div>
            ) : (
              activeAccountSection.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenEditModal(item, 'accounts')}
                  className="p-6 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 flex flex-col gap-4 group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.15)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors shadow-inner">
                        <activeAccountSection.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">{item.name}</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-1">{item.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => promptDelete(e, item.id, 'accounts', item.name)}
                      className="p-2.5 rounded-xl bg-black/20 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/5 relative z-10 flex justify-between items-end">
                    <span className="text-zinc-500 text-xs font-medium">Initial Balance</span>
                    <span className="text-white font-bold text-xl tracking-tight">{formatCurrency(item.initial_balance ?? 0)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories Tabbed Area */}
        <div className="space-y-6 relative z-10 pt-8 border-t border-white/5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400">
                  <Tag className="w-5 h-5" />
                </div>
                Categories
              </h3>
              <p className="text-zinc-500 text-sm mt-2">Manage your income and expense categories.</p>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/5 w-fit">
            {categorySections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveCategoryTab(sec.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  activeCategoryTab === sec.id
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                )}
              >
                <sec.icon className="w-4 h-4" />
                {sec.title}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white font-bold">{activeCategorySection.title}</h4>
            <button
              onClick={() => handleOpenAddModal('categories', activeCategorySection.defaultSubType)}
              className="group relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 overflow-hidden transition-all hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="w-4 h-4 text-emerald-400 relative z-10" />
              <span className="text-white text-xs font-bold uppercase tracking-widest relative z-10">Add New</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeCategorySection.items.length === 0 ? (
              <div className="col-span-full p-12 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <activeCategorySection.icon className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No {activeCategorySection.title.toLowerCase()} configured yet.</p>
              </div>
            ) : (
              activeCategorySection.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenEditModal(item, 'categories')}
                  className="p-6 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 flex flex-col gap-4 group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.15)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors shadow-inner">
                        <activeCategorySection.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">{item.name}</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-1">{item.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => promptDelete(e, item.id, 'categories', item.name)}
                      className="p-2.5 rounded-xl bg-black/20 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 relative z-10">
          <h3 className="text-xl lg:text-2xl font-bold text-white mb-8">System Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 flex flex-col justify-between gap-6">
              <div>
                <p className="text-white font-bold text-base">Base Currency</p>
                <p className="text-zinc-500 text-sm mt-2">All calculations will be shown in this currency across your dashboard.</p>
              </div>
              <select 
                value={baseCurrency}
                onChange={e => handleCurrencyChange(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500/50 text-sm font-bold appearance-none w-full transition-colors"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="NPR">NPR (रू)</option>
              </select>
            </div>
            

            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 flex flex-col justify-between gap-6 md:col-span-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-bold text-base">Full Data Export</p>
                  <p className="text-zinc-500 text-sm mt-2">Download all your transaction history for backup or external analysis.</p>
                </div>
                <button 
                  onClick={handleExport}
                  className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-5 h-5 text-blue-400" /> Export All Data
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#0A0A0B] rounded-[32px] border border-white/10 p-8 w-full max-w-md relative shadow-2xl shadow-black">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-indigo-500/5 rounded-[32px] pointer-events-none" />
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-8 relative z-10">
              {editingId ? 'Edit Configuration' : 'Add New Configuration'}
            </h2>
            <form onSubmit={handleSave} className="space-y-6 relative z-10">
              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="e.g. Chase Checkings"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                >
                  {modalType === 'accounts' ? (
                    <>
                      <option value="bank">Bank Account</option>
                      <option value="cash">Physical Cash</option>
                      <option value="asset">Investment / Asset</option>
                    </>
                  ) : (
                    <>
                      <option value="income">Income Source</option>
                      <option value="expense">Expense Category</option>
                    </>
                  )}
                </select>
              </div>
              {modalType === 'accounts' && (
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Initial Balance</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">{getCurrencySymbol()}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.initial_balance}
                      onChange={e => setFormData({ ...formData, initial_balance: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      required
                    />
                  </div>
                </div>
              )}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold tracking-wide transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_60px_rgba(16,185,129,0.3)] hover:-translate-y-0.5"
                >
                  {editingId ? 'Save Changes' : 'Create & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#0A0A0B] rounded-[32px] border border-white/10 p-8 w-full max-w-md relative shadow-2xl shadow-black text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-[32px] pointer-events-none" />
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 relative z-10">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Delete {itemToDelete.type === 'accounts' ? 'Account' : 'Category'}</h2>
            <p className="text-zinc-400 mb-8 relative z-10">
              Are you sure you want to delete <span className="text-white font-bold">{itemToDelete.name}</span>?
              This will permanently remove it and all associated transactions.
            </p>
            <div className="flex gap-4 relative z-10">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_50px_rgba(239,68,68,0.3)] transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {successToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl shadow-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-emerald-400 font-bold text-sm">{successToast}</p>
          </div>
        </div>
      )}
    </div>
  );
}
