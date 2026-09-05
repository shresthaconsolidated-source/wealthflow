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
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const value = useMotionValue(reduce ? to : 0);

  // Rendered THROUGH the motion value rather than through React state or an
  // imperative textContent write. A ref write gets clobbered the moment React
  // re-renders the span; a state write would re-render every frame. Passing
  // the value as a motion child updates the text node directly, outside the
  // render cycle, and survives re-renders.
  const text = useTransform(value, v =>
    `${prefix}${v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );

  React.useEffect(() => {
    if (reduce) { value.set(to); return; }
    if (!inView) return;
    const controls = animate(value, to, { duration: 1.4, ease: EASE });
    return () => controls.stop();
  }, [inView, to, reduce, value]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
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
  children: (index: number, style: StackStyle) => React.ReactNode;
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
  render: (index: number, style: StackStyle) => React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const isLast = index === count - 1;

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
      {render(index, style)}
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
  className,
}: {
  words: string[];
  /** Index from which words take the accent colour. */
  accentFrom?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.4'],
  });

  return (
    <div ref={ref} className={cn('flex flex-wrap gap-x-[0.3em] gap-y-1', className)}>
      {words.map((w, i) => (
        <KineticWord
          key={`${w}-${i}`}
          word={w}
          index={i}
          total={words.length}
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
  index,
  total,
  progress,
  reduce,
  accent,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reduce: boolean;
  accent: boolean;
}) {
  // Each word claims a slice of the section's scroll range, so they resolve
  // left-to-right as the reader moves down.
  const start = index / total;
  const end = start + 1 / total;
  const opacity = useTransform(progress, [start, end], [0.16, 1]);

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
