/**
 * Turn cached concept views into a mesh.
 *
 * Destination: tools/genmesh.mjs in the ff repo. **This supersedes the file
 * already committed there**, which calls the old twelve-argument client.
 *
 *   node tools/genmesh.mjs vesna --textured   # PBR maps, 270s of GPU
 *   node tools/genmesh.mjs vesna              # geometry only, 90s
 *   node tools/genmesh.mjs vesna --anon       # the anonymous pool, metered apart
 *
 * The concept art step is deliberately not repeated here. Images are free and
 * GPU seconds are not, and a T-pose reference that came out right is worth
 * keeping — so views are read from `assets/concepts/` and only the mesh is
 * generated.
 *
 * `HF_TOKEN` comes from the environment, falling back to the Kingdom Hearts
 * repo's `.env` where it currently lives. Without it the call lands on the
 * anonymous ZeroGPU pool, which is metered separately from the account's — not
 * a degraded fallback but a genuinely useful second allowance.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMesh, downloadMesh, QuotaError } from './hyspace.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

function loadToken() {
  if (process.env.HF_TOKEN) return 'the environment';
  const envFile = path.join(process.env.HOME ?? '', 'Documents', 'kingdom-hearts', '.env');
  if (!fs.existsSync(envFile)) return null;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key.trim() === 'HF_TOKEN' && rest.length) {
      const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (value) { process.env.HF_TOKEN = value; return 'kingdom-hearts/.env'; }
    }
  }
  return null;
}

const args = process.argv.slice(2);
const subject = args.find((a) => !a.startsWith('--')) ?? 'vesna';
const textured = args.includes('--textured');
const anonymous = args.includes('--anon');

const concepts = path.join(root, 'assets', 'concepts');
const pick = (stem) => ['.png', '.jpg']
  .map((ext) => path.join(concepts, stem + ext)).find((p) => fs.existsSync(p)) ?? null;

const front = pick(`${subject}-front`);
const back = pick(`${subject}-back`);
if (!front) {
  say(`\x1b[31mFAIL\x1b[0m — no concept views for ${subject} in ${path.relative(root, concepts)}.`);
  process.exit(1);
}

const source = anonymous ? null : loadToken();
if (anonymous) delete process.env.HF_TOKEN;

const out = path.join(root, 'godot', 'assets', 'models',
  `${subject}${textured ? '' : '-shape'}.glb`);

say(`\x1b[1mGenerating ${subject}\x1b[0m`);
say(`  views     ${path.basename(front)}${back ? ` + ${path.basename(back)}` : ''}`);
say(`  endpoint  ${textured ? '/generation_all (PBR, 270s GPU)' : '/shape_generation (geometry, 90s GPU)'}`);
say(`  pool      ${anonymous ? 'anonymous' : (source ? `authenticated, token from ${source}` : 'anonymous — no token found')}`);

try {
  const result = await generateMesh({
    front, back, octree: 256, steps: 30, textured,
  });

  // Keep the raw payload before touching the network again. A GPU call is 90
  // seconds of a daily allowance, and losing its result to a bad download URL
  // means spending another one just to see the response shape.
  const raw = path.join(root, 'assets', 'concepts', `${subject}-last-result.json`);
  fs.writeFileSync(raw, JSON.stringify(result, null, 1));

  const { bytes } = await downloadMesh(result, out);
  say(`  \x1b[32mwrote\x1b[0m     ${path.relative(root, out)} (${(bytes / 1e6).toFixed(1)} MB)`);
  say();
  say(`Next: python3 tools/fix_glb.py ${path.relative(root, out)}`);
  say('      (Hunyuan3D labels its JPEG textures image/png; Godot believes the label)');
} catch (err) {
  if (err instanceof QuotaError) {
    say();
    say('\x1b[33mGPU quota exhausted.\x1b[0m The Space said:');
    say(`  ${String(err.message).replace(/\s+/g, ' ').slice(0, 240)}`);
    say();
    say('The anonymous pool is metered separately — try --anon, and drop');
    say('--textured to ask for 90s instead of 270s.');
    process.exit(2);
  }
  say(`\x1b[31mFAIL\x1b[0m — ${err.message}`);
  process.exit(1);
}
