/**
 * Turn cached concept views into a mesh.
 *
 *   node tools/genmesh.mjs vesna --textured   # PBR maps, 270s of GPU
 *   node tools/genmesh.mjs vesna              # geometry only, 90s
 *   node tools/genmesh.mjs vesna --anon       # the anonymous pool, metered apart
 *   node tools/genmesh.mjs vesna --front-only # ignore the other views
 *
 * The concept art step is deliberately not repeated here. Images are free and
 * GPU seconds are not, and a T-pose reference that came out right is worth
 * keeping — so views are read from `assets/concepts/` and only the mesh is
 * generated.
 *
 * Views isolated by `isolate.mjs` are preferred over the raw concepts when they
 * exist, because a backdrop that reads as a floor becomes floor geometry.
 *
 * Multiple views only help when they are the same character: these concepts came
 * from separate prompts and the pair disagrees about sleeves and hair colour, so
 * `--front-only` exists for the common case where the extra view would be fed to
 * the reconstruction as evidence and blend two outfits into one mesh.
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
const subject = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--attempt') ?? 'vesna';
const textured = args.includes('--textured');
const attempt = Number(args[args.indexOf('--attempt') + 1] ?? 0) || 0;
const anonymous = args.includes('--anon');
const frontOnly = args.includes('--front-only');

const concepts = path.join(root, 'assets', 'concepts');
// The alpha matte first. White is not nothing: the reconstruction turns a large flat pale
// region into a surface, which is where the sheet behind the fence and the shard beside the
// temple came from, and every rule written to delete those afterwards has also deleted
// something real. A cut-out says "there is nothing here" in a way the model understands — and
// `removeBackground` goes off with it, because there is no background left to remove.
const pick = (stem) => ['-cut.png', '-clean.png', '.png', '.jpg']
  .map((suffix) => path.join(concepts, stem + suffix)).find((p) => fs.existsSync(p)) ?? null;

const front = pick(`${subject}-front`);
const back = frontOnly ? null : pick(`${subject}-back`);
if (!front) {
  say(`\x1b[31mFAIL\x1b[0m — no concept views for ${subject} in ${path.relative(root, concepts)}.`);
  process.exit(1);
}

const source = anonymous ? null : loadToken();
if (anonymous) delete process.env.HF_TOKEN;

// Raw output lands in `godot/assets/models/raw/`, which carries a `.gdignore`
// so the engine never imports it. What comes off the Space is not a game asset:
// it is unrigged, at arbitrary scale, 40,000 triangles, and for a character it
// is only the input to `rig_character.py`. Everything Godot does import from
// `models/` is something the game actually ships.
const out = path.join(root, 'godot', 'assets', 'models', 'raw',
  `${subject}${textured ? '' : '-shape'}.glb`);

say(`\x1b[1mGenerating ${subject}\x1b[0m`);
say(`  views     ${path.basename(front)}${back ? ` + ${path.basename(back)}` : ''}`);
say(`  endpoint  ${textured ? '/generation_all (PBR, 270s GPU)' : '/shape_generation (geometry, 90s GPU)'}`);
say(`  pool      ${anonymous ? 'anonymous' : (source ? `authenticated, token from ${source}` : 'anonymous — no token found')}`);

try {
  // `--attempt N` moves the reconstruction's seed. The default is fixed so a rebuild is the
  // same mesh, which is right until the mesh is wrong: the marble temple came back as two
  // sheets of backdrop and nothing else, and asking again produced the same two sheets. Same
  // lesson as the concept views, one stage later.
  const result = await generateMesh({
    front, back, octree: 256, steps: 30, textured,
    seed: 1234 + attempt * 7919,
    removeBackground: !front.endsWith('-cut.png'),
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
  say('      then, for a character:');
  say('      blender -b -noaudio --python tools/blender/rig_character.py -- \\');
  say(`          --raw ${path.relative(root, out)} \\`);
  say(`          --out godot/assets/models/${subject}.glb --height 1.66 --faces 12000`);
} catch (err) {
  if (err instanceof QuotaError) {
    say();
    say('\x1b[33mGPU quota exhausted.\x1b[0m The Space said:');
    say(`  ${String(err.message).replace(/\s+/g, ' ').slice(0, 240)}`);
    say();
    say('--anon does not help: the anonymous pool refuses the same call just as');
    say('fast, so this is the Space\u2019s reservation and not the account\u2019s. Drop');
    say('--textured to ask for 90s instead of 270s, or wait and ask again.');
    process.exit(2);
  }
  say(`\x1b[31mFAIL\x1b[0m — ${err.message}`);
  process.exit(1);
}
