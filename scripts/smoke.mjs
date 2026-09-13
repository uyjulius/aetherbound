import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { browserPage } from './browser-page.mjs';

const port = 4197;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'] });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer() {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) return; } catch {} await wait(100); }
  throw new Error('Smoke server did not start');
}
async function opening(page) {
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => window.__AETHERBOUND__.state.flags.includes('opening'))) return;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(90);
  }
  throw new Error('Opening dialogue did not finish');
}
let browser, passed = false;
try {
  await waitForServer(); await mkdir('.renders', { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browserPage(browser, { viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/?test`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /New Journey/ }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field');
  console.log('Field loaded');
  await opening(page);
  await page.keyboard.press('Enter');
  await page.getByText('Party restored. Journey saved at the aether mark.').waitFor();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.checkpoint.mapId), 'harrowmere');
  const pose = () => page.evaluate(() => {
    const actor = window.__AETHERBOUND__.world.player;
    const bones = []; actor.model.traverse(node => { if (node.isBone) bones.push(...node.quaternion.toArray()); });
    return { x: actor.root.position.x, z: actor.root.position.z, y: actor.root.position.y, bones, time: actor.mixer.time, clip: actor.current?.label };
  });
  const before = await pose();
  await page.keyboard.down('a');
  await page.waitForFunction(() => window.__AETHERBOUND__.world.player.current?.label === 'walk');
  await page.waitForFunction(t => window.__AETHERBOUND__.world.player.mixer.time > t + .4, before.time);
  const moving = await pose();
  await page.keyboard.down('Shift');
  await page.waitForFunction(() => window.__AETHERBOUND__.world.player.current.label === 'run');
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.world.player.current.action.getEffectiveTimeScale()), 1.75);
  await page.keyboard.up('Shift');
  await page.waitForFunction(() => window.__AETHERBOUND__.world.player.current.label === 'walk');
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.world.player.current.action.getEffectiveTimeScale()), 1);
  await page.keyboard.up('a');
  assert.ok(moving.x < before.x, 'movement input moves the leader');
  assert.equal(moving.y, 0, 'actor root stays grounded');
  assert.ok(moving.bones.some((value, index) => Math.abs(value - before.bones[index]) > .001), 'walking changes the skeleton pose, not just an animation label');
  await page.screenshot({ path: '.renders/rewrite-field.png' });
  console.log('Interaction and skeletal movement verified');

  await page.keyboard.press('b');
  await page.waitForSelector('#command-panel:not(.hidden)');
  await page.getByRole('button', { name: /^Attack / }).click();
  await page.getByText('Attack · Choose a target', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.battle.model.busy), false, 'target selection does not spend a turn');
  await page.screenshot({ path: '.renders/rewrite-targeting.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Attack / }).waitFor();
  await page.getByRole('button', { name: /^Attack / }).click();
  const hpBefore = await page.evaluate(() => window.__AETHERBOUND__.battle.model.enemies.map(enemy => enemy.hp));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!window.__AETHERBOUND__.battle.timeline);
  const leadIn = await page.evaluate(() => ({ elapsed: window.__AETHERBOUND__.battle.timeline.elapsed,
    hp: window.__AETHERBOUND__.battle.model.enemies.map(enemy => enemy.hp) }));
  assert.ok(leadIn.elapsed < .65); assert.deepEqual(leadIn.hp, hpBefore, 'HP preserved before visible impact');
  await page.waitForFunction(() => window.__AETHERBOUND__.battle.timeline?.impacted);
  const after = await page.evaluate(() => window.__AETHERBOUND__.battle.model.enemies.map(enemy => enemy.hp));
  assert.equal(after[0], hpBefore[0], 'unselected enemy is unharmed'); assert.ok(after[1] < hpBefore[1]);
  await page.screenshot({ path: '.renders/rewrite-impact.png' });
  console.log('Explicit target and animated impact verified');

  // Complete a battle through ordinary command and target buttons, including the result hold.
  for (let turn = 0; turn < 25; turn++) {
    await page.waitForFunction(() => window.__AETHERBOUND__.battle.result || (window.__AETHERBOUND__.battle.model.awaiting && !window.__AETHERBOUND__.battle.pending));
    if (await page.evaluate(() => !!window.__AETHERBOUND__.battle.result)) break;
    await page.getByRole('button', { name: /^Attack / }).click();
    await page.locator('#battle-commands button').first().click();
  }
  await page.getByRole('dialog', { name: 'Battle result' }).waitFor();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.battle.result), 'victory');
  await page.waitForFunction(() => window.__AETHERBOUND__.battle.resultTime > 1);
  await page.screenshot({ path: '.renders/rewrite-victory.png' });
  const gold = await page.evaluate(() => window.__AETHERBOUND__.state.gold);
  await page.getByRole('button', { name: 'Continue journey' }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__.mode === 'field');
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.gold), gold);
  console.log('Victory hold, rewards and field return verified');

  await page.evaluate(() => { window.__AETHERBOUND__.state.roster[0].hp = 1; });
  const fieldPotionCount = await page.evaluate(() => window.__AETHERBOUND__.state.inventory.potion);
  await page.keyboard.press('c');
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await page.locator('[data-item="potion"]').click();
  await page.locator('#field-choice').getByRole('button', { name: /^Vesna/ }).click();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.roster[0].hp), 121);
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.inventory.potion), fieldPotionCount - 1);
  await page.keyboard.press('Escape');
  console.log('Field inventory target selection and consumption verified');

  // Seed a wounded party before entering the next encounter, then exercise revival using the real UI.
  await page.evaluate(() => { window.__AETHERBOUND__.state.roster[1].hp = 0; });
  await page.keyboard.press('b');
  await page.waitForSelector('#command-panel:not(.hidden)');
  await page.locator('#battle-party [data-hero="corvin"]').getByText(/Fallen/).waitFor();
  await page.getByRole('button', { name: /^Items / }).click();
  await page.getByRole('button', { name: /^Phoenix Tear / }).click();
  await page.getByRole('button', { name: /^Corvin Fallen/ }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__.battle.model.party.find(hero => hero.id === 'corvin').hp > 0);
  const revived = await page.evaluate(() => ({ hp: window.__AETHERBOUND__.state.roster[1].hp, count: window.__AETHERBOUND__.state.inventory.phoenixtear }));
  assert.ok(revived.hp > 0); assert.equal(revived.count, 1);
  console.log('Revival through the item and target menus verified');
  await page.close();
  const recovery = await browserPage(browser, { viewport: { width: 1440, height: 900 } });
  recovery.on('pageerror', error => errors.push(error.message));
  await recovery.goto(`http://127.0.0.1:${port}/?test`, { waitUntil: 'domcontentloaded' });
  await recovery.getByRole('button', { name: /New Journey/ }).click();
  await recovery.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field');
  await opening(recovery);
  await recovery.keyboard.press('Enter');
  await recovery.getByText('Party restored. Journey saved at the aether mark.').waitFor();
  await recovery.evaluate(() => {
    const app = window.__AETHERBOUND__;
    app.state.roster.forEach(hero => { hero.hp = 1; });
    void app.startBattle(['bogfather']);
  });
  await recovery.waitForFunction(() => window.__AETHERBOUND__.battle.actors.size === 4 && window.__AETHERBOUND__.battle.introTime != null);
  await recovery.evaluate(() => {
    const app = window.__AETHERBOUND__;
    app.battle.model.enemies[0].atb = 100;
    app.battle.model.enemies[0].turns = 2;
  });
  await recovery.waitForFunction(() => window.__AETHERBOUND__.battle.timeline?.impacted);
  const fall = await recovery.evaluate(() => ({
    hp: window.__AETHERBOUND__.state.roster.map(hero => hero.hp),
    poses: window.__AETHERBOUND__.battle.model.party.map(hero => window.__AETHERBOUND__.battle.actors.get(hero.uid).current.label),
  }));
  assert.deepEqual(fall.hp, [0, 0, 0]); assert.deepEqual(fall.poses, ['dead','dead','dead']);
  await recovery.getByRole('button', { name: 'Return to checkpoint' }).waitFor();
  await recovery.waitForFunction(() => window.__AETHERBOUND__.battle.resultTime > 1);
  await recovery.screenshot({ path: '.renders/rewrite-defeat.png' });
  await recovery.keyboard.press('Enter');
  await recovery.waitForFunction(() => window.__AETHERBOUND__.mode === 'field');
  const restored = await recovery.evaluate(() => ({ hp: window.__AETHERBOUND__.state.roster.map(hero => [hero.hp, hero.maxHp]),
    map: window.__AETHERBOUND__.state.mapId, position: window.__AETHERBOUND__.state.position, checkpoint: window.__AETHERBOUND__.state.checkpoint.position }));
  assert.equal(restored.map, 'harrowmere'); assert.deepEqual(restored.position, restored.checkpoint);
  assert.ok(restored.hp.every(([hp, max]) => hp === max));
  console.log('Lethal boss impact, held death poses and checkpoint recovery verified');
  await recovery.close();
  const touch = await browserPage(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  touch.on('pageerror', error => errors.push(error.message));
  await touch.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await touch.getByRole('button', { name: /New Journey/ }).tap();
  await touch.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field');
  for (let i = 0; i < 20; i++) {
    if (await touch.evaluate(() => window.__AETHERBOUND__.state.flags.includes('opening'))) break;
    await touch.locator('.dialogue-box').tap(); await touch.waitForTimeout(90);
  }
  await touch.getByRole('button', { name: 'Interact', exact: true }).tap();
  await touch.getByText('Party restored. Journey saved at the aether mark.').waitFor();
  const initialX = await touch.evaluate(() => window.__AETHERBOUND__.world.player.root.position.x);
  const pad = await touch.getByRole('button', { name: 'Move west' }).boundingBox();
  await touch.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2); await touch.mouse.down();
  await touch.waitForFunction(x => window.__AETHERBOUND__.world.player.root.position.x < x - .6, initialX);
  await touch.mouse.up();
  await touch.screenshot({ path: '.renders/rewrite-mobile-field.png' });
  await touch.getByRole('button', { name: 'Open the ledger' }).tap();
  await touch.getByRole('button', { name: /^Journal/ }).tap();
  await touch.screenshot({ path: '.renders/rewrite-mobile-journal.png' });
  const menuBox = await touch.locator('.menu-panel').boundingBox();
  assert.ok(menuBox.x >= 0 && menuBox.y >= 0 && menuBox.x + menuBox.width <= 391 && menuBox.y + menuBox.height <= 845, 'Mobile ledger stays in the viewport');
  await touch.getByRole('button', { name: 'Return to the road · Esc' }).tap();
  await touch.waitForFunction(() => !window.__AETHERBOUND__.world.locked);
  await touch.getByRole('button', { name: 'Open the area map' }).tap();
  await touch.getByRole('img', { name: /Area map of Harrowmere/ }).waitFor();
  await touch.screenshot({ path: '.renders/rewrite-mobile-atlas.png' });
  await touch.locator('#field-choice').getByRole('button', { name: 'Return to the road', exact: true }).tap();
  await touch.waitForFunction(() => !window.__AETHERBOUND__.world.locked);
  console.log('Touch dialogue, save, direction pad and responsive ledger verified');
  await touch.close();

  const failedLoad = await browserPage(browser, { viewport: { width: 1100, height: 750 } });
  await failedLoad.route('**/cast/vesna.glb', route => route.abort());
  await failedLoad.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await failedLoad.getByRole('button', { name: /New Journey/ }).click();
  await failedLoad.getByRole('heading', { name: 'The road could not load' }).waitFor();
  await failedLoad.unroute('**/cast/vesna.glb');
  await failedLoad.getByRole('button', { name: 'Return to title', exact: true }).click();
  await failedLoad.getByRole('button', { name: /New Journey/ }).click();
  await failedLoad.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field');
  await opening(failedLoad);
  console.log('Failed model load returns to title and retries without a poisoned asset cache');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  passed = true;
  console.log('Smoke passed: field interaction, skeletal walk, explicit target, delayed impact, victory, revival, defeat and checkpoint recovery');
} finally {
  if (!passed && browser) for (const [index, page] of browser.contexts().flatMap(context => context.pages()).entries()) {
    try {
      console.error('Smoke failure state:', await page.evaluate(() => {
        const app = window.__AETHERBOUND__, battle = app?.battle;
        return { mode: app?.mode, map: app?.state?.mapId, locked: app?.world?.locked,
          awaiting: battle?.model?.awaiting?.id, pending: !!battle?.pending, result: battle?.result,
          timeline: battle?.timeline && { elapsed: battle.timeline.elapsed, impacted: battle.timeline.impacted },
          party: battle?.model?.party.map(hero => ({ id: hero.id, hp: hero.hp, atb: hero.atb })),
          enemies: battle?.model?.enemies.map(enemy => ({ id: enemy.id, hp: enemy.hp, atb: enemy.atb })) };
      }));
      await page.screenshot({ path: `.renders/smoke-failure-${index}.png`, timeout: 10000 });
    } catch (error) { console.error('Failure capture:', error.message); }
  }
  await browser?.close(); server.kill('SIGTERM');
}
