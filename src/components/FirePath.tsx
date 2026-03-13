import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Flame, 
  ChevronRight, 
  Settings2, 
  Zap, 
  ShieldCheck,
  Activity,
  ArrowRightLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { formatCurrency, cn, getCurrencySymbol } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';

interface BulkEvent {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  year: number;
  note: string;
}

interface Props {
  history: any[];
  accounts: any[];
}

export default function FirePath({ history, accounts }: Props) {
  const { fetchWithAuth } = useApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  
  // Settings
  const [inflation, setInflation] = useState(5.0);
  const [years, setYears] = useState(20);
  const [manualInvestment, setManualInvestment] = useState<number | null>(null);
  const [manualReturn, setManualReturn] = useState<number | null>(null);
  const [plannedExpenses, setPlannedExpenses] = useState<number | null>(null);
  const [stepUp, setStepUp] = useState(0); 
  const [manualStartingCapital, setManualStartingCapital] = useState<number | null>(null);
  const [bulkEvents, setBulkEvents] = useState<BulkEvent[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Derived from history & accounts
  const currentNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const avgMonthlySavings = history.length > 0 
    ? history.reduce((sum, h) => sum + (h.savings || 0), 0) / history.length
    : 0;
  
  const avgExpenses = history.length > 0
    ? history.reduce((sum, h) => sum + (h.expense || 0), 0) / history.length
    : 30000;

  const historicalReturn = 12.0; 

  const effectiveInvestment = manualInvestment !== null ? manualInvestment : avgMonthlySavings;
  const effectiveReturn = manualReturn !== null ? manualReturn : historicalReturn;
  const effectiveExpenses = plannedExpenses !== null ? plannedExpenses : avgExpenses;
  const effectiveStartingCapital = manualStartingCapital !== null ? manualStartingCapital : currentNetWorth;

  useEffect(() => {
    fetchWithAuth('/api/user/settings')
      .then(res => res.json())
      .then(settings => {
        if (settings.base_currency) setBaseCurrency(settings.base_currency);
        if (settings.fire_inflation !== undefined) setInflation(Number(settings.fire_inflation));
        if (settings.fire_years !== undefined) setYears(Number(settings.fire_years));
        if (settings.fire_manual_investment !== undefined) setManualInvestment(settings.fire_manual_investment);
        if (settings.fire_manual_return !== undefined) setManualReturn(settings.fire_manual_return);
        if (settings.fire_planned_expenses !== undefined) setPlannedExpenses(settings.fire_planned_expenses);
        if (settings.fire_step_up !== undefined) setStepUp(Number(settings.fire_step_up));
        if (settings.fire_manual_starting_capital !== undefined) setManualStartingCapital(settings.fire_manual_starting_capital);
        if (settings.fire_bulk_events !== undefined) setBulkEvents(settings.fire_bulk_events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fetchWithAuth]);

  const saveSettings = (updates: any) => {
    setSaving(true);
    fetchWithAuth('/api/user/settings', {
      method: 'POST',
      body: JSON.stringify(updates)
    })
    .then(() => {
      setSaving(false);
      setLastSaved(Date.now());
    })
    .catch(() => setSaving(false));
  };

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      saveSettings({
        fire_inflation: inflation,
        fire_years: years,
        fire_manual_investment: manualInvestment,
        fire_manual_return: manualReturn,
        fire_planned_expenses: plannedExpenses,
        fire_step_up: stepUp,
        fire_manual_starting_capital: manualStartingCapital,
        fire_bulk_events: bulkEvents,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [inflation, years, manualInvestment, manualReturn, plannedExpenses, stepUp, manualStartingCapital, bulkEvents]);

  // Simulation Logic
  const targetMonths = years * 12;
  const monthlyReturn = effectiveReturn / 100 / 12;
  const monthlyInflation = inflation / 100 / 12;
  const annualStepUpFactor = 1 + (stepUp / 100);

  let currentNominal = effectiveStartingCapital;
  let currentRealContribution = effectiveInvestment;

  for (let m = 1; m <= targetMonths; m++) {
    currentNominal = currentNominal * (1 + monthlyReturn) + currentRealContribution;
    if (m % 12 === 0) {
        const currentYearNum = m / 12;
        currentRealContribution = currentRealContribution * annualStepUpFactor;
        bulkEvents.filter(e => Number(e.year) === currentYearNum).forEach(event => {
            if (event.type === 'income') currentNominal += Number(event.amount);
            else currentNominal -= Number(event.amount);
        });
    }
  }

  const futureValueNominal = currentNominal;
  const futureValueReal = futureValueNominal / Math.pow(1 + monthlyInflation, targetMonths);
  const monthlyYieldRate = (effectiveReturn / 100) / 12;
  const monthlyPassiveIncome = futureValueNominal * monthlyYieldRate;
  const monthlyPassiveReal = monthlyPassiveIncome / Math.pow(1 + monthlyInflation, targetMonths);
  const safeWithdrawalPct = Math.max(0, effectiveReturn - inflation);
  const safeMonthlyWithdrawalReal = (futureValueReal * (safeWithdrawalPct / 100)) / 12;
  const targetNetWorthReal = (effectiveExpenses * 12) / (Math.max(0.5, safeWithdrawalPct) / 100);
  
  let yearsToRetire = 0;
  if (effectiveInvestment > 0 || effectiveReturn > inflation || bulkEvents.some(e => e.type === 'income')) {
    let simNominal = effectiveStartingCapital;
    let simContribution = effectiveInvestment;
    let m = 0;
    while (m < 1200) {
        const currentRealWorth = simNominal / Math.pow(1 + monthlyInflation, m);
        if (currentRealWorth >= targetNetWorthReal) {
            yearsToRetire = m / 12;
            break;
        }
        simNominal = simNominal * (1 + monthlyReturn) + simContribution;
        m++;
        if (m % 12 === 0) {
            const currentYearNum = m / 12;
            simContribution = simContribution * annualStepUpFactor;
            bulkEvents.filter(e => Number(e.year) === currentYearNum).forEach(event => {
                if (event.type === 'income') simNominal += Number(event.amount);
                else simNominal -= Number(event.amount);
            });
        }
    }
  }

  const addBulkEvent = () => {
    const newEvent: BulkEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'income',
        amount: 0,
        year: 1,
        note: ''
    };
    setBulkEvents([...bulkEvents, newEvent]);
  };

  const updateBulkEvent = (id: string, updates: Partial<BulkEvent>) => {
    setBulkEvents(bulkEvents.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const removeBulkEvent = (id: string) => {
    setBulkEvents(bulkEvents.filter(e => e.id !== id));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
            <Flame className="w-6 h-6 text-orange-500 opacity-50" />
        </div>
        <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase">Simulating Paths...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">FIRE Path Projections</h2>
              <div className="flex items-center gap-2">
                <p className="text-zinc-500 text-sm">Fine-tune your journey to financial freedom.</p>
                <AnimatePresence>
                  {saving && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-[10px] font-bold text-orange-500 animate-pulse uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-md"
                    >
                      Saving...
                    </motion.span>
                  )}
                  {!saving && lastSaved && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md"
                    >
                      Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Input Sidebar */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[#151518]/50 border border-white/5 rounded-[40px] p-8 lg:p-10 space-y-10 backdrop-blur-xl">
            
            {/* Step 1: Starting Point */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] font-black">1</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Starting Point</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Starting capital</label>
                            <button 
                                onClick={() => setManualStartingCapital(manualStartingCapital === null ? currentNetWorth : null)}
                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                            >
                                {manualStartingCapital === null ? 'Override' : 'Live'}
                            </button>
                        </div>
                        <div className="relative group">
                            <input 
                                type="number"
                                value={manualStartingCapital !== null ? manualStartingCapital : currentNetWorth.toFixed(0)}
                                onChange={(e) => setManualStartingCapital(Number(e.target.value))}
                                disabled={manualStartingCapital === null}
                                className={cn(
                                    "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none transition-all",
                                    manualStartingCapital === null ? "opacity-50 cursor-not-allowed" : "focus:ring-2 focus:ring-emerald-500/50"
                                )}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">{getCurrencySymbol(baseCurrency)}</span>
                        </div>
                    </div>

                    <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Investment (Monthly)</label>
                            <button 
                                onClick={() => setManualInvestment(manualInvestment === null ? Math.round(avgMonthlySavings) : null)}
                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                            >
                                {manualInvestment === null ? 'Override' : 'History'}
                            </button>
                        </div>
                        <div className="relative group">
                            <input 
                                type="number"
                                value={manualInvestment !== null ? manualInvestment : Math.round(avgMonthlySavings)}
                                onChange={(e) => setManualInvestment(Number(e.target.value))}
                                disabled={manualInvestment === null}
                                className={cn(
                                    "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none transition-all",
                                    manualInvestment === null ? "opacity-50 cursor-not-allowed" : "focus:ring-2 focus:ring-emerald-500/50"
                                )}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">{getCurrencySymbol(baseCurrency)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: The Targets */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-[10px] font-black">2</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Targets & Assumptions</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                            Planned Exp.
                            <button onClick={() => setPlannedExpenses(plannedExpenses === null ? Math.round(avgExpenses) : null)} className="text-emerald-500">
                                {plannedExpenses === null ? 'Edit' : 'Reset'}
                            </button>
                        </label>
                        <input 
                            type="number"
                            value={plannedExpenses !== null ? plannedExpenses : Math.round(avgExpenses)}
                            onChange={(e) => setPlannedExpenses(Number(e.target.value))}
                            disabled={plannedExpenses === null}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-orange-500/50 outline-none transition-all disabled:opacity-50"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                            Expected Return
                            <button onClick={() => setManualReturn(manualReturn === null ? 12 : null)} className="text-emerald-500">
                                {manualReturn === null ? 'Edit' : 'Reset'}
                            </button>
                        </label>
                        <div className="relative">
                            <input 
                                type="number" step="0.1"
                                value={manualReturn !== null ? manualReturn : historicalReturn}
                                onChange={(e) => setManualReturn(Number(e.target.value))}
                                disabled={manualReturn === null}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none transition-all disabled:opacity-50"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">%</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Est. Inflation</label>
                        <div className="relative">
                            <input 
                                type="number" step="0.1"
                                value={inflation}
                                onChange={(e) => setInflation(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-white/10 outline-none"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced & Timeline Toggle */}
            <div className="pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4">
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Years</span>
                        <select 
                            value={years} 
                            onChange={(e) => setYears(Number(e.target.value))}
                            className="bg-[#1c1c20] border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none"
                        >
                            {[5,10,15,20,25,30].map(y => <option key={y} value={y}>{y} Years</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Step-up %</span>
                        <input 
                            type="number"
                            value={stepUp}
                            onChange={(e) => setStepUp(Number(e.target.value))}
                            className="w-20 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-zinc-300 font-bold text-sm"
                >
                    <Settings2 className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
                    Advanced Options
                </button>
            </div>

            {/* Advanced Panel */}
            <AnimatePresence>
                {showAdvanced && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Bulk One-Time Events</h4>
                                <button 
                                    onClick={addBulkEvent}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all text-xs font-bold"
                                >
                                    <Plus className="w-3 h-3" /> Add Event
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {bulkEvents.length === 0 && (
                                    <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                        <p className="text-zinc-600 text-xs italic">No bulk events added yet (e.g. Marriage, House Sale)</p>
                                    </div>
                                )}
                                {bulkEvents.map((event) => (
                                    <div key={event.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 items-center">
                                        <div className="md:col-span-2">
                                            <select 
                                                value={event.type}
                                                onChange={(e) => updateBulkEvent(event.id, { type: e.target.value as any })}
                                                className="w-full bg-[#1c1c20] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold"
                                            >
                                                <option value="income">Income</option>
                                                <option value="expense">Expense</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-3 relative">
                                            <input 
                                                type="number"
                                                value={event.amount}
                                                onChange={(e) => updateBulkEvent(event.id, { amount: Number(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold"
                                                placeholder="Amount"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] text-zinc-500 font-bold uppercase block ml-1">Year</label>
                                            <input 
                                                type="number"
                                                min="1"
                                                max={years}
                                                value={event.year}
                                                onChange={(e) => updateBulkEvent(event.id, { year: Number(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold"
                                            />
                                        </div>
                                        <div className="md:col-span-4">
                                            <input 
                                                type="text"
                                                value={event.note}
                                                onChange={(e) => updateBulkEvent(event.id, { note: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold"
                                                placeholder="Note (e.g. Sale of land)"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex justify-end">
                                            <button 
                                                onClick={() => removeBulkEvent(event.id)}
                                                className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Sidebar */}
        <div className="space-y-6">
            {/* Main Result */}
            <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/20 rounded-[40px] p-8 space-y-8 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap className="w-48 h-48 text-emerald-400 rotate-12" />
                </div>
                <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                            <Zap className="w-6 h-6" />
                        </div>
                        <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Path to Freedom</span>
                    </div>
                    <h3 className="text-4xl font-black text-white leading-tight">
                        {yearsToRetire <= 0 ? "Retire Today" : `Retire in ${yearsToRetire.toFixed(1)} years`}
                    </h3>
                    <p className="text-emerald-200/60 text-sm leading-relaxed">
                        Reaching {formatCurrency(targetNetWorthReal, baseCurrency)} in today's money will cover your {formatCurrency(effectiveExpenses, baseCurrency)} monthly spend forever.
                    </p>
                </div>
                
                <div className="pt-8 border-t border-emerald-500/20 flex flex-col gap-4">
                    <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-300/60 font-bold uppercase tracking-widest">Monthly Target</span>
                    <span className="text-white font-bold">{formatCurrency(effectiveInvestment, baseCurrency)} /mo</span>
                </div>
                   <div className="flex justify-between items-center text-xs">
                        <span className="text-emerald-300/60 font-bold uppercase tracking-widest">Annual Step-up</span>
                        <span className="text-white font-bold">+{stepUp}%</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
                <div className="bg-[#151518] border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Wealth in {years}y</p>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-white tracking-tight">{formatCurrency(futureValueReal)}</h4>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mt-1">Today's Value terms</p>
                    </div>
                </div>

                <div className="bg-[#151518] border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Passive Income</p>
                        <Activity className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-white tracking-tight">{formatCurrency(monthlyPassiveReal)}</h4>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mt-1">Inflation Adjusted /mo</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Sustainability & Rule of Thumb */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#151518]/50 border border-white/5 rounded-[32px] p-8 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-zinc-400" />
                Sustainability Logic
            </h3>
            <div className="bg-white/5 rounded-2xl p-6 flex items-center justify-between">
                <div>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Sustainable Yield</p>
                    <p className="text-white font-bold text-xl">{safeWithdrawalPct.toFixed(1)}% / Year</p>
                </div>
                <ArrowRightLeft className="w-8 h-8 text-zinc-600" />
                <div className="text-right">
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Monthly Safe Spend</p>
                    <p className="text-emerald-400 font-black text-xl">{formatCurrency(safeMonthlyWithdrawalReal)}</p>
                </div>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed italic">
                By withdrawing only {safeWithdrawalPct.toFixed(1)}% annually, your corpus keeps up with {inflation}% inflation indefinitely.
            </p>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/10 rounded-[32px] p-8 flex flex-col justify-center text-center space-y-3">
            <h3 className="text-orange-400 font-black text-xl tracking-tight italic">Rule of Thumb</h3>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-sm mx-auto">
                If your target monthly spend is {formatCurrency(effectiveExpenses)}, you need a retirement corpus of 
                <span className="text-white font-black block text-3xl mt-2 tracking-tighter">{formatCurrency(targetNetWorthReal)}</span>
                in today's money to reach absolute financial freedom.
            </p>
        </div>
      </div>

    </div>
  );
}
