import React, { useState, useEffect } from 'react';
import {
  Target,
  Zap,
  RefreshCw,
  TrendingUp,
  Activity,
  Heart
} from 'lucide-react';
import { formatCurrency, cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';
import InsightCards from './InsightCards';
import ForecastSection from './ForecastSection';
import HealthScoreCard from './HealthScoreCard';
import RecurringSection from './RecurringSection';
import { generateInsights } from '@/src/lib/insightsEngine';
import { computeForecast } from '@/src/lib/forecastEngine';
import { computeHealthScore } from '@/src/lib/healthScoreEngine';
import { detectRecurring } from '@/src/lib/recurringDetectionEngine';

type Tab = 'insights' | 'forecast' | 'health' | 'recurring';
type TimeRange = 'monthly' | 'quarterly' | 'yearly';

export default function Analysis() {
  const [history, setHistory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [activeTab, setActiveTab] = useState<Tab>('insights');
  const { fetchWithAuth } = useApi();

  useEffect(() => {
    const now = new Date();
    let startDate = new Date();
    if (timeRange === 'monthly') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === 'quarterly') startDate.setMonth(now.getMonth() - 3);
    else startDate.setFullYear(now.getFullYear() - 1);

    Promise.all([
      fetchWithAuth('/api/dashboard/history?months=12').then(r => r.json()),
      fetchWithAuth('/api/transactions').then(r => r.json()),
      fetchWithAuth('/api/accounts').then(r => r.json()),
    ]).then(([hist, allTx, accs]) => {
      setHistory(hist);
      setTransactions(allTx.filter((t: any) => new Date(t.date) >= startDate));
      setAccounts(accs);
    }).catch(console.error);
  }, [fetchWithAuth, timeRange]);

  const insights = generateInsights(history);
  const forecast = history.length >= 2 ? computeForecast(history) : null;
  const healthScore = computeHealthScore(history, accounts);
  const recurringResult = detectRecurring(transactions);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'insights', label: 'Insights', icon: Zap },
    { id: 'forecast', label: 'Forecast', icon: TrendingUp },
    { id: 'health', label: 'Health Score', icon: Heart },
    { id: 'recurring', label: 'Recurring', icon: RefreshCw },
  ];

  const TIME_TABS: { id: TimeRange; label: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'yearly', label: 'Yearly' },
  ];

  return (
    <div className="space-y-8 lg:space-y-10 max-w-7xl mx-auto pb-12 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Financial Analysis</h1>
          <p className="text-zinc-500 mt-1 text-sm lg:text-base">Deep dive into your financial patterns and net worth growth.</p>
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 self-start">
          {TIME_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                timeRange === t.id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"
              )}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Feature Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0",
              activeTab === t.id
                ? "bg-white/10 text-white border-white/15 shadow-lg"
                : "bg-transparent text-zinc-500 border-white/5 hover:text-white hover:bg-white/5"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8">
              <h3 className="text-xl font-bold text-white mb-6">Smart Insights</h3>
              <InsightCards insights={insights} maxShow={8} />
            </div>
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Net Worth Forecast</h3>
              <p className="text-zinc-500 text-sm mt-1">Based on your historical savings rate and trends.</p>
            </div>
            {forecast ? (
              <ForecastSection forecast={forecast} history={history} compact={false} />
            ) : (
              <div className="text-center py-16 text-zinc-600">
                <TrendingUp className="w-10 h-10 mx-auto mb-4 opacity-30" />
                <p>Add transactions over multiple months to enable forecasting.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <HealthScoreCard score={healthScore} compact={false} />
        )}

        {activeTab === 'recurring' && (
          <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Recurring Transactions</h3>
              <p className="text-zinc-500 text-sm mt-1">Patterns detected in your {timeRange} transaction history.</p>
            </div>
            <RecurringSection result={recurringResult} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
