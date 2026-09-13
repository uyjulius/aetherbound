import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 4197;
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return; } catch {}
    await wait(100);
  }
  throw new Error('Smoke server did not start');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__AETHERBOUND__?.mode === 'title');
  await page.getByRole('button', { name: /New Journey/ }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field', null, { timeout: 20_000 });

  const field = await page.evaluate(() => ({
    actors: window.__AETHERBOUND__.world.actors.length,
    rootY: window.__AETHERBOUND__.world.player.root.position.y,
    map: window.__AETHERBOUND__.state.mapId,
  }));
  if (field.map !== 'harrowmere' || field.actors < 10 || Math.abs(field.rootY) > .001) throw new Error(`Bad field state: ${JSON.stringify(field)}`);

  const before = await page.evaluate(() => ({ ...window.__AETHERBOUND__.world.player.root.position }));
  await page.keyboard.down('w');
  await wait(380);
  const moving = await page.evaluate(() => ({
    position: { ...window.__AETHERBOUND__.world.player.root.position },
    motion: window.__AETHERBOUND__.world.player.root.userData.motion,
    animation: window.__AETHERBOUND__.world.player.root.userData.animation,
  }));
  await page.keyboard.up('w');
  if (moving.motion !== 'walk' || moving.animation !== 'walk' || moving.position.z >= before.z) throw new Error(`Walk animation did not run: ${JSON.stringify({ before, moving })}`);

  await page.keyboard.press('b');
  await page.waitForFunction(() => window.__AETHERBOUND__?.battle?.model && !window.__AETHERBOUND__.battle.pending, null, { timeout: 20_000 });
  await page.waitForSelector('#command-panel:not(.hidden)', { timeout: 12_000 });
  const hpBefore = await page.evaluate(() => window.__AETHERBOUND__.battle.model.enemies.map((enemy) => enemy.hp));
  await page.getByRole('button', { name: /Attack/ }).click();
  await wait(100);
  const hpDuring = await page.evaluate(() => window.__AETHERBOUND__.battle.model.enemies.map((enemy) => enemy.hp));
  if (JSON.stringify(hpDuring) !== JSON.stringify(hpBefore)) throw new Error('Damage landed before the attack animation');
  await wait(700);
  const hpAfter = await page.evaluate(() => window.__AETHERBOUND__.battle.model.enemies.map((enemy) => enemy.hp));
  if (!hpAfter.some((hp, index) => hp < hpBefore[index])) throw new Error('Attack impact did not damage an enemy');

  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
  console.log(`Smoke passed: ${field.actors} field actors, grounded walk animation, delayed battle impact`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
