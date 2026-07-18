import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Plus,
  Wallet,
  CreditCard,
  Briefcase,
  ChevronRight
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
import { useApi } from '@/src/hooks/useApi';
import InsightCards from './InsightCards';
import HealthScoreCard from './HealthScoreCard';
import ForecastSection from './ForecastSection';
import { generateInsights } from '@/src/lib/insightsEngine';
import { computeForecast } from '@/src/lib/forecastEngine';
import { computeHealthScore } from '@/src/lib/healthScoreEngine';
import { Card, Button, StatCard, EmptyState, PageHeader, Modal, Select } from '@/src/components/ui';
import { DashboardSkeleton } from '@/src/components/ui/Skeleton';
import { BudgetSummaryCard } from './Budgets';
import { GoalSummaryCard } from './Goals';
import { useCountUp } from '@/src/hooks/useCountUp';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

function AnimatedCurrency({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{formatCurrency(animated)}</>;
}

function OnboardingChecklist({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const steps = [
    { label: 'Add your first account', hint: 'Bank, cash or asset — this is where your balances live.', tab: 'settings' },
    { label: 'Record a transaction', hint: 'Try the smart input: type "lunch 12" and hit enter.', tab: 'transactions' },
    { label: 'Set a budget or goal', hint: 'Give your money a direction.', tab: 'plan' },
  ];
  return (
    <Card level={1} padding="lg" className="border-[var(--accent)]/20">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
        <p className="text-[var(--accent)] text-[11px] font-bold uppercase tracking-widest">Getting started</p>
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-5">Set up WealthFlow in 3 steps</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <button
            key={s.tab}
            onClick={() => setActiveTab(s.tab)}
            className="text-left p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-1)] hover:border-[var(--accent)]/30 hover:bg-white/[0.05] transition-all group"
          >
            <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest mb-1.5">Step {i + 1}</p>
            <p className="text-[var(--text-primary)] text-sm font-bold flex items-center gap-1.5">
              {s.label}
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
            </p>
            <p className="text-[var(--text-tertiary)] text-xs mt-1">{s.hint}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}

const COLORS = ['#2ee6a6', '#3b82f6', '#d4b76a', '#f2554e', '#8b5cf6'];

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

  if (!data) return <DashboardSkeleton />;

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

  const selectedGroupData = groupedAccounts.find(([type]) => type === selectedGroup)?.[1];

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto pb-12 lg:pb-0">
      <PageHeader
        title="Financial Overview"
        description="Welcome back. Here's what's happening with your wealth."
        actions={
          <>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-2xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] text-sm"
            />
            <Button onClick={() => setActiveTab('transactions')} size="lg">
              <Plus className="w-5 h-5" />
              Add Transaction
            </Button>
          </>
        }
      />

      {/* First-run checklist */}
      {accounts.length === 0 && <OnboardingChecklist setActiveTab={setActiveTab} />}

      {/* KPIs */}
      <div className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto lg:overflow-x-visible no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
        {kpis.map((kpi, i) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={typeof kpi.value === 'number' ? <AnimatedCurrency value={kpi.value} /> : (kpi.value || '0')}
            icon={kpi.icon}
            trend={kpi.trend}
            positive={kpi.positive}
            delay={i * 0.06}
          />
        ))}
      </div>

      {/* Budgets & Goals at a glance (render nothing until configured) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 empty:hidden">
        <BudgetSummaryCard limit={3} />
        <GoalSummaryCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
        {/* Net Worth Chart */}
        <Card level={1} padding="lg" className="lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">Net Worth Growth</h3>
            <Select pill value={chartRange} onChange={(e) => setChartRange(Number(e.target.value))}>
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
              <option value={24}>2 Years</option>
            </Select>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full mt-auto">
            {totalNetWorth > 0 || accounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2ee6a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2ee6a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b8b94', fontSize: 11, fontWeight: 500 }} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b8b94', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(val) => `${getCurrencySymbol()}${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    width={70}
                    domain={['dataMin * 0.8', 'auto']}
                  />
                  <Tooltip contentStyle={{ backgroundColor: '#191b21', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="value" stroke="#2ee6a6" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No net worth history yet"
                description="Add accounts to see your growth over time."
              />
            )}
          </div>
        </Card>

        {/* Account Breakdown (Grouped) */}
        <Card level={1} padding="lg" className="flex flex-col">
          <h3 className="text-lg lg:text-xl font-bold text-[var(--text-primary)] mb-6">Asset Allocation</h3>

          {assetData.length > 0 && (
            <div className="h-[180px] w-full mb-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={{ backgroundColor: '#191b21', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                  <Pie data={assetData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {assetData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center mt-1">
                  <span className="text-[var(--accent)] font-bold text-xs uppercase tracking-widest block">Total</span>
                  <span className="tnum text-[var(--text-primary)] font-bold text-lg">{formatCurrency(totalNetWorth)}</span>
                </div>
              </div>
            </div>
          )}

          {groupedAccounts.length > 0 ? (
            <div className="space-y-3.5 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
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
                        <p className="text-[var(--text-primary)] text-sm font-bold">{group.label}</p>
                        <p className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-widest font-medium">{group.accounts.length} Accounts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="tnum text-[var(--text-primary)] text-sm font-bold">{formatCurrency(group.total)}</p>
                        <p className={cn("text-[10px] font-bold", `text-${group.color}`)}>
                          {percentage}%
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={DollarSign} title="No accounts added yet" bordered className="flex-1 mb-6" />
          )}
          <Button variant="secondary" onClick={() => setActiveTab('settings')} className="w-full mt-auto">
            View All Accounts
          </Button>
        </Card>
      </div>

      {/* Income vs Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
        <Card level={1} padding="lg">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">Income vs Expenses</h3>
            <Select pill value={flowChartRange} onChange={(e) => setFlowChartRange(Number(e.target.value))}>
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
              <option value={24}>2 Years</option>
            </Select>
          </div>
          <div className="h-[250px] lg:h-[300px] w-full mt-auto">
            {flowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b8b94', fontSize: 11, fontWeight: 500 }} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#8b8b94', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(val) => `${getCurrencySymbol()}${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    width={70}
                    domain={['dataMin * 0.8', 'auto']}
                  />
                  <Tooltip contentStyle={{ backgroundColor: '#191b21', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }} />
                  <Bar dataKey="income" fill="#2ee6a6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f2554e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={PieChartIcon} title="No cashflow data for this month" />
            )}
          </div>
        </Card>

        <Card level={1} padding="lg">
          <h3 className="text-lg lg:text-xl font-bold text-[var(--text-primary)] mb-6">Smart Insights</h3>
          <InsightCards insights={smartInsights} maxShow={3} />
        </Card>
      </div>

      {/* Health Score + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
        <HealthScoreCard score={healthScore} compact />
        {forecast ? (
          <Card level={1} padding="lg">
            <h3 className="text-lg lg:text-xl font-bold text-[var(--text-primary)] mb-6">Net Worth Forecast</h3>
            <ForecastSection forecast={forecast} history={history} compact />
          </Card>
        ) : (
          <Card level={1} padding="lg" className="flex items-center justify-center">
            <p className="text-[var(--text-tertiary)] text-sm text-center">More data needed for forecasting.</p>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        title={selectedGroup ? `${selectedGroup.charAt(0).toUpperCase()}${selectedGroup.slice(1)}s` : ''}
        description={selectedGroup ? `Breakdown of your ${selectedGroup} accounts` : ''}
        footer={
          selectedGroup && (
            <div className="flex justify-between items-center">
              <p className="text-[var(--text-tertiary)] text-sm font-bold uppercase tracking-widest">Total {selectedGroup}s</p>
              <p className="tnum text-[var(--text-primary)] text-2xl font-bold">
                {formatCurrency(selectedGroupData?.total || 0)}
              </p>
            </div>
          )
        }
      >
        <div className="space-y-3">
          {(selectedGroupData?.accounts || [])
            .sort((a: any, b: any) => Number(b.balance || 0) - Number(a.balance || 0))
            .map((acc: any) => (
              <div key={acc.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-[var(--text-tertiary)]">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] font-bold text-sm">{acc.name || 'Account'}</p>
                    <p className="text-[var(--text-tertiary)] text-xs">{acc.type || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="tnum text-[var(--text-primary)] font-bold">{formatCurrency(acc.balance || 0)}</p>
                  <p className="text-[var(--accent)] text-xs font-bold">
                    {totalNetWorth > 0 ? ((Number(acc.balance || 0) / totalNetWorth) * 100).toFixed(1) : '0.0'}%
                  </p>
                </div>
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
}
