import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { prepareCampaign } from '../src/campaign/content.js';
import { newGame, makeMember } from '../src/core/state.js';
const data = prepareCampaign(Object.fromEntries(await Promise.all(['characters','enemies','items','spells','legend'].map(async name => [name, JSON.parse(await readFile(`content/data/${name}.json`, 'utf8'))]))));
const port = 4209, server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'] });
let browser;
async function assertPartyPanel(page) {
  const visible = await page.evaluate(() => {
    const panel = document.getElementById('battle-party').getBoundingClientRect();
    const rows = [...document.querySelectorAll('#battle-party .hero-row')].map(row => row.getBoundingClientRect());
    return rows.length === 5 && rows.every(row => row.left >= 0 && row.right <= innerWidth && row.top >= panel.top && row.bottom <= Math.min(innerHeight, panel.bottom));
  });
  assert.ok(visible, 'Every party member’s HP and MP remains inside the visible battle panel');
}
const cases = [
  ['town', 'harrowmere', [14.5,14]], ['inn', 'harrow_inn', [7.5,8]], ['road', 'silt_road', [16.5,15]],
  ['barrow', 'fen_cistern', [24,9]], ['foundry', 'foundry_furnace', [22,10]], ['airship', 'airship_deck', [8.5,14]],
  ['summit', 'sky_pass', [6.5,14]], ['engine', 'engine_heart', [13.5,14]],
];
try {
  await new Promise(resolve => server.stdout.once('data', resolve)); await mkdir('.renders', { recursive: true }); browser = await chromium.launch({ headless: true });
  const selected = process.argv.slice(2);
  for (const [name, mapId, position] of cases.filter(([name]) => !selected.length || selected.includes(name))) {
    const state = newGame(data); state.flags = ['opening','elder-briefing','root-bell','elder-return','foundry-mission','furnace-crown','launched'];
    state.roster = ['vesna','corvin','wick','kestrel','aurelian'].map(id => makeMember(data.characters[id], 14, data)); state.active = state.roster.map(h => h.id);
    state.mapId = mapId; state.position = position;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); page.setDefaultTimeout(45000);
    const errors = []; page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(value => localStorage.setItem('aetherbound.v2.save', JSON.stringify(value)), state);
    await page.goto(`http://127.0.0.1:${port}/?test`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Continue/ }).click();
    await page.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field' && !window.__AETHERBOUND__.world.locked);
    await page.waitForTimeout(350);
    const standing = await page.evaluate(() => {
      const w = window.__AETHERBOUND__.world, party = [w.player,...w.followers];
      return party.map(a => ({ name:a.root.name, grounded: a.root.position.y === 0, valid:w.canStand(a.root.position), separation: Math.min(...party.filter(b => b !== a).map(b => b.root.position.distanceTo(a.root.position))) }));
    });
    assert.ok(standing.every(a => a.grounded && a.valid && a.separation > .8), `${name}: valid, separated party spawn ${JSON.stringify(standing)}`);
    await page.screenshot({ path: `.renders/presentation-${name}.png` });
    if (['road','barrow','foundry','engine'].includes(name)) {
      await page.evaluate(enemy => { void window.__AETHERBOUND__.startBattle([enemy]); }, name === 'engine' ? 'thefirstengine' : name === 'foundry' ? 'ferranwarden' : name === 'barrow' ? 'bogfather' : 'reedstalker');
      await page.waitForSelector('#command-panel:not(.hidden)');
      await page.screenshot({ path: `.renders/presentation-battle-${name}.png` });
      if (name === 'engine') {
        await page.setViewportSize({ width:390, height:844 }); await page.waitForTimeout(500);
        const heroes = await page.evaluate(() => {
          const app = window.__AETHERBOUND__, b = app.battle;
          return b.model.party.map(hero => { const actor = b.actors.get(hero.uid), p = actor.root.position.clone(); p.y += 1; return { id:hero.id, ...b.renderer.project(p) }; });
        });
        assert.ok(heroes.every(h => h.x > 8 && h.x < 382 && h.y > 100 && h.y < 420), `Phone stage keeps every hero above commands: ${JSON.stringify(heroes)}`);
        await assertPartyPanel(page);
        await page.screenshot({ path: '.renders/presentation-battle-phone.png' });
        await page.setViewportSize({ width:844, height:390 }); await page.waitForTimeout(500);
        await assertPartyPanel(page);
        await page.screenshot({ path: '.renders/presentation-battle-landscape.png' });
      }
    }
    assert.deepEqual(errors, [], `${name}: no browser errors`); console.log(`Presentation passed: ${name}`); await page.close();
  }
} finally { await browser?.close(); server.kill('SIGTERM'); }
