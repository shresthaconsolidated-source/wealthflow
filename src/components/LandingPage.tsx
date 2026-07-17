import React from 'react';
import {
  Wallet,
  Shield,
  Flame,
  Activity,
  TrendingUp,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';

interface Props {
  onLoginSuccess: (credential: string) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const features = [
  {
    icon: Flame,
    accent: 'text-[var(--gold)]',
    iconBg: 'bg-[var(--gold-soft)]',
    title: 'A real FIRE number',
    description:
      "Model your path to financial independence with inflation, raises, and one-off events accounted for — not a rough back-of-napkin guess.",
  },
  {
    icon: TrendingUp,
    accent: 'text-[var(--accent)]',
    iconBg: 'bg-[var(--accent-soft)]',
    title: 'One net worth, everywhere',
    description:
      'Every account and asset rolled into a single, always-current picture of what you actually own.',
  },
  {
    icon: Activity,
    accent: 'text-blue-400',
    iconBg: 'bg-blue-400/10',
    title: 'Spending that explains itself',
    description:
      'Recurring bills detected automatically, trends surfaced before you have to go looking for them.',
  },
];

export default function LandingPage({ onLoginSuccess }: Props) {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] selection:bg-[var(--accent)]/30 overflow-x-hidden bg-grain">
      {/* Ambient glow — one color, kept quiet */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-[var(--accent)]/[0.07] blur-[160px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-[var(--gold)]/[0.04] blur-[160px] rounded-full" />
      </div>

      <nav className="relative z-50 border-b border-[var(--border-1)] bg-[var(--surface-0)]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-18 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] flex items-center justify-center shadow-[0_8px_20px_-6px_var(--accent-ring)]">
              <Wallet className="text-[#04140e] w-[18px] h-[18px]" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">WealthFlow</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors">Features</a>
              <a href="#security" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors">Privacy</a>
            </div>
            <div className="scale-90 sm:scale-100 rounded-full overflow-hidden">
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
      </nav>

      <section className="relative z-10 pt-20 md:pt-28 pb-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ease }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.04] border border-[var(--border-2)] rounded-full"
              >
                <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Built for one — just you</span>
              </motion.div>

              <div className="space-y-5">
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, ease }}
                  className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]"
                >
                  See your whole financial
                  <br />
                  life in <span className="text-[var(--accent)]">one clear view.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, ease }}
                  className="text-lg text-[var(--text-tertiary)] max-w-lg leading-relaxed"
                >
                  A private net worth tracker and FIRE calculator that stays out of your way — no ads,
                  no upsells, no one else looking at your numbers.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, ease }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-2"
              >
                <div className="rounded-full overflow-hidden scale-105">
                  <GoogleLogin
                    onSuccess={(res) => res.credential && onLoginSuccess(res.credential)}
                    onError={() => console.log('Login Failed')}
                    theme="filled_black"
                    shape="pill"
                    text="continue_with"
                  />
                </div>

                <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs font-medium">
                  <Shield className="w-4 h-4 text-[var(--accent)]" />
                  Signed in with Google — nothing else to set up
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.9, ease }}
              className="relative"
            >
              <div className="relative z-20 bg-gradient-to-br from-white/10 to-transparent p-px rounded-[32px] shadow-2xl overflow-hidden">
                <img
                  src="/dashboard_mockup.png"
                  alt="WealthFlow dashboard"
                  className="rounded-[31px] w-full h-auto"
                />
              </div>
              <div className="absolute -top-16 -right-16 w-[260px] h-[260px] bg-[var(--accent)]/10 blur-[110px] rounded-full -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 relative z-10 border-y border-[var(--border-1)] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 max-w-xl">
            <h2 className="text-xs font-bold text-[var(--accent)] uppercase tracking-[0.2em] mb-3">What it actually does</h2>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Three things, done properly.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.08, ease }}
                className="group p-8 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[28px] hover:border-[var(--border-2)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-7 ${f.iconBg}`}>
                  <f.icon className={`w-6 h-6 ${f.accent}`} />
                </div>
                <h4 className="text-xl font-bold mb-3">{f.title}</h4>
                <p className="text-[var(--text-tertiary)] leading-relaxed text-sm">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[40px] p-8 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
              <Shield className="w-72 h-72" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center relative z-10">
              <div className="space-y-7">
                <h3 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
                  Your data.
                  <br />
                  Your privacy.
                </h3>
                <p className="text-lg text-[var(--text-tertiary)] leading-relaxed">
                  WealthFlow authenticates through Google and never asks for or stores a password. Your
                  financial data belongs to you — it isn't sold, shared, or used for anything but showing
                  it back to you.
                </p>
                <ul className="space-y-3.5">
                  {[
                    'Password-less Google authentication',
                    'No ads, no data brokers, no analytics resale',
                    'Built and run for a single household',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 font-medium text-sm">
                      <div className="w-5 h-5 rounded-full bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[28px] p-9 space-y-7">
                <div className="w-14 h-14 bg-[var(--accent-soft)] rounded-2xl flex items-center justify-center">
                  <Lock className="w-7 h-7 text-[var(--accent)]" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-xl font-bold">Private by default</h4>
                  <p className="text-[var(--text-tertiary)] leading-relaxed text-sm">
                    This isn't a product with a growth team. It's a tool for tracking one person's path
                    to financial independence — nothing about your data is monetized.
                  </p>
                </div>
                <div className="pt-1 rounded-full overflow-hidden inline-block">
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
      </section>

      <footer className="py-14 border-t border-[var(--border-1)] relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Wallet className="text-[#04140e] w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold tracking-tight">WealthFlow</span>
          </div>
          <div className="text-[var(--text-tertiary)] text-sm">© 2026 WealthFlow — a private wealth tracker.</div>
        </div>
      </footer>
    </div>
  );
}
