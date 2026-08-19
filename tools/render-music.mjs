/**
 * Render the score to audio files for the Godot port.
 *
 *   npm run build && node tools/render-music.mjs [--only battle] [--force]
 *
 * The reference performs its music: thirty-six tracks of note data played at runtime by
 * modelled instruments over a Web Audio graph. That graph cannot cross to Godot, and
 * reimplementing the synthesiser in GDScript would be a second instrument set pretending
 * to be the first. So the score is rendered here, once, by the engine that wrote it —
 * `AudioEngine.renderOffline` in `src/audio/audio.js`, beside its own instruments, with
 * the shared plumbing in `tools/lib/audio-render.mjs`.
 *
 * What is lost is what the reference's own comment claims for performance: layers cannot
 * be muted independently at runtime, so a track cannot gain a counter-melody when
 * somebody is dying and a town cannot drop to solo harp indoors. Those are real losses
 * and they are written down rather than glossed. What is kept is the seam: each track is
 * rendered twice through and only the second pass is kept, so the audio already carries
 * the reverb tail a live loop still has ringing when it wraps, and joins to itself.
 *
 * A track whose notes have not moved is not re-rendered, so running this does not rewrite
 * thirty-six binary files for nothing.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  QUALITY, SAMPLE_RATE, SEED, SFX,
  encode, ffmpeg, fingerprint, renderSfx, renderTrack, scoreDigest, wav,
} from './lib/audio-render.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);
const port = Number(flag('port', 5182));
const only = flag('only', null);
const quality = Number(flag('quality', QUALITY));
const say = (s = '') => console.log(s);

if (!fs.existsSync(path.join(root, 'public', 'game.js'))) {
  say('\x1b[31mFAIL\x1b[0m — public/game.js is missing. Run `npm run build` first.');
  process.exit(1);
}
// The one thing in this project that needs ffmpeg, and it needs an ffmpeg that can encode
// Vorbis — which the one Playwright ships cannot. Said here rather than in the middle of the
// thirtieth track.
if (!ffmpeg()) {
  say('\x1b[31mFAIL\x1b[0m — no ffmpeg that can encode Ogg Vorbis.');
  say('  Install one, or point $FFMPEG at it. Only this tool needs it: the checks decode');
  say('  through a browser.');
  process.exit(1);
}

const outDir = path.join(root, 'godot', 'audio');
const musicDir = path.join(outDir, 'music');
const sfxDir = path.join(outDir, 'sfx');
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(sfxDir, { recursive: true });

const manifestPath = path.join(outDir, 'manifest.json');
const previous = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { music: {}, sfx: {} };

const server = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});
process.on('exit', () => { try { server.kill(); } catch { /* gone */ } });

const browser = await chromium.launch({
  headless: true,
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('console', (m) => {
  if (process.env.RENDER_VERBOSE) say(`    [page] ${m.text().slice(0, 140)}`);
});

await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__tracks && window.__audio), null,
  { timeout: 60_000 });

const tracks = await page.evaluate(() => Object.keys(window.__tracks));
const targets = only ? [only] : tracks;
say('\x1b[1mRendering the score\x1b[0m');
say(`  ${targets.length} track(s), ${SFX.length} effect(s), Ogg Vorbis q${quality}`);
say();

// Seeded from what is already there, so `--only battle` re-renders one track without
// dropping the other thirty-five out of the manifest — which would leave the port with a
// directory full of audio it no longer believes in.
const manifest = {
  music: { ...(previous.music ?? {}) },
  sfx: { ...(previous.sfx ?? {}) },
  quality, sampleRate: SAMPLE_RATE, seed: SEED,
};
let rendered = 0;
let reused = 0;
let bytes = 0;

for (const id of targets) {
  const spec = await page.evaluate((trackId) => {
    const track = window.__tracks[trackId];
    return { json: JSON.stringify(track), loop: track.loop !== false };
  }, id);
  const score = scoreDigest(spec.json, { quality });
  const file = path.join(musicDir, `${id}.ogg`);
  const was = previous.music?.[id];
  if (!has('force') && was && was.score === score && fs.existsSync(file)) {
    manifest.music[id] = was;
    bytes += fs.statSync(file).size;
    reused++;
    process.stdout.write(`\r  ${id.padEnd(18)} unchanged            `);
    continue;
  }

  // A one-shot cue — a fanfare, the loss theme — has no seam to hide, so it is rendered
  // once and keeps its tail.
  const got = await renderTrack(page, { id, loops: spec.loop ? 2 : 1 });
  const channels = got.channels.map((c) => Float32Array.from(c));
  const buffer = wav(channels, SAMPLE_RATE);
  encode(buffer, file, quality);
  const size = fs.statSync(file).size;
  bytes += size;
  rendered++;
  manifest.music[id] = {
    file: `music/${id}.ogg`,
    score,
    // Two different lengths, because they are two different facts. `seconds` is the loop
    // — what wraps — and `duration` is how much audio is in the file. They are equal for a
    // loop and not for a one-shot cue, which keeps its reverb tail past the last note.
    seconds: Number(got.loopLength.toFixed(4)),
    duration: Number((got.frames / SAMPLE_RATE).toFixed(4)),
    loop: spec.loop,
    peak: Number(got.peak.toFixed(5)),
    rms: Number(got.rms.toFixed(5)),
    // The signal's shape rather than a checksum of it, and of the samples rather than of
    // the file — the encoder is lossy and its output is not the claim. What is claimed is
    // that this score renders to this signal. See `fingerprint` for why not a hash.
    signal: fingerprint(channels),
    bytes: size,
  };
  process.stdout.write(`\r  ${id.padEnd(18)} ${got.loopLength.toFixed(1)}s  `
    + `${(size / 1024).toFixed(0)} KB  peak ${got.peak.toFixed(2)}   `);
}
say();

for (const [name, seconds] of SFX) {
  const score = scoreDigest(`${name}|${seconds}`, { quality });
  const file = path.join(sfxDir, `${name}.ogg`);
  const was = previous.sfx?.[name];
  if (!has('force') && was && was.score === score && fs.existsSync(file)) {
    manifest.sfx[name] = was;
    bytes += fs.statSync(file).size;
    reused++;
    continue;
  }
  const got = await renderSfx(page, { name, seconds });
  const channels = got.channels.map((c) => Float32Array.from(c));
  const buffer = wav(channels, SAMPLE_RATE);
  encode(buffer, file, quality);
  const size = fs.statSync(file).size;
  bytes += size;
  rendered++;
  manifest.sfx[name] = {
    file: `sfx/${name}.ogg`,
    score,
    seconds,
    peak: Number(got.peak.toFixed(5)),
    signal: fingerprint(channels),
    bytes: size,
  };
}

await browser.close();
server.kill();

if (pageErrors.length) {
  say();
  say(`\x1b[31mFAIL\x1b[0m — the page threw: ${pageErrors[0]}`);
  process.exit(1);
}

// Silence is the failure this tool would otherwise ship quietly: a track that rendered to
// nothing looks exactly like a track that rendered, right down to the file on disk.
const silent = Object.entries(manifest.music)
  .filter(([, m]) => m.peak < 0.01)
  .concat(Object.entries(manifest.sfx).filter(([, m]) => m.peak < 0.01));
if (silent.length) {
  say();
  say(`\x1b[31mFAIL\x1b[0m — ${silent.length} rendered to silence: `
    + silent.map(([id]) => id).join(', '));
  process.exit(1);
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);

say();
say(`  ${rendered} rendered, ${reused} unchanged, ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
say('\x1b[32mOK\x1b[0m — the score is audio in godot/audio, and the manifest says which is which.');
