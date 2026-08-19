/**
 * Rendering the reference's score to audio, in one place.
 *
 * Shared by `tools/render-music.mjs`, which writes the files the Godot port ships, and
 * `tools/audio-parity.mjs`, which re-renders a sample of them and checks the files on
 * disk are still what the score produces. Those two must use the same code: a harness
 * with its own copy of the render would be comparing one copy against another, and would
 * pass happily while the shipped files rotted.
 *
 * The synthesis itself is not here. It is `AudioEngine.renderOffline` in
 * `src/audio/audio.js`, beside the instruments that make the sound.
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

/**
 * Where a *usable* ffmpeg is.
 *
 * Usable means it can encode Ogg Vorbis, which is the only thing this project asks of it.
 * The distinction matters: Playwright ships its own ffmpeg and it is built
 * `--disable-everything` with mjpeg, vp8 and png — it answers `-version` perfectly and
 * cannot touch an ogg. A search that stopped at "a binary exists" would have found it and
 * failed later, somewhere less obvious.
 *
 * Only the *renderer* needs this. Nothing that merely reads the audio does: the checks
 * decode through a browser, which every one of them already has open.
 */
export function ffmpeg() {
  if (_ffmpeg !== undefined) return _ffmpeg;
  for (const candidate of [process.env.FFMPEG, 'ffmpeg'].filter(Boolean)) {
    try {
      const encoders = execFileSync(candidate, ['-hide_banner', '-encoders'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (/\bvorbis\b/.test(encoders)) {
        _ffmpeg = candidate;
        return _ffmpeg;
      }
    } catch { /* try the next one */ }
  }
  _ffmpeg = null;
  return _ffmpeg;
}
let _ffmpeg;

/** The seed every render uses, so one score gives one file. */
export const SEED = 0x5eed1e;
export const SAMPLE_RATE = 44100;
/** Ogg Vorbis quality. About 70–90 kbps stereo on this material. */
export const QUALITY = 3;
/**
 * What "render" currently means, folded into every score fingerprint.
 *
 * Bumping it re-renders everything, which is the point: when the shape of the output
 * changes — a one-shot cue keeping its reverb tail rather than being cut at the loop
 * length, say — files that were correct under the old rule are wrong under the new one
 * and must not be kept because their notes happen not to have moved.
 */
export const FORMAT = 5;

/**
 * A seeded generator over `Math.random`, installed only while rendering.
 *
 * The instruments use `Math.random` for vibrato rates and to fill the reverb impulse
 * with noise, so two renders of one track are similar but never identical — which would
 * rewrite every audio file in the repository on every run, and make "is this file still
 * this score?" an unanswerable question. xorshift32 is enough: what these numbers decide
 * is a vibrato somewhere between 4.6 and 5.2 Hz.
 */
export const SEEDED = `(seed) => {
  let s = seed >>> 0;
  Math.random = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}`;

/** 16-bit PCM WAV, which is what ffmpeg will read from a pipe without being told. */
export function wav(channels, sampleRate) {
  const frames = channels[0].length;
  const bytes = frames * channels.length * 2;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels.length, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels.length * 2, 28);
  buf.writeUInt16LE(channels.length * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (const channel of channels) {
      const clamped = Math.max(-1, Math.min(1, channel[i]));
      buf.writeInt16LE(Math.round(clamped * 32767), at);
      at += 2;
    }
  }
  return buf;
}

/**
 * Ogg Vorbis, because it is the compressed format Godot decodes natively and loops
 * sample-accurately. `-strict -2` is for ffmpeg's own Vorbis encoder, which it still
 * labels experimental; `libvorbis` is the better one and this ffmpeg lacks it, so the
 * result is measured rather than trusted — `audio-parity.mjs` decodes every file back
 * and compares it to the signal that went in.
 */
export function encode(wavBuffer, file, quality = QUALITY) {
  execFileSync(ffmpeg() ?? 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'wav', '-i', 'pipe:0',
    '-strict', '-2', '-c:a', 'vorbis', '-q:a', String(quality),
    file,
  ], { input: wavBuffer });
}

/**
 * Decode an audio file back to samples, in the browser.
 *
 * Through `decodeAudioData` rather than through ffmpeg, and that is a deliberate choice
 * rather than a convenience. Reading the shipped audio back is the whole basis of
 * `audio-parity.mjs`, and making it depend on an ffmpeg build that happens to include Vorbis
 * meant the checks stopped running the day the CI image dropped the package. Every one of
 * these tools already has a browser open, and a browser is a Vorbis decoder that is never
 * going away.
 *
 * Returns `{channels, sampleRate, frames}` with one Float32Array per channel.
 */
export async function decodeInPage(page, bytes, sampleRate = SAMPLE_RATE) {
  return page.evaluate(async ({ data, rate }) => {
    const buffer = new Uint8Array(data).buffer;
    // An offline context so the rate is ours rather than the device's.
    const ctx = new OfflineAudioContext(2, 1, rate);
    const decoded = await ctx.decodeAudioData(buffer);
    const channels = [];
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      channels.push(Array.from(decoded.getChannelData(c)));
    }
    return { channels, sampleRate: decoded.sampleRate, frames: decoded.length };
  }, { data: Array.from(bytes), rate: sampleRate });
}

export function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

/** How many windows a fingerprint measures. Sixteen puts a bar or two in each. */
export const WINDOWS = 16;

/**
 * A tolerant fingerprint of a rendered signal: peak, loudness, and loudness over time.
 *
 * Not a checksum, and the reason matters. The synthesiser is logically deterministic —
 * seeded, the same score draws the same 335,158 random numbers in the same order — but
 * Chromium's audio graph is not bit-exact between renders: two runs of one track differ in
 * the last bits of some samples, by about 5e-10, starting a few hundred samples in. That is
 * float accumulation order in the browser, not a difference in the music, and a
 * sha256 of the samples reports it as a total mismatch.
 *
 * So what is recorded is the shape of the signal: its peak, its overall loudness, and its
 * loudness in sixteen windows across the loop. That is coarse enough to survive the
 * platform and specific enough to catch what actually goes wrong — a stale file, the wrong
 * track, a loop rendered short, a mix that lost a part, a render that came out silent from
 * the second bar on.
 */
export function fingerprint(channels) {
  const frames = channels[0].length;
  let peak = 0;
  let total = 0;
  for (const channel of channels) {
    for (const v of channel) {
      const a = Math.abs(v);
      if (a > peak) peak = a;
      total += v * v;
    }
  }
  const windows = [];
  for (let w = 0; w < WINDOWS; w++) {
    const from = Math.floor((w * frames) / WINDOWS);
    const to = Math.floor(((w + 1) * frames) / WINDOWS);
    let sum = 0;
    let count = 0;
    for (const channel of channels) {
      for (let i = from; i < to; i++) { sum += channel[i] * channel[i]; count++; }
    }
    windows.push(Number(Math.sqrt(sum / Math.max(1, count)).toFixed(5)));
  }
  return {
    peak: Number(peak.toFixed(5)),
    rms: Number(Math.sqrt(total / (channels.length * frames)).toFixed(5)),
    windows,
  };
}

/**
 * Differences between two fingerprints, as readable lines. Empty when they agree.
 *
 * `peakTolerance` is separate because a lossy encoder overshoots: Vorbis routinely decodes
 * a peak one or two percent above the sample it was given, while the windowed loudness
 * stays put. Holding the peak to the same tolerance as the loudness would report the
 * encoder doing its job as a corrupt file.
 */
export function compareFingerprints(expected, actual, tolerance = 0.002,
  peakTolerance = tolerance) {
  const out = [];
  if (!actual) return ['no fingerprint to compare'];
  for (const [key, allowed] of [['peak', peakTolerance], ['rms', tolerance]]) {
    if (Math.abs((expected[key] ?? 0) - (actual[key] ?? 0)) > allowed) {
      out.push(`${key} ${actual[key]} against ${expected[key]}`);
    }
  }
  const a = expected.windows ?? [];
  const b = actual.windows ?? [];
  if (a.length !== b.length) {
    out.push(`${b.length} windows against ${a.length}`);
    return out;
  }
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tolerance) {
      out.push(`window ${i + 1}/${a.length} at ${b[i]} against ${a[i]}`);
    }
  }
  return out;
}

/** The score's own fingerprint, so an unchanged track is not re-rendered for nothing. */
export function scoreDigest(trackJson, { quality = QUALITY, sampleRate = SAMPLE_RATE,
  seed = SEED } = {}) {
  return crypto.createHash('sha256')
    .update(trackJson).update(`q${quality}|${sampleRate}|${seed}|f${FORMAT}`)
    .digest('hex').slice(0, 16);
}

/**
 * Render one track in an already-loaded page, and return the loop.
 *
 * `loops` of 2 renders the loop twice through and keeps the second pass — the one that
 * already carries the reverb tail a live loop still has ringing when it wraps, and which
 * therefore joins to itself. A one-shot cue asks for 1 and keeps its tail.
 */
export async function renderTrack(page, { id, sampleRate = SAMPLE_RATE, seed = SEED,
  loops = 2 } = {}) {
  return page.evaluate(async ({ trackId, rate, seedValue, seededSource, passes }) => {
    // The seeded generator covers the *scheduling* and nothing else. Every random number
    // the synthesiser draws is drawn there, synchronously; the render itself is awaited
    // with the real generator back in place, because during that await the page keeps
    // running and anything else that draws would move the sequence on — which is exactly
    // how three renders of one track came out three different ways.
    const realRandom = Math.random;
    // eslint-disable-next-line no-new-func
    new Function(`return (${seededSource})`)()(seedValue);
    let prepared;
    try {
      prepared = window.__audio.prepareOfflineRender(window.__tracks[trackId],
        { passes, sampleRate: rate });
    } finally {
      Math.random = realRandom;
    }
    try {
      const buffer = await prepared.ctx.startRendering();
      const loopLength = prepared.loopLength;
      const from = passes > 1 ? Math.round(loopLength * rate) : 0;
      const frames = passes > 1 ? Math.round(loopLength * rate) : buffer.length;
      const channels = [];
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        channels.push(Array.from(buffer.getChannelData(c).slice(from, from + frames)));
      }
      let peak = 0;
      let sum = 0;
      for (const channel of channels) {
        for (const v of channel) {
          peak = Math.max(peak, Math.abs(v));
          sum += v * v;
        }
      }
      return {
        channels, loopLength, peak, frames,
        rms: Math.sqrt(sum / (channels.length * frames)),
      };
    } catch (err) {
      throw new Error(`rendering ${trackId} failed: ${err.message}`);
    }
  }, { trackId: id, rate: sampleRate, seedValue: seed, seededSource: SEEDED, passes: loops });
}

/** Render one sound effect in an already-loaded page. */
export async function renderSfx(page, { name, seconds, sampleRate = SAMPLE_RATE,
  seed = SEED } = {}) {
  return page.evaluate(async ({ effect, length, rate, seedValue, seededSource }) => {
    const realRandom = Math.random;
    // eslint-disable-next-line no-new-func
    new Function(`return (${seededSource})`)()(seedValue);
    let prepared;
    try {
      prepared = window.__audio.prepareOfflineSfx(effect, { seconds: length, sampleRate: rate });
    } finally {
      Math.random = realRandom;
    }
    const buffer = await prepared.ctx.startRendering();
    const channels = [];
    let peak = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      channels.push(Array.from(data));
    }
    return { channels, peak };
  }, { effect: name, length: seconds, rate: sampleRate, seedValue: seed, seededSource: SEEDED });
}

/**
 * The effects the game can ask for, and how long each rings.
 *
 * The names are the reference's own — `audio.sfx('confirm')` — and the durations are how
 * long each needs with a little room, because a tail cut short is an audible click and
 * every one of these plays hundreds of times an hour.
 */
export const SFX = [
  ['cursor', 0.25], ['confirm', 0.3], ['cancel', 0.3], ['error', 0.4],
  ['hit', 0.5], ['crit', 0.6], ['heal', 1.1], ['magic', 0.8],
  ['chest', 1.1], ['text', 0.15],
];
