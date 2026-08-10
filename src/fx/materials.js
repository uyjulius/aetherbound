import * as THREE from 'three';
import { hexToRgb, INK } from '../engine/palette.js';

/**
 * Material library.
 *
 * Everything visible in Aetherbound is lit by the same banded toon model with
 * a *coloured* gradient ramp — shadows tinted cool violet, light tinted warm.
 * That single decision does more for cohesion than any texture: two objects
 * with wildly different albedo still read as sharing a world when their
 * shading terminator lands on the same hue.
 */

const gradientCache = new Map();

/**
 * Build a 1D gradient map for MeshToonMaterial.
 * `stops` are [position 0..1, hex] and are held flat (nearest filtering) so the
 * terminator is a crisp painted edge, not a soft photographic falloff.
 */
export function gradientMap(name, stops) {
  if (gradientCache.has(name)) return gradientCache.get(name);
  const width = 64;
  const data = new Uint8Array(width * 4);
  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    let chosen = stops[0][1];
    for (const [pos, hex] of stops) {
      if (t >= pos) chosen = hex;
    }
    const [r, g, b] = hexToRgb(chosen);
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  gradientCache.set(name, tex);
  return tex;
}

/**
 * The house ramps.
 *
 * Two rules govern every one of them:
 *
 *  1. Three samples the ramp at `dotNL * 0.5 + 0.5`, so the *terminator sits at
 *     0.5* and everything below it is surface facing away from the key light.
 *     That whole lower half must stay at the deepest shadow value — putting a
 *     mid-tone below 0.5 is what produces flat, shadowless toon shading.
 *  2. Ramps shift *hue* as they darken rather than only dropping value:
 *     shadows go cool violet-blue, lights go warm cream. Value-only ramps are
 *     the tell-tale of machine art; hue shifting is what painters do.
 */
export const RAMP_TEXTURES = {
  // Three bands: deep cool shadow, mid, warm light. The workhorse.
  standard: () => gradientMap('standard', [
    [0.00, '#20263f'],
    [0.50, '#20263f'],
    [0.545, '#5a5f78'],
    [0.66, '#a49a92'],
    [0.82, '#f2e3c8'],
  ]),
  // Two hard bands — used for characters so they read clearly at any distance.
  character: () => gradientMap('character', [
    [0.00, '#262b47'],
    [0.50, '#262b47'],
    [0.56, '#767a92'],
    [0.72, '#f0e2ca'],
  ]),
  // Four soft bands for organic terrain; avoids hard seams on big planes.
  terrain: () => gradientMap('terrain', [
    [0.00, '#232a44'],
    [0.50, '#232a44'],
    [0.55, '#4d5471'],
    [0.63, '#7d7d8a'],
    [0.73, '#b0a698'],
    [0.86, '#f0e2c6'],
  ]),
  // Interiors: warm lamp light, cool bounce, deep corners.
  interior: () => gradientMap('interior', [
    [0.00, '#1d2440'],
    [0.50, '#1d2440'],
    [0.56, '#5e5c72'],
    [0.68, '#b89474'],
    [0.84, '#ffe2b0'],
  ]),
  // Caves & ruins: low key, heavy shadow mass, narrow lit band.
  cave: () => gradientMap('cave', [
    [0.00, '#161c30'],
    [0.50, '#161c30'],
    [0.60, '#3c4460'],
    [0.76, '#78788a'],
    [0.90, '#b8ab9a'],
  ]),
  // Snow: high key, blue shadows, blown highlight.
  snow: () => gradientMap('snow', [
    [0.00, '#39456e'],
    [0.50, '#39456e'],
    [0.55, '#7c8cb4'],
    [0.66, '#bfcbe0'],
    [0.80, '#fbfdff'],
  ]),
  // Magitek / aether-lit interiors.
  magitek: () => gradientMap('magitek', [
    [0.00, '#14243a'],
    [0.50, '#14243a'],
    [0.56, '#2f5f76'],
    [0.68, '#6a9ea8'],
    [0.84, '#d6f2f0'],
  ]),
  // Night exteriors, moonlit — compressed range, never fully black.
  night: () => gradientMap('night', [
    [0.00, '#161c35'],
    [0.50, '#161c35'],
    [0.58, '#2e3760'],
    [0.72, '#525d8c'],
    [0.88, '#8e9bc4'],
  ]),
};

/**
 * Rim lighting + a very slight fresnel desaturation, patched into any toon
 * material. Rim light is the cheapest possible readability win: it separates a
 * character silhouette from a busy background without an outline sticker.
 */
function patchRim(material, { color = '#9fc7e8', power = 2.6, strength = 0.45 } = {}) {
  const rim = new THREE.Color(color);
  material.userData.rim = { color: { value: rim }, power: { value: power }, strength: { value: strength } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = material.userData.rim.color;
    shader.uniforms.uRimPower = material.userData.rim.power;
    shader.uniforms.uRimStrength = material.userData.rim.strength;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uRimColor;
        uniform float uRimPower;
        uniform float uRimStrength;`)
      .replace('#include <dithering_fragment>', `
        {
          vec3 vN = normalize(normal);
          vec3 vV = normalize(vViewPosition);
          float rim = pow(clamp(1.0 - dot(vN, vV), 0.0, 1.0), uRimPower);
          gl_FragColor.rgb += uRimColor * rim * uRimStrength;
        }
        #include <dithering_fragment>`);
  };
  material.customProgramCacheKey = () => `rim:${color}:${power}:${strength}`;
  return material;
}

/**
 * Standard world surface. `ramp` picks the lighting mood, `map` is the
 * palette-quantised texture plate.
 */
export function toonMaterial({
  color = '#ffffff',
  map = null,
  ramp = 'standard',
  rim = null,
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide,
  vertexColors = false,
  alphaTest = 0,
  emissive = null,
  emissiveIntensity = 1,
  fog = true,
  name = '',
} = {}) {
  const mat = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    map,
    gradientMap: (RAMP_TEXTURES[ramp] || RAMP_TEXTURES.standard)(),
    transparent,
    opacity,
    side,
    vertexColors,
    alphaTest,
    fog,
    name,
  });
  if (emissive) {
    mat.emissive = new THREE.Color(emissive);
    mat.emissiveIntensity = emissiveIntensity;
  }
  // Rim light is opt-in. Applied to architecture it paints a hard white line
  // along every grazing edge, which reads as a rendering artefact rather than
  // lighting. It belongs on characters and props that need to pop.
  if (rim) patchRim(mat, rim === true ? undefined : rim);
  return mat;
}

// ---------------------------------------------------------------------------
// Foliage — vertex-animated wind. Static trees are the fastest way to make a
// 3D world feel dead, and cheap wind is the fastest way to fix it.
// ---------------------------------------------------------------------------

export function foliageMaterial({ map = null, color = '#ffffff', ramp = 'standard', stiffness = 0.35, amplitude = 0.12 } = {}) {
  const mat = toonMaterial({ map, color, ramp, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide });
  mat.userData.wind = { time: { value: 0 }, amplitude: { value: amplitude }, stiffness: { value: stiffness } };
  const prevPatch = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    prevPatch?.(shader);
    shader.uniforms.uWindTime = mat.userData.wind.time;
    shader.uniforms.uWindAmp = mat.userData.wind.amplitude;
    shader.uniforms.uWindStiff = mat.userData.wind.stiffness;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uWindTime;
        uniform float uWindAmp;
        uniform float uWindStiff;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          // Sway increases with height above the instance origin, so trunks
          // stay planted while canopies move. Two frequencies keeps it from
          // looking like a metronome.
          vec4 wp = modelMatrix * vec4(transformed, 1.0);
          float h = max(0.0, position.y) * uWindStiff;
          float phase = wp.x * 0.35 + wp.z * 0.28;
          float sway = sin(uWindTime * 1.35 + phase) * 0.7
                     + sin(uWindTime * 2.7 + phase * 1.9) * 0.3;
          transformed.x += sway * h * uWindAmp;
          transformed.z += cos(uWindTime * 1.1 + phase * 0.8) * h * uWindAmp * 0.6;
        }`);
  };
  mat.customProgramCacheKey = () => `foliage:${stiffness}:${amplitude}`;
  return mat;
}

/** Registry so a single global tick can advance every wind material. */
export const windMaterials = new Set();
export function registerWind(mat) { windMaterials.add(mat); return mat; }
export function tickWind(time) {
  for (const m of windMaterials) if (m.userData.wind) m.userData.wind.time.value = time;
}

// ---------------------------------------------------------------------------
// Water — stylised, two-tone, with a scrolling foam band at the shoreline.
// ---------------------------------------------------------------------------

const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveScale;
varying vec2 vUvW;
varying vec3 vWorld;
varying float vWave;
void main() {
  vUvW = uv;
  vec3 pos = position;
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  float w = sin(wp.x * uWaveScale + uTime * 1.1) * 0.6
          + sin(wp.z * uWaveScale * 1.31 - uTime * 0.8) * 0.4
          + sin((wp.x + wp.z) * uWaveScale * 0.53 + uTime * 1.7) * 0.25;
  pos.y += w * uWaveHeight;
  vWave = w;
  vWorld = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
uniform vec3 uSpecular;
uniform float uOpacity;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUvW;
varying vec3 vWorld;
varying float vWave;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  // Two scrolling noise fields make the classic hand-drawn "sparkle" bands.
  float n1 = noise(vWorld.xz * 0.30 + vec2(uTime * 0.10, uTime * 0.06));
  float n2 = noise(vWorld.xz * 0.71 - vec2(uTime * 0.14, uTime * 0.09));
  float bands = n1 * 0.62 + n2 * 0.38;

  vec3 col = mix(uDeep, uShallow, smoothstep(0.35, 0.72, bands + vWave * 0.18));

  // Crisp stepped highlights rather than a smooth specular lobe.
  float sparkle = step(0.86, bands + vWave * 0.10);
  col = mix(col, uSpecular, sparkle * 0.75);

  float foam = smoothstep(0.80, 0.94, n2 + vWave * 0.25);
  col = mix(col, uFoam, foam * 0.35);

  float depthDist = length(vWorld - cameraPosition);
  float fogAmt = smoothstep(uFogNear, uFogFar, depthDist);
  col = mix(col, uFogColor, fogAmt);

  gl_FragColor = vec4(col, uOpacity);
}
`;

export function waterMaterial({
  shallow = '#357c8c', deep = '#12262f', foam = '#9ccdd4', specular = '#cfeef2',
  opacity = 0.92, waveHeight = 0.09, waveScale = 0.42,
} = {}) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: opacity < 1,
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(shallow) },
      uDeep: { value: new THREE.Color(deep) },
      uFoam: { value: new THREE.Color(foam) },
      uSpecular: { value: new THREE.Color(specular) },
      uOpacity: { value: opacity },
      uWaveHeight: { value: waveHeight },
      uWaveScale: { value: waveScale },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3) },
      uFogColor: { value: new THREE.Color('#b9c6cf') },
      uFogNear: { value: 60 },
      uFogFar: { value: 260 },
    },
  });
  mat.userData.isWater = true;
  return mat;
}

export const waterMaterials = new Set();
export function tickWater(time, fog) {
  for (const m of waterMaterials) {
    m.uniforms.uTime.value = time;
    if (fog) {
      m.uniforms.uFogColor.value.copy(fog.color);
      m.uniforms.uFogNear.value = fog.near ?? 60;
      m.uniforms.uFogFar.value = fog.far ?? 260;
    }
  }
}

// ---------------------------------------------------------------------------
// Sky — a painted gradient dome with a horizon haze band and drifting clouds.
// ---------------------------------------------------------------------------

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // pin to the far plane
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSunSize;
uniform float uCloud;
uniform float uTime;
uniform float uStars;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  // Painted vertical gradient: the horizon band is wider and warmer than a
  // physical sky, which is what makes illustration read as illustration.
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.48));
  col = mix(uGround, col, smoothstep(-0.16, 0.02, h));

  // Sun / moon disc with a soft halo.
  float sd = max(0.0, dot(d, normalize(uSunDir)));
  col += uSunColor * pow(sd, 900.0 / max(uSunSize, 0.01)) * 1.4;
  col += uSunColor * pow(sd, 14.0) * 0.13;

  if (uStars > 0.001 && h > 0.0) {
    vec2 sp = d.xz / max(0.15, d.y + 0.2) * 14.0;
    float s = hash(floor(sp * 8.0));
    float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + s * 40.0);
    col += vec3(0.85, 0.9, 1.0) * step(0.9955, hash(floor(sp * 40.0))) * twinkle * uStars * smoothstep(0.0, 0.35, h);
  }

  if (uCloud > 0.001 && h > 0.0) {
    // Project onto a virtual cloud plane. Clamping the divisor stops the
    // pattern stretching into an infinite smear at the horizon.
    vec2 cp = d.xz / max(0.22, h + 0.10) * 0.8;
    vec2 drift = vec2(uTime * 0.0075, uTime * 0.0045);

    // Domain warp — the difference between "noise" and "clouds".
    vec2 warp = vec2(fbm(cp * 0.6 + drift), fbm(cp * 0.6 + drift + 5.2)) - 0.5;
    float shape = fbm(cp * 1.05 + warp * 1.4 + drift);

    // Coverage is the knob that decides overcast vs. scattered. Kept low so
    // the sky stays mostly open — a full-frame cloud veil reads as haze and
    // flattens the whole frame to grey.
    float coverage = 0.545;
    float body = smoothstep(coverage, coverage + 0.14, shape);

    // Sample slightly "above" the shape to find the sunward face: lit tops,
    // shadowed undersides. This is what gives painted clouds their volume.
    float above = fbm(cp * 1.05 + warp * 1.4 + drift + vec2(0.0, -0.10));
    float lit = smoothstep(0.0, 0.10, above - shape);

    vec3 cloudShadow = mix(vec3(0.20, 0.21, 0.27), uZenith * 1.35, 0.45);
    vec3 cloudBody   = vec3(0.42, 0.44, 0.50);
    vec3 cloudLit    = mix(vec3(0.72, 0.71, 0.70), uSunColor, 0.45);

    vec3 cloudCol = mix(cloudShadow, cloudBody, smoothstep(0.0, 0.5, lit));
    cloudCol = mix(cloudCol, cloudLit, smoothstep(0.45, 1.0, lit));
    // Clouds near the sun catch a warm edge.
    cloudCol += uSunColor * pow(sd, 8.0) * 0.35 * body;

    // Fade out at the horizon (atmosphere) and thin at the zenith (overhead
    // clouds are seen edge-on, so they cover less).
    float band = smoothstep(0.02, 0.20, h) * (1.0 - smoothstep(0.55, 1.0, h) * 0.45);
    col = mix(col, cloudCol, body * uCloud * band);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export function skyMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(opts.zenith ?? '#3f6f9e') },
      uHorizon: { value: new THREE.Color(opts.horizon ?? '#cfd3c8') },
      uGround: { value: new THREE.Color(opts.ground ?? '#6d6a5f') },
      uSunColor: { value: new THREE.Color(opts.sunColor ?? '#ffe6b8') },
      uSunDir: { value: new THREE.Vector3(...(opts.sunDir ?? [0.5, 0.6, 0.4])) },
      uSunSize: { value: opts.sunSize ?? 1.0 },
      uCloud: { value: opts.cloud ?? 0.6 },
      uStars: { value: opts.stars ?? 0.0 },
      uTime: { value: 0 },
    },
  });
}

// ---------------------------------------------------------------------------
// Aether / magic surfaces — additive, unlit, scrolling.
// ---------------------------------------------------------------------------

export function aetherMaterial({ color = '#3fc6d6', intensity = 1.6, scroll = [0, -0.25], map = null, opacity = 1 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uScroll: { value: new THREE.Vector2(...scroll) },
      uTime: { value: 0 },
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUvA;
      void main() {
        vUvA = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; uniform vec2 uScroll;
      uniform float uTime; uniform sampler2D uMap; uniform float uHasMap; uniform float uOpacity;
      varying vec2 vUvA;
      void main() {
        vec2 uv = vUvA + uScroll * uTime;
        float a = 1.0;
        if (uHasMap > 0.5) a = texture2D(uMap, uv).a;
        // Soft edge falloff so quads never show their corners.
        float edge = smoothstep(0.0, 0.18, vUvA.x) * smoothstep(1.0, 0.82, vUvA.x)
                   * smoothstep(0.0, 0.18, vUvA.y) * smoothstep(1.0, 0.82, vUvA.y);
        gl_FragColor = vec4(uColor * uIntensity, a * edge * uOpacity);
      }
    `,
  });
  mat.userData.isAether = true;
  return mat;
}

export const aetherMaterials = new Set();
export function tickAether(time) {
  for (const m of aetherMaterials) m.uniforms.uTime.value = time;
}

// ---------------------------------------------------------------------------
// Inverted-hull outline for hero characters, on top of the screen-space line.
// Characters get a slightly heavier contour than the world — same trick comic
// artists use to push a figure forward.
// ---------------------------------------------------------------------------

export function outlineMaterial(thickness = 0.02, color = INK) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uThickness: { value: thickness },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      uniform float uThickness;
      void main() {
        // Expand along the normal in view space so thickness is constant on
        // screen regardless of how far away the character is.
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        mv.xyz += n * uThickness * (-mv.z) * 0.06;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }
    `,
  });
}
