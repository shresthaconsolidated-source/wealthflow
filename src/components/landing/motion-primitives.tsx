/**
 * Scroll-driven motion primitives for the landing page.
 *
 * Two rules govern everything here:
 *
 *   1. Motion must be motivated. Each of these communicates something —
 *      hierarchy, sequence, or a value changing. Nothing loops for decoration.
 *   2. No scroll listeners and no per-frame React state. Everything reads from
 *      Motion's `useScroll` / motion values, which live outside the render
 *      cycle. A `window.addEventListener('scroll')` here would re-render the
 *      page on every frame.
 *
 * Every primitive degrades to a static, fully-visible state under
 * `prefers-reduced-motion` — it doesn't merely shorten the animation, it
 * doesn't run it.
 */
import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  animate,
  useReducedMotion,
  type MotionValue,
} from 'motion/react';
import { cn } from '@/src/lib/utils';

export const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/* Masked line reveal                                                  */
/* ------------------------------------------------------------------ */
/**
 * Headline lines rise out of a clipping mask, one after another. Communicates
 * reading order — the eye is walked down the sentence rather than having the
 * whole block appear at once.
 */
export function MaskedLines({
  lines,
  className,
  lineClassName,
  delay = 0,
}: {
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <span className={cn('block', className)}>
      {lines.map((line, i) => (
        // overflow-hidden is the mask; pb-[0.12em] keeps descenders (y, g, p)
        // from being clipped by it.
        <span key={i} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
          <motion.span
            className={cn('block', lineClassName)}
            initial={reduce ? false : { y: '110%' }}
            animate={{ y: '0%' }}
            transition={{ delay: delay + i * 0.09, duration: 0.9, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Count-up                                                            */
/* ------------------------------------------------------------------ */
/**
 * A figure counts to its value when it first enters view. Communicates that
 * this is a live, accumulating number rather than static page furniture.
 *
 * Writes through a ref rather than React state — a state update per frame for
 * a counter is exactly the pattern the motion rules forbid.
 */
export function CountUp({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  delay = 0,
  start,
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
  /** When provided, the count runs on this going true instead of on entering
   *  the viewport — used by the sticky stack so each figure arrives as its
   *  card takes focus, not all at once on page load. */
  start?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const value = useMotionValue(reduce ? to : 0);

  // Rendered THROUGH the motion value rather than React state or a textContent
  // write. A ref write is clobbered by the next React render — which is exactly
  // what broke the first version. Passing the value as a motion child updates
  // the text node outside the render cycle and survives re-renders.
  const text = useTransform(value, v =>
    `${prefix}${v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );

  const go = start === undefined ? inView : start;

  React.useEffect(() => {
    if (reduce) { value.set(to); return; }
    if (!go) return;
    // No "already fired" ref here. StrictMode runs effects twice in dev:
    // mount -> start, cleanup -> controls.stop(), re-run -> blocked by the
    // guard, leaving the figure frozen at 0. Comparing against the target is
    // idempotent instead: a re-run mid-animation simply continues from where
    // the value already is.
    if (value.get() === to) return;
    const controls = animate(value, to, { duration: 0.85, delay, ease: EASE });
    return () => controls.stop();
  }, [go, to, reduce, value, delay]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* Drawn rule                                                          */
/* ------------------------------------------------------------------ */
/**
 * A hairline that draws itself left to right as its row enters. Used under
 * the privacy claims: the line finishing is what makes each claim feel
 * settled rather than merely present.
 */
export function DrawnRule({ delay = 0, className }: { delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn('h-px w-full origin-left', className)}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ delay, duration: 0.9, ease: EASE }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Ground lift                                                         */
/* ------------------------------------------------------------------ */
/**
 * The closing section warms toward the accent as it enters, so the page
 * visibly arrives somewhere instead of just stopping. Scroll-linked, so the
 * reader drives it.
 */
export function useGroundLift() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const p = useSpring(raw, { stiffness: 90, damping: 28, mass: 0.5 });
  const background = useTransform(
    p,
    [0, 1],
    ['radial-gradient(120% 80% at 50% 120%, rgba(46,230,166,0) 0%, rgba(46,230,166,0) 60%)',
     'radial-gradient(120% 80% at 50% 120%, rgba(46,230,166,0.16) 0%, rgba(46,230,166,0) 62%)']
  );
  return { ref, background: reduce ? undefined : background };
}

/* ------------------------------------------------------------------ */
/* Parallax                                                            */
/* ------------------------------------------------------------------ */
/** Depth cue: foreground and background drift apart as the page scrolls. */
export function useParallax(distance = 60) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });
  return { ref, y: reduce ? undefined : y };
}

/* ------------------------------------------------------------------ */
/* Sticky stack                                                        */
/* ------------------------------------------------------------------ */
/**
 * Cards pin in turn and the outgoing card shrinks and dims as the next one
 * arrives over it. Communicates sequence: these are chapters of one idea,
 * read in order, not three options on a shelf.
 *
 * Pinning is CSS `position: sticky`, so there is no JS pin, no layout thrash
 * and nothing to leak on unmount.
 *
 * The scroll progress is measured on the CONTAINER, never on a card. A stuck
 * element's bounding rect stops moving by definition, so `useScroll` targeted
 * at the card itself freezes at 0 and the transform never runs. Each card
 * derives its own slice of the container's progress instead.
 */
export function StickyStack({
  count,
  children,
  topOffset = '6rem',
  step = 14,
}: {
  count: number;
  children: (index: number, style: StackStyle, focused: boolean) => React.ReactNode;
  /** Where the first card pins. */
  topOffset?: string;
  /** Each card rests this many px lower, so the stack shows its own edges. */
  step?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  return (
    <div ref={ref}>
      {Array.from({ length: count }, (_, i) => (
        <StackItem
          key={i}
          index={i}
          count={count}
          progress={scrollYProgress}
          topOffset={topOffset}
          step={step}
          render={children}
        />
      ))}
    </div>
  );
}

export interface StackStyle {
  scale?: MotionValue<number>;
  opacity?: MotionValue<number>;
  filter?: MotionValue<string>;
}

const StackItem = React.memo(function StackItem({
  index,
  count,
  progress,
  topOffset,
  step,
  render,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  topOffset: string;
  step: number;
  render: (index: number, style: StackStyle, focused: boolean) => React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const isLast = index === count - 1;

  // One state flip per card when it takes focus — not a per-frame update.
  // `useMotionValueEvent` reads the motion value outside the render cycle and
  // only calls setState on an actual transition.
  const [focused, setFocused] = React.useState(index === 0);
  useMotionValueEvent(progress, 'change', v => {
    const active = v >= (index - 0.35) / count;
    setFocused(prev => (prev === active ? prev : active));
  });

  // This card recedes across the slice of the scroll during which the NEXT
  // card travels over it.
  const from = index / count;
  const to = (index + 1) / count;

  const scale = useTransform(progress, [from, to], [1, 0.92]);
  const opacity = useTransform(progress, [from, to], [1, 0.45]);
  const filter = useTransform(progress, [from, to], ['blur(0px)', 'blur(3px)']);

  const style: StackStyle = reduce || isLast ? {} : { scale, opacity, filter };

  return (
    <div
      className="sticky"
      style={{ top: `calc(${topOffset} + ${index * step}px)`, zIndex: index + 1 }}
    >
      {render(index, style, reduce ? true : focused)}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Kinetic statement                                                   */
/* ------------------------------------------------------------------ */
/**
 * A large statement whose words resolve from dim to bright as the section
 * scrolls through the viewport. Communicates emphasis: the sentence is the
 * content, so reading it *is* the interaction.
 */
export function KineticStatement({
  words,
  accentFrom,
  landTogetherFrom,
  className,
}: {
  words: string[];
  /** Index from which words take the accent colour. */
  accentFrom?: number;
  /** Words from this index share one range, so the phrase lands as a unit
   *  instead of trailing off one word at a time. */
  landTogetherFrom?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // A long, unhurried range: the statement is the section, so it should take
  // the whole of it to resolve rather than finishing in the first third.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.92', 'end 0.55'],
  });

  // Words before the grouping point each get their own slice; the closing
  // phrase shares one.
  const groupAt = landTogetherFrom ?? words.length;
  const slices = Math.min(groupAt, words.length) + (groupAt < words.length ? 1 : 0);

  return (
    <div ref={ref} className={cn('flex flex-wrap gap-x-[0.3em] gap-y-1', className)}>
      {words.map((w, i) => (
        <KineticWord
          key={`${w}-${i}`}
          word={w}
          slot={i < groupAt ? i : groupAt}
          slices={slices}
          progress={scrollYProgress}
          reduce={!!reduce}
          accent={accentFrom !== undefined && i >= accentFrom}
        />
      ))}
    </div>
  );
}

const KineticWord = React.memo(function KineticWord({
  word,
  slot,
  slices,
  progress,
  reduce,
  accent,
}: {
  word: string;
  slot: number;
  slices: number;
  progress: MotionValue<number>;
  reduce: boolean;
  accent: boolean;
}) {
  // Each word claims a slice of the section's scroll range, so they resolve
  // left to right as the reader moves down. Words sharing a slot resolve
  // together.
  const start = slot / slices;
  const end = start + 1 / slices;
  const opacity = useTransform(progress, [start, end], [0.14, 1]);

  return (
    <motion.span
      style={reduce ? undefined : { opacity }}
      className={accent ? 'text-[var(--accent)]' : undefined}
    >
      {word}
    </motion.span>
  );
});

/* ------------------------------------------------------------------ */
/* Scroll progress                                                     */
/* ------------------------------------------------------------------ */
/** A hairline in the nav showing how far through the page the reader is. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, mass: 0.3 });
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.div
      style={{ scaleX }}
      className="absolute bottom-0 left-0 right-0 h-px bg-[var(--accent)] origin-left"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Spring hover                                                        */
/* ------------------------------------------------------------------ */
/** Physical feedback on press. Spring, never linear easing. */
export function SpringPress({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
