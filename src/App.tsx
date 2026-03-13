import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import Sidebar from '@/src/components/Sidebar';
import Dashboard from '@/src/components/Dashboard';
import Transactions from '@/src/components/Transactions';
import Analysis from '@/src/components/Analysis';
import Settings from '@/src/components/Settings';
import Donations from '@/src/components/Donations';
import AdminPulse from '@/src/components/AdminPulse';
import Contact from '@/src/components/Contact';
import { Wallet, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import MobileBottomNav from '@/src/components/MobileBottomNav';
import MobileHeader from '@/src/components/MobileHeader';
import FAB from '@/src/components/FAB';
import LandingPage from '@/src/components/LandingPage';
import DonationPopup from '@/src/components/DonationPopup';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '631803362356-e9sld8untk9kh2hpgca6em5m3dpvngr3.apps.googleusercontent.com';

export default function App() {
  const { user, loading, login } = useAuth();
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
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (!lastShown || now - parseInt(lastShown) > twentyFourHours) {
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
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      ) : !user ? (
        <LandingPage onLoginSuccess={(credential) => login(credential)} />
      ) : (
        <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex flex-col lg:flex-row">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <MobileHeader />

          <main className="flex-1 lg:ml-64 min-h-screen pb-24 lg:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-4 lg:p-8"
              >
                {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
                {activeTab === 'transactions' && <Transactions setActiveTab={setActiveTab} />}
                {activeTab === 'analysis' && <Analysis />}
                {activeTab === 'donations' && <Donations />}
                {activeTab === 'settings' && <Settings />}
                {activeTab === 'contact' && <Contact />}
              </motion.div>
            </AnimatePresence>
          </main>

          <FAB onClick={() => setActiveTab('transactions')} />
          <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

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
