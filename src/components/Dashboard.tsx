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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetch(`/api/dashboard?month=${selectedMonth}`)
      .then(res => res.json())
      .then(setData);
  }, [selectedMonth]);

  if (!data) return <div className="p-8 text-zinc-500">Loading dashboard...</div>;

  const kpis = [
    { label: 'Total Net Worth', value: data.totalNetWorth, icon: DollarSign, trend: '+2.4%', positive: true },
    { label: 'Monthly Income', value: data.monthlyIncome, icon: TrendingUp, trend: '+12%', positive: true },
    { label: 'Monthly Expense', value: data.monthlyExpense, icon: TrendingDown, trend: '-5%', positive: true },
    { label: 'Savings Rate', value: `${data.savingsRate.toFixed(1)}%`, icon: PieChartIcon, trend: '+1.2%', positive: true },
  ];

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
        <div className="lg:col-span-2 bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg lg:text-xl font-bold text-white">Net Worth Growth</h3>
            <span className="px-3 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">12 Months</span>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                  tickFormatter={(val) => `$${val/1000}k`}
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
          </div>
        </div>

        {/* Account Breakdown */}
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-6">Asset Allocation</h3>
          <div className="space-y-5">
            {data.accounts.map((account: any, i: number) => (
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
                    {((account.balance / data.totalNetWorth) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-4 rounded-2xl border border-white/5 text-zinc-500 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest">
            View All Accounts
          </button>
        </div>
      </div>

      {/* Income vs Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-8">Income vs Expenses</h3>
          <div className="h-[250px] lg:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockFlowData}>
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
                  tickFormatter={(val) => `$${val/1000}k`}
                  width={35}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-8">Smart Insights</h3>
          <div className="space-y-4">
            {[
              { title: 'Healthy Savings Rate', text: `Your savings rate of ${data.savingsRate.toFixed(1)}% is 15% higher than your average.`, color: 'emerald', icon: TrendingUp },
              { title: 'Expense Spike Detected', text: 'Entertainment expenses are 40% higher than last month. Consider reviewing.', color: 'amber', icon: TrendingDown },
              { title: 'Net Worth Milestone', text: 'You are only $5,400 away from your next goal. Keep it up!', color: 'blue', icon: TrendingUp },
            ].map((insight, i) => (
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

const mockChartData = [
  { month: 'Jan', value: 45000 },
  { month: 'Feb', value: 47200 },
  { month: 'Mar', value: 46800 },
  { month: 'Apr', value: 49500 },
  { month: 'May', value: 52100 },
  { month: 'Jun', value: 55000 },
  { month: 'Jul', value: 58200 },
  { month: 'Aug', value: 61000 },
  { month: 'Sep', value: 64500 },
  { month: 'Oct', value: 68200 },
  { month: 'Nov', value: 72100 },
  { month: 'Dec', value: 75000 },
];

const mockFlowData = [
  { month: 'Jul', income: 8500, expense: 4200 },
  { month: 'Aug', income: 8500, expense: 4800 },
  { month: 'Sep', income: 9200, expense: 4500 },
  { month: 'Oct', income: 8800, expense: 5100 },
  { month: 'Nov', income: 10500, expense: 4600 },
  { month: 'Dec', income: 12000, expense: 6200 },
];
