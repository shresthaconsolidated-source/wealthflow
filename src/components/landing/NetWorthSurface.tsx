/**
 * The net-worth terrain, and the camera journey across it.
 *
 * Scroll is time. The surface's left-to-right axis is time and its height is
 * net worth, so travelling the camera to the right IS moving forward through
 * time toward independence. The trend accelerates rather than rising
 * linearly, which makes compounding visible as curvature instead of asserting
 * it in copy. Volatility narrows as the balance climbs.
 *
 * The page is scored as three movements:
 *
 *   Movement one   hero -> sticky stack -> kinetic statement. The journey from
 *                  today. The camera travels right and settles lower as the
 *                  surface rises to meet it.
 *   The pause      the light room. The terrain fades out entirely: the privacy
 *                  claims land on paper, with no motion behind them. This is
 *                  the beat that makes the two movements read as separate
 *                  rooms rather than one unbroken move.
 *   Movement two   the resumed approach to the FIRE horizon. (Phase 2b — the
 *                  camera currently parks at the end of movement one.)
 *
 * Reached only through a dynamic import, so three.js is never in the main
 * bundle and signed-in users never download a byte of it.
 *
 * Cost control: one mesh, one ShaderMaterial, one draw call. The grid is drawn
 * in the fragment shader with fwidth anti-aliasing rather than as line
 * geometry. No textures, no loaders, no post-processing — nothing is fetched.
 * The loop stops when the tab is hidden or the scene is fully faded out, so
 * the pause and an unread page both cost zero GPU.
 */
import React, { useEffect, useRef } from 'react';
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Vector2,
  Color,
  DoubleSide,
} from 'three';

const VERT = (octaves: number) => /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uReveal;

  varying float vH;
  varying float vDepth;
  varying vec2  vGrid;

  // Cheap value noise. Hand-written because a noise library would cost more
  // bytes than the twelve lines it replaces.
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // Octave count is baked in at compile time — a loop bound must be constant
  // in GLSL ES, and a phone does not need four octaves of detail it cannot
  // resolve.
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < ${octaves}; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vGrid = uv;

    float t = uv.x;                        // left to right is time

    // Compounding: the trend accelerates. This is the whole idea of the piece.
    float trend = pow(t, 2.1) * 3.4;

    // Volatility that narrows as the balance grows.
    float vol = (fbm(vec2(t * 7.0 + uTime * 0.04, uv.y * 2.2)) - 0.5)
              * (0.10 + 0.34 * (1.0 - t));

    float h = trend + vol;

    // The surface forms left to right on arrival, in step with the figure
    // counting up beside it.
    float rev = smoothstep(t - 0.10, t + 0.02, uReveal);
    h *= rev;

    // A gentle swell toward the pointer. Response, not a gimmick.
    float d = distance(uv, uMouse * 0.5 + 0.5);
    h += 0.07 * exp(-d * d * 9.0) * rev;

    vH = h;

    vec3 p = position;
    p.z += h;                              // plane is XY; the mesh lies flat
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform vec3  uAccent;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec2  uGridDensity;
  uniform float uOpacity;

  varying float vH;
  varying float vDepth;
  varying vec2  vGrid;

  void main() {
    // Grid in the fragment shader, anti-aliased by screen-space derivative.
    // One mesh instead of thousands of line segments.
    vec2 g  = vGrid * uGridDensity;
    vec2 gw = fwidth(g);
    vec2 gr = abs(fract(g - 0.5) - 0.5) / max(gw, vec2(1e-5));
    float line = 1.0 - min(min(gr.x, gr.y), 1.0);

    float lift = smoothstep(0.0, 2.6, vH);

    // Colour travels from cool slate early to full accent at the top of the
    // climb. Brightness is never tied to height alone — the early years must
    // stay legible or that half of the frame renders black on black.
    vec3 lineCol = mix(vec3(0.20, 0.27, 0.31), uAccent, lift);
    float intensity = 0.40 + 1.15 * lift;

    vec3 col = lineCol * line * intensity;
    col += mix(vec3(0.018, 0.023, 0.027), uAccent * 0.15, lift) * 0.5;

    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);

    float alpha = (line * (0.52 + 0.58 * lift) + 0.05) * fog * uOpacity;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(col * fog, alpha);
  }
`;

export interface SurfaceHandle {
  destroy: () => void;
}

/** Where each movement begins and ends, in document pixels. */
interface Movements {
  m1Start: number;
  m1End: number;
  pauseStart: number;
  pauseEnd: number;
  docEnd: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Ease so the camera settles rather than arriving at constant speed. */
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Imperative mount. Deliberately free of React state — nothing here re-renders
 * a component, and scroll is read once per frame inside the existing rAF loop
 * rather than through a scroll listener.
 */
export function mountSurface(
  canvas: HTMLCanvasElement,
  opts: { reduced: boolean; compact: boolean }
): SurfaceHandle {
  const { reduced, compact } = opts;

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,          // the grid is analytically anti-aliased already
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  renderer.setClearColor(0x000000, 0);

  // Full-viewport fill rate is the whole cost here, so the pixel-ratio cap is
  // the single most important performance lever. Retina buys little on a grid
  // that is already analytically anti-aliased.
  // Phones cap harder: fill rate is the dominant cost and a dense grid on a
  // small screen resolves to mush anyway.
  const maxDpr = compact ? 1.15 : 1.6;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 40);

  // A long plane: the camera travels across it rather than the surface moving.
  const segX = compact ? 96 : 240;
  const segY = compact ? 34 : 84;
  const geometry = new PlaneGeometry(12, 3.4, segX, segY);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0, 0) },
    uReveal: { value: reduced ? 1 : 0 },
    uAccent: { value: new Color('#2ee6a6') },
    uFogNear: { value: 2.0 },
    uFogFar: { value: 7.5 },
    uGridDensity: { value: new Vector2(compact ? 48 : 112, compact ? 13 : 26) },
    uOpacity: { value: 1 },
  };

  const material = new ShaderMaterial({
    vertexShader: VERT(compact ? 2 : 4),
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  // fwidth needs the derivatives extension on WebGL1; harmless on WebGL2.
  (material as any).extensions = { derivatives: true };

  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;   // lay it flat: local +z becomes world up
  mesh.position.y = -0.55;
  scene.add(mesh);

  // ---- movement boundaries --------------------------------------------
  // Measured from the real sections, so the choreography follows the page
  // rather than hard-coded pixel guesses that break when copy changes.
  let mv: Movements = { m1Start: 0, m1End: 1, pauseStart: 1, pauseEnd: 2, docEnd: 3 };

  const measure = () => {
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const lightRoom = document.querySelector('#privacy')?.parentElement as HTMLElement | null;
    const docEnd = doc.scrollHeight - vh;

    if (!lightRoom) {
      mv = { m1Start: 0, m1End: docEnd, pauseStart: docEnd, pauseEnd: docEnd, docEnd };
      return;
    }
    const roomTop = lightRoom.getBoundingClientRect().top + window.scrollY;
    const roomBottom = roomTop + lightRoom.getBoundingClientRect().height;

    mv = {
      m1Start: 0,
      // Movement one ends as the light room comes into view, not when it is
      // reached — the terrain should already be gone by the time the paper
      // ground arrives.
      m1End: Math.max(1, roomTop - vh * 0.9),
      pauseStart: Math.max(1, roomTop - vh * 0.55),
      pauseEnd: roomBottom,
      docEnd,
    };
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    measure();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(document.documentElement);

  // ---- pointer ---------------------------------------------------------
  const targetMouse = new Vector2(0, 0);
  const onPointer = (e: PointerEvent) => {
    targetMouse.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );
  };
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  // ---- loop ------------------------------------------------------------
  let raf = 0;
  let running = false;
  let last = performance.now();
  let elapsed = 0;
  let shownOpacity = 1;

  /** Places the camera for a given scroll position. */
  const place = (scrollY: number) => {
    // Movement one: travel right along the time axis while settling lower, so
    // the rising surface comes up to meet the camera.
    const p1 = easeInOut(clamp01((scrollY - mv.m1Start) / Math.max(1, mv.m1End - mv.m1Start)));

    // Start where the record already has shape rather than at the dead-flat
    // left end of the plane: the hero must read instantly, and an empty
    // terrain is a weak hook. Travel right and settle lower, so the rising
    // surface comes up to meet the camera as time passes.
    const m = uniforms.uMouse.value as Vector2;
    const x = lerp(-1.0, 1.9, p1) + m.x * 0.13;
    const y = lerp(0.86, 0.52, p1) + m.y * 0.06;
    const z = lerp(2.25, 1.75, p1);

    camera.position.set(x + Math.sin(elapsed * 0.10) * 0.04, y, z);
    camera.lookAt(x + 0.75, lerp(0.34, 0.70, p1), -0.7);

    // The pause: fade the terrain out entirely before the paper ground
    // arrives, and keep it out for the whole light room.
    const fadeOut = clamp01((scrollY - mv.pauseStart) / Math.max(1, mv.m1End - mv.pauseStart + 1));
    const inRoom = scrollY >= mv.pauseStart && scrollY <= mv.pauseEnd;
    const target = inRoom ? 0 : 1 - fadeOut;
    return clamp01(target);
  };

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    uniforms.uTime.value = elapsed;
    if (uniforms.uReveal.value < 1) {
      uniforms.uReveal.value = Math.min(1, uniforms.uReveal.value + dt / 1.6);
    }

    // Damped pointer follow. No springs, no library.
    const m = uniforms.uMouse.value as Vector2;
    m.x += (targetMouse.x - m.x) * Math.min(1, dt * 3.0);
    m.y += (targetMouse.y - m.y) * Math.min(1, dt * 3.0);

    const targetOpacity = place(window.scrollY || window.pageYOffset || 0);
    shownOpacity += (targetOpacity - shownOpacity) * Math.min(1, dt * 6);
    uniforms.uOpacity.value = shownOpacity;

    // Fully faded means the pause: stop drawing rather than render nothing.
    if (shownOpacity < 0.006) {
      canvas.style.visibility = 'hidden';
    } else {
      if (canvas.style.visibility === 'hidden') canvas.style.visibility = '';
      renderer.render(scene, camera);
    }

    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running || reduced) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  if (reduced) {
    uniforms.uReveal.value = 1;
    place(0);
    renderer.render(scene, camera);
  } else {
    start();
  }

  return {
    destroy() {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

/** Thin React wrapper. All the work is imperative, above. */
export default function NetWorthSurface({
  reduced,
  compact,
  onReady,
}: {
  reduced: boolean;
  compact: boolean;
  onReady?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let handle: SurfaceHandle | null = null;
    try {
      handle = mountSurface(ref.current, { reduced, compact });
      onReady?.();
    } catch (err) {
      // A shader compile or context failure must never take the page with it.
      console.error('Net worth surface failed to start:', err);
    }
    return () => handle?.destroy();
  }, [reduced, compact]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full block pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
