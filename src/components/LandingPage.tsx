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
  DrawnRule,
  useGroundLift,
} from '@/src/components/landing/motion-primitives';
import HeroVisual, { useSurfaceDecision } from '@/src/components/landing/HeroVisual';
import { useIsDesktop } from '@/src/hooks/useIsDesktop';

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
    stat: 11.4, statDecimals: 1, statSuffix: '',
    statLabel: 'years to independence',
    bars: [26, 34, 30, 42, 51, 47, 60, 68, 64, 79, 88, 100],
  },
  {
    icon: TrendingUp,
    tone: 'text-[var(--accent)]',
    barTone: 'bg-[var(--accent)]/25',
    title: 'One net worth, everywhere',
    body: 'Every account, asset and liability rolled into a single always-current figure — including the ones that only exist on paper, and the ones you owe.',
    stat: 12, statDecimals: 0, statSuffix: '',
    statLabel: 'accounts in one figure',
    bars: [40, 52, 48, 61, 58, 70, 66, 78, 84, 80, 92, 97],
  },
  {
    icon: Activity,
    tone: 'text-blue-400',
    barTone: 'bg-blue-400/25',
    title: 'Spending that explains itself',
    body: 'Recurring bills surface on their own. Trends arrive before you go looking for them, and one-off distortions stay out of your averages.',
    stat: 41.3, statDecimals: 1, statSuffix: '%',
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

// "Shared household access" used to sit here and contradicted the hero's
// "Built for one — just you". The single-user promise is the stronger claim
// and the rest of the page is built on it, so the household feature goes.
const PRO_FEATURES = [
  'Automatic bank sync',
  'Scheduled off-site backups',
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
        transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
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
        transition={{ delay: 0.22, duration: 0.62, ease: EASE }}
      />
      <motion.circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="4"
        fill="var(--accent)"
        initial={animate ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={{ delay: 0.82, duration: 0.3, ease: EASE }}
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
  const closer = useGroundLift();
  // When the WebGL surface runs it replaces the 2D sparkline. Every figure
  // stays DOM text either way — nothing is drawn into the canvas.
  const { decision: surface } = useSurfaceDecision();
  const surfaceOn = surface === 'enabled';
  // A phone gets a deliberately lighter scene, not a worse version of the big
  // one: fewer segments, lower grid density, capped pixel ratio.
  const isDesktop = useIsDesktop();
  const [surfaceReady, setSurfaceReady] = useState(false);

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

  // The wrapper's overflow-x MUST stay `clip`, never `hidden`.
  // `hidden` computes to `overflow: hidden auto`, which makes this wrapper the
  // nearest scrollport for every descendant. The window is what actually
  // scrolls, so the sticky cards below then have no scrollport to pin against
  // and scroll away as static content — measured at 1440x900, their rect.top
  // ran 460 -> 199 -> -62 -> ... decreasing linearly with no clamp.
  // `clip` suppresses horizontal overflow without creating a scroll container,
  // so position: sticky survives it.
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] selection:bg-[var(--accent)]/25 overflow-x-clip antialiased">
      {/* The terrain the camera travels. Fixed behind every section, faded
          out entirely across the light room — see NetWorthSurface. */}
      {surfaceOn && <HeroVisual compact={!isDesktop} onReady={() => setSurfaceReady(true)} />}

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
                className={cn(
                  'rounded-2xl border border-[var(--border-1)] backdrop-blur-md p-6 sm:p-7 transition-colors duration-700',
                  surfaceReady ? 'bg-[var(--surface-1)]/35' : 'bg-[var(--surface-1)]/70'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)] tracking-wide">Net worth</p>
                    <p className="font-mono text-3xl sm:text-[2rem] font-semibold tracking-[-0.03em] mt-1.5 tabular-nums">
                      <CountUp to={284930} prefix="$" delay={0.45} />
                    </p>
                  </div>
                  <span className="shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] font-medium font-mono tabular-nums">
                    <Plus className="w-3 h-3" strokeWidth={3} />18.4%
                  </span>
                </div>

                {/* The 2D chart is the base layer and always renders, so the
                    hero reads instantly and never shifts. When the surface is
                    allowed and has painted, it fades in over the top and the
                    chart fades out beneath it. */}
                {/* The 2D chart holds this space from first paint. Once the
                    terrain is running it fades out and the surface reads
                    through the panel instead — the height never changes, so
                    nothing shifts when the chunk lands. */}
                <div className="mt-6 relative h-[190px] sm:h-[210px]">
                  <div className="absolute inset-0 flex items-center">
                    <NetWorthChart animate={animate} />
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-[var(--border-1)] grid grid-cols-3 gap-4">
                  {[
                    ['Saved / mo', '$3,180'],
                    ['Savings rate', '41.3%'],
                    ['FIRE in', '11.4 yrs'],
                  ].map(([label, value], i) => (
                    <motion.div
                      key={label}
                      {...(animate ? {
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { delay: 0.86 + i * 0.07, duration: 0.45, ease: EASE },
                      } : {})}
                    >
                      <p className="text-[11px] text-[var(--text-tertiary)]">{label}</p>
                      <p className={cn(
                        'font-mono text-[15px] font-medium mt-1 tabular-nums',
                        i === 2 ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]'
                      )}>
                        {value}
                      </p>
                    </motion.div>
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

        <div className="max-w-5xl mx-auto px-6 mt-14 pb-[45vh]">
          <StickyStack count={STACK.length}>
            {(i, style, focused) => {
              const card = STACK[i];
              return (
                <motion.div
                  style={style}
                  className={cn(
                    'origin-top rounded-2xl border p-8 md:p-12 flex flex-col justify-between',
                    // Dwell time per card == this height, because the gap
                    // between sticky pin events is the preceding sibling's
                    // height. At 48vh each card held focus for only ~400px.
                    'min-h-[clamp(420px,66vh,600px)] mb-[10vh]',
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
                        {/* Counts as this card takes focus, not on page load —
                            the figure belongs to the card the reader is on. */}
                        <CountUp
                          to={card.stat}
                          decimals={card.statDecimals}
                          suffix={card.statSuffix}
                          start={focused}
                        />
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
                            animate: { scaleY: focused ? 1 : 0 },
                            transition: { delay: bi * 0.028, duration: 0.45, ease: EASE },
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
      <section className="relative z-10 py-36 md:py-56 border-t border-[var(--border-1)]">
        <div className="max-w-5xl mx-auto px-6">
          <KineticStatement
            words={['Every', 'account.', 'Every', 'asset.', 'One', 'honest', 'number.']}
            accentFrom={4}
            landTogetherFrom={4}
            className="text-[2.4rem] sm:text-5xl md:text-[4.2rem] font-semibold tracking-[-0.035em] leading-[1.05] max-w-[16ch]"
          />
        </div>
      </section>

      {/* ------------------------------------------------- product shot */}
      {/* An actual screenshot of the running app. Every figure in it is
          invented — it was captured against an isolated demo account that no
          longer exists — but the interface is the real one, not a mockup.
          Scroll-linked: the shot settles as it enters, so the reader feels
          they brought it into focus. */}
      <section className="relative z-10 pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2 {...rise()} className="text-3xl md:text-[2.6rem] font-semibold tracking-[-0.02em] max-w-[20ch] leading-[1.1]">
            This is the whole thing.
          </motion.h2>
          <motion.p {...rise(0.05)} className="mt-5 text-[17px] leading-relaxed text-[var(--text-secondary)] max-w-[52ch]">
            No onboarding maze, no dashboard you have to assemble first. Sign in and this is
            what you get.
          </motion.p>

          <motion.div
            initial={animate ? { opacity: 0, y: 40, scale: 0.97 } : false}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 1, ease: EASE }}
            className="mt-12 rounded-2xl border border-[var(--border-2)] overflow-hidden shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
          >
            <img
              src="/product-dashboard.png"
              alt="The WealthFlow dashboard: total net worth, monthly income and expense, savings rate, a net-worth growth chart and asset allocation by account type."
              width={1440}
              height={900}
              loading="lazy"
              decoding="async"
              className="w-full h-auto block"
            />
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------- light room: privacy + pricing */}
      {/* The page changes ground here. A uniformly dark page reads flat no
          matter how well each section is composed; two rooms give the scroll
          somewhere to arrive. Light sections use --ink-* and --accent-ink,
          because emerald on paper is ~1.6:1 and fails as text. */}
      <div className="relative z-10 bg-[var(--paper-0)] text-[var(--ink-primary)]">
        <section id="privacy" className="py-24 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <motion.h2 {...rise()} className="text-3xl md:text-[2.6rem] font-semibold tracking-[-0.02em] max-w-[22ch] leading-[1.1]">
              Your data exists to be shown back to you.
            </motion.h2>
            <motion.p {...rise(0.05)} className="mt-5 text-[17px] leading-relaxed text-[var(--ink-secondary)] max-w-[58ch]">
              Nothing else. WealthFlow was built by someone tracking his own path to financial
              independence, and it runs on that one rule.
            </motion.p>

            <div className="mt-16">
              {PRIVACY_POINTS.map(([title, body], i) => (
                <div key={title}>
                  {/* The rule drawing is what makes each claim feel settled
                      rather than merely present. Calm, not snappy. */}
                  <DrawnRule delay={i * 0.12} className="bg-[var(--paper-border)]" />
                  <motion.div
                    initial={animate ? { opacity: 0, y: 12 } : false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ delay: 0.15 + i * 0.12, duration: 0.8, ease: EASE }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 py-8"
                  >
                    <h3 className="md:col-span-4 text-[15px] font-semibold tracking-tight">{title}</h3>
                    <p className="md:col-span-8 text-[15px] leading-relaxed text-[var(--ink-secondary)] max-w-[62ch]">{body}</p>
                  </motion.div>
                </div>
              ))}
              <DrawnRule delay={PRIVACY_POINTS.length * 0.12} className="bg-[var(--paper-border)]" />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- pricing */}
        {/* Clarity, not motion: a plain stagger and nothing else. */}
        <section id="pricing" className="pb-24 md:pb-32">
          <div className="max-w-6xl mx-auto px-6">
            <motion.p {...rise()} className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-tertiary)]">
              Pricing
            </motion.p>
            <motion.h2 {...rise(0.04)} className="mt-4 text-3xl md:text-[2.6rem] font-semibold tracking-[-0.02em] leading-[1.1] max-w-[20ch]">
              Free today. Honest about tomorrow.
            </motion.h2>

            <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <motion.div
                initial={animate ? { opacity: 0, y: 18 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: EASE }}
                className="lg:col-span-7 rounded-2xl border border-[var(--accent-ink)]/25 bg-white/60 p-8 md:p-10"
              >
                <div className="flex items-baseline gap-3">
                  {/* Static. A price is not an accumulating quantity, and
                      counting one up is decoration. */}
                  <span className="font-mono text-5xl font-semibold tabular-nums">$0</span>
                  <span className="text-[var(--ink-tertiary)] text-sm">forever</span>
                </div>
                <p className="mt-4 text-[15px] text-[var(--ink-secondary)] max-w-[46ch]">
                  Currently everything. The full tracker, no limits, no trial clock.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {FREE_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <Check className="w-4 h-4 text-[var(--accent-ink)] mt-0.5 shrink-0" strokeWidth={2.5} />
                      <span className="text-[var(--ink-secondary)]">{f}</span>
                    </li>
                  ))}
                </ul>
                <SpringPress className="mt-9 rounded-full overflow-hidden w-fit">{signIn('continue_with')}</SpringPress>
              </motion.div>

              <motion.div
                initial={animate ? { opacity: 0, y: 18 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: 0.1, duration: 0.7, ease: EASE }}
                className="lg:col-span-5 rounded-2xl border border-[var(--paper-border)] p-8 md:p-10"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-semibold text-[var(--ink-secondary)] tabular-nums">$20</span>
                  <span className="text-[var(--ink-tertiary)] text-sm">/mo when it opens</span>
                </div>
                <p className="mt-4 text-[15px] text-[var(--ink-tertiary)] max-w-[38ch]">
                  For the parts that cost real money to run.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-3 text-[15px]">
                      <Check className="w-4 h-4 text-[var(--ink-tertiary)] mt-0.5 shrink-0" strokeWidth={2.5} />
                      <span className="text-[var(--ink-tertiary)]">{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-9 text-[13px] text-[var(--ink-tertiary)]">Not open yet — nothing to pay for today.</p>
              </motion.div>
            </div>
          </div>
        </section>
      </div>

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
                    <motion.span
                      className="mt-1 shrink-0"
                      animate={{ rotate: open ? 45 : 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE }}
                    >
                      <Plus className={cn('w-4 h-4', open ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]')} strokeWidth={2} />
                    </motion.span>
                  </button>
                  {/* Height animated with the page's easing curve rather than
                      a linear CSS snap, and the chevron rotates on the same
                      timing so they read as one gesture. */}
                  <motion.div
                    initial={false}
                    animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                    transition={reduce ? { duration: 0 } : { height: { duration: 0.45, ease: EASE }, opacity: { duration: open ? 0.35 : 0.2, ease: EASE } }}
                    className="overflow-hidden"
                  >
                    <p className="text-[15px] leading-relaxed text-[var(--text-secondary)] max-w-[64ch] pr-10 pb-6">{f.a}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- closer */}
      <section ref={closer.ref} className="relative z-10 py-28 md:py-40 border-t border-[var(--border-1)] overflow-hidden">
        {/* The page should visibly arrive somewhere rather than just stopping. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={closer.background ? { background: closer.background } : undefined}
        />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
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

