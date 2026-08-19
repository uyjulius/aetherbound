/**
 * Copy the reference's texture plates into the Godot project.
 *
 *   node tools/sync-textures.mjs
 *
 * The port's ground, walls and roofs are surfaced with the same twenty-one plates the
 * reference uses — made by the image pipeline in `tools/gen-textures.mjs`, not by either
 * game — because two sets of materials is two worlds. Godot can only load what is inside
 * `res://`, so they are copied rather than shared, and `tools/scenery-parity.mjs` holds the
 * copies against the originals byte for byte so the duplicate cannot quietly drift.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const from = path.join(root, 'assets', 'textures');
const to = path.join(root, 'godot', 'assets', 'textures');
fs.mkdirSync(to, { recursive: true });

let copied = 0;
let same = 0;
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const name of fs.readdirSync(from).filter((n) => n.endsWith('.png'))) {
  const source = path.join(from, name);
  const target = path.join(to, name);
  if (fs.existsSync(target) && digest(source) === digest(target)) { same++; continue; }
  fs.copyFileSync(source, target);
  copied++;
}
// And the other way: a plate that was renamed upstream leaves an orphan here, which Godot
// would keep importing and the export would keep shipping.
let removed = 0;
for (const name of fs.readdirSync(to).filter((n) => n.endsWith('.png'))) {
  if (!fs.existsSync(path.join(from, name))) {
    fs.rmSync(path.join(to, name));
    removed++;
  }
}
console.log(`\x1b[32mOK\x1b[0m — ${copied} copied, ${same} already identical`
  + `${removed ? `, ${removed} orphan(s) removed` : ''}.`);
