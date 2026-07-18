import React, { useState } from 'react';
import {
  Wallet,
  Shield,
  Flame,
  Activity,
  TrendingUp,
  Lock,
  CheckCircle2,
  Check,
  ChevronDown,
  Mail,
} from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';
import { Card, Badge } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';

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

const freeFeatures = [
  'Unlimited accounts & transactions',
  'All analytics & FIRE projections',
  'CSV export, anytime',
  'No ads, ever',
];

const proFeatures = [
  'Automatic bank sync',
  'Multi-device sync',
  'Shared household access',
  'Priority support',
];

const faqs = [
  {
    q: 'Is my data private?',
    a: "Yes. Your financial data is used for exactly one thing — showing it back to you. It isn't sold, shared, or fed to advertisers, and there are no analytics or ad trackers — the only third-party script is Google's own sign-in.",
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. You can download every transaction as a CSV file at any time, straight from the app. Your data is never locked in.',
  },
  {
    q: 'Why Google sign-in only?',
    a: "Because it means WealthFlow never asks for or stores a password. Google handles authentication with your existing security setup — one less credential to create, remember, or leak.",
  },
  {
    q: 'Is it really free?',
    a: 'Yes — everything WealthFlow does today is free, and the core stays free. A paid Pro tier will add sync features later, but nothing you use now moves behind a paywall.',
  },
  {
    q: 'How do budgets & goals store data?',
    a: 'Budgets and goals are stored on your device, in your browser. They never leave your machine, which is also why they currently don’t sync between devices — that’s what Pro will add.',
  },
];

export default function LandingPage({ onLoginSuccess }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
              <a href="#pricing" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors">FAQ</a>
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
                  no data selling, no one else looking at your numbers.
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
              {/* Real product preview built from the app's own components — not a mockup image */}
              <div className="relative z-20 bg-gradient-to-br from-white/10 to-transparent p-px rounded-[32px] shadow-2xl overflow-hidden">
                <div className="rounded-[31px] bg-[var(--surface-0)] p-5 lg:p-6 space-y-4" aria-hidden="true">
                  {/* window chrome */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <span className="ml-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Financial Overview</span>
                  </div>
                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Net Worth', value: '$65,320', tone: 'text-[var(--text-primary)]' },
                      { label: 'Income / mo', value: '$6,220', tone: 'text-[var(--accent)]' },
                      { label: 'Savings rate', value: '62.2%', tone: 'text-[var(--gold)]' },
                    ].map(k => (
                      <div key={k.label} className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl p-3.5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">{k.label}</p>
                        <p className={`tnum text-base lg:text-lg font-bold mt-1 ${k.tone}`}>{k.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* area chart */}
                  <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl p-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Net Worth Growth</p>
                    <svg viewBox="0 0 300 80" className="w-full h-auto" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lpFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,68 C30,64 45,58 70,54 C95,50 110,52 135,44 C160,36 175,38 200,28 C225,20 250,18 300,8 L300,80 L0,80 Z" fill="url(#lpFill)" />
                      <path d="M0,68 C30,64 45,58 70,54 C95,50 110,52 135,44 C160,36 175,38 200,28 C225,20 250,18 300,8" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  {/* budget bars */}
                  <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl p-4 space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Budgets · This Month</p>
                    {[
                      { name: 'Groceries', pct: 62, color: 'bg-[var(--accent)]' },
                      { name: 'Rent', pct: 100, color: 'bg-[var(--gold)]' },
                      { name: 'Fuel', pct: 41, color: 'bg-[var(--accent)]' },
                    ].map(b => (
                      <div key={b.name}>
                        <div className="flex justify-between text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                          <span>{b.name}</span>
                          <span className="tnum">{b.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                    'Your data is yours — export it as CSV anytime',
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
                    WealthFlow was built by someone tracking their own path to financial independence,
                    and it runs on one rule: your data exists to be shown back to you — never monetized.
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

      <section id="pricing" className="py-24 relative z-10 border-t border-[var(--border-1)] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 max-w-xl">
            <h2 className="text-xs font-bold text-[var(--accent)] uppercase tracking-[0.2em] mb-3">Pricing</h2>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Free today. Honest about tomorrow.</h3>
            <p className="mt-4 text-[var(--text-tertiary)] leading-relaxed">
              Everything WealthFlow does right now is free. A Pro tier is planned for the features
              that cost real money to run — nothing you use today moves behind a paywall.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ ease }}
            >
              <Card padding="lg" className="h-full flex flex-col">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-4">
                  Free
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold tracking-tight tnum">$0</span>
                  <span className="text-sm text-[var(--text-tertiary)] font-medium">forever</span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-7">
                  Currently everything. The full tracker, no limits, no trial clock.
                </p>
                <ul className="space-y-3.5 mb-8">
                  {freeFeatures.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium">
                      <div className="w-5 h-5 rounded-full bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[var(--accent)]" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-1 rounded-full overflow-hidden inline-block self-start">
                  <GoogleLogin
                    onSuccess={(res) => res.credential && onLoginSuccess(res.credential)}
                    onError={() => console.log('Login Failed')}
                    theme="filled_black"
                    shape="pill"
                    text="continue_with"
                  />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: 0.08, ease }}
            >
              <Card padding="lg" className="h-full flex flex-col border-[var(--border-2)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                    Pro — coming soon
                  </div>
                  <Badge tone="gold">Founding member</Badge>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold tracking-tight tnum">$20</span>
                  <span className="text-sm text-[var(--text-tertiary)] font-medium">/mo</span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-7">
                  For when your money lives in more than one place — and so do you.
                </p>
                <ul className="space-y-3.5 mb-8">
                  {proFeatures.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-[var(--text-secondary)]">
                      <div className="w-5 h-5 rounded-full bg-[var(--gold-soft)] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[var(--gold)]" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                {/* No waitlist backend yet — state it plainly rather than link a mailbox that bounces */}
                <div className="mt-auto inline-flex items-center gap-2 self-start h-11 px-5 rounded-full border border-dashed border-[var(--border-2)] text-sm font-semibold text-[var(--text-tertiary)]">
                  <Mail className="w-4 h-4" />
                  Not open yet — nothing to pay for today
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 relative z-10 border-t border-[var(--border-1)]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-xs font-bold text-[var(--accent)] uppercase tracking-[0.2em] mb-3">FAQ</h2>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Fair questions, straight answers.</h3>
          </div>

          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={cn(
                    'bg-[var(--surface-1)] border rounded-2xl transition-colors duration-300',
                    open ? 'border-[var(--border-2)]' : 'border-[var(--border-1)]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-semibold text-[15px]">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 shrink-0 text-[var(--text-tertiary)] transition-transform duration-300',
                        open && 'rotate-180 text-[var(--accent)]'
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm text-[var(--text-tertiary)] leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
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
