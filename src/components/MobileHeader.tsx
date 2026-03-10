import React from 'react';
import { Wallet, User } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

export default function MobileHeader() {
  const { user } = useAuth();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/5 pt-safe">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">WealthFlow</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white leading-none">{user?.name?.split(' ')[0]}</span>
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Private Client</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
