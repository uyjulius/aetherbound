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
// Generous, because a screenshot forces a frame and a frame is now a world: on a CI runner
// with no GPU, painting 2,816 ground tiles, a shadow map and a sky through a software
// rasteriser took longer than Playwright's thirty-second default and failed the build twice.
page.setDefaultTimeout(120_000);

const errors = [];
const warnings = [];
const badResponses = [];
let ready = null;
let field = null;
const opened = new Set();
const doors = [];
let analytics = null;
const scenesRun = [];
const scenesEnded = [];
/** Everything the build said, most recent last, so a failing check can show its own context. */
const chatter = [];
let sceneBattle = null;
let sceneBattleEnd = null;
let sceneChest = null;
let creditsLine = null;
const taps = [];
let sceneStarted = null;
let sceneEnded = null;
let dialogueOpened = null;
let dialogues = 0;
let battleStarted = null;
let battleEnded = null;
let partyReady = null;
let mapEntered = null;
let talked = null;
let menuOpened = null;
let menuClosed = null;
let menuOpens = 0;
let menuCloses = 0;
let shopOpened = null;
let shopStock = null;
let shopClosed = null;
const bought = [];
const sold = [];
let innRest = null;
let innWoke = null;
let innDone = null;
let compared = null;
const scenery = [];
const crowd = [];
let stage = null;
const turns = [];
const actions = [];
const found = [];
let chest = null;
let chestDone = null;
let savePoint = null;
let boarded = null;
let landed = null;
let wiped = null;
let rolledBack = null;
const configured = [];
let journalOpen = null;
let audioReady = null;
const music = [];
let titleReady = null;
let titleChoice = null;
let loaded = null;
let resumed = null;
const written = [];
// Gil, as last reported by any line that mentions it — the inn's bill is checked
// against what the party had a moment before rather than against the inn's own word.
let lastGold = NaN;
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
  if (text.includes('FIELD_READY')) {
    field = text.trim();
    const id = text.match(/map=(\S+)/)?.[1];
    if (id) opened.add(id);
  }
  if (text.trim()) {
    chatter.push(text.trim().split('\n')[0].slice(0, 120));
    if (chatter.length > 400) chatter.shift();
  }
  if (text.includes('SCENE_START')) { sceneStarted = text.trim(); scenesRun.push(text.trim()); }
  if (text.includes('DIALOGUE_OPEN')) { dialogueOpened = text.trim(); dialogues++; }
  if (text.includes('PARTY_READY')) partyReady = text.trim();
  if (text.includes('MAP_ENTERED')) mapEntered = text.trim();
  if (text.includes('TALK ')) talked = text.trim();
  if (text.includes('MENU_OPEN')) { menuOpened = text.trim(); menuOpens++; }
  if (text.includes('MENU_CLOSED')) { menuClosed = text.trim(); menuCloses++; }
  if (text.includes('SHOP_OPEN')) shopOpened = text.trim();
  if (/^SHOP \S+ stock=/.test(text.trim())) shopStock = text.trim();
  if (text.includes('SHOP_CLOSED')) shopClosed = text.trim();
  if (text.includes('BOUGHT ')) bought.push(text.trim());
  if (text.includes('SOLD ')) sold.push(text.trim());
  if (text.includes('INN_REST')) innRest = text.trim();
  if (text.includes('INN_WOKE')) innWoke = text.trim();
  if (text.includes('INN_DONE')) innDone = text.trim();
  if (text.includes('SHOP_COMPARE')) compared = text.trim();
  if (/^SCENERY /.test(text.trim())) scenery.push(text.trim());
  if (/^SCENE_BATTLE /.test(text.trim())) sceneBattle = text.trim();
  if (/^SCENE_BATTLE_END /.test(text.trim())) sceneBattleEnd = text.trim();
  if (/^SCENE_CHEST /.test(text.trim())) sceneChest = text.trim();
  if (/^CREDITS /.test(text.trim())) creditsLine = text.trim();
  if (/^DOORS /.test(text.trim())) doors.push(text.trim());
  if (/^CROWD /.test(text.trim())) crowd.push(text.trim());
  if (/^STAGE /.test(text.trim())) stage = text.trim();
  if (/^TURN /.test(text.trim())) turns.push(text.trim());
  if (/^ACTION /.test(text.trim())) actions.push(text.trim());
  if (/^CHEST /.test(text.trim())) chest = text.trim();
  if (/^CHEST_DONE /.test(text.trim())) chestDone = text.trim();
  if (/^SAVE_POINT /.test(text.trim())) savePoint = text.trim();
  if (/^TAP /.test(text.trim())) taps.push(text.trim().split(' ')[1]);
  if (/^BOARDED /.test(text.trim())) boarded = text.trim();
  if (/^LANDED /.test(text.trim())) landed = text.trim();
  if (/^FOUND /.test(text.trim())) found.push(text.trim());
  if (text.includes('PARTY_WIPED')) wiped = text.trim();
  if (text.includes('ROLLED_BACK')) rolledBack = text.trim();
  if (/^CONFIG /.test(text.trim())) configured.push(text.trim());
  if (text.includes('AUDIO_READY')) audioReady = text.trim();
  if (/^ANALYTICS /.test(text.trim())) analytics = text.trim();
  if (/^MUSIC /.test(text.trim())) music.push(text.trim());
  if (text.includes('TITLE_READY')) titleReady = text.trim();
  if (text.includes('TITLE_CONTINUE') || text.includes('TITLE_NEW_GAME')) titleChoice = text.trim();
  if (text.includes('LOADED ')) loaded = text.trim();
  if (text.includes('RESUMED ')) resumed = text.trim();
  if (/^SAVED /.test(text.trim())) written.push(text.trim());
  const gold = text.match(/gold=(\d+)/);
  if (gold) lastGold = Number(gold[1]);
  if (text.includes('EQUIPPED ')) equipped.push(text.trim());
  if (text.includes('BATTLE_START')) battleStarted = text.trim();
  if (text.includes('BATTLE_END')) battleEnded = text.trim();
  if (text.includes('SCENE_END')) { sceneEnded = text.trim(); scenesEnded.push(text.trim()); }
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

/**
 * Close the menu, exactly.
 *
 * Counted rather than watched for a single line: cancel on the field opens the menu now
 * (it used to throw the world away), so one press too many re-opens what the last press
 * closed — and the presses after that walk somebody's equipment off.
 */
const closeMenu = async () => {
  for (let i = 0; i < 8 && menuOpens > menuCloses; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(280);
  }
  return menuOpens === menuCloses;
};

/**
 * Move the cursor to a named row on whatever list screen is open.
 *
 * From the `rows=` the screen prints when it opens, rather than by counting presses: adding
 * Credits to the menu moved Save down a row and the save checks started saving from the wrong
 * screen. A name is a contract; a position is a coincidence.
 */
const toRow = async (label) => {
  const rows = (menuOpened?.match(/rows=(.*)$/)?.[1] ?? '').split('|');
  const at = rows.indexOf(label);
  if (at < 0) return false;
  for (let i = 0; i < at; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(110);
  }
  return true;
};

const clearField = async () => {
  // Page through whatever is open until nothing new opens. `DIALOGUE_OPEN` is counted, so
  // "quiet" is measurable rather than guessed: a confirm that opens a signpost shows up
  // here and gets paged through on the next pass. A dialogue blocks walking as well as
  // everything else, which is why this comes before stepping away rather than after.
  for (let pass = 0; pass < 8; pass++) {
    const before = dialogues;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(420);
    if (dialogues === before && pass > 0) break;
  }
  // Then out of reach of it, so the next confirm does not open it again.
  for (let i = 0; i < 3; i++) {
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(150);
    await page.keyboard.up('ArrowUp');
  }
  await page.waitForTimeout(200);
};


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
    // And it fights at the settings the config screen offers. Both were written to the save and
    // then ignored: every fight ran at the defaults whatever the player had chosen.
    check('and at the speed the config says', /speed=3 wait=true/.test(battleStarted ?? ''),
      battleStarted ?? 'no BATTLE_START line');
    if (battleStarted) {
      // Long enough for a gauge to fill and a command list to open, so the picture is of
      // a turn being taken rather than of two rats and a wait.
      await page.waitForTimeout(3500);
      // Cast something, by finding the row rather than counting on it. What a character can
      // do depends on who they are, what magicite they carry and how hurt they are — Corvin
      // has no magic at all — so the menu says what it is offering, marks what cannot be
      // chosen with a `!`, and this waits for somebody who can cast.
      let cast = false;
      for (let attempt = 0; attempt < 8 && !cast; attempt++) {
        // Wait for the turn to *arrive* before pressing anything, and for as long as the boot
        // budget allows: a gauge fills in wall-clock seconds and a software rasteriser spends
        // most of them elsewhere. The first version waited ten seconds and then pressed confirm
        // into whatever was on screen, which on CI meant attacking twice and reporting that no
        // spell had been cast — from a menu it had never actually read.
        const until = Date.now() + Math.max(20_000, READY_TIMEOUT_MS / 4);
        while (turns.length <= attempt && Date.now() < until) await page.waitForTimeout(250);
        if (turns.length <= attempt) continue;
        const menu = (turns[attempt]?.match(/menu=(.*)$/)?.[1] ?? '').split('|');
        const magic = menu.indexOf('Magic');
        if (magic >= 0) {
          for (let i = 0; i < magic; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(120);
          }
          // Into the spell list, onto the first spell, onto a target.
          for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(400);
          }
          cast = actions.some((line) => line.endsWith(' spell'));
        } else {
          // Whoever this is cannot cast — Corvin never can, and anybody can be out of MP.
          // Defend rather than attack: this check needs a caster's gauge to fill, and a
          // party that swings every time it is asked kills two rats before the third
          // character has a turn. That is exactly how this failed on CI, where the fight
          // ended after two attacks and the check reported "no spell" for a fight that
          // never got the chance to cast one. Defending spends the turn and leaves the
          // enemies standing. It needs no target, so it is one confirm, not two.
          const defend = menu.indexOf('Defend');
          for (let i = 0; i < Math.max(0, defend); i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(120);
          }
          await page.keyboard.press('Enter');
          await page.waitForTimeout(350);
          // A menu with neither Magic nor Defend in it is not a menu this knows how to drive,
          // so take the swing — two confirms, the command and the target.
          if (defend < 0) {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(350);
          }
        }
      }
      check('a spell can be chosen and cast', cast,
        actions.length ? actions.slice(0, 5).join(' | ')
          : `menus were ${turns.slice(0, 3).join(' / ')}`);
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

    /**
     * Leave the field in a state the next check can start from.
     *
     * A village is full of things a confirm can open — a signpost, a well, a villager — and
     * every loop here that presses confirm until something happens presses it once more
     * afterwards. That last press opens whatever is in reach, and a dialogue box that nobody
     * closes swallows every key that follows, including the ones that open a menu or start a
     * fight. So: page through whatever opened, then step away from it.
     */
    // The save point, which stands a few paces from where the party spawns. Walked to rather
    // than reached with a key: it is the one thing in the world a player has to *find*, and
    // the prompt over it is the whole mechanism.
    // North is `ArrowDown` at the default bearing: the camera looks down -Z, so screen-up
    // walks *away* from the viewer and the crystal is behind the party as they spawn.
    for (let i = 0; i < 10 && !savePoint; i++) {
      await page.keyboard.down('ArrowDown');
      await page.waitForTimeout(140);
      await page.keyboard.up('ArrowDown');
      await page.waitForTimeout(80);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(160);
    }
    check('a save point opens the save screen', Boolean(savePoint) && Boolean(menuOpened),
      savePoint ? `${savePoint} → ${menuOpened}` : 'never reached the crystal');
    // Out of it again, so the checks below start from the field.
    await closeMenu();
    // And off the crystal, with no confirm anywhere near it: standing on it means every stray
    // press re-opens the save screen, and a press meant to close a dialogue opens a menu
    // instead. Walking is enough here because the escape loop above has already closed it.
    // Sideways, not back: the party spawns three paces from the village's south bridge, so
    // walking the way they came takes them out of Harrowmere entirely — and the shop and the
    // inn below are Harrowmere's.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(160);
      await page.keyboard.up('ArrowRight');
    }
    await page.waitForTimeout(250);
    savePoint = null;

    // A chest. Reached with a key rather than on foot: Harrowmere's three are scattered and
    // the reward layer for exploring is 383 of them, so what matters is that opening one works
    // and that it stays open.
    await page.keyboard.press('KeyT');
    // Until the box has closed, not until the contents arrive: what is in a chest is a
    // conversation, and leaving it open swallows every key that comes after.
    for (let i = 0; i < 10 && !chestDone; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
    }
    check('a chest opens and hands over what is in it',
      Boolean(chest) && found.length > 0 && Boolean(chestDone),
      chest ? `${chest} → ${found.join(', ')}` : 'no CHEST line');
    await clearField();

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
      // Out of the menu the way a player leaves it, one press per screen — and no further:
      // on the field cancel opens the menu, so a press too many undoes the last one.
      const closed = await closeMenu();
      check('the menu closes when backed out of', closed,
        menuClosed ?? 'no MENU_CLOSED after eight cancels');
    }

    // The shop. Harrowmere's general store, reached the way a player reaches it — through
    // the map's own NPC — and the two things a store must get right: money leaves when
    // something is bought, and money arrives when something is sold.
    const goldOf = (line) => Number(line.match(/gold=(\d+)/)?.[1] ?? NaN);
    await page.keyboard.press('KeyK');
    // The shopkeeper has something to say first, as everybody in this world does, so the
    // way in is through their lines. Confirm turns those pages and the store opens after
    // the last of them.
    for (let i = 0; i < 12 && !shopOpened; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(450);
    }
    check('a shop opens', Boolean(shopOpened), shopOpened ?? 'no SHOP_OPEN after twelve confirms');
    if (shopOpened) {
      const stock = Number(shopStock?.match(/stock=(\d+)/)?.[1] ?? 0);
      check('the shop has its stock from the table', stock > 0, shopStock ?? 'no SHOP line');
      const goldBefore = goldOf(shopOpened);
      // Buy, into the list and take the first row.
      for (const key of ['Enter', 'Enter']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(320);
      }
      // Down to the Wayfarer's Robe, ninth on these shelves and the one piece of stock
      // that gets a different answer out of all three of them: Vesna and Wick both wear
      // body armour it would improve by different amounts, and Corvin cannot wear a robe
      // at all. The comparison is what this screen is *for*, so the picture is taken of
      // it and the same text is read back out through `special`.
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(140);
      }
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(root, '.renders',
        remote ? 'godot-web-shop-live.png' : 'godot-web-shop.png') });
      await page.keyboard.press('KeyV');
      await page.waitForTimeout(500);
      // The three answers, from the starting kit and the cast's equip lists: the robe is
      // 26 defence, Vesna is in a Travel Vest at 14, Wick in a Silk Robe at 20, and
      // Corvin's list has no robe in it.
      const legs = (compared ?? '').split('|').slice(1).map((l) => l.trim());
      check('the shop compares the party against what it sells',
        legs.length === 3
          && /^Vesna\s+Travel Vest\s+DEF \+12$/.test(legs[0])
          && /^Corvin\s+cannot equip$/.test(legs[1])
          && /^Wick\s+Silk Robe\s+DEF \+6$/.test(legs[2]),
        compared ?? 'no SHOP_COMPARE line');
      check('buying takes the money', bought.length > 0 && goldOf(bought[0]) < goldBefore,
        bought[0] ?? `no BOUGHT line (gold was ${goldBefore})`);
      // Back out to the root, then Sell, and sell the first thing in the bag.
      for (const key of ['Escape', 'ArrowDown', 'Enter', 'Enter']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(320);
      }
      check('selling pays out', sold.length > 0
        && (bought.length === 0 || goldOf(sold[0]) > goldOf(bought[0])),
        sold[0] ?? 'no SOLD line');
      for (let i = 0; i < 4 && !shopClosed; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(280);
      }
      check('the shop closes', Boolean(shopClosed), shopClosed ?? 'no SHOP_CLOSED');
    }

    // The inn. The fight above left the party hurt, so a night that costs gil and hands
    // back full HP is visible in the numbers rather than only in the fade.
    const goldAtDoor = lastGold;
    await page.keyboard.press('KeyL');
    // The innkeeper's lines, then the offer of a room — 'Rest' is the first choice, so
    // confirm carries the party through both.
    for (let i = 0; i < 14 && !innWoke; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
    const bill = Number(innRest?.match(/price=(\d+)/)?.[1] ?? NaN);
    const paid = Number(innRest?.match(/gold=(\d+)/)?.[1] ?? NaN);
    check('a night at the inn costs its price in gil',
      Boolean(innRest) && paid === goldAtDoor - bill,
      innRest ? `${innRest}, and ${goldAtDoor} at the door` : 'no INN_REST in 20s');
    // Everybody, to the top of both bars. The fight above left them hurt, so this is a
    // change rather than a coincidence.
    const bars = (innWoke ?? '').trim().split(/\s+/).slice(1);
    const allFull = bars.length > 0 && bars.every((b) => {
      const m = b.match(/^(\w+):(\d+)\/(\d+):(\d+)\/(\d+)$/);
      return Boolean(m) && m[2] === m[3] && m[4] === m[5];
    });
    check('the party wakes rested', allFull, innWoke ?? 'no INN_WOKE in 20s');
    // Past the line the party says on waking, and no further: the night is over when the
    // field says so, not when a fade of a known length ought to have finished.
    for (let i = 0; i < 10 && !innDone; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(450);
    }
    check('the night ends and hands the field back', Boolean(innDone),
      innDone ?? 'no INN_DONE after ten confirms');

    // Then out of the village, which is the whole difference between a diagnostic and a
    // world. Harrowmere's south bridge is an exit and the party spawns three paces from it —
    // but by now they have been to a crystal, a chest, a shop and an inn, and where they are
    // standing is anybody's guess. So the map is opened again from its own spawn: `M` walks the
    // map list, and stopping when it comes back round to Harrowmere costs a second and makes
    // this check independent of everything above it.
    for (let i = 0; i < 96; i++) {
      await page.keyboard.press('KeyM');
      await page.waitForTimeout(240);
      if (/map=harrowmere\b/.test(field ?? '')) break;
    }
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

// --- saving, and loading what the JS build wrote ----------------------------
//
// The one part of this game that outlives the build that wrote it. Two things are
// proven here and they are different claims: that the port can write a save and read
// it back through the browser's own store, and that it can read a save the *reference*
// wrote — which is what somebody who has been playing at this address actually has.
if (field) {
  // Written from the menu, found by name.
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(700);
  const foundSave = await toRow('Save');
  check('the menu offers a Save row', foundSave, menuOpened ?? 'no MENU_OPEN line');
  await page.keyboard.press('Enter');   // into the slot list
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(root, '.renders',
    remote ? 'godot-web-save-live.png' : 'godot-web-save.png') });
  await page.keyboard.press('Enter');   // slot 1
  await page.waitForTimeout(600);
  check('the menu writes a save', written.some((line) => /slot=0 /.test(line)),
    written.join(' | ') || 'no SAVED line');
  await closeMenu();

  // And back in through the front door. A reload, so the save comes out of the store
  // rather than out of memory.
  const carried = written.find((line) => /slot=0 /.test(line)) ?? '';
  const carriedGold = Number(carried.match(/gold=(\d+)/)?.[1] ?? NaN);
  titleReady = null;
  loaded = null;
  resumed = null;
  // The counters below count what the *page* has printed, so a reload resets them too.
  menuOpens = 0;
  menuCloses = 0;
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  // The boot budget, not a flat thirty seconds: this is a full reload, and against the
  // deployed site that is fifty megabytes over the wire before the title can speak.
  for (let i = 0; i < READY_TIMEOUT_MS / 500 && !titleReady; i++) {
    await page.waitForTimeout(500);
  }
  check('the title screen finds the save', Boolean(titleReady) && /continue=yes/.test(titleReady),
    titleReady ?? 'no TITLE_READY in 30s');
  if (titleReady && /continue=yes/.test(titleReady)) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    for (let i = 0; i < READY_TIMEOUT_MS / 500 && !resumed; i++) {
      await page.waitForTimeout(500);
    }
    check('Continue opens the party that was saved',
      Boolean(loaded) && Number(loaded.match(/gold=(\d+)/)?.[1] ?? NaN) === carriedGold,
      loaded ? `${loaded}, saved with ${carriedGold} gil` : 'no LOADED line in 30s');
    check('Continue opens where the party was left', Boolean(resumed),
      resumed ?? 'no RESUMED line in 30s');
  }

  // Then a save the reference wrote, straight out of the harvest fixture. `mid-story` is
  // deliberately the awkward one: it is after the cataclysm, so loading it also has to
  // resolve twenty-six maps into their ruined form.
  const fixturePath = path.join(root, 'tools', 'fixtures', 'reference-saves.json');
  if (!fs.existsSync(fixturePath)) {
    check('a save from the JS build loads in the port', false,
      'no tools/fixtures/reference-saves.json — run `npm run harvest:saves`');
  } else {
    const blob = JSON.parse(fs.readFileSync(fixturePath, 'utf8')).saves['mid-story'].raw;
    const expected = JSON.parse(blob);
    titleReady = null;
    loaded = null;
    resumed = null;
    await page.evaluate((raw) => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('aetherbound.save.')) localStorage.removeItem(key);
      }
      localStorage.setItem('aetherbound.save.0', raw);
    }, blob);
    // The counters below count what the *page* has printed, so a reload resets them too.
  menuOpens = 0;
  menuCloses = 0;
  await page.goto(target, { waitUntil: 'domcontentloaded' });
    // The boot budget, not a flat thirty seconds: this is a full reload, and against the
    // deployed site that is fifty megabytes over the wire before the title can speak.
    for (let i = 0; i < READY_TIMEOUT_MS / 500 && !titleReady; i++) {
      await page.waitForTimeout(500);
    }
    if (titleReady && /continue=yes/.test(titleReady)) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      for (let i = 0; i < READY_TIMEOUT_MS / 500 && !resumed; i++) {
        await page.waitForTimeout(500);
      }
    }
    check('a save from the JS build loads in the port',
      Boolean(loaded)
        && Number(loaded.match(/gold=(\d+)/)?.[1] ?? NaN) === expected.party.gold
        && Number(loaded.match(/roster=(\d+)/)?.[1] ?? NaN) === expected.party.roster.length,
      loaded ? `${loaded}, blob had ${expected.party.gold} gil `
        + `and ${expected.party.roster.length} member(s)` : 'no LOADED line in 30s');
    // The map *and* the spot. A load that puts the party back at the map's entrance
    // rather than where they stood loses whatever they had walked past.
    const at = resumed?.match(/at ([\d.-]+),([\d.-]+)/);
    const sameSpot = Boolean(at) && Math.abs(Number(at[1]) - expected.position.x) < 0.01
      && Math.abs(Number(at[2]) - expected.position.z) < 0.01;
    check('and opens the map it was left on, on the spot',
      Boolean(resumed) && resumed.includes(expected.mapId) && sameSpot,
      resumed ? `${resumed}, saved on ${expected.mapId} at `
        + `${expected.position.x},${expected.position.z}` : 'no RESUMED line in 30s');
    if (resumed) {
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(root, '.renders',
        remote ? 'godot-web-ruin-live.png' : 'godot-web-ruin.png') });
    }
  }
}

// --- the rest of the menu, and losing ---------------------------------------
//
// The three screens that used to say "not built" — and the one path a player meets at the
// worst possible moment.
if (field) {
  // Config: down to it, in, then left and right on the music volume.
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(450);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(110);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowRight']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(220);
  }
  await page.screenshot({ path: path.join(root, '.renders',
    remote ? 'godot-web-config-live.png' : 'godot-web-config.png') });
  // Three presses, and the volume has to have actually moved and come back part way —
  // a settings screen that draws a number without changing anything is the usual failure.
  const volumes = configured.filter((line) => line.includes('musicVolume='))
    .map((line) => Number(line.split('=')[1]));
  check('config changes a setting and keeps it',
    volumes.length === 3 && volumes[1] < volumes[0] && volumes[2] > volumes[1],
    configured.join(' | ') || 'no CONFIG line');
  // Out, and into the bestiary, which should know about whatever the fight above was.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, '.renders',
    remote ? 'godot-web-bestiary-live.png' : 'godot-web-bestiary.png') });
  // Backing out puts the cursor at the top of the root list, so each screen below is
  // "N rows down": Items, Magic, Equip, Status, Espers, Formation, Bestiary, Journal.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, '.renders',
    remote ? 'godot-web-journal-live.png' : 'godot-web-journal.png') });
  const deepClosed = await closeMenu();
  check('the menu closes from a deep screen', deepClosed,
    menuClosed ?? 'no MENU_CLOSED after eight cancels');

  // And the losing end. Reached with a key because being killed on cue is not something a
  // check can arrange, and the rollback is the part with the reasoning in it.
  await page.keyboard.press('KeyP');
  const loseFrom = Date.now();
  for (let i = 0; i < 12 && !rolledBack; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
  }
  check('a wipe rolls back to the last save and says so',
    Boolean(wiped) && Boolean(rolledBack),
    rolledBack ?? (wiped ? 'wiped, but never rolled back' : 'no PARTY_WIPED'));
  void loseFrom;
}

// --- the world ---------------------------------------------------------------
//
// The port's scenery is hand-made models placed at the reference's authored coordinates, so
// what has to be proven in a browser is that the models *arrive*: an export that shipped the
// data and not the assets looks identical to one that shipped nothing, because the camera
// still points at the right empty air.
const built = scenery.map((line) => ({
  map: line.match(/map=(\S+)/)?.[1],
  props: Number(line.match(/props=(\d+)/)?.[1] ?? 0),
  tiles: Number(line.match(/tiles=(\d+)/)?.[1] ?? 0),
}));
// Every map reports its own doors and how many of them lead somewhere the party is not
// ready for. Checked after the sweep, so this is the whole world's signposting and not the
// four maps the play-through happens to walk through. `danger-parity.mjs` proves the numbers
// against the reference; what this proves is that they are computed in a browser, on the
// live party's level, for all 95 maps.
check('every map reports its doors', doors.length >= opened.size && doors.length > 0,
  `${doors.length} DOORS lines for ${opened.size} maps`);
const warning = doors.filter((line) => Number(line.match(/warned=(\d+)/)?.[1] ?? 0) > 0);
check('the world warns about the doors it should', warning.length > 0,
  doors.length ? `${warning.length} of ${doors.length} maps have a door that warns`
    : 'no DOORS lines');

check('the world builds its scenery', built.length > 0 && built.every((b) => b.tiles > 0),
  built.map((b) => `${b.map} ${b.props}p/${b.tiles}t`).slice(0, 4).join(', ') || 'no SCENERY line');
// Harrowmere is the opening village and has fifty-five props in it. A map that paved its
// ground and placed nothing on it is a map whose prop assets did not survive the export.
const village = built.find((b) => b.map === 'harrowmere');
check('the opening village is furnished', Boolean(village) && village.props > 20,
  village ? `${village.props} props, ${village.tiles} tiles` : 'harrowmere never built');
// And the people in it. Nine live in Harrowmere; a world with scenery and nobody in it is a
// world whose cast models did not survive the export.
const villagers = crowd.find((line) => line.includes('map=harrowmere'));
check('the village has people in it',
  Boolean(villagers) && Number(villagers.match(/people=(\d+)/)?.[1] ?? 0) > 0,
  villagers ?? 'no CROWD line for harrowmere');
// The fight, too: both lines standing on a floor rather than a screen of text.
check('a fight puts everybody on a stage',
  Boolean(stage) && Number(stage.match(/party=(\d+)/)?.[1] ?? 0) === 3
    && Number(stage.match(/enemies=(\d+)/)?.[1] ?? 0) > 0,
  stage ?? 'no STAGE line');

// --- the music --------------------------------------------------------------
//
// The score is rendered at build time, so what has to be proven in a browser is that the
// port *finds* it and changes it at the right moments. Whether it is audible is a question
// for the mixer, not for a headless page: Chromium here has no output device, so what is
// measured is the track the game asked for at each point in the run above.
check('the audio bank loads', Boolean(audioReady)
  && Number(audioReady.match(/music=(\d+)/)?.[1] ?? 0) > 0,
  audioReady ?? 'no AUDIO_READY line');
if (audioReady) {
  const asked = music.map((line) => line.split(' ')[1]);
  check('the title plays the prelude', asked[0] === 'prelude',
    asked.slice(0, 3).join(' → ') || 'no MUSIC line');
  check('the field plays its own map theme', asked.includes('town_harrowmere'),
    asked.slice(0, 6).join(' → '));
  // A fight takes the music over and the town gets it back afterwards, which is two
  // separate things the port has to remember to do.
  check('a fight changes the music and gives it back',
    asked.includes('battle') && asked.lastIndexOf('town_harrowmere') > asked.indexOf('battle'),
    asked.join(' → ').slice(0, 220));
  check('the shop and the inn have their own themes',
    asked.includes('shop') && asked.includes('inn'),
    asked.join(' → ').slice(0, 220));
}

// --- what a scene does to the world -----------------------------------------
//
// Every boss in this game arrives inside a story scene, and so does every esper: the scene sets
// the stage, calls for the fight, waits for the result, and hands over what was behind it. The
// port used to answer that call with a printed line and the word "victory", and answer the grant
// with a printed line and nothing at all — so every boss was won by being reached and the whole
// magic system was unobtainable. `J` walks a short list of scenes; these are both of them.
if (field) {
  await closeMenu();
  // The scene that only hands something over, first — the fight below is lost by a starting
  // party, and losing rolls the world back to the last save, which is a poor state to start a
  // second scene in.
  const beforeGrant = found.length;
  for (let attempt = 0; attempt < 4 && !scenesRun.some((l) => /carter_pass/.test(l)); attempt++) {
    await page.keyboard.press('KeyJ');
    await page.waitForTimeout(1200);
  }
  check('a granting scene runs', scenesRun.some((l) => /carter_pass/.test(l)),
    scenesRun.slice(-3).join(' | ') || 'no scene started');
  for (let i = 0; i < 90 && found.length === beforeGrant; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(220);
  }
  check('and hands over what it promised', found.length > beforeGrant,
    found.slice(beforeGrant).join(' | ')
      || `nothing granted in 90 confirms (${chatter.slice(-4).join(' / ')})`);

  // Then the boss — but not until the scene above has finished. A scene runs one at a time and
  // the key is ignored while one is up, so the first attempt at this pressed J into a scene that
  // was still saying goodbye and then waited ninety confirms for a fight nobody had started.
  for (let i = 0; i < 40 && !scenesEnded.some((l) => /carter_pass/.test(l)); i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(220);
  }
  await closeMenu();
  // Confirming all the way once it starts: the scene talks first — a letterbox, four pages of it
  // — and calls for the fight when the talking is done, so waiting quietly waits forever.
  for (let attempt = 0; attempt < 4 && !scenesRun.some((l) => /fenbarrow_boss/.test(l)); attempt++) {
    await page.keyboard.press('KeyJ');
    await page.waitForTimeout(900);
  }
  for (let i = 0; i < 90 && !sceneBattle; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  check('a scene can start a fight', Boolean(sceneBattle),
    sceneBattle ?? `no SCENE_BATTLE in 90 confirms (${chatter.slice(-4).join(' / ')})`);
  if (sceneBattle) {
    // Two confirms a turn, and a boss takes rather more turns than a rat.
    for (let i = 0; i < 260 && !sceneBattleEnd; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
    }
    check('and the scene is still there when it ends', Boolean(sceneBattleEnd),
      sceneBattleEnd ?? 'no SCENE_BATTLE_END in 260 presses');
    // Whichever way it went, the game has to do the right thing with it. A win hands over what
    // the scene promised; a loss is a wipe inside a scene, which has to roll back to the last
    // save rather than stand the dead party up in the boss's chamber. The starting party fights
    // this boss twenty levels early, so which of the two happens is not this check's business.
    const beforeSpoils = found.length;
    for (let i = 0; i < 60 && found.length === beforeSpoils && !rolledBack; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }
    if (/result=victory/.test(sceneBattleEnd ?? '')) {
      check('a scene that is won hands over what was behind it', found.length > beforeSpoils,
        found.slice(beforeSpoils).join(' | ') || 'nothing granted');
    } else {
      check('a scene that is lost rolls the party back', Boolean(rolledBack),
        rolledBack ?? 'no ROLLED_BACK after a defeat inside a scene');
    }
  }
  // A rollback leaves its own page up — "The party falls. Returning to Solmere" — and reloads
  // the map underneath it. Everything after this section starts by pressing something, so the
  // page has to be gone before it does: the airship checks read as broken for one run because
  // their key presses were being eaten by that sentence.
  await clearField();
  await closeMenu();
}

// --- the airship -------------------------------------------------------------
//
// Won two thirds of the way through the story and reachable by key here, because two of the
// ninety-five maps have no road to them: the ship is not a convenience, it is the only way to
// reach the Meridian Reach. Its flight is compared step for step against the reference's in
// `field-parity.mjs`; what this proves is that a player can get in it, fly it and put it down.
if (field) {
  await page.keyboard.press('KeyY');
  await page.waitForTimeout(600);
  check('the party can board the airship', Boolean(boarded), boarded ?? 'no BOARDED line');
  // Fly for a couple of seconds, then look for somewhere to land. `Land` is offered wherever
  // the tile below and its four neighbours are clear, so a short hop over open ground finds
  // one.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(140);
    await page.keyboard.up('ArrowDown');
  }
  for (let i = 0; i < 10 && !landed; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }
  check('and put it down again', Boolean(landed), landed ?? 'no LANDED line');
  await page.screenshot({ path: path.join(root, '.renders',
    remote ? 'godot-web-airship-live.png' : 'godot-web-airship.png') });
  await clearField();
}

// --- the controls you can touch ----------------------------------------------
//
// The bar and the pad are buttons, because on a phone they are the only way to play. Clicked
// rather than pressed here: a tap has to reach the screens that count input events as well as
// the ones that poll it, and `virtual_press` delivers it as an event for exactly that reason.
if (field) {
  /**
   * Where a point in the game's own 1920×1080 space lands on the page.
   *
   * Godot draws its interface into a canvas, so there is nothing here to select by role or by
   * name — a tap is a click at a coordinate, and the coordinate has to be converted. The
   * viewport stretches to fit with `canvas_items`, so the mapping is one scale factor and the
   * letterbox offset.
   */
  const canvas = await page.evaluate(() => {
    const el = document.querySelector('canvas');
    const box = el.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  });
  const spot = (x, y) => {
    const scale = Math.min(canvas.width / 1920, canvas.height / 1080);
    return [
      canvas.left + (canvas.width - 1920 * scale) / 2 + x * scale,
      canvas.top + (canvas.height - 1080 * scale) / 2 + y * scale,
    ];
  };
  // The pad: a panel 30 from the left and 30 from the bottom, eight of margin, then a three
  // by three grid of 62-pixel buttons four apart. Up is the middle of the top row.
  const padCentre = (column, row) => spot(30 + 8 + column * 66 + 31, 1080 - 244 + 8 + row * 66 + 31);
  const held = [];
  for (const [label, column, row] of [['W', 1, 0], ['S', 1, 2], ['A', 0, 1], ['D', 2, 1]]) {
    taps.length = 0;
    const [x, y] = padCentre(column, row);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(350);
    await page.mouse.up();
    await page.waitForTimeout(150);
    if (taps.length > 0) held.push(`${label}=${taps[0]}`);
  }
  check('the movement pad presses the movement actions', held.length === 4,
    held.join(' ') || 'nothing reported a tap');

  // And the bar. Menu is the one button with an answer in the log.
  menuOpens = 0;
  menuCloses = 0;
  taps.length = 0;
  // The bar is centred along the bottom: six entries about 96 wide with 34 between them, and
  // Menu is the fourth. Rather than count pixels across, the check walks a row of likely
  // centres and stops at the one that opens a menu — which is also how a finger finds it.
  for (let x = 700; x <= 1240 && menuOpens === 0; x += 40) {
    const [px, py] = spot(x, 1080 - 68);
    await page.mouse.click(px, py);
    await page.waitForTimeout(320);
  }
  check('tapping the bar opens the menu', menuOpens > 0,
    `${menuOpens} open(s), taps seen: ${taps.join(',') || 'none'}`);
  await closeMenu();
}

// --- every map in the world --------------------------------------------------
//
// `M` walks the map list. Ninety-five maps, each of which builds a collision grid, paves its
// ground, places its props and its people, and resolves its own sky — and any one of them
// could be the one with a prop kit nothing has a model for, a terrain row shorter than its
// width, or an NPC whose look breaks the model hash. Opening them all is a minute of clicking
// and the only way to know the whole world loads rather than the four maps the checks above
// happen to visit.
if (field) {
  const wanted = Object.keys(JSON.parse(
    fs.readFileSync(path.join(root, 'godot', 'data', 'maps.json'), 'utf8'))).length;
  const errorsBefore = errors.length;
  const warningsBefore = warnings.length;
  for (let i = 0; i < wanted + 4 && opened.size < wanted; i++) {
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(260);
  }
  check('every map in the world opens', opened.size === wanted,
    `${opened.size} of ${wanted} opened`);
  check('opening every map raises nothing',
    errors.length === errorsBefore && warnings.length === warningsBefore,
    [...errors.slice(errorsBefore), ...warnings.slice(warningsBefore)].slice(0, 3).join(' | '));
  await page.screenshot({ path: path.join(root, '.renders',
    remote ? 'godot-web-lastmap-live.png' : 'godot-web-lastmap.png') });
}

// The instrumentation is loaded and *off*, which is the only state this suite may see. Rule
// three of the module: sixty checks a night must not write sixty sessions into the project.
// Checked from the build's own report rather than by watching the network, because an event
// that is queued and never sent is still an event that should never have been recorded.
// The credits screen. Six of the models this port ships are CC-BY, where naming the author *is*
// the licence — and a markdown file in the repository does not reach anybody playing the game.
if (field) {
  await closeMenu();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  await toRow('Credits');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 12 && !creditsLine; i++) await page.waitForTimeout(300);
  check('the credits name who made the models',
    Boolean(creditsLine) && Number(creditsLine.match(/models=(\d+)/)?.[1] ?? 0) > 40
      && Number(creditsLine.match(/ccby=(\d+)/)?.[1] ?? 0) > 0
      // And say which are this project's own. Sixteen of them are, and a credits screen that
      // called them somebody else's would be worse than no credits screen.
      && Number(creditsLine.match(/made=(\d+)/)?.[1] ?? 0) > 0,
    creditsLine ?? 'no CREDITS line');
  const creditsShot = path.join(root, '.renders',
    remote ? 'godot-web-credits-live.png' : 'godot-web-credits.png');
  await page.screenshot({ path: creditsShot });
  await closeMenu();
}

check('the analytics stay out of the test suite',
  Boolean(analytics) && /enabled=false/.test(analytics)
    && /reason=automated browser/.test(analytics),
  analytics ?? 'no ANALYTICS line');

// And the other half of that: with the automation flag hidden, does the instrumentation
// actually work? Rule three keeps it quiet here, which means the *transport* is never
// exercised by anything else in this suite — and the last three bugs in it were all invisible
// for exactly that reason (a bridge value compared as a boolean when it arrives as a number,
// and a `Crypto` call that aborts `start` on a template without the module, both of which
// looked identical to "correctly disabled").
//
// Nothing leaves this machine: the ingestion host is intercepted and answered locally, and the
// batch is decoded here to prove it carries real events for the right project.
{
  const posted = [];
  const probe = await browser.newPage({ viewport: { width: 900, height: 600 } });
  // In front, because a background tab in Chromium gets no animation frames — and a Godot build
  // runs its whole main loop on them. On CI the probe booted far enough to print its readiness
  // line and then froze, so the batch that flushes six seconds later never flushed and the check
  // reported "nothing posted" for instrumentation that was working perfectly.
  await probe.bringToFront();
  await probe.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  await probe.route('**/api-js.mixpanel.com/**', async (route) => {
    // `postData()` returns null for some request shapes — a keepalive fetch among them, which is
    // exactly what this sends — and the buffer is there when the string is not. Reading only the
    // string reported "nothing posted" for a batch that had arrived and been recorded.
    const request = route.request();
    posted.push(request.postData() ?? request.postDataBuffer()?.toString('utf8') ?? '');
    await route.fulfill({ status: 200, contentType: 'text/plain', body: '1' });
  });
  let line = null;
  const probeSaid = [];
  probe.on('console', (message) => {
    const text = message.text().trim();
    if (!text) return;
    probeSaid.push(text.split('\n')[0].slice(0, 100));
    if (probeSaid.length > 60) probeSaid.shift();
    if (/^ANALYTICS /.test(text)) line = text;
  });
  await probe.goto(target, { waitUntil: 'domcontentloaded' });
  // This is a second full Godot boot — 40MB of wasm compiled again — so it gets the same budget
  // the first one does. Waiting a flat two minutes for the *post* meant that on CI the page was
  // still starting when the check gave up, and both halves of it failed for want of a boot.
  const ready = Date.now() + READY_TIMEOUT_MS;
  while (!line && Date.now() < ready) await probe.waitForTimeout(1000);
  // Three minutes for a batch that flushes after six seconds of *simulation* time: on a shared
  // runner with two cores and two Godot instances in one browser, six seconds of frames is not
  // six seconds of clock.
  for (let i = 0; i < 180 && !posted.length; i++) await probe.waitForTimeout(1000);
  check('the instrumentation reports when it is not being tested',
    Boolean(line) && /enabled=true/.test(line), line ?? 'no ANALYTICS line');
  const events = posted.flatMap((body) => {
    const data = new URLSearchParams(body).get('data');
    try { return JSON.parse(data ?? '[]'); } catch { return []; }
  });
  const names = new Set(events.map((e) => e.event));
  check('and it posts a batch of real events to the right project',
    events.length > 0 && names.has('App Loaded')
      && events.every((e) => e.properties?.token && e.properties?.distinct_id),
    events.length ? `${events.length} event(s): ${[...names].slice(0, 5).join(', ')}`
      // Three different failures used to read the same way. Say which: nothing sent at all, or
      // something sent whose body could not be read back here.
      : `${posted.length} request(s), ${posted.reduce((n, b) => n + b.length, 0)} bytes of body`
        + ` — the page said: ${probeSaid.slice(-4).join(' / ') || 'nothing'}`);
  await probe.close();
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
