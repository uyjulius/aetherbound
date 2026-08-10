import * as THREE from 'three';

/**
 * Asset loading and caching.
 *
 * Textures are loaded once and shared. Every plate is authored to tile, so the
 * defaults here are repeat-wrapped with high anisotropy — a stylised game
 * showing mip-blurred mush on a receding floor is a far worse look than a
 * little shimmer.
 */

export const TEXTURE_MANIFEST = {
  // walls
  stone_wall: 'stone_wall.png',
  plaster_wall: 'plaster_wall.png',
  brick_wall: 'brick_wall.png',
  // roofs
  roof_tile: 'roof_tile.png',
  roof_slate: 'roof_slate.png',
  thatch: 'thatch.png',
  // timber
  wood_planks: 'wood_planks.png',
  wood_floor: 'wood_floor.png',
  bark: 'bark.png',
  // ground
  grass: 'grass.png',
  dirt_path: 'dirt_path.png',
  cobblestone: 'cobblestone.png',
  sand: 'sand.png',
  snow: 'snow.png',
  // rock
  rock_cliff: 'rock_cliff.png',
  cave_rock: 'cave_rock.png',
  // interiors
  marble_floor: 'marble_floor.png',
  iron_plate: 'iron_plate.png',
  fabric: 'fabric.png',
  // the strange
  aether_stone: 'aether_stone.png',
  magitek_panel: 'magitek_panel.png',
};

class AssetManager {
  constructor() {
    this.textures = new Map();
    this.loader = new THREE.TextureLoader();
    this.maxAnisotropy = 4;
    this.basePath = '/assets/textures/';
    this.onProgress = null;
  }

  init(renderer) {
    this.maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return this;
  }

  _configure(tex, { repeat = 1, filter = true } = {}) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAnisotropy;
    tex.magFilter = filter ? THREE.LinearFilter : THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    if (repeat !== 1) tex.repeat.set(repeat, repeat);
    return tex;
  }

  get(name) {
    const tex = this.textures.get(name);
    if (!tex && __DEV__) console.warn(`[assets] texture "${name}" not loaded`);
    return tex || null;
  }

  /**
   * A repeat-scaled clone. Materials that tile at different densities share
   * one GPU upload; only the tiny wrapper object is duplicated.
   */
  tiled(name, repeatX, repeatY = repeatX) {
    const base = this.get(name);
    if (!base) return null;
    const key = `${name}@${repeatX}x${repeatY}`;
    if (this.textures.has(key)) return this.textures.get(key);
    const clone = base.clone();
    clone.needsUpdate = true;
    clone.repeat.set(repeatX, repeatY);
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.anisotropy = this.maxAnisotropy;
    this.textures.set(key, clone);
    return clone;
  }

  async loadAll(names = Object.keys(TEXTURE_MANIFEST)) {
    let done = 0;
    const total = names.length;
    await Promise.all(names.map(async (name) => {
      const file = TEXTURE_MANIFEST[name];
      if (!file) {
        console.warn(`[assets] no manifest entry for "${name}"`);
        return;
      }
      try {
        const tex = await this.loader.loadAsync(this.basePath + file);
        this._configure(tex);
        tex.name = name;
        this.textures.set(name, tex);
      } catch (err) {
        // A missing plate must not take down the whole boot; the material
        // simply falls back to flat albedo.
        console.error(`[assets] failed to load ${file}`, err);
      } finally {
        done++;
        this.onProgress?.(done / total, name);
      }
    }));
    return this;
  }

  dispose() {
    for (const tex of this.textures.values()) tex.dispose();
    this.textures.clear();
  }
}

export const assets = new AssetManager();
