import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  CreditCard,
  Wallet,
  Briefcase,
  Tag,
  ChevronRight,
  X
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { useApi } from '@/src/hooks/useApi';

export default function Settings() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'accounts' | 'categories'>('accounts');
  const [formData, setFormData] = useState({ name: '', type: 'bank', balance: '0' });

  const { fetchWithAuth } = useApi();

  const fetchData = useCallback(() => {
    Promise.all([
      fetchWithAuth('/api/accounts').then(res => res.json()),
      fetchWithAuth('/api/categories').then(res => res.json())
    ]).then(([accs, cats]) => {
      setAccounts(accs);
      setCategories(cats);
      setLoading(false);
    }).catch(console.error);
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAccount = modalType === 'accounts';
    const endpoint = isAccount ? '/api/accounts' : '/api/categories';

    const payload = isAccount ? {
      id: 'acc-' + Math.random().toString(36).substr(2, 9),
      name: formData.name,
      type: formData.type || 'bank',
      balance: parseFloat(formData.balance || '0'),
      icon: 'Wallet',
      color: '#3b82f6'
    } : {
      id: 'cat-' + Math.random().toString(36).substr(2, 9),
      name: formData.name,
      type: formData.type || 'expense',
      icon: 'Tag',
      color: '#8b5cf6'
    };

    try {
      const res = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ name: '', type: 'bank', balance: '0' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add item', error);
    }
  };

  const sections = [
    {
      id: 'accounts',
      title: 'Accounts & Assets',
      description: 'Manage your bank accounts, cash, and investment assets.',
      items: accounts,
      icon: CreditCard,
      type: 'account'
    },
    {
      id: 'categories',
      title: 'Categories',
      description: 'Configure income and expense categories for tracking.',
      items: categories,
      icon: Tag,
      type: 'category'
    }
  ];

  return (
    <div className="space-y-10 lg:space-y-12 max-w-5xl mx-auto pb-12 lg:pb-0">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-zinc-500 mt-1 text-sm lg:text-base">Configure your financial structure and preferences.</p>
        </div>
      </div>

      <div className="space-y-10 lg:space-y-12">
        {sections.map((section) => (
          <div key={section.id} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
              <div>
                <h3 className="text-lg lg:text-xl font-bold text-white">{section.title}</h3>
                <p className="text-zinc-500 text-xs lg:text-sm mt-1">{section.description}</p>
              </div>
              <button
                onClick={() => {
                  setModalType(section.id as 'accounts' | 'categories');
                  setFormData({ name: '', type: section.id === 'accounts' ? 'bank' : 'expense', balance: '0' });
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest">
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.length === 0 ? (
                <div className="col-span-1 md:col-span-2 p-12 rounded-[32px] border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                  <section.icon className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">No {section.id} configured yet.</p>
                </div>
              ) : (
                section.items.map((item) => (
                  <div key={item.id} className="p-5 rounded-[24px] bg-[#151518] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all shadow-lg shadow-black/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                        <section.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{item.name}</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {section.type === 'account' && (
                        <span className="text-white font-bold text-sm">{formatCurrency(item.balance)}</span>
                      )}
                      <button className="p-2 rounded-xl hover:bg-red-400/10 text-zinc-600 hover:text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        <div className="pt-8 border-t border-white/5">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-6">Preferences</h3>
          <div className="space-y-4">
            <div className="p-6 rounded-[24px] bg-[#151518] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-bold text-sm">Base Currency</p>
                <p className="text-zinc-500 text-xs mt-1">All calculations will be shown in this currency.</p>
              </div>
              <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-bold appearance-none min-w-[120px]">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div className="p-6 rounded-[24px] bg-[#151518] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-bold text-sm">Data Privacy</p>
                <p className="text-zinc-500 text-xs mt-1">Manage how your data is stored and used for insights.</p>
              </div>
              <button className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 hover:underline self-start sm:self-center">
                View Privacy Policy <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151518] rounded-[32px] border border-white/10 p-6 lg:p-8 w-full max-w-md relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-6">
              Add New {modalType === 'accounts' ? 'Account' : 'Category'}
            </h2>
            <form onSubmit={handleAddNew} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-bold mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-white text-sm font-bold mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {modalType === 'accounts' ? (
                    <>
                      <option value="bank">Bank</option>
                      <option value="cash">Cash</option>
                      <option value="asset">Asset / Investment</option>
                    </>
                  ) : (
                    <>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </>
                  )}
                </select>
              </div>
              {modalType === 'accounts' && (
                <div>
                  <label className="block text-white text-sm font-bold mb-2">Initial Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={e => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 mt-4"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
