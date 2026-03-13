import React from 'react';
import { 
  Wallet, 
  Shield, 
  ArrowRight, 
  Flame, 
  Activity, 
  TrendingUp, 
  Lock,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';

interface Props {
  onLoginSuccess: (credential: string) => void;
}

export default function LandingPage({ onLoginSuccess }: Props) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[150px] rounded-full"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-orange-500/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase text-white">WealthFlow</span>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Features</a>
              <a href="#security" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Security</a>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center bg-[#0A0A0B] rounded-full scale-90 sm:scale-100">
                <GoogleLogin
                  onSuccess={(res) => res.credential && onLoginSuccess(res.credential)}
                  onError={() => console.log('Login Failed')}
                  theme="filled_black"
                  shape="pill"
                  text="signin_with"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 md:pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center">
            <div className="space-y-8 md:space-y-12">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Version 2.0 is Live</span>
              </motion.div>
              
              <div className="space-y-6">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-6xl md:text-[5rem] lg:text-[6rem] font-black tracking-tighter leading-[0.9] text-white"
                >
                  MASTER YOUR <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-blue-600">FREEDOM.</span>
                </motion.h1 >
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg md:text-xl text-zinc-500 max-w-lg leading-relaxed font-medium"
                >
                  A high-precision private wealth simulator designed for those who value privacy, intelligence, and beautiful design.
                </motion.p>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-6 pt-4"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full blur-md opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative scale-110">
                    <GoogleLogin
                      onSuccess={(res) => res.credential && onLoginSuccess(res.credential)}
                      onError={() => console.log('Login Failed')}
                      theme="filled_black"
                      shape="pill"
                      text="continue_with"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-6 py-3 text-zinc-500 text-[10px] font-black uppercase tracking-widest border border-white/5 rounded-full bg-white/[0.02]">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Enterprise Grade Privacy
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-8 md:gap-12 pt-10"
              >
                <div className="space-y-1">
                  <p className="text-3xl font-black text-white">$0.00</p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Setup Costs</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-white">100%</p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Data Privacy</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-white">Secured</p>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">By Google</p>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
              className="relative"
            >
              {/* Premium Mockup Container */}
              <div className="relative z-20 bg-gradient-to-br from-white/10 to-transparent p-[1px] rounded-[40px] shadow-2xl backdrop-blur-3xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-transparent to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <img 
                  src="/dashboard_mockup.png" 
                  alt="WealthFlow Dashboard" 
                  className="rounded-[39px] w-full h-auto shadow-2xl transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
              
              {/* Decorative elements behind image */}
              <div className="absolute -top-20 -right-20 w-[300px] h-[300px] bg-emerald-500/20 blur-[100px] rounded-full animate-pulse -z-10"></div>
              <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-blue-500/20 blur-[100px] rounded-full animate-pulse -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative z-10 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Advanced Capabilities</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white">Intelligent by design.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-10 bg-[#151518] border border-white/5 rounded-[40px] hover:border-emerald-500/20 transition-all duration-500">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Flame className="w-7 h-7 text-orange-500" />
              </div>
              <h4 className="text-2xl font-bold mb-4">Precision FIRE Path</h4>
              <p className="text-zinc-500 leading-relaxed">Simulate your retirement with extreme accuracy. Accounts for inflation, annual step-ups, and one-time bulk events.</p>
            </div>

            <div className="group p-10 bg-[#151518] border border-white/5 rounded-[40px] hover:border-blue-500/20 transition-all duration-500">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-blue-500" />
              </div>
              <h4 className="text-2xl font-bold mb-4">Smart Aggregation</h4>
              <p className="text-zinc-500 leading-relaxed">Unified view of your net worth across multiple accounts and asset classes with real-time tracking.</p>
            </div>

            <div className="group p-10 bg-[#151518] border border-white/5 rounded-[40px] hover:border-emerald-500/20 transition-all duration-500">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7 text-emerald-500" />
              </div>
              <h4 className="text-2xl font-bold mb-4">Deep Analytics</h4>
              <p className="text-zinc-500 leading-relaxed">Understand your spending habits and savings trends with intelligent charts and automated insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#151518] to-[#0A0A0B] border border-white/5 rounded-[60px] p-8 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-20 opacity-5">
              <Shield className="w-96 h-96 text-white" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
              <div className="space-y-8">
                <h3 className="text-4xl md:text-6xl font-black text-white leading-tight">Your data. <br />Your privacy.</h3>
                <p className="text-xl text-zinc-500 leading-relaxed">
                  WealthFlow is built on top of enterprise-grade security. We use Google OAuth for password-less authentication and never store your raw credentials.
                </p>
                <ul className="space-y-4">
                  {[
                    "Zero-knowledge architecture",
                    "Encrypted database syncing",
                    "Google-secured authentication",
                    "Private local state management"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-white font-bold">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 space-y-8 backdrop-blur-xl">
                 <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center">
                   <Lock className="w-8 h-8 text-emerald-400" />
                 </div>
                 <div className="space-y-4">
                   <h4 className="text-2xl font-bold">Private & Personal</h4>
                   <p className="text-zinc-400 leading-relaxed">
                     WealthFlow is a private tool designed for individuals. We don't sell your data to banks or advertisers. Your financial journey is yours alone.
                   </p>
                 </div>
                 <div className="pt-4">
                    <div className="inline-block scale-110">
                      <GoogleLogin
                        onSuccess={(res) => res.credential && onLoginSuccess(res.credential)}
                        onError={() => console.log('Login Failed')}
                        theme="filled_black"
                        shape="pill"
                      />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase">WealthFlow</span>
          </div>
          
          <div className="text-zinc-600 text-sm font-medium">
            © 2026 WealthFlow. Built for the modern wealth manager.
          </div>
          
          <div className="flex items-center gap-6">
             <Smartphone className="w-5 h-5 text-zinc-500" />
             <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Mobile Optimized</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Re-using the Lucide Zap icon since I added it to the imports
function Zap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14.71 13.63 2 11 10.29h9L10.37 23 13 14.71H4z" />
    </svg>
  );
}
