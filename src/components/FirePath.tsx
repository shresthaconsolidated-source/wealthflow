import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Flame, 
  ChevronRight, 
  Settings2, 
  Zap, 
  ShieldCheck,
  Activity,
  ArrowRightLeft
} from 'lucide-react';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';

interface Props {
  history: any[];
  accounts: any[];
}

export default function FirePath({ history, accounts }: Props) {
  const { fetchWithAuth } = useApi();
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [inflation, setInflation] = useState(5.0); // Default 5%
  const [years, setYears] = useState(20); // Default 20 years
  const [manualInvestment, setManualInvestment] = useState<number | null>(null);
  const [manualReturn, setManualReturn] = useState<number | null>(null);
  const [plannedExpenses, setPlannedExpenses] = useState<number | null>(null);

  // Derived from history
  const currentNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const avgMonthlySavings = history.length > 0 
    ? history.reduce((sum, h) => sum + (h.savings || 0), 0) / history.length
    : 0;
  
  const avgExpenses = history.length > 0
    ? history.reduce((sum, h) => sum + (h.expense || 0), 0) / history.length
    : 30000; // Default fallback

  // Roughly estimate historical return if we had data, for now we default to a safe 12% for stock/mutual funds
  const historicalReturn = 12.0; 

  const effectiveInvestment = manualInvestment !== null ? manualInvestment : avgMonthlySavings;
  const effectiveReturn = manualReturn !== null ? manualReturn : historicalReturn;
  const effectiveExpenses = plannedExpenses !== null ? plannedExpenses : avgExpenses;

  useEffect(() => {
    fetchWithAuth('/api/user/settings')
      .then(res => res.json())
      .then(settings => {
        if (settings.fire_inflation !== undefined) setInflation(Number(settings.fire_inflation));
        if (settings.fire_years !== undefined) setYears(Number(settings.fire_years));
        if (settings.fire_manual_investment !== undefined) setManualInvestment(settings.fire_manual_investment);
        if (settings.fire_manual_return !== undefined) setManualReturn(settings.fire_manual_return);
        if (settings.fire_planned_expenses !== undefined) setPlannedExpenses(settings.fire_planned_expenses);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fetchWithAuth]);

  const saveSettings = (updates: any) => {
    fetchWithAuth('/api/user/settings', {
      method: 'POST',
      body: JSON.stringify({
        fire_inflation: updates.inflation ?? inflation,
        fire_years: updates.years ?? years,
        fire_manual_investment: updates.manualInvestment ?? manualInvestment,
        fire_manual_return: updates.manualReturn ?? manualReturn,
        fire_planned_expenses: updates.plannedExpenses ?? plannedExpenses,
      })
    });
  };

  // Calculations
  // FV = P * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
  const n = years;
  const r = effectiveReturn / 100 / 12; // monthly rate
  const months = n * 12;
  const pmt = Math.max(0, effectiveInvestment);
  
  const futureValueNominal = currentNetWorth * Math.pow(1 + r, months) + 
                            pmt * ((Math.pow(1 + r, months) - 1) / r);

  // Adjusted for inflation (Real value in today's terms)
  const inflationRate = inflation / 100 / 12;
  const futureValueReal = futureValueNominal / Math.pow(1 + inflationRate, months);

  const monthlyPassiveIncome = (futureValueNominal * (effectiveReturn / 100)) / 12;
  const monthlyPassiveReal = monthlyPassiveIncome / Math.pow(1 + inflationRate, months);

  // Safe Withdrawal Rate (SWR) logic
  const safeWithdrawalPct = Math.max(0, effectiveReturn - inflation);
  const safeAnnualWithdrawal = futureValueNominal * (safeWithdrawalPct / 100);
  const safeMonthlyWithdrawalToday = (safeAnnualWithdrawal / 12) / Math.pow(1 + inflationRate, months);

  const targetNetWorthReal = (effectiveExpenses * 12) / (safeWithdrawalPct / 100);
  
  // Estimate years to target
  let yearsToRetire = 0;
  if (pmt > 0 || effectiveReturn > inflation) {
    let current = currentNetWorth;
    const target = targetNetWorthReal;
    const realMonthlyRate = (effectiveReturn - inflation) / 100 / 12;
    
    if (current >= target) {
        yearsToRetire = 0;
    } else {
        let m = 0;
        while (current < target && m < 1200) {
            current = current * (1 + realMonthlyRate) + pmt;
            m++;
        }
        yearsToRetire = m / 12;
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 rounded-[40px] p-8 lg:p-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">FIRE Path Projections</h2>
              <p className="text-zinc-500 text-sm">Visualize your journey to financial freedom.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                Monthly investment
                <button 
                    onClick={() => {
                        const val = manualInvestment === null ? Math.round(avgMonthlySavings) : null;
                        setManualInvestment(val);
                        saveSettings({ manualInvestment: val });
                    }}
                    className="text-emerald-400 hover:underline"
                >
                    {manualInvestment === null ? 'Override' : 'Use History'}
                </button>
              </label>
              <div className="relative group">
                <input 
                  type="number"
                  value={manualInvestment !== null ? manualInvestment : Math.round(avgMonthlySavings)}
                  disabled={manualInvestment === null}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setManualInvestment(val);
                    saveSettings({ manualInvestment: val });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all disabled:opacity-50"
                  placeholder="0"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">{getCurrencySymbol()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                Planned Monthly Exp.
                <button 
                  onClick={() => {
                    const val = plannedExpenses === null ? Math.round(avgExpenses) : null;
                    setPlannedExpenses(val);
                    saveSettings({ plannedExpenses: val });
                  }}
                  className="text-emerald-400 hover:underline"
                >
                    {plannedExpenses === null ? 'Override' : 'Use History'}
                </button>
              </label>
              <div className="relative group">
                <input 
                  type="number"
                  value={plannedExpenses !== null ? plannedExpenses : Math.round(avgExpenses)}
                  disabled={plannedExpenses === null}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPlannedExpenses(val);
                    saveSettings({ plannedExpenses: val });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all disabled:opacity-50"
                  placeholder="0"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">{getCurrencySymbol()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                Expected Return (Ann.)
                <button 
                  onClick={() => {
                    const val = manualReturn === null ? historicalReturn : null;
                    setManualReturn(val);
                    saveSettings({ manualReturn: val });
                  }}
                  className="text-emerald-400 hover:underline"
                >
                    {manualReturn === null ? 'Override' : 'Use Default'}
                </button>
              </label>
              <div className="relative group">
                <input 
                  type="number"
                  step="0.1"
                  value={manualReturn !== null ? manualReturn : historicalReturn}
                  disabled={manualReturn === null}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setManualReturn(val);
                    saveSettings({ manualReturn: val });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all disabled:opacity-50"
                  placeholder="12.0"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Est. Inflation</label>
              <div className="relative group">
                <input 
                  type="number"
                  step="0.1"
                  value={inflation}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setInflation(val);
                    saveSettings({ inflation: val });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">%</span>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Time Horizon</label>
              <select 
                value={years}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setYears(val);
                  saveSettings({ years: val });
                }}
                className="w-full bg-[#1c1c20] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none text-center cursor-pointer"
              >
                <option value={5} className="bg-[#1c1c20] text-white">5 Years</option>
                <option value={10} className="bg-[#1c1c20] text-white">10 Years</option>
                <option value={15} className="bg-[#1c1c20] text-white">15 Years</option>
                <option value={20} className="bg-[#1c1c20] text-white">20 Years</option>
                <option value={25} className="bg-[#1c1c20] text-white">25 Years</option>
                <option value={30} className="bg-[#1c1c20] text-white">30 Years</option>
              </select>
            </div>
          </div>
        </div>

        {/* Retirement Readiness Card */}
        <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-[40px] p-8 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-sm group-hover:blur-0 transition-all duration-700">
             <ShieldCheck className="w-32 h-32 text-emerald-400" />
          </div>
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Path to Freedom</span>
            </div>
            <h3 className="text-3xl font-black text-white leading-tight">
              {yearsToRetire <= 0 ? "You can retire today!" : `Retire in ${yearsToRetire.toFixed(1)} years`}
            </h3>
            <p className="text-emerald-200/60 text-sm">
                Based on your current {formatCurrency(currentNetWorth)} wealth and target expenses of {formatCurrency(effectiveExpenses)}.
            </p>
          </div>
          
          <div className="pt-8 border-t border-emerald-500/20 mt-8 relative z-10">
            <div className="flex justify-between items-center">
              <span className="text-emerald-300/80 text-xs font-bold uppercase tracking-widest">Monthly Investment</span>
              <span className="text-white font-bold text-xl">{formatCurrency(pmt)}/mo</span>
            </div>
          </div>
        </div>
      </div>


      {/* Projection Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#151518] border border-white/5 rounded-3xl p-6 space-y-4"
        >
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Wealth in {years}y (Nominal)</p>
          <h4 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(futureValueNominal)}</h4>
          <p className="text-zinc-600 text-[10px]">The amount in the future bank balance</p>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#151518] border border-white/5 rounded-3xl p-6 space-y-4"
        >
          <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Wealth in {years}y (Today's Value)</p>
          <h4 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(futureValueReal)}</h4>
          <p className="text-zinc-600 text-[10px]">What this will buy you in today's money</p>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#151518] border border-white/5 rounded-3xl p-6 space-y-4"
        >
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Monthly Passive (Nominal)</p>
          <h4 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(monthlyPassiveIncome)}</h4>
          <p className="text-zinc-600 text-[10px]">Investment yield in {years} years</p>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#151518] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl"
        >
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Monthly Passive (Real)</p>
          <h4 className="text-2xl font-bold text-white tracking-tight">{formatCurrency(monthlyPassiveReal)}</h4>
          <p className="text-zinc-600 text-[10px]">Value of monthly passive in today's terms</p>
        </motion.div>
      </div>

      {/* Insights / Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#151518]/50 border border-white/5 rounded-[32px] p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <Activity className="w-5 h-5 text-zinc-400" />
                Sustainability Logic
            </h3>
            <div className="space-y-4">
                <div className="bg-white/5 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Sustainable Withdrawal</p>
                        <p className="text-white font-bold text-lg">{safeWithdrawalPct.toFixed(1)}% / Year</p>
                    </div>
                    <ArrowRightLeft className="w-6 h-6 text-zinc-600" />
                    <div className="text-right">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Monthly (Real Value)</p>
                        <p className="text-emerald-400 font-bold text-lg">{formatCurrency(safeMonthlyWithdrawalToday)}</p>
                    </div>
                </div>
                <p className="text-zinc-500 text-xs leading-relaxed italic">
                    By withdrawing only {safeWithdrawalPct.toFixed(1)}% annually (the difference between return and inflation), your principal keeps up with inflation, allowing you to withdraw this amount forever without ever touching your initial wealth.
                </p>
            </div>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/10 rounded-[32px] p-8 flex flex-col justify-center text-center space-y-3">
            <h3 className="text-orange-400 font-black text-xl tracking-tight italic">Rule of Thumb</h3>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-sm mx-auto">
                If your target monthly spend is {formatCurrency(avgExpenses)}, you need a retirement corpus of approximately 
                <span className="text-white font-black block text-2xl mt-2">{formatCurrency(targetNetWorthReal)}</span>
                in today's money to never have to work again.
            </p>
        </div>
      </div>
    </div>
  );
}
