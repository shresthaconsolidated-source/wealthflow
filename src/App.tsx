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

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '631803362356-e9sld8untk9kh2hpgca6em5m3dpvngr3.apps.googleusercontent.com';

export default function App() {
  const { user, loading, login } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdminView, setIsAdminView] = useState(window.location.pathname === '/admin-pulse');

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminView(window.location.pathname === '/admin-pulse');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6 relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full relative z-10"
          >
            <div className="text-center mb-12">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 mx-auto mb-8">
                <Wallet className="text-white w-10 h-10" />
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight mb-4">WealthFlow</h1>
              <p className="text-zinc-500 text-lg leading-relaxed">
                Experience the next generation of private wealth management. Secure, intelligent, and beautiful.
              </p>
            </div>

            <div className="bg-[#151518] border border-white/5 rounded-[32px] p-10 shadow-2xl">
              <div className="space-y-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                  <p className="text-zinc-500">Sign in to access your private dashboard.</p>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      if (credentialResponse.credential) {
                        login(credentialResponse.credential);
                      }
                    }}
                    onError={() => {
                      console.log('Login Failed');
                    }}
                    useOneTap
                    theme="filled_black"
                    shape="pill"
                  />
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-white/5"></div>
                  <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Secure Access</span>
                  <div className="h-px flex-1 bg-white/5"></div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Shield className="text-emerald-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Your financial data is encrypted and private. We never share your personal information with third parties.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-zinc-600 text-sm mt-8">
              By continuing, you agree to our <span className="text-zinc-400 hover:text-white cursor-pointer transition-colors">Terms of Service</span> and <span className="text-zinc-400 hover:text-white cursor-pointer transition-colors">Privacy Policy</span>.
            </p>
          </motion.div>
        </div>
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
        </div>
      )}
    </GoogleOAuthProvider>
  );
}
