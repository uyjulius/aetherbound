/**
 * Generate the raw material plates from an image model.
 *
 *   node tools/gen-raw-textures.mjs                 # keyless, via Pollinations
 *   OPENAI_API_KEY=sk-...      node tools/gen-raw-textures.mjs
 *   REPLICATE_API_TOKEN=r8_... node tools/gen-raw-textures.mjs
 *   STABILITY_API_KEY=sk-...   node tools/gen-raw-textures.mjs
 *   node tools/gen-raw-textures.mjs --only stone_wall,grass --provider openai
 *
 * Writes to `assets/raw/<name>.png`. `npm run textures` picks those up
 * automatically and runs the same coherence pass (forced tiling, brushwork,
 * hue shift, palette quantisation) that the authored plates go through — which
 * is the step that stops generated images reading as a pile of unrelated
 * pictures.
 *
 * Deliberately NOT Gemini. A paid provider is used if its key happens to be in
 * the environment; otherwise this falls back to Pollinations, which needs no
 * account at all, so the art path is never blocked on a credential.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const RAW_DIR = path.join(root, 'assets/raw');

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ONLY = flag('only')?.split(',').map((s) => s.trim());
const FORCE = args.includes('--force');
/**
 * How many shots to take at each material.
 *
 * One image per material was the mistake. The model's output varies wildly
 * run to run — the same prompt gives a photograph of a building, then a hero
 * shot of one stone, then an honest flat surface. Taking ten and keeping the
 * best is the difference between hoping and choosing.
 */
const CANDIDATES = Number(flag('candidates', '1'));

/**
 * Prompt fragments shared by every plate.
 *
 * The negatives matter more than the subject. A texture with baked lighting,
 * a vignette, or perspective is unusable on a 3D surface no matter how pretty
 * it is, and those are exactly the defaults an image model reaches for.
 */
const STYLE = 'Hand-painted stylized video game environment texture, painterly gouache brushwork with visible strokes, muted desaturated palette, subtle irregular colour variation.';

/**
 * The framing matters more than the subject, and the negatives more than both.
 *
 * Asked for "a stone wall", an image model returns a photograph of a building:
 * arches, a horizon, a vanishing point. That is what the caption is attached
 * to in its training data, and "seamless texture" does not override it. Asked
 * instead for a macro close-up it returns a hero shot of one centred stone,
 * which is worse — a radially symmetric plate tiles into a kaleidoscope.
 *
 * What works is naming an image category that is flat and subject-free *by
 * definition*. An orthophoto survey scan cannot have a horizon or a focal
 * point and still be one, so the model stops composing and starts covering.
 * The centre-crop in the coherence pass is the belt to these braces.
 */
const FRAME = 'Aerial orthophoto survey scan of a flat surface, captured straight down at uniform exposure, covering the ground edge to edge with no subject and no focal point.';
const RULES = 'CRITICAL: this is a survey scan of a surface, not a picture of a place or a thing. Absolutely no buildings, no architecture, no arches, no windows, no doors, no rooms, no corners, no landscape, no horizon, no sky, no scenery, no perspective, no vanishing point, no depth. Nothing centred, no single object, no hero subject, no radial or diagonal symmetry, no repeated tile grid. Perfectly flat even lighting with no cast shadows, no specular highlights, no gloss, no vignette, no directional light, no depth of field. The same density of detail everywhere in the frame. No text, no letters, no numbers, no watermark, no border, no frame, no people.';

/**
 * Each entry describes a *surface at arm's length*, never a thing that has a
 * silhouette. "Fieldstone masonry" invites a castle; "the surface of hand-cut
 * grey blocks and the lime mortar between them" invites a swatch.
 */
const MATERIALS = {
  stone_wall: 'the surface of rough hand-cut grey fieldstone blocks packed together with thick pale lime mortar between them, chipped edges, lichen specks',
  plaster_wall: 'the surface of old whitewashed lime plaster render, trowel sweeps, hairline crazing, water staining, warm cream tone',
  brick_wall: 'the surface of weathered red clay bricks laid in stretcher bond with pale mortar between them, a few over-fired dark bricks and pale under-fired ones',
  roof_tile: 'the surface of overlapping terracotta barrel roof tiles, warm red-brown clay, moss in the channels between them, seen from directly above',
  roof_slate: 'the surface of overlapping slate roof shingles, cool blue-grey, slightly irregular sizes and hand-chipped edges, seen from directly above',
  thatch: 'the surface of thick bundled straw thatch in overlapping courses, golden dry straw stems all lying the same way, deep shadow lines between the bundles',
  wood_planks: 'the surface of weathered timber cladding boards laid side by side, visible grain, knots, split ends and narrow gaps between boards',
  wood_floor: 'the surface of polished wooden floorboards laid side by side, warm honey tone, visible grain, joints and old scuffing',
  bark: 'the surface of deeply fissured tree bark, vertical plates and ridges with lichen in the cracks',
  grass: 'the surface of lush meadow grass seen from directly overhead, dense mixed green blades with patches of dry straw and tiny wildflowers',
  dirt_path: 'the surface of compacted dry earth seen from directly overhead, embedded pebbles, faint drying cracks, scattered grit',
  cobblestone: 'the surface of irregular rounded cobblestone paving seen from directly overhead, grey stones packed tight with dark earth in the gaps',
  sand: 'the surface of fine desert sand seen from directly overhead, small wind ripples, warm pale gold, scattered grains',
  snow: 'the surface of wind-packed snow seen from directly overhead, soft drifts and scoured ridges, cool blue shadows in the hollows, crystalline grain',
  rock_cliff: 'the surface of layered sedimentary rock, horizontal strata bands and vertical hairline fractures, grit and dust in the seams',
  cave_rock: 'the surface of damp cave flowstone, rounded lobes and mineral seams, cool grey with a faint teal vein running through it',
  marble_floor: 'the surface of polished marble slabs with soft grey veining and thin straight joints between slabs',
  iron_plate: 'the surface of riveted wrought iron plating, panel seams, domed rivets in rows, rust blooms and scratches',
  fabric: 'the surface of woven wool cloth in deep red, individual weft and warp threads clearly visible, with a gold embroidered band running across it',
  aether_stone: 'the surface of dark violet crystalline stone shot through with glowing cyan mineral veins, faceted grain',
  magitek_panel: 'the surface of a brushed steel machine panel, recessed rectangular panel divisions, rows of vent louvres, and a glowing cyan conduit channel set into it',
};

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/**
 * The rest of the pipeline reads plates with `Plate.fromPNG`, so anything a
 * provider hands back has to arrive as a PNG. Most return one already; the
 * keyless endpoint only speaks JPEG, so transcode by magic bytes rather than
 * by trusting a content-type header.
 */
function toPNG(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return buf;
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const { width, height, data } = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    const png = new PNG({ width, height });
    data.copy ? data.copy(png.data) : png.data.set(data);
    return PNG.sync.write(png);
  }
  throw new Error('provider returned neither PNG nor JPEG');
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

const PROVIDERS = {
  openai: {
    env: 'OPENAI_API_KEY',
    async generate(prompt, key) {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', n: 1 }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = await res.json();
      const b64 = json.data?.[0]?.b64_json;
      if (b64) return Buffer.from(b64, 'base64');
      const url = json.data?.[0]?.url;
      if (!url) throw new Error('OpenAI returned no image');
      return Buffer.from(await (await fetch(url)).arrayBuffer());
    },
  },

  replicate: {
    env: 'REPLICATE_API_TOKEN',
    async generate(prompt, key) {
      const create = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, Prefer: 'wait' },
        body: JSON.stringify({ input: { prompt, aspect_ratio: '1:1', output_format: 'png', num_outputs: 1 } }),
      });
      if (!create.ok) throw new Error(`Replicate ${create.status}: ${(await create.text()).slice(0, 300)}`);
      let pred = await create.json();
      // `Prefer: wait` usually returns finished, but poll if it did not.
      for (let i = 0; i < 60 && !['succeeded', 'failed', 'canceled'].includes(pred.status); i++) {
        await new Promise((r) => setTimeout(r, 1500));
        pred = await (await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${key}` } })).json();
      }
      if (pred.status !== 'succeeded') throw new Error(`Replicate ${pred.status}: ${pred.error ?? ''}`);
      const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
      return Buffer.from(await (await fetch(url)).arrayBuffer());
    },
  },

  stability: {
    env: 'STABILITY_API_KEY',
    async generate(prompt, key) {
      const form = new FormData();
      form.append('prompt', prompt);
      form.append('output_format', 'png');
      form.append('aspect_ratio', '1:1');
      const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, Accept: 'image/*' },
        body: form,
      });
      if (!res.ok) throw new Error(`Stability ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return Buffer.from(await res.arrayBuffer());
    },
  },

  /**
   * Keyless fallback. No account, no token — a plain GET whose path is the
   * prompt. It is rate limited and occasionally drops a request, hence the
   * spacing and the retries; it also silently clamps above 768px, so ask for
   * exactly that and let the coherence pass resample.
   */
  pollinations: {
    env: null,
    spacing: 6000,
    async generate(prompt, _key, seed = 1) {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
        + `?width=768&height=768&seed=${seed}&nologo=true&private=true&safe=false`;
      let last;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 4000 * attempt));
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
          if (!res.ok) { last = new Error(`Pollinations ${res.status}`); continue; }
          const buf = Buffer.from(await res.arrayBuffer());
          // A rate-limit page comes back 200 with an HTML or near-empty body.
          if (buf.length < 4096) { last = new Error(`Pollinations returned ${buf.length} bytes`); continue; }
          return buf;
        } catch (err) {
          last = err;
        }
      }
      throw last ?? new Error('Pollinations failed');
    },
  },
};

function pickProvider() {
  const forced = flag('provider');
  if (forced) {
    const p = PROVIDERS[forced];
    if (!p) throw new Error(`Unknown provider "${forced}". Options: ${Object.keys(PROVIDERS).join(', ')}`);
    if (p.env && !process.env[p.env]) throw new Error(`${forced} selected but ${p.env} is not set.`);
    return [forced, p, p.env ? process.env[p.env] : null];
  }
  for (const [name, p] of Object.entries(PROVIDERS)) {
    if (p.env && process.env[p.env]) return [name, p, process.env[p.env]];
  }
  return ['pollinations', PROVIDERS.pollinations, null];
}

// ---------------------------------------------------------------------------

const [providerName, provider, key] = pickProvider();
const names = (ONLY || Object.keys(MATERIALS)).filter((n) => {
  if (!MATERIALS[n]) { console.warn(`[raw] unknown material "${n}"`); return false; }
  return true;
});

fs.mkdirSync(RAW_DIR, { recursive: true });
console.log(`[raw] provider: ${providerName}  materials: ${names.length}`);
if (providerName === 'pollinations') {
  console.log('[raw] keyless endpoint — paced to stay inside its rate limit, so this takes a few minutes.');
}

let ok = 0, skipped = 0, failed = 0;

const WORKERS = Number(flag('workers', '4'));

async function generateOne(name) {
  const out = path.join(RAW_DIR, `${name}.png`);
  if (CANDIDATES === 1 && fs.existsSync(out) && !FORCE) {
    console.log(`[raw] ${name.padEnd(16)} exists (use --force)`);
    skipped++;
    return;
  }
  const prompt = `${FRAME} Subject: ${MATERIALS[name]}. ${STYLE} ${RULES}`;
  // Seed off the name so a re-run reproduces the same plates rather than
  // quietly redrawing half the world's materials.
  const base = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 100000;
  let got = 0;
  for (let c = 0; c < CANDIDATES; c++) {
    const dest = CANDIDATES === 1 ? out : path.join(RAW_DIR, `${name}__${c}.png`);
    if (fs.existsSync(dest) && !FORCE) { got++; continue; }
    if (provider.spacing) await new Promise((r) => setTimeout(r, provider.spacing));
    try {
      const buf = toPNG(await provider.generate(prompt, key, (base + c * 7919) % 100000));
      fs.writeFileSync(dest, buf);
      got++;
    } catch (err) {
      console.error(`[raw] ${name.padEnd(16)} candidate ${c} FAILED — ${err.message}`);
    }
  }
  if (got) { console.log(`[raw] ${name.padEnd(16)} ${got}/${CANDIDATES}`); ok++; }
  else failed++;
}

// A small worker pool over the material list. Each worker takes the next
// material off the queue, so a slow material never blocks the others.
const queue = [...names];
await Promise.all(Array.from({ length: Math.min(WORKERS, queue.length) }, async () => {
  while (queue.length) await generateOne(queue.shift());
}));

console.log(`\n[raw] ${ok} generated, ${skipped} skipped, ${failed} failed → assets/raw/`);
if (ok > 0) console.log('[raw] now run: npm run textures');
process.exit(failed > 0 && ok === 0 ? 1 : 0);
