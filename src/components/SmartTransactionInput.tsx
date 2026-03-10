import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Plus,
  Wallet
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SmartTransactionInputProps {
  accounts: any[];
  categories: any[];
  onConfirm: (transaction: any) => Promise<void>;
  onEditManual: (type: 'expense' | 'income' | 'transfer', data?: any) => void;
  onNavigate: (tab: string) => void;
}

export default function SmartTransactionInput({
  onEditManual,
  onNavigate
}: SmartTransactionInputProps) {
  const actions = [
    {
      id: 'expense',
      label: 'Record Expense',
      description: 'Log a new spending',
      icon: ArrowDownRight,
      color: 'text-red-400',
      bg: 'bg-red-400/5',
      border: 'hover:border-red-400/30'
    },
    {
      id: 'income',
      label: 'Record Income',
      description: 'Log new earnings',
      icon: ArrowUpRight,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/5',
      border: 'hover:border-emerald-400/30'
    },
    {
      id: 'transfer',
      label: 'Transfer Funds',
      description: 'Move money between accounts',
      icon: ArrowLeftRight,
      color: 'text-blue-400',
      bg: 'bg-blue-400/5',
      border: 'hover:border-blue-400/30'
    },
    {
      id: 'settings',
      label: 'Add Account',
      description: 'Configure new bank or asset',
      icon: Plus,
      color: 'text-zinc-400',
      bg: 'bg-zinc-400/5',
      border: 'hover:border-zinc-400/30'
    },
  ];

  return (
    <div className="bg-[#151518] border border-white/5 rounded-[32px] p-6 lg:p-8 relative overflow-hidden group shadow-2xl">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 space-y-6 lg:space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Wallet className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">Quick Actions</h3>
            <p className="text-zinc-500 text-xs lg:text-sm">Select an action to manage your wealth.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                if (action.id === 'settings') {
                  onNavigate('settings');
                } else {
                  onEditManual(action.id as any);
                }
              }}
              className={cn(
                "flex flex-col gap-3 p-4 lg:p-6 rounded-[24px] border border-white/5 bg-white/[0.02] transition-all duration-300 text-left group/card",
                action.border,
                "hover:bg-white/[0.04] hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <div className={cn(
                "w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover/card:scale-110",
                action.bg,
                action.color
              )}>
                <action.icon className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <p className="text-white font-bold text-sm lg:text-lg leading-tight">{action.label}</p>
                <p className="hidden lg:block text-zinc-500 text-xs mt-1 leading-relaxed">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
