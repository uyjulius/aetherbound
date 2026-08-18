/**
 * Load the exported Godot build in a real browser and prove it started.
 *
 *   node tools/web-smoke.mjs [--dir build/web] [--headed] [--port 5178] [--timeout 180]
 *   node tools/web-smoke.mjs --url https://aetherbound.uy.sg/godot/
 *
 * With `--url` it checks a deployed build instead of a local export, which is
 * the only way to catch what only production gets wrong: a missing content type
 * on the wasm, a path that works from a directory and not from a subpath, a
 * stale cache. The counts are still compared against the local
 * `godot/data/manifest.json`, so run it against a URL built from this commit.
 *
 * A Godot web build that cannot find its resources still serves HTML, still
 * paints a canvas and still returns 200 for everything — so "the page loaded"
 * is not evidence. This waits for the readiness line the title screen prints:
 *
 *     AETHERBOUND_READY cast=14 tables=11 renderer=gl_compatibility
 *
 * and checks the counts in it against `godot/data/manifest.json`. A hollow pack
 * boots to a screen that looks fine and reports cast=0.
 *
 * Chromium is launched with SwiftShader because CI has no GPU and Godot needs
 * WebGL 2 to start at all. That makes the run slow — a minute or two — and is
 * the reason the timeouts here are generous rather than tight.
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const dir = path.resolve(root, flag('dir', 'build/web'));
const remote = flag('url', null);
const port = Number(flag('port', 5178));
const headed = args.includes('--headed');
// Generous, and adjustable: compiling 40 MB of wasm under a software rasteriser
// takes a minute on this machine and longer on a shared CI runner. A timeout
// that fails on a slow runner teaches people to re-run the job, which is how a
// real failure gets waved through.
const READY_TIMEOUT_MS = Number(flag('timeout', 180)) * 1000;

// `application/wasm` is not optional: the browser streams and compiles the
// module from the response, and with the wrong content type it refuses and the
// build fails with an error about the magic number that has nothing to do with
// the file.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.pck': 'application/octet-stream',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`[${ok ? '  ok  ' : ' FAIL '}] ${name}${detail ? `  — ${detail}` : ''}`);
};

if (!remote && !fs.existsSync(path.join(dir, 'index.html'))) {
  console.log(`[ FAIL ] no export in ${path.relative(root, dir)} — run node tools/export-web.mjs`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'godot', 'data', 'manifest.json'), 'utf8'));

const server = remote ? null : http.createServer(async (req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(dir, rel);
  if (!file.startsWith(dir)) {
    res.writeHead(400).end('bad path');
    return;
  }
  const stat = await fsp.stat(file).catch(() => null);
  if (!stat?.isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
});
if (server) await new Promise((resolve) => server.listen(port, resolve));
const target = remote ?? `http://localhost:${port}/`;

const browser = await chromium.launch({
  headless: !headed,
  // The full Chromium, not `chrome-headless-shell`: the shell has no WebGL at
  // all, and Godot exits before running a line of its own code without a WebGL 2
  // context. Playwright picks the shell by default for headless runs.
  channel: 'chromium',
  args: [
    // No GPU in CI. Without a software rasteriser Godot cannot create a WebGL 2
    // context and exits before any of its own code runs.
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
const warnings = [];
const badResponses = [];
let ready = null;

// Godot writes its own warnings to stderr, which the browser reports as
// console.error — so the two have to be told apart by their text rather than by
// the console level. Both are reported; both fail the run. A build that always
// prints a warning trains everyone to ignore the console, which is where the
// next real error will appear.
page.on('console', (message) => {
  const text = message.text();
  if (text.includes('AETHERBOUND_READY')) ready = text.trim();
  if (message.type() !== 'error') return;
  if (/^\s*WARNING:/.test(text)) warnings.push(text.split('\n')[0].trim());
  else errors.push(text);
});
page.on('pageerror', (err) => errors.push(String(err)));
page.on('response', (response) => {
  if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
});

console.log(`\x1b[1mSmoke-testing the ${remote ? 'deployed' : 'exported'} build\x1b[0m`);
if (!remote) console.log(`  dir       ${path.relative(root, dir)}`);
console.log(`  url       ${target}`);
console.log();

await page.goto(target, { waitUntil: 'domcontentloaded' });

const started = Date.now();
try {
  await page.waitForFunction(
    () => Boolean(document.querySelector('canvas')), null, { timeout: 60_000 });
  check('the page provides a canvas', true);
} catch {
  check('the page provides a canvas', false, 'no <canvas> appeared in 60s');
}

while (!ready && Date.now() - started < READY_TIMEOUT_MS) {
  await page.waitForTimeout(500);
}

check('the build reaches its readiness line', Boolean(ready),
  ready ?? `nothing in ${READY_TIMEOUT_MS / 1000}s`);

if (ready) {
  const read = (key) => Number(ready.match(new RegExp(`${key}=(\\d+)`))?.[1] ?? -1);
  check('the cast came out of the exported tables',
    read('cast') === manifest.cast_order,
    `reported ${read('cast')}, manifest says ${manifest.cast_order}`);
  check('every table is accounted for', read('tables') === 11, `reported ${read('tables')}`);
  const renderer = ready.match(/renderer=(\S+)/)?.[1];
  check('the browser build runs Compatibility', renderer === 'gl_compatibility',
    `renderer=${renderer}`);
}

check('nothing 404s', badResponses.length === 0, badResponses.slice(0, 3).join('; '));
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
check('no engine warnings', warnings.length === 0,
  warnings.slice(0, 3).map((w) => w.replace(/^WARNING:\s*/, '')).join(' | '));

const shot = path.join(root, '.renders',
  remote ? 'godot-web-title-live.png' : 'godot-web-title.png');
fs.mkdirSync(path.dirname(shot), { recursive: true });
await page.screenshot({ path: shot });
console.log(`\n  screenshot ${path.relative(root, shot)}`);

await browser.close();
server?.close();

console.log();
if (failures) {
  console.log(`\x1b[31mFAIL\x1b[0m — ${failures} check(s) failed; this build must not deploy.`);
  process.exit(1);
}
console.log('\x1b[32mOK\x1b[0m — the exported build boots in a browser and finds its data.');
