/**
 * Contact sheet of candidate character models.
 *
 *   POLY_PIZZA_API_KEY=... node tools/model-sheet.mjs
 *
 * Picking characters from titles is guessing. This lays every rigged
 * candidate's thumbnail out in a labelled grid so the choice is made by
 * looking, which is the only way to judge whether something reads as cute.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const KEY = process.env.POLY_PIZZA_API_KEY;
const survey = JSON.parse(fs.readFileSync(path.join(root, 'assets/models/survey.json'), 'utf8'));

// Re-query so we have thumbnails, which the survey did not keep.
const thumbs = new Map();
const terms = ['character', 'chibi', 'rigged character', 'animated character', 'hero',
  'knight', 'villager', 'adventurer', 'rpg character', 'low poly character',
  'cute character', 'person', 'human'];
for (const t of terms) {
  const res = await fetch(`https://api.poly.pizza/v1.1/search/${encodeURIComponent(t)}`,
    { headers: { 'x-auth-token': KEY } });
  if (!res.ok) continue;
  for (const m of (await res.json()).results ?? []) thumbs.set(m.ID, m.Thumbnail);
}

const rigged = survey.filter((r) => r.rigged && thumbs.get(r.id));
// Group by rig family so the sheet shows which models can share animations.
const fam = new Map();
for (const r of rigged) {
  const k = (r.jointNames ?? []).slice(0, 10).join('|');
  if (!fam.has(k)) fam.set(k, []);
  fam.get(k).push(r);
}
const families = [...fam.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6);

const html = `<body style="margin:0;background:#14161c;font:13px system-ui;color:#dfe3ea">
${families.map(([, v], i) => `
  <div style="padding:10px 14px 4px;font-weight:600;color:#9fd">
    Family ${i + 1} — ${v.length} models, ${v[0].joints} joints, ${v[0].animations} animations
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 14px 12px">
    ${v.map((m) => `<div style="width:150px;text-align:center">
      <img src="${thumbs.get(m.id)}" style="width:150px;height:150px;object-fit:contain;background:#20242e;border-radius:6px">
      <div style="padding-top:3px;font-size:11px;line-height:1.25">${m.title}</div>
      <div style="font-size:10px;color:#7b8494">${m.id}</div>
    </div>`).join('')}
  </div>`).join('')}
</body>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.waitForLoadState('networkidle');
const out = path.join(root, 'assets/model-candidates.png');
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`[sheet] ${rigged.length} rigged candidates → ${path.relative(root, out)}`);
