import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  TrendingUp,
  LogOut,
  Wallet,
  Heart,
  MessageCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'analysis', label: 'Analysis', icon: TrendingUp },
  { id: 'donations', label: 'Donations', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'contact', label: 'Contact', icon: MessageCircle },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { logout, user } = useAuth();

  return (
    <div className="hidden lg:flex w-64 h-screen bg-[var(--surface-0)] border-r border-[var(--border-1)] flex-col fixed left-0 top-0 z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center shadow-[0_8px_20px_-6px_var(--accent-ring)]">
            <Wallet className="text-[#04140e] w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">WealthFlow</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-200 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 bg-white/[0.06] rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <item.icon
                  className={cn(
                    'relative w-[18px] h-[18px] shrink-0 transition-colors',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
                  )}
                />
                <span
                  className={cn(
                    'relative text-sm font-medium transition-colors',
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-5 border-t border-[var(--border-1)]">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border-2)] overflow-hidden shrink-0">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] text-sm font-bold">
                {user?.name?.[0] || user?.email?.[0]}
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || 'User'}</span>
            <span className="text-xs text-[var(--text-tertiary)] truncate">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
