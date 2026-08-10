import * as THREE from 'three';

/**
 * The post chain that gives Aetherbound its look.
 *
 * Passes, in order:
 *   1. Scene → HDR half-float target (+ depth texture)
 *   2. Bright-pass → down/upsample bloom pyramid
 *   3. Two-tap half-res blur buffer for depth-of-field
 *   4. Composite: ink outline, tilt-shift DOF, bloom, tonemap + grade,
 *      vignette, chromatic aberration, animated paper grain, screen flash
 *
 * Deliberate choices that keep it from reading as generic 3D:
 *   - The ink outline is depth+normal based and *varies in weight* with
 *     distance, so it behaves like a drawn line rather than a uniform sticker.
 *   - Grain is stepped at 24fps, not per-frame. Per-frame noise shimmers and
 *     looks cheap; 24fps reads as film.
 *   - Split-toning is applied as a zero-mean *multiply* after tonemapping, so
 *     it shifts hue without lifting blacks into grey. Additive split-tone is
 *     the classic way to end up with a washed-out image.
 *   - The tonemap is an extended Reinhard with a high white point: mids stay
 *     essentially linear so flat painted colour stays flat, and only real
 *     highlights roll off. ACES would desaturate the stylised palette.
 */

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const COMMON = /* glsl */ `
vec3 linearToSRGB(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

// --- simple copy -----------------------------------------------------------
const COPY_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tDiffuse, vUv); }
`;

// --- bright pass -----------------------------------------------------------
const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uSoftKnee;
varying vec2 vUv;
${COMMON}
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float br = max(max(c.r, c.g), c.b);
  // Soft knee so bloom ramps in instead of popping at the threshold.
  float knee = uThreshold * uSoftKnee + 1e-5;
  float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-5);
  float contribution = max(soft, br - uThreshold) / max(br, 1e-5);
  gl_FragColor = vec4(c * contribution, 1.0);
}
`;

// --- 13-tap downsample (Call of Duty / Unreal style, no fireflies) ---------
const DOWN_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec2 t = uTexel;
  vec3 a = texture2D(tDiffuse, vUv + vec2(-2.0, 2.0) * t).rgb;
  vec3 b = texture2D(tDiffuse, vUv + vec2( 0.0, 2.0) * t).rgb;
  vec3 c = texture2D(tDiffuse, vUv + vec2( 2.0, 2.0) * t).rgb;
  vec3 d = texture2D(tDiffuse, vUv + vec2(-2.0, 0.0) * t).rgb;
  vec3 e = texture2D(tDiffuse, vUv).rgb;
  vec3 f = texture2D(tDiffuse, vUv + vec2( 2.0, 0.0) * t).rgb;
  vec3 g = texture2D(tDiffuse, vUv + vec2(-2.0,-2.0) * t).rgb;
  vec3 h = texture2D(tDiffuse, vUv + vec2( 0.0,-2.0) * t).rgb;
  vec3 i = texture2D(tDiffuse, vUv + vec2( 2.0,-2.0) * t).rgb;
  vec3 j = texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * t).rgb;
  vec3 k = texture2D(tDiffuse, vUv + vec2( 1.0, 1.0) * t).rgb;
  vec3 l = texture2D(tDiffuse, vUv + vec2(-1.0,-1.0) * t).rgb;
  vec3 m = texture2D(tDiffuse, vUv + vec2( 1.0,-1.0) * t).rgb;
  vec3 sum = e * 0.125;
  sum += (a + c + g + i) * 0.03125;
  sum += (b + d + f + h) * 0.0625;
  sum += (j + k + l + m) * 0.125;
  gl_FragColor = vec4(sum, 1.0);
}
`;

// --- tent upsample + combine with the matching mip -------------------------
const UP_FRAG = /* glsl */ `
uniform sampler2D tLower;   // smaller mip being upsampled
uniform sampler2D tSame;    // same-resolution mip to add into
uniform vec2 uTexel;        // texel size of tLower
uniform float uScatter;
varying vec2 vUv;
void main() {
  vec2 t = uTexel;
  vec3 sum = texture2D(tLower, vUv + vec2(-1.0,  1.0) * t).rgb * 1.0;
  sum += texture2D(tLower, vUv + vec2( 0.0,  1.0) * t).rgb * 2.0;
  sum += texture2D(tLower, vUv + vec2( 1.0,  1.0) * t).rgb * 1.0;
  sum += texture2D(tLower, vUv + vec2(-1.0,  0.0) * t).rgb * 2.0;
  sum += texture2D(tLower, vUv).rgb * 4.0;
  sum += texture2D(tLower, vUv + vec2( 1.0,  0.0) * t).rgb * 2.0;
  sum += texture2D(tLower, vUv + vec2(-1.0, -1.0) * t).rgb * 1.0;
  sum += texture2D(tLower, vUv + vec2( 0.0, -1.0) * t).rgb * 2.0;
  sum += texture2D(tLower, vUv + vec2( 1.0, -1.0) * t).rgb * 1.0;
  sum /= 16.0;
  gl_FragColor = vec4(texture2D(tSame, vUv).rgb + sum * uScatter, 1.0);
}
`;

// --- separable-ish wide blur for depth of field ---------------------------
const DOF_BLUR_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uDir;          // texel-scaled direction
varying vec2 vUv;
void main() {
  // 9-tap gaussian.
  vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
  sum += texture2D(tDiffuse, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(tDiffuse, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(tDiffuse, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  sum += texture2D(tDiffuse, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(sum, 1.0);
}
`;

// --- composite -------------------------------------------------------------
const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform sampler2D tBlur;
uniform sampler2D tDepth;

uniform vec2  uResolution;
uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform mat4  uProjInverse;

uniform float uBloomStrength;
uniform vec3  uBloomTint;

uniform float uOutlineStrength;
uniform float uOutlineDepthBias;
uniform float uOutlineNormalBias;
uniform vec3  uOutlineColor;
uniform float uOutlineWidth;

uniform float uDofStrength;
uniform float uTiltStrength;
uniform float uTiltCenter;
uniform float uTiltWidth;
uniform float uFocusDistance;
uniform float uFocusRange;

uniform float uVignette;
uniform float uGrain;
uniform float uAberration;
uniform float uSaturation;
uniform float uContrast;
uniform float uExposure;
uniform float uLift;
uniform vec3  uShadowTint;
uniform vec3  uHighlightTint;
uniform vec3  uColorFilter;
uniform float uRadialBlur;
uniform vec4  uFlash;
uniform float uDesaturateAll;
uniform float uWhitePoint;
uniform int   uDebug;

varying vec2 vUv;
${COMMON}

float rawDepthAt(vec2 uv) { return texture2D(tDepth, uv).x; }

float linearDepth(float raw) {
  float z = raw * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}

vec3 viewPos(vec2 uv, float raw) {
  vec4 clip = vec4(uv * 2.0 - 1.0, raw * 2.0 - 1.0, 1.0);
  vec4 view = uProjInverse * clip;
  return view.xyz / view.w;
}

/**
 * Roberts-cross style edge on both linear depth and reconstructed normal.
 * Depth threshold scales with distance — without that, distant geometry
 * outlines everything and near geometry outlines nothing.
 */
float inkEdge(vec2 uv, vec2 texel, float centreDepth, out vec3 nrm) {
  float w = uOutlineWidth;
  vec2 o = texel * w;

  float rC = rawDepthAt(uv);
  vec3 pC = viewPos(uv, rC);
  vec3 pR = viewPos(uv + vec2(texel.x, 0.0), rawDepthAt(uv + vec2(texel.x, 0.0)));
  vec3 pU = viewPos(uv + vec2(0.0, texel.y), rawDepthAt(uv + vec2(0.0, texel.y)));
  nrm = normalize(cross(pR - pC, pU - pC));

  float d0 = linearDepth(rawDepthAt(uv + vec2(-o.x, -o.y)));
  float d1 = linearDepth(rawDepthAt(uv + vec2( o.x,  o.y)));
  float d2 = linearDepth(rawDepthAt(uv + vec2(-o.x,  o.y)));
  float d3 = linearDepth(rawDepthAt(uv + vec2( o.x, -o.y)));

  // A silhouette is where a neighbour is *behind* us by more than a
  // distance-scaled slack. Comparing to the minimum keeps the line on the
  // near surface, which is where an artist would ink it.
  float nearest = min(min(d0, d1), min(d2, d3));
  float farthest = max(max(d0, d1), max(d2, d3));
  float slack = uOutlineDepthBias * (0.6 + centreDepth * 0.09);
  float depthEdge = smoothstep(slack, slack * 2.6, farthest - nearest);

  vec3 n0 = normalize(cross(
    viewPos(uv + vec2(o.x, 0.0), rawDepthAt(uv + vec2(o.x, 0.0))) - pC,
    viewPos(uv + vec2(0.0, o.y), rawDepthAt(uv + vec2(0.0, o.y))) - pC));
  vec3 n1 = normalize(cross(
    viewPos(uv - vec2(o.x, 0.0), rawDepthAt(uv - vec2(o.x, 0.0))) - pC,
    viewPos(uv - vec2(0.0, o.y), rawDepthAt(uv - vec2(0.0, o.y))) - pC));
  float creaseAmount = (1.0 - max(0.0, dot(nrm, n0))) + (1.0 - max(0.0, dot(nrm, n1)));
  float normalEdge = smoothstep(uOutlineNormalBias, uOutlineNormalBias * 3.0, creaseAmount);

  return clamp(max(depthEdge, normalEdge * 0.75), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec2 texel = 1.0 / uResolution;
  vec2 centered = uv - 0.5;

  float raw = rawDepthAt(uv);
  float depth = linearDepth(raw);
  bool isSky = raw >= 0.9999;

  // --- circle of confusion -------------------------------------------------
  float dofCoc = clamp(abs(depth - uFocusDistance) / max(uFocusRange, 0.001), 0.0, 1.0);
  dofCoc = dofCoc * dofCoc;
  float tiltCoc = clamp((abs(uv.y - uTiltCenter) - uTiltWidth) / max(1e-4, 0.55 - uTiltWidth), 0.0, 1.0);
  tiltCoc = tiltCoc * tiltCoc;
  float coc = clamp(max(dofCoc * uDofStrength, tiltCoc * uTiltStrength), 0.0, 1.0);

  // --- chromatic aberration, hidden inside blur ---------------------------
  float ab = uAberration * (0.30 + coc * 0.70);
  vec2 abOff = centered * ab * 0.006;
  vec3 sharp;
  sharp.r = texture2D(tDiffuse, uv + abOff).r;
  sharp.g = texture2D(tDiffuse, uv).g;
  sharp.b = texture2D(tDiffuse, uv - abOff).b;

  vec3 blurred = texture2D(tBlur, uv).rgb;
  vec3 color = mix(sharp, blurred, coc);

  // --- radial impact streaks ----------------------------------------------
  if (uRadialBlur > 0.001) {
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float t = float(i) / 7.0;
      acc += texture2D(tDiffuse, uv - centered * t * uRadialBlur * 0.14).rgb;
    }
    color = mix(color, acc / 8.0, clamp(uRadialBlur, 0.0, 1.0) * clamp(length(centered) * 1.8, 0.0, 1.0));
  }

  // --- ink outline ---------------------------------------------------------
  if (uOutlineStrength > 0.001 && !isSky) {
    vec3 nrm;
    float edge = inkEdge(uv, texel, depth, nrm);
    // Line weight falls off with distance so far geometry doesn't turn to mud.
    float distFade = 1.0 - smoothstep(uFar * 0.06, uFar * 0.30, depth);
    edge *= distFade * uOutlineStrength * (1.0 - coc * 0.85);
    // Ink darkens what's beneath rather than replacing it — a flat black line
    // over a dark shadow is the giveaway of a cheap outline shader.
    vec3 ink = uOutlineColor * (0.20 + luma(color) * 0.55);
    color = mix(color, ink, edge);
  }

  // --- bloom ---------------------------------------------------------------
  color += texture2D(tBloom, uv).rgb * uBloomTint * uBloomStrength;

  // --- grade: exposure → tonemap → split-tone → contrast/sat --------------
  color *= uExposure * uColorFilter;

  // Extended Reinhard: mids stay linear, only true highlights roll off.
  float wp = max(uWhitePoint, 1.0);
  color = color * (1.0 + color / (wp * wp)) / (1.0 + color);

  // Zero-mean split-tone as a multiply: shifts hue, never lifts black.
  {
    float l = luma(color);
    vec3 sT = uShadowTint - dot(uShadowTint, vec3(0.3333333));
    vec3 hT = uHighlightTint - dot(uHighlightTint, vec3(0.3333333));
    float sw = (1.0 - smoothstep(0.0, 0.55, l));
    float hw = smoothstep(0.30, 1.0, l);
    color *= 1.0 + sT * 0.55 * sw + hT * 0.45 * hw;
  }

  // Lift shadows *toward* the shadow tint rather than toward grey, so opening
  // up the toe adds colour instead of washing the image out.
  {
    vec3 shadowLift = normalize(uShadowTint + 0.001) * 0.85;
    float toe = 1.0 - smoothstep(0.0, 0.30, luma(color));
    color += shadowLift * uLift * toe;
  }

  // Contrast as a smoothstep S-curve. A pivot-and-scale contrast clips
  // everything below the pivot straight to black — which is exactly how a
  // stylised scene loses all its shadow detail.
  color = clamp(color, 0.0, 1.0);
  color = mix(color, color * color * (3.0 - 2.0 * color), uContrast);

  float gl = luma(color);
  color = mix(vec3(gl), color, uSaturation);
  color = mix(color, vec3(gl), uDesaturateAll);

  // --- flash ---------------------------------------------------------------
  color = mix(color, uFlash.rgb, clamp(uFlash.a, 0.0, 1.0));

  // --- vignette ------------------------------------------------------------
  float vig = 1.0 - uVignette * dot(centered, centered) * 1.75;
  color *= clamp(vig, 0.0, 1.0);

  // --- grain: stepped at 24fps so it reads as film, not shimmer ------------
  float frame = floor(uTime * 24.0);
  float g = hash12(gl_FragCoord.xy + frame * 137.13);
  float grainMask = 1.0 - abs(luma(color) * 2.0 - 1.0);
  color += (g - 0.5) * uGrain * grainMask;

  if (uDebug == 1) { float d = depth / uFar; color = vec3(pow(1.0 - d, 3.0)); }
  else if (uDebug == 2) { vec3 n; float e = inkEdge(uv, texel, depth, n); color = vec3(e); }
  else if (uDebug == 3) { vec3 n; inkEdge(uv, texel, depth, n); color = n * 0.5 + 0.5; }
  else if (uDebug == 4) { color = texture2D(tBloom, uv).rgb; }
  else if (uDebug == 5) { color = vec3(coc); }

  gl_FragColor = vec4(linearToSRGB(color), 1.0);
}
`;

function makeQuad(material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0, 3, -1, 0, -1, 3, 0,
  ]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
    0, 0, 2, 0, 0, 2,
  ]), 2));
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Grading presets per area mood.
 * `shadow` / `highlight` are hue *directions* — only their deviation from
 * neutral grey matters, so they never change overall exposure.
 */
export const GRADES = {
  //         exposure  contrast(S-curve amount 0..1)  saturation  lift(shadow open-up)
  neutral:   { exposure: 1.00, contrast: 0.20, saturation: 1.08, lift: 0.030, white: 2.6, filter: [1.00, 1.00, 1.00], shadow: [0.28, 0.40, 0.62], highlight: [0.62, 0.52, 0.34], vignette: 0.30 },
  dawn:      { exposure: 1.24, contrast: 0.16, saturation: 1.14, lift: 0.050, white: 2.8, filter: [1.05, 0.99, 0.94], shadow: [0.32, 0.36, 0.66], highlight: [0.72, 0.50, 0.30], vignette: 0.26 },
  noon:      { exposure: 1.30, contrast: 0.22, saturation: 1.08, lift: 0.038, white: 3.0, filter: [1.02, 1.01, 0.97], shadow: [0.26, 0.40, 0.64], highlight: [0.64, 0.56, 0.38], vignette: 0.24 },
  dusk:      { exposure: 0.98, contrast: 0.26, saturation: 1.18, lift: 0.040, white: 2.4, filter: [1.08, 0.94, 0.90], shadow: [0.34, 0.30, 0.68], highlight: [0.78, 0.44, 0.24], vignette: 0.36 },
  night:     { exposure: 0.88, contrast: 0.30, saturation: 0.92, lift: 0.060, white: 2.0, filter: [0.86, 0.94, 1.14], shadow: [0.24, 0.38, 0.72], highlight: [0.42, 0.52, 0.72], vignette: 0.46 },
  cave:      { exposure: 1.24, contrast: 0.26, saturation: 0.94, lift: 0.070, white: 2.2, filter: [0.92, 0.96, 1.04], shadow: [0.28, 0.36, 0.58], highlight: [0.56, 0.50, 0.40], vignette: 0.46 },
  magitek:   { exposure: 0.96, contrast: 0.30, saturation: 1.02, lift: 0.046, white: 2.2, filter: [0.90, 1.00, 1.10], shadow: [0.22, 0.44, 0.62], highlight: [0.40, 0.60, 0.66], vignette: 0.42 },
  desert:    { exposure: 1.10, contrast: 0.16, saturation: 1.02, lift: 0.022, white: 3.2, filter: [1.10, 1.02, 0.90], shadow: [0.34, 0.38, 0.60], highlight: [0.74, 0.58, 0.32], vignette: 0.28 },
  snow:      { exposure: 1.05, contrast: 0.18, saturation: 0.92, lift: 0.026, white: 3.4, filter: [0.97, 1.00, 1.06], shadow: [0.28, 0.40, 0.70], highlight: [0.56, 0.60, 0.68], vignette: 0.32 },
  ruin:      { exposure: 0.94, contrast: 0.30, saturation: 0.88, lift: 0.048, white: 2.4, filter: [1.02, 0.94, 0.86], shadow: [0.34, 0.34, 0.54], highlight: [0.68, 0.50, 0.30], vignette: 0.46 },
  void:      { exposure: 1.28, contrast: 0.28, saturation: 1.18, lift: 0.072, white: 2.2, filter: [0.94, 0.88, 1.14], shadow: [0.38, 0.26, 0.70], highlight: [0.56, 0.34, 0.76], vignette: 0.46 },
  memory:    { exposure: 0.98, contrast: 0.08, saturation: 0.44, lift: 0.080, white: 2.6, filter: [1.04, 1.00, 0.94], shadow: [0.36, 0.38, 0.52], highlight: [0.62, 0.54, 0.40], vignette: 0.50 },
};

export class PostFX {
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.enabled = true;
    this.quality = options.quality ?? 'high';
    this.bloomLevels = this.quality === 'low' ? 3 : this.quality === 'medium' ? 4 : 5;

    const rtOpts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    };

    this.sceneTarget = new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true });
    const depthTex = new THREE.DepthTexture(2, 2);
    depthTex.type = THREE.UnsignedIntType;
    depthTex.format = THREE.DepthFormat;
    depthTex.minFilter = THREE.NearestFilter;
    depthTex.magFilter = THREE.NearestFilter;
    this.sceneTarget.depthTexture = depthTex;

    this.blurA = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    this.blurB = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    this.brightTarget = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    this.mips = [];
    for (let i = 0; i < this.bloomLevels; i++) {
      this.mips.push({
        down: new THREE.WebGLRenderTarget(2, 2, rtOpts),
        up: new THREE.WebGLRenderTarget(2, 2, rtOpts),
      });
    }

    const shared = { depthTest: false, depthWrite: false };
    this.copyMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: COPY_FRAG,
      uniforms: { tDiffuse: { value: null } }, ...shared,
    });
    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: BRIGHT_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: 1.05 },
        uSoftKnee: { value: 0.55 },
      }, ...shared,
    });
    this.downMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: DOWN_FRAG,
      uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() } }, ...shared,
    });
    this.upMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: UP_FRAG,
      uniforms: {
        tLower: { value: null }, tSame: { value: null },
        uTexel: { value: new THREE.Vector2() }, uScatter: { value: 0.85 },
      }, ...shared,
    });
    this.dofMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: DOF_BLUR_FRAG,
      uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, ...shared,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        tBlur: { value: null },
        tDepth: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uNear: { value: 0.1 },
        uFar: { value: 400 },
        uProjInverse: { value: new THREE.Matrix4() },
        uBloomStrength: { value: 0.62 },
        uBloomTint: { value: new THREE.Vector3(1.0, 0.95, 0.88) },
        uOutlineStrength: { value: 0.9 },
        uOutlineDepthBias: { value: 0.055 },
        uOutlineNormalBias: { value: 0.55 },
        uOutlineWidth: { value: 1.15 },
        uOutlineColor: { value: new THREE.Vector3(0.055, 0.050, 0.080) },
        uDofStrength: { value: 0.70 },
        uTiltStrength: { value: 0.42 },
        uTiltCenter: { value: 0.58 },
        uTiltWidth: { value: 0.24 },
        uFocusDistance: { value: 18 },
        uFocusRange: { value: 26 },
        uVignette: { value: 0.30 },
        uGrain: { value: 0.034 },
        uAberration: { value: 0.5 },
        uSaturation: { value: 1.06 },
        uContrast: { value: 1.06 },
        uExposure: { value: 1.0 },
        uLift: { value: 0.0 },
        uWhitePoint: { value: 2.6 },
        uShadowTint: { value: new THREE.Vector3(0.28, 0.40, 0.62) },
        uHighlightTint: { value: new THREE.Vector3(0.62, 0.52, 0.34) },
        uColorFilter: { value: new THREE.Vector3(1, 1, 1) },
        uRadialBlur: { value: 0.0 },
        uFlash: { value: new THREE.Vector4(1, 1, 1, 0) },
        uDesaturateAll: { value: 0.0 },
        uDebug: { value: 0 },
      }, ...shared,
    });

    this.quads = {
      copy: makeQuad(this.copyMat),
      bright: makeQuad(this.brightMat),
      down: makeQuad(this.downMat),
      up: makeQuad(this.upMat),
      dof: makeQuad(this.dofMat),
      composite: makeQuad(this.compositeMat),
    };
    this.orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fsScene = new THREE.Scene();

    this._gradeCurrent = structuredClone(GRADES.neutral);
    this._gradeTarget = structuredClone(GRADES.neutral);
    this._gradeSpeed = 1;
    this.setSize(options.width ?? 1280, options.height ?? 720);
  }

  setSize(width, height) {
    this.width = Math.max(2, Math.floor(width));
    this.height = Math.max(2, Math.floor(height));
    this.sceneTarget.setSize(this.width, this.height);
    const hw = Math.max(2, this.width >> 1);
    const hh = Math.max(2, this.height >> 1);
    this.blurA.setSize(hw, hh);
    this.blurB.setSize(hw, hh);
    this.brightTarget.setSize(hw, hh);
    for (let i = 0; i < this.bloomLevels; i++) {
      const w = Math.max(2, this.width >> (i + 2));
      const h = Math.max(2, this.height >> (i + 2));
      this.mips[i].down.setSize(w, h);
      this.mips[i].up.setSize(w, h);
    }
    this.compositeMat.uniforms.uResolution.value.set(this.width, this.height);
    // Ink lines are authored for a ~900px-tall frame. Without this the line
    // stays one *texel* wide, so on a hi-DPI buffer it lands sub-pixel after
    // downscaling and effectively disappears.
    this.compositeMat.uniforms.uOutlineWidth.value = Math.max(1.0, (this.height / 900) * 1.15);
  }

  setGrade(name, seconds = 1.2) {
    const g = GRADES[name] || GRADES.neutral;
    this._gradeTarget = structuredClone(g);
    this._gradeSpeed = seconds <= 0 ? Infinity : 1 / seconds;
    if (seconds <= 0) this._gradeCurrent = structuredClone(g);
  }

  _updateGrade(dt) {
    const c = this._gradeCurrent;
    const t = this._gradeTarget;
    const k = this._gradeSpeed === Infinity ? 1 : Math.min(1, dt * this._gradeSpeed * 2.2);
    const lerp = (a, b) => a + (b - a) * k;
    for (const key of ['exposure', 'contrast', 'saturation', 'vignette', 'lift', 'white']) {
      c[key] = lerp(c[key], t[key]);
    }
    for (let i = 0; i < 3; i++) {
      c.filter[i] = lerp(c.filter[i], t.filter[i]);
      c.shadow[i] = lerp(c.shadow[i], t.shadow[i]);
      c.highlight[i] = lerp(c.highlight[i], t.highlight[i]);
    }
    const u = this.compositeMat.uniforms;
    u.uExposure.value = c.exposure;
    u.uContrast.value = c.contrast;
    u.uSaturation.value = c.saturation;
    u.uVignette.value = c.vignette;
    u.uLift.value = c.lift;
    u.uWhitePoint.value = c.white;
    u.uColorFilter.value.set(c.filter[0], c.filter[1], c.filter[2]);
    u.uShadowTint.value.set(c.shadow[0], c.shadow[1], c.shadow[2]);
    u.uHighlightTint.value.set(c.highlight[0], c.highlight[1], c.highlight[2]);
  }

  _blit(quad, target) {
    this.fsScene.clear();
    this.fsScene.add(quad);
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.fsScene, this.orthoCam);
    this.fsScene.remove(quad);
  }

  render(scene, camera, dt, time) {
    const r = this.renderer;
    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }

    this._updateGrade(dt);

    // 1. scene → HDR target
    r.setRenderTarget(this.sceneTarget);
    r.clear();
    r.render(scene, camera);

    // 2. bright pass, then the downsample pyramid
    this.brightMat.uniforms.tDiffuse.value = this.sceneTarget.texture;
    this._blit(this.quads.bright, this.brightTarget);

    let src = this.brightTarget;
    for (let i = 0; i < this.bloomLevels; i++) {
      this.downMat.uniforms.tDiffuse.value = src.texture;
      this.downMat.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      this._blit(this.quads.down, this.mips[i].down);
      src = this.mips[i].down;
    }

    // Upsample: the smallest mip seeds the chain, then each level adds its own
    // detail. Reading `down[i]` and writing `up[i]` keeps source and
    // destination distinct — sampling a target you are drawing into is the
    // feedback loop the driver complains about.
    const top = this.bloomLevels - 1;
    this.copyMat.uniforms.tDiffuse.value = this.mips[top].down.texture;
    this._blit(this.quads.copy, this.mips[top].up);
    for (let i = top - 1; i >= 0; i--) {
      const lower = this.mips[i + 1].up;
      this.upMat.uniforms.tLower.value = lower.texture;
      this.upMat.uniforms.tSame.value = this.mips[i].down.texture;
      this.upMat.uniforms.uTexel.value.set(1 / lower.width, 1 / lower.height);
      this._blit(this.quads.up, this.mips[i].up);
    }

    // 3. depth-of-field blur — separable gaussian at half res, two passes
    this.copyMat.uniforms.tDiffuse.value = this.sceneTarget.texture;
    this._blit(this.quads.copy, this.blurA);
    this.dofMat.uniforms.tDiffuse.value = this.blurA.texture;
    this.dofMat.uniforms.uDir.value.set(1.6 / this.blurA.width, 0);
    this._blit(this.quads.dof, this.blurB);
    this.dofMat.uniforms.tDiffuse.value = this.blurB.texture;
    this.dofMat.uniforms.uDir.value.set(0, 1.6 / this.blurA.height);
    this._blit(this.quads.dof, this.blurA);

    // 4. composite
    const u = this.compositeMat.uniforms;
    u.tDiffuse.value = this.sceneTarget.texture;
    u.tBloom.value = this.mips[0].up.texture;
    u.tBlur.value = this.blurA.texture;
    u.tDepth.value = this.sceneTarget.depthTexture;
    u.uTime.value = time;
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uProjInverse.value.copy(camera.projectionMatrixInverse);
    this._blit(this.quads.composite, null);
  }

  // --- transient effects ---------------------------------------------------
  flash(color = [1, 1, 1], strength = 0.8) {
    this.compositeMat.uniforms.uFlash.value.set(color[0], color[1], color[2], strength);
  }

  get flashStrength() { return this.compositeMat.uniforms.uFlash.value.w; }
  set flashStrength(v) { this.compositeMat.uniforms.uFlash.value.w = v; }
  get radialBlur() { return this.compositeMat.uniforms.uRadialBlur.value; }
  set radialBlur(v) { this.compositeMat.uniforms.uRadialBlur.value = v; }
  get desaturate() { return this.compositeMat.uniforms.uDesaturateAll.value; }
  set desaturate(v) { this.compositeMat.uniforms.uDesaturateAll.value = v; }
  set debug(v) { this.compositeMat.uniforms.uDebug.value = v | 0; }
  get debug() { return this.compositeMat.uniforms.uDebug.value; }

  setFocus(distance, range) {
    this.compositeMat.uniforms.uFocusDistance.value = distance;
    if (range !== undefined) this.compositeMat.uniforms.uFocusRange.value = range;
  }

  setTiltShift(strength, center = 0.58, width = 0.24) {
    this.compositeMat.uniforms.uTiltStrength.value = strength;
    this.compositeMat.uniforms.uTiltCenter.value = center;
    this.compositeMat.uniforms.uTiltWidth.value = width;
  }

  setOutline(strength) {
    this.compositeMat.uniforms.uOutlineStrength.value = strength;
  }

  dispose() {
    const targets = [this.sceneTarget, this.blurA, this.blurB, this.brightTarget];
    for (const m of this.mips) targets.push(m.down, m.up);
    for (const rt of targets) rt.dispose();
    for (const m of [this.copyMat, this.brightMat, this.downMat, this.upMat, this.dofMat, this.compositeMat]) m.dispose();
  }
}
