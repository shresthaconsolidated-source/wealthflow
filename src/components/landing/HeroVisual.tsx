/**
 * Decides whether the hero shows the WebGL net-worth surface or the 2D panel,
 * and makes sure the choice costs nothing to anyone who doesn't get it.
 *
 * Three rules this file exists to enforce:
 *
 *  1. Sign-in is never blocked by WebGL. three.js is reached only through a
 *     dynamic import that starts AFTER the browser reports the page
 *     interactive, so the Google button works from first paint regardless of
 *     whether the scene ever loads. Signed-in users never touch this module at
 *     all — the whole landing page is behind the auth check.
 *  2. Progressive enhancement for real. Anything that fails the capability
 *     check keeps the 2D panel, which is a good hero on its own. Nobody sees a
 *     broken or stuttering scene.
 *  3. Copy stays in the DOM. The figures below are real text, selectable and
 *     readable by a screen reader. Nothing is drawn into the canvas.
 */
import React, { useEffect, useState, Suspense, lazy } from 'react';

// The one place three.js is referenced. Vite splits this into its own chunk,
// so the landing page's 3D cost is visible separately from the app bundle.
const NetWorthSurface = lazy(() => import('./NetWorthSurface'));

export type SurfaceDecision = 'pending' | 'enabled' | 'declined';

// The predicate lives in its own React-free module so it can be unit tested
// against fabricated environments — see canRunSurface.test.ts. The end-to-end
// decline path is not reachable from a browser harness, so that is where the
// progressive-enhancement guarantee is actually verified.
export { canRunSurface } from './canRunSurface';
import { canRunSurface } from './canRunSurface';

export function useSurfaceDecision() {
  const [decision, setDecision] = useState<SurfaceDecision>('pending');
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;

    // Wait until the page is interactive before even deciding, so the check
    // and the import can never compete with sign-in becoming usable.
    const decide = () => {
      if (cancelled) return;
      const { ok, reason } = canRunSurface();
      setReason(reason);
      setDecision(ok ? 'enabled' : 'declined');
    };

    const schedule = () => {
      const ric = (window as any).requestIdleCallback as
        | ((cb: () => void, o?: { timeout: number }) => number)
        | undefined;
      // Short timeout: still strictly after load, but soon enough that the
      // surface arrives while the hero is being read rather than a second and
      // a half later.
      if (ric) ric(decide, { timeout: 400 });
      else setTimeout(decide, 120);
    };

    if (document.readyState === 'complete') schedule();
    else {
      window.addEventListener('load', schedule, { once: true });
      return () => {
        cancelled = true;
        window.removeEventListener('load', schedule);
      };
    }
    return () => { cancelled = true; };
  }, []);

  return { decision, reason };
}

/**
 * Renders the surface when it has been allowed, nothing otherwise. The caller
 * keeps its own 2D content underneath either way, so a decline is invisible.
 */
export default function HeroVisual({
  compact,
  onReady,
}: {
  compact: boolean;
  onReady?: () => void;
}) {
  const { decision } = useSurfaceDecision();
  const [painted, setPainted] = useState(false);

  if (decision !== 'enabled') return null;

  return (
    <Suspense fallback={null}>
      {/* Fades in over the 2D chart rather than replacing it. The chart keeps
          the space filled from first paint, so there is no flash and no
          layout shift when the chunk lands. */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ opacity: painted ? 1 : 0 }}
      >
        <NetWorthSurface
          reduced={false}
          compact={compact}
          onReady={() => {
            // Wait one frame past mount so the first render has actually
            // landed before we start revealing it.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setPainted(true);
                onReady?.();
              });
            });
          }}
        />
      </div>
    </Suspense>
  );
}
