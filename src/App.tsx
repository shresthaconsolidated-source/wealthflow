import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { PrivacyProvider, usePrivacy } from '@/src/contexts/PrivacyContext';
import Sidebar from '@/src/components/Sidebar';
import Dashboard from '@/src/components/Dashboard';
import Transactions from '@/src/components/Transactions';
import Analysis from '@/src/components/Analysis';
import Settings from '@/src/components/Settings';
import Donations from '@/src/components/Donations';
import AdminPulse from '@/src/components/AdminPulse';
import Contact from '@/src/components/Contact';
import Budgets from '@/src/components/Budgets';
import Goals from '@/src/components/Goals';
import CommandPalette, { type PaletteAction } from '@/src/components/CommandPalette';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { ToastProvider, ConfirmProvider, PageHeader } from '@/src/components/ui';
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Target,
  Heart,
  Settings as SettingsIcon,
  MessageCircle,
  Eye,
  Plus,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { GoogleOAuthProvider } from '@react-oauth/google';
import MobileBottomNav from '@/src/components/MobileBottomNav';
import MobileHeader from '@/src/components/MobileHeader';
import FAB from '@/src/components/FAB';
import LandingPage from '@/src/components/LandingPage';
import DonationPopup from '@/src/components/DonationPopup';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '631803362356-e9sld8untk9kh2hpgca6em5m3dpvngr3.apps.googleusercontent.com';

function PlanPage() {
  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12 lg:pb-0">
      <PageHeader
        title="Budgets & Goals"
        description="Set monthly spending limits and long-term savings targets."
      />
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)] mb-6">Monthly Budgets</h2>
        <Budgets />
      </div>
      <Goals />
    </div>
  );
}

function AppInner() {
  const { user, loading, login, logout } = useAuth();
  const { togglePrivacy } = usePrivacy();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdminView, setIsAdminView] = useState(window.location.pathname === '/admin-pulse');
  const [showDonationPopup, setShowDonationPopup] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminView(window.location.pathname === '/admin-pulse');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Donation Reminder Logic
  useEffect(() => {
    if (user) {
      const lastShown = localStorage.getItem('last_donation_popup_shown');
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;

      if (!lastShown || now - parseInt(lastShown) > oneWeek) {
        // Delay slightly for better UX after login/load
        const timer = setTimeout(() => {
          setShowDonationPopup(true);
          localStorage.setItem('last_donation_popup_shown', now.toString());
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const toggleAdmin = (show: boolean) => {
    setIsAdminView(show);
    window.history.pushState({}, '', show ? '/admin-pulse' : '/');
  };

  const paletteActions: PaletteAction[] = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, keywords: 'home overview net worth', perform: () => setActiveTab('dashboard') },
    { id: 'nav-transactions', label: 'Go to Transactions', icon: ArrowLeftRight, keywords: 'history spending', perform: () => setActiveTab('transactions') },
    { id: 'add-transaction', label: 'Add Transaction', hint: 'Quick entry', icon: Plus, keywords: 'new expense income record', perform: () => setActiveTab('transactions') },
    { id: 'nav-analysis', label: 'Go to Analysis', icon: TrendingUp, keywords: 'insights cagr breakdown forecast fire', perform: () => setActiveTab('analysis') },
    { id: 'nav-plan', label: 'Go to Budgets & Goals', icon: Target, keywords: 'plan budget goal savings limit', perform: () => setActiveTab('plan') },
    { id: 'nav-donations', label: 'Go to Donations', icon: Heart, keywords: 'support give', perform: () => setActiveTab('donations') },
    { id: 'nav-settings', label: 'Go to Settings', icon: SettingsIcon, keywords: 'accounts categories currency export', perform: () => setActiveTab('settings') },
    { id: 'nav-contact', label: 'Go to Contact', icon: MessageCircle, keywords: 'help support feedback', perform: () => setActiveTab('contact') },
    { id: 'toggle-privacy', label: 'Toggle Privacy Mode', hint: 'Blur amounts', icon: Eye, keywords: 'hide blur money private', perform: togglePrivacy },
    { id: 'logout', label: 'Log Out', icon: LogOut, keywords: 'sign out exit', perform: logout },
  ];

  if (isAdminView && user) {
    return (
      <GoogleOAuthProvider clientId={clientId}>
        <AdminPulse onBack={() => toggleAdmin(false)} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {loading ? (
        <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-[var(--accent-soft)] border-t-[var(--accent)] rounded-full animate-spin"></div>
        </div>
      ) : !user ? (
        <LandingPage onLoginSuccess={(credential) => login(credential)} />
      ) : (
        <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] flex flex-col lg:flex-row">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <MobileHeader setActiveTab={setActiveTab} />

          <main className="flex-1 lg:ml-64 min-h-screen pb-24 lg:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="p-4 lg:p-8"
              >
                {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
                {activeTab === 'transactions' && <Transactions setActiveTab={setActiveTab} />}
                {activeTab === 'analysis' && <Analysis />}
                {activeTab === 'plan' && <PlanPage />}
                {activeTab === 'donations' && <Donations />}
                {activeTab === 'settings' && <Settings />}
                {activeTab === 'contact' && <Contact />}
              </motion.div>
            </AnimatePresence>
          </main>

          <FAB onClick={() => setActiveTab('transactions')} />
          <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
          <CommandPalette actions={paletteActions} />

          <DonationPopup
            isOpen={showDonationPopup}
            onClose={() => setShowDonationPopup(false)}
            onDonate={() => {
              setActiveTab('donations');
              setShowDonationPopup(false);
            }}
          />
        </div>
      )}
    </GoogleOAuthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PrivacyProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppInner />
          </ConfirmProvider>
        </ToastProvider>
      </PrivacyProvider>
    </ErrorBoundary>
  );
}
