import React from 'react';
import { LayoutDashboard, ArrowLeftRight, PieChart, Settings, Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'transactions', label: 'History', icon: ArrowLeftRight },
    { id: 'analysis', label: 'Insights', icon: PieChart },
    { id: 'donations', label: 'Donations', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'contact', label: 'Contact', icon: MessageCircle },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-xl border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300",
              activeTab === item.id ? "text-emerald-400" : "text-zinc-500"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform duration-300",
              activeTab === item.id && "scale-110"
            )} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>

            {activeTab === item.id && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
