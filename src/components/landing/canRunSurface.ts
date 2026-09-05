/**
 * The capability gate for the hero WebGL surface.
 *
 * Deliberately in its own module with no React import, so it can be unit
 * tested against fabricated environments. The end-to-end decline path is
 * awkward to exercise in a browser harness — the decision is made ~1s after
 * load, before a test script can realistically intervene — so the predicate
 * itself carries the verification.
 *
 * Bias: when anything is uncertain, decline. The 2D hero is good on its own,
 * and a stuttering scene is worse than no scene.
 */

export interface SurfaceEnv {
  matchMedia?: (q: string) => { matches: boolean };
  connection?: { saveData?: boolean; effectiveType?: string };
  hardwareConcurrency?: number;
  createCanvas: () => {
    getContext: (id: string) => any;
  };
  hasWebGL2Ctor?: boolean;
}

export interface SurfaceVerdict {
  ok: boolean;
  reason: string;
}

export function evaluateSurfaceSupport(env: SurfaceEnv): SurfaceVerdict {
  // An explicit request for less motion outranks everything else.
  if (env.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return { ok: false, reason: 'prefers-reduced-motion' };
  }

  // Don't spend someone's metered data on decoration.
  if (env.connection?.saveData) return { ok: false, reason: 'save-data' };
  if (env.connection?.effectiveType && /(^|-)2g$/.test(env.connection.effectiveType)) {
    return { ok: false, reason: 'slow network: ' + env.connection.effectiveType };
  }

  // A very low core count is a fair proxy for a device that will struggle.
  if (typeof env.hardwareConcurrency === 'number' && env.hardwareConcurrency <= 2) {
    return { ok: false, reason: 'hardwareConcurrency ' + env.hardwareConcurrency };
  }

  try {
    const canvas = env.createCanvas();
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return { ok: false, reason: 'no webgl context' };

    // Software rasterisers identify themselves often enough to be worth
    // checking; they cannot hold frame rate on a full-panel shader.
    const dbg = gl.getExtension?.('WEBGL_debug_renderer_info');
    if (dbg) {
      const renderer = String(gl.getParameter?.(dbg.UNMASKED_RENDERER_WEBGL) ?? '');
      if (/swiftshader|llvmpipe|software|microsoft basic/i.test(renderer)) {
        return { ok: false, reason: 'software renderer: ' + renderer };
      }
    }

    // fwidth is load-bearing for the grid — without derivatives it looks wrong.
    const isWebGL2 = Boolean(env.hasWebGL2Ctor);
    if (!isWebGL2 && !gl.getExtension?.('OES_standard_derivatives')) {
      return { ok: false, reason: 'no derivatives support' };
    }

    const MAX_TEXTURE_SIZE = gl.MAX_TEXTURE_SIZE ?? 0x0d33;
    const maxTex = gl.getParameter?.(MAX_TEXTURE_SIZE) as number;
    if (!maxTex || maxTex < 2048) return { ok: false, reason: 'max texture ' + maxTex };

    gl.getExtension?.('WEBGL_lose_context')?.loseContext?.();
    return { ok: true, reason: isWebGL2 ? 'webgl2' : 'webgl1' };
  } catch (err) {
    return { ok: false, reason: 'probe threw: ' + String(err) };
  }
}

/** Browser entry point. Reads the real environment, then defers to the pure fn. */
export function canRunSurface(): SurfaceVerdict {
  if (typeof window === 'undefined') return { ok: false, reason: 'no window' };
  return evaluateSurfaceSupport({
    matchMedia: q => window.matchMedia(q),
    connection: (navigator as any).connection,
    hardwareConcurrency: navigator.hardwareConcurrency,
    createCanvas: () => document.createElement('canvas') as any,
    hasWebGL2Ctor:
      typeof WebGL2RenderingContext !== 'undefined' &&
      (() => {
        try {
          const c = document.createElement('canvas');
          return c.getContext('webgl2') instanceof WebGL2RenderingContext;
        } catch {
          return false;
        }
      })(),
  });
}
