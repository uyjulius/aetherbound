import * as THREE from 'three';
const textures = new Map();
const loader = new THREE.TextureLoader();
export function surfaceTexture(name) {
  if (!textures.has(name)) {
    const texture = loader.load(`./content/assets/textures/${name}.png`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    textures.set(name, texture);
  }
  return textures.get(name);
}
export const GROUND_TEXTURES = {
  grass: 'grass', dirt: 'dirt_path', cobble: 'cobblestone', sand: 'sand', snow: 'snow',
  wood: 'wood_floor', marble: 'marble_floor', rock: 'rock_cliff', cave: 'cave_rock', aether: 'aether_stone', magitek: 'magitek_panel', swamp: 'grass',
};
export function surfaceMaterial(texture, color = '#ffffff', roughness = .9) {
  return new THREE.MeshStandardMaterial({ map: surfaceTexture(texture), color, roughness, metalness: texture.includes('magitek') ? .25 : .02 });
}

// Small periodic surface patterns avoid baked lighting and repeated footprints.
// Their shared cache is owned by the renderer, independent of map lifetimes.
export function groundTexture(kind) {
  const key = `ground:${kind}`;
  if (textures.has(key)) return textures.get(key);
  const size = 128, pixels = new Uint8Array(size * size * 4);
  const colors = { grass: [74, 98, 53], swamp: [64, 79, 46], dirt: [121, 98, 68], cobble: [125, 130, 129],
    sand: [187, 162, 111], snow: [205, 220, 227], wood: [104, 75, 49], marble: [161, 167, 165], rock: [102, 104, 101],
    cave: [75, 79, 86], aether: [53, 98, 114], magitek: [84, 105, 117] };
  const base = colors[kind] ?? colors.rock;
  const fract = n => n - Math.floor(n);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const u = x / size, v = z / size, tau = Math.PI * 2;
    const grain = fract(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) - .5;
    let shade = 1 + Math.sin(u * tau) * Math.cos(v * tau) * .045 + grain * .075;
    if (['cobble', 'marble'].includes(kind)) {
      const row = Math.floor(v * 4), a = fract(u * 4 + row % 2 * .5), b = fract(v * 4);
      shade += a < .035 || b < .035 ? -.3 : a < .065 || b < .065 ? .09 : 0;
      shade += Math.sin(Math.floor(u * 4 + row % 2 * .5) * 17 + row * 9) * .08;
    } else if (kind === 'wood') {
      shade += Math.sin(u * tau * 15 + Math.sin(v * tau) * 2) * .055;
      if (fract(u * 4) < .025) shade -= .3;
    } else if (['magitek', 'aether'].includes(kind)) {
      const edge = Math.min(u, v, 1 - u, 1 - v);
      if (edge < .025) shade -= .25;
      if (kind === 'aether' && (Math.abs(u - .5) < .008 || Math.abs(v - .5) < .008)) shade += .35;
    } else {
      shade += Math.sin(u * tau * 3 + Math.sin(v * tau * 2)) * .035;
    }
    const index = (z * size + x) * 4;
    for (let c = 0; c < 3; c++) pixels[index + c] = Math.max(0, Math.min(255, Math.round(base[c] * shade)));
    pixels[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.anisotropy = 4; texture.needsUpdate = true;
  textures.set(key, texture); return texture;
}
