import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Wallet,
  CreditCard,
  Briefcase,
  X,
  ChevronRight,
  Target
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';
import InsightCards from './InsightCards';
import HealthScoreCard from './HealthScoreCard';
import ForecastSection from './ForecastSection';
import { generateInsights } from '@/src/lib/insightsEngine';
import { computeForecast } from '@/src/lib/forecastEngine';
import { computeHealthScore } from '@/src/lib/healthScoreEngine';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [chartRange, setChartRange] = useState<number>(6);
  const [flowChartRange, setFlowChartRange] = useState<number>(6);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { fetchWithAuth } = useApi();

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchWithAuth(`/api/dashboard?month=${selectedMonth}`)
      .then(res => res.json())
      .then(d => {
        console.log('Dashboard Data:', d);
        setData(d);
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
      });
  }, [selectedMonth, fetchWithAuth]);

  useEffect(() => {
    fetchWithAuth('/api/dashboard/history?months=12')
      .then(res => res.json())
      .then(setHistory)
      .catch(err => {
        console.error('Error fetching history:', err);
      });
  }, [fetchWithAuth]);

  const accounts = data?.accounts || [];

  // Robust Grouping Logic
  const groupedAccounts = React.useMemo(() => {
    const groups: Record<string, { label: string, icon: any, color: string, total: number, accounts: any[] }> = {
      bank: { label: 'Bank', icon: CreditCard, color: 'blue-400', total: 0, accounts: [] },
      cash: { label: 'Cash', icon: Wallet, color: 'emerald-400', total: 0, accounts: [] },
      asset: { label: 'Assets', icon: Briefcase, color: 'amber-400', total: 0, accounts: [] },
    };

    try {
      accounts.forEach((acc: any) => {
        const type = String(acc.type || 'asset').toLowerCase();
        const targetGroup = groups[type] || groups.asset;
        targetGroup.total += Number(acc.balance || 0);
        targetGroup.accounts.push(acc);
      });
    } catch (e) {
      console.error('Error grouping accounts:', e);
    }

    return Object.entries(groups)
      .filter(([_, g]) => g.accounts.length > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [accounts]);

  if (!data) return <div className="p-8 text-zinc-500">Loading dashboard...</div>;

  // Defensive calculations
  const totalNetWorth = Number(data.totalNetWorth || 0);
  const monthlyIncome = Number(data.monthlyIncome || 0);
  const monthlyExpense = Number(data.monthlyExpense || 0);
  const savingsRate = Number(data.savingsRate || 0);

  const kpis = [
    { label: 'Total Net Worth', value: totalNetWorth, icon: DollarSign, trend: totalNetWorth > 0 ? '+Active' : 'Empty', positive: totalNetWorth >= 0 },
    { label: 'Monthly Income', value: monthlyIncome, icon: TrendingUp, trend: 'This Month', positive: true },
    { label: 'Monthly Expense', value: monthlyExpense, icon: TrendingDown, trend: 'This Month', positive: monthlyExpense === 0 },
    { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, icon: PieChartIcon, trend: 'This Month', positive: savingsRate >= 0 },
  ];

  const currentMonthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short' });

  const chartData = (history || []).slice(-chartRange).map((h) => ({
    month: h.label || 'N/A',
    value: Number(h.netWorth || 0)
  }));

  const flowData = (history || []).slice(-flowChartRange).map((h) => ({
    month: h.label || 'N/A',
    income: Number(h.income || 0),
    expense: Number(h.expense || 0)
  }));

  const assetData = accounts.filter((a: any) => Number(a.balance) > 0).map((a: any) => ({
    name: a.name || 'Account', value: Number(a.balance)
  }));

  const smartInsights = generateInsights(history || []);
  const forecast = (history || []).length >= 2 ? computeForecast(history) : null;
  const healthScore = computeHealthScore(history || [], accounts);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 lg:pb-0">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Financial Overview</h1>
          <p className="text-zinc-500 mt-1 text-sm lg:text-base">Welcome back. Here's what's happening with your wealth.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
          />
          <button
            onClick={() => setActiveTab('transactions')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto lg:overflow-x-visible no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-4 lg:pb-0">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="min-w-[280px] lg:min-w-0 flex-1 bg-[#151518] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-white/5 text-zinc-400 group-hover:text-emerald-400 transition-colors">
                <kpi.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                kpi.positive ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
              )}>
                {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.trend}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{kpi.label}</p>
              <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : (kpi.value || '0')}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Net Worth Chart */}
        <div className="lg:col-span-2 bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg lg:text-xl font-bold text-white">Net Worth Growth</h3>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
              <option value={24}>2 Years</option>
            </select>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full mt-auto">
            {totalNetWorth > 0 || accounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }} 
                    tickFormatter={(val) => `${getCurrencySymbol()}${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} 
                    width={60}
                    tickCount={6}
                  />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 text-center px-4">
                <TrendingUp className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Add accounts to see net worth growth.</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Breakdown (Grouped) */}
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 flex flex-col">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-6">Asset Allocation</h3>

          {assetData.length > 0 && (
            <div className="h-[180px] w-full mb-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                  <Pie data={assetData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {assetData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center mt-1">
                  <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest block">Total</span>
                  <span className="text-white font-bold text-lg">{formatCurrency(totalNetWorth)}</span>
                </div>
              </div>
            </div>
          )}

          {groupedAccounts.length > 0 ? (
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
              {groupedAccounts.map(([type, group]) => {
                const percentage = totalNetWorth > 0 ? ((group.total / totalNetWorth) * 100).toFixed(1) : '0.0';
                return (
                  <button 
                    key={type} 
                    onClick={() => setSelectedGroup(type)}
                    className="w-full flex items-center justify-between group text-left hover:bg-white/5 p-2 -mx-2 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-all",
                        `text-${group.color}`
                      )}>
                        <group.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold">{group.label}</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium">{group.accounts.length} Accounts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-white text-sm font-bold">{formatCurrency(group.total)}</p>
                        <p className={cn("text-[10px] font-bold", `text-${group.color}`)}>
                          {percentage}%
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 border border-dashed border-white/10 rounded-2xl mb-6">
              <DollarSign className="w-8 h-8 opacity-20" />
              <p className="text-sm font-medium">No accounts added yet.</p>
            </div>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className="w-full mt-auto py-4 rounded-2xl border border-white/5 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest mt-4">
            View All Accounts
          </button>
        </div>
      </div>

      {/* Income vs Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg lg:text-xl font-bold text-white">Income vs Expenses</h3>
            <select
              value={flowChartRange}
              onChange={(e) => setFlowChartRange(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
              <option value={24}>2 Years</option>
            </select>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full mt-auto">
            {flowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(val) => `${getCurrencySymbol()}${val / 1000}k`} width={35} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }} />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 text-center px-4">
                <PieChartIcon className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No cashflow data for this month.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-6">Smart Insights</h3>
          <InsightCards insights={smartInsights} maxShow={3} />
        </div>
      </div>

      <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-white">Budget Tracking</h3>
            <p className="text-zinc-500 text-xs mt-1">Monitor your monthly spending across categories.</p>
          </div>
          <button 
            onClick={() => setActiveTab('budgets')}
            className="text-emerald-400 text-xs font-bold uppercase tracking-wider hover:text-emerald-300 transition-colors"
          >
            Manage Budgets
          </button>
        </div>

        {data.budgets && data.budgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.budgets
              .sort((a: any, b: any) => (a.is_global ? -1 : 1))
              .map((budget: any) => {
                const percent = Math.min((budget.spent / budget.limit) * 100, 100);
                const isOver = budget.spent > budget.limit;
                const isGlobal = budget.is_global;
                const cat = budget.categories || { name: 'All Expenses', icon: 'Target', color: '#10b981' };

                return (
                  <div key={budget.id} className={cn(
                    "bg-white/5 rounded-2xl p-5 border",
                    isGlobal ? "border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" : "border-white/5"
                  )}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          isGlobal ? "bg-emerald-500/20" : "bg-black/20"
                        )} style={!isGlobal ? { color: cat.color } : {}}>
                          <Target className={cn("w-5 h-5", isGlobal ? "text-emerald-400" : "")} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{isGlobal ? 'All Expenses' : cat.name}</p>
                          <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{isOver ? 'Over Budget' : isGlobal ? 'Total Monthly Limit' : 'On Track'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">{formatCurrency(budget.spent)}</p>
                        <p className="text-zinc-500 text-[10px]">of {formatCurrency(budget.limit)}</p>
                      </div>
                    </div>
                    
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className={cn(
                          "h-full rounded-full",
                          isOver ? "bg-red-500" : percent > 80 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-[24px] text-zinc-500">
            <Target className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium mb-4">No budgets set for this month.</p>
            <button 
              onClick={() => setActiveTab('budgets')}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
            >
              Set Your First Budget
            </button>
          </div>
        )}
      </div>

      {/* Health Score + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <HealthScoreCard score={healthScore} compact />
        {forecast ? (
          <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
            <h3 className="text-lg lg:text-xl font-bold text-white mb-6">Net Worth Forecast</h3>
            <ForecastSection forecast={forecast} history={history} compact />
          </div>
        ) : (
          <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 flex items-center justify-center">
            <p className="text-zinc-600 text-sm text-center">More data needed for forecasting.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGroup(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[15%] bottom-[15%] lg:inset-auto lg:top-[20%] lg:left-1/2 lg:-translate-x-1/2 lg:w-[500px] bg-[#1a1a1f] border border-white/10 rounded-[32px] p-8 z-[110] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center",
                    selectedGroup === 'bank' ? 'text-blue-400' : 
                    selectedGroup === 'cash' ? 'text-emerald-400' : 'text-amber-400'
                  )}>
                    {selectedGroup === 'bank' ? <CreditCard /> : selectedGroup === 'cash' ? <Wallet /> : <Briefcase />}
                  </div>
                  <div>
                    <h3 className="text-white text-2xl font-bold capitalize">{selectedGroup}s</h3>
                    <p className="text-zinc-500 text-sm">Breakdown of your {selectedGroup} accounts</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {(groupedAccounts.find(([type]) => type === selectedGroup)?.[1]?.accounts || [])
                  .sort((a: any, b: any) => Number(b.balance || 0) - Number(a.balance || 0))
                  .map((acc: any) => (
                    <div key={acc.id} className="bg-white/5 rounded-2xl p-5 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-zinc-400">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-white font-bold">{acc.name || 'Account'}</p>
                          <p className="text-zinc-500 text-xs">{acc.type || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">{formatCurrency(acc.balance || 0)}</p>
                        <p className="text-emerald-400 text-xs font-bold">
                          {totalNetWorth > 0 ? ((Number(acc.balance || 0) / totalNetWorth) * 100).toFixed(1) : '0.0'}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Total {selectedGroup}s</p>
                <p className="text-white text-2xl font-bold">
                  {formatCurrency(groupedAccounts.find(([type]) => type === selectedGroup)?.[1]?.total || 0)}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
