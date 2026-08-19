/**
 * Copy the reference's character and creature models into the Godot project.
 *
 *   node tools/sync-models.mjs
 *
 * The same meshes, not a second set. Fourteen characters play as nine models and two hundred
 * species as thirty-six, both by tables the reference authors — so the port has to have the
 * same files under the same names or `modelFor` and `modelForLook` cannot agree about who is
 * on screen. Godot can only load what is inside `res://`, so they are copied rather than
 * shared, and `tools/models-parity.mjs` holds the copies against the originals byte for byte.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

let copied = 0;
let same = 0;
let removed = 0;
let bytes = 0;
for (const [from, to] of [
  // The cast goes to its own directory rather than into `assets/models`, which already holds
  // the generated lantern, well and rigged Vesna from the asset pipeline.
  [path.join(root, 'assets', 'models'), path.join(root, 'godot', 'assets', 'cast')],
  [path.join(root, 'assets', 'monsters'), path.join(root, 'godot', 'assets', 'monsters')],
]) {
  fs.mkdirSync(to, { recursive: true });
  const wanted = fs.readdirSync(from).filter((n) => n.endsWith('.glb'));
  for (const name of wanted) {
    const source = path.join(from, name);
    const target = path.join(to, name);
    bytes += fs.statSync(source).size;
    if (fs.existsSync(target) && digest(source) === digest(target)) { same++; continue; }
    fs.copyFileSync(source, target);
    copied++;
  }
  for (const name of fs.readdirSync(to).filter((n) => n.endsWith('.glb'))) {
    if (!wanted.includes(name)) { fs.rmSync(path.join(to, name)); removed++; }
  }
}
console.log(`\x1b[32mOK\x1b[0m — ${copied} copied, ${same} already identical`
  + `${removed ? `, ${removed} orphan(s) removed` : ''} `
  + `(${(bytes / 1024 / 1024).toFixed(1)} MB of models).`);
