import * as THREE from 'three';
import { over, wait, EASE } from '../engine/scheduler.js';
import {
  magicCircle, shockwave, lightPillar, slashArc, lightningBolt, disposeEffect,
} from './particles.js';
import { ELEMENT_COLOR } from '../engine/palette.js';

/**
 * Spell effects.
 *
 * Each element gets a *distinct silhouette of motion*, not just a recoloured
 * puff — fire rises and billows, ice converges then shatters outward, lightning
 * strikes downward in one frame, earth erupts from below. In a turn-based game
 * the player watches these thousands of times, so the read has to be instant
 * and the shape has to carry the information.
 *
 * Every effect is a coroutine, so the battle script can wait for the visual to
 * land before applying damage — the hit should look like it caused the number.
 */

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Shared: spin and fade a magic circle in, then out. */
function* circleIn(ctx, pos, color, seconds = 0.5, radius = 1.7) {
  const circle = magicCircle(ctx.scene, pos, { color, radius });
  const mats = [];
  circle.traverse((o) => { if (o.isMesh) mats.push(o.material); });
  for (const m of mats) m.opacity = 0;
  yield* over(seconds, (t) => {
    circle.rotation.z += 0.05;
    circle.scale.setScalar(radius * (0.5 + t * 0.5));
    for (const m of mats) m.opacity = t * 0.9;
  }, EASE.quadOut);
  return { circle, mats };
}

function* circleOut(handle, seconds = 0.3) {
  if (!handle) return;
  yield* over(seconds, (t) => {
    handle.circle.rotation.z += 0.08;
    for (const m of handle.mats) m.opacity = (1 - t) * 0.9;
  });
  disposeEffect(handle.circle);
}

/** Shared: an expanding, fading ground ring. */
function* wave(ctx, pos, color, { seconds = 0.45, scale = 6 } = {}) {
  const ring = shockwave(ctx.scene, pos, { color });
  yield* over(seconds, (t) => {
    ring.scale.setScalar(0.2 + t * scale);
    // Fade faster than it expands, so the wave thins out as it travels.
    ring.material.opacity = 0.85 * Math.pow(1 - t, 1.6);
  }, EASE.quadOut);
  disposeEffect(ring);
}

// ---------------------------------------------------------------------------
// Per-element casts
// ---------------------------------------------------------------------------

export const SPELL_FX = {
  *fire(ctx, pos) {
    const { particles } = ctx;
    const handle = yield* circleIn(ctx, pos, '#ff7a2f', 0.28, 1.5);
    particles.implode(pos, { count: 34, radius: 2.6, life: 0.4, color: '#ffd76a', endColor: '#ff7a2f', size: 0.5 });
    yield wait(0.30);
    // Detonation: hot core, billowing outward, embers rising and cooling.
    particles.burst(pos, { count: 70, speed: 7, life: 0.75, size: 0.85, color: '#fff3b8', endColor: '#a8410e', gravity: 1.2, drag: 1.6, up: 1.5 });
    particles.column(pos, { count: 44, radius: 0.8, speed: 6.5, life: 1.0, size: 0.7, color: '#ff7a2f', endColor: '#3d1206', turbulence: 2.2 });
    ctx.shake?.(0.45);
    yield* wave(ctx, pos, '#ff7a2f', { seconds: 0.4, scale: 5 });
    yield* circleOut(handle, 0.2);
  },

  *ice(ctx, pos) {
    const { particles } = ctx;
    const handle = yield* circleIn(ctx, pos, '#7fdcf0', 0.30, 1.5);
    // Shards gather, hang, then shatter outward — the pause is the whole effect.
    particles.implode(pos, { count: 52, radius: 3.4, life: 0.5, color: '#e8edf5', endColor: '#7fdcf0', size: 0.45 });
    yield wait(0.52);
    particles.burst(pos, { count: 64, speed: 9, life: 0.55, size: 0.5, color: '#ffffff', endColor: '#4d8493', gravity: -3.5, drag: 2.4 });
    ctx.shake?.(0.35);
    yield* wave(ctx, pos, '#9ccdd4', { seconds: 0.35, scale: 4 });
    yield* circleOut(handle, 0.18);
  },

  *bolt(ctx, pos) {
    const { particles } = ctx;
    // No wind-up: lightning's character is that it has already happened.
    ctx.flash?.('#ffe45e', 0.55);
    const sky = V(pos.x + (Math.random() - 0.5) * 1.2, pos.y + 14, pos.z + (Math.random() - 0.5) * 1.2);
    const bolt = lightningBolt(ctx.scene, sky, pos, { color: '#ffffff' });
    const bolt2 = lightningBolt(ctx.scene, sky, pos, { color: '#ffe45e', jitter: 1.1 });
    particles.burst(pos, { count: 46, speed: 8, life: 0.4, size: 0.5, color: '#ffffff', endColor: '#ffe45e', gravity: -1, drag: 2.6 });
    ctx.shake?.(0.6);
    yield* over(0.16, (t) => {
      bolt.traverse((o) => { if (o.isMesh) o.material.opacity = 1 - t; });
      bolt2.traverse((o) => { if (o.isMesh) o.material.opacity = (1 - t) * 0.8; });
    });
    disposeEffect(bolt);
    disposeEffect(bolt2);
    yield* wave(ctx, pos, '#ffe45e', { seconds: 0.3, scale: 4.5 });
  },

  *water(ctx, pos) {
    const { particles } = ctx;
    const handle = yield* circleIn(ctx, pos, '#3ea8d6', 0.26, 1.6);
    particles.column(pos, { count: 60, radius: 0.55, speed: 9, life: 0.85, size: 0.65, color: '#9ccdd4', endColor: '#1a3c48', turbulence: 0.6 });
    yield wait(0.30);
    particles.ring(pos, { count: 46, radius: 0.5, speed: 7, life: 0.6, size: 0.5, color: '#57a6b1', endColor: '#12262f', up: 2.2, gravity: -6 });
    ctx.shake?.(0.3);
    yield* wave(ctx, pos, '#3ea8d6', { seconds: 0.42, scale: 5 });
    yield* circleOut(handle, 0.2);
  },

  *wind(ctx, pos) {
    const { particles } = ctx;
    // A vortex: successive rings launched upward at a rising radius.
    for (let i = 0; i < 4; i++) {
      particles.ring(pos, {
        count: 26, radius: 0.4 + i * 0.35, speed: 3.5 + i,
        life: 0.55, size: 0.4, color: '#9fe3a8', endColor: '#5f815c',
        up: 5 + i * 1.5, gravity: 0.6, drag: 0.9,
      });
      yield wait(0.07);
    }
    particles.burst(pos, { count: 34, speed: 6, life: 0.5, size: 0.42, color: '#e8f0ff', endColor: '#9fe3a8', gravity: 0.4, drag: 1.0, turbulence: 3 });
    ctx.shake?.(0.25);
    yield* wave(ctx, pos, '#9fe3a8', { seconds: 0.35, scale: 5.5 });
  },

  *earth(ctx, pos) {
    const { particles } = ctx;
    ctx.shake?.(0.8, 2.2);
    // Erupts from below: heavy, high-gravity debris with no wind-up.
    particles.burst(pos, { count: 60, speed: 6, life: 0.9, size: 0.75, color: '#c08a4a', endColor: '#2a1f19', gravity: -14, drag: 0.5, up: 7, spread: 0.5 });
    particles.ring(pos, { count: 40, radius: 0.3, speed: 8, life: 0.5, size: 0.6, color: '#93785d', endColor: '#2a1f19', up: 1.5, gravity: -9 });
    yield* wave(ctx, pos, '#c08a4a', { seconds: 0.5, scale: 6.5 });
  },

  *poison(ctx, pos) {
    const { particles } = ctx;
    const handle = yield* circleIn(ctx, pos, '#94bf55', 0.24, 1.4);
    // Slow, buoyant, lingering — poison should feel unhurried.
    for (let i = 0; i < 3; i++) {
      particles.column(pos, { count: 26, radius: 0.9, speed: 2.2, life: 1.4, size: 0.75, color: '#94bf55', endColor: '#1b2d12', turbulence: 1.6, drag: 0.9 });
      yield wait(0.13);
    }
    yield* circleOut(handle, 0.3);
  },

  *holy(ctx, pos) {
    const { particles } = ctx;
    const handle = yield* circleIn(ctx, pos, '#fff3b8', 0.34, 2.0);
    const pillar = lightPillar(ctx.scene, V(pos.x, pos.y - 0.5, pos.z), { color: '#fff3b8', radius: 0.2, height: 12 });
    ctx.flash?.('#fff3b8', 0.4);
    // The pillar widens as it lands, then motes drift up out of it.
    yield* over(0.35, (t) => {
      pillar.scale.set(0.2 + t * 1.5, 12, 0.2 + t * 1.5);
      pillar.material.opacity = 0.85 * (t < 0.5 ? t * 2 : 1);
    }, EASE.quadOut);
    particles.column(pos, { count: 54, radius: 1.0, speed: 4.5, life: 1.2, size: 0.55, color: '#ffffff', endColor: '#ab9f52', turbulence: 0.8, drag: 0.8 });
    particles.ring(pos, { count: 40, radius: 0.6, speed: 5, life: 0.7, size: 0.5, color: '#fff3b8', endColor: '#7a6f37', up: 1.2 });
    yield* over(0.4, (t) => { pillar.material.opacity = 0.85 * (1 - t); });
    disposeEffect(pillar);
    yield* circleOut(handle, 0.22);
  },

  *shadow(ctx, pos) {
    const { particles } = ctx;
    const handle = yield* circleIn(ctx, pos, '#8a5ce0', 0.34, 1.8);
    // Collapses inward and *stays* dark — the inverse of a fire burst.
    particles.implode(pos, { count: 64, radius: 4.2, life: 0.62, color: '#8a5ce0', endColor: '#0f0a1c', size: 0.6 });
    yield wait(0.62);
    ctx.flash?.('#2c1b4d', 0.45);
    particles.burst(pos, { count: 50, speed: 5.5, life: 0.85, size: 0.7, color: '#5c3f95', endColor: '#0f0a1c', gravity: 0.8, drag: 1.1, turbulence: 1.8 });
    ctx.shake?.(0.5);
    yield* wave(ctx, pos, '#8a5ce0', { seconds: 0.45, scale: 5 });
    yield* circleOut(handle, 0.25);
  },

  *aether(ctx, pos) {
    const { particles } = ctx;
    const handle = yield* circleIn(ctx, pos, '#3fc6d6', 0.32, 2.1);
    particles.implode(pos, { count: 46, radius: 3.0, life: 0.45, color: '#96f0f5', endColor: '#3fc6d6', size: 0.5 });
    yield wait(0.44);
    ctx.flash?.('#3fc6d6', 0.5);
    const pillar = lightPillar(ctx.scene, V(pos.x, pos.y - 0.5, pos.z), { color: '#3fc6d6', radius: 1.0, height: 10 });
    particles.burst(pos, { count: 62, speed: 7.5, life: 0.8, size: 0.6, color: '#96f0f5', endColor: '#12566b', gravity: 0.5, drag: 1.4, turbulence: 1.2 });
    ctx.shake?.(0.55);
    yield* over(0.45, (t) => {
      pillar.scale.set(1.0 * (1 - t * 0.6), 10, 1.0 * (1 - t * 0.6));
      pillar.material.opacity = 0.8 * (1 - t);
    });
    disposeEffect(pillar);
    yield* circleOut(handle, 0.22);
  },

  *heal(ctx, pos) {
    const { particles } = ctx;
    // Rises rather than bursts — the only effect in the set that goes *up*
    // gently, which is what makes it read as restoration at a glance.
    particles.ring(pos, { count: 36, radius: 1.1, speed: -1.6, life: 1.0, size: 0.45, color: '#8ce07a', endColor: '#ffffff', up: 3.2, gravity: 0.6, drag: 0.5 });
    particles.column(pos, { count: 40, radius: 0.7, speed: 3.4, life: 1.1, size: 0.5, color: '#ffffff', endColor: '#6fd08c', turbulence: 0.5, drag: 0.7 });
    yield* wave(ctx, pos, '#8ce07a', { seconds: 0.5, scale: 3 });
  },

  *physical(ctx, pos) {
    const { particles } = ctx;
    const arc = slashArc(ctx.scene, V(pos.x, pos.y, pos.z), { color: '#ffffff', radius: 1.4 });
    arc.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
    yield* over(0.18, (t) => {
      arc.rotation.z += 0.22;
      arc.scale.setScalar(1.4 + t * 1.1);
      arc.material.opacity = 1 - t;
    });
    disposeEffect(arc);
    particles.burst(pos, { count: 22, speed: 6, life: 0.32, size: 0.32, color: '#ffffff', endColor: '#d8d3c6', gravity: -6, drag: 2 });
  },
};

/**
 * Play the effect for an element at a world position.
 * Falls back to a generic burst for anything unmapped, so a new spell never
 * silently plays nothing.
 */
export function* playSpellFX(ctx, element, pos) {
  const fn = SPELL_FX[element] || SPELL_FX[element === null ? 'aether' : 'physical'];
  if (fn) { yield* fn(ctx, pos); return; }
  const colour = ELEMENT_COLOR[element] || '#ffffff';
  ctx.particles.burst(pos, { count: 40, speed: 6, life: 0.6, size: 0.5, color: colour });
  yield wait(0.3);
}
