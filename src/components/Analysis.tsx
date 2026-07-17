import React, { useState, useEffect } from 'react';
import {
  Zap,
  RefreshCw,
  TrendingUp,
  Heart,
  Flame,
  PieChart,
  Percent,
  Landmark,
  Briefcase,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';
import InsightCards from './InsightCards';
import ForecastSection from './ForecastSection';
import HealthScoreCard from './HealthScoreCard';
import RecurringSection from './RecurringSection';
import FirePath from './FirePath';
import { generateInsights } from '@/src/lib/insightsEngine';
import { computeForecast } from '@/src/lib/forecastEngine';
import { computeHealthScore } from '@/src/lib/healthScoreEngine';
import { detectRecurring } from '@/src/lib/recurringDetectionEngine';
import { categoryBreakdown, computeNetWorthCAGR, computePassiveMetrics } from '@/src/lib/breakdownEngine';
import { Card, PageHeader, EmptyState, Badge } from '@/src/components/ui';

type Tab = 'insights' | 'breakdown' | 'forecast' | 'health' | 'recurring' | 'fire';
type TimeRange = 'monthly' | 'quarterly' | 'yearly' | 'all';

function CategoryBars({
  items,
  total,
  tone,
  emptyLabel,
}: {
  items: { name: string; total: number; count: number; pct: number }[];
  total: number;
  tone: 'expense' | 'income';
  emptyLabel: string;
}) {
  if (!items.length) {
    return <EmptyState icon={PieChart} title={emptyLabel} />;
  }

  const barColor = tone === 'expense' ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]';
  const amountColor = tone === 'expense' ? 'text-[var(--danger)]' : 'text-[var(--accent)]';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-[var(--border-1)]">
        <span className="text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-widest">
          Total {tone === 'expense' ? 'Spent' : 'Received'}
        </span>
        <span className={cn('tnum font-bold text-xl', amountColor)}>{formatCurrency(total)}</span>
      </div>
      {items.map((item, i) => (
        <div key={item.name}>
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">{item.name}</span>
            <div className="text-right">
              <span className="tnum text-sm font-bold text-[var(--text-primary)]">{formatCurrency(item.total)}</span>
              <span className="text-[var(--text-tertiary)] text-xs ml-2">
                {item.pct.toFixed(1)}% · {item.count}x
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', barColor)}
              initial={{ width: 0 }}
              animate={{ width: `${item.pct}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analysis() {
  const [history, setHistory] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [activeTab, setActiveTab] = useState<Tab>('insights');
  const { fetchWithAuth } = useApi();

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/dashboard/history?months=24').then(r => r.json()),
      fetchWithAuth('/api/transactions').then(r => r.json()),
      fetchWithAuth('/api/accounts').then(r => r.json()),
    ]).then(([hist, allTx, accs]) => {
      setHistory(hist);
      setAllTransactions(allTx);
      setAccounts(accs);
    }).catch(console.error);
  }, [fetchWithAuth]);

  // Period-filtered transactions for breakdown + recurring detection
  const transactions = React.useMemo(() => {
    if (timeRange === 'all') return allTransactions;
    const now = new Date();
    const startDate = new Date();
    if (timeRange === 'monthly') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === 'quarterly') startDate.setMonth(now.getMonth() - 3);
    else startDate.setFullYear(now.getFullYear() - 1);
    return allTransactions.filter((t: any) => new Date(t.date) >= startDate);
  }, [allTransactions, timeRange]);

  const insights = generateInsights(history);
  const forecast = history.length >= 2 ? computeForecast(history) : null;
  const healthScore = computeHealthScore(history, accounts);
  const recurringResult = detectRecurring(transactions);

  const expenseBreakdown = React.useMemo(() => categoryBreakdown(transactions, 'expense'), [transactions]);
  const incomeBreakdown = React.useMemo(() => categoryBreakdown(transactions, 'income'), [transactions]);
  const nwCAGR = React.useMemo(() => computeNetWorthCAGR(history), [history]);
  const passive = React.useMemo(() => computePassiveMetrics(allTransactions, history), [allTransactions, history]);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'insights', label: 'Insights', icon: Zap },
    { id: 'breakdown', label: 'Breakdown & CAGR', icon: PieChart },
    { id: 'forecast', label: 'Forecast', icon: TrendingUp },
    { id: 'health', label: 'Health Score', icon: Heart },
    { id: 'recurring', label: 'Recurring', icon: RefreshCw },
    { id: 'fire', label: 'FIRE Path', icon: Flame },
  ];

  const TIME_TABS: { id: TimeRange; label: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'yearly', label: 'Yearly' },
    { id: 'all', label: 'All Time' },
  ];

  const periodLabel = TIME_TABS.find(t => t.id === timeRange)?.label || '';

  return (
    <div className="space-y-8 lg:space-y-10 max-w-7xl mx-auto pb-12 lg:pb-0">
      <PageHeader
        title="Financial Analysis"
        description="Deep dive into your financial patterns and net worth growth."
        actions={
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-[var(--border-1)] self-start overflow-x-auto no-scrollbar max-w-full">
            {TIME_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  timeRange === t.id ? "bg-[var(--accent)] text-[#04140e]" : "text-[var(--text-tertiary)] hover:text-white"
                )}
              >{t.label}</button>
            ))}
          </div>
        }
      />

      {/* Feature Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
              activeTab === t.id
                ? "bg-white/10 text-[var(--text-primary)] border-[var(--border-2)]"
                : "bg-transparent text-[var(--text-tertiary)] border-[var(--border-1)] hover:text-white hover:bg-white/5"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
        {activeTab === 'insights' && (
          <Card level={1} padding="lg">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Smart Insights</h3>
            <InsightCards insights={insights} maxShow={8} />
          </Card>
        )}

        {activeTab === 'breakdown' && (
          <div className="space-y-6">
            {/* Growth metrics — always full-history, independent of the period selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card level={1} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest">Net Worth CAGR</p>
                  <Percent className="w-4 h-4 text-[var(--accent)]" />
                </div>
                {nwCAGR ? (
                  <>
                    <p className={cn("tnum text-3xl font-bold tracking-tight", nwCAGR.cagr >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]")}>
                      {nwCAGR.cagr > 999 ? '>999' : `${nwCAGR.cagr >= 0 ? '+' : ''}${nwCAGR.cagr.toFixed(1)}`}%
                    </p>
                    <p className="text-[var(--text-tertiary)] text-xs">
                      Annualized over {nwCAGR.months} months, incl. contributions — {formatCurrency(nwCAGR.start)} → {formatCurrency(nwCAGR.end)}
                    </p>
                  </>
                ) : (
                  <p className="text-[var(--text-tertiary)] text-sm">Need at least 2 months of history.</p>
                )}
              </Card>

              <Card level={1} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest">Passive Income (12M)</p>
                  <Briefcase className="w-4 h-4 text-[var(--gold)]" />
                </div>
                <p className="tnum text-3xl font-bold tracking-tight text-[var(--text-primary)]">{formatCurrency(passive.passiveT12)}</p>
                <div className="flex items-center gap-2">
                  {passive.passiveGrowthPct !== null ? (
                    <Badge tone={passive.passiveGrowthPct >= 0 ? 'success' : 'danger'} trend={passive.passiveGrowthPct >= 0 ? 'up' : 'down'}>
                      {passive.passiveGrowthPct >= 0 ? '+' : ''}{passive.passiveGrowthPct.toFixed(1)}% YoY
                    </Badge>
                  ) : (
                    <span className="text-[var(--text-tertiary)] text-xs">Interest, dividends & other non-salary income</span>
                  )}
                </div>
              </Card>

              <Card level={1} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest">Effective Yield</p>
                  <Landmark className="w-4 h-4 text-blue-400" />
                </div>
                {passive.yieldPct !== null ? (
                  <>
                    <p className="tnum text-3xl font-bold tracking-tight text-blue-400">{passive.yieldPct.toFixed(2)}%</p>
                    <p className="text-[var(--text-tertiary)] text-xs">
                      12-month passive income ÷ average net worth ({formatCurrency(passive.avgNetWorth)})
                    </p>
                  </>
                ) : (
                  <p className="text-[var(--text-tertiary)] text-sm">Record non-salary income (e.g. interest) to see your yield.</p>
                )}
              </Card>
            </div>

            {/* Salary vs Passive split */}
            <Card level={1} padding="lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Income Sources — Trailing 12 Months</h3>
                  <p className="text-[var(--text-tertiary)] text-sm mt-1">How much of your income works for you vs comes from work.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] border border-[var(--border-1)] rounded-2xl p-5">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest mb-2">Salary</p>
                  <p className="tnum text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(passive.salaryT12)}</p>
                  <p className="text-[var(--text-tertiary)] text-xs mt-1">
                    {passive.salaryT12 + passive.passiveT12 > 0
                      ? ((passive.salaryT12 / (passive.salaryT12 + passive.passiveT12)) * 100).toFixed(1)
                      : '0.0'}% of income
                  </p>
                </div>
                <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/15 rounded-2xl p-5">
                  <p className="text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest mb-2">Interest & Other Passive</p>
                  <p className="tnum text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(passive.passiveT12)}</p>
                  <p className="text-[var(--text-tertiary)] text-xs mt-1">
                    {passive.salaryT12 + passive.passiveT12 > 0
                      ? ((passive.passiveT12 / (passive.salaryT12 + passive.passiveT12)) * 100).toFixed(1)
                      : '0.0'}% of income
                  </p>
                </div>
              </div>
            </Card>

            {/* Period breakdowns — follow the Monthly/Quarterly/Yearly/All selector */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card level={1} padding="lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Spending by Category</h3>
                    <p className="text-[var(--text-tertiary)] text-xs">{periodLabel} — e.g. fuel, groceries, rent</p>
                  </div>
                </div>
                <CategoryBars
                  items={expenseBreakdown.items}
                  total={expenseBreakdown.total}
                  tone="expense"
                  emptyLabel={`No expenses recorded for this period.`}
                />
              </Card>

              <Card level={1} padding="lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Income by Category</h3>
                    <p className="text-[var(--text-tertiary)] text-xs">{periodLabel} — salary vs interest & more</p>
                  </div>
                </div>
                <CategoryBars
                  items={incomeBreakdown.items}
                  total={incomeBreakdown.total}
                  tone="income"
                  emptyLabel={`No income recorded for this period.`}
                />
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'forecast' && (
          <Card level={1} padding="lg" className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Net Worth Forecast</h3>
              <p className="text-[var(--text-tertiary)] text-sm mt-1">Based on your historical savings rate and trends.</p>
            </div>
            {forecast ? (
              <ForecastSection forecast={forecast} history={history} compact={false} />
            ) : (
              <EmptyState icon={TrendingUp} title="Add transactions over multiple months to enable forecasting." />
            )}
          </Card>
        )}

        {activeTab === 'health' && (
          <HealthScoreCard score={healthScore} compact={false} />
        )}

        {activeTab === 'recurring' && (
          <Card level={1} padding="lg" className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Recurring Transactions</h3>
              <p className="text-[var(--text-tertiary)] text-sm mt-1">Patterns detected in your {periodLabel.toLowerCase()} transaction history.</p>
            </div>
            <RecurringSection result={recurringResult} />
          </Card>
        )}

        {activeTab === 'fire' && (
          <FirePath history={history} accounts={accounts} />
        )}
      </motion.div>
    </div>
  );
}
