// npx tsx --test src/components/landing/canRunSurface.test.ts
//
// Covers the progressive-enhancement contract: anything uncertain declines and
// keeps the 2D hero. The browser harness can't reach the decline path — the
// decision is made ~1s after load, before a test script can intervene — so
// this is where that guarantee is actually verified.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSurfaceSupport, type SurfaceEnv } from './canRunSurface.js';

const healthyGl = {
  MAX_TEXTURE_SIZE: 0x0d33,
  getExtension: (name: string) =>
    name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 1 } : null,
  getParameter: (p: number) => (p === 1 ? 'NVIDIA GeForce RTX 4070' : 16384),
};

function env(over: Partial<SurfaceEnv> = {}, gl: any = healthyGl): SurfaceEnv {
  return {
    matchMedia: () => ({ matches: false }),
    connection: undefined,
    hardwareConcurrency: 8,
    hasWebGL2Ctor: true,
    createCanvas: () => ({ getContext: (id: string) => (id === 'webgl2' ? gl : null) }),
    ...over,
  };
}

test('a healthy WebGL2 machine is allowed', () => {
  const v = evaluateSurfaceSupport(env());
  assert.equal(v.ok, true);
  assert.equal(v.reason, 'webgl2');
});

test('prefers-reduced-motion declines, and outranks everything else', () => {
  const v = evaluateSurfaceSupport(env({ matchMedia: () => ({ matches: true }) }));
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'prefers-reduced-motion');
});

test('no WebGL context at all declines', () => {
  const v = evaluateSurfaceSupport(env({ createCanvas: () => ({ getContext: () => null }) }));
  assert.equal(v.ok, false);
  assert.match(v.reason, /no webgl context/);
});

test('a thrown probe declines rather than propagating', () => {
  const v = evaluateSurfaceSupport(
    env({ createCanvas: () => { throw new Error('context creation blocked'); } })
  );
  assert.equal(v.ok, false);
  assert.match(v.reason, /probe threw/);
});

test('Save-Data declines', () => {
  const v = evaluateSurfaceSupport(env({ connection: { saveData: true } }));
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'save-data');
});

test('2g declines, 4g does not', () => {
  assert.equal(evaluateSurfaceSupport(env({ connection: { effectiveType: '2g' } })).ok, false);
  assert.equal(evaluateSurfaceSupport(env({ connection: { effectiveType: 'slow-2g' } })).ok, false);
  assert.equal(evaluateSurfaceSupport(env({ connection: { effectiveType: '4g' } })).ok, true);
});

test('two cores or fewer declines', () => {
  assert.equal(evaluateSurfaceSupport(env({ hardwareConcurrency: 2 })).ok, false);
  assert.equal(evaluateSurfaceSupport(env({ hardwareConcurrency: 1 })).ok, false);
  assert.equal(evaluateSurfaceSupport(env({ hardwareConcurrency: 4 })).ok, true);
});

test('a software rasteriser declines', () => {
  for (const name of ['SwiftShader', 'llvmpipe', 'Microsoft Basic Render Driver']) {
    const gl = { ...healthyGl, getParameter: (p: number) => (p === 1 ? name : 16384) };
    const v = evaluateSurfaceSupport(env({}, gl), );
    assert.equal(v.ok, false, name + ' should decline');
    assert.match(v.reason, /software renderer/);
  }
});

test('WebGL1 without derivatives declines, with them is allowed', () => {
  const noDeriv = { ...healthyGl, getExtension: () => null };
  assert.equal(evaluateSurfaceSupport(env({ hasWebGL2Ctor: false }, noDeriv)).ok, false);

  const withDeriv = {
    ...healthyGl,
    getExtension: (n: string) => (n === 'OES_standard_derivatives' ? {} : null),
  };
  const v = evaluateSurfaceSupport(env({ hasWebGL2Ctor: false }, withDeriv));
  assert.equal(v.ok, true);
  assert.equal(v.reason, 'webgl1');
});

test('a tiny max texture size declines', () => {
  const weak = { ...healthyGl, getParameter: (p: number) => (p === 1 ? 'Mali-400' : 1024) };
  const v = evaluateSurfaceSupport(env({}, weak));
  assert.equal(v.ok, false);
  assert.match(v.reason, /max texture/);
});
