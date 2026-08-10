import * as THREE from 'three';
import { PostFX } from '../fx/postfx.js';
import { tickWind, tickWater, tickAether } from '../fx/materials.js';

/**
 * Window into the world: renderer, camera rig, lighting rig, post chain.
 *
 * The camera is a *rig*, not a bare camera — shake, sway, and cutscene
 * overrides all compose on top of whatever the gameplay camera wants, so
 * nothing has to fight over the transform.
 */

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, 12, 14);
    this.target = new THREE.Vector3(0, 0, 0);
    this.up = new THREE.Vector3(0, 1, 0);

    this.shakeAmount = 0;
    this.shakeDecay = 3.2;
    this.shakeFreq = 34;
    this._shakeTime = 0;
    this._shakeOffset = new THREE.Vector3();

    // Idle breathing sway. Perfectly static cameras feel like screenshots.
    this.swayAmount = 0.045;
    this.swaySpeed = 0.35;
    this._swayTime = Math.random() * 100;

    this.roll = 0;
    this._rollTarget = 0;
  }

  shake(amount, decay = 3.2) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeDecay = decay;
  }

  update(dt, time) {
    this._swayTime += dt * this.swaySpeed;
    this._shakeTime += dt;

    this._shakeOffset.set(0, 0, 0);
    if (this.shakeAmount > 0.0001) {
      const t = this._shakeTime * this.shakeFreq;
      // Layered sines beat white noise: it reads as impact, not static.
      this._shakeOffset.set(
        (Math.sin(t * 1.00) * 0.6 + Math.sin(t * 2.31) * 0.4) * this.shakeAmount,
        (Math.sin(t * 1.37) * 0.6 + Math.sin(t * 3.11) * 0.4) * this.shakeAmount * 0.8,
        (Math.sin(t * 0.83) * 0.5) * this.shakeAmount * 0.4,
      );
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * this.shakeDecay * (0.5 + this.shakeAmount));
    }

    const sway = new THREE.Vector3(
      Math.sin(this._swayTime * 1.0) * this.swayAmount,
      Math.sin(this._swayTime * 0.73 + 1.3) * this.swayAmount * 0.7,
      0,
    );

    this.camera.position.copy(this.position).add(this._shakeOffset).add(sway);
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.target);

    this.roll += (this._rollTarget - this.roll) * Math.min(1, dt * 4);
    if (Math.abs(this.roll) > 0.0001) this.camera.rotateZ(this.roll);
    this.camera.updateMatrixWorld();
  }

  setRoll(radians) { this._rollTarget = radians; }

  /** Distance from camera to its look target — drives autofocus. */
  get focusDistance() {
    return this.camera.position.distanceTo(this.target);
  }
}

/**
 * The lighting rig. Three lights, always: key (warm, casts shadow), fill
 * (cool, from the opposite side, no shadow), and bounce (up from the ground).
 * Real stylised games almost never use more, and more is how scenes turn to
 * soup.
 */
export class LightRig {
  constructor(scene) {
    this.scene = scene;

    this.key = new THREE.DirectionalLight(0xfff0d6, 2.4);
    this.key.position.set(24, 38, 18);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.near = 1;
    this.key.shadow.camera.far = 160;
    this.key.shadow.bias = -0.0012;
    this.key.shadow.normalBias = 0.035;
    // Shadows that fully occlude the key light go pure black once ambient is
    // this low. Letting a little key through keeps them coloured and readable,
    // which is how they're painted in 2D art anyway.
    this.key.shadow.intensity = 0.74;
    this.setShadowExtent(46);
    scene.add(this.key);
    scene.add(this.key.target);

    this.fill = new THREE.DirectionalLight(0x7f9fd8, 0.34);
    this.fill.position.set(-26, 16, -22);
    scene.add(this.fill);

    // Sky/ground bounce is the *only* thing lighting a shadowed surface, so it
    // has to keep detail alive. Deliberately only lightly tinted: a strongly
    // blue fill multiplies against albedo and washes every material to the
    // same slate grey. The cool shadow hue comes from the grade's split-tone
    // instead, which shifts hue without destroying material identity.
    this.bounce = new THREE.HemisphereLight(0xaec2d6, 0x6a5f4c, 0.90);
    scene.add(this.bounce);

    this.ambient = new THREE.AmbientLight(0xfff4e4, 0.20);
    scene.add(this.ambient);
  }

  setShadowExtent(halfSize) {
    const c = this.key.shadow.camera;
    c.left = -halfSize; c.right = halfSize;
    c.top = halfSize; c.bottom = -halfSize;
    c.updateProjectionMatrix();
  }

  /** Keep the shadow frustum centred on the player so it never runs out. */
  follow(x, z) {
    const d = this.keyDir || [24, 38, 18];
    this.key.position.set(x + d[0], d[1], z + d[2]);
    this.key.target.position.set(x, 0, z);
    this.key.target.updateMatrixWorld();
  }

  apply(preset) {
    if (!preset) return;
    if (preset.key) { this.key.color.set(preset.key[0]); this.key.intensity = preset.key[1]; }
    if (preset.fill) { this.fill.color.set(preset.fill[0]); this.fill.intensity = preset.fill[1]; }
    if (preset.bounce) {
      this.bounce.color.set(preset.bounce[0]);
      this.bounce.groundColor.set(preset.bounce[1]);
      this.bounce.intensity = preset.bounce[2];
    }
    if (preset.ambient !== undefined) this.ambient.intensity = preset.ambient;
    if (preset.shadowIntensity !== undefined) this.key.shadow.intensity = preset.shadowIntensity;
    if (preset.keyDir) {
      this.keyDir = preset.keyDir;
      this.key.position.set(preset.keyDir[0], preset.keyDir[1], preset.keyDir[2]);
    }
    this.key.castShadow = preset.shadows !== false;
  }
}

/** Named lighting moods, matched to the post-processing grades. */
export const LIGHT_PRESETS = {
  day:      { key: ['#fff0d6', 2.40], fill: ['#8fa8d0', 0.34], bounce: ['#aec2d6', '#6a5f4c', 1.05], ambient: 0.24, keyDir: [24, 38, 18], shadowIntensity: 0.60 },
  dawn:     { key: ['#ffcf9a', 2.10], fill: ['#9aa4d0', 0.34], bounce: ['#c8b4bc', '#6a564c', 0.86], ambient: 0.22, keyDir: [36, 16, 22], shadowIntensity: 0.70 },
  dusk:     { key: ['#ff9350', 1.95], fill: ['#8288c8', 0.38], bounce: ['#b89aa4', '#584050', 0.82], ambient: 0.22, keyDir: [-38, 13, -16], shadowIntensity: 0.72 },
  night:    { key: ['#9fb6e8', 0.80], fill: ['#5a6aa8', 0.24], bounce: ['#7481ac', '#2a2c3c', 0.62], ambient: 0.24, keyDir: [-18, 34, -26], shadowIntensity: 0.55 },
  interior: { key: ['#ffd79a', 1.80], fill: ['#8098c4', 0.24], bounce: ['#b8a68a', '#4e4238', 0.76], ambient: 0.26, keyDir: [12, 26, 14], shadowIntensity: 0.68 },
  cave:     { key: ['#b4cce0', 1.45], fill: ['#6a7ea8', 0.34], bounce: ['#8894ac', '#33333e', 0.92], ambient: 0.42, keyDir: [10, 30, 8], shadowIntensity: 0.42 },
  magitek:  { key: ['#d0f0ff', 1.50], fill: ['#48a4b4', 0.40], bounce: ['#7ba8b4', '#26333c', 0.70], ambient: 0.22, keyDir: [18, 30, -14], shadowIntensity: 0.70 },
  snow:     { key: ['#ffffff', 2.70], fill: ['#a4bade', 0.44], bounce: ['#c4d4ec', '#78829a', 1.02], ambient: 0.22, keyDir: [26, 30, 20], shadowIntensity: 0.62 },
  ruin:     { key: ['#e8c08a', 1.60], fill: ['#8a80a0', 0.28], bounce: ['#9c94a0', '#443c40', 0.72], ambient: 0.22, keyDir: [-24, 24, 20], shadowIntensity: 0.72 },
  void:     { key: ['#b892e8', 1.70], fill: ['#5ccdd8', 0.46], bounce: ['#8a76b0', '#2c2440', 0.95], ambient: 0.40, keyDir: [8, 20, -30], shadowIntensity: 0.50 },
};

export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // the ink outline pass does its own edge treatment
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // handled in the composite
    this.renderer.setClearColor(0x14121b, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xb9c6cf, 60, 260);

    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.4, 420);
    this.rig = new CameraRig(this.camera);
    this.lights = new LightRig(this.scene);

    this.postfx = new PostFX(this.renderer, { quality: options.quality ?? 'high' });
    this.renderScale = options.renderScale ?? 1;
    this.maxPixelRatio = options.maxPixelRatio ?? 2;

    this.time = 0;
    this.autofocus = true;

    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(canvas.parentElement || canvas);
    this.resize();
  }

  resize() {
    const host = this.canvas.parentElement || document.body;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    const cssW = Math.max(320, host.clientWidth);
    const cssH = Math.max(180, host.clientHeight);
    const w = Math.floor(cssW * dpr * this.renderScale);
    const h = Math.floor(cssH * dpr * this.renderScale);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.camera.aspect = cssW / cssH;
    this.camera.updateProjectionMatrix();
    this.postfx.setSize(w, h);
  }

  setQuality(level) {
    const map = { low: 0.62, medium: 0.82, high: 1.0, ultra: 1.0 };
    this.renderScale = map[level] ?? 1;
    this.maxPixelRatio = level === 'low' ? 1 : level === 'ultra' ? 2 : 1.5;
    this.renderer.shadowMap.enabled = level !== 'low';
    this.lights.key.shadow.mapSize.set(
      level === 'low' ? 1024 : level === 'ultra' ? 4096 : 2048,
      level === 'low' ? 1024 : level === 'ultra' ? 4096 : 2048,
    );
    this.lights.key.shadow.map?.dispose();
    this.lights.key.shadow.map = null;
    this.resize();
  }

  setFog(color, near, far) {
    this.scene.fog.color.set(color);
    this.scene.fog.near = near;
    this.scene.fog.far = far;
  }

  render(dt) {
    this.time += dt;
    this.rig.update(dt, this.time);
    tickWind(this.time);
    tickWater(this.time, this.scene.fog);
    tickAether(this.time);
    if (this.autofocus) this.postfx.setFocus(this.rig.focusDistance);
    this.postfx.render(this.scene, this.camera, dt, this.time);
  }

  dispose() {
    this._resizeObserver.disconnect();
    this.postfx.dispose();
    this.renderer.dispose();
  }
}
