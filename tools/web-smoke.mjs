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
 *     AETHERBOUND_READY cast=14 tables=15 actions=12 renderer=gl_compatibility
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
// Counted from the data directory rather than from the manifest: the manifest
// lists what the *exporter* wrote, and `footprints.json` comes from the harvest
// instead, so the manifest is one short of what the port actually loads. Counting
// the files is the number the readiness line reports.
const TABLE_COUNT = fs.readdirSync(path.join(root, 'godot', 'data'))
  .filter((name) => name.endsWith('.json') && name !== 'manifest.json').length;
// Likewise from the exported bindings: the deployed build reports how many
// actions it installed, and an action that failed to resolve would show up here
// rather than as a control that does nothing.
const ACTION_COUNT = JSON.parse(
  fs.readFileSync(path.join(root, 'godot', 'data', 'input.json'), 'utf8')).actions.length;

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
let field = null;
let sceneStarted = null;
let sceneEnded = null;
let dialogueOpened = null;
let battleStarted = null;
let battleEnded = null;
let partyReady = null;
let mapEntered = null;
let talked = null;
let menuOpened = null;
let menuClosed = null;
const equipped = [];

// Godot writes its own warnings to stderr, which the browser reports as
// console.error — so the two have to be told apart by their text rather than by
// the console level. Both are reported; both fail the run. A build that always
// prints a warning trains everyone to ignore the console, which is where the
// next real error will appear.
page.on('console', (message) => {
  const text = message.text();
  // Every line, when asked. The page's own prints are the only window into a build
  // that is running but not doing what it should.
  if (process.env.WEB_SMOKE_VERBOSE) console.log(`    [page] ${text.split('\n')[0].slice(0, 160)}`);
  if (text.includes('AETHERBOUND_READY')) ready = text.trim();
  if (text.includes('FIELD_READY')) field = text.trim();
  if (text.includes('SCENE_START')) sceneStarted = text.trim();
  if (text.includes('DIALOGUE_OPEN')) dialogueOpened = text.trim();
  if (text.includes('PARTY_READY')) partyReady = text.trim();
  if (text.includes('MAP_ENTERED')) mapEntered = text.trim();
  if (text.includes('TALK ')) talked = text.trim();
  if (text.includes('MENU_OPEN')) menuOpened = text.trim();
  if (text.includes('MENU_CLOSED')) menuClosed = text.trim();
  if (text.includes('EQUIPPED ')) equipped.push(text.trim());
  if (text.includes('BATTLE_START')) battleStarted = text.trim();
  if (text.includes('BATTLE_END')) battleEnded = text.trim();
  if (text.includes('SCENE_END')) sceneEnded = text.trim();
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
  check('every table is accounted for', read('tables') === TABLE_COUNT,
    `reported ${read('tables')}, expected ${TABLE_COUNT}`);
  check('the input map was installed', read('actions') === ACTION_COUNT,
    `reported ${read('actions')}, expected ${ACTION_COUNT}`);
  const renderer = ready.match(/renderer=(\S+)/)?.[1];
  check('the browser build runs Compatibility', renderer === 'gl_compatibility',
    `renderer=${renderer}`);
}

// Through the front door and into the field diagnostic. A scene change is where
// a web build tends to fall over — a resource that resolved in the editor and not
// in the pack — and it is invisible from the title screen alone.
if (ready) {
  await page.locator('canvas').click({ position: { x: 40, y: 40 } });
  await page.keyboard.press('Enter');
  const waitedFrom = Date.now();
  while (!field && Date.now() - waitedFrom < 30_000) await page.waitForTimeout(250);
  check('the field diagnostic opens', Boolean(field), field ?? 'no FIELD_READY line in 30s');
  if (field) {
    const colliders = Number(field.match(/colliders=(\d+)/)?.[1] ?? 0);
    check('the field built a collision grid', colliders > 0, `${colliders} colliders`);
  }

  // The party the diagnostic starts with, against the one harvested from the
  // reference's New Game. Two numbers per character, and every one of them is a growth
  // curve plus a starting kit — which is most of what a fight is made of.
  const setupPath = path.join(root, 'tools', 'fixtures', 'battle-setup.json');
  if (partyReady && fs.existsSync(setupPath)) {
    const expected = JSON.parse(fs.readFileSync(setupPath, 'utf8')).party.members
      .filter((m) => m.active)
      .map((m) => `${m.id}:${m.hp}/${m.mp}`)
      .join(' ');
    const actual = partyReady.replace('PARTY_READY ', '');
    check('the starting party matches the reference', actual === expected,
      actual === expected ? actual : `port ${actual} · reference ${expected}`);
  }
  const shot = path.join(root, '.renders',
    remote ? 'godot-web-field-live.png' : 'godot-web-field.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot });

  // And into a scene. The scripted scenes are the largest part of the port and the
  // only way to know they *play* — rather than merely producing the right transcript
  // in a harness — is to start one in a browser and watch a line of dialogue arrive.
  if (field) {
    await page.keyboard.press('KeyV');
    const startedAt = Date.now();
    while (!sceneStarted && Date.now() - startedAt < 30_000) await page.waitForTimeout(200);
    check('a scripted scene starts', Boolean(sceneStarted), sceneStarted ?? 'no SCENE_START in 30s');
    // Photographed mid-scene, with a line on screen. Taken after the scene ends and
    // the picture is of an empty field, which is a poor way to prove a dialogue box
    // works.
    await page.waitForTimeout(1200);
    const sceneShot = path.join(root, '.renders',
      remote ? 'godot-web-scene-live.png' : 'godot-web-scene.png');
    await page.screenshot({ path: sceneShot });
    // Then the pages, turned with confirm, until the scene ends.
    for (let i = 0; i < 12 && !sceneEnded; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
    }
    check('the scene plays to the end', Boolean(sceneEnded),
      sceneEnded ?? 'no SCENE_END after twelve confirms');
    // The box has to have a rect. A dialogue box with a zero-sized one plays the whole
    // scene invisibly and every other check passes.
    const box = dialogueOpened?.match(/box=\(([\d.]+), ([\d.]+)\)/);
    check('the dialogue box has a rect', Boolean(box) && Number(box[1]) > 100,
      dialogueOpened ?? 'no DIALOGUE_OPEN line');

    // And a fight. The battle engine is compared against the reference fight for fight
    // in `battle-parity.mjs`; what this proves is that it can be *played* — gauges fill,
    // a command lands, and the fight resolves.
    await page.keyboard.press('KeyB');
    const battleFrom = Date.now();
    while (!battleStarted && Date.now() - battleFrom < 30_000) await page.waitForTimeout(200);
    check('a fight starts', Boolean(battleStarted), battleStarted ?? 'no BATTLE_START in 30s');
    if (battleStarted) {
      // Long enough for a gauge to fill and a command list to open, so the picture is of
      // a turn being taken rather than of two rats and a wait.
      await page.waitForTimeout(3500);
      const battleShot = path.join(root, '.renders',
        remote ? 'godot-web-battle-live.png' : 'godot-web-battle.png');
      await page.screenshot({ path: battleShot });
      // Attack with whoever is ready, until somebody wins. Two confirms per turn: the
      // command, then the target.
      for (let i = 0; i < 80 && !battleEnded; i++) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(180);
      }
      check('the fight resolves', Boolean(battleEnded), battleEnded ?? 'no BATTLE_END in 80 presses');
    }

    // The field menu, and the one screen in it that can be got wrong quietly: equip.
    // A menu that opens is easy; a menu that moves a sword from a hand into the bag and
    // back again without losing it is the part worth checking in a browser.
    await page.keyboard.press('KeyC');
    const menuFrom = Date.now();
    while (!menuOpened && Date.now() - menuFrom < 15_000) await page.waitForTimeout(200);
    check('the field menu opens', Boolean(menuOpened), menuOpened ?? 'no MENU_OPEN in 15s');
    if (menuOpened) {
      // It has to have something in it. An empty bag would make every list below pass by
      // being blank.
      const bag = menuOpened.match(/items=(\d+)/);
      check('the menu sees the party bag', Boolean(bag) && Number(bag[1]) > 0,
        menuOpened);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(root, '.renders',
        remote ? 'godot-web-menu-live.png' : 'godot-web-menu.png') });
      // Items, Magic, Equip: down twice, then in through the character list to the
      // weapon slot.
      for (const key of ['ArrowDown', 'ArrowDown', 'Enter', 'Enter', 'Enter']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(260);
      }
      await page.screenshot({ path: path.join(root, '.renders',
        remote ? 'godot-web-equip-live.png' : 'godot-web-equip.png') });
      // '(remove)' is the first row, so this takes the weapon off...
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      // ...and it should now be in the bag, offered back on the same slot.
      for (const key of ['Enter', 'ArrowDown', 'Enter']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(300);
      }
      check('a weapon comes off and goes back on', equipped.length >= 2
        && / weapon=-$/.test(equipped[0]) && !/ weapon=-$/.test(equipped[1]),
        equipped.length ? equipped.slice(0, 2).join(' | ') : 'no EQUIPPED lines');
      // Out of the menu the way a player leaves it — one press per screen, and it stops
      // as soon as the menu says it has closed. An escape too many belongs to the field,
      // which reads it as "back to the title" and would take the travel check with it.
      for (let i = 0; i < 6 && !menuClosed; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(260);
      }
      check('the menu closes when backed out of', Boolean(menuClosed),
        menuClosed ?? 'no MENU_CLOSED after six cancels');
    }

    // Then out of the village. Harrowmere's south bridge is an exit, and the party
    // spawns at the top of the map, so walking down far enough should change map — which
    // is the whole difference between a diagnostic and a world.
    for (let i = 0; i < 60 && !mapEntered; i++) {
      await page.keyboard.down('ArrowUp');
      await page.waitForTimeout(140);
      await page.keyboard.up('ArrowUp');
    }
    check('walking out of the map arrives somewhere', Boolean(mapEntered),
      mapEntered ?? 'no MAP_ENTERED after sixty steps');
    if (mapEntered) {
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(root, '.renders',
        remote ? 'godot-web-travel-live.png' : 'godot-web-travel.png') });
    }
  }
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
