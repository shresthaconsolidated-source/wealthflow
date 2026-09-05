/**
 * The hero net-worth surface.
 *
 * A terrain whose left-to-right axis is time and whose height is net worth.
 * The trend accelerates rather than rising linearly, so compounding is visible
 * as curvature instead of being asserted in copy. Volatility shrinks as the
 * surface climbs, which is what a real savings curve does.
 *
 * This module is only ever reached through a dynamic import from HeroVisual,
 * so three.js is never in the main bundle and signed-in users never download
 * a byte of it.
 *
 * Cost control:
 *   - One mesh, one ShaderMaterial, one draw call. The grid is drawn in the
 *     fragment shader with fwidth-based anti-aliasing rather than as line
 *     geometry, so resolution costs nothing.
 *   - No textures, no loaders, no post-processing. Nothing is fetched.
 *   - Device pixel ratio is capped, and the segment count drops on small
 *     viewports.
 *   - The render loop stops when the canvas leaves the viewport or the tab is
 *     hidden, so an unread landing page costs no GPU.
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

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uReveal;

  varying float vH;
  varying float vDepth;
  varying vec2  vGrid;

  // Cheap value noise. Deliberately hand-written — a noise library would cost
  // more bytes than the twelve lines it replaces.
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i),               hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vGrid = uv;

    float t = uv.x;                       // left to right is time

    // Compounding: the trend accelerates. This is the whole idea of the piece.
    float trend = pow(t, 1.9) * 1.75;

    // Volatility that narrows as the balance grows.
    float vol = (fbm(vec2(t * 3.6 + uTime * 0.05, uv.y * 2.2)) - 0.5)
              * (0.07 + 0.20 * (1.0 - t));

    float h = trend + vol;

    // The surface forms left to right as it arrives, in step with the figure
    // counting up beside it.
    float rev = smoothstep(t - 0.15, t + 0.03, uReveal);
    h *= rev;

    // A gentle swell toward the pointer. Response, not a gimmick.
    float d = distance(uv, uMouse * 0.5 + 0.5);
    h += 0.055 * exp(-d * d * 7.0) * rev;

    vH = h;

    vec3 p = position;
    p.z += h;                              // plane is XY; mesh is laid flat
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

  varying float vH;
  varying float vDepth;
  varying vec2  vGrid;

  void main() {
    // Grid in the fragment shader, anti-aliased by screen-space derivative.
    // Costs one mesh instead of thousands of line segments.
    vec2 g  = vGrid * uGridDensity;
    vec2 gw = fwidth(g);
    vec2 gr = abs(fract(g - 0.5) - 0.5) / max(gw, vec2(1e-5));
    float line = 1.0 - min(min(gr.x, gr.y), 1.0);

    float lift = smoothstep(0.0, 1.5, vH);

    // Line colour travels from a cool slate at the start of the record to full
    // accent at the top of the climb. Brightness is never tied to height alone
    // — the early years must still be legible, or the left half of the panel
    // renders black on black and the surface looks cropped.
    vec3 lineCol = mix(vec3(0.22, 0.30, 0.34), uAccent, lift);
    float intensity = 0.42 + 1.15 * lift;

    vec3 col = lineCol * line * intensity;

    // A faint wash under the mesh so it reads as a surface, not just a grid.
    col += mix(vec3(0.020, 0.026, 0.030), uAccent * 0.16, lift) * 0.55;

    // Depth fade into the page ground rather than a hard horizon edge.
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);

    float alpha = (line * (0.42 + 0.58 * lift) + 0.05) * fog;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(col * fog, alpha);
  }
`;

export interface SurfaceHandle {
  destroy: () => void;
}

/**
 * Imperative mount. Kept free of React state so nothing re-renders per frame.
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

  // Retina is expensive and buys little on a grid that is already AA'd.
  const maxDpr = compact ? 1.5 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 24);
  camera.position.set(0, 0.95, 2.55);
  camera.lookAt(0, 0.30, -0.35);

  const segX = compact ? 72 : 148;
  const segY = compact ? 40 : 84;
  const geometry = new PlaneGeometry(4.4, 2.6, segX, segY);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0, 0) },
    uReveal: { value: reduced ? 1 : 0 },
    uAccent: { value: new Color('#2ee6a6') },
    uFogNear: { value: 1.6 },
    uFogFar: { value: 4.6 },
    uGridDensity: { value: new Vector2(compact ? 30 : 46, compact ? 16 : 26) },
  };

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  // fwidth needs the derivatives extension on WebGL1; harmless on WebGL2.
  (material as any).extensions = { derivatives: true };

  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;   // lay the plane flat: local +z becomes up
  mesh.position.y = -0.30;
  scene.add(mesh);

  // ---- sizing ----------------------------------------------------------
  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  // ---- pointer ---------------------------------------------------------
  const targetMouse = new Vector2(0, 0);
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    targetMouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -(((e.clientY - r.top) / r.height) * 2 - 1)
    );
  };
  const onLeave = () => targetMouse.set(0, 0);
  if (!reduced) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
  }

  // ---- loop ------------------------------------------------------------
  let raf = 0;
  let running = false;
  let visible = true;
  let last = performance.now();
  let elapsed = 0;

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;

    uniforms.uTime.value = elapsed;
    // The surface forms over ~1.5s, matching the count-up beside it.
    uniforms.uReveal.value = Math.min(1, uniforms.uReveal.value + dt / 1.5);

    // Damped pointer follow — no springs, no library.
    const m = uniforms.uMouse.value as Vector2;
    m.x += (targetMouse.x - m.x) * Math.min(1, dt * 3.2);
    m.y += (targetMouse.y - m.y) * Math.min(1, dt * 3.2);

    // A slow drift so the surface is alive when the pointer is still.
    camera.position.x = Math.sin(elapsed * 0.11) * 0.05 + m.x * 0.10;
    camera.position.y = 0.78 + m.y * 0.05;
    camera.lookAt(0, 0.16, -0.45);

    renderer.render(scene, camera);
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

  // An unread landing page should cost no GPU.
  const io = new IntersectionObserver(
    entries => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && !document.hidden) start(); else stop();
    },
    { threshold: 0.01 }
  );
  io.observe(canvas);

  const onVisibility = () => {
    if (document.hidden) stop();
    else if (visible) start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  if (reduced) {
    // One frame, fully formed, then nothing moves ever again.
    uniforms.uReveal.value = 1;
    renderer.render(scene, camera);
  } else {
    start();
  }

  return {
    destroy() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('pointerleave', onLeave);
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
      className="absolute inset-0 w-full h-full block"
    />
  );
}
