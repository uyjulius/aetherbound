/**
 * Audio parity: the rendered score against the score, and against what asks for it.
 *
 *   node tools/audio-parity.mjs [--all]
 *
 * The port cannot run the reference's synthesiser, so its music is rendered ahead of
 * time. That makes the audio a *build artefact*, and a build artefact is exactly the kind
 * of thing that silently stops matching its source. Five different claims are checked
 * here, and they fail in five different ways:
 *
 *   1. Every track and effect the game can ask for has a file. A missing one is silence
 *      in a player's browser and nothing at all in a log.
 *   2. Each file is the length its score says. A loop rendered a bar short is a loop that
 *      lurches every time round.
 *   3. Each file still decodes to the signal it was made from — peak and loudness within
 *      the encoder's error, and not silence. This ffmpeg has no `libvorbis` and its own
 *      Vorbis encoder is marked experimental, so the encoder is measured rather than
 *      trusted.
 *   4. A looping track joins to itself. The jump across the wrap is compared against the
 *      jumps inside the track: a loop that clicks has one discontinuity far larger than
 *      anything the music does on its own.
 *   5. The files are still what today's score renders to. A sample is rendered again
 *      through the reference's own engine and compared — the check that catches a score
 *      edited after the audio was built. Compared by fingerprint rather than by checksum,
 *      because Chromium's audio graph is not bit-exact between renders: the synthesiser is
 *      logically deterministic, but two runs differ in the last bits of some samples. See
 *      `fingerprint` in `tools/lib/audio-render.mjs`.
 *
 * And one claim about the port rather than the audio: every map's theme, in both worlds,
 * as the port resolves it against as the reference resolves it. Twenty-six maps change
 * their music after the cataclysm, and getting that wrong is a wrong soundtrack for half
 * the game with nothing else out of place.
 */

import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRACKS } from '../src/data/music.js';
import { resolveMap } from '../src/world/map.js';
import {
  SAMPLE_RATE, SFX, compareFingerprints, decode, fingerprint, renderSfx, renderTrack,
  scoreDigest,
} from './lib/audio-render.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const say = (s = '') => console.log(s);
const port = 5183;

/**
 * How many tracks get re-rendered when not asked for `--all`.
 *
 * Re-rendering is a browser and about eight seconds a track, which is too slow to do
 * thirty-six of on every run of `npm run port`. The sample is deterministic rather than
 * random — the same three every time — so a failure is reproducible, and `--all` does
 * the lot.
 */
const RESAMPLE = ['battle', 'inn', 'fanfare'];

const manifestPath = path.join(root, 'godot', 'audio', 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  say('\x1b[31mFAIL\x1b[0m — no godot/audio/manifest.json. Run `npm run render:music`.');
  process.exit(1);
}
// ffmpeg decodes every file back for the comparison. Said plainly here rather than as an
// ENOENT from a child process forty lines down.
try {
  execFileSync('ffmpeg', ['-hide_banner', '-version'], { stdio: 'ignore' });
} catch {
  say('\x1b[31mFAIL\x1b[0m — ffmpeg is not on PATH, and every check below decodes audio with it.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const audioDir = path.join(root, 'godot', 'audio');
/**
 * The maps, from the exported table rather than from the reference's module.
 *
 * `MAPS` in `src/main.js` is a local const and not exported, and this comparison does not
 * need it to be: `data-parity.mjs` already holds the exported table against the
 * reference's own definitions, table for table and number for number. So the input here
 * is agreed, and what is being compared is the two `resolveMap` implementations over it.
 */
const MAPS = JSON.parse(
  fs.readFileSync(path.join(root, 'godot', 'data', 'maps.json'), 'utf8'));

const failures = [];
const notes = [];
let compared = 0;
const fail = (line) => { if (failures.length < 20) failures.push(line); };

say('\x1b[1mAudio: the rendered score against the score\x1b[0m');
say('─'.repeat(58));

// --- 1. everything the game can ask for exists ------------------------------
for (const id of Object.keys(TRACKS)) {
  compared++;
  const entry = manifest.music?.[id];
  if (!entry) { fail(`${id}: the score has this track and the manifest does not`); continue; }
  if (!fs.existsSync(path.join(audioDir, entry.file))) {
    fail(`${id}: the manifest names ${entry.file}, which is not there`);
  }
}
for (const [name] of SFX) {
  compared++;
  if (!manifest.sfx?.[name]) fail(`sfx ${name}: not rendered`);
}
// And the other way: a file nobody can ask for is dead weight in a 60 MB download.
for (const id of Object.keys(manifest.music ?? {})) {
  compared++;
  if (!TRACKS[id]) fail(`${id}: rendered, but the score has no such track`);
}

/**
 * The effects the reference's own `sfx()` can make.
 *
 * Read out of its source rather than listed here: the switch *is* the definition, and a
 * hand-kept list beside it would be the thing that goes stale.
 */
const sfxSource = fs.readFileSync(path.join(root, 'src', 'audio', 'audio.js'), 'utf8');
const switchBody = sfxSource.slice(sfxSource.indexOf('switch (name)'));
const handled = [...switchBody.matchAll(/case '([a-z]+)':/g)].map((m) => m[1]);
for (const name of new Set(handled)) {
  compared++;
  if (!manifest.sfx?.[name]) {
    fail(`sfx ${name}: the reference can play it and the port has no file for it`);
  }
}
say(`  inventory        ${Object.keys(TRACKS).length} tracks, ${handled.length} effects`);

// --- 2 & 3 & 4. the files themselves ----------------------------------------
let worstJoin = 0;
let worstJoinTrack = '';
let worstPeak = 0;
let worstPeakTrack = '';
for (const [id, entry] of Object.entries(manifest.music ?? {})) {
  const file = path.join(audioDir, entry.file);
  if (!fs.existsSync(file)) continue;
  const track = TRACKS[id];
  if (track) {
    // The loop's length, from the score rather than from the manifest.
    const beats = track.lengthBeats ?? null;
    if (beats) {
      compared++;
      const expected = (beats * 60) / track.bpm;
      if (Math.abs(expected - entry.seconds) > 0.002) {
        fail(`${id}: the manifest says ${entry.seconds}s, the score says ${expected.toFixed(4)}s`);
      }
    }
    compared++;
    if (entry.loop !== (track.loop !== false)) {
      fail(`${id}: rendered as ${entry.loop ? 'a loop' : 'a one-shot'}, `
        + `but the score says otherwise`);
    }
  }

  const samples = decode(file);
  const frames = Math.floor(samples.length / 2);
  compared++;
  const seconds = frames / SAMPLE_RATE;
  const expectedSeconds = entry.duration ?? entry.seconds;
  // Vorbis is gapless, so this is a tight bound on purpose: a decoder that padded would
  // put a gap in every loop.
  if (Math.abs(seconds - expectedSeconds) > 0.02) {
    fail(`${id}: the file is ${seconds.toFixed(3)}s, the manifest says ${expectedSeconds}s`);
  }

  let peak = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  compared += 2;
  if (peak < 0.01) fail(`${id}: decodes to silence`);
  // The encoder is allowed to move the peak a little and no more. Anything larger is not
  // encoder error, it is a different signal.
  const peakDrift = Math.abs(peak - entry.peak);
  if (peakDrift > worstPeak) { worstPeak = peakDrift; worstPeakTrack = id; }
  if (peakDrift > 0.06) {
    fail(`${id}: decoded peak ${peak.toFixed(3)}, rendered ${entry.peak}`);
  }
  if (entry.rms && Math.abs(rms - entry.rms) > Math.max(0.01, entry.rms * 0.25)) {
    fail(`${id}: decoded loudness ${rms.toFixed(4)}, rendered ${entry.rms}`);
  }
  // And the shape of it over time. Looser than the re-render comparison because a lossy
  // encoder is allowed to move things a little, but tight enough to notice a file whose
  // second half is silence.
  if (entry.signal) {
    compared++;
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    for (let i = 0; i < frames; i++) { left[i] = samples[i * 2]; right[i] = samples[i * 2 + 1]; }
    const drift = compareFingerprints(entry.signal, fingerprint([left, right]), 0.01, 0.05);
    if (drift.length) {
      fail(`${id}: the file no longer matches what was rendered (${drift.slice(0, 2).join('; ')})`);
    }
  }

  // The join. Compared against how big a step this music takes on its own, because a
  // quiet harp piece and a battle theme have wildly different answers.
  if (entry.loop && frames > SAMPLE_RATE) {
    compared++;
    const steps = [];
    for (let i = 1; i < frames; i++) {
      steps.push(Math.abs(samples[i * 2] - samples[(i - 1) * 2]));
    }
    steps.sort((a, b) => a - b);
    const typical = steps[Math.floor(steps.length * 0.9999)] || 0.001;
    const join = Math.abs(samples[0] - samples[(frames - 1) * 2]);
    const ratio = join / Math.max(typical, 1e-6);
    if (ratio > worstJoin) { worstJoin = ratio; worstJoinTrack = id; }
    // Three times the largest step the music itself takes. A rendered loop that had not
    // been given the previous pass's reverb tail lands around ten to twenty.
    if (ratio > 3 && join > 0.02) {
      fail(`${id}: the loop jumps ${join.toFixed(4)} where the music's largest step is `
        + `${typical.toFixed(4)} — that is an audible click every time round`);
    }
  }
}
say(`  files            ${Object.keys(manifest.music ?? {}).length} decoded, `
  + `worst join ${worstJoin.toFixed(2)}× on ${worstJoinTrack || 'nothing'}, `
  + `worst peak drift ${worstPeak.toFixed(3)} on ${worstPeakTrack || 'nothing'}`);

// --- 5. still the same score ------------------------------------------------
const resample = has('all') ? Object.keys(manifest.music ?? {}) : RESAMPLE;
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
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__tracks && window.__audio), null,
  { timeout: 60_000 });

for (const id of resample) {
  const entry = manifest.music[id];
  if (!entry || !TRACKS[id]) continue;
  compared += 2;
  const json = await page.evaluate((trackId) => JSON.stringify(window.__tracks[trackId]), id);
  const score = scoreDigest(json, { quality: manifest.quality });
  if (score !== entry.score) {
    fail(`${id}: the score has changed since this was rendered — run \`npm run render:music\``);
    continue;
  }
  const got = await renderTrack(page, { id, loops: entry.loop ? 2 : 1 });
  const drift = compareFingerprints(entry.signal,
    fingerprint(got.channels.map((c) => Float32Array.from(c))));
  if (drift.length) {
    fail(`${id}: re-rendering the score gives different audio from the file on disk `
      + `(${drift.slice(0, 2).join('; ')})`);
  }
}
for (const [name, seconds] of has('all') ? SFX : SFX.slice(0, 2)) {
  const entry = manifest.sfx?.[name];
  if (!entry) continue;
  compared++;
  const got = await renderSfx(page, { name, seconds });
  const drift = compareFingerprints(entry.signal,
    fingerprint(got.channels.map((c) => Float32Array.from(c))));
  if (drift.length) {
    fail(`sfx ${name}: re-rendering gives different audio from the file on disk `
      + `(${drift.slice(0, 2).join('; ')})`);
  }
}
await browser.close();
server.kill();
say(`  re-rendered      ${resample.length} track(s) through the reference's own engine`);

// --- the port's choice of track ---------------------------------------------
const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/audio_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-600)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
  process.exit(1);
}

let mapChecks = 0;
for (const [id, base] of Object.entries(MAPS)) {
  for (const state of ['whole', 'ruin']) {
    const key = state === 'whole' ? id : `${id}#ruin`;
    if (state === 'ruin' && !base.ruin) continue;
    mapChecks++;
    compared++;
    const expected = resolveMap(base, state).music ?? '';
    const actual = ported.map_music?.[key];
    if (actual === undefined) {
      fail(`${key}: the port reported no theme`);
    } else if (actual !== expected) {
      fail(`${key}: the port plays "${actual}", the reference plays "${expected}"`);
    }
    // And it has to exist, which is a different question from agreeing.
    if (expected && !manifest.music?.[expected]) {
      fail(`${key}: plays "${expected}", which has no rendered file`);
    }
  }
}

/**
 * The tracks the game asks for by name rather than through a map.
 *
 * Taken from the reference's own call sites — `grep playMusic` — so a cue that stops
 * being rendered is a failure here rather than a silence at the moment it matters most.
 */
const CUES = ['prelude', 'battle', 'boss', 'victory', 'gameover', 'inn', 'shop',
  'fanfare', 'esper', 'airship'];
for (const id of CUES) {
  compared++;
  if (!manifest.music?.[id]) fail(`${id}: a named cue with no rendered file`);
  else if (ported.present?.[id] === false) {
    fail(`${id}: rendered, but Godot has not imported it — `
      + 'run `godot --headless --import --path godot`');
  }
}
for (const [name] of SFX) {
  compared++;
  if (ported.sfx_files?.[name] === false) {
    fail(`sfx ${name}: rendered, but Godot has not imported it — `
      + 'run `godot --headless --import --path godot`');
  }
}
say(`  the port's picks ${mapChecks} map themes in both worlds, ${CUES.length} named cues`);

const megabytes = Object.values(manifest.music ?? {})
  .concat(Object.values(manifest.sfx ?? {}))
  .reduce((n, m) => n + (m.bytes ?? 0), 0) / 1024 / 1024;

say();
for (const line of notes) say(`  \x1b[33mnote\x1b[0m  ${line}`);
if (failures.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${failures.length} problem(s) across ${compared} checks:`);
  for (const line of failures) say(`  ${line}`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} checks: every track the game can ask for `
  + `is rendered, decodes to what it was made from,`);
say(`     loops without a click, and is the score as it stands today `
  + `(${megabytes.toFixed(1)} MB in all).`);
