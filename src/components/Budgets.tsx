import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  X
} from 'lucide-react';
import { useApi } from '@/src/hooks/useApi';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import { motion } from 'motion/react';

export default function Budgets() {
  const { fetchWithAuth } = useApi();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ category_id: '', amount_limit: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [budgetsRes, categoriesRes, rxRes] = await Promise.all([
        fetchWithAuth('/api/budgets').then(res => res.json()),
        fetchWithAuth('/api/categories').then(res => res.json()),
        fetchWithAuth('/api/transactions').then(res => res.json()),
      ]);

      setBudgets(budgetsRes || []);
      setCategories(categoriesRes || []);
      setTransactions(rxRes || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load budgets data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchWithAuth]);

  // Compute spending per category for the current month
  const currentMonthTransactions = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions]);

  const spendingByCategory = React.useMemo(() => {
    const totals: Record<string, number> = {};
    currentMonthTransactions.forEach(t => {
      if (t.type === 'expense' && t.category_id) {
        totals[t.category_id] = (totals[t.category_id] || 0) + Number(t.amount_base || t.amount);
      }
    });
    return totals;
  }, [currentMonthTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        category_id: formData.category_id,
        amount_limit: parseFloat(formData.amount_limit)
      };

      // Check if trying to add duplicate budget for category
      const existing = budgets.find(b => b.category_id === formData.category_id);
      if (existing) {
        payload['id'] = existing.id; // Update instead if it exists
      }

      const res = await fetchWithAuth('/api/budgets', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setFormData({ category_id: '', amount_limit: '' });
        fetchData(); // Refresh all
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/budgets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Only show expense categories for budgeting
  const expenseCategories = categories.filter(c => c.type === 'expense');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto pb-12 lg:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-emerald-400" />
            Monthly Budgets
          </h1>
          <p className="text-zinc-500 mt-2 text-sm lg:text-base max-w-xl">
            Set limits on your high-spending categories and track your pacing through the month. Keep your expenses in the green.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 text-sm lg:text-base shrink-0"
        >
          <Plus className="w-5 h-5" />
          Create Budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length === 0 ? (
          <div className="col-span-full p-12 rounded-[32px] bg-[#151518] border border-white/5 text-center flex flex-col items-center justify-center">
             <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <Target className="w-10 h-10 text-emerald-400" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">No budgets set up yet</h3>
             <p className="text-zinc-500 max-w-md mx-auto mb-8">
               Setting a budget is the best way to get your spending under control. Choose a category and set a realistic monthly limit to get started. 
             </p>
             <button
                onClick={() => setShowAddModal(true)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-3 rounded-2xl font-bold transition-all text-sm"
             >
                Set First Budget
             </button>
          </div>
        ) : (
          budgets.map(budget => {
            const spent = spendingByCategory[budget.category_id] || 0;
            const limit = Number(budget.amount_limit);
            const percent = limit > 0 ? (spent / limit) * 100 : 0;
            const isOver = percent > 100;
            const isNear = percent > 85 && !isOver;
            const remaining = limit - spent;
            
            // Find category to get name/icon if populated, otherwise fallback
            const categoryData = categories.find(c => c.id === budget.category_id) || budget.categories;
            const categoryName = categoryData?.name || 'Unknown Category';

            return (
              <motion.div 
                key={budget.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "p-6 lg:p-8 rounded-[32px] border transition-all relative overflow-hidden group",
                  isOver 
                    ? "bg-red-500/5 border-red-500/20" 
                    : isNear 
                      ? "bg-amber-500/5 border-amber-500/20" 
                      : "bg-[#151518] border-white/5"
                )}
              >
                {isOver && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                )}

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{categoryName}</h3>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">Monthly Limit</p>
                  </div>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="p-2 rounded-xl text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 relative z-10 mt-8">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className={cn(
                        "text-3xl font-black tracking-tight",
                        isOver ? "text-red-400" : isNear ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {formatCurrency(spent)}
                      </p>
                      <p className="text-xs text-zinc-500 font-bold mt-1">spent</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-zinc-300">
                        {formatCurrency(limit)}
                      </p>
                      <p className="text-xs text-zinc-500 font-bold mt-1">budgeted</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 w-full bg-black/40 rounded-full border border-white/10 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percent, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full transition-colors relative",
                        isOver ? "bg-red-500" : isNear ? "bg-amber-500" : "bg-emerald-500"
                      )}
                    >
                      {/* Glossy highlight effect */}
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full" />
                    </motion.div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold pt-2">
                    <span className={cn(
                      isOver ? "text-red-400 flex items-center gap-1" : "text-zinc-500"
                    )}>
                      {isOver && <AlertCircle className="w-3 h-3" />}
                      {percent.toFixed(0)}% used
                    </span>
                    <span className={cn(
                      isOver ? "text-red-400" : "text-emerald-400"
                    )}>
                      {isOver 
                        ? `${formatCurrency(Math.abs(remaining))} over limit` 
                        : `${formatCurrency(remaining)} left`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#0A0A0B] rounded-[32px] border border-white/10 p-8 w-full max-w-md relative shadow-2xl shadow-black">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-[32px] pointer-events-none" />
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors relative z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-8 relative z-10">Set Category Budget</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Expense Category</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                >
                  <option value="" disabled>Select Category</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Monthly Limit</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">{getCurrencySymbol()}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.amount_limit}
                    onChange={e => setFormData({ ...formData, amount_limit: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="e.g. 500.00"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold tracking-wide transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
