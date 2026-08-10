import { noteToMidi } from '../audio/audio.js';

/**
 * The score.
 *
 * Everything is built on one idea: the **Aetherbound motif** — a leap up of a
 * minor sixth followed by a stepwise fall. It opens the title Prelude, it is
 * the melody of the world map, it appears inverted and slowed under the boss
 * theme, and it is the whole of the ending. Recurrence is what makes a
 * soundtrack feel like a soundtrack instead of a playlist; a player should be
 * able to hum one tune after forty hours and have it mean six different places.
 *
 * Notes are `[beat, pitch, durationInBeats, velocity]`. Beat 0 is the top of
 * the loop. Helper functions below expand written-out chord and arpeggio
 * figures — the composition is authored, the helpers just save typing the same
 * broken chord sixteen times.
 */

// ---------------------------------------------------------------------------
// Notation helpers
// ---------------------------------------------------------------------------

/** Chord voicings, written as note names. */
const CHORDS = {
  Dm:   ['D3', 'F3', 'A3', 'D4'],
  Dm7:  ['D3', 'F3', 'A3', 'C4'],
  Bb:   ['Bb2', 'D3', 'F3', 'Bb3'],
  BbM7: ['Bb2', 'D3', 'F3', 'A3'],
  F:    ['F2', 'A2', 'C3', 'F3'],
  C:    ['C3', 'E3', 'G3', 'C4'],
  Gm:   ['G2', 'Bb2', 'D3', 'G3'],
  Gm7:  ['G2', 'Bb2', 'D3', 'F3'],
  A:    ['A2', 'C#3', 'E3', 'A3'],
  A7:   ['A2', 'C#3', 'E3', 'G3'],
  Am:   ['A2', 'C3', 'E3', 'A3'],
  Eb:   ['Eb3', 'G3', 'Bb3', 'Eb4'],
  Cm:   ['C3', 'Eb3', 'G3', 'C4'],
  Fm:   ['F2', 'Ab2', 'C3', 'F3'],
  Ab:   ['Ab2', 'C3', 'Eb3', 'Ab3'],
  Db:   ['Db3', 'F3', 'Ab3', 'Db4'],
  Bdim: ['B2', 'D3', 'F3', 'B3'],
  E7:   ['E3', 'G#3', 'B3', 'D4'],
  Asus: ['A2', 'D3', 'E3', 'A3'],
  // Added for the later regions, which move out of the home key: the market
  // city and the festival sit in Bb/G major, the frozen north in Eb minor,
  // and the endgame leans on diminished and augmented colour.
  D:     ['D3', 'F#3', 'A3', 'D4'],
  D7:    ['D3', 'F#3', 'A3', 'C4'],
  Dsus:  ['D3', 'G3', 'A3', 'D4'],
  Ddim:  ['D3', 'F3', 'Ab3', 'B3'],
  G:     ['G2', 'B2', 'D3', 'G3'],
  G7:    ['G2', 'B2', 'D3', 'F3'],
  Em:    ['E3', 'G3', 'B3', 'E4'],
  Em7:   ['E3', 'G3', 'B3', 'D4'],
  Am7:   ['A2', 'C3', 'E3', 'G3'],
  FM7:   ['F2', 'A2', 'C3', 'E3'],
  Csus:  ['C3', 'F3', 'G3', 'C4'],
  Cm7:   ['C3', 'Eb3', 'G3', 'Bb3'],
  Bbm:   ['Bb2', 'Db3', 'F3', 'Bb3'],
  Ebm:   ['Eb3', 'Gb3', 'Bb3', 'Eb4'],
  AbM7:  ['Ab2', 'C3', 'Eb3', 'G3'],
  Adim:  ['A2', 'C3', 'Eb3', 'Gb3'],
  Cdim:  ['C3', 'Eb3', 'Gb3', 'A3'],
  Faug:  ['F2', 'A2', 'C#3', 'F3'],
  Bbaug: ['Bb2', 'D3', 'F#3', 'Bb3'],
};

/** Sustained block chord. */
function pad(chordName, beat, dur, vel = 0.7, octaveShift = 0) {
  const chord = CHORDS[chordName] || CHORDS.Dm;
  return chord.map((n) => [beat, noteToMidi(n) + octaveShift * 12, dur, vel]);
}

/**
 * Broken chord. `pattern` indexes into the voicing; fractional beats let a
 * figure swing across the bar.
 */
function arp(chordName, startBeat, pattern, step = 0.5, vel = 0.7, octaveShift = 0) {
  const chord = CHORDS[chordName] || CHORDS.Dm;
  return pattern.map((idx, i) => {
    const note = chord[idx % chord.length];
    const oct = Math.floor(idx / chord.length);
    return [startBeat + i * step, noteToMidi(note) + (oct + octaveShift) * 12, step * 1.6, vel];
  });
}

/** Repeat a figure every `every` beats, `times` times. */
function repeat(makeNotes, startBeat, every, times) {
  const out = [];
  for (let i = 0; i < times; i++) out.push(...makeNotes(startBeat + i * every, i));
  return out;
}

/** Walking bass line on the root of each chord. */
function bassLine(progression, beatsPerChord, pattern = [0], vel = 0.85) {
  const out = [];
  progression.forEach((name, i) => {
    const root = (CHORDS[name] || CHORDS.Dm)[0];
    const base = noteToMidi(root) - 12;
    for (const [offset, semis, dur] of pattern.map((p) => (Array.isArray(p) ? p : [p, 0, 1]))) {
      out.push([i * beatsPerChord + offset, base + semis, dur, vel]);
    }
  });
  return out;
}

/** Straight drum pattern over `bars` bars of 4/4. */
function drums(bars, { kick = [0, 2], snare = [1, 3], hat = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], vel = 0.9 } = {}) {
  const out = { kick: [], snare: [], hat: [] };
  for (let b = 0; b < bars; b++) {
    const t = b * 4;
    for (const k of kick) out.kick.push([t + k, 'C2', 0.2, vel]);
    for (const s of snare) out.snare.push([t + s, 'C2', 0.2, vel * 0.9]);
    for (const h of hat) out.hat.push([t + h, 'C2', 0.1, vel * 0.55]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The motif
// ---------------------------------------------------------------------------

/**
 * The Aetherbound motif, in D minor. Eight bars: a rising sixth (A→F), a
 * stepwise descent, then an answering phrase that climbs a step higher before
 * falling home.
 */
const MOTIF = [
  // phrase A
  [0.0, 'A4', 1.0], [1.0, 'D5', 2.0], [3.0, 'C5', 1.0],
  [4.0, 'Bb4', 1.5], [5.5, 'A4', 0.5], [6.0, 'G4', 2.0],
  [8.0, 'F4', 1.0], [9.0, 'G4', 1.0], [10.0, 'A4', 1.5], [11.5, 'Bb4', 0.5],
  [12.0, 'A4', 3.0],
  // phrase B — same shape, lifted
  [16.0, 'A4', 1.0], [17.0, 'F5', 2.0], [19.0, 'E5', 1.0],
  [20.0, 'D5', 1.5], [21.5, 'C5', 0.5], [22.0, 'Bb4', 2.0],
  [24.0, 'C5', 1.0], [25.0, 'Bb4', 1.0], [26.0, 'A4', 1.0], [27.0, 'G4', 1.0],
  [28.0, 'F4', 4.0],
];

/** The harmony the motif sits on, one chord per bar. */
const MOTIF_CHORDS = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm7', 'A7'];

function motif({ octave = 0, vel = 0.9, offset = 0, augment = 1 } = {}) {
  return MOTIF.map(([b, p, d]) => [
    offset + b * augment,
    noteToMidi(p) + octave * 12,
    d * augment,
    vel,
  ]);
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export const TRACKS = {};

/** ---- Prelude (title screen) -------------------------------------------
 * Rising harp arpeggios under a distant choir. Deliberately sparse: the
 * first thing a player hears should promise scale, not deliver it.
 */
TRACKS.prelude = {
  id: 'prelude', name: 'Prelude',
  bpm: 76, timeSig: [4, 4], reverb: 0.42, lengthBeats: 64,
  tracks: [
    {
      instrument: 'harp', gain: 0.9, pan: -0.15, layer: 'main',
      notes: repeat((t, i) => {
        const chord = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A7', 'Dm'][i];
        // Up two octaves and back down — the shape of the classic prelude.
        return arp(chord, t, [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0, 1, 2, 3], 0.5, 0.55);
      }, 0, 8, 8),
    },
    {
      instrument: 'choir', gain: 0.55, pan: 0.1, layer: 'pad',
      notes: repeat((t, i) => {
        const chord = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A7', 'Dm'][i];
        return pad(chord, t, 7.6, 0.55, 1);
      }, 0, 8, 8),
    },
    {
      instrument: 'flute', gain: 0.7, pan: 0.2, layer: 'melody',
      notes: motif({ octave: 0, vel: 0.75, offset: 32, augment: 1 }).filter((n) => n[0] < 64),
    },
  ],
};

/** ---- Harrowmere (opening village) ------------------------------------
 * Pastoral, in F major — the relative major of the motif's D minor, so the
 * village literally sounds like the bright side of the same idea.
 */
TRACKS.town_harrowmere = {
  id: 'town_harrowmere', name: 'Smoke on the Silt Road',
  bpm: 104, timeSig: [4, 4], reverb: 0.24, lengthBeats: 64,
  tracks: [
    {
      instrument: 'flute', gain: 0.85, pan: 0.15, layer: 'melody',
      notes: [
        [0, 'F4', 1], [1, 'A4', 1], [2, 'C5', 1.5], [3.5, 'A4', 0.5],
        [4, 'G4', 2], [6, 'F4', 1], [7, 'G4', 1],
        [8, 'A4', 1], [9, 'C5', 1], [10, 'D5', 1.5], [11.5, 'C5', 0.5],
        [12, 'A4', 3], [15, 'G4', 1],
        [16, 'F4', 1], [17, 'A4', 1], [18, 'C5', 1.5], [19.5, 'D5', 0.5],
        [20, 'E5', 2], [22, 'D5', 1], [23, 'C5', 1],
        [24, 'Bb4', 1], [25, 'A4', 1], [26, 'G4', 1], [27, 'F4', 1],
        [28, 'F4', 4],
        // second half: the motif, quoted in the major
        [32, 'C5', 1], [33, 'A5', 2], [35, 'G5', 1],
        [36, 'F5', 1.5], [37.5, 'E5', 0.5], [38, 'D5', 2],
        [40, 'C5', 1], [41, 'D5', 1], [42, 'E5', 1.5], [43.5, 'F5', 0.5],
        [44, 'E5', 3], [47, 'C5', 1],
        [48, 'F4', 1], [49, 'A4', 1], [50, 'C5', 1.5], [51.5, 'A4', 0.5],
        [52, 'G4', 2], [54, 'Bb4', 1], [55, 'A4', 1],
        [56, 'G4', 2], [58, 'E4', 2],
        [60, 'F4', 4],
      ],
    },
    {
      instrument: 'harp', gain: 0.55, pan: -0.25, layer: 'main',
      notes: repeat((t, i) => {
        const prog = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C',
          'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'C', 'F'];
        return arp(prog[i], t, [0, 2, 1, 3, 2, 1], 0.6667, 0.5);
      }, 0, 4, 16),
    },
    {
      instrument: 'strings', gain: 0.42, pan: 0.05, layer: 'pad',
      notes: repeat((t, i) => {
        const prog = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C',
          'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'C', 'F'];
        return pad(prog[i], t, 3.7, 0.45, 1);
      }, 0, 4, 16),
    },
    {
      instrument: 'bass', gain: 0.7, layer: 'main',
      notes: bassLine(
        ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'C', 'F'],
        4, [[0, 0, 1.6], [2, 7, 1.6]], 0.8),
    },
  ],
};

/** ---- The world map -----------------------------------------------------
 * The motif at full height: strings carry it, brass answers, timpani drives.
 */
TRACKS.overworld = {
  id: 'overworld', name: 'Aetherbound',
  bpm: 92, timeSig: [4, 4], reverb: 0.32, lengthBeats: 64,
  tracks: [
    { instrument: 'strings', gain: 0.95, pan: -0.1, layer: 'melody', notes: motif({ vel: 0.95 }) },
    {
      instrument: 'brass', gain: 0.55, pan: 0.22, layer: 'counter',
      // Answering phrase in the gaps of the melody.
      notes: [
        [13.0, 'D4', 0.5], [13.5, 'E4', 0.5], [14.0, 'F4', 1.5],
        [29.0, 'A3', 0.5], [29.5, 'Bb3', 0.5], [30.0, 'C4', 2.0],
        [45.0, 'D4', 1], [46, 'F4', 1], [47, 'A4', 1],
        [61, 'A3', 1], [62, 'D4', 2],
      ],
    },
    {
      instrument: 'strings', gain: 0.40, pan: 0.15, layer: 'pad',
      notes: repeat((t, i) => pad(MOTIF_CHORDS[i % 8], t, 3.7, 0.5, 1), 0, 4, 16),
    },
    {
      instrument: 'harp', gain: 0.4, pan: -0.3, layer: 'main',
      notes: repeat((t, i) => arp(MOTIF_CHORDS[i % 8], t, [0, 1, 2, 3, 2, 1], 0.6667, 0.42, 1), 0, 4, 16),
    },
    {
      instrument: 'bass', gain: 0.75, layer: 'main',
      notes: bassLine([...MOTIF_CHORDS, ...MOTIF_CHORDS], 4,
        [[0, 0, 1.8], [2, 0, 0.8], [3, 7, 0.8]], 0.85),
    },
    {
      instrument: 'timpani', gain: 0.5, layer: 'main',
      notes: repeat((t, i) => (i % 2 === 0
        ? [[t, 'D2', 0.6, 0.8], [t + 3, 'A1', 0.4, 0.55]]
        : [[t, 'A1', 0.6, 0.7]]), 0, 4, 16),
    },
    // Second statement of the motif, an octave up, layered in from bar 9.
    { instrument: 'flute', gain: 0.5, pan: 0.3, layer: 'high', notes: motif({ octave: 1, vel: 0.6, offset: 32 }).filter((n) => n[0] < 64) },
  ],
};

/** ---- Battle -------------------------------------------------------------
 * Fast, driving, in D minor. The bass riff is the hook, not the melody —
 * battle themes are heard in fragments, so the memorable part has to be the
 * thing playing continuously.
 */
TRACKS.battle = {
  id: 'battle', name: 'Steel and Cinders',
  bpm: 158, timeSig: [4, 4], reverb: 0.18, lengthBeats: 64,
  tracks: [
    {
      instrument: 'bass', gain: 0.95, layer: 'main',
      notes: repeat((t) => [
        [t + 0.0, 'D2', 0.45, 0.95], [t + 0.5, 'D2', 0.45, 0.7],
        [t + 1.0, 'D2', 0.45, 0.85], [t + 1.5, 'F2', 0.45, 0.8],
        [t + 2.0, 'G2', 0.45, 0.9], [t + 2.5, 'F2', 0.45, 0.75],
        [t + 3.0, 'E2', 0.45, 0.85], [t + 3.5, 'C#2', 0.45, 0.8],
      ], 0, 4, 16),
    },
    {
      instrument: 'brass', gain: 0.8, pan: -0.12, layer: 'melody',
      notes: [
        [0, 'D5', 0.75], [0.75, 'C5', 0.25], [1, 'D5', 0.5], [1.5, 'F5', 1.5],
        [3.5, 'E5', 0.5],
        [4, 'D5', 0.75], [4.75, 'C5', 0.25], [5, 'Bb4', 0.5], [5.5, 'A4', 1.5],
        [7.5, 'G4', 0.5],
        [8, 'A4', 0.5], [8.5, 'D5', 0.5], [9, 'F5', 1], [10, 'E5', 1], [11, 'D5', 1],
        [12, 'C#5', 2], [14, 'D5', 2],
        [16, 'D5', 0.75], [16.75, 'E5', 0.25], [17, 'F5', 0.5], [17.5, 'A5', 1.5],
        [19.5, 'G5', 0.5],
        [20, 'F5', 0.75], [20.75, 'E5', 0.25], [21, 'D5', 0.5], [21.5, 'C5', 1.5],
        [23.5, 'Bb4', 0.5],
        [24, 'A4', 1], [25, 'Bb4', 1], [26, 'C5', 1], [27, 'C#5', 1],
        [28, 'D5', 4],
      ],
    },
    {
      instrument: 'strings', gain: 0.42, pan: 0.2, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Dm', 'Gm', 'A7'][i % 4], t, 3.6, 0.45, 1), 0, 4, 16),
    },
    {
      instrument: 'pizz', gain: 0.5, pan: 0.28, layer: 'counter',
      notes: repeat((t) => [
        [t + 0.25, 'A4', 0.2, 0.6], [t + 0.75, 'D5', 0.2, 0.55],
        [t + 1.75, 'F5', 0.2, 0.6], [t + 2.75, 'E5', 0.2, 0.55],
      ], 32, 4, 8),
    },
    { instrument: 'drum', drum: 'kick', gain: 0.85, layer: 'main', notes: drums(16, { kick: [0, 1.5, 2.5], snare: [], hat: [] }).kick },
    { instrument: 'drum', drum: 'snare', gain: 0.7, layer: 'main', notes: drums(16, { kick: [], snare: [1, 3], hat: [] }).snare },
    { instrument: 'drum', drum: 'hat', gain: 0.5, layer: 'main', notes: drums(16, { kick: [], snare: [], hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] }).hat },
    {
      instrument: 'timpani', gain: 0.55, layer: 'main',
      notes: repeat((t, i) => (i % 4 === 3 ? [[t + 3, 'A1', 0.5, 0.9], [t + 3.5, 'D2', 0.5, 0.9]] : []), 0, 4, 16),
    },
  ],
};

/** ---- Boss ---------------------------------------------------------------
 * The motif inverted and halved in speed under a choir. Same DNA, read
 * backwards — the villain's theme *is* the world's theme, corrupted.
 */
TRACKS.boss = {
  id: 'boss', name: 'The Chancellor Turns the Key',
  bpm: 148, timeSig: [4, 4], reverb: 0.3, lengthBeats: 64,
  tracks: [
    {
      instrument: 'choir', gain: 0.75, pan: 0, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Bb', 'Fm', 'C', 'Dm', 'Ab', 'Gm', 'A7'][i % 8], t, 7.4, 0.6), 0, 8, 8),
    },
    {
      instrument: 'brass', gain: 0.9, pan: -0.15, layer: 'melody',
      // Inversion: where the motif leapt up a sixth, this falls one.
      notes: [
        [0, 'A4', 1], [1, 'D4', 2], [3, 'E4', 1],
        [4, 'F4', 1.5], [5.5, 'G4', 0.5], [6, 'A4', 2],
        [8, 'Bb4', 1], [9, 'A4', 1], [10, 'G4', 1.5], [11.5, 'F4', 0.5],
        [12, 'A4', 3], [15, 'A4', 1],
        [16, 'A4', 1], [17, 'C#4', 2], [19, 'D4', 1],
        [20, 'E4', 1.5], [21.5, 'F4', 0.5], [22, 'G4', 2],
        [24, 'A4', 1], [25, 'Bb4', 1], [26, 'C5', 1], [27, 'C#5', 1],
        [28, 'D5', 4],
      ],
    },
    {
      instrument: 'bass', gain: 1.0, layer: 'main',
      notes: repeat((t) => [
        [t, 'D2', 0.3, 1.0], [t + 0.33, 'D2', 0.3, 0.7], [t + 0.66, 'D2', 0.3, 0.7],
        [t + 1, 'D2', 0.3, 0.9], [t + 1.33, 'Eb2', 0.3, 0.7], [t + 1.66, 'D2', 0.3, 0.7],
        [t + 2, 'C2', 0.3, 0.9], [t + 2.33, 'C2', 0.3, 0.7], [t + 2.66, 'C2', 0.3, 0.7],
        [t + 3, 'Bb1', 0.5, 0.95], [t + 3.5, 'A1', 0.5, 0.9],
      ], 0, 4, 16),
    },
    { instrument: 'drum', drum: 'kick', gain: 0.9, layer: 'main', notes: drums(16, { kick: [0, 0.75, 2, 2.75], snare: [], hat: [] }).kick },
    { instrument: 'drum', drum: 'snare', gain: 0.75, layer: 'main', notes: drums(16, { kick: [], snare: [1, 3, 3.5], hat: [] }).snare },
    {
      instrument: 'timpani', gain: 0.75, layer: 'main',
      notes: repeat((t) => [[t, 'D2', 0.5, 1.0], [t + 2, 'A1', 0.5, 0.85]], 0, 4, 16),
    },
    {
      instrument: 'drum', drum: 'cymbal', gain: 0.5, layer: 'main',
      notes: repeat((t, i) => (i % 4 === 0 ? [[t, 'C4', 1, 0.8]] : []), 0, 4, 16),
    },
  ],
};

/** ---- Victory fanfare ---------------------------------------------------- */
TRACKS.victory = {
  id: 'victory', name: 'Carried', bpm: 140, timeSig: [4, 4], reverb: 0.3, lengthBeats: 16,
  tracks: [
    {
      instrument: 'brass', gain: 1.0, layer: 'melody',
      notes: [
        [0, 'D5', 0.25], [0.25, 'D5', 0.25], [0.5, 'D5', 0.25], [0.75, 'D5', 1.25],
        [2, 'Bb4', 1], [3, 'C5', 1],
        [4, 'D5', 2], [6, 'C5', 0.5], [6.5, 'D5', 1.5],
        [8, 'F5', 2], [10, 'E5', 1], [11, 'D5', 1],
        [12, 'D5', 4],
      ],
    },
    {
      instrument: 'strings', gain: 0.5, layer: 'pad',
      notes: [...pad('Dm', 0, 2, 0.7, 1), ...pad('Bb', 2, 2, 0.7, 1), ...pad('F', 4, 4, 0.7, 1),
        ...pad('Gm', 8, 2, 0.7, 1), ...pad('A7', 10, 2, 0.7, 1), ...pad('Dm', 12, 4, 0.8, 1)],
    },
    { instrument: 'timpani', gain: 0.7, layer: 'main', notes: [[0, 'D2', 0.4, 1], [2, 'D2', 0.4, 0.8], [4, 'F2', 0.4, 0.9], [8, 'G2', 0.4, 0.9], [12, 'D2', 1.2, 1]] },
    { instrument: 'drum', drum: 'cymbal', gain: 0.6, layer: 'main', notes: [[0, 'C4', 1, 0.9], [12, 'C4', 1, 0.9]] },
  ],
};

/** ---- Dungeon ------------------------------------------------------------
 * Low, slow, mostly texture. Almost no melody, because a dungeon theme has to
 * survive an hour of listening.
 */
TRACKS.dungeon = {
  id: 'dungeon', name: 'Beneath the Ridge',
  bpm: 66, timeSig: [4, 4], reverb: 0.5, lengthBeats: 64,
  tracks: [
    {
      instrument: 'strings', gain: 0.7, pan: -0.1, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Dm', 'Bdim', 'Gm', 'Dm', 'Eb', 'Cm', 'A7'][i % 8], t, 7.6, 0.5), 0, 8, 8),
    },
    {
      instrument: 'choir', gain: 0.30, pan: 0.2, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Gm'][i % 2], t, 15, 0.35, 1), 0, 16, 4),
    },
    {
      instrument: 'celesta', gain: 0.45, pan: 0.3, layer: 'melody',
      // Fragments of the motif, as if half-remembered.
      notes: [
        [4, 'A4', 1], [5, 'D5', 2],
        [16, 'F4', 1], [17, 'G4', 1], [18, 'A4', 2],
        [32, 'A4', 1], [33, 'D5', 3],
        [48, 'Bb4', 1], [49, 'A4', 1], [50, 'G4', 2],
      ],
    },
    { instrument: 'bass', gain: 0.65, layer: 'main', notes: repeat((t, i) => [[t, ['D1', 'D1', 'B1', 'G1', 'D1', 'Eb1', 'C1', 'A1'][i % 8], 7, 0.8]], 0, 8, 8) },
    { instrument: 'timpani', gain: 0.35, layer: 'main', notes: repeat((t, i) => (i % 2 === 0 ? [[t, 'D1', 1.4, 0.5]] : []), 0, 8, 8) },
  ],
};

/** ---- Memory / sorrow ---------------------------------------------------- */
TRACKS.memory = {
  id: 'memory', name: 'What the Water Kept',
  bpm: 60, timeSig: [4, 4], reverb: 0.5, lengthBeats: 32,
  tracks: [
    { instrument: 'celesta', gain: 0.85, pan: -0.1, layer: 'melody', notes: motif({ vel: 0.6, augment: 1 }).filter((n) => n[0] < 32) },
    {
      instrument: 'strings', gain: 0.45, pan: 0.1, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'BbM7', 'F', 'C', 'Gm7', 'Dm', 'A7', 'Dm'][i % 8], t, 3.7, 0.4, 1), 0, 4, 8),
    },
    { instrument: 'harp', gain: 0.4, pan: 0.25, layer: 'main', notes: repeat((t, i) => arp(['Dm', 'BbM7', 'F', 'C', 'Gm7', 'Dm', 'A7', 'Dm'][i % 8], t, [0, 1, 2, 3], 1, 0.4, 1), 0, 4, 8) },
  ],
};

/** ---- Inn / peace -------------------------------------------------------- */
TRACKS.inn = {
  id: 'inn', name: 'The Kettle & Cinder',
  bpm: 88, timeSig: [3, 4], reverb: 0.25, lengthBeats: 24,
  tracks: [
    {
      instrument: 'reed', gain: 0.7, pan: 0.15, layer: 'melody',
      notes: [
        [0, 'F4', 1], [1, 'G4', 0.5], [1.5, 'A4', 0.5], [2, 'C5', 1],
        [3, 'A4', 1.5], [4.5, 'G4', 0.5], [5, 'F4', 1],
        [6, 'G4', 1], [7, 'A4', 1], [8, 'Bb4', 1],
        [9, 'A4', 2], [11, 'G4', 1],
        [12, 'F4', 1], [13, 'A4', 0.5], [13.5, 'C5', 0.5], [14, 'D5', 1],
        [15, 'C5', 1.5], [16.5, 'A4', 0.5], [17, 'G4', 1],
        [18, 'A4', 1], [19, 'G4', 1], [20, 'E4', 1],
        [21, 'F4', 3],
      ],
    },
    { instrument: 'harp', gain: 0.5, pan: -0.2, layer: 'main', notes: repeat((t, i) => arp(['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'F'][i % 8], t, [0, 2, 3], 1, 0.5), 0, 3, 8) },
    { instrument: 'bass', gain: 0.6, layer: 'main', notes: repeat((t, i) => [[t, [['F1'], ['C1'], ['D1'], ['Bb0'], ['F1'], ['C1'], ['G1'], ['F1']][i % 8][0], 2.8, 0.75]], 0, 3, 8) },
  ],
};

/** ---- Ferran Imperium (menace, mechanical) ------------------------------- */
TRACKS.imperium = {
  id: 'imperium', name: 'The Engine Turns',
  bpm: 116, timeSig: [4, 4], reverb: 0.2, lengthBeats: 32,
  tracks: [
    {
      instrument: 'reed', gain: 0.6, pan: -0.2, layer: 'main',
      // A relentless ostinato — the machine that never stops.
      notes: repeat((t) => [
        [t, 'D3', 0.25, 0.8], [t + 0.5, 'A3', 0.25, 0.6], [t + 1, 'D3', 0.25, 0.7],
        [t + 1.5, 'F3', 0.25, 0.6], [t + 2, 'D3', 0.25, 0.8], [t + 2.5, 'A3', 0.25, 0.6],
        [t + 3, 'C3', 0.25, 0.7], [t + 3.5, 'E3', 0.25, 0.6],
      ], 0, 4, 8),
    },
    {
      instrument: 'brass', gain: 0.75, pan: 0.15, layer: 'melody',
      notes: [
        [0, 'D4', 2], [2, 'Eb4', 2],
        [4, 'D4', 1], [5, 'C4', 1], [6, 'Bb3', 2],
        [8, 'A3', 4],
        [12, 'D4', 1], [13, 'F4', 1], [14, 'A4', 2],
        [16, 'Bb4', 2], [18, 'A4', 2],
        [20, 'G4', 1], [21, 'F4', 1], [22, 'E4', 2],
        [24, 'D4', 4],
        [28, 'C#4', 2], [30, 'D4', 2],
      ],
    },
    { instrument: 'bass', gain: 0.85, layer: 'main', notes: repeat((t, i) => [[t, ['D1', 'D1', 'Bb0', 'A0', 'D1', 'D1', 'C1', 'A0'][i % 8], 3.6, 0.9]], 0, 4, 8) },
    { instrument: 'drum', drum: 'kick', gain: 0.8, layer: 'main', notes: drums(8, { kick: [0, 2], snare: [], hat: [] }).kick },
    { instrument: 'drum', drum: 'hat', gain: 0.4, layer: 'main', notes: drums(8, { kick: [], snare: [], hat: [0.5, 1.5, 2.5, 3.5] }).hat },
    { instrument: 'timpani', gain: 0.5, layer: 'main', notes: repeat((t) => [[t + 3.5, 'D2', 0.4, 0.7]], 0, 4, 8) },
  ],
};

/** ---- Game over ---------------------------------------------------------- */
TRACKS.gameover = {
  id: 'gameover', name: 'Unwound', bpm: 54, timeSig: [4, 4], reverb: 0.55, lengthBeats: 16,
  tracks: [
    { instrument: 'choir', gain: 0.7, layer: 'pad', notes: [...pad('Dm', 0, 7.5, 0.5), ...pad('Ab', 8, 7.5, 0.5)] },
    { instrument: 'celesta', gain: 0.6, layer: 'melody', notes: [[0, 'A4', 2], [2, 'F4', 2], [4, 'D4', 4], [8, 'Eb4', 2], [10, 'C4', 2], [12, 'A3', 4]] },
    { instrument: 'bass', gain: 0.6, layer: 'main', notes: [[0, 'D1', 7.5, 0.8], [8, 'Ab0', 7.5, 0.8]] },
  ],
};

/** ---- Solmere ------------------------------------------------------------
 * The city that tamed an Engine. Reed organ and pizzicato over a mechanical
 * pulse — proud, orderly, and just slightly too regular to be comfortable.
 */
TRACKS.solmere = {
  id: 'solmere', name: 'Drawn, Not Taken',
  bpm: 112, timeSig: [4, 4], reverb: 0.30, lengthBeats: 64,
  tracks: [
    {
      instrument: 'reed', gain: 0.75, pan: -0.12, layer: 'melody',
      notes: [
        [0, 'F4', 1.5], [1.5, 'G4', 0.5], [2, 'A4', 2],
        [4, 'C5', 1.5], [5.5, 'A4', 0.5], [6, 'G4', 2],
        [8, 'F4', 1], [9, 'G4', 1], [10, 'A4', 1], [11, 'C5', 1],
        [12, 'D5', 3], [15, 'C5', 1],
        [16, 'A4', 1.5], [17.5, 'C5', 0.5], [18, 'D5', 2],
        [20, 'F5', 1.5], [21.5, 'E5', 0.5], [22, 'D5', 2],
        [24, 'C5', 1], [25, 'A4', 1], [26, 'G4', 1], [27, 'F4', 1],
        [28, 'F4', 4],
        // second strain: the same tune, one step up — the city expanding
        [32, 'G4', 1.5], [33.5, 'A4', 0.5], [34, 'Bb4', 2],
        [36, 'D5', 1.5], [37.5, 'Bb4', 0.5], [38, 'A4', 2],
        [40, 'G4', 1], [41, 'A4', 1], [42, 'Bb4', 1], [43, 'D5', 1],
        [44, 'E5', 3], [47, 'D5', 1],
        [48, 'C5', 2], [50, 'Bb4', 2],
        [52, 'A4', 2], [54, 'G4', 2],
        [56, 'F4', 1], [57, 'G4', 1], [58, 'A4', 2],
        [60, 'F4', 4],
      ],
    },
    {
      instrument: 'pizz', gain: 0.6, pan: 0.22, layer: 'counter',
      notes: repeat((t) => [
        [t, 'F3', 0.2, 0.7], [t + 0.5, 'C4', 0.2, 0.55],
        [t + 1, 'A3', 0.2, 0.6], [t + 1.5, 'C4', 0.2, 0.5],
        [t + 2, 'F3', 0.2, 0.7], [t + 2.5, 'C4', 0.2, 0.55],
        [t + 3, 'A3', 0.2, 0.6], [t + 3.5, 'E4', 0.2, 0.5],
      ], 0, 4, 16),
    },
    {
      instrument: 'strings', gain: 0.40, pan: 0, layer: 'pad',
      notes: repeat((t, i) => pad(['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Gm', 'C',
        'Gm', 'Eb', 'C', 'Dm', 'Bb', 'F', 'C', 'F'][i % 16], t, 3.7, 0.42, 1), 0, 4, 16),
    },
    { instrument: 'bass', gain: 0.7, layer: 'main', notes: bassLine(
      ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Gm', 'C', 'Gm', 'Eb', 'C', 'Dm', 'Bb', 'F', 'C', 'F'],
      4, [[0, 0, 1.6], [2, 0, 0.8], [3, 7, 0.8]], 0.8) },
    { instrument: 'drum', drum: 'hat', gain: 0.35, layer: 'main', notes: drums(16, { kick: [], snare: [], hat: [0, 1, 2, 3] }).hat },
    { instrument: 'drum', drum: 'kick', gain: 0.55, layer: 'main', notes: drums(16, { kick: [0, 2], snare: [], hat: [] }).kick },
  ],
};

/** ---- The Weeping Wood ---------------------------------------------------
 * Modal and unresolved — the harmony keeps promising a cadence it never makes.
 */
TRACKS.forest = {
  id: 'forest', name: 'Nothing Here Is Lost',
  bpm: 74, timeSig: [4, 4], reverb: 0.44, lengthBeats: 48,
  tracks: [
    {
      instrument: 'flute', gain: 0.72, pan: 0.18, layer: 'melody',
      notes: [
        [0, 'D5', 1.5], [1.5, 'C5', 0.5], [2, 'A4', 2],
        [4, 'G4', 1.5], [5.5, 'A4', 0.5], [6, 'C5', 2],
        [8, 'D5', 1], [9, 'E5', 1], [10, 'D5', 2],
        [12, 'A4', 4],
        [16, 'C5', 1.5], [17.5, 'D5', 0.5], [18, 'E5', 2],
        [20, 'G5', 1.5], [21.5, 'E5', 0.5], [22, 'D5', 2],
        [24, 'C5', 1], [25, 'A4', 1], [26, 'G4', 2],
        [28, 'A4', 4],
        [32, 'D5', 2], [34, 'F5', 2],
        [36, 'E5', 2], [38, 'C5', 2],
        [40, 'D5', 1], [41, 'C5', 1], [42, 'A4', 1], [43, 'G4', 1],
        [44, 'A4', 4],
      ],
    },
    {
      instrument: 'harp', gain: 0.52, pan: -0.24, layer: 'main',
      notes: repeat((t, i) => arp(['Dm', 'Am', 'Gm', 'Dm', 'F', 'C', 'Gm', 'A7',
        'Dm', 'BbM7', 'Am', 'Dm'][i % 12], t, [0, 1, 2, 3, 2, 1], 0.6667, 0.46), 0, 4, 12),
    },
    {
      instrument: 'choir', gain: 0.30, pan: 0.12, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Gm', 'F', 'A7', 'Dm', 'Am'][i % 6], t, 7.4, 0.35), 0, 8, 6),
    },
    { instrument: 'bass', gain: 0.55, layer: 'main', notes: repeat((t, i) => [[t, ['D1', 'A0', 'G1', 'D1', 'F1', 'C1', 'G1', 'A0', 'D1', 'Bb0', 'A0', 'D1'][i % 12], 3.6, 0.75]], 0, 4, 12) },
  ],
};

/** ---- The Cinderspine ---------------------------------------------------- */
TRACKS.mountain = {
  id: 'mountain', name: 'Above the Snowline',
  bpm: 68, timeSig: [4, 4], reverb: 0.48, lengthBeats: 48,
  tracks: [
    {
      instrument: 'choir', gain: 0.62, pan: -0.08, layer: 'pad',
      notes: repeat((t, i) => pad(['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Fm'][i % 6], t, 7.5, 0.5), 0, 8, 6),
    },
    {
      instrument: 'brass', gain: 0.62, pan: 0.16, layer: 'melody',
      notes: [
        [0, 'C4', 3], [3, 'Eb4', 1],
        [4, 'G4', 3], [7, 'F4', 1],
        [8, 'Eb4', 2], [10, 'C4', 2],
        [12, 'D4', 4],
        [16, 'Eb4', 3], [19, 'G4', 1],
        [20, 'Ab4', 3], [23, 'G4', 1],
        [24, 'F4', 2], [26, 'Eb4', 2],
        [28, 'C4', 4],
        [32, 'G4', 2], [34, 'Ab4', 2],
        [36, 'G4', 2], [38, 'F4', 2],
        [40, 'Eb4', 4],
        [44, 'C4', 4],
      ],
    },
    { instrument: 'bass', gain: 0.62, layer: 'main', notes: repeat((t, i) => [[t, ['C1', 'Ab0', 'Eb1', 'Bb0', 'C1', 'F1'][i % 6], 7.4, 0.8]], 0, 8, 6) },
    { instrument: 'timpani', gain: 0.42, layer: 'main', notes: repeat((t, i) => [[t, 'C1', 1.5, 0.55]], 0, 8, 6) },
  ],
};

/** ---- Ashenhall ---------------------------------------------------------- */
TRACKS.ruins = {
  id: 'ruins', name: 'Eight Went Out',
  bpm: 58, timeSig: [3, 4], reverb: 0.52, lengthBeats: 36,
  tracks: [
    {
      instrument: 'celesta', gain: 0.7, pan: 0.14, layer: 'melody',
      notes: [
        [0, 'A4', 2], [2, 'C5', 1],
        [3, 'D5', 2], [5, 'C5', 1],
        [6, 'A4', 3],
        [9, 'G4', 3],
        [12, 'F4', 2], [14, 'G4', 1],
        [15, 'A4', 3],
        [18, 'C5', 2], [20, 'D5', 1],
        [21, 'E5', 3],
        [24, 'D5', 2], [26, 'C5', 1],
        [27, 'A4', 3],
        [30, 'G4', 3],
        [33, 'A4', 3],
      ],
    },
    { instrument: 'choir', gain: 0.42, layer: 'pad', notes: repeat((t, i) => pad(['Dm', 'BbM7', 'F', 'Gm7', 'Dm', 'A7'][i % 6], t, 5.6, 0.42), 0, 6, 6) },
    { instrument: 'harp', gain: 0.36, pan: -0.2, layer: 'main', notes: repeat((t, i) => arp(['Dm', 'BbM7', 'F', 'Gm7', 'Dm', 'A7'][i % 6], t, [0, 2, 3], 1, 0.38, 1), 0, 3, 12) },
    { instrument: 'bass', gain: 0.5, layer: 'main', notes: repeat((t, i) => [[t, ['D1', 'Bb0', 'F1', 'G1', 'D1', 'A0'][i % 6], 5.6, 0.7]], 0, 6, 6) },
  ],
};

/** ---- The Drowned Coast --------------------------------------------------- */
TRACKS.coast = {
  id: 'coast', name: 'She Said Yes',
  bpm: 84, timeSig: [4, 4], reverb: 0.46, lengthBeats: 32,
  tracks: [
    {
      instrument: 'flute', gain: 0.68, pan: 0.2, layer: 'melody',
      notes: [
        [0, 'A4', 1], [1, 'C5', 1], [2, 'D5', 2],
        [4, 'E5', 1.5], [5.5, 'D5', 0.5], [6, 'C5', 2],
        [8, 'A4', 1], [9, 'G4', 1], [10, 'A4', 2],
        [12, 'C5', 4],
        [16, 'D5', 1], [17, 'E5', 1], [18, 'G5', 2],
        [20, 'E5', 1.5], [21.5, 'D5', 0.5], [22, 'C5', 2],
        [24, 'D5', 1], [25, 'C5', 1], [26, 'A4', 1], [27, 'G4', 1],
        [28, 'A4', 4],
      ],
    },
    { instrument: 'harp', gain: 0.55, pan: -0.22, layer: 'main', notes: repeat((t, i) => arp(['Am', 'F', 'C', 'Gm7', 'Am', 'Dm', 'F', 'Am'][i % 8], t, [0, 1, 2, 3, 2, 1, 2, 3], 0.5, 0.45), 0, 4, 8) },
    { instrument: 'strings', gain: 0.38, layer: 'pad', notes: repeat((t, i) => pad(['Am', 'F', 'C', 'Gm7', 'Am', 'Dm', 'F', 'Am'][i % 8], t, 3.7, 0.4, 1), 0, 4, 8) },
    { instrument: 'bass', gain: 0.6, layer: 'main', notes: bassLine(['Am', 'F', 'C', 'Gm7', 'Am', 'Dm', 'F', 'Am'], 4, [[0, 0, 2], [2, 7, 1.6]], 0.75) },
  ],
};

/** ---- Vesna's theme ------------------------------------------------------
 * The motif, alone, on one instrument. Every cast member eventually gets one
 * of these; hers is the first and the plainest.
 */
TRACKS.vesna = {
  id: 'vesna', name: 'What Answered',
  bpm: 66, timeSig: [4, 4], reverb: 0.46, lengthBeats: 32,
  tracks: [
    { instrument: 'flute', gain: 0.85, pan: 0.05, layer: 'melody', notes: motif({ vel: 0.7 }).filter((n) => n[0] < 32) },
    { instrument: 'harp', gain: 0.45, pan: -0.2, layer: 'main', notes: repeat((t, i) => arp(MOTIF_CHORDS[i % 8], t, [0, 1, 2, 3], 1, 0.42, 1), 0, 4, 8) },
    { instrument: 'strings', gain: 0.32, layer: 'pad', notes: repeat((t, i) => pad(MOTIF_CHORDS[i % 8], t, 3.7, 0.34, 1), 0, 4, 8) },
  ],
};

/** ---- Chase / urgency ----------------------------------------------------- */
TRACKS.chase = {
  id: 'chase', name: 'Run',
  bpm: 168, timeSig: [4, 4], reverb: 0.16, lengthBeats: 32,
  tracks: [
    {
      instrument: 'bass', gain: 1.0, layer: 'main',
      notes: repeat((t) => [
        [t, 'D2', 0.22, 1.0], [t + 0.25, 'D2', 0.22, 0.6], [t + 0.5, 'D2', 0.22, 0.8], [t + 0.75, 'D2', 0.22, 0.6],
        [t + 1, 'C2', 0.22, 0.9], [t + 1.25, 'C2', 0.22, 0.6], [t + 1.5, 'Bb1', 0.22, 0.85], [t + 1.75, 'Bb1', 0.22, 0.6],
        [t + 2, 'D2', 0.22, 1.0], [t + 2.25, 'D2', 0.22, 0.6], [t + 2.5, 'F2', 0.22, 0.85], [t + 2.75, 'F2', 0.22, 0.6],
        [t + 3, 'E2', 0.22, 0.9], [t + 3.5, 'C#2', 0.4, 0.9],
      ], 0, 4, 8),
    },
    {
      instrument: 'brass', gain: 0.78, pan: -0.1, layer: 'melody',
      notes: [
        [0, 'D5', 0.5], [0.5, 'F5', 0.5], [1, 'A5', 1], [2, 'G5', 0.5], [2.5, 'F5', 0.5], [3, 'E5', 1],
        [4, 'D5', 0.5], [4.5, 'C5', 0.5], [5, 'Bb4', 1], [6, 'A4', 2],
        [8, 'A4', 0.5], [8.5, 'C5', 0.5], [9, 'D5', 1], [10, 'F5', 1], [11, 'E5', 1],
        [12, 'D5', 4],
        [16, 'F5', 0.5], [16.5, 'A5', 0.5], [17, 'C6', 1], [18, 'Bb5', 0.5], [18.5, 'A5', 0.5], [19, 'G5', 1],
        [20, 'F5', 0.5], [20.5, 'E5', 0.5], [21, 'D5', 1], [22, 'C#5', 2],
        [24, 'D5', 1], [25, 'E5', 1], [26, 'F5', 1], [27, 'A5', 1],
        [28, 'D5', 4],
      ],
    },
    { instrument: 'drum', drum: 'kick', gain: 0.9, layer: 'main', notes: drums(8, { kick: [0, 0.5, 1.5, 2, 3], snare: [], hat: [] }).kick },
    { instrument: 'drum', drum: 'snare', gain: 0.75, layer: 'main', notes: drums(8, { kick: [], snare: [1, 3], hat: [] }).snare },
    { instrument: 'drum', drum: 'hat', gain: 0.5, layer: 'main', notes: drums(8, { kick: [], snare: [], hat: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75] }).hat },
  ],
};

/** ---- Hope / resolution --------------------------------------------------- */
TRACKS.hope = {
  id: 'hope', name: 'Drawn, Not Taken (Reprise)',
  bpm: 80, timeSig: [4, 4], reverb: 0.42, lengthBeats: 32,
  tracks: [
    { instrument: 'strings', gain: 0.85, pan: -0.05, layer: 'melody', notes: motif({ octave: 0, vel: 0.85 }).filter((n) => n[0] < 32) },
    { instrument: 'choir', gain: 0.5, pan: 0.1, layer: 'pad', notes: repeat((t, i) => pad(['Bb', 'F', 'Gm7', 'C', 'Bb', 'Dm', 'Eb', 'F'][i % 8], t, 3.7, 0.5), 0, 4, 8) },
    { instrument: 'harp', gain: 0.48, pan: -0.25, layer: 'main', notes: repeat((t, i) => arp(['Bb', 'F', 'Gm7', 'C', 'Bb', 'Dm', 'Eb', 'F'][i % 8], t, [0, 1, 2, 3, 2, 1], 0.6667, 0.44, 1), 0, 4, 8) },
    { instrument: 'bass', gain: 0.62, layer: 'main', notes: bassLine(['Bb', 'F', 'Gm7', 'C', 'Bb', 'Dm', 'Eb', 'F'], 4, [[0, 0, 2], [2, 7, 1.6]], 0.75) },
    { instrument: 'timpani', gain: 0.35, layer: 'main', notes: repeat((t, i) => (i % 2 === 0 ? [[t, 'Bb1', 0.8, 0.5]] : []), 0, 4, 8) },
  ],
};

/** ---- Ferran, the market city ---------------------------------------------
 * Bb major and busy. Harrowmere's flute theme was one voice in open country;
 * a city is many voices at once, so this is built from three short figures
 * that overlap rather than one long tune — pizzicato traffic underneath,
 * reed hawking a phrase over the top, brass answering from across the square.
 */
TRACKS.town_bazaar = {
  id: 'town_bazaar', name: 'The Ledger and the Lamp',
  bpm: 118, timeSig: [4, 4], reverb: 0.2, lengthBeats: 64,
  tracks: [
    {
      instrument: 'reed', gain: 0.8, pan: 0.2, layer: 'melody',
      notes: [
        [0, 'Bb4', 0.5], [0.5, 'C5', 0.5], [1, 'D5', 1], [2, 'F5', 1], [3, 'D5', 1],
        [4, 'C5', 0.5], [4.5, 'Bb4', 0.5], [5, 'C5', 2], [7, 'D5', 1],
        [8, 'Eb5', 0.5], [8.5, 'D5', 0.5], [9, 'C5', 1], [10, 'Bb4', 1], [11, 'G4', 1],
        [12, 'F4', 3], [15, 'F4', 1],
        [16, 'Bb4', 0.5], [16.5, 'D5', 0.5], [17, 'F5', 1], [18, 'G5', 1], [19, 'F5', 1],
        [20, 'Eb5', 0.5], [20.5, 'D5', 0.5], [21, 'C5', 2], [23, 'Eb5', 1],
        [24, 'D5', 1], [25, 'C5', 1], [26, 'Bb4', 1], [27, 'A4', 1],
        [28, 'Bb4', 4],
        // The second strain drops to the low reed — the same street from the
        // other side of the stalls.
        [32, 'F4', 0.5], [32.5, 'G4', 0.5], [33, 'A4', 1], [34, 'Bb4', 1], [35, 'C5', 1],
        [36, 'D5', 2], [38, 'C5', 1], [39, 'Bb4', 1],
        [40, 'A4', 0.5], [40.5, 'Bb4', 0.5], [41, 'C5', 1], [42, 'A4', 1], [43, 'F4', 1],
        [44, 'G4', 3], [47, 'A4', 1],
        [48, 'Bb4', 0.5], [48.5, 'C5', 0.5], [49, 'D5', 1], [50, 'F5', 1], [51, 'Eb5', 1],
        [52, 'D5', 2], [54, 'C5', 2],
        [56, 'Bb4', 1], [57, 'D5', 1], [58, 'F5', 2],
        [60, 'Bb4', 4],
      ],
    },
    {
      instrument: 'pizz', gain: 0.6, pan: -0.28, layer: 'main',
      notes: repeat((t, i) => {
        const prog = ['Bb', 'Gm', 'Eb', 'F', 'Bb', 'Gm', 'Cm', 'F',
          'Bb', 'Dm', 'Eb', 'F', 'Gm', 'Eb', 'F', 'Bb'];
        return arp(prog[i], t, [0, 2, 1, 2, 3, 2, 1, 2], 0.5, 0.5);
      }, 0, 4, 16),
    },
    {
      instrument: 'brass', gain: 0.4, pan: 0.3, layer: 'pad',
      // Answers only on the fourth bar of each phrase, so it reads as a
      // response rather than a countermelody.
      notes: repeat((t) => [
        [t + 2, 'Bb3', 0.5, 0.6], [t + 2.5, 'D4', 0.5, 0.6], [t + 3, 'F4', 1, 0.65],
      ], 12, 16, 4),
    },
    {
      instrument: 'strings', gain: 0.3, pan: 0.05, layer: 'pad',
      notes: repeat((t, i) => pad(['Bb', 'Gm', 'Eb', 'F'][i % 4], t, 3.7, 0.42), 0, 4, 16),
    },
    { instrument: 'bass', gain: 0.6, layer: 'main', notes: bassLine(['Bb', 'Gm', 'Eb', 'F', 'Bb', 'Gm', 'Cm', 'F', 'Bb', 'Dm', 'Eb', 'F', 'Gm', 'Eb', 'F', 'Bb'], 4, [[0, 0, 1], [1.5, 7, 0.8], [2, 0, 1], [3, 12, 0.8]], 0.72) },
    { instrument: 'drum', drum: 'hat', gain: 0.32, layer: 'main', notes: drums(16, { kick: [], snare: [], hat: [0, 1, 2, 3] }).hat },
  ],
};

/** ---- Cinderspine (the burnt country) --------------------------------------
 * D phrygian — the flattened second is doing all the work here. No drums, no
 * pulse at all: heat has no beat. A reed drone holds the tonic for eight bars
 * at a time while the melody circles a very small number of notes, because
 * the place itself is monotonous and the score should admit that.
 */
TRACKS.desert = {
  id: 'desert', name: 'Where the Ash Settles',
  bpm: 64, timeSig: [4, 4], reverb: 0.5, lengthBeats: 64,
  tracks: [
    {
      instrument: 'reed', gain: 0.72, pan: 0.15, layer: 'melody',
      notes: [
        [0, 'D4', 2], [2, 'Eb4', 1], [3, 'F4', 1],
        [4, 'Eb4', 2], [6, 'D4', 2],
        [8, 'F4', 1], [9, 'G4', 1], [10, 'A4', 2],
        [12, 'G4', 1], [13, 'F4', 1], [14, 'Eb4', 2],
        [16, 'D4', 4],
        [24, 'A4', 2], [26, 'Bb4', 1], [27, 'A4', 1],
        [28, 'G4', 2], [30, 'F4', 2],
        [32, 'Eb4', 1], [33, 'F4', 1], [34, 'D4', 4],
        [40, 'D5', 2], [42, 'C5', 1], [43, 'Bb4', 1],
        [44, 'A4', 2], [46, 'G4', 2],
        [48, 'F4', 2], [50, 'Eb4', 2], [52, 'D4', 6],
        [60, 'A4', 1], [61, 'F4', 1], [62, 'D4', 2],
      ],
    },
    {
      instrument: 'strings', gain: 0.34, pan: -0.1, layer: 'pad',
      // The drone: tonic and fifth only, never the third, so the mode stays
      // ambiguous between major and minor the way heat haze is.
      notes: repeat((t) => [[t, 'D2', 15.5, 0.4], [t, 'A2', 15.5, 0.3]], 0, 16, 4),
    },
    {
      instrument: 'harp', gain: 0.3, pan: -0.3, layer: 'main',
      notes: repeat((t, i) => (i % 2 === 0 ? arp('Dm', t, [0, 1, 2, 1], 1, 0.32) : arp('Bb', t, [0, 1, 2, 1], 1, 0.3)), 0, 8, 8),
    },
    {
      instrument: 'choir', gain: 0.24, pan: 0.25, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Bb', 'Dm', 'Gm'][i % 4], t, 15, 0.3, 1), 0, 16, 4),
    },
  ],
};

/** ---- The frozen north -----------------------------------------------------
 * Eb minor, celesta and choir, nothing in the mid-range at all. The hole in
 * the middle of the arrangement is the point: cold sounds like distance.
 */
TRACKS.snowfield = {
  id: 'snowfield', name: 'The Cold Between',
  bpm: 58, timeSig: [4, 4], reverb: 0.62, lengthBeats: 64,
  tracks: [
    {
      instrument: 'celesta', gain: 0.8, pan: -0.1, layer: 'melody',
      notes: [
        [0, 'Bb4', 2], [2, 'Gb4', 2],
        [4, 'F4', 3], [7, 'Eb4', 1],
        [8, 'Gb4', 2], [10, 'Bb4', 2],
        [12, 'Ab4', 4],
        [16, 'Db5', 2], [18, 'Bb4', 2],
        [20, 'Ab4', 3], [23, 'Gb4', 1],
        [24, 'F4', 2], [26, 'Eb4', 2],
        [28, 'Eb4', 4],
        [32, 'Bb4', 1], [33, 'Db5', 1], [34, 'Eb5', 2],
        [36, 'Db5', 2], [38, 'Bb4', 2],
        [40, 'Gb5', 2], [42, 'F5', 2],
        [44, 'Eb5', 4],
        [48, 'Bb4', 2], [50, 'Ab4', 2],
        [52, 'Gb4', 2], [54, 'F4', 2],
        [56, 'Eb4', 8],
      ],
    },
    {
      instrument: 'choir', gain: 0.46, pan: 0.15, layer: 'pad',
      notes: repeat((t, i) => pad(['Ebm', 'Bbm', 'AbM7', 'Ebm', 'Cdim', 'Bbm', 'Db', 'Ebm'][i % 8], t, 7.6, 0.44, 1), 0, 8, 8),
    },
    {
      instrument: 'harp', gain: 0.35, pan: -0.32, layer: 'main',
      // Falling figures only — everything in this region comes down.
      notes: repeat((t, i) => arp(['Ebm', 'Bbm', 'Db', 'AbM7'][i % 4], t, [7, 6, 5, 4, 3, 2, 1, 0], 1, 0.3), 0, 8, 8),
    },
    {
      instrument: 'strings', gain: 0.26, layer: 'pad',
      notes: repeat((t) => [[t, 'Eb2', 31, 0.34]], 0, 32, 2),
    },
  ],
};

/** ---- The marshes ----------------------------------------------------------
 * 6/8 written as compound bars in 4/4, so the pulse lurches slightly. Low
 * strings and pizzicato: something is walking beside you and not keeping time.
 */
TRACKS.marsh = {
  id: 'marsh', name: 'Fenwater',
  bpm: 92, timeSig: [4, 4], reverb: 0.44, lengthBeats: 48,
  tracks: [
    {
      instrument: 'flute', gain: 0.62, pan: 0.22, layer: 'melody',
      notes: [
        [0, 'D5', 1.5], [1.5, 'C5', 0.5], [2, 'Bb4', 1],
        [3, 'A4', 1.5], [4.5, 'G4', 0.5], [5, 'A4', 1],
        [6, 'F4', 3],
        [12, 'A4', 1.5], [13.5, 'Bb4', 0.5], [14, 'C5', 1],
        [15, 'D5', 1.5], [16.5, 'C5', 0.5], [17, 'Bb4', 1],
        [18, 'A4', 3],
        [24, 'F5', 1.5], [25.5, 'E5', 0.5], [26, 'D5', 1],
        [27, 'C5', 1.5], [28.5, 'Bb4', 0.5], [29, 'A4', 1],
        [30, 'G4', 3],
        [36, 'Bb4', 1], [37, 'A4', 1], [38, 'G4', 1],
        [39, 'F4', 1.5], [40.5, 'E4', 0.5], [41, 'D4', 1],
        [42, 'D4', 4],
      ],
    },
    {
      instrument: 'pizz', gain: 0.5, pan: -0.24, layer: 'main',
      // Three-against-two: the pizzicato is in threes while the bass walks in
      // twos, which is what makes the ground feel unreliable.
      notes: repeat((t, i) => arp(['Dm', 'Gm', 'Bb', 'A7'][i % 4], t, [0, 1, 2, 1, 2, 3], 0.5, 0.46), 0, 3, 16),
    },
    {
      instrument: 'strings', gain: 0.42, pan: 0.05, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Gm', 'Bb', 'A7', 'Dm', 'Bdim', 'Gm', 'A7'][i % 8], t, 5.6, 0.42), 0, 6, 8),
    },
    { instrument: 'bass', gain: 0.55, layer: 'main', notes: bassLine(['Dm', 'Gm', 'Bb', 'A7', 'Dm', 'Bdim', 'Gm', 'A7'], 6, [[0, 0, 2.5], [3, 0, 2.5]], 0.7) },
    { instrument: 'timpani', gain: 0.28, layer: 'main', notes: repeat((t) => [[t, 'D1', 1.2, 0.4]], 0, 12, 4) },
  ],
};

/** ---- Caves ---------------------------------------------------------------
 * Almost nothing: a timpani heartbeat, a drone, and a celesta figure that
 * arrives late and irregularly so the player never quite settles into it.
 */
TRACKS.cave = {
  id: 'cave', name: 'Underlight',
  bpm: 54, timeSig: [4, 4], reverb: 0.68, lengthBeats: 64,
  tracks: [
    {
      instrument: 'celesta', gain: 0.62, pan: 0.2, layer: 'melody',
      notes: [
        [6, 'A4', 1], [7, 'C5', 3],
        [14, 'G4', 1], [15, 'Bb4', 3],
        [22, 'F4', 1], [23, 'A4', 2], [25, 'G4', 2],
        [34, 'C5', 1], [35, 'D5', 3],
        [42, 'Bb4', 1], [43, 'C5', 3],
        [50, 'A4', 2], [52, 'G4', 2], [54, 'F4', 4],
      ],
    },
    {
      instrument: 'strings', gain: 0.34, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Gm', 'Dm', 'Bb'][i % 4], t, 15.4, 0.36), 0, 16, 4),
    },
    {
      instrument: 'choir', gain: 0.2, pan: -0.2, layer: 'pad',
      notes: repeat((t) => [[t, 'D3', 15, 0.3], [t, 'A3', 15, 0.22]], 0, 16, 4),
    },
    // The heartbeat: two hits, then a long gap. Rest is what makes it read as
    // a pulse rather than a rhythm.
    { instrument: 'timpani', gain: 0.4, layer: 'main', notes: repeat((t) => [[t, 'D1', 1, 0.5], [t + 1.2, 'D1', 1, 0.28]], 0, 8, 8) },
  ],
};

/** ---- The airship ----------------------------------------------------------
 * The set piece. G major, 3/4 written across 4/4 bars for a waltz that keeps
 * spilling over the barline, full brass on the tune, strings sweeping under
 * it. This is the one that has to be hummable a week later, so the melody is
 * the motif's interval shape — a rising sixth then a stepwise fall — turned
 * major and given room.
 */
TRACKS.airship = {
  id: 'airship', name: 'Above the Silt Road',
  bpm: 132, timeSig: [3, 4], reverb: 0.36, lengthBeats: 72,
  tracks: [
    {
      instrument: 'brass', gain: 0.86, pan: -0.08, layer: 'melody',
      notes: [
        // A: the rising sixth, answered
        [0, 'D4', 1], [1, 'B4', 2],
        [3, 'A4', 1], [4, 'G4', 1], [5, 'A4', 1],
        [6, 'B4', 2], [8, 'D5', 1],
        [9, 'C5', 3],
        [12, 'D4', 1], [13, 'B4', 2],
        [15, 'A4', 1], [16, 'B4', 1], [17, 'C5', 1],
        [18, 'D5', 2], [20, 'E5', 1],
        [21, 'D5', 3],
        // B: lifted a fourth, and the phrase finally lets go at the top
        [24, 'G4', 1], [25, 'E5', 2],
        [27, 'D5', 1], [28, 'C5', 1], [29, 'D5', 1],
        [30, 'E5', 2], [32, 'G5', 1],
        [33, 'F#5', 3],
        [36, 'G5', 1], [37, 'D5', 1], [38, 'B4', 1],
        [39, 'C5', 1], [40, 'A4', 1], [41, 'F#4', 1],
        [42, 'G4', 6],
        // A', an octave up
        [48, 'D5', 1], [49, 'B5', 2],
        [51, 'A5', 1], [52, 'G5', 1], [53, 'A5', 1],
        [54, 'B5', 2], [56, 'D6', 1],
        [57, 'C6', 3],
        [60, 'B5', 1], [61, 'A5', 1], [62, 'G5', 1],
        [63, 'F#5', 1], [64, 'E5', 1], [65, 'D5', 1],
        [66, 'G5', 6],
      ],
    },
    {
      instrument: 'strings', gain: 0.5, pan: 0.12, layer: 'pad',
      notes: repeat((t, i) => {
        const prog = ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am7', 'D',
          'G', 'B', 'Em', 'C', 'Am7', 'D', 'G', 'D',
          'G', 'Em', 'C', 'D', 'Em', 'C', 'D', 'G'];
        return pad(prog[i % prog.length], t, 2.7, 0.46, 1);
      }, 0, 3, 24),
    },
    {
      instrument: 'harp', gain: 0.44, pan: -0.3, layer: 'main',
      notes: repeat((t, i) => {
        const prog = ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am7', 'D',
          'G', 'B', 'Em', 'C', 'Am7', 'D', 'G', 'D',
          'G', 'Em', 'C', 'D', 'Em', 'C', 'D', 'G'];
        return arp(prog[i % prog.length], t, [0, 4, 5, 6, 5, 4], 0.5, 0.4);
      }, 0, 3, 24),
    },
    {
      // Oom-pah-pah under the waltz, but only on the outer voice, so it lifts
      // rather than plods.
      instrument: 'bass', gain: 0.6, layer: 'main',
      notes: repeat((t, i) => {
        const roots = ['G1', 'E1', 'C1', 'D1', 'G1', 'E1', 'A1', 'D1',
          'G1', 'B1', 'E1', 'C1', 'A1', 'D1', 'G1', 'D1',
          'G1', 'E1', 'C1', 'D1', 'E1', 'C1', 'D1', 'G1'];
        return [[t, roots[i % roots.length], 0.9, 0.78]];
      }, 0, 3, 24),
    },
    { instrument: 'drum', drum: 'kick', gain: 0.6, layer: 'main', notes: repeat((t) => [[t, 'C2', 0.2, 0.75]], 0, 3, 24) },
    { instrument: 'drum', drum: 'hat', gain: 0.34, layer: 'main', notes: repeat((t) => [[t + 1, 'C2', 0.1, 0.5], [t + 2, 'C2', 0.1, 0.5]], 0, 3, 24) },
    { instrument: 'timpani', gain: 0.3, layer: 'main', notes: repeat((t) => [[t, 'G1', 0.8, 0.5]], 0, 12, 6) },
  ],
};

/** ---- Shops ---------------------------------------------------------------
 * Sixteen bars, light, and deliberately unmemorable — a shop theme that
 * demands attention is a shop theme you turn off.
 */
TRACKS.shop = {
  id: 'shop', name: 'Fair Weight',
  bpm: 116, timeSig: [4, 4], reverb: 0.18, lengthBeats: 32,
  tracks: [
    {
      instrument: 'celesta', gain: 0.7, pan: 0.18, layer: 'melody',
      notes: [
        [0, 'C5', 0.5], [0.5, 'E5', 0.5], [1, 'G5', 1], [2, 'E5', 1], [3, 'C5', 1],
        [4, 'D5', 0.5], [4.5, 'F5', 0.5], [5, 'A5', 1], [6, 'G5', 2],
        [8, 'E5', 0.5], [8.5, 'G5', 0.5], [9, 'C6', 1], [10, 'B5', 1], [11, 'A5', 1],
        [12, 'G5', 3], [15, 'F5', 1],
        [16, 'E5', 0.5], [16.5, 'D5', 0.5], [17, 'C5', 1], [18, 'E5', 1], [19, 'G5', 1],
        [20, 'A5', 2], [22, 'G5', 1], [23, 'E5', 1],
        [24, 'F5', 1], [25, 'E5', 1], [26, 'D5', 1], [27, 'B4', 1],
        [28, 'C5', 4],
      ],
    },
    { instrument: 'pizz', gain: 0.5, pan: -0.2, layer: 'main', notes: repeat((t, i) => arp(['C', 'Am', 'F', 'G'][i % 4], t, [0, 2, 1, 2], 0.5, 0.46), 0, 2, 16) },
    { instrument: 'bass', gain: 0.5, layer: 'main', notes: bassLine(['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], 4, [[0, 0, 1.6], [2, 7, 1.6]], 0.66) },
  ],
};

/** ---- Fanfare (level up, key item) -----------------------------------------
 * Four bars. Nothing loops; the audio layer plays it once over whatever was
 * already going.
 */
TRACKS.fanfare = {
  id: 'fanfare', name: 'Well Struck',
  bpm: 128, timeSig: [4, 4], reverb: 0.3, lengthBeats: 12, loop: false,
  tracks: [
    {
      instrument: 'brass', gain: 0.9, pan: 0, layer: 'melody',
      notes: [
        [0, 'F4', 0.25], [0.25, 'F4', 0.25], [0.5, 'F4', 0.5], [1, 'Bb4', 1.5],
        [2.5, 'F4', 0.5], [3, 'D5', 1], [4, 'C5', 0.5], [4.5, 'Bb4', 0.5],
        [5, 'F5', 2],
        [7, 'Eb5', 0.5], [7.5, 'D5', 0.5], [8, 'C5', 1], [9, 'Bb4', 3],
      ],
    },
    {
      instrument: 'strings', gain: 0.5, layer: 'pad',
      notes: [...pad('Bb', 0, 2.4, 0.6), ...pad('F', 2.5, 2.4, 0.6), ...pad('Eb', 5, 1.9, 0.6), ...pad('F', 7, 1.9, 0.6), ...pad('Bb', 9, 3, 0.62)],
    },
    { instrument: 'timpani', gain: 0.5, layer: 'main', notes: [[0, 'Bb1', 0.4, 0.8], [0.5, 'Bb1', 0.4, 0.6], [5, 'F1', 0.6, 0.7], [9, 'Bb1', 1.4, 0.8]] },
  ],
};

/** ---- Espers / magicite ----------------------------------------------------
 * Whole-tone colour and no clear tonic. The espers are older than the key
 * system the rest of the score lives in, so their music refuses to resolve.
 */
TRACKS.esper = {
  id: 'esper', name: 'Older Than the Draw',
  bpm: 70, timeSig: [4, 4], reverb: 0.7, lengthBeats: 32,
  tracks: [
    {
      instrument: 'choir', gain: 0.66, pan: 0, layer: 'pad',
      notes: repeat((t, i) => pad(['Faug', 'Bbaug', 'Cdim', 'Adim'][i % 4], t, 3.6, 0.55, 1), 0, 4, 8),
    },
    {
      instrument: 'celesta', gain: 0.72, pan: 0.25, layer: 'melody',
      notes: [
        [0, 'C5', 1], [1, 'D5', 1], [2, 'E5', 1], [3, 'F#5', 1],
        [4, 'G#5', 2], [6, 'F#5', 2],
        [8, 'E5', 1], [9, 'D5', 1], [10, 'C5', 2],
        [12, 'Bb4', 4],
        [16, 'F5', 1], [17, 'G5', 1], [18, 'A5', 1], [19, 'B5', 1],
        [20, 'C#6', 2], [22, 'B5', 2],
        [24, 'A5', 1], [25, 'G5', 1], [26, 'F5', 2],
        [28, 'D5', 4],
      ],
    },
    { instrument: 'harp', gain: 0.4, pan: -0.3, layer: 'main', notes: repeat((t, i) => arp(['Faug', 'Bbaug', 'Cdim', 'Adim'][i % 4], t, [0, 2, 4, 6, 4, 2], 0.6667, 0.36), 0, 4, 8) },
    { instrument: 'strings', gain: 0.3, layer: 'pad', notes: repeat((t) => [[t, 'F2', 15.5, 0.34]], 0, 16, 2) },
    { instrument: 'timpani', gain: 0.34, layer: 'main', notes: repeat((t) => [[t, 'F1', 1.4, 0.5]], 0, 8, 4) },
  ],
};

/** ---- Vhaine, the last fight ----------------------------------------------
 * The motif, inverted. Every interval that rose in the theme falls here, and
 * the answering phrase never arrives — the B section just restates A a
 * semitone higher and higher until it runs out of room. Choir doubles the
 * brass at the octave so it stops sounding like an orchestra and starts
 * sounding like one very large thing.
 */
TRACKS.boss_final = {
  id: 'boss_final', name: 'Vhaine, Unwound',
  bpm: 156, timeSig: [4, 4], reverb: 0.4, lengthBeats: 64,
  tracks: [
    {
      instrument: 'brass', gain: 0.88, pan: -0.06, layer: 'melody',
      notes: [
        // Inversion of phrase A: A→D up becomes A→E down.
        [0, 'A4', 1], [1, 'E4', 2], [3, 'F4', 1],
        [4, 'G4', 1.5], [5.5, 'A4', 0.5], [6, 'Bb4', 2],
        [8, 'C5', 1], [9, 'Bb4', 1], [10, 'A4', 1.5], [11.5, 'G4', 0.5],
        [12, 'A4', 3], [15, 'A4', 1],
        // …then again a semitone up, and again. It climbs because it cannot
        // resolve, not because it is winning.
        [16, 'Bb4', 1], [17, 'F4', 2], [19, 'Gb4', 1],
        [20, 'Ab4', 1.5], [21.5, 'Bb4', 0.5], [22, 'B4', 2],
        [24, 'Db5', 1], [25, 'B4', 1], [26, 'Bb4', 1.5], [27.5, 'Ab4', 0.5],
        [28, 'Bb4', 3], [31, 'Bb4', 1],
        [32, 'B4', 1], [33, 'F#4', 2], [35, 'G4', 1],
        [36, 'A4', 1.5], [37.5, 'B4', 0.5], [38, 'C5', 2],
        [40, 'D5', 1], [41, 'C5', 1], [42, 'B4', 1.5], [43.5, 'A4', 0.5],
        [44, 'B4', 3], [47, 'B4', 1],
        // The collapse back to D — the only consonance in the whole track.
        [48, 'D5', 2], [50, 'A4', 2], [52, 'F4', 2], [54, 'D4', 2],
        [56, 'A4', 1], [57, 'F5', 1], [58, 'D5', 2],
        [60, 'D4', 4],
      ],
    },
    {
      instrument: 'choir', gain: 0.6, pan: 0.1, layer: 'melody',
      // Doubling an octave down, one beat late — the sound arrives twice.
      notes: [
        [0.25, 'A3', 1], [1.25, 'E3', 2], [3.25, 'F3', 1],
        [16.25, 'Bb3', 1], [17.25, 'F3', 2], [19.25, 'Gb3', 1],
        [32.25, 'B3', 1], [33.25, 'F#3', 2], [35.25, 'G3', 1],
        [48, 'D3', 8], [56, 'A3', 4], [60, 'D3', 4],
      ],
    },
    {
      instrument: 'strings', gain: 0.5, pan: 0.15, layer: 'main',
      notes: repeat((t, i) => {
        const prog = ['Dm', 'Bb', 'Gm', 'A7', 'Ebm', 'Cm', 'Ab', 'Bbaug',
          'Em', 'Cdim', 'Am', 'Bdim', 'Dm', 'Gm', 'A7', 'Dm'];
        return pad(prog[i % prog.length], t, 3.6, 0.5);
      }, 0, 4, 16),
    },
    {
      instrument: 'bass', gain: 0.72, layer: 'main',
      notes: repeat((t, i) => {
        const roots = ['D1', 'Bb0', 'G1', 'A1', 'Eb1', 'C1', 'Ab0', 'Bb0',
          'E1', 'C1', 'A0', 'B0', 'D1', 'G1', 'A1', 'D1'];
        const r = roots[i % roots.length];
        return [[t, r, 0.4, 0.9], [t + 0.5, r, 0.4, 0.6], [t + 1, r, 0.4, 0.8],
          [t + 2, r, 0.4, 0.9], [t + 2.5, r, 0.4, 0.6], [t + 3, r, 0.4, 0.8]];
      }, 0, 4, 16),
    },
    { instrument: 'drum', drum: 'kick', gain: 0.92, layer: 'main', notes: drums(16, { kick: [0, 0.75, 1.5, 2, 3], snare: [], hat: [] }).kick },
    { instrument: 'drum', drum: 'snare', gain: 0.8, layer: 'main', notes: drums(16, { kick: [], snare: [1, 3, 3.5], hat: [] }).snare },
    { instrument: 'timpani', gain: 0.55, layer: 'main', notes: repeat((t) => [[t, 'D1', 0.5, 0.85], [t + 2, 'A1', 0.5, 0.7]], 0, 4, 16) },
  ],
};

/** ---- Loss ----------------------------------------------------------------
 * Strings alone for the first half. When the choir enters at bar nine it is
 * the only new information in the piece, which is why it lands.
 */
TRACKS.sorrow = {
  id: 'sorrow', name: 'What We Set Down',
  bpm: 52, timeSig: [4, 4], reverb: 0.6, lengthBeats: 32, loop: false,
  tracks: [
    {
      instrument: 'strings', gain: 0.82, pan: -0.05, layer: 'melody',
      notes: [
        [0, 'D4', 3], [3, 'C4', 1],
        [4, 'Bb3', 2], [6, 'A3', 2],
        [8, 'G3', 3], [11, 'A3', 1],
        [12, 'F3', 4],
        [16, 'A4', 3], [19, 'G4', 1],
        [20, 'F4', 2], [22, 'E4', 2],
        [24, 'D4', 2], [26, 'C4', 2],
        [28, 'D4', 4],
      ],
    },
    { instrument: 'choir', gain: 0.44, pan: 0.15, layer: 'pad', notes: repeat((t, i) => pad(['Dm', 'Bb', 'Gm', 'A7'][i % 4], t, 3.7, 0.44, 1), 16, 4, 4) },
    { instrument: 'harp', gain: 0.34, pan: -0.28, layer: 'main', notes: repeat((t, i) => arp(['Dm', 'Bb', 'Gm', 'Dm', 'Bb', 'F', 'Gm', 'A7'][i % 8], t, [0, 1, 2, 3], 1, 0.34), 0, 4, 8) },
    { instrument: 'bass', gain: 0.46, layer: 'main', notes: bassLine(['Dm', 'Bb', 'Gm', 'Dm', 'Bb', 'F', 'Gm', 'A7'], 4, [[0, 0, 3.6]], 0.6) },
  ],
};

/** ---- Festival ------------------------------------------------------------
 * Harrowmere's tune in 6/8 with a tabor under it — the same town, drunk. Using
 * the town theme rather than a new one is the joke: you know this melody, and
 * hearing it dance is the reward.
 */
TRACKS.festival = {
  id: 'festival', name: 'The Long Table',
  bpm: 138, timeSig: [6, 8], reverb: 0.26, lengthBeats: 48,
  tracks: [
    {
      instrument: 'reed', gain: 0.82, pan: 0.18, layer: 'melody',
      notes: [
        [0, 'F4', 0.5], [0.5, 'A4', 0.5], [1, 'C5', 1], [2, 'A4', 0.5], [2.5, 'C5', 0.5],
        [3, 'D5', 1], [4, 'C5', 0.5], [4.5, 'A4', 0.5], [5, 'G4', 1],
        [6, 'A4', 0.5], [6.5, 'C5', 0.5], [7, 'F5', 1], [8, 'E5', 0.5], [8.5, 'D5', 0.5],
        [9, 'C5', 3],
        [12, 'C5', 0.5], [12.5, 'D5', 0.5], [13, 'E5', 1], [14, 'F5', 0.5], [14.5, 'E5', 0.5],
        [15, 'D5', 1], [16, 'C5', 0.5], [16.5, 'Bb4', 0.5], [17, 'A4', 1],
        [18, 'Bb4', 0.5], [18.5, 'A4', 0.5], [19, 'G4', 1], [20, 'A4', 0.5], [20.5, 'Bb4', 0.5],
        [21, 'F4', 3],
        [24, 'A4', 0.5], [24.5, 'C5', 0.5], [25, 'F5', 1], [26, 'E5', 0.5], [26.5, 'F5', 0.5],
        [27, 'G5', 1], [28, 'F5', 0.5], [28.5, 'E5', 0.5], [29, 'D5', 1],
        [30, 'C5', 0.5], [30.5, 'D5', 0.5], [31, 'E5', 1], [32, 'F5', 2],
        [36, 'D5', 0.5], [36.5, 'C5', 0.5], [37, 'Bb4', 1], [38, 'A4', 0.5], [38.5, 'G4', 0.5],
        [39, 'F4', 1], [40, 'G4', 0.5], [40.5, 'A4', 0.5], [41, 'Bb4', 1],
        [42, 'A4', 0.5], [42.5, 'G4', 0.5], [43, 'F4', 3],
      ],
    },
    {
      instrument: 'pizz', gain: 0.58, pan: -0.26, layer: 'main',
      notes: repeat((t, i) => arp(['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'C'][i % 8], t, [0, 2, 1, 3, 2, 1], 0.5, 0.5), 0, 3, 16),
    },
    {
      instrument: 'flute', gain: 0.42, pan: 0.3, layer: 'pad',
      // A drone fifth on the downbeat of every other bar, like a bagpipe.
      notes: repeat((t) => [[t, 'F5', 2.8, 0.4], [t, 'C5', 2.8, 0.3]], 0, 6, 8),
    },
    { instrument: 'bass', gain: 0.62, layer: 'main', notes: repeat((t, i) => { const r = ['F1', 'C1', 'D1', 'Bb0', 'F1', 'C1', 'G1', 'C1'][i % 8]; return [[t, r, 0.8, 0.8], [t + 1.5, r, 0.6, 0.55]]; }, 0, 3, 16) },
    { instrument: 'drum', drum: 'kick', gain: 0.72, layer: 'main', notes: repeat((t) => [[t, 'C2', 0.2, 0.85]], 0, 3, 16) },
    { instrument: 'drum', drum: 'snare', gain: 0.5, layer: 'main', notes: repeat((t) => [[t + 1.5, 'C2', 0.15, 0.6], [t + 2.5, 'C2', 0.15, 0.4]], 0, 3, 16) },
  ],
};

/** ---- The ruined overworld -------------------------------------------------
 * The overworld theme with the melody removed. The accompaniment keeps
 * playing the same chords in the same order with nothing on top, which is a
 * more honest way to score a broken world than writing something sadder.
 */
TRACKS.overworld_ruin = {
  id: 'overworld_ruin', name: 'The Same Roads',
  bpm: 84, timeSig: [4, 4], reverb: 0.5, lengthBeats: 64,
  tracks: [
    {
      instrument: 'strings', gain: 0.46, pan: 0.05, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm7', 'A7'][i % 8], t, 7.6, 0.44), 0, 8, 8),
    },
    {
      instrument: 'harp', gain: 0.4, pan: -0.28, layer: 'main',
      notes: repeat((t, i) => arp(['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm7', 'A7'][i % 8], t, [0, 1, 2, 3, 2, 1], 0.6667, 0.36), 0, 4, 16),
    },
    {
      // The motif, but only its first three notes, and only twice in 64 bars —
      // as if the tune is still there and can't be finished.
      instrument: 'flute', gain: 0.5, pan: 0.22, layer: 'melody',
      notes: [[16, 'A4', 1, 0.5], [17, 'D5', 2, 0.5], [19, 'C5', 2, 0.4],
        [48, 'A4', 1, 0.45], [49, 'D5', 3, 0.42]],
    },
    { instrument: 'bass', gain: 0.5, layer: 'main', notes: bassLine(['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm7', 'A7'], 8, [[0, 0, 3.6], [4, 7, 3.6]], 0.62) },
    { instrument: 'timpani', gain: 0.26, layer: 'main', notes: repeat((t) => [[t, 'D1', 1.2, 0.4]], 0, 16, 4) },
  ],
};


/** ---- The Meridian Reach --------------------------------------------------
 * The other continent, and the Imperium's own country. It borrows the
 * Imperium theme's key and its dotted march rhythm, then plays them slower
 * and with the brass an octave lower — the same music the occupier brought
 * with them, heard at home, four hundred years after anybody believed it.
 *
 * The lift into the relative major at bar 33 is the only warmth in the piece
 * and it does not last, which is roughly the argument the Reach is having
 * with itself.
 */
TRACKS.reach = {
  id: 'reach', name: 'The Surveyed Country',
  bpm: 88, timeSig: [4, 4], reverb: 0.44, lengthBeats: 64,
  tracks: [
    {
      instrument: 'brass', gain: 0.7, pan: -0.1, layer: 'melody',
      notes: [
        [0, 'D4', 1.5], [1.5, 'D4', 0.5], [2, 'F4', 1], [3, 'A4', 1],
        [4, 'G4', 1.5], [5.5, 'F4', 0.5], [6, 'E4', 2],
        [8, 'D4', 1.5], [9.5, 'E4', 0.5], [10, 'F4', 1], [11, 'G4', 1],
        [12, 'A4', 3], [15, 'G4', 1],
        [16, 'F4', 1.5], [17.5, 'F4', 0.5], [18, 'A4', 1], [19, 'C5', 1],
        [20, 'Bb4', 1.5], [21.5, 'A4', 0.5], [22, 'G4', 2],
        [24, 'F4', 1], [25, 'E4', 1], [26, 'D4', 1], [27, 'C4', 1],
        [28, 'D4', 4],
        // the lift
        [32, 'A4', 1.5], [33.5, 'A4', 0.5], [34, 'C5', 1], [35, 'D5', 1],
        [36, 'C5', 1.5], [37.5, 'Bb4', 0.5], [38, 'A4', 2],
        [40, 'Bb4', 1], [41, 'C5', 1], [42, 'D5', 2],
        [44, 'C5', 3], [47, 'A4', 1],
        [48, 'G4', 1.5], [49.5, 'F4', 0.5], [50, 'E4', 1], [51, 'D4', 1],
        [52, 'E4', 2], [54, 'F4', 2],
        [56, 'D4', 2], [58, 'A3', 2],
        [60, 'D4', 4],
      ],
    },
    {
      instrument: 'strings', gain: 0.44, pan: 0.1, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Bb', 'Gm', 'A7', 'Dm', 'F', 'Gm', 'A7'][i % 8], t, 3.7, 0.44), 0, 4, 16),
    },
    {
      instrument: 'reed', gain: 0.3, pan: 0.28, layer: 'main',
      // A counter-line that only ever answers, never leads.
      notes: repeat((t) => [[t + 2, 'A3', 1, 0.4], [t + 3, 'D4', 1, 0.4]], 0, 8, 8),
    },
    { instrument: 'bass', gain: 0.62, layer: 'main', notes: bassLine(['Dm', 'Bb', 'Gm', 'A7', 'Dm', 'F', 'Gm', 'A7'], 8, [[0, 0, 1.6], [2, 0, 1.2], [4, 7, 1.6], [6, 0, 1.2]], 0.72) },
    {
      // The dotted march the Imperium theme uses, played at half its
      // conviction — the rhythm is still regulation, the volume is not.
      instrument: 'drum', drum: 'snare', gain: 0.34, layer: 'main',
      notes: repeat((t) => [
        [t, 'C2', 0.12, 0.40], [t + 0.75, 'C2', 0.12, 0.28], [t + 2, 'C2', 0.12, 0.40],
      ], 0, 4, 16),
    },
    { instrument: 'timpani', gain: 0.3, layer: 'main', notes: repeat((t) => [[t, 'D1', 1, 0.5]], 0, 8, 8) },
  ],
};

/** ---- The unsurveyed south -------------------------------------------------
 * No brass at all. The Imperium's instrument does not play down here, because
 * on the Imperium's own maps there is nothing down here. What is left is skin
 * and wood and a voice, which is what the people the surveys missed actually
 * have.
 */
TRACKS.reach_south = {
  id: 'reach_south', name: 'Plenty Down There',
  bpm: 96, timeSig: [4, 4], reverb: 0.4, lengthBeats: 48,
  tracks: [
    {
      instrument: 'reed', gain: 0.74, pan: 0.2, layer: 'melody',
      notes: [
        [0, 'D4', 1], [1, 'Eb4', 0.5], [1.5, 'D4', 0.5], [2, 'C4', 2],
        [4, 'D4', 1], [5, 'F4', 1], [6, 'Eb4', 2],
        [8, 'D4', 0.5], [8.5, 'C4', 0.5], [9, 'Bb3', 1], [10, 'C4', 2],
        [12, 'D4', 4],
        [16, 'F4', 1], [17, 'G4', 0.5], [17.5, 'F4', 0.5], [18, 'Eb4', 2],
        [20, 'F4', 1], [21, 'A4', 1], [22, 'G4', 2],
        [24, 'F4', 0.5], [24.5, 'Eb4', 0.5], [25, 'D4', 1], [26, 'Eb4', 2],
        [28, 'F4', 4],
        [32, 'A4', 1], [33, 'Bb4', 0.5], [33.5, 'A4', 0.5], [34, 'G4', 2],
        [36, 'F4', 1], [37, 'Eb4', 1], [38, 'D4', 2],
        [40, 'C4', 1], [41, 'D4', 1], [42, 'Eb4', 2],
        [44, 'D4', 4],
      ],
    },
    {
      instrument: 'choir', gain: 0.36, pan: -0.15, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Cm', 'Bb', 'Dm'][i % 4], t, 7.5, 0.4), 0, 8, 6),
    },
    { instrument: 'pizz', gain: 0.5, pan: -0.28, layer: 'main', notes: repeat((t, i) => arp(['Dm', 'Cm', 'Bb', 'Dm'][i % 4], t, [0, 2, 1, 2, 3, 2], 0.6667, 0.46), 0, 4, 12) },
    { instrument: 'bass', gain: 0.6, layer: 'main', notes: bassLine(['Dm', 'Cm', 'Bb', 'Dm', 'Dm', 'Cm', 'Bb', 'Dm', 'Dm', 'Cm', 'Bb', 'Dm'], 4, [[0, 0, 2], [2.5, 7, 1.2]], 0.72) },
    { instrument: 'drum', drum: 'kick', gain: 0.72, layer: 'main', notes: drums(12, { kick: [0, 1.5, 2.5], snare: [], hat: [] }).kick },
    { instrument: 'drum', drum: 'snare', gain: 0.44, layer: 'main', notes: drums(12, { kick: [], snare: [1, 3, 3.5], hat: [] }).snare },
    { instrument: 'drum', drum: 'hat', gain: 0.3, layer: 'main', notes: drums(12, { kick: [], snare: [], hat: [0.5, 1.5, 2.5, 3.5] }).hat },
  ],
};

/** ---- Bell towns ----------------------------------------------------------
 * For the later settlements. Built on a peal — six bells in changing order,
 * the way English change-ringing works, so the same six notes keep arriving
 * in a different sequence and never quite resolve into a tune. Underneath it
 * the town gets on with the day.
 */
TRACKS.bell_town = {
  id: 'bell_town', name: 'Six Bells, Changing',
  bpm: 108, timeSig: [4, 4], reverb: 0.32, lengthBeats: 48,
  tracks: [
    {
      instrument: 'celesta', gain: 0.62, pan: 0.15, layer: 'main',
      // Plain hunt on six: each row swaps adjacent pairs, so the peal walks.
      notes: (() => {
        const rows = [
          [0, 1, 2, 3, 4, 5], [1, 0, 3, 2, 5, 4], [1, 3, 0, 5, 2, 4],
          [3, 1, 5, 0, 4, 2], [3, 5, 1, 4, 0, 2], [5, 3, 4, 1, 2, 0],
          [5, 4, 3, 2, 1, 0], [4, 5, 2, 3, 0, 1],
        ];
        const bells = ['F5', 'Eb5', 'D5', 'C5', 'Bb4', 'A4'];
        const out = [];
        rows.forEach((r, ri) => r.forEach((b, bi) => {
          out.push([ri * 6 + bi * 1, bells[b], 0.9, 0.42]);
        }));
        return out;
      })(),
    },
    {
      instrument: 'flute', gain: 0.7, pan: -0.18, layer: 'melody',
      notes: [
        [4, 'F4', 1], [5, 'A4', 1], [6, 'C5', 2],
        [8, 'Bb4', 1], [9, 'A4', 1], [10, 'F4', 2],
        [16, 'C5', 1], [17, 'D5', 1], [18, 'F5', 2],
        [20, 'Eb5', 1], [21, 'D5', 1], [22, 'C5', 2],
        [28, 'A4', 1], [29, 'Bb4', 1], [30, 'C5', 2],
        [36, 'F5', 1], [37, 'Eb5', 1], [38, 'D5', 2],
        [40, 'C5', 2], [42, 'A4', 2],
        [44, 'F4', 4],
      ],
    },
    { instrument: 'strings', gain: 0.34, layer: 'pad', notes: repeat((t, i) => pad(['F', 'Dm', 'Bb', 'C'][i % 4], t, 3.7, 0.4), 0, 4, 12) },
    { instrument: 'bass', gain: 0.52, layer: 'main', notes: bassLine(['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C'], 4, [[0, 0, 1.8], [2, 7, 1.4]], 0.66) },
  ],
};

/** ---- The deep workings ---------------------------------------------------
 * For the late dungeons. Two ostinati a fifth apart that drift out of phase —
 * one in 4, one in 3 — so they only agree every twelve beats, and the walls
 * seem to close and open with them.
 */
TRACKS.deepworks = {
  id: 'deepworks', name: 'Out of Phase',
  bpm: 72, timeSig: [4, 4], reverb: 0.6, lengthBeats: 48,
  tracks: [
    {
      instrument: 'harp', gain: 0.5, pan: -0.3, layer: 'main',
      notes: repeat((t) => arp('Dm', t, [0, 1, 2, 1], 1, 0.4), 0, 4, 12),
    },
    {
      instrument: 'pizz', gain: 0.44, pan: 0.3, layer: 'main',
      notes: repeat((t) => arp('Am', t, [0, 1, 2], 1, 0.36), 0, 3, 16),
    },
    {
      instrument: 'strings', gain: 0.36, layer: 'pad',
      notes: repeat((t, i) => pad(['Dm', 'Dm', 'Bb', 'A7'][i % 4], t, 11.5, 0.38), 0, 12, 4),
    },
    {
      instrument: 'celesta', gain: 0.5, pan: 0.1, layer: 'melody',
      // Arrives only where the two figures line up.
      notes: [[12, 'A4', 2], [14, 'F4', 2], [24, 'D5', 2], [26, 'C5', 2],
        [36, 'Bb4', 2], [38, 'A4', 2], [44, 'D4', 4]],
    },
    { instrument: 'timpani', gain: 0.34, layer: 'main', notes: repeat((t) => [[t, 'D1', 1.2, 0.45]], 0, 12, 4) },
  ],
};

export function trackById(id) {
  return TRACKS[id] || null;
}

export const TRACK_LIST = Object.values(TRACKS);
