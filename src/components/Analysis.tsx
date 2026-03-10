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

export default function Analysis() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="p-8 text-zinc-500">Analyzing your wealth...</div>;

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
        {[
          { title: 'Savings Momentum', text: 'Your savings rate has increased by 12% over the last 3 months. You are on track to reach your goal early.', color: 'emerald', icon: Zap, trend: TrendingUp },
          { title: 'Asset Allocation', text: 'Your portfolio is currently 65% in cash. Consider rebalancing to hedge against inflation.', color: 'blue', icon: Target, trend: PieChartIcon },
          { title: 'Expense Volatility', text: 'Your discretionary spending shows high volatility. Establishing a stricter budget could save you $400/mo.', color: 'amber', icon: AlertCircle, trend: TrendingDown },
        ].map((insight, i) => (
          <div key={i} className={cn(
            "p-6 rounded-[32px] border relative overflow-hidden group transition-all hover:scale-[1.02]",
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
            <span className="text-emerald-400 text-[10px] font-bold bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest">Avg 32%</span>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockSavingsTrend}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(val) => `${val}%`} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Analysis */}
        <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
          <h3 className="text-lg lg:text-xl font-bold text-white mb-8">Category Overspending</h3>
          <div className="space-y-6">
            {[
              { category: 'Dining Out', spent: 1200, budget: 800, status: 'critical' },
              { category: 'Subscriptions', spent: 150, budget: 100, status: 'warning' },
              { category: 'Transport', spent: 450, budget: 500, status: 'good' },
              { category: 'Utilities', spent: 320, budget: 350, status: 'good' },
            ].map((item) => (
              <div key={item.category} className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-white text-sm font-bold">{item.category}</span>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Budget: {formatCurrency(item.budget)}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "font-bold text-sm",
                      item.status === 'critical' ? "text-red-400" : 
                      item.status === 'warning' ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {formatCurrency(item.spent)}
                    </span>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                      {((item.spent / item.budget) * 100).toFixed(0)}% used
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((item.spent / item.budget) * 100, 100)}%` }}
                    className={cn(
                      "h-full rounded-full",
                      item.status === 'critical' ? "bg-red-400" : 
                      item.status === 'warning' ? "bg-amber-400" : "bg-emerald-400"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
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

const mockSavingsTrend = [
  { month: 'Jan', rate: 25 },
  { month: 'Feb', rate: 28 },
  { month: 'Mar', rate: 22 },
  { month: 'Apr', rate: 30 },
  { month: 'May', rate: 35 },
  { month: 'Jun', rate: 32 },
  { month: 'Jul', rate: 38 },
  { month: 'Aug', rate: 41 },
  { month: 'Sep', rate: 39 },
  { month: 'Oct', rate: 45 },
  { month: 'Nov', rate: 42 },
  { month: 'Dec', rate: 48 },
];
