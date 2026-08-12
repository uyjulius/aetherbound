/**
 * End-to-end smoke test.
 *
 * Drives a real browser through the whole loop — boot, walk, talk, loot, menu,
 * battle, victory, save, load — and fails loudly on any console error. This is
 * the check that runs before calling anything "working": screenshots prove a
 * frame rendered, this proves the game is playable.
 *
 *   node tools/smoke.mjs [--url http://localhost:5177] [--headed]
 */

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const URL = flag('url', 'http://localhost:5177');
const HEADED = args.includes('--headed');

const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  const mark = ok ? '  ok  ' : ' FAIL ';
  console.log(`[${mark}] ${name}${detail ? `  — ${detail}` : ''}`);
}

const browser = await chromium.launch({ headless: !HEADED });
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

await page.goto(URL, { waitUntil: 'networkidle' });

// Expose a keyboard helper inside the page.
await page.addInitScript(() => {});
const tap = async (code, wait = 220) => {
  await page.evaluate(async ({ code, wait }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, wait));
  }, { code, wait });
};

// --- boot -------------------------------------------------------------------
await page.waitForFunction(() => window.__game?.state?.player, null, { timeout: 20000 });
const boot = await page.evaluate(() => ({
  map: window.__game.currentMapId,
  party: window.__game.party.activeMembers.map((m) => m.name),
  npcs: window.__game.state.npcs.length,
  props: window.__game.state.map.group.children.length,
  fps: window.__game.fps,
}));
check('boots into the field', !!boot.map, `map=${boot.map}`);
check('party is assembled', boot.party.length === 3, boot.party.join(', '));
check('NPCs spawned', boot.npcs >= 8, `${boot.npcs} NPCs`);
check('map geometry built', boot.props > 100, `${boot.props} objects`);

// --- audio ------------------------------------------------------------------
await tap('KeyZ', 700);
const audioState = await page.evaluate(async () => {
  const a = window.__audio;
  if (!a?.ready) return { ready: false };
  const an = a.ctx.createAnalyser();
  a.masterGain.connect(an);
  const buf = new Float32Array(an.fftSize);
  let peak = 0;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 100));
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let k = 0; k < buf.length; k++) sum += buf[k] * buf[k];
    peak = Math.max(peak, Math.sqrt(sum / buf.length));
  }
  return { ready: true, track: a.current?.track?.name, peak };
});
check('audio engine running', audioState.ready === true, audioState.track || '');
check('music is audible', (audioState.peak ?? 0) > 0.002, `rms=${(audioState.peak ?? 0).toFixed(4)}`);

// --- every track actually plays ---------------------------------------------
const score = await page.evaluate(async () => {
  const a = window.__audio;
  const mod = window.__tracks;
  if (!a?.ready || !mod) return { ok: false };
  const an = a.ctx.createAnalyser();
  an.fftSize = 2048;
  a.masterGain.connect(an);
  const buf = new Float32Array(an.fftSize);
  const silent = [];
  const ids = Object.keys(mod);
  for (const id of ids) {
    a.play(mod[id], { fade: 0.02, restart: true });
    // Give the scheduler time to reach a note and the voice to sound.
    let peak = 0;
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 90));
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let k = 0; k < buf.length; k++) sum += buf[k] * buf[k];
      peak = Math.max(peak, Math.sqrt(sum / buf.length));
    }
    if (peak < 0.001) silent.push(id);
  }
  return { ok: true, count: ids.length, silent };
});
check('every track produces audio', score.ok && score.silent.length === 0,
  `${score.count} tracks, silent: ${score.silent?.join(',') || 'none'}`);

// --- movement & collision ---------------------------------------------------
const move = await page.evaluate(async () => {
  const s = window.__game.state;
  s.player.place(35, 30, Math.PI);
  await new Promise((r) => setTimeout(r, 120));

  // Count simulation ticks rather than wall-clock seconds. A headless browser
  // throttles requestAnimationFrame, so the fixed-step loop hits its
  // steps-per-frame safety cap and the simulation legitimately runs slower
  // than real time. Distance *per tick* is what actually tests the movement
  // code, and it is frame-rate independent.
  let ticks = 0;
  const orig = s.update.bind(s);
  s.update = (dt, game) => { ticks++; orig(dt, game); };
  // Distance is measured as a magnitude, not as displacement along a chosen
  // axis. The earlier version subtracted z the wrong way round and so quietly
  // asserted that Up moved the player *toward* the camera — it passed for as
  // long as all four movement keys were inverted, and only failed once they
  // were fixed. Direction is covered separately by the on-screen checks.
  const x0 = s.player.x;
  const z0 = s.player.z;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
  await new Promise((r) => setTimeout(r, 1200));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true }));
  s.update = orig;
  const moved = Math.hypot(s.player.x - x0, s.player.z - z0);
  const perSecond = ticks > 0 ? moved / (ticks / 60) : 0;

  // Now walk into the map's north wall and confirm we stop.
  //
  // North, not south: Harrowmere's southern edge carries the exit trigger to
  // the overworld, so walking into it changes map mid-test and everything
  // afterwards runs against a state that has been torn down. Up now travels
  // away from the camera, so heading north means pressing Down.
  s.player.place(35, 4);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
  await new Promise((r) => setTimeout(r, 900));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown', bubbles: true }));
  return { moved, ticks, perSecond, blockedAt: s.player.z, mapId: window.__game.currentMapId };
});
check('player walks at the intended speed', Math.abs(move.perSecond - 4.4) < 0.35,
  `${move.perSecond.toFixed(2)} u/s over ${move.ticks} ticks`);
check('collision stops the player at walls',
  move.blockedAt > 1.5 && move.mapId === 'harrowmere',
  `stopped at z=${move.blockedAt.toFixed(2)} on ${move.mapId}`);

// --- dialogue ---------------------------------------------------------------
const talk = await page.evaluate(async () => {
  const s = window.__game.state;
  const npc = s.npcs.find((n) => n.def.id === 'elder');
  s.player.place(npc.x, npc.z + 1.4, Math.PI);
  await new Promise((r) => setTimeout(r, 200));
  s._updateInteraction();
  const found = !!s.interactTarget;
  if (found) s._interact(s.interactTarget);
  await new Promise((r) => setTimeout(r, 800));
  return { found, open: window.__game.dialogue.isOpen, text: window.__game.dialogue.textEl.textContent.slice(0, 40) };
});
check('NPC interaction detected', talk.found === true);
check('dialogue opens and types', talk.open === true, talk.text);
for (let i = 0; i < 5; i++) await tap('Enter', 320);

// --- chest ------------------------------------------------------------------
const loot = await page.evaluate(async () => {
  const g = window.__game, s = g.state;
  const before = g.party.countItem('potion');
  const chest = s.map.chests[0];
  s.player.place(chest.obj.position.x, chest.obj.position.z + 1.2, Math.PI);
  await new Promise((r) => setTimeout(r, 150));
  s._updateInteraction();
  if (s.interactTarget) s._interact(s.interactTarget);
  await new Promise((r) => setTimeout(r, 900));
  return { before, opened: chest.def.opened === true };
});
check('chest opens', loot.opened === true);
for (let i = 0; i < 4; i++) await tap('Enter', 260);

// --- menu -------------------------------------------------------------------
await tap('KeyC', 400);
const menuOpen = await page.evaluate(() => window.__game.menu.open);
check('field menu opens', menuOpen === true);
/**
 * Move a menu cursor onto a named entry and choose it.
 *
 * Counting keypresses is not reliable here. This used to be two ArrowDowns
 * and two Enters, which assumed every synthetic key event lands exactly once
 * — under load one occasionally registers twice, and the run ends up on
 * Status instead of Equip. Reading the cursor between presses is immune to
 * that, and to anyone reordering the menu later.
 */
const menuChoose = async (label, maxSteps = 14) => {
  for (let step = 0; step < maxSteps; step++) {
    const at = await page.evaluate(() => {
      const list = window.__game.menu.stack.at(-1)?.list;
      if (!list) return null;
      return { label: list.items[list.index]?.label ?? null };
    });
    if (!at) return false;
    if (at.label === label) { await tap('Enter', 320); return true; }
    await tap('ArrowDown', 170);
  }
  return false;
};

const reachedEquip = await menuChoose('Equip');
await tap('Enter', 320);          // the first party member
const equipScreen = await page.evaluate(() => window.__game.menu.stack.map((s) => s.title));
check('equip screen reachable',
  reachedEquip && equipScreen.some((t) => t?.includes('Equip')), equipScreen.join(' > '));
for (let i = 0; i < 5; i++) await tap('Escape', 200);
const menuClosed = await page.evaluate(() => window.__game.menu.open);
check('menu closes cleanly', menuClosed === false);

// --- battle -----------------------------------------------------------------
// Stand somewhere that is definitely not the map's arrival tile, so that
// coming back to the spawn point after the fight is detectable. A battle used
// to rebuild the field from scratch, which re-placed the party at the spawn —
// every random encounter dragged the player back to the town gate.
const preBattlePos = await page.evaluate(() => {
  const f = window.__game.state;
  const T = 2;
  const sx = Math.round(f.player.x / T), sz = Math.round(f.player.z / T);
  for (let r = 3; r < 12; r++) {
    for (const [dx, dz] of [[r, 0], [0, r], [-r, 0], [0, -r]]) {
      if (f.map.grid.isWalkTile(sx + dx, sz + dz)) {
        f.player.place((sx + dx) * T + T / 2, (sz + dz) * T + T / 2, 0);
        f.camera.snapTo(f.player.x, f.player.z);
        return { x: f.player.x, z: f.player.z, spawn: { x: sx * T + T / 2, z: sz * T + T / 2 } };
      }
    }
  }
  return { x: f.player.x, z: f.player.z, spawn: null };
});
await page.evaluate(() => window.__game.startBattle({ enemies: ['fenrat', 'fenrat'] }));
await page.waitForFunction(() => window.__game.state?.enemies?.length > 0, null, { timeout: 10000 });
const battleStart = await page.evaluate(() => ({
  enemies: window.__game.state.enemies.length,
  actors: window.__game.state.view.actors.size,
}));
check('battle starts', battleStart.enemies === 2, `${battleStart.actors} actors staged`);

const battleResult = await page.evaluate(async () => {
  const s = window.__game.state;
  const tap = async (code, w) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 55));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };
  const t0 = Date.now();
  while (!s.result && Date.now() - t0 < 60000) {
    if (s.phase === 'menu') { await tap('Enter', 220); await tap('Enter', 650); }
    else await new Promise((r) => setTimeout(r, 140));
  }
  return { result: s.result, enemiesDown: s.enemies.every((e) => e.isKO) };
});
check('battle reaches a result', battleResult.result === 'victory', battleResult.result || 'timeout');

for (let i = 0; i < 8; i++) await tap('Enter', 350);
await page.waitForFunction(() => !!window.__game.state?.player, null, { timeout: 15000 }).catch(() => {});
const afterBattle = await page.evaluate(() => ({
  backOnField: !!window.__game.state?.player,
  gold: window.__game.party.gold,
  exp: window.__game.party.activeMembers[0].exp,
  x: window.__game.state?.player?.x,
  z: window.__game.state?.player?.z,
  npcs: window.__game.state?.npcs?.length,
}));
check('returns to the field after battle', afterBattle.backOnField === true);
const drift = afterBattle.backOnField
  ? Math.hypot(afterBattle.x - preBattlePos.x, afterBattle.z - preBattlePos.z) : Infinity;
check('the party stands where the fight started', drift < 0.75,
  `moved ${drift.toFixed(2)}u${preBattlePos.spawn ? ` (spawn is ${Math.hypot(afterBattle.x - preBattlePos.spawn.x, afterBattle.z - preBattlePos.spawn.z).toFixed(2)}u away)` : ''}`);
check('the field is not rebuilt by a battle', afterBattle.npcs === boot.npcs,
  `${afterBattle.npcs} NPCs, was ${boot.npcs}`);
check('rewards were granted', afterBattle.gold > 500 && afterBattle.exp > 0, `gil=${afterBattle.gold} exp=${afterBattle.exp}`);

// --- overworld travel -------------------------------------------------------
// Baseline the town's frame rate first, for a like-for-like comparison.
const townFps = await page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 900));
  return window.__game.fps;
});

await page.evaluate(() => window.__game.gotoMap('overworld', 'harrowmere'));
await page.waitForFunction(() => window.__game.currentMapId === 'overworld' && window.__game.state?.player, null, { timeout: 15000 });
const world = await page.evaluate(() => {
  const s = window.__game.state;
  const instanced = s.map.group.children.filter((c) => c.isInstancedMesh);
  return {
    tiles: `${s.map.width}x${s.map.height}`,
    drawCalls: s.map.group.children.length,
    instances: instanced.reduce((n, c) => n + c.count, 0),
    exits: s.map.grid.triggers.filter((t) => t.kind === 'exit').map((t) => t.data.to),
    fps: window.__game.fps,
  };
});
check('overworld loads', world.tiles === '64x44', `${world.tiles}, ${world.drawCalls} objects`);
check('glyph props are instanced', world.instances > 300, `${world.instances} instances`);

// Assert the destinations resolve, not a hard-coded count — a magic number
// here just breaks every time a new location is added.
const badExits = await page.evaluate(
  (targets) => targets.filter((id) => !window.__game.mapExists(id)),
  world.exits,
);
check('every overworld exit leads somewhere real',
  world.exits.length >= 5 && badExits.length === 0,
  `${world.exits.length} exits${badExits.length ? `, broken: ${badExits.join(',')}` : ''}`);
// Absolute frame rate is meaningless here — headless Chrome renders on
// SwiftShader with no GPU. What matters is that the continent, with its ~800
// instanced props, is not dramatically more expensive than a town.
check('overworld is not disproportionately expensive',
  world.fps > townFps * 0.35,
  `${Math.round(world.fps)} fps vs ${Math.round(townFps)} in town (software renderer)`);

// Walking back into Harrowmere must actually change map.
const travelled = await page.evaluate(async () => {
  const g = window.__game;
  const s = g.state;
  s.player.place(26 * 2 + 1, 30 * 2 + 1, 0);
  await new Promise((r) => setTimeout(r, 200));
  // Step onto the town's exit tile.
  s.player.place(26 * 2 + 1, 31 * 2 + 1, 0);
  s._checkTriggers();
  await new Promise((r) => setTimeout(r, 2500));
  return g.currentMapId;
});
check('world → town transition works', travelled === 'harrowmere', `now in ${travelled}`);

// --- regional encounters ----------------------------------------------------
const zones = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('overworld', 'harrowmere');
  await new Promise((r) => setTimeout(r, 1400));
  const s = g.state;
  const sample = (tx, tz) => {
    s.player.place(tx * 2 + 1, tz * 2 + 1, 0);
    const t = s.currentEncounterTable();
    // Identify the table by its first formation, since names aren't stored.
    return t ? t.groups[0].enemies.join('+') : 'none';
  };
  return {
    snow: sample(24, 8),
    forest: sample(52, 20),
    fen: sample(12, 31),
    coast: sample(20, 38),
    plains: sample(26, 20),
  };
});
const distinctZones = new Set(Object.values(zones)).size;
check('overworld regions roll different tables', distinctZones >= 4,
  Object.entries(zones).map(([k, v]) => `${k}=${v.split('+')[0]}`).join(' '));

// --- espers -----------------------------------------------------------------
const esper = await page.evaluate(async () => {
  const g = window.__game;
  const vesna = g.party.member('vesna');
  // Pick a spell the esper teaches that is *not* already known, otherwise the
  // measurement is pinned at 100% before it starts.
  const spellId = Object.keys(vesna.esper.teaches).find((id) => !vesna.knowsSpell(id));
  const before = vesna.spells[spellId] ?? 0;
  for (const [id, rate] of Object.entries(vesna.esper.teaches)) vesna.learnSpell(id, rate);
  return {
    owns: g.party.espers.size,
    equipped: vesna.esper?.name,
    spellId, before, after: vesna.spells[spellId],
  };
});
check('esper equipped and owned', esper.owns >= 1 && !!esper.equipped, esper.equipped);
check('esper teaches magic over time', esper.after > esper.before,
  `${esper.spellId} ${esper.before}% → ${esper.after}%`);

// --- summon in battle -------------------------------------------------------
const summon = await page.evaluate(async () => {
  const g = window.__game;
  await g.startBattle({ enemies: ['fenrat', 'fenrat', 'fenrat'] });
  await new Promise((r) => setTimeout(r, 2600));
  const s = g.state;
  const caster = s.party.find((p) => p.member?.esper);
  if (!caster) return { ok: false, why: 'no esper carrier in party' };
  const hpBefore = s.enemies.map((e) => e.hp);
  caster.atb = 100;
  s.activeActor = null;
  s.phase = 'active';
  await new Promise((r) => setTimeout(r, 300));
  s._chooseCommand(caster, 'summon');
  // Wait for the summon to actually resolve rather than for a fixed six
  // seconds. The banner, the camera move and the per-target damage take as
  // long as they take, and on a loaded machine that is longer than any
  // sleep worth hardcoding.
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (s.enemies.some((e, i) => e.hp < hpBefore[i])) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  await new Promise((r) => setTimeout(r, 400));
  return {
    ok: true,
    used: caster._summoned === true,
    mpSpent: caster.mp < caster.maxMP,
    damaged: s.enemies.some((e, i) => e.hp < hpBefore[i]),
  };
});
check('summon fires and costs MP', summon.ok && summon.used && summon.mpSpent, summon.why || '');
check('summon damages the enemy party', summon.damaged === true);

await page.evaluate(() => { const s = window.__game.state; if (s.enemies) s._finish('flee'); });
await new Promise((r) => setTimeout(r, 2500));
await page.waitForFunction(() => !!window.__game.state?.player, null, { timeout: 15000 }).catch(() => {});

// --- shop -------------------------------------------------------------------
const shop = await page.evaluate(async () => {
  const g = window.__game;
  g.party.gold = 5000;
  const before = g.party.countItem('potion');
  // Run it on the game's own scheduler: shop menus read `justPressed`, which
  // is only meaningful inside the fixed simulation step.
  g.run(function* () { yield* g.openShop('harrowmere_items', g.state); }, 'test-shop');
  await new Promise((r) => setTimeout(r, 400));
  const layerPresent = !!document.getElementById('shop-layer');
  const tapNow = async (code) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 70));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 260));
  };
  await tapNow('Enter');       // Buy
  await tapNow('Enter');       // buy the first stocked item
  const after = g.party.countItem('potion');
  await tapNow('Escape');      // back to the shop's main menu

  // Walk the cursor onto Leave rather than assuming two ArrowDowns land
  // exactly once each. Under load a synthetic key event occasionally
  // registers twice, and the run then selects the wrong row.
  for (let step = 0; step < 8; step++) {
    const cur = g.shop?.current?.items?.[g.shop.current.index]?.label;
    if (cur === 'Leave') break;
    await tapNow('ArrowDown');
  }
  await tapNow('Enter');       // Leave
  await new Promise((r) => setTimeout(r, 400));
  return { layerPresent, before, after, gold: g.party.gold, closed: !document.getElementById('shop-layer') };
});
check('shop opens', shop.layerPresent === true);
check('shop sells goods', shop.after > shop.before, `potions ${shop.before} → ${shop.after}, gil ${shop.gold}`);
check('shop closes', shop.closed === true);

// --- spell effects ----------------------------------------------------------
const vfx = await page.evaluate(async () => {
  const g = window.__game;
  g.startBattle({ enemies: ['huskrevenant', 'ferransentry', 'roadwolf'] });
  await new Promise((r) => setTimeout(r, 3000));
  const s = g.state;
  if (!s?.enemies) return { ok: false, why: 'battle did not start' };
  for (const e of s.enemies) { e.maxHP = 999999; e.hp = 999999; }

  const results = {};
  const caster = s.party.find((p) => p.id === 'vesna');
  // Exercise one spell per element family and confirm each emits particles.
  for (const [label, spellId] of [['fire', 'conflagrate'], ['ice', 'glaciate'],
    ['bolt', 'thunderhead'], ['holy', 'sanctus'], ['shadow', 'gravewell'], ['heal', 'mendra']]) {
    caster.atb = 100;
    caster.mp = caster.maxMP = 9999;
    s.activeActor = null;
    s.phase = 'active';
    await new Promise((r) => setTimeout(r, 150));
    const spell = window.__spells[spellId];
    const targets = spell.kind === 'heal' ? [s.party[0]] : s.enemies;
    s._commitAction({ actor: caster, kind: 'spell', spell, targets });
    let peak = 0;
    for (let i = 0; i < 200; i++) {
      await new Promise((r) => setTimeout(r, 16));
      peak = Math.max(peak, s.view.particles.count);
      if (s.phase === 'active' && peak > 0) break;
    }
    results[label] = peak;
  }
  // Nothing may leak: particles must drain and the screen must not stay flashed.
  await new Promise((r) => setTimeout(r, 2500));
  return {
    ok: true, results,
    drained: s.view.particles.count,
    flash: g.renderer.postfx.flashStrength,
  };
});
check('every element emits particles', vfx.ok && Object.values(vfx.results || {}).every((n) => n > 20),
  vfx.ok ? Object.entries(vfx.results).map(([k, v]) => `${k}:${v}`).join(' ') : vfx.why);
check('particles drain after casting', (vfx.drained ?? 999) < 20, `${vfx.drained} left`);
check('screen flash does not stick', (vfx.flash ?? 1) < 0.05, `flash=${(vfx.flash ?? 0).toFixed(3)}`);

await page.evaluate(() => { const s = window.__game.state; if (s?.enemies) s._finish('flee'); });
await new Promise((r) => setTimeout(r, 2600));
await page.waitForFunction(() => !!window.__game.state?.player, null, { timeout: 15000 }).catch(() => {});

// --- dungeon, boss event and reward -----------------------------------------
await page.evaluate(() => window.__game.gotoMap('fen_barrow', 'default'));
await page.waitForFunction(() => window.__game.currentMapId === 'fen_barrow' && window.__game.state?.player, null, { timeout: 15000 });
const dungeon = await page.evaluate(() => {
  const s = window.__game.state;
  return {
    tiles: `${s.map.width}x${s.map.height}`,
    chests: s.map.chests.length,
    lamps: s.map.lamps.map((l) => l.intensity),
    hasBossTrigger: s.map.grid.triggers.some((t) => t.data?.event === 'fenbarrow_boss'),
  };
});
check('dungeon loads', dungeon.tiles === '40x34', `${dungeon.chests} chests`);
check('dungeon lamps are lit', dungeon.lamps.every((i) => i > 0), `intensity ${dungeon.lamps.join(',')}`);
check('boss trigger placed', dungeon.hasBossTrigger === true);

const boss = await page.evaluate(async () => {
  const g = window.__game;
  const s = g.state;
  // Level the party so the fight resolves inside the test budget; this checks
  // the event and reward chain, not the balance curve.
  for (const m of g.party.activeMembers) { m.gainExp(400000); m.fullRestore(); }

  s.player.place(19 * 2 + 1, 12 * 2 + 1, Math.PI);
  await new Promise((r) => setTimeout(r, 200));
  s.player.place(19 * 2 + 1, 11 * 2 + 1, Math.PI);
  s._checkTriggers();

  const tap = async (code, w = 300) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 55));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };

  // Clear the pre-fight scene.
  for (let i = 0; i < 10 && !g.state?.enemies; i++) await tap('Enter', 420);
  const bossName = g.state?.enemies?.[0]?.name;
  const noFlee = g.state?.canFlee === false;

  // Fight it. A boss opens with a line of dialogue *before* the ATB starts, so
  // the driver has to clear open dialogue whatever phase the battle is in —
  // waiting only on `phase === 'menu'` deadlocks on the intro.
  const t0 = Date.now();
  while (g.state?.enemies && !g.state.result && Date.now() - t0 < 240000) {
    if (g.dialogue?.isOpen) await tap('Enter', 200);
    else if (g.state.phase === 'menu') { await tap('Enter', 180); await tap('Enter', 480); }
    else await new Promise((r) => setTimeout(r, 120));
  }
  const result = g.state?.result;
  // Clear the victory spoils and the post-fight scene. Each dialogue page takes
  // two presses — one to skip the type-on, one to advance — so drive it on the
  // actual end condition rather than a guessed number of taps.
  const t1 = Date.now();
  while (Date.now() - t1 < 40000) {
    if (g.party.quests.get('barrow')?.done) break;
    await tap('Enter', 180);
  }
  await new Promise((r) => setTimeout(r, 1200));

  return {
    bossName, noFlee, result,
    slain: g.party.hasFlag('bogfather_slain'),
    gotEsper: g.party.espers.has('hollowking'),
    questDone: g.party.quests.get('barrow')?.done === true,
  };
});
check('boss cutscene starts the fight', boss.bossName === 'The Bogfather', boss.bossName || 'no boss');
check('boss battles disallow fleeing', boss.noFlee === true);
check('boss is defeatable', boss.result === 'victory', boss.result || 'timeout');
check('boss sets its story flag', boss.slain === true);
check('boss grants its esper', boss.gotEsper === true);
check('boss completes its quest', boss.questDone === true);

// --- second town and recruitment --------------------------------------------
const solmere = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('solmere', 'default');
  await new Promise((r) => setTimeout(r, 1600));
  const s = g.state;

  const tap = async (code, w = 220) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 55));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };
  const talkTo = async (id, until) => {
    const npc = s.npcs.find((n) => n.def.id === id);
    if (!npc) return false;
    s.player.place(npc.x, npc.z + 1.4, Math.PI);
    await new Promise((r) => setTimeout(r, 220));
    s._updateInteraction();
    if (s.interactTarget) s._interact(s.interactTarget);
    const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !until()) await tap('Enter', 190);
    await new Promise((r) => setTimeout(r, 500));
    return until();
  };

  const built = { tiles: `${s.map.width}x${s.map.height}`, npcs: s.npcs.length };
  const gotAurelian = await talkTo('aurelian', () => g.party.roster.has('aurelian'));
  const gotBastian = await talkTo('bastian', () => g.party.roster.has('bastian'));
  return {
    ...built,
    gotAurelian, gotBastian,
    roster: [...g.party.roster.keys()],
    followers: g.state.followers.length,
    active: g.party.active.length,
  };
});
check('second town loads', solmere.tiles === '44x32', `${solmere.npcs} NPCs`);
check('Aurelian recruits', solmere.gotAurelian === true);
check('Bastian recruits (gated on Aurelian)', solmere.gotBastian === true);
check('party grows and the line follows', solmere.followers === 3 && solmere.roster.length === 5,
  `${solmere.roster.length} recruited, ${solmere.followers} followers, ${solmere.active} active`);

// --- third location and its boss --------------------------------------------
const ferran = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('ferran_outpost', 'default');
  await new Promise((r) => setTimeout(r, 1600));
  const s = g.state;
  const built = { tiles: `${s.map.width}x${s.map.height}`, npcs: s.npcs.length, chests: s.map.chests.length };

  // Level *and* gear. A boss that halves physical damage — which the Eighth
  // Lantern does, and always said it did — is a fight about bringing the right
  // tool, and an unarmed party has no tools at all.
  for (const m of g.party.activeMembers) {
    m.gainExp(500000);
    for (const [slot, kinds] of Object.entries({
      weapon: ['weapon'], body: ['armor'], head: ['armor'], offhand: ['armor'], relic1: ['relic'],
    })) {
      const usable = Object.values(window.__items ?? {})
        .filter((it) => it.slot === slot && kinds.includes(it.kind) && window.__equippable(it, m));
      const rank = (a, b) => (b.stats?.atk ?? 0) - (a.stats?.atk ?? 0)
        || (b.stats?.def ?? 0) - (a.stats?.def ?? 0);
      const best = usable.filter((it) => !it.element).sort(rank)[0] ?? usable.sort(rank)[0];
      if (best) m.equipment[slot] = best;
    }
    m.fullRestore();
  }
  s.player.place(17 * 2 + 1, 9 * 2 + 1, Math.PI);
  await new Promise((r) => setTimeout(r, 200));
  s.player.place(17 * 2 + 1, 8 * 2 + 1, Math.PI);
  s._checkTriggers();

  const tap = async (code, w = 260) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 55));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };
  for (let i = 0; i < 12 && !g.state?.enemies; i++) await tap('Enter', 400);
  const bossName = g.state?.enemies?.[0]?.name;

  const t0 = Date.now();
  while (g.state?.enemies && !g.state.result && Date.now() - t0 < 240000) {
    if (g.dialogue?.isOpen) await tap('Enter', 190);
    else if (g.state.phase === 'menu') { await tap('Enter', 170); await tap('Enter', 460); }
    else await new Promise((r) => setTimeout(r, 120));
  }
  const result = g.state?.result;
  // Drive to the *last* thing the scene does. `warden_slain` is set before the
  // closing dialogue, so waiting on it stops the driver mid-scene.
  const t1 = Date.now();
  while (Date.now() - t1 < 40000 && g.party.questStage('engine') < 1) await tap('Enter', 180);
  await new Promise((r) => setTimeout(r, 900));
  return { ...built, bossName, result, slain: g.party.hasFlag('warden_slain'), quest: g.party.questStage('engine') };
});
check('third location loads', ferran.tiles === '36x22', `${ferran.npcs} NPCs, ${ferran.chests} chests`);
check('Ferran Warden triggers', ferran.bossName === 'Ferran Warden', ferran.bossName || 'none');
check('Ferran Warden is defeatable', ferran.result === 'victory', ferran.result || 'timeout');
check('Warden advances the main quest', ferran.slain === true && ferran.quest >= 1, `stage ${ferran.quest}`);

// --- optional world-map bosses ----------------------------------------------
const optional = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('overworld', 'harrowmere');
  await new Promise((r) => setTimeout(r, 1500));
  const s = g.state;

  const tap = async (code, w = 240) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 55));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };

  // Trigger an interactable by id and report which boss shows up.
  const provoke = async (id, extraTaps = 6) => {
    const it = s.map.interactables.find((i) => i.id === id);
    if (!it) return null;
    s.player.place(it.at[0], it.at[1] + 1.0, Math.PI);
    await new Promise((r) => setTimeout(r, 220));
    s._updateInteraction();
    if (s.interactTarget) s._interact(s.interactTarget);
    for (let i = 0; i < extraTaps && !g.state?.enemies; i++) await tap('Enter', 420);
    await new Promise((r) => setTimeout(r, 2200));
    const name = g.state?.enemies?.[0]?.name ?? null;
    if (g.state?.enemies) {
      g.state._finish('flee');
      await new Promise((r) => setTimeout(r, 2600));
      await new Promise((r) => setTimeout(r, 800));
    }
    return name;
  };

  const oak = await provoke('wm-oak', 8);
  const baron = await provoke('wm-barricade', 8);
  return { oak, baron };
});
check('Standing Oak is fightable', optional.oak === 'The Standing Oak', optional.oak || 'no boss');
check('Toll Baron ambush is fightable', optional.baron === 'The Toll Baron', optional.baron || 'no boss');

// --- fourth dungeon and its boss --------------------------------------------
const ashen = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('ashenhall', 'default');
  await new Promise((r) => setTimeout(r, 1600));
  const s = g.state;
  const built = { tiles: `${s.map.width}x${s.map.height}`, chests: s.map.chests.length };

  // Level *and* gear. A boss that halves physical damage — which the Eighth
  // Lantern does, and always said it did — is a fight about bringing the right
  // tool, and an unarmed party has no tools at all.
  for (const m of g.party.activeMembers) {
    m.gainExp(900000);
    for (const [slot, kinds] of Object.entries({
      weapon: ['weapon'], body: ['armor'], head: ['armor'], offhand: ['armor'], relic1: ['relic'],
    })) {
      const usable = Object.values(window.__items ?? {})
        .filter((it) => it.slot === slot && kinds.includes(it.kind) && window.__equippable(it, m));
      const rank = (a, b) => (b.stats?.atk ?? 0) - (a.stats?.atk ?? 0)
        || (b.stats?.def ?? 0) - (a.stats?.def ?? 0);
      const best = usable.filter((it) => !it.element).sort(rank)[0] ?? usable.sort(rank)[0];
      if (best) m.equipment[slot] = best;
    }
    m.fullRestore();
  }
  s.player.place(18 * 2 + 1, 9 * 2 + 1, Math.PI);
  await new Promise((r) => setTimeout(r, 200));
  s.player.place(18 * 2 + 1, 8 * 2 + 1, Math.PI);
  s._checkTriggers();

  const tap = async (code, w = 250) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 55));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };
  for (let i = 0; i < 12 && !g.state?.enemies; i++) await tap('Enter', 400);
  const bossName = g.state?.enemies?.[0]?.name;

  const t0 = Date.now();
  while (g.state?.enemies && !g.state.result && Date.now() - t0 < 300000) {
    if (g.dialogue?.isOpen) await tap('Enter', 180);
    else if (g.state.phase === 'menu') { await tap('Enter', 160); await tap('Enter', 440); }
    else await new Promise((r) => setTimeout(r, 120));
  }
  const result = g.state?.result;
  const t1 = Date.now();
  while (Date.now() - t1 < 45000 && !g.party.espers.has('ninthlantern')) await tap('Enter', 175);
  await new Promise((r) => setTimeout(r, 900));
  return { ...built, bossName, result, esper: g.party.espers.has('ninthlantern'), engine: g.party.questStage('engine') };
});
check('fourth dungeon loads', ashen.tiles === '38x28', `${ashen.chests} chests`);
check('Eighth Lantern triggers', ashen.bossName === 'The Eighth Lantern', ashen.bossName || 'none');
check('Eighth Lantern is defeatable', ashen.result === 'victory', ashen.result || 'timeout');
check('Ninth Lantern esper granted', ashen.esper === true, `engine quest stage ${ashen.engine}`);

// --- fifth dungeon ----------------------------------------------------------
const spine = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('cinderspine', 'default');
  await new Promise((r) => setTimeout(r, 1600));
  const s = g.state;
  const built = {
    tiles: `${s.map.width}x${s.map.height}`,
    chests: s.map.chests.length,
    // The pass must be a single connected switchback, not four sealed ledges.
    reachable: (() => {
      const seen = new Set();
      const q = [[16, 24]];
      while (q.length) {
        const [x, z] = q.pop();
        const k = `${x},${z}`;
        if (seen.has(k) || !s.map.grid.isWalkTile(x, z)) continue;
        seen.add(k);
        q.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
      }
      return seen.size;
    })(),
  };

  const tap = async (code, w = 260) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 55));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };
  s.player.place(16 * 2 + 1, 8 * 2 + 1, Math.PI);
  await new Promise((r) => setTimeout(r, 200));
  s.player.place(16 * 2 + 1, 7 * 2 + 1, Math.PI);
  s._checkTriggers();
  for (let i = 0; i < 12 && !g.state?.enemies; i++) await tap('Enter', 400);
  await new Promise((r) => setTimeout(r, 2200));
  const bossName = g.state?.enemies?.[0]?.name;
  if (g.state?.enemies) { g.state._finish('flee'); await new Promise((r) => setTimeout(r, 2800)); }
  return { ...built, bossName };
});
check('fifth dungeon loads', spine.tiles === '34x26', `${spine.chests} chests`);
check('the pass is fully connected', spine.reachable > 300, `${spine.reachable} reachable tiles`);
check('Cinder Wyrm triggers', spine.bossName === 'The Cinder Wyrm', spine.bossName || 'none');

// --- remaining regions and the full roster ----------------------------------
const roster = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.party;
  // These recruits are gated on story flags; the test has already earned the
  // barrow and warden flags, so grant only the lantern gate.
  p.setFlag('lantern_slain');

  const tap = async (code, w = 200) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };

  const visit = async (mapId, npcId, charId, choices = 0) => {
    await g.gotoMap(mapId, 'default');
    await new Promise((r) => setTimeout(r, 1600));
    const s = g.state;
    const npc = s.npcs.find((n) => n.def.id === npcId);
    if (!npc) return { map: mapId, tiles: `${s.map.width}x${s.map.height}`, got: false, why: 'npc missing' };
    s.player.place(npc.x, npc.z + 1.4, Math.PI);
    await new Promise((r) => setTimeout(r, 220));
    s._updateInteraction();
    if (s.interactTarget) s._interact(s.interactTarget);
    // Some recruits open with a choice prompt; confirm defaults through it.
    const t0 = Date.now();
    while (Date.now() - t0 < 30000 && !p.roster.has(charId)) await tap('Enter', 190);
    await new Promise((r) => setTimeout(r, 500));
    return { map: mapId, tiles: `${s.map.width}x${s.map.height}`, got: p.roster.has(charId) };
  };

  const wood = await visit('weeping_wood', 'idris', 'idris');
  const coast = await visit('drowned_coast', 'osric', 'osric');
  const outpost = await visit('ferran_outpost', 'maret', 'maret');
  return { wood, coast, outpost, roster: [...p.roster.keys()] };
});
check('Weeping Wood loads', roster.wood.tiles === '40x27', roster.wood.tiles);
check('Drowned Coast loads', roster.coast.tiles === '40x26', roster.coast.tiles);
check('Idris recruits (gated on Ashenhall)', roster.wood.got === true, roster.wood.why || '');
check('Osric recruits', roster.coast.got === true, roster.coast.why || '');
check('Maret defects (gated on the Warden)', roster.outpost.got === true, roster.outpost.why || '');
check('roster reaches eight', roster.roster.length >= 8, roster.roster.join(', '));

// --- the endgame: is the game actually completable? --------------------------
const finale = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('ninth_well', 'default');
  await new Promise((r) => setTimeout(r, 1700));
  const s = g.state;
  const built = { tiles: `${s.map.width}x${s.map.height}`, chests: s.map.chests.length, saves: 3 };

  // Endgame-level party, and the best gear in the game, so the two bosses
  // resolve inside the test budget.
  //
  // The gear is not decoration. Weapon power is a *separate term* in the
  // damage formula from vigour, so a level-99 character with empty hands hits
  // for about 91 — twenty party turns to take the Warden down, against a move
  // that costs the party half its health every third turn. No real player
  // arrives at the Ninth Well unarmed; testing one that does only measures a
  // fight the game never asks anybody to have.
  for (const m of g.party.activeMembers) {
    m.gainExp(9000000);
    for (const [slot, kinds] of Object.entries({
      weapon: ['weapon'], body: ['armor'], head: ['armor'], offhand: ['armor'], relic1: ['relic'],
    })) {
      const usable = Object.values(window.__items ?? {})
        .filter((it) => it.slot === slot && kinds.includes(it.kind) && window.__equippable(it, m));
      // Prefer plain steel over elemental. The four strongest weapons in the
      // game are aether-elemental and the Warden *absorbs* aether, so picking
      // purely on attack heals the boss back to full every round — which is a
      // fair puzzle for a player and a silly way for a test to lose.
      const rank = (a, b) => (b.stats?.atk ?? 0) - (a.stats?.atk ?? 0)
        || (b.stats?.def ?? 0) - (a.stats?.def ?? 0)
        || (b.price ?? 0) - (a.price ?? 0);
      const best = usable.filter((it) => !it.element).sort(rank)[0] ?? usable.sort(rank)[0];
      if (best) m.equipment[slot] = best;
    }
    m.fullRestore();
  }

  const tap = async (code, w = 230) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };

  // After a boss falls, the victory tally, the post-fight scene and the
  // transition back all take time, and `g.state` is not the field for any of
  // it. Anything that walks the party has to wait for the field to come back
  // or it reaches for `state.player` on a battle.
  const trace = [];
  const snapshot = (where) => trace.push(
    `${where}: map=${g.currentMapId} state=${g.state?.constructor?.name}`
    + ` phase=${g.state?.phase ?? '-'} result=${g.state?.result ?? '-'}`
    + ` enemies=${g.state?.enemies?.length ?? 0} dialogue=${!!g.dialogue?.isOpen}`);

  const waitForField = async (budget = 120000) => {
    const t = Date.now();
    while (Date.now() - t < budget) {
      if (g.state?.player && g.state?.map) return g.state;
      // Keep pressing. A post-boss scene advances on confirm, and `isOpen`
      // is false in the gaps between lines, so waiting for it to be true
      // stalls the whole sequence.
      await tap('Enter', 150);
    }
    return null;
  };

  const fightAt = async (tileX, tileZ, budget) => {
    const st = await waitForField();
    if (!st) { snapshot('fightAt: no field'); return { name: null, result: 'no-field' }; }
    st.player.place(tileX * 2 + 1, (tileZ + 1) * 2 + 1, Math.PI);
    await new Promise((r) => setTimeout(r, 200));
    st.player.place(tileX * 2 + 1, tileZ * 2 + 1, Math.PI);
    st._checkTriggers();
    for (let i = 0; i < 16 && !g.state?.enemies; i++) await tap('Enter', 380);
    const name = g.state?.enemies?.[0]?.name ?? null;
    const t0 = Date.now();
    let nextProbe = 0;
    while (g.state?.enemies && !g.state.result && Date.now() - t0 < budget) {
      const elapsed = Date.now() - t0;
      if (elapsed > nextProbe) {
        nextProbe = elapsed + 20000;
        const e = g.state.enemies[0];
        const party = (g.state.party || []).map((c) =>
          `${c.name}:${c.hp}/${c.maxHP}${c.statuses ? '[' + Object.keys(c.statuses).join('|') + ']' : ''}`);
        trace.push(`  t=${(elapsed / 1000) | 0}s boss=${e?.hp}/${e?.maxHP} phase=${g.state.phase} party=${party.join(' ')}`);
      }
      if (g.dialogue?.isOpen) await tap('Enter', 170);
      else if (g.state.phase === 'menu') { await tap('Enter', 150); await tap('Enter', 420); }
      else await new Promise((r) => setTimeout(r, 110));
    }
    snapshot(`after fight at ${tileX},${tileZ}`);
    if (!name) return { name: null, result: 'never-triggered' };
    return { name, result: g.state?.result ?? (g.state?.player ? 'victory' : 'timeout') };
  };

  // Five minutes. The Warden has 7,200 HP behind 206 defence, so a properly
  // equipped party needs roughly thirty-six connecting hits, and every one of
  // those plays an approach, a swing and a damage popup. The old 150s budget
  // was never exercised on a win, because an unarmed party lost long before it
  // expired.
  const warden = await fightAt(17, 14, 300000);
  // Clear the post-fight scene before walking on.
  const t1 = Date.now();
  while (Date.now() - t1 < 60000 && !g.party.hasFlag('wellwarden_slain')) await tap('Enter', 170);
  await new Promise((r) => setTimeout(r, 1200));
  for (const m of g.party.activeMembers) m.fullRestore();

  // --- the cataclysm sits between the two bosses -------------------------
  const worldBefore = g.party.worldState;
  {
    const st = await waitForField();
    snapshot('before cataclysm');
    if (st) {
    st.player.place(17 * 2 + 1, 10 * 2 + 1, Math.PI);
    await new Promise((r) => setTimeout(r, 200));
    st.player.place(17 * 2 + 1, 9 * 2 + 1, Math.PI);
    st._checkTriggers();
    // Drive to the *end* of the scene. `worldState` flips partway through, so
    // stopping there leaves the party still standing in the Well instead of
    // thrown out onto the road, and the beat goes untested.
    const t = Date.now();
    while (Date.now() - t < 60000 && g.currentMapId !== 'overworld') await tap('Enter', 170);
    await new Promise((r) => setTimeout(r, 2500));
    }
  }
  const cataclysm = {
    before: worldBefore,
    after: g.party.worldState,
    thrownTo: g.currentMapId,
    skyChanged: g.state?.mapDef?.subtitle,
  };

  // Walk back in and finish it.
  await g.gotoMap('ninth_well', 'default');
  await waitForField();
  await new Promise((r) => setTimeout(r, 900));
  for (const m of g.party.activeMembers) m.fullRestore();
  const vhaine = await fightAt(17, 7, 300000);
  // Drive the entire ending sequence out.
  const t2 = Date.now();
  while (Date.now() - t2 < 90000 && !g.party.hasFlag('game_complete')) await tap('Enter', 165);
  for (let i = 0; i < 30; i++) await tap('Enter', 150);
  await new Promise((r) => setTimeout(r, 1200));

  return {
    ...built, trace,
    warden: warden.name, wardenResult: warden.result,
    cataclysm,
    vhaine: vhaine.name, vhaineResult: vhaine.result,
    complete: g.party.hasFlag('game_complete'),
    engineQuest: g.party.quests.get('engine')?.done === true,
  };
});
for (const line of finale.trace || []) console.log(`  [trace] ${line}`);
check('endgame dungeon loads', finale.tiles === '36x34', `${finale.chests} chests`);
check('Engine Warden triggers and falls', finale.warden === 'Warden of the Ninth Well' && finale.wardenResult === 'victory',
  `${finale.warden || 'none'} → ${finale.wardenResult || 'timeout'}`);
check('the world breaks at the midpoint',
  finale.cataclysm.before === 'whole'
  && finale.cataclysm.after === 'ruin'
  && finale.cataclysm.thrownTo === 'overworld',
  `${finale.cataclysm.before} → ${finale.cataclysm.after}, thrown to ${finale.cataclysm.thrownTo}`);
check('final boss triggers and falls', finale.vhaine === 'Vhaine, Unwound' && finale.vhaineResult === 'victory',
  `${finale.vhaine || 'none'} → ${finale.vhaineResult || 'timeout'}`);

// --- the second world -------------------------------------------------------
const ruin = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.party;
  p.worldState = 'ruin';

  const tap = async (code, w = 190) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };

  const visit = async (mapId, npcId, charId) => {
    await g.gotoMap(mapId, 'default');
    await new Promise((r) => setTimeout(r, 1700));
    const s = g.state;
    const info = { subtitle: s.mapDef.subtitle, npcs: s.npcs.map((n) => n.def.id) };
    if (!npcId) return info;
    const npc = s.npcs.find((n) => n.def.id === npcId);
    if (!npc) return { ...info, got: false, why: `${npcId} missing` };
    s.player.place(npc.x, npc.z + 1.3, Math.PI);
    await new Promise((r) => setTimeout(r, 220));
    s._updateInteraction();
    if (s.interactTarget) s._interact(s.interactTarget);
    const t0 = Date.now();
    while (Date.now() - t0 < 30000 && !p.roster.has(charId)) await tap('Enter', 180);
    await new Promise((r) => setTimeout(r, 500));
    return { ...info, got: p.roster.has(charId) };
  };

  const world = await visit('overworld', 'tam', 'tam');
  const town = await visit('harrowmere', 'ilsabet', 'ilsabet');
  const city = await visit('solmere', 'kestrel', 'kestrel');
  return { world, town, city, roster: [...p.roster.keys()] };
});
check('the ruined world reads as a different place',
  ruin.world.subtitle === 'After' && ruin.town.subtitle?.includes('What Is Left'),
  `overworld "${ruin.world.subtitle}", Harrowmere "${ruin.town.subtitle}"`);
check('lost NPCs are gone from the ruined world',
  !ruin.world.npcs.includes('pilgrim') && !ruin.town.npcs.includes('kid2'),
  `overworld: ${ruin.world.npcs.join(',')}`);
check('Tam recruits in the ruin', ruin.world.got === true, ruin.world.why || '');
check('Ilsabet recruits in the ruin', ruin.town.got === true, ruin.town.why || '');
check('Kestrel recruits in the ruin', ruin.city.got === true, ruin.city.why || '');
check('roster reaches eleven', ruin.roster.length >= 11, `${ruin.roster.length}: ${ruin.roster.join(', ')}`);

// --- interiors and the last recruits ----------------------------------------
const interiors = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.party;
  p.worldState = 'whole';   // interiors are hung off the intact town

  const tap = async (code, w = 190) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    await new Promise((r) => setTimeout(r, w));
  };

  await g.gotoMap('harrowmere', 'default');
  await new Promise((r) => setTimeout(r, 1700));
  let s = g.state;

  // Walking into a door should load the interior with no prompt.
  const doorTriggers = s.map.grid.triggers.filter((t) => t.kind === 'exit' && t.data.to?.includes('_harrowmere'));
  const door = doorTriggers[0];
  let entered = null;
  if (door) {
    s.player.place(door.x + 1, door.z + 1, 0);
    s._checkTriggers();
    await new Promise((r) => setTimeout(r, 2200));
    entered = g.currentMapId;
  }

  // And back out again.
  let returned = null;
  if (entered && entered !== 'harrowmere') {
    const st = g.state;
    const back = st.map.grid.triggers.find((t) => t.kind === 'exit');
    st.player.place(back.x + 1, back.z + 1, 0);
    st._checkTriggers();
    await new Promise((r) => setTimeout(r, 2200));
    returned = g.currentMapId;
  }

  const visit = async (mapId, npcId, charId) => {
    await g.gotoMap(mapId, 'default');
    await new Promise((r) => setTimeout(r, 1700));
    const st = g.state;
    const npc = st.npcs.find((n) => n.def.id === npcId);
    if (!npc) return { got: false, why: `${npcId} missing in ${mapId}` };
    st.player.place(npc.x, npc.z + 1.2, Math.PI);
    await new Promise((r) => setTimeout(r, 220));
    st._updateInteraction();
    if (st.interactTarget) st._interact(st.interactTarget);
    const t0 = Date.now();
    while (Date.now() - t0 < 30000 && !p.roster.has(charId)) await tap('Enter', 180);
    await new Promise((r) => setTimeout(r, 400));
    return { got: p.roster.has(charId) };
  };

  const oda = await visit('shop_harrowmere', 'oda', 'oda');
  const rusk = await visit('palace_solmere', 'rusk', 'rusk');
  // The Mask only appears after the world breaks.
  p.worldState = 'ruin';
  const mask = await visit('ninth_well', 'themask', 'themask');

  return {
    doors: doorTriggers.length, entered, returned,
    oda, rusk, mask, roster: [...p.roster.keys()],
  };
});
check('buildings have enterable doors', interiors.doors >= 3, `${interiors.doors} doors in Harrowmere`);
check('walking into a door loads the interior',
  !!interiors.entered && interiors.entered !== 'harrowmere', `entered ${interiors.entered}`);
check('leaving an interior returns to the town', interiors.returned === 'harrowmere', `back to ${interiors.returned}`);

// --- controls ----------------------------------------------------------------
// Both of these shipped broken and neither was caught, because the suite
// teleports the player with `place()` instead of walking, and drives dialogue
// by mashing Enter — which hides a box that closes and immediately reopens.
const controls = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('harrowmere', 'default');
  await new Promise((r) => setTimeout(r, 1600));
  const st = g.state;
  const V3 = window.THREE_V3;

  // Which way does each key actually send the party, on screen?
  const dirs = {};
  for (const [key, vec] of Object.entries({ W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] })) {
    const d = st.camera.transformInput(vec[0], vec[1]);
    const a = new V3(st.player.x, 1, st.player.z).project(g.renderer.camera);
    const b = new V3(st.player.x + d.x * 3, 1, st.player.z + d.z * 3).project(g.renderer.camera);
    dirs[key] = { sx: b.x - a.x, sy: b.y - a.y };
  }

  // One confirm press must dismiss a one-page line, not restart it.
  const npc = st.npcs.find((n) => n.def.talk && !n.def.event && !n.def.shop && !n.def.inn);
  let closes = 0;
  if (npc) {
    const orig = g.dialogue.close.bind(g.dialogue);
    g.dialogue.close = () => { closes++; orig(); };
    st.player.place(npc.x, npc.z + 1.2, Math.PI);
    await new Promise((r) => setTimeout(r, 300));
    const tap = async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', bubbles: true }));
      await new Promise((r) => setTimeout(r, 320));
    };
    await tap();                       // opens, and starts typing
    const opened = !!g.dialogue.isOpen;

    // Press until it goes away. The count is not fixed: the first press after
    // opening skips the typewriter and only the next one dismisses, so a long
    // line legitimately needs three. What matters is that it closes at all —
    // before the interaction guard it never did, because the press that shut
    // the box was still flagged when the interaction check ran again and
    // immediately reopened the same conversation.
    let presses = 1;
    while (g.dialogue.isOpen && presses < 6) { await tap(); presses++; }
    const closed = !g.dialogue.isOpen && !st.busy;

    // And it must stay shut rather than reopening on its own.
    await new Promise((r) => setTimeout(r, 700));
    const stayedShut = !g.dialogue.isOpen && !st.busy;
    g.dialogue.close = orig;
    return { dirs, opened, closed, stayedShut, closes, presses };
  }
  return { dirs, opened: false, closed: false, stayedShut: false, closes };
});
check('W walks up the screen', controls.dirs.W.sy > 0.01, `screenY ${controls.dirs.W.sy.toFixed(2)}`);
check('S walks down the screen', controls.dirs.S.sy < -0.01, `screenY ${controls.dirs.S.sy.toFixed(2)}`);
check('A walks left', controls.dirs.A.sx < -0.01, `screenX ${controls.dirs.A.sx.toFixed(2)}`);
check('D walks right', controls.dirs.D.sx > 0.01, `screenX ${controls.dirs.D.sx.toFixed(2)}`);
check('talking to an NPC opens a line', controls.opened === true);
check('confirm dismisses it', controls.closed === true, `${controls.presses} press(es)`);
check('it does not reopen itself', controls.stayedShut === true);

// Movement is camera-relative: turn the camera and the same key has to send
// the party the same way *on screen*, not the same way in the world.
const relative = await page.evaluate(async () => {
  const g = window.__game;
  const st = g.state;
  const V3 = window.THREE_V3;
  const screenDir = (key) => {
    const vec = { W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] }[key];
    const d = st.camera.transformInput(vec[0], vec[1]);
    const a = new V3(st.player.x, 1, st.player.z).project(g.renderer.camera);
    const b = new V3(st.player.x + d.x * 3, 1, st.player.z + d.z * 3).project(g.renderer.camera);
    return { sx: b.x - a.x, sy: b.y - a.y };
  };
  const out = [];
  for (const yaw of [Math.PI, 3 * Math.PI / 4, Math.PI / 2, Math.PI / 4,
                     0, -Math.PI / 4, -Math.PI / 2, -3 * Math.PI / 4]) {
    st.camera.yaw = st.camera.targetYaw = yaw;
    st.camera.snapTo(st.player.x, st.player.z);
    await new Promise((r) => setTimeout(r, 120));
    out.push({ yaw, W: screenDir('W'), D: screenDir('D') });
  }
  st.camera.yaw = st.camera.targetYaw = Math.PI;
  st.camera.snapTo(st.player.x, st.player.z);
  return out;
});
const stillUp = relative.every((r) => r.W.sy > 0.01 && Math.abs(r.W.sx) < 0.05);
const stillRight = relative.every((r) => r.D.sx > 0.01 && Math.abs(r.D.sy) < 0.05);
check('movement follows the camera, not the world', stillUp && stillRight,
  `${relative.length} camera angles`
  + (stillUp && stillRight ? '' : ` — worst W (${relative.map((r) => r.W.sy.toFixed(2)).join(', ')})`));

// --- on-screen controls ------------------------------------------------------
// Driven with a real mouse rather than dispatched events: synthetic events
// ignore `pointer-events`, so a bar that was visually present but unclickable
// would still pass. This presses the actual pixels.
const barIds = await page.evaluate(() =>
  [...document.querySelectorAll('.control-btn')].map((b) => b.dataset.id));
check('the control bar is on screen', barIds.length >= 6, barIds.join(', '));

const holdButton = async (id, ms = 160) => {
  const box = await page.locator(`.control-btn[data-id="${id}"]`).boundingBox();
  if (!box) return false;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await new Promise((r) => setTimeout(r, ms));
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 280));
  return true;
};

const yawBefore = await page.evaluate(() => window.__game.state.camera.targetYaw);
await holdButton('cam-left');
const yawLeft = await page.evaluate(() => window.__game.state.camera.targetYaw);
await holdButton('cam-right');
const yawBack = await page.evaluate(() => window.__game.state.camera.targetYaw);
check('a control-bar camera button turns the camera',
  Math.abs(yawLeft - yawBefore - Math.PI / 4) < 0.01 && Math.abs(yawBack - yawBefore) < 0.01,
  `${(yawBefore * 180 / Math.PI).toFixed(0)}° → ${(yawLeft * 180 / Math.PI).toFixed(0)}° → back`);

await page.click('.control-btn[data-id="pause"]');
await new Promise((r) => setTimeout(r, 250));
const paused = await page.evaluate(async () => {
  const t0 = window.__game.party.playTime;
  await new Promise((r) => setTimeout(r, 500));
  return { flag: window.__game.paused, frozen: Math.abs(window.__game.party.playTime - t0) < 1e-6 };
});
await page.click('.control-btn[data-id="pause"]');
await new Promise((r) => setTimeout(r, 500));
const resumed = await page.evaluate(async () => {
  const t0 = window.__game.party.playTime;
  await new Promise((r) => setTimeout(r, 400));
  return { flag: window.__game.paused, ticking: window.__game.party.playTime > t0 };
});
check('the pause button stops the game', paused.flag === true && paused.frozen === true);
check('and starts it again', resumed.flag === false && resumed.ticking === true);

await page.click('.control-btn[data-id="menu"]');
await new Promise((r) => setTimeout(r, 600));
const menuOpened = await page.evaluate(() => !!window.__game.menu?.open);
for (let i = 0; i < 5; i++) await tap('Escape', 200);
const menuShut = await page.evaluate(() => !window.__game.menu?.open);
check('the menu button opens the menu', menuOpened === true && menuShut === true);

// --- signposting -------------------------------------------------------------
// Every exit in the game carries a name and nothing ever displayed it, so a
// village entrance was indistinguishable from open ground.
const signs = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('overworld', 'default');
  await new Promise((r) => setTimeout(r, 1500));
  const st = g.state;
  const T = 2;
  const named = st.map.grid.triggers.filter((t) => t.kind === 'exit' && t.data?.prompt);

  // Stand just short of a town gate and see whether it names itself.
  const gate = st.map.grid.triggers.find((t) => t.kind === 'exit' && t.data?.prompt === 'Harrowmere');
  let shown = null, far = null;
  if (gate) {
    const gx = gate.x + gate.w / 2, gz = gate.z + gate.d / 2;
    st.player.place(gx, gz - 2.4, 0);
    st.camera.snapTo(st.player.x, st.player.z);
    await new Promise((r) => setTimeout(r, 400));
    const el = document.querySelector('.place-sign');
    shown = el && !el.classList.contains('hidden') ? el.textContent : null;

    // And go quiet away from every gate. Not simply "far from this one":
    // the first attempt walked 24 units south and picked up Oxmere's gate
    // instead, which is the feature working, not failing.
    const T2 = 2;
    let spot = null;
    for (let tz = 2; tz < st.map.height - 2 && !spot; tz++) {
      for (let tx = 2; tx < st.map.width - 2 && !spot; tx++) {
        if (!st.map.grid.isWalkTile(tx, tz)) continue;
        const wx = tx * T2 + T2 / 2, wz = tz * T2 + T2 / 2;
        const clear = named.every((t) => {
          const qx = Math.max(t.x, Math.min(wx, t.x + t.w));
          const qz = Math.max(t.z, Math.min(wz, t.z + t.d));
          return Math.hypot(wx - qx, wz - qz) > 12;
        });
        if (clear) spot = { wx, wz };
      }
    }
    if (spot) {
      st.player.place(spot.wx, spot.wz, 0);
      st.camera.snapTo(st.player.x, st.player.z);
      await new Promise((r) => setTimeout(r, 400));
      far = el && !el.classList.contains('hidden') ? el.textContent : null;
    }
  }
  return { named: named.length, total: st.map.grid.triggers.filter((t) => t.kind === 'exit').length, shown, far };
});
check('every world-map exit is named', signs.named === signs.total, `${signs.named}/${signs.total}`);
check('approaching a village names it', signs.shown === 'Harrowmere', signs.shown || 'nothing shown');
check('the name fades once you leave', signs.far === null, signs.far || 'hidden');

// A door with something lethal behind it has to say so. Nothing in this game
// is gated on a story flag — it is an open world and locking the road would be
// the opposite of one — so the only thing standing between a starting party and
// the Pilgrim's Rest, whose entrance is written for level 68, is being told.
//
// Tested in both directions on purpose. The first version only checked that a
// warning appeared, and failed here because by this point in the suite the
// party is level 93 — at which point saying nothing about a level-68 road is
// the feature working, not failing. The contract is that the sign reads the
// gap between the party and the place, so both ends of that have to hold.
const warned = await page.evaluate(async () => {
  const g = window.__game;
  await g.gotoMap('overworld', 'default');
  await new Promise((r) => setTimeout(r, 900));
  const st = g.state;
  const el = document.querySelector('.place-sign');

  const read = async (prompt) => {
    const gate = st.map.grid.triggers.find((t) => t.kind === 'exit' && t.data?.prompt === prompt);
    if (!gate) return { prompt, missing: true };
    st.player.place(gate.x + gate.w / 2, gate.z + gate.d / 2 - 2.4, 0);
    st.camera.snapTo(st.player.x, st.player.z);
    await new Promise((r) => setTimeout(r, 350));
    const warn = el?.querySelector('.sign-warn');
    return { prompt, shown: !el?.classList.contains('hidden'), warn: warn?.textContent ?? null };
  };

  // Borrow a starting party's levels, then hand them back — later checks read
  // the real ones.
  const levels = new Map([...g.party.roster].map(([id, m]) => [id, m.level]));
  for (const m of g.party.roster.values()) m.level = 6;
  const low = { deadly: await read("Pilgrim's Rest"), home: await read('Harrowmere') };
  for (const m of g.party.roster.values()) m.level = 93;
  const high = { deadly: await read("Pilgrim's Rest") };
  for (const [id, lv] of levels) g.party.roster.get(id).level = lv;

  return { low, high };
});
check('a lethal doorway warns a starting party', !!warned.low.deadly.warn,
  warned.low.deadly.missing ? 'gate not found'
    : `lv 6 at Pilgrim's Rest — ${warned.low.deadly.warn ?? 'no warning'}`);
check('a safe doorway does not', warned.low.home.shown && !warned.low.home.warn,
  warned.low.home.warn ?? 'clean');
check('the warning goes away once you outgrow it', !warned.high.deadly.warn,
  warned.high.deadly.warn ? `lv 93 still warned — ${warned.high.deadly.warn}` : 'silent at lv 93');

// --- statuses that exist have to do something --------------------------------
//
// Charm, Imp and Float were in the status table, displayed in the UI, granted
// by three learnable spells and guarded against by four relics, and no line of
// code read any of them. The player paid the MP and spent the turn for nothing.
// This is the class of bug that never throws and never looks broken, so it
// gets a check rather than a comment.
const statuses = await page.evaluate(async () => {
  const g = window.__game;
  g.startBattle({ enemies: ['fenrat', 'fenrat'] }, { scenery: 'field' });
  await new Promise((r) => setTimeout(r, 3000));
  const bt = g.state;
  const drive = (gen) => { let r = gen.next(), n = 0; while (!r.done && n++ < 400) r = gen.next(); return r.value; };
  const hero = bt.party[0], foe = bt.enemies[0];
  const out = {};

  out.earthLands = drive(bt.resolvePhysical(foe, hero, { power: 1, element: 'earth' })) > 0;
  hero.addStatus('float');
  const hp0 = hero.hp;
  drive(bt.resolvePhysical(foe, hero, { power: 1, element: 'earth' }));
  out.floatBlocks = hero.hp === hp0;
  hero.removeStatus('float');

  const avg = () => { let t = 0; for (let i = 0; i < 8; i++) t += drive(bt.resolvePhysical(foe, hero, { power: 1 })); return t / 8; };
  const normal = avg();
  foe.addStatus('imp');
  out.impRatio = avg() / Math.max(1, normal);
  foe.removeStatus('imp');

  bt.ui.clearMenus();
  hero.addStatus('charm');
  bt.activeActor = null;
  bt._beginPlayerTurn(hero);
  out.charmActsAlone = !bt.ui.activeMenu;
  hero.removeStatus('charm');
  bt.ui.clearMenus();
  return out;
});
check('Float turns earth aside', statuses.earthLands && statuses.floatBlocks,
  statuses.earthLands ? (statuses.floatBlocks ? 'earth nullified while floating' : 'float did nothing')
    : 'earth did not land at all');
check('Imp cripples what it lands on', statuses.impRatio < 0.4,
  `an imp deals ${(statuses.impRatio * 100).toFixed(0)}% of normal damage`);
check('Charm takes the turn away', statuses.charmActsAlone === true,
  statuses.charmActsAlone ? 'no command menu, acted on its own' : 'the player still got their menu');

// --- the airship -------------------------------------------------------------
const airship = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.party;
  // Borrow the pre-cataclysm world so the locked-mast case can be tested, and
  // hand it back at the end — later checks read this.
  const worldWas = p.worldState;
  p.worldState = 'whole';
  p.flags.delete('airship');
  await g.gotoMap('overworld', 'default');
  await new Promise((r) => setTimeout(r, 1800));
  const st = g.state;

  const mast = st.map.interactables.find((it) => it.data?.airship);
  const before = { mast: !!mast, flying: !!st.vehicle };

  // Without the flag the mast should refuse politely rather than fly.
  st.player.place(mast.at[0], mast.at[1] + 1.2, Math.PI);
  await new Promise((r) => setTimeout(r, 250));
  st._updateInteraction();
  if (st.interactTarget) st._interact(st.interactTarget);
  await new Promise((r) => setTimeout(r, 900));
  const lockedOut = !st.vehicle;
  g.dialogue?.close();
  st.busy = false;

  // Grant it and board.
  p.setFlag('airship');
  st.board(g);
  const boarded = !!st.vehicle;
  const startX = st.vehicle?.x;

  // Fly: drive the controller directly rather than through key events, so this
  // measures the flight model and not the input layer.
  const before2 = { x: st.vehicle.x, z: st.vehicle.z };
  st.vehicle.thrust = 1;
  for (let i = 0; i < 90; i++) st._updateAirship(1 / 60);
  const moved = Math.hypot(st.vehicle.x - before2.x, st.vehicle.z - before2.z);

  // Flight ignores terrain: park it over open water and confirm it is airborne
  // there but refuses to land.
  st.vehicle.x = 2 * 2; st.vehicle.z = 2 * 2;
  const overWater = !st.canLand();

  // Land somewhere legal, and confirm the hull stays put.
  st.vehicle.x = 26 * 2; st.vehicle.z = 30 * 2;
  const canLandOnRoad = st.canLand();
  st.disembark(g);
  const landed = !st.vehicle && !!st.parked;
  const remembered = p.airship?.map === 'overworld';

  // Leave and come back: the ship should still be there.
  await g.gotoMap('harrowmere', 'default');
  await new Promise((r) => setTimeout(r, 1400));
  await g.gotoMap('overworld', 'default');
  await new Promise((r) => setTimeout(r, 1600));
  const stillParked = !!g.state.parked;

  p.worldState = worldWas;
  return { ...before, lockedOut, boarded, startX, moved, overWater,
    canLandOnRoad, landed, remembered, stillParked };
});
check('the world map has a mooring mast', airship.mast === true);
check('the mast refuses to fly before the airship is earned', airship.lockedOut === true);
check('the party can board', airship.boarded === true);
check('the airship flies', airship.moved > 8, `travelled ${airship.moved?.toFixed(1)} units in 1.5s`);
check('it will not land on open water', airship.overWater === true);
check('it lands on open ground', airship.canLandOnRoad === true && airship.landed === true);
check('a landed airship stays where it was left',
  airship.remembered === true && airship.stillParked === true);

// --- the second continent ----------------------------------------------------
const crossing = await page.evaluate(async () => {
  const g = window.__game;
  const p = g.party;
  p.setFlag('airship');
  p.airship = null;
  await g.gotoMap('overworld', 'default');
  await new Promise((r) => setTimeout(r, 1700));
  const st = g.state;

  const declared = !!st.mapDef.crossing;
  st.board(g);
  const flying = !!st.vehicle;

  // A crossing must not be on offer in the middle of the map.
  st.vehicle.x = 30 * 2; st.vehicle.z = 22 * 2;
  const midMap = st._atCrossingEdge(st.mapDef.crossing.edge);

  // Fly to the eastern edge and it should be.
  st.vehicle.x = (st.map.grid.w - 1) * 2; st.vehicle.z = 22 * 2;
  const atEdge = st._atCrossingEdge(st.mapDef.crossing.edge);

  await g.gotoMap(st.mapDef.crossing.to, st.mapDef.crossing.spawn, { byAir: true });
  await new Promise((r) => setTimeout(r, 1900));
  const arrived = g.currentMapId;
  const stillFlying = !!g.state?.vehicle;
  const size = `${g.state.map.width}x${g.state.map.height}`;

  // And back again, so the crossing is not one-way.
  const back = g.state.mapDef.crossing;
  await g.gotoMap(back.to, back.spawn, { byAir: true });
  await new Promise((r) => setTimeout(r, 1700));
  const home = g.currentMapId;

  return { declared, flying, midMap, atEdge, arrived, stillFlying, size, home };
});
check('the world map declares a crossing', crossing.declared === true);
check('no crossing is offered mid-map', crossing.midMap === false);
check('the crossing appears at the edge of the world', crossing.atEdge === true);
check('flying east reaches the second continent',
  crossing.arrived === 'eastreach', `${crossing.arrived} (${crossing.size})`);
check('the party arrives still airborne', crossing.stillFlying === true);
check('the crossing works both ways', crossing.home === 'overworld');
check('Oda recruits', interiors.oda.got === true, interiors.oda.why || '');
check('Rusk recruits', interiors.rusk.got === true, interiors.rusk.why || '');
check('The Mask recruits (ruin only)', interiors.mask.got === true, interiors.mask.why || '');
check('the whole cast is recruitable', interiors.roster.length === 14,
  `${interiors.roster.length}/14: ${interiors.roster.join(', ')}`);

const persisted = await page.evaluate(() => {
  const g = window.__game;
  g.saves.save(2, g);
  const data = g.saves.load(2);
  return { saved: data?.party?.worldState, roster: data?.party?.roster?.length };
});
check('world state survives a save', persisted.saved === 'ruin',
  `saved as "${persisted.saved}", ${persisted.roster} members`);
check('THE GAME IS COMPLETABLE', finale.complete === true && finale.engineQuest === true,
  finale.complete ? 'ending reached, main quest closed' : 'ending not reached');

// --- save / load ------------------------------------------------------------
const saveLoad = await page.evaluate(() => {
  const g = window.__game;
  g.party.gold = 4321;
  const ok = g.saves.save(0, g);
  const peek = g.saves.peek(0);
  const data = g.saves.load(0);
  return { ok, peek, gold: data?.party?.gold, names: data?.partyNames };
});
check('save writes a slot', saveLoad.ok === true, `${saveLoad.peek?.location} Lv${saveLoad.peek?.level}`);
check('save round-trips party data', saveLoad.gold === 4321, `gold=${saveLoad.gold}, party=${(saveLoad.names || []).join('/')}`);

// --- console ---------------------------------------------------------------
check('no console errors', consoleErrors.length === 0,
  consoleErrors.slice(0, 3).join(' | ') || 'clean');

await browser.close();

console.log('');
console.log(`${results.length - failures}/${results.length} checks passed`);
process.exit(failures > 0 ? 1 : 0);
