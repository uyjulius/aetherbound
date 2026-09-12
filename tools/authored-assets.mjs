/**
 * Guard the Godot build's authored-asset promise.
 *
 * Aetherbound may place, scale, tint, and animate imported models at runtime. It must not
 * manufacture world geometry there. Temporary spell meshes are deliberately separate: a
 * lightning arc exists for a fraction of a second and is an effect, not generated content.
 *
 *   node tools/authored-assets.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const godot = path.join(root, 'godot');
const scripts = path.join(godot, 'scripts');
const say = (line = '') => console.log(line);
const failures = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

// These APIs create geometry. They are allowed only in the spell/particle renderer. The
// scenery renderer uses MultiMesh to draw imported GLBs efficiently; MultiMesh instances a
// mesh and does not create one, so it is intentionally absent from this list.
const meshApis = [
  'ArrayMesh', 'BoxMesh', 'CapsuleMesh', 'CylinderMesh', 'ImmediateMesh', 'PlaneMesh',
  'PrismMesh', 'QuadMesh', 'SphereMesh', 'SurfaceTool', 'TextMesh', 'TubeTrailMesh',
];
const meshConstructor = new RegExp(`\\b(?:${meshApis.join('|')})\\.(?:new|create_from)\\s*\\(`, 'g');
const generatedTexture = /\b(?:FastNoiseLite|NoiseTexture2D|NoiseTexture3D)\.new\s*\(/g;

let gdFiles = 0;
let effectUses = 0;
for (const file of walk(scripts).filter((name) => name.endsWith('.gd'))) {
  gdFiles++;
  const relative = path.relative(root, file).split(path.sep).join('/');
  const source = fs.readFileSync(file, 'utf8');
  for (const expression of [meshConstructor, generatedTexture]) {
    expression.lastIndex = 0;
    for (const match of source.matchAll(expression)) {
      const line = source.slice(0, match.index).split('\n').length;
      if (relative.startsWith('godot/scripts/fx/')) effectUses++;
      else failures.push(`${relative}:${line}: runtime-generated mesh or texture (${match[0]})`);
    }
  }
}

// The shipping credits manifest is generated from the model manifests. Requiring every entry
// to point back to its concept image catches an accidentally downloaded or untracked GLB even
// when the file itself loads perfectly.
const creditsFile = path.join(godot, 'data', 'credits.json');
const entries = JSON.parse(fs.readFileSync(creditsFile, 'utf8')).entries ?? [];
const kinds = new Map();
for (const entry of entries) {
  kinds.set(entry.kind, (kinds.get(entry.kind) ?? 0) + 1);
  const label = `${entry.kind ?? '?'}:${entry.title ?? '?'}`;
  if (entry.licence !== 'generated' || entry.author !== 'generated for this game') {
    failures.push(`${label}: provenance is ${entry.author ?? '?'} / ${entry.licence ?? '?'}`);
  }
  if (!String(entry.source ?? '').startsWith('assets/concepts/')) {
    failures.push(`${label}: concept source is not recorded`);
  } else if (!fs.existsSync(path.join(root, entry.source))) {
    failures.push(`${label}: concept source is missing (${entry.source})`);
  }
}

for (const required of ['party', 'crowd', 'bestiary', 'scenery']) {
  if (!kinds.has(required)) failures.push(`credits: no ${required} models`);
}

say('\x1b[1mAuthored assets: no runtime-generated world geometry\x1b[0m');
say('─'.repeat(58));
say(`  runtime          ${gdFiles} scripts checked; ${effectUses} transient FX mesh uses`);
say(`  model provenance ${entries.length} generated entries; `
  + [...kinds].map(([kind, count]) => `${count} ${kind}`).join(', '));

if (failures.length) {
  say();
  say(`\x1b[31mFAIL\x1b[0m — ${failures.length} authored-asset problem(s):`);
  for (const failure of failures.slice(0, 20)) say(`  ${failure}`);
  if (failures.length > 20) say(`  … and ${failures.length - 20} more`);
  process.exit(1);
}

say();
say('\x1b[32mOK\x1b[0m — every shipping 3D model is generated and traceable to its concept view;');
say('   runtime-created geometry is confined to short-lived spell and particle effects.');
