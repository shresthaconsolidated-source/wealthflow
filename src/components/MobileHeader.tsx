import React from 'react';
import { Wallet, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { usePrivacy } from '@/src/contexts/PrivacyContext';
import { cn } from '@/src/lib/utils';

interface MobileHeaderProps {
  setActiveTab: (tab: string) => void;
}

export default function MobileHeader({ setActiveTab }: MobileHeaderProps) {
  const { user } = useAuth();
  const { privacy, togglePrivacy } = usePrivacy();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-[var(--surface-0)]/80 backdrop-blur-xl border-b border-[var(--border-1)] pt-safe">
      <div className="flex items-center justify-between h-16 px-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center shadow-[0_6px_16px_-4px_var(--accent-ring)]">
            <Wallet className="text-[#04140e] w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-[var(--text-primary)] tracking-tight">WealthFlow</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={togglePrivacy}
            aria-label={privacy ? 'Show amounts' : 'Hide amounts'}
            className={cn(
              'w-11 h-11 flex items-center justify-center rounded-xl active:scale-95 transition-all',
              privacy ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
            )}
          >
            {privacy ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            aria-label="Account settings"
            className="w-11 h-11 -mr-1.5 flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border-2)] flex items-center justify-center overflow-hidden">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-[var(--text-tertiary)]" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
