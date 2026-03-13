import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApi } from '@/src/hooks/useApi';
import { Wallet, Globe, ArrowRight, CheckCircle2, Sparkles, ShieldAlert } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [account, setAccount] = useState({ name: 'Main Checking', type: 'bank', balance: '0' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { fetchWithAuth } = useApi();

  const handleNext = () => setStep(step + 1);
  
  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // 1. Save Currency
      localStorage.setItem('base_currency', currency);
      
      const accountPayload = {
        id: Math.random().toString(36).substr(2, 9),
        name: account.name,
        type: account.type,
        initial_balance: parseFloat(account.balance) || 0,
        icon: 'Wallet',
        color: '#10b981'
      };

      await Promise.all([
        fetchWithAuth('/api/accounts', {
          method: 'POST',
          body: JSON.stringify(accountPayload)
        }),
        fetchWithAuth('/api/user/settings', {
          method: 'POST',
          body: JSON.stringify({ base_currency: currency })
        })
      ]);
      
      onComplete();
    } catch (err) {
      console.error('Failed to complete onboarding setups', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0A0A0B] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-lg relative z-10">
        <div className="flex justify-center mb-12">
           <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <Sparkles className="text-white w-8 h-8" />
           </div>
        </div>

        <div className="bg-[#151518]/80 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl overflow-hidden relative">
          
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: step >= i ? '100%' : '0%' }}
                  className="h-full bg-emerald-500"
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome to WealthFlow</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">Let's set up your primary currency. All your dashboard calculations and net worth will be displayed in this currency.</p>
                </div>
                
                <div className="space-y-4 pt-4">
                  <div className="relative">
                    <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-5 py-5 text-white font-bold text-lg focus:outline-none focus:border-emerald-500/50 appearance-none transition-colors cursor-pointer"
                    >
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="NPR">NPR (रू) - Nepalese Rupee</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleNext}
                  className="w-full py-5 rounded-2xl bg-white text-black font-extrabold tracking-wide hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-8"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Your Primary Account</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">Let's add your main bank account or cash wallet to start tracking your actual balances.</p>
                </div>
                
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Account Name</label>
                    <div className="relative">
                      <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="text"
                        value={account.name}
                        onChange={e => setAccount({...account, name: e.target.value})}
                        placeholder="e.g. Chase Bank, Cash"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-5 py-5 text-white font-bold focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Initial Balance</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 font-bold flex items-center justify-center">$</span>
                      <input
                        type="number"
                        value={account.balance}
                        onChange={e => setAccount({...account, balance: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-5 py-5 text-white font-bold focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setStep(1)}
                    className="px-6 py-5 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleNext}
                    disabled={!account.name}
                    className="flex-1 py-5 rounded-2xl bg-white text-black font-extrabold tracking-wide hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Continue <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 text-center"
              >
                <div className="w-24 h-24 mx-auto bg-emerald-500/10 border-4 border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                
                <h2 className="text-3xl font-extrabold text-white tracking-tight">You're All Set!</h2>
                <p className="text-zinc-400 text-base leading-relaxed max-w-sm mx-auto">
                  Your primary account has been configured. You are ready to start tracking your income, expenses, and watching your net worth grow.
                </p>

                <button 
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold tracking-wide hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center justify-center gap-2 mt-8 shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Go to Dashboard"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Decorative subtle text */}
        <p className="text-zinc-600 text-xs text-center font-medium mt-8 flex items-center justify-center gap-2">
           <ShieldAlert className="w-3 h-3" /> Secure Google Authentication
        </p>
      </div>
    </div>
  );
}
