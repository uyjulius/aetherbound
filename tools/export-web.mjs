/**
 * Export the Godot project for the browser, and refuse to believe it worked.
 *
 *   node tools/export-web.mjs [--out build/web] [--debug]
 *
 * A Godot export is unusually good at succeeding while producing something
 * unusable: a preset with the wrong filter writes an `index.pck` with no
 * resources in it, an interrupted run leaves the wasm truncated, and both cases
 * exit zero with a cheerful progress log. So the export is followed by checks on
 * what actually landed — every artefact present, the pack large enough to
 * contain a game, and the wasm starting with the WebAssembly magic number.
 *
 * Sizes are reported gzipped as well as raw, because that is what a visitor
 * downloads: GitHub Pages compresses on the fly, and the 40 MB wasm is about a
 * quarter of that over the wire. Reporting only the raw number invites an
 * optimisation nobody needs.
 *
 * The web build runs the Compatibility renderer and a single-threaded template —
 * see `docs/superpowers/specs/2026-08-18-godot-shell-and-deploy-design.md` for
 * why both are forced rather than chosen.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const outDir = path.resolve(root, flag('out', 'build/web'));
const debug = args.includes('--debug');
const godot = process.env.GODOT ?? 'godot';
const say = (s = '') => console.log(s);

/** Artefacts the export must produce, with the smallest size that is plausible. */
const REQUIRED = [
  // A pack under a megabyte means the preset exported no resources — which is
  // what a wrong `export_filter` looks like, and it boots to a black canvas.
  ['index.pck', 1_000_000],
  ['index.wasm', 5_000_000],
  ['index.js', 100_000],
  ['index.html', 1_000],
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

say(`\x1b[1mExporting the Godot web build\x1b[0m`);
say(`  preset    Web (${debug ? 'debug' : 'release'}, single-threaded, Compatibility)`);
say(`  out       ${path.relative(root, outDir)}`);

// Import first, explicitly, the way CI does. An export uses whatever is in `godot/.godot`,
// and that cache does not notice a file replaced underneath it by a build script: the first
// renders of the generated props in this project were the *bought* models, because the meshes
// had been overwritten and nothing had re-imported them. CI is safe by accident — it checks out
// a tree with no cache at all — and a local export is not.
const imported = spawnSync(godot, ['--headless', '--path', path.join(root, 'godot'), '--import'],
  { encoding: 'utf8' });
if (imported.error) {
  say(`\x1b[31mFAIL\x1b[0m — could not run ${godot}: ${imported.error.message}`);
  say('Set GODOT to the binary if it is not on PATH.');
  process.exit(1);
}
if (imported.status !== 0) {
  say(`\x1b[31mFAIL\x1b[0m — the import pass exited ${imported.status}.`);
  say(`  ${String(imported.stderr ?? '').split('\n').slice(-6).join('\n  ')}`);
  process.exit(1);
}

const target = path.join(outDir, 'index.html');
const run = spawnSync(godot, [
  '--headless', '--path', path.join(root, 'godot'),
  debug ? '--export-debug' : '--export-release', 'Web', target,
], { encoding: 'utf8' });

if (run.error) {
  say(`\x1b[31mFAIL\x1b[0m — could not run ${godot}: ${run.error.message}`);
  say('Set GODOT to the binary if it is not on PATH.');
  process.exit(1);
}

// Godot reports export problems on stderr and still exits zero often enough that
// the status alone is not a verdict; the artefact checks below are.
const log = `${run.stdout ?? ''}${run.stderr ?? ''}`;
const errors = log.split('\n').filter((line) => /^(ERROR|SCRIPT ERROR|USER ERROR)/.test(line));
if (run.status !== 0) {
  say(`\x1b[31mFAIL\x1b[0m — export exited ${run.status}`);
  say(log.split('\n').slice(-25).join('\n'));
  process.exit(1);
}
if (errors.length) {
  say(`\x1b[31mFAIL\x1b[0m — the export logged ${errors.length} error(s):`);
  for (const line of errors.slice(0, 10)) say(`  ${line}`);
  process.exit(1);
}

say();
let failed = false;
let total = 0;
for (const [name, floor] of REQUIRED) {
  const file = path.join(outDir, name);
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  const gz = size ? zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length : 0;
  total += size;
  const ok = size >= floor;
  if (!ok) failed = true;
  say(`  ${ok ? '\x1b[32mok\x1b[0m  ' : '\x1b[31mFAIL\x1b[0m'} ${name.padEnd(11)}`
    + `${(size / 1e6).toFixed(1).padStart(6)} MB  ${(gz / 1e6).toFixed(1).padStart(6)} MB gzipped`
    + `${ok ? '' : `  — under the ${(floor / 1e6).toFixed(1)} MB floor`}`);
}

// The magic number, because a truncated or half-written wasm is a 200 response
// that fails at instantiation, and that error arrives in the browser rather
// than here.
const wasm = path.join(outDir, 'index.wasm');
if (fs.existsSync(wasm)) {
  const magic = Buffer.alloc(4);
  const fd = fs.openSync(wasm, 'r');
  fs.readSync(fd, magic, 0, 4, 0);
  fs.closeSync(fd);
  if (magic.toString('hex') !== '0061736d') {
    say(`  \x1b[31mFAIL\x1b[0m index.wasm does not start with the WebAssembly magic number`);
    failed = true;
  }
}

say();
if (failed) {
  say('\x1b[31mThe export produced files but not a game.\x1b[0m');
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${(total / 1e6).toFixed(1)} MB in ${path.relative(root, outDir)}`);
say(`Next: node tools/web-smoke.mjs --dir ${path.relative(root, outDir)}`);
