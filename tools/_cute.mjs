import fs from 'node:fs';
const KEY = process.env.POLY_PIZZA_API_KEY;
const cands = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-juliusuy-Documents-ff/4a13036e-ad5a-46aa-b1cd-559add5a650e/scratchpad/cute-candidates.json','utf8'));
// The signature of the cute pack's rig.
const SIG = 'Root|Foot.L|Foot.L_end|Body|Hips|Abdomen|Torso|Neck|Head|Head_end';
const inspect = (buf) => {
  if (buf.readUInt32LE(0) !== 0x46546c67) return null;
  const len = buf.readUInt32LE(12);
  const j = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  if (!j.skins?.length) return null;
  const names = j.skins[0].joints.map(i => j.nodes[i]?.name);
  return { sig: names.slice(0,10).join('|'), joints: names.length,
           anims: (j.animations||[]).length, tris: null };
};
const hits = [];
let n = 0;
for (const m of cands) {
  if (!m.Download) continue;
  n++;
  try {
    const r = await fetch(m.Download);
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    const info = inspect(buf);
    if (info && info.sig === SIG) {
      fs.mkdirSync('assets/models', { recursive: true });
      fs.writeFileSync(`assets/models/${m.ID}.glb`, buf);
      hits.push({ id: m.ID, title: m.Title, attribution: m.Attribution, ...info });
      console.log(`CUTE  ${m.ID}  ${m.Title}  anims=${info.anims}`);
    }
  } catch {}
}
fs.writeFileSync('assets/models/cute-pack.json', JSON.stringify(hits, null, 2));
console.log(`\ninspected ${n}; ${hits.length} share the cute rig`);
