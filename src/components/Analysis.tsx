import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';

export default function Analysis() {
  const [data, setData] = useState<any>(null);
  const { fetchWithAuth } = useApi();

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/dashboard?month=' + new Date().toISOString().slice(0, 7)).then(res => res.json()),
      fetchWithAuth('/api/transactions').then(res => res.json())
    ]).then(([dashboardData, transactions]) => {
      setData({ ...dashboardData, transactions });
    }).catch(console.error);
  }, [fetchWithAuth]);

  if (!data) return <div className="p-8 text-zinc-500">Analyzing your wealth...</div>;

  const hasData = data.transactions && data.transactions.length > 0;

  const topInsights = hasData ? [
    { title: 'Initial Analysis', text: 'We are monitoring your new transactions to establish spending baselines.', color: 'blue', icon: Target, trend: TrendingUp }
  ] : [
    { title: 'Awaiting Data', text: 'Add accounts and transactions to begin intelligently analyzing your financial patterns.', color: 'emerald', icon: Zap, trend: TrendingUp }
  ];

  return (
    <div className="space-y-8 lg:space-y-10 max-w-7xl mx-auto pb-12 lg:pb-0">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Intelligent Analysis</h1>
          <p className="text-zinc-500 mt-1 text-sm lg:text-base">Deep dive into your financial patterns and future projections.</p>
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 self-start">
          <button className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20">Monthly</button>
          <button className="px-4 py-2 rounded-lg text-zinc-500 text-xs font-bold hover:text-white transition-colors">Quarterly</button>
          <button className="px-4 py-2 rounded-lg text-zinc-500 text-xs font-bold hover:text-white transition-colors">Yearly</button>
        </div>
      </div>

      {/* Top Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topInsights.map((insight, i) => (
          <div key={i} className={cn(
            "p-6 rounded-[32px] border relative overflow-hidden group transition-all hover:scale-[1.02] md:col-span-3",
            insight.color === 'emerald' ? "bg-emerald-500/5 border-emerald-500/10" :
              insight.color === 'blue' ? "bg-blue-500/5 border-blue-500/10" :
                "bg-amber-400/5 border-amber-400/10"
          )}>
            <div className="relative z-10">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                insight.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                  insight.color === 'blue' ? "bg-blue-500/20 text-blue-400" :
                    "bg-amber-400/20 text-amber-400"
              )}>
                <insight.icon className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{insight.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">{insight.text}</p>
              <div className={cn(
                "flex items-center gap-2 text-sm font-bold cursor-pointer hover:gap-3 transition-all",
                insight.color === 'emerald' ? "text-emerald-400" :
                  insight.color === 'blue' ? "text-blue-400" :
                    "text-amber-400"
              )}>
                Take Action <ArrowRight className="w-4 h-4" />
              </div>
            </div>
            <insight.trend className={cn(
              "absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] rotate-12",
              insight.color === 'emerald' ? "text-emerald-500" :
                insight.color === 'blue' ? "text-blue-500" :
                  "text-amber-500"
            )} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Savings Rate Trend */}
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg lg:text-xl font-bold text-white">Savings Rate Trend</h3>
            {hasData && <span className="text-emerald-400 text-[10px] font-bold bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest">Tracking</span>}
          </div>
          <div className="h-[250px] lg:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {hasData ? (
                <AreaChart data={[{ month: 'Now', rate: data.savingsRate }]}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(val) => `${val}%`} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
                </AreaChart>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                  <TrendingUp className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Add transactions to track your savings rate history.</p>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Analysis */}
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-8">Category Spending Analysis</h3>
          {hasData ? (
            <div className="space-y-6">
              <div className="text-sm text-zinc-400 p-4 bg-white/5 rounded-2xl border border-white/5">
                <AlertCircle className="w-5 h-5 text-blue-400 mb-2" />
                More transactions are over time required to generate AI-driven category budget insights. Keep tracking your spending!
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-zinc-500 space-y-4 border border-dashed border-white/5 rounded-2xl">
              <PieChartIcon className="w-8 h-8 opacity-20" />
              <p className="text-sm font-medium">No expenses to analyze.</p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Health Checklist */}
      <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
        <h3 className="text-lg lg:text-xl font-bold text-white mb-8">Financial Health Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { task: 'Emergency Fund (6 months)', completed: true },
            { task: 'Max out Retirement Contributions', completed: false },
            { task: 'Review Insurance Coverage', completed: true },
            { task: 'Update Will & Beneficiaries', completed: false },
            { task: 'Diversify Investment Portfolio', completed: true },
            { task: 'Reduce High-Interest Debt', completed: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border transition-colors",
                  item.completed ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" : "border-zinc-700 text-zinc-700"
                )}>
                  {item.completed && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <span className={cn("text-sm font-bold", item.completed ? "text-white" : "text-zinc-500")}>{item.task}</span>
              </div>
              {!item.completed && (
                <button className="text-[10px] font-bold text-emerald-400 hover:underline uppercase tracking-widest">Complete</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PieChartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
