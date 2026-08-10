/**
 * Audio engine: a small synthesiser and a look-ahead sequencer.
 *
 * The score is *composed* — written out as note data and performed at runtime
 * by modelled instruments — rather than streamed from rendered audio. Three
 * reasons, and they all matter for a 40-hour game:
 *
 *   1. Loops are sample-accurate and seamless. A rendered loop always has a
 *      seam, and after the fortieth time round a town theme the player hears it.
 *   2. Tracks layer and transition dynamically: the battle theme can add a
 *      counter-melody when someone is near death, and a town can drop to solo
 *      harp indoors, from the same score data.
 *   3. It is a few kilobytes per track instead of a few megabytes.
 *
 * Instruments are built from oscillator stacks, filter envelopes and a shared
 * convolution reverb. Not a sample library — but with real writing underneath,
 * it reads as a game score rather than a synth demo.
 */

// ---------------------------------------------------------------------------
// Note utilities
// ---------------------------------------------------------------------------

const NOTE_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'C#4' | 'Eb3' | 60 → frequency in Hz. */
export function noteToFreq(note) {
  return 440 * Math.pow(2, (noteToMidi(note) - 69) / 12);
}

export function noteToMidi(note) {
  if (typeof note === 'number') return note;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note.trim());
  if (!m) return 60;
  const [, letter, accidental, octave] = m;
  let semitone = NOTE_OFFSETS[letter];
  if (accidental === '#') semitone++;
  if (accidental === 'b') semitone--;
  return (Number(octave) + 1) * 12 + semitone;
}

/** Transpose a note name or midi number by semitones. */
export function transpose(note, semitones) {
  return noteToMidi(note) + semitones;
}

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

/**
 * Each instrument is a function (ctx, dest, freq, time, duration, velocity,
 * options) that schedules its own nodes and cleans up after itself.
 */
export const INSTRUMENTS = {

  /** Warm string section: detuned saws, slow bow attack, gentle vibrato. */
  strings(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.linearRampToValueAtTime(2200 + vel * 1800, t + 0.35);
    filter.frequency.linearRampToValueAtTime(1500, t + dur);
    filter.Q.value = 0.7;

    // Three detuned saws is the classic string-ensemble trick; the spread is
    // what turns a buzz into a section.
    for (const detune of [-7, 0, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const vib = ctx.createOscillator();
      vib.frequency.value = 4.6 + Math.random() * 0.6;
      const vibGain = ctx.createGain();
      vibGain.gain.setValueAtTime(0, t);
      vibGain.gain.linearRampToValueAtTime(5, t + 0.45);
      vib.connect(vibGain).connect(osc.detune);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.5);
      vib.start(t);
      vib.stop(t + dur + 0.5);
    }
    filter.connect(out).connect(dest);

    const peak = 0.16 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.16);
    out.gain.setValueAtTime(peak, t + Math.max(0.17, dur - 0.12));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.30);
    return out;
  },

  /** Brass: bright, fast attack, a touch of drive. */
  brass(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(3200 + vel * 2200, t + 0.09);
    filter.frequency.exponentialRampToValueAtTime(1100, t + dur + 0.1);
    filter.Q.value = 2.2;

    for (const [type, detune, gain] of [['sawtooth', -4, 1], ['sawtooth', 5, 0.8], ['square', 0, 0.25]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.3);
    }
    filter.connect(out).connect(dest);
    const peak = 0.17 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.055);
    out.gain.linearRampToValueAtTime(peak * 0.82, t + 0.20);
    out.gain.setValueAtTime(peak * 0.82, t + Math.max(0.21, dur - 0.06));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.18);
    return out;
  },

  /** Flute / whistle: nearly pure tone plus breath noise. */
  flute(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const harm = ctx.createOscillator();
    harm.type = 'triangle';
    harm.frequency.value = freq * 2;
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.10;

    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(0, t);
    vibGain.gain.linearRampToValueAtTime(7, t + 0.30);
    vib.connect(vibGain).connect(osc.detune);

    // Breath: a filtered noise burst at the onset makes it read as a wind
    // instrument rather than a sine beep.
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = freq * 2.2;
    nf.Q.value = 1.4;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.06 * vel, t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);
    noise.connect(nf).connect(ng).connect(out);

    osc.connect(out);
    harm.connect(harmGain).connect(out);
    out.connect(dest);

    const peak = 0.17 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.09);
    out.gain.setValueAtTime(peak, t + Math.max(0.10, dur - 0.08));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.16);

    for (const n of [osc, harm, vib, noise]) { n.start(t); n.stop(t + dur + 0.4); }
    return out;
  },

  /** Harp / plucked string: bright transient, long ringing decay. */
  harp(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(6000, t);
    filter.frequency.exponentialRampToValueAtTime(700, t + 1.4);

    for (const [type, mul, gain] of [['triangle', 1, 1], ['sine', 2, 0.30], ['sine', 3, 0.12]]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mul;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(filter);
      osc.start(t);
      osc.stop(t + 2.2);
    }
    filter.connect(out).connect(dest);
    const peak = 0.26 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(2.0, Math.max(0.5, dur * 1.6)));
    return out;
  },

  /** Celesta / music box: FM bell, the sound of a memory. */
  celesta(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = freq * 3.01;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(freq * 2.4, t);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.04, t + 0.7);
    mod.connect(modGain).connect(carrier.frequency);
    carrier.connect(out).connect(dest);
    const peak = 0.22 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.7, dur * 1.4));
    carrier.start(t); carrier.stop(t + 2.4);
    mod.start(t); mod.stop(t + 2.4);
    return out;
  },

  /** Choir: stacked detuned saws behind a vowel-ish formant pair. */
  choir(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const mix = ctx.createGain();
    for (const detune of [-11, -4, 3, 9]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const vib = ctx.createOscillator();
      vib.frequency.value = 4.0 + Math.random();
      const vg = ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(6, t + 0.6);
      vib.connect(vg).connect(osc.detune);
      osc.connect(mix);
      osc.start(t); osc.stop(t + dur + 0.8);
      vib.start(t); vib.stop(t + dur + 0.8);
    }
    // Two band-passes approximate the 'ah' formants.
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 720; f1.Q.value = 3.5;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 1180; f2.Q.value = 4.5;
    const g1 = ctx.createGain(); g1.gain.value = 0.9;
    const g2 = ctx.createGain(); g2.gain.value = 0.6;
    mix.connect(f1).connect(g1).connect(out);
    mix.connect(f2).connect(g2).connect(out);
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass'; dark.frequency.value = 2400;
    mix.connect(dark);
    const g3 = ctx.createGain(); g3.gain.value = 0.35;
    dark.connect(g3).connect(out);
    out.connect(dest);

    const peak = 0.13 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.42);
    out.gain.setValueAtTime(peak, t + Math.max(0.43, dur - 0.2));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.55);
    return out;
  },

  /** Reedy pipe organ / accordion, for taverns and chapels. */
  reed(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    filter.Q.value = 1.1;
    for (const [type, mul, gain, detune] of [
      ['square', 1, 0.55, 0], ['sawtooth', 1, 0.35, 8], ['square', 2, 0.18, -6],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mul;
      osc.detune.value = detune;
      const g = ctx.createGain(); g.gain.value = gain;
      osc.connect(g).connect(filter);
      osc.start(t); osc.stop(t + dur + 0.2);
    }
    filter.connect(out).connect(dest);
    const peak = 0.12 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.05);
    out.gain.setValueAtTime(peak, t + Math.max(0.06, dur - 0.05));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    return out;
  },

  /** Bass: sine fundamental plus a little edge so it reads on small speakers. */
  bass(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const edge = ctx.createOscillator();
    edge.type = 'triangle';
    edge.frequency.value = freq * 2;
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0.22 * vel, t);
    eg.gain.exponentialRampToValueAtTime(0.02, t + 0.18);
    osc.connect(out);
    edge.connect(eg).connect(out);
    out.connect(dest);
    const peak = 0.34 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.02);
    out.gain.setValueAtTime(peak, t + Math.max(0.03, dur - 0.05));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.10);
    osc.start(t); osc.stop(t + dur + 0.3);
    edge.start(t); edge.stop(t + dur + 0.3);
    return out;
  },

  /** Pizzicato strings — short, dry, rhythmic. */
  pizz(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4200, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.22);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(filter).connect(out).connect(dest);
    const peak = 0.24 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.005);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
    osc.start(t); osc.stop(t + 0.4);
    return out;
  },

  /** Timpani / taiko. `freq` sets the pitch of the membrane. */
  timpani(ctx, dest, freq, t, dur, vel) {
    const out = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.10);
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.30 * vel, t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
    noise.connect(nf).connect(ng).connect(out);
    osc.connect(out).connect(dest);
    const peak = 0.44 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.5, dur));
    osc.start(t); osc.stop(t + 1.4);
    noise.start(t); noise.stop(t + 0.4);
    return out;
  },

  /** Percussion set: `freq` is ignored, `opts.drum` picks the voice. */
  drum(ctx, dest, freq, t, dur, vel, opts = {}) {
    const kind = opts.drum || 'kick';
    const out = ctx.createGain();
    out.connect(dest);
    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      osc.connect(out);
      out.gain.setValueAtTime(0.55 * vel, t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
      osc.start(t); osc.stop(t + 0.4);
    } else if (kind === 'snare') {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1400;
      noise.connect(f).connect(out);
      const tone = ctx.createOscillator();
      tone.type = 'triangle';
      tone.frequency.value = 210;
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.16 * vel, t);
      tg.gain.exponentialRampToValueAtTime(0.0005, t + 0.10);
      tone.connect(tg).connect(out);
      out.gain.setValueAtTime(0.30 * vel, t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
      noise.start(t); noise.stop(t + 0.25);
      tone.start(t); tone.stop(t + 0.25);
    } else if (kind === 'hat') {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7000;
      noise.connect(f).connect(out);
      out.gain.setValueAtTime(0.13 * vel, t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + (opts.open ? 0.32 : 0.055));
      noise.start(t); noise.stop(t + 0.4);
    } else if (kind === 'cymbal') {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 0.6;
      noise.connect(f).connect(out);
      out.gain.setValueAtTime(0.22 * vel, t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      noise.start(t); noise.stop(t + 1.5);
    }
    return out;
  },
};

let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

/** A synthetic impulse response: exponentially decaying filtered noise. */
function makeImpulse(ctx, seconds = 2.6, decay = 2.6) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Early reflections then a smooth tail; pure noise sounds like static.
      const envelope = Math.pow(1 - t, decay);
      data[i] = (Math.random() * 2 - 1) * envelope * (i < rate * 0.02 ? 0.4 : 1);
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.22;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.reverb = null;
    this.reverbSend = null;
    this.volumes = { master: 0.8, music: 0.65, sfx: 0.8 };

    this.current = null;      // active track state
    this.queued = null;
    this._timer = null;
    this.layerLevels = {};    // layer name → 0..1
  }

  /**
   * Browsers require a user gesture before audio can start, so this is called
   * from the first key press rather than at boot.
   */
  init() {
    if (this.ctx) return this;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return this;
    this.ctx = new Ctx({ latencyHint: 'interactive' });

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volumes.master;
    // A gentle limiter stops dense passages from clipping.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.006;
    comp.release.value = 0.20;
    this.masterGain.connect(comp).connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.volumes.music;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.volumes.sfx;
    this.sfxGain.connect(this.masterGain);

    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = makeImpulse(this.ctx, 2.8, 3.0);
    const reverbOut = this.ctx.createGain();
    reverbOut.gain.value = 0.9;
    this.reverb.connect(reverbOut).connect(this.masterGain);
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(this.reverb);

    this.ready = true;
    this._startScheduler();
    return this;
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setVolume(kind, value) {
    this.volumes[kind] = value;
    if (!this.ready) return;
    const node = { master: this.masterGain, music: this.musicGain, sfx: this.sfxGain }[kind];
    if (node) node.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  // --- music --------------------------------------------------------------

  /**
   * Start a track. If one is already playing, cross-fade.
   * `layers` lets a caller mute or unmute named track groups on the fly.
   */
  play(track, { fade = 1.2, restart = false, layers = null } = {}) {
    if (!this.ready) { this._pending = { track, fade, layers }; return; }
    if (this.current?.track.id === track.id && !restart) {
      if (layers) this.setLayers(layers);
      return;
    }
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (this.current) {
      const old = this.current;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
      old.stopping = true;
      setTimeout(() => { old.dead = true; }, (fade + 0.2) * 1000);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.current ? 0.0001 : 0.8, now);
    gain.gain.linearRampToValueAtTime(0.8, now + (this.current ? fade : 0.05));
    gain.connect(this.musicGain);

    const send = ctx.createGain();
    send.gain.value = track.reverb ?? 0.22;
    gain.connect(send);
    send.connect(this.reverb);

    this.current = {
      track,
      gain,
      startTime: now + 0.08,
      nextNoteIndex: 0,
      loopCount: 0,
      layerGains: {},
      stopping: false,
      dead: false,
    };
    this._prepare(this.current);
    if (layers) this.setLayers(layers);
  }

  stop(fade = 1.0) {
    if (!this.current || !this.ready) return;
    const now = this.ctx.currentTime;
    this.current.gain.gain.cancelScheduledValues(now);
    this.current.gain.gain.setValueAtTime(this.current.gain.gain.value, now);
    this.current.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    this.current.stopping = true;
    const old = this.current;
    this.current = null;
    setTimeout(() => { old.dead = true; }, (fade + 0.2) * 1000);
  }

  /** Set the audible mix of named layers, e.g. { melody: 1, counter: 0 }. */
  setLayers(levels, ramp = 0.6) {
    if (!this.current) return;
    Object.assign(this.layerLevels, levels);
    const now = this.ctx.currentTime;
    for (const [name, level] of Object.entries(levels)) {
      const g = this.current.layerGains[name];
      if (g) g.gain.setTargetAtTime(level, now, ramp / 3);
    }
  }

  /**
   * Flatten a track's tracks into one time-ordered note list, and build a gain
   * node per layer so layers can be faded independently.
   */
  _prepare(state) {
    const { track } = state;
    const beatDur = 60 / track.bpm;
    const events = [];
    state.layerGains = {};

    for (const part of track.tracks) {
      const layerName = part.layer || 'main';
      if (!state.layerGains[layerName]) {
        const g = this.ctx.createGain();
        g.gain.value = this.layerLevels[layerName] ?? 1;
        g.connect(state.gain);
        state.layerGains[layerName] = g;
      }
      const partGain = this.ctx.createGain();
      partGain.gain.value = part.gain ?? 1;
      let dest = partGain;
      if (part.pan !== undefined && this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = part.pan;
        partGain.connect(panner).connect(state.layerGains[layerName]);
      } else {
        partGain.connect(state.layerGains[layerName]);
      }
      for (const n of part.notes) {
        const [beat, pitch, dur, vel] = n;
        events.push({
          time: beat * beatDur,
          freq: pitch === null ? 0 : noteToFreq(pitch),
          dur: dur * beatDur,
          vel: (vel ?? 0.9),
          instrument: part.instrument,
          dest,
          opts: part.opts || (n[4] && typeof n[4] === 'object' ? n[4] : undefined),
          drum: part.drum,
        });
      }
    }
    events.sort((a, b) => a.time - b.time);
    state.events = events;
    state.loopLength = (track.lengthBeats ?? this._inferLength(track)) * beatDur;
  }

  _inferLength(track) {
    let max = 0;
    for (const part of track.tracks) {
      for (const [beat, , dur] of part.notes) max = Math.max(max, beat + dur);
    }
    // Round up to a whole bar so loops land musically.
    const beatsPerBar = (track.timeSig?.[0] ?? 4);
    return Math.ceil(max / beatsPerBar) * beatsPerBar;
  }

  _startScheduler() {
    clearInterval(this._timer);
    this._timer = setInterval(() => this._schedule(), LOOKAHEAD_MS);
    if (this._pending) {
      const p = this._pending;
      this._pending = null;
      this.play(p.track, { fade: p.fade, layers: p.layers });
    }
  }

  _schedule() {
    const state = this.current;
    if (!state || state.dead || !this.ready) return;
    const ctx = this.ctx;
    const horizon = ctx.currentTime + SCHEDULE_AHEAD;

    let guard = 0;
    while (guard++ < 512) {
      const loopStart = state.startTime + state.loopCount * state.loopLength;
      const ev = state.events[state.nextNoteIndex];
      if (!ev) {
        // One-shot cues (fanfares, the loss theme) declare `loop: false` and
        // simply stop rather than wrapping. Whatever the caller queues next
        // takes over; nothing is left ringing.
        if (state.track?.loop === false) { state.dead = true; return; }
        // Wrap to the top of the loop.
        state.nextNoteIndex = 0;
        state.loopCount++;
        continue;
      }
      const when = loopStart + ev.time;
      if (when > horizon) break;
      if (when >= ctx.currentTime - 0.05 && ev.freq >= 0) {
        const fn = INSTRUMENTS[ev.instrument] || INSTRUMENTS.strings;
        try {
          fn(ctx, ev.dest, ev.freq, when, ev.dur, ev.vel, { ...(ev.opts || {}), drum: ev.drum });
        } catch (err) {
          console.warn('[audio] note failed', err);
        }
      }
      state.nextNoteIndex++;
    }
  }

  // --- sound effects ------------------------------------------------------

  /** Small synthesised UI and battle sounds. */
  sfx(name, { detune = 0, gain = 1 } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = gain;
    out.connect(this.sfxGain);

    const beep = (freq, dur, type = 'square', vol = 0.25) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * Math.pow(2, detune / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(out);
      osc.start(t); osc.stop(t + dur + 0.02);
    };

    switch (name) {
      case 'cursor': beep(880, 0.05, 'square', 0.10); break;
      case 'confirm': beep(1180, 0.07, 'square', 0.14); setTimeout(() => {}, 0); break;
      case 'cancel': beep(420, 0.09, 'square', 0.12); break;
      case 'error': beep(180, 0.16, 'sawtooth', 0.14); break;
      case 'hit': {
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.32, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        noise.connect(f).connect(g).connect(out);
        noise.start(t); noise.stop(t + 0.2);
        beep(140, 0.12, 'sine', 0.22);
        break;
      }
      case 'crit': {
        beep(220, 0.22, 'sawtooth', 0.20);
        beep(660, 0.18, 'square', 0.12);
        break;
      }
      case 'heal': {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = 523.25 * Math.pow(2, i / 12 * 2);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t + i * 0.05);
          g.gain.linearRampToValueAtTime(0.14, t + i * 0.05 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.5);
          osc.connect(g).connect(out);
          osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.6);
        }
        break;
      }
      case 'magic': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        osc.connect(f).connect(g).connect(out);
        osc.start(t); osc.stop(t + 0.5);
        break;
      }
      case 'chest': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t + i * 0.08);
          g.gain.linearRampToValueAtTime(0.18, t + i * 0.08 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.4);
          osc.connect(g).connect(out);
          osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.5);
        });
        break;
      }
      case 'text': beep(1400 + Math.random() * 200, 0.018, 'square', 0.035); break;
      default: beep(660, 0.06); break;
    }
  }
}

export const audio = new AudioEngine();
