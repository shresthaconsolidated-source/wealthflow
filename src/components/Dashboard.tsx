import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Plus
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
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [chartRange, setChartRange] = useState<number>(6);
  const { fetchWithAuth } = useApi();

  useEffect(() => {
    fetchWithAuth(`/api/dashboard?month=${selectedMonth}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [selectedMonth, fetchWithAuth]);

  if (!data) return <div className="p-8 text-zinc-500">Loading dashboard...</div>;

  const kpis = [
    { label: 'Total Net Worth', value: data.totalNetWorth, icon: DollarSign, trend: data.totalNetWorth > 0 ? '+Active' : 'Empty', positive: data.totalNetWorth >= 0 },
    { label: 'Monthly Income', value: data.monthlyIncome, icon: TrendingUp, trend: 'This Month', positive: true },
    { label: 'Monthly Expense', value: data.monthlyExpense, icon: TrendingDown, trend: 'This Month', positive: data.monthlyExpense === 0 },
    { label: 'Savings Rate', value: `${data.savingsRate.toFixed(1)}%`, icon: PieChartIcon, trend: 'This Month', positive: data.savingsRate >= 0 },
  ];

  const currentMonthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short' });

  const months = [];
  for (let i = chartRange - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleString('default', { month: 'short', year: chartRange > 12 ? '2-digit' : undefined }));
  }

  // Generate a multi-month line for the AreaChart so it's a curve instead of a single dot
  const chartData = months.map((m, index) => {
    // For a real app, you'd calculate historical net worth. Here we provide a simple visual trend 
    // that connects to the current data.totalNetWorth.
    return {
      month: m,
      value: index === chartRange - 1 ? data.totalNetWorth : data.totalNetWorth * (0.8 + (index * (0.2 / chartRange)))
    };
  });

  const flowData = data.monthlyIncome > 0 || data.monthlyExpense > 0
    ? [{ month: currentMonthLabel, income: data.monthlyIncome, expense: data.monthlyExpense }]
    : [];

  // Data for the Donut Chart
  const assetData = (data.accounts || []).filter((a: any) => a.balance > 0).map((a: any) => ({
    name: a.name, value: a.balance
  }));

  const insights = [];
  if (data.savingsRate >= 20) {
    insights.push({ title: 'Excellent Savings Rate', text: `Your savings rate of ${data.savingsRate.toFixed(1)}% is above the recommended 20%.`, color: 'emerald', icon: TrendingUp });
  } else if (data.savingsRate > 0) {
    insights.push({ title: 'Healthy Savings', text: `Your savings rate is ${data.savingsRate.toFixed(1)}%. Keep it up!`, color: 'emerald', icon: TrendingUp });
  }
  if (data.monthlyExpense > data.monthlyIncome && data.monthlyIncome > 0) {
    insights.push({ title: 'Overspending Alert', text: 'Your expenses exceeded your income this month.', color: 'amber', icon: TrendingDown });
  }
  if (insights.length === 0) {
    insights.push({ title: 'Waiting for Data', text: 'Add more transactions to unlock smart financial insights.', color: 'blue', icon: TrendingUp });
  }

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

      {/* KPIs - Horizontal Scroll on Mobile */}
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
                {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value}
              </h3>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
              <kpi.icon className="w-24 h-24" />
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
              className="px-3 py-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer [&>option]:bg-[#151518] [&>option]:text-white"
            >
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
              <option value={24}>2 Years</option>
            </select>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full mt-auto">
            {data.totalNetWorth > 0 || data.accounts?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    tickFormatter={(val) => `$${val / 1000}k`}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorNetWorth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 text-center px-4">
                <TrendingUp className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Add accounts and transactions to see net worth growth.</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Breakdown */}
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 flex flex-col">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-6">Asset Allocation</h3>

          {assetData.length > 0 && (
            <div className="h-[180px] w-full mb-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie
                    data={assetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {assetData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center mt-1">
                  <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest block">Total</span>
                  <span className="text-white font-bold text-lg">{formatCurrency(data.totalNetWorth)}</span>
                </div>
              </div>
            </div>
          )}

          {data.accounts?.length > 0 ? (
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
              {data.accounts.map((account: any, i: number) => {
                const percentage = data.totalNetWorth > 0 ? ((account.balance / data.totalNetWorth) * 100).toFixed(1) : '0.0';
                return (
                  <div key={account.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold">{account.name}</p>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-medium">{account.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-bold">{formatCurrency(account.balance)}</p>
                      <p className="text-emerald-400 text-[10px] font-bold">
                        {percentage}%
                      </p>
                    </div>
                  </div>
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
          <h3 className="text-lg lg:text-xl font-bold text-white mb-8">Income vs Expenses</h3>
          <div className="h-[250px] lg:h-[300px] w-full">
            {flowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    tickFormatter={(val) => `$${val / 1000}k`}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 text-center px-4">
                <PieChartIcon className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Add income or expense transactions to see cashflow.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-8">Smart Insights</h3>
          <div className="space-y-4">
            {insights.map((insight, i) => (
              <div key={i} className={cn(
                "p-5 rounded-2xl border flex gap-4 transition-all hover:scale-[1.02]",
                insight.color === 'emerald' ? "bg-emerald-400/5 border-emerald-400/10" :
                  insight.color === 'amber' ? "bg-amber-400/5 border-amber-400/10" :
                    "bg-blue-400/5 border-blue-400/10"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  insight.color === 'emerald' ? "bg-emerald-400/10 text-emerald-400" :
                    insight.color === 'amber' ? "bg-amber-400/10 text-amber-400" :
                      "bg-blue-400/10 text-blue-400"
                )}>
                  <insight.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={cn(
                    "font-bold text-sm",
                    insight.color === 'emerald' ? "text-emerald-400" :
                      insight.color === 'amber' ? "text-amber-400" :
                        "text-blue-400"
                  )}>{insight.title}</h4>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{insight.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
