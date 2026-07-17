import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Wallet,
  Briefcase,
  Tag,
  Building,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Download,
  CheckCircle2,
  LogOut,
  X,
} from 'lucide-react';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';
import { useAuth } from '@/src/contexts/AuthContext';
import { Card, Button, EmptyState, Modal } from '@/src/components/ui';

export default function Settings() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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
  const { user, logout } = useAuth();

  const showError = (message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3000);
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
    const { id, type, name } = itemToDelete;
    setItemToDelete(null); // Clear the itemToDelete state immediately

    try {
      const res = await fetchWithAuth(`/api/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showSuccess(`${name} deleted.`);
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
        showSuccess(editingId ? 'Changes saved.' : 'Created successfully.');
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
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-4">
          <ShieldAlert className="w-4 h-4" /> Configuration
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
        <p className="text-[var(--text-tertiary)] mt-2 text-sm lg:text-base">Configure your financial structure and preferences.</p>
      </div>

      {errorToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[var(--danger-soft)] backdrop-blur-xl border border-[var(--danger)]/20 text-[var(--danger)] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="font-semibold text-sm">{errorToast}</p>
            <button onClick={() => setErrorToast(null)} className="ml-4 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-16">
        {/* Accounts Tabbed Area */}
        <div className="space-y-6">
          <div className="border-b border-[var(--border-1)] pb-4">
            <h3 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                <Wallet className="w-5 h-5" />
              </div>
              Accounts
            </h3>
            <p className="text-[var(--text-tertiary)] text-sm mt-2">Manage your bank, cash, and asset accounts.</p>
          </div>

          <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-[var(--border-1)] w-fit overflow-x-auto no-scrollbar max-w-full">
            {accountSections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveAccountTab(sec.id as any)}
                className={cn(
                  "px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                  activeAccountTab === sec.id
                    ? "bg-white/10 text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
                )}
              >
                <sec.icon className="w-4 h-4" />
                {sec.title}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[var(--text-primary)] font-bold">{activeAccountSection.title}</h4>
            <Button variant="secondary" size="sm" onClick={() => handleOpenAddModal('accounts', activeAccountSection.defaultSubType)}>
              <Plus className="w-4 h-4 text-[var(--accent)]" />
              Add New
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeAccountSection.items.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={activeAccountSection.icon}
                  title={`No ${activeAccountSection.title.toLowerCase()} configured yet.`}
                  bordered
                  className="py-12"
                />
              </div>
            ) : (
              activeAccountSection.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenEditModal(item, 'accounts')}
                  className="p-6 rounded-3xl bg-[var(--surface-1)] border border-[var(--border-1)] flex flex-col gap-4 group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/20 border border-[var(--border-1)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-blue-400 transition-colors">
                        <activeAccountSection.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] font-bold text-base">{item.name}</p>
                        <p className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-widest font-bold mt-1">{item.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => promptDelete(e, item.id, 'accounts', item.name)}
                      className="p-2.5 rounded-xl bg-black/20 hover:bg-[var(--danger-soft)] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-all border border-transparent hover:border-[var(--danger)]/30"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-1)] flex justify-between items-end">
                    <span className="text-[var(--text-tertiary)] text-xs font-medium">Initial Balance</span>
                    <span className="tnum text-[var(--text-primary)] font-bold text-xl tracking-tight">{formatCurrency(item.initial_balance ?? 0)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories Tabbed Area */}
        <div className="space-y-6 pt-8 border-t border-[var(--border-1)]">
          <div className="border-b border-[var(--border-1)] pb-4">
            <h3 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                <Tag className="w-5 h-5" />
              </div>
              Categories
            </h3>
            <p className="text-[var(--text-tertiary)] text-sm mt-2">Manage your income and expense categories.</p>
          </div>

          <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-[var(--border-1)] w-fit">
            {categorySections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveCategoryTab(sec.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  activeCategoryTab === sec.id
                    ? "bg-white/10 text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-white hover:bg-white/5"
                )}
              >
                <sec.icon className="w-4 h-4" />
                {sec.title}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[var(--text-primary)] font-bold">{activeCategorySection.title}</h4>
            <Button variant="secondary" size="sm" onClick={() => handleOpenAddModal('categories', activeCategorySection.defaultSubType)}>
              <Plus className="w-4 h-4 text-[var(--accent)]" />
              Add New
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeCategorySection.items.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={activeCategorySection.icon}
                  title={`No ${activeCategorySection.title.toLowerCase()} configured yet.`}
                  bordered
                  className="py-12"
                />
              </div>
            ) : (
              activeCategorySection.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenEditModal(item, 'categories')}
                  className="p-6 rounded-3xl bg-[var(--surface-1)] border border-[var(--border-1)] flex flex-col gap-4 group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/20 border border-[var(--border-1)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-blue-400 transition-colors">
                        <activeCategorySection.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] font-bold text-base">{item.name}</p>
                        <p className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-widest font-bold mt-1">{item.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => promptDelete(e, item.id, 'categories', item.name)}
                      className="p-2.5 rounded-xl bg-black/20 hover:bg-[var(--danger-soft)] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-all border border-transparent hover:border-[var(--danger)]/30"
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

        <div className="pt-12 border-t border-[var(--border-1)]">
          <h3 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)] mb-8">System Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card level={1} padding="lg" className="flex flex-col justify-between gap-6">
              <div>
                <p className="text-[var(--text-primary)] font-bold text-base">Base Currency</p>
                <p className="text-[var(--text-tertiary)] text-sm mt-2">All calculations will be shown in this currency across your dashboard.</p>
              </div>
              <select
                value={baseCurrency}
                onChange={e => handleCurrencyChange(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-5 py-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] text-sm font-bold w-full transition-colors"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="NPR">NPR (रू)</option>
              </select>
            </Card>

            <Card level={1} padding="lg" className="flex flex-col justify-between gap-6 md:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-[var(--text-primary)] font-bold text-base">Full Data Export</p>
                  <p className="text-[var(--text-tertiary)] text-sm mt-2">Download all your transaction history for backup or external analysis.</p>
                </div>
                <Button variant="secondary" onClick={handleExport}>
                  <Download className="w-5 h-5 text-blue-400" /> Export All Data
                </Button>
              </div>
            </Card>

            <Card level={1} padding="lg" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[var(--surface-2)] border border-[var(--border-2)] overflow-hidden shrink-0">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] font-bold">
                      {user?.name?.[0] || user?.email?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[var(--text-primary)] font-bold text-base">{user?.name || 'Account'}</p>
                  <p className="text-[var(--text-tertiary)] text-sm">{user?.email}</p>
                </div>
              </div>
              <Button variant="danger" onClick={logout}>
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </Card>
          </div>
        </div>

      </div>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingId ? 'Edit Configuration' : 'Add New Configuration'}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-3">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-5 py-4 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-colors"
              placeholder="e.g. Chase Checkings"
              required
            />
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-3">Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-5 py-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-colors"
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
              <label className="block text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-3">Initial Balance</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-bold">{getCurrencySymbol()}</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={e => setFormData({ ...formData, initial_balance: e.target.value })}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl pl-10 pr-5 py-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] transition-colors"
                  required
                />
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" size="lg">
            {editingId ? 'Save Changes' : 'Create & Save'}
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title={`Delete ${itemToDelete?.type === 'accounts' ? 'Account' : 'Category'}`}
      >
        {itemToDelete && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-[var(--danger-soft)] border border-[var(--danger)]/20 flex items-center justify-center mb-6">
              <ShieldAlert className="w-7 h-7 text-[var(--danger)]" />
            </div>
            <p className="text-[var(--text-secondary)] mb-8">
              Are you sure you want to delete <span className="text-[var(--text-primary)] font-bold">{itemToDelete.name}</span>?
              This will permanently remove it and all associated transactions.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setItemToDelete(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>

      {successToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]">
          <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 backdrop-blur-xl px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl">
            <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
            <p className="text-[var(--accent)] font-bold text-sm">{successToast}</p>
          </div>
        </div>
      )}
    </div>
  );
}
