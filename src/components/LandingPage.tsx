import React, { useState } from 'react';
import {
  Wallet,
  Flame,
  TrendingUp,
  Activity,
  Lock,
  Check,
  Plus,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';
import { cn } from '@/src/lib/utils';
import {
  MaskedLines,
  CountUp,
  StickyStack,
  KineticStatement,
  ScrollProgressBar,
  SpringPress,
  useParallax,
} from '@/src/components/landing/motion-primitives';

interface Props {
  onLoginSuccess: (credential: string) => void;
}

/**
 * Landing page.
 *
 * Design read: a landing page for a privacy-first personal finance tracker,
 * aimed at design-conscious individual savers, in a restrained premium
 * dark-fintech language — near-black canvas, one accent, editorial type scale,
 * hairline rules instead of card soup.
 *
 * Two locks that hold the page together, both deliberate:
 *   Shape  — pills for anything interactive, 16px (rounded-2xl) for panels,
 *            nothing else. No mixed radii.
 *   Colour — emerald is the only accent, on every section. Gold appears once,
 *            on the FIRE figure, because that is a different kind of number.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/** Illustrative figures. Deliberately not round — real money isn't. */
const NET_WORTH_SERIES = [
  38, 41, 39, 46, 52, 49, 58, 63, 61, 70, 76, 74, 83, 91, 97, 94, 104, 112,
];

const STACK = [
  {
    icon: Flame,
    tone: 'text-[var(--gold)]',
    barTone: 'bg-[var(--gold)]/25',
    title: 'A real FIRE number',
    body: 'Model the path to financial independence with inflation, raises and one-off events accounted for — not a back-of-napkin guess that ignores the messy parts.',
    stat: '11.4',
    statLabel: 'years to independence',
    bars: [26, 34, 30, 42, 51, 47, 60, 68, 64, 79, 88, 100],
  },
  {
    icon: TrendingUp,
    tone: 'text-[var(--accent)]',
    barTone: 'bg-[var(--accent)]/25',
    title: 'One net worth, everywhere',
    body: 'Every account, asset and liability rolled into a single always-current figure — including the ones that only exist on paper, and the ones you owe.',
    stat: '12',
    statLabel: 'accounts in one figure',
    bars: [40, 52, 48, 61, 58, 70, 66, 78, 84, 80, 92, 97],
  },
  {
    icon: Activity,
    tone: 'text-blue-400',
    barTone: 'bg-blue-400/25',
    title: 'Spending that explains itself',
    body: 'Recurring bills surface on their own. Trends arrive before you go looking for them, and one-off distortions stay out of your averages.',
    stat: '41.3%',
    statLabel: 'savings rate, trailing year',
    bars: [55, 48, 62, 58, 71, 65, 74, 69, 82, 77, 88, 91],
  },
];

const PRIVACY_POINTS = [
  ['No password, ever', 'Google handles sign-in. WealthFlow never asks for or stores a credential.'],
  ['No ads, no brokers', 'Nothing is sold, shared, or handed to an analytics vendor. There is no ad tracker on this page.'],
  ['No lock-in', 'Every transaction exports to CSV whenever you want it, in the format the app itself reads back.'],
];

const FREE_FEATURES = [
  'Unlimited accounts & transactions',
  'Full analytics & FIRE projection',
  'Budgets that follow your account',
  'CSV export, anytime',
];

const PRO_FEATURES = [
  'Automatic bank sync',
  'Shared household access',
  'Priority support',
];

const FAQS = [
  {
    q: 'Is my data private?',
    a: "Your financial data is used for exactly one thing — showing it back to you. It isn't sold, shared, or fed to advertisers, and there are no analytics or ad trackers. The only third-party script on this page is Google's sign-in.",
  },
  {
    q: 'Can I get my data out?',
    a: 'Yes. Every transaction exports to CSV at any time, straight from the app — and the export is the same format the importer reads, so it round-trips.',
  },
  {
    q: 'Why Google sign-in only?',
    a: 'Because it means WealthFlow never asks for or stores a password. Google handles authentication with the security setup you already have — one less credential to create, remember, or leak.',
  },
  {
    q: 'Is it really free?',
    a: 'Everything WealthFlow does today is free, and the core stays free. A paid tier will add the features that cost real money to run. Nothing you use now moves behind a paywall.',
  },
  {
    q: 'Does it work on my phone?',
    a: "It's the same app in any browser, signed into the same account — budgets, accounts and transactions all follow you across devices.",
  },
];

/* ------------------------------------------------------------------ */

/** Net-worth sparkline. A real data visualisation, not a mock of the app UI. */
function NetWorthChart({ animate }: { animate: boolean }) {
  const w = 560;
  const h = 190;
  const max = Math.max(...NET_WORTH_SERIES);
  const min = Math.min(...NET_WORTH_SERIES);
  const pts = NET_WORTH_SERIES.map((v, i) => {
    const x = (i / (NET_WORTH_SERIES.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * (h - 24) - 12;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible" role="img" aria-label="Net worth trending upward over eighteen months">
      <defs>
        <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Baselines, not a full grid — enough to read level, quiet enough to ignore */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1="0" x2={w} y1={h * t} y2={h * t} stroke="var(--border-1)" strokeWidth="1" />
      ))}

      <motion.path
        d={area}
        fill="url(#nwFill)"
        initial={animate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: EASE }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.25, duration: 1.1, ease: EASE }}
      />
      <motion.circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="4"
        fill="var(--accent)"
        initial={animate ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={{ delay: 1.15, ease: EASE }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

export default function LandingPage({ onLoginSuccess }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const reduce = useReducedMotion();
  const animate = !reduce;
  // The data panel drifts against the copy as the hero leaves — a depth cue,
  // so the hero reads as two planes rather than one flat block.
  const heroPanel = useParallax(34);

  /** Entrance helper — one place, so timing stays consistent across sections. */
  const rise = (delay = 0) =>
    animate
      ? {
        initial: { opacity: 0, y: 14 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { delay, duration: 0.7, ease: EASE },
      }
      : {};

  const signIn = (text: 'signin_with' | 'continue_with') => (
    <GoogleLogin
      onSuccess={res => res.credential && onLoginSuccess(res.credential)}
      onError={() => console.error('Google sign-in failed')}
      theme="filled_black"
      shape="pill"
      text={text}
    />
  );

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] selection:bg-[var(--accent)]/25 overflow-x-hidden antialiased">
      {/* One quiet light source, top-left. No mesh, no second glow. */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[5%] w-[50%] h-[50%] bg-[var(--accent)]/[0.05] blur-[150px] rounded-full" />
      </div>

      {/* ---------------------------------------------------------- nav */}
      <nav className="relative z-50 sticky top-0 border-b border-[var(--border-1)] bg-[var(--surface-0)]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between gap-6">
          <a href="#top" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center">
              <Wallet className="text-[#04140e] w-[17px] h-[17px]" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">WealthFlow</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-[13px]">
            {[['What it does', '#capabilities'], ['Privacy', '#privacy'], ['Pricing', '#pricing'], ['Questions', '#faq']].map(([label, href]) => (
              <a key={href} href={href} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                {label}
              </a>
            ))}
          </div>

          <SpringPress className="shrink-0 rounded-full overflow-hidden">{signIn('signin_with')}</SpringPress>
        </div>
        <ScrollProgressBar />
      </nav>

      {/* --------------------------------------------------------- hero */}
      <section id="top" className="relative z-10 pt-16 md:pt-20 pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <motion.div
                {...(animate ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ease: EASE } } : {})}
                className="inline-flex items-center gap-2 pl-2.5 pr-3.5 py-1.5 rounded-full border border-[var(--border-2)] bg-white/[0.03]"
              >
                <Lock className="w-3 h-3 text-[var(--accent)]" />
                <span className="text-[11px] font-medium text-[var(--text-secondary)] tracking-wide">Built for one — just you</span>
              </motion.div>

              <h1 className="mt-7 text-[2.5rem] leading-[1.07] sm:text-[3rem] lg:text-[3.4rem] font-semibold tracking-[-0.03em]">
                <MaskedLines
                  delay={0.08}
                  lines={[
                    'Your whole financial life,',
                    <span key="a" className="text-[var(--accent)]">in one clear view.</span>,
                  ]}
                />
              </h1>

              <motion.p
                {...(animate ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.14, duration: 0.8, ease: EASE } } : {})}
                className="mt-6 text-[17px] leading-relaxed text-[var(--text-secondary)] max-w-[46ch]"
              >
                A private net worth tracker and FIRE calculator that stays out of your way.
              </motion.p>

              <motion.div
                {...(animate ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.22, duration: 0.8, ease: EASE } } : {})}
                className="mt-9 flex items-center gap-4"
              >
                <SpringPress className="rounded-full overflow-hidden">{signIn('continue_with')}</SpringPress>
              </motion.div>
            </div>

            {/* Data, not a mock of the product's chrome */}
            <motion.div
              {...(animate ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.18, duration: 0.9, ease: EASE } } : {})}
              className="lg:col-span-5"
              ref={heroPanel.ref}
            >
              <motion.div
                style={heroPanel.y ? { y: heroPanel.y } : undefined}
                className="rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)]/70 backdrop-blur-sm p-6 sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)] tracking-wide">Net worth</p>
                    <p className="font-mono text-3xl sm:text-[2rem] font-semibold tracking-[-0.03em] mt-1.5 tabular-nums">
                      <CountUp to={284930} prefix="$" />
                    </p>
                  </div>
                  <span className="shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] font-medium font-mono tabular-nums">
                    <Plus className="w-3 h-3" strokeWidth={3} />18.4%
                  </span>
                </div>

                <div className="mt-6">
                  <NetWorthChart animate={animate} />
                </div>

                <div className="mt-5 pt-5 border-t border-[var(--border-1)] grid grid-cols-3 gap-4">
                  {[
                    ['Saved / mo', '$3,180'],
                    ['Savings rate', '41.3%'],
                    ['FIRE in', '11.4 yrs'],
                  ].map(([label, value], i) => (
                    <div key={label}>
                      <p className="text-[11px] text-[var(--text-tertiary)]">{label}</p>
                      <p className={cn(
                        'font-mono text-[15px] font-medium mt-1 tabular-nums',
                        i === 2 ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]'
                      )}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- capabilities */}
      {/* Sticky stack: the three capabilities pin in turn and the outgoing
          card shrinks and dims behind the next. They are chapters of one
          idea, read in order — not three options on a shelf. */}
      <section id="capabilities" className="relative z-10 pt-20 md:pt-28 border-t border-[var(--border-1)]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2 {...rise()} className="text-3xl md:text-[2.6rem] font-semibold tracking-[-0.02em] max-w-[18ch] leading-[1.1]">
            Three things, done properly.
          </motion.h2>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-14 pb-[25vh]">
          <StickyStack count={STACK.length}>
            {(i, style) => {
              const card = STACK[i];
              return (
                <motion.div
                  style={style}
                  className={cn(
                    'origin-top rounded-2xl border p-8 md:p-12 flex flex-col justify-between',
                    'min-h-[clamp(360px,52vh,480px)]',
                    'bg-[var(--surface-1)] border-[var(--border-2)]',
                    'shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.65)]'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <card.icon className={cn('w-6 h-6', card.tone)} strokeWidth={1.75} />
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)] tabular-nums">
                        {String(i + 1).padStart(2, '0')} / {String(STACK.length).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-8 text-2xl md:text-[2rem] font-semibold tracking-[-0.02em] max-w-[16ch] leading-[1.15]">
                      {card.title}
                    </h3>
                    <p className="mt-4 text-[15px] md:text-base leading-relaxed text-[var(--text-secondary)] max-w-[52ch]">
                      {card.body}
                    </p>
                  </div>

                  <div className="mt-10 flex items-end justify-between gap-8">
                    <div>
                      <p className={cn('font-mono text-[2.5rem] md:text-[3rem] leading-none font-semibold tabular-nums', card.tone)}>
                        {card.stat}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-2.5">{card.statLabel}</p>
                    </div>
                    <div className="flex-1 flex items-end gap-1.5 h-16 max-w-[280px]" aria-hidden="true">
                      {card.bars.map((v, bi) => (
                        <motion.span
                          key={bi}
                          className={cn('flex-1 rounded-sm origin-bottom', card.barTone)}
                          style={{ height: `${v}%` }}
                          {...(animate ? {
                            initial: { scaleY: 0 },
                            whileInView: { scaleY: 1 },
                            viewport: { once: true },
                            transition: { delay: bi * 0.03, duration: 0.5, ease: EASE },
                          } : {})}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            }}
          </StickyStack>
        </div>
      </section>

      {/* ------------------------------------------------- kinetic statement */}
      {/* The sentence is the content, so reading it is the interaction —
          each word resolves as the reader moves down. */}
      <section className="relative z-10 py-28 md:py-40 border-t border-[var(--border-1)]">
        <div className="max-w-5xl mx-auto px-6">
          <KineticStatement
            words={['Every', 'account.', 'Every', 'asset.', 'One', 'honest', 'number.']}
            accentFrom={4}
            className="text-[2.4rem] sm:text-5xl md:text-[4.2rem] font-semibold tracking-[-0.035em] leading-[1.05] max-w-[16ch]"
          />
        </div>
      </section>

      {/* ------------------------------------------------------- privacy */}
      {/* Full-width statement + rules. A different layout family to the grid above. */}
      <section id="privacy" className="relative z-10 py-20 md:py-28 border-t border-[var(--border-1)]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2 {...rise()} className="text-3xl md:text-[2.6rem] font-semibold tracking-[-0.02em] max-w-[22ch] leading-[1.1]">
            Your data exists to be shown back to you.
          </motion.h2>
          <motion.p {...rise(0.05)} className="mt-5 text-[17px] leading-relaxed text-[var(--text-secondary)] max-w-[58ch]">
            Nothing else. WealthFlow was built by someone tracking his own path to financial
            independence, and it runs on that one rule.
          </motion.p>

          <div className="mt-14 border-t border-[var(--border-1)]">
            {PRIVACY_POINTS.map(([title, body], i) => (
              <motion.div
                key={title}
                {...rise(0.06 * i)}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 py-7 border-b border-[var(--border-1)]"
              >
                <h3 className="md:col-span-4 text-[15px] font-medium tracking-tight">{title}</h3>
                <p className="md:col-span-8 text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[62ch]">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- pricing */}
      <section id="pricing" className="relative z-10 py-20 md:py-28 border-t border-[var(--border-1)]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.p {...rise()} className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Pricing
          </motion.p>
          <motion.h2 {...rise(0.04)} className="mt-4 text-3xl md:text-[2.6rem] font-semibold tracking-[-0.02em] leading-[1.1] max-w-[20ch]">
            Free today. Honest about tomorrow.
          </motion.h2>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <motion.div {...rise(0.05)} className="lg:col-span-7 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/40 p-8 md:p-10">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-5xl font-semibold tabular-nums"><CountUp to={0} prefix="$" /></span>
                <span className="text-[var(--text-tertiary)] text-sm">forever</span>
              </div>
              <p className="mt-4 text-[15px] text-[var(--text-secondary)] max-w-[46ch]">
                Currently everything. The full tracker, no limits, no trial clock.
              </p>
              <ul className="mt-8 space-y-3.5">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-3 text-[15px]">
                    <Check className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" strokeWidth={2.5} />
                    <span className="text-[var(--text-secondary)]">{f}</span>
                  </li>
                ))}
              </ul>
              <SpringPress className="mt-9 rounded-full overflow-hidden w-fit">{signIn('continue_with')}</SpringPress>
            </motion.div>

            <motion.div {...rise(0.12)} className="lg:col-span-5 rounded-2xl border border-[var(--border-1)] p-8 md:p-10">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-4xl font-semibold text-[var(--text-secondary)] tabular-nums"><CountUp to={20} prefix="$" /></span>
                <span className="text-[var(--text-tertiary)] text-sm">/mo, later</span>
              </div>
              <p className="mt-4 text-[15px] text-[var(--text-tertiary)] max-w-[38ch]">
                For when your money lives in more than one place.
              </p>
              <ul className="mt-8 space-y-3.5">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-3 text-[15px]">
                    <Check className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 shrink-0" strokeWidth={2.5} />
                    <span className="text-[var(--text-tertiary)]">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-9 text-[13px] text-[var(--text-tertiary)]">Not open yet — nothing to pay for today.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- faq */}
      <section id="faq" className="relative z-10 py-20 md:py-28 border-t border-[var(--border-1)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2 {...rise()} className="text-3xl md:text-[2.6rem] font-semibold tracking-[-0.02em] leading-[1.1]">
            Fair questions, straight answers.
          </motion.h2>

          <div className="mt-12 border-t border-[var(--border-1)]">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="border-b border-[var(--border-1)]">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-start justify-between gap-6 py-6 text-left group"
                  >
                    <span className="text-[16px] font-medium tracking-tight group-hover:text-white transition-colors">{f.q}</span>
                    <Plus
                      className={cn(
                        'w-4 h-4 mt-1 shrink-0 text-[var(--text-tertiary)] transition-transform duration-300',
                        open && 'rotate-45 text-[var(--accent)]'
                      )}
                      strokeWidth={2}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-out',
                      open ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[64ch] pr-10">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- closer */}
      <section className="relative z-10 py-24 md:py-32 border-t border-[var(--border-1)]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h2 {...rise()} className="text-3xl md:text-[2.9rem] font-semibold tracking-[-0.025em] leading-[1.1] max-w-[16ch] mx-auto">
            Start with one account.
          </motion.h2>
          <motion.p {...rise(0.05)} className="mt-5 text-[16px] text-[var(--text-secondary)] max-w-[44ch] mx-auto leading-relaxed">
            Sign in and add what you own. The rest of the picture builds itself.
          </motion.p>
          <motion.div {...rise(0.1)} className="mt-10 flex justify-center">
            <SpringPress className="rounded-full overflow-hidden">{signIn('continue_with')}</SpringPress>
          </motion.div>
        </div>
      </section>

      {/* -------------------------------------------------------- footer */}
      <footer className="relative z-10 border-t border-[var(--border-1)]">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Wallet className="text-[#04140e] w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
            <span className="text-[13px] font-medium">WealthFlow</span>
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)]">© 2026 WealthFlow — a private wealth tracker.</p>
        </div>
      </footer>
    </div>
  );
}
