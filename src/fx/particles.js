import * as THREE from 'three';

/**
 * Particles and spell effects.
 *
 * One preallocated pool of points, CPU-simulated. A few thousand particles is
 * nothing for a modern GPU and CPU simulation buys per-particle behaviour
 * (turbulence, drag, colour-over-life, gravity flips) that a fire-and-forget
 * GPU system makes awkward. Nothing here allocates during a battle.
 *
 * Particles are drawn as soft additive discs generated in the shader, so there
 * are no sprite textures to load and no hard sprite edges — the single most
 * common way stylised VFX end up looking cheap.
 */

const MAX_PARTICLES = 3000;

const PARTICLE_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // Perspective-correct size, clamped so nothing becomes a screen-filling blob
  // when it drifts toward the camera.
  gl_PointSize = clamp(aSize * (260.0 / -mv.z), 1.0, 190.0);
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  // Soft radial falloff with a hot core.
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float edge = 1.0 - smoothstep(0.35, 1.0, r);
  float core = 1.0 - smoothstep(0.0, 0.45, r);
  vec3 col = vColor * (1.0 + core * 1.35);
  gl_FragColor = vec4(col, edge * vAlpha);
}
`;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.alphas = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    scene.add(this.points);

    // Parallel arrays rather than objects: no per-particle allocation, and the
    // simulation loop stays cache-friendly.
    this.vx = new Float32Array(MAX_PARTICLES);
    this.vy = new Float32Array(MAX_PARTICLES);
    this.vz = new Float32Array(MAX_PARTICLES);
    this.life = new Float32Array(MAX_PARTICLES);
    this.maxLife = new Float32Array(MAX_PARTICLES);
    this.gravity = new Float32Array(MAX_PARTICLES);
    this.drag = new Float32Array(MAX_PARTICLES);
    this.spin = new Float32Array(MAX_PARTICLES);
    this.baseSize = new Float32Array(MAX_PARTICLES);
    this.r0 = new Float32Array(MAX_PARTICLES);
    this.g0 = new Float32Array(MAX_PARTICLES);
    this.b0 = new Float32Array(MAX_PARTICLES);
    this.r1 = new Float32Array(MAX_PARTICLES);
    this.g1 = new Float32Array(MAX_PARTICLES);
    this.b1 = new Float32Array(MAX_PARTICLES);
    this.turbulence = new Float32Array(MAX_PARTICLES);
    this.count = 0;
    this._time = 0;
    this._tmpColor = new THREE.Color();
  }

  /** Spawn one particle. Returns false when the pool is full. */
  spawn({
    x, y, z, vx = 0, vy = 0, vz = 0, life = 1, size = 1,
    color = '#ffffff', endColor = null, gravity = 0, drag = 0.6,
    turbulence = 0, spin = 0,
  }) {
    if (this.count >= MAX_PARTICLES) return false;
    const i = this.count++;
    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.gravity[i] = gravity; this.drag[i] = drag;
    this.turbulence[i] = turbulence; this.spin[i] = spin;
    this.baseSize[i] = size;

    const c0 = this._tmpColor.set(color);
    this.r0[i] = c0.r; this.g0[i] = c0.g; this.b0[i] = c0.b;
    const c1 = endColor ? this._tmpColor.set(endColor) : c0;
    this.r1[i] = c1.r; this.g1[i] = c1.g; this.b1[i] = c1.b;
    return true;
  }

  update(dt) {
    this._time += dt;
    let n = this.count;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // Swap-remove: keeps the live range contiguous with no gaps.
        const last = n - 1;
        if (i !== last) this._copy(last, i);
        n--;
        i--;
        continue;
      }
      const t = 1 - this.life[i] / this.maxLife[i];   // 0 → 1 over lifetime

      if (this.turbulence[i] > 0) {
        const s = this._time * 3 + i;
        this.vx[i] += Math.sin(s * 1.7) * this.turbulence[i] * dt;
        this.vy[i] += Math.cos(s * 2.3) * this.turbulence[i] * dt * 0.6;
        this.vz[i] += Math.sin(s * 1.1 + 2) * this.turbulence[i] * dt;
      }
      this.vy[i] += this.gravity[i] * dt;
      const k = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= k; this.vy[i] *= k; this.vz[i] *= k;

      this.positions[i * 3] += this.vx[i] * dt;
      this.positions[i * 3 + 1] += this.vy[i] * dt;
      this.positions[i * 3 + 2] += this.vz[i] * dt;

      // Grow in fast, shrink out slow — reads as energy dissipating.
      const grow = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      this.sizes[i] = this.baseSize[i] * (0.35 + grow * 0.85);
      this.alphas[i] = t < 0.1 ? t / 0.1 : Math.pow(1 - (t - 0.1) / 0.9, 1.4);

      this.colors[i * 3] = this.r0[i] + (this.r1[i] - this.r0[i]) * t;
      this.colors[i * 3 + 1] = this.g0[i] + (this.g1[i] - this.g0[i]) * t;
      this.colors[i * 3 + 2] = this.b0[i] + (this.b1[i] - this.b0[i]) * t;
    }
    this.count = n;

    const geo = this.points.geometry;
    geo.setDrawRange(0, n);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  }

  _copy(from, to) {
    this.positions[to * 3] = this.positions[from * 3];
    this.positions[to * 3 + 1] = this.positions[from * 3 + 1];
    this.positions[to * 3 + 2] = this.positions[from * 3 + 2];
    for (const arr of [this.vx, this.vy, this.vz, this.life, this.maxLife,
      this.gravity, this.drag, this.spin, this.baseSize, this.turbulence,
      this.r0, this.g0, this.b0, this.r1, this.g1, this.b1, this.sizes, this.alphas]) {
      arr[to] = arr[from];
    }
    this.colors[to * 3] = this.colors[from * 3];
    this.colors[to * 3 + 1] = this.colors[from * 3 + 1];
    this.colors[to * 3 + 2] = this.colors[from * 3 + 2];
  }

  clear() { this.count = 0; this.points.geometry.setDrawRange(0, 0); }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
  }

  // --- emitter shapes -----------------------------------------------------

  /** Outward burst from a point. */
  burst(pos, {
    count = 40, speed = 4, spread = 1, life = 0.8, size = 0.5,
    color = '#ffffff', endColor = null, gravity = -2, drag = 1.2, up = 0, turbulence = 0,
  } = {}) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random() * spread);
      const s = speed * (0.5 + Math.random() * 0.8);
      this.spawn({
        x: pos.x + (Math.random() - 0.5) * 0.2,
        y: pos.y + (Math.random() - 0.5) * 0.2,
        z: pos.z + (Math.random() - 0.5) * 0.2,
        vx: Math.sin(phi) * Math.cos(theta) * s,
        vy: Math.cos(phi) * s + up,
        vz: Math.sin(phi) * Math.sin(theta) * s,
        life: life * (0.7 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.8),
        color, endColor, gravity, drag, turbulence,
      });
    }
  }

  /** A ring of particles racing outward along the ground. */
  ring(pos, {
    count = 48, radius = 0.4, speed = 6, life = 0.6, size = 0.45,
    color = '#ffffff', endColor = null, gravity = 0, drag = 2.2, up = 0.6,
  } = {}) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.1;
      this.spawn({
        x: pos.x + Math.cos(a) * radius,
        y: pos.y,
        z: pos.z + Math.sin(a) * radius,
        vx: Math.cos(a) * speed,
        vy: up * (0.5 + Math.random()),
        vz: Math.sin(a) * speed,
        life: life * (0.8 + Math.random() * 0.4),
        size: size * (0.7 + Math.random() * 0.6),
        color, endColor, gravity, drag,
      });
    }
  }

  /** A rising column, for holy light and flame pillars. */
  column(pos, {
    count = 50, radius = 0.7, speed = 5, life = 1.0, size = 0.5,
    color = '#ffffff', endColor = null, drag = 0.4, turbulence = 1.2,
  } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      this.spawn({
        x: pos.x + Math.cos(a) * r,
        y: pos.y + Math.random() * 0.4,
        z: pos.z + Math.sin(a) * r,
        vx: Math.cos(a) * 0.4,
        vy: speed * (0.6 + Math.random() * 0.8),
        vz: Math.sin(a) * 0.4,
        life: life * (0.6 + Math.random() * 0.8),
        size: size * (0.5 + Math.random() * 0.9),
        color, endColor, gravity: 0.4, drag, turbulence,
      });
    }
  }

  /** Particles converging inward onto a point — a charge-up. */
  implode(pos, {
    count = 44, radius = 3.2, life = 0.55, size = 0.42,
    color = '#ffffff', endColor = null,
  } = {}) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());
      const r = radius * (0.6 + Math.random() * 0.6);
      const px = pos.x + Math.sin(phi) * Math.cos(theta) * r;
      const py = pos.y + Math.cos(phi) * r * 0.6;
      const pz = pos.z + Math.sin(phi) * Math.sin(theta) * r;
      const l = life * (0.75 + Math.random() * 0.5);
      // Aim each particle so it arrives at the centre as it dies.
      this.spawn({
        x: px, y: py, z: pz,
        vx: (pos.x - px) / l, vy: (pos.y - py) / l, vz: (pos.z - pz) / l,
        life: l, size: size * (0.7 + Math.random() * 0.6),
        color, endColor, gravity: 0, drag: 0,
      });
    }
  }

  /** A trail from A to B, used for projectiles and slashes. */
  streak(from, to, {
    count = 26, life = 0.45, size = 0.4, color = '#ffffff', endColor = null,
    jitter = 0.25, drag = 1.4,
  } = {}) {
    for (let i = 0; i < count; i++) {
      const t = i / count;
      this.spawn({
        x: from.x + (to.x - from.x) * t + (Math.random() - 0.5) * jitter,
        y: from.y + (to.y - from.y) * t + (Math.random() - 0.5) * jitter,
        z: from.z + (to.z - from.z) * t + (Math.random() - 0.5) * jitter,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5 + 0.6,
        vz: (Math.random() - 0.5) * 1.5,
        life: life * (0.6 + Math.random() * 0.7),
        size: size * (0.6 + Math.random() * 0.8),
        color, endColor, gravity: -0.5, drag,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Mesh-based effects
// ---------------------------------------------------------------------------

const geoCache = new Map();
const cached = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };

function additiveMaterial(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * A magic circle: concentric rings with tick marks, laid flat and spinning.
 * The single most recognisable "a spell is being cast here" signal in the
 * genre, and it costs three meshes.
 */
export function magicCircle(scene, pos, { color = '#3fc6d6', radius = 1.6 } = {}) {
  const group = new THREE.Group();
  group.position.set(pos.x, pos.y + 0.05, pos.z);
  group.rotation.x = -Math.PI / 2;

  const outer = new THREE.Mesh(
    cached('ring-o', () => new THREE.RingGeometry(0.92, 1.0, 64)), additiveMaterial(color, 0.9));
  const inner = new THREE.Mesh(
    cached('ring-i', () => new THREE.RingGeometry(0.52, 0.58, 48)), additiveMaterial(color, 0.7));
  const ticks = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(
      cached('tick', () => new THREE.PlaneGeometry(0.06, 0.22)), additiveMaterial(color, 0.85));
    tick.position.set(Math.cos(a) * 0.76, Math.sin(a) * 0.76, 0);
    tick.rotation.z = a;
    ticks.add(tick);
  }
  group.add(outer, inner, ticks);
  group.scale.setScalar(radius);
  group.userData.spin = { outer, inner, ticks };
  scene.add(group);
  return group;
}

/**
 * An expanding shockwave ring, flat to the ground.
 *
 * The band is deliberately thin: a wide ring scaled up reads as an opaque
 * coloured disc lying on the floor rather than a wave travelling outward.
 */
export function shockwave(scene, pos, { color = '#ffffff' } = {}) {
  const mesh = new THREE.Mesh(
    cached('shock', () => new THREE.RingGeometry(0.88, 1.0, 64)), additiveMaterial(color, 0.85));
  mesh.position.set(pos.x, pos.y + 0.08, pos.z);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.setScalar(0.2);
  scene.add(mesh);
  return mesh;
}

/** A vertical beam of light. */
export function lightPillar(scene, pos, { color = '#fff3b8', radius = 0.9, height = 9 } = {}) {
  const mesh = new THREE.Mesh(
    cached('pillar', () => {
      const g = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
      g.translate(0, 0.5, 0);
      return g;
    }),
    additiveMaterial(color, 0.75));
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.scale.set(radius, height, radius);
  scene.add(mesh);
  return mesh;
}

/** A crescent slash plane, swept through an arc. */
export function slashArc(scene, pos, { color = '#ffffff', radius = 1.8 } = {}) {
  const mesh = new THREE.Mesh(
    cached('slash', () => new THREE.RingGeometry(0.55, 1.0, 32, 1, 0, Math.PI * 0.7)),
    additiveMaterial(color, 1));
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.scale.setScalar(radius);
  scene.add(mesh);
  return mesh;
}

/** Jagged lightning between two points, built as a chain of thin quads. */
export function lightningBolt(scene, from, to, { color = '#ffe45e', segments = 9, jitter = 0.7 } = {}) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const step = len / segments;
  const mat = additiveMaterial(color, 1);
  let prev = from.clone();
  const axis = dir.clone().normalize();
  const side = new THREE.Vector3(0, 1, 0).cross(axis).normalize();
  const up = axis.clone().cross(side).normalize();

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const point = from.clone().addScaledVector(dir, t);
    if (i < segments) {
      // Deviation peaks in the middle of the run — a bolt is pinned at both ends.
      const wobble = Math.sin(t * Math.PI) * jitter;
      point.addScaledVector(side, (Math.random() - 0.5) * wobble * 2);
      point.addScaledVector(up, (Math.random() - 0.5) * wobble * 2);
    }
    const seg = new THREE.Mesh(cached('bolt-seg', () => new THREE.PlaneGeometry(1, 1)), mat);
    const mid = prev.clone().add(point).multiplyScalar(0.5);
    seg.position.copy(mid);
    seg.scale.set(prev.distanceTo(point), 0.12 + Math.random() * 0.1, 1);
    seg.lookAt(point);
    seg.rotateY(Math.PI / 2);
    group.add(seg);
    prev = point;
  }
  scene.add(group);
  return group;
}

export function disposeEffect(obj) {
  obj.removeFromParent();
  obj.traverse?.((o) => { if (o.isMesh) o.material?.dispose?.(); });
  if (obj.isMesh) obj.material?.dispose?.();
}
