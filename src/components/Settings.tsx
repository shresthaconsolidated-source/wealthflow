import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  Wallet, 
  Briefcase, 
  Tag,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';

export default function Settings() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(res => res.json()),
      fetch('/api/categories').then(res => res.json())
    ]).then(([accs, cats]) => {
      setAccounts(accs);
      setCategories(cats);
      setLoading(false);
    });
  }, []);

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
              <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest">
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
    </div>
  );
}
