/**
 * Character turntable.
 *
 *   node tools/shotchar.mjs [out.png] [--clip walk] [--zoom 2.4] [--t 0.5]
 *
 * Puts the party in front of the camera at a readable size and photographs
 * them. Existing tooling proves the game *runs*; nothing proves it looks like
 * anything, and character work cannot be done blind — every judgement about a
 * silhouette needs the silhouette in front of you.
 *
 * The field scene rewrites each actor's clip every frame from its movement
 * speed, so asking for `--clip walk` and letting the scene keep running gets
 * you an idle pose and a confusing afternoon. The scene is therefore suspended
 * and the animators are ticked by hand. `--t` is the 0..1 progress fed to the
 * one-shot clips (attack, cast, hurt, victory), which are otherwise frozen at
 * their first frame.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const out = args.find((a) => a.endsWith('.png')) ?? path.join(root, 'assets/characters.png');
const clip = flag('clip', 'idle');
const zoom = Number(flag('zoom', 2.6));
const actionT = Number(flag('t', 0.5));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });

await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.state?.player, null, { timeout: 60000 });
await page.waitForTimeout(2500);

await page.evaluate(async ({ clip, zoom, actionT }) => {
  const g = window.__game;
  const st = g.state;
  g.menu?.hide?.();

  // Line the party up facing the camera, evenly spaced *across the frame*.
  // Spreading along world X only works when the camera happens to be looking
  // down Z; on any other map the party ends up in a queue pointing at the lens.
  const cast = [st.player, ...st.followers];
  const cam = st.camera;
  const yaw = cam.yaw;
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  const spread = 1.55;
  const cx = st.player.x, cz = st.player.z;
  cast.forEach((a, i) => {
    const o = (i - (cast.length - 1) / 2) * spread;
    a.place(cx + rightX * o, cz + rightZ * o, yaw);
    a.speed = 0;
    a.anim.play(clip, { blend: 0 });
    a.anim.actionT = actionT;
  });
  for (const n of st.npcs || []) n.root.visible = false;

  // Frame them: drop the camera to eye level and come in close, so the shot
  // reads as a character sheet rather than a map.
  cam.freeLook = false;
  cam.pitch = 0.12;
  cam.height = 1.0;
  cam.distance = cam.targetDistance = zoom * 2.6;
  cam.snapTo(cx, cz);

  // Suspend the scene and drive the animators directly, so the requested clip
  // survives longer than one frame.
  st.paused = true;
  let t = 0;
  const tick = () => {
    t += 1 / 60;
    for (const a of cast) {
      a.anim.actionT = actionT;
      a.anim.update(1 / 60);
    }
    if (t < 30) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Let the pose settle (walk and run need a moment to reach a readable phase).
  await new Promise((r) => setTimeout(r, 900));
}, { clip, zoom, actionT });

await page.waitForTimeout(1200);
await page.screenshot({ path: out });
console.log(`[shot] ${clip} → ${path.relative(root, out)}`);
await browser.close();
