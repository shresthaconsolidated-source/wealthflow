import React, { useState } from 'react';
import { LayoutDashboard, ArrowLeftRight, PieChart, MoreHorizontal, Heart, MessageCircle, Settings, LogOut, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import Modal from '@/src/components/ui/Modal';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const primaryItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'transactions', label: 'History', icon: ArrowLeftRight },
  { id: 'analysis', label: 'Insights', icon: PieChart },
];

const moreItems = [
  { id: 'plan', label: 'Budgets & Goals', icon: Target },
  { id: 'donations', label: 'Donations', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'contact', label: 'Contact', icon: MessageCircle },
];

export default function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();
  const isMoreActive = moreItems.some((i) => i.id === activeTab);

  const navItems = [
    ...primaryItems,
    { id: '__more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-0)]/85 backdrop-blur-xl border-t border-[var(--border-1)] pb-safe">
        <div className="flex items-stretch justify-around h-[68px] px-1">
          {navItems.map((item) => {
            const isActive = item.id === '__more' ? isMoreActive : activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => (item.id === '__more' ? setMoreOpen(true) : setActiveTab(item.id))}
                className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomnav-active-pill"
                    className="absolute top-1.5 w-10 h-10 rounded-2xl bg-[var(--accent-soft)]"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <item.icon
                  className={cn(
                    'relative w-5 h-5 transition-colors duration-200',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                  )}
                />
                <span
                  className={cn(
                    'relative text-[10px] font-semibold transition-colors duration-200',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="space-y-1.5 pb-2">
          {moreItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMoreOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors text-left',
                activeTab === item.id ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-white/5'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
          <div className="pt-2 mt-2 border-t border-[var(--border-1)]">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors text-left"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
