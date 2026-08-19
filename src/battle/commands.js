/**
 * The fourteen per-character commands, as data.
 *
 * Every character's second command is the thing that makes them worth bringing:
 * Vesna re-elements her sword, Aurelian builds a device for whatever the fight is
 * doing, Rusk sells his own health by the quarter. The *resolution* of all of them
 * is one data-driven function (`doSpecial` in battle.js) — what differs is the
 * options offered and the numbers on them, and those used to be literals inside the
 * menu code.
 *
 * They live here so that the Godot port reads the same tables rather than a
 * transcription of them, the way the palette, the terrain legend and the status
 * table already do. `tools/to-godot.mjs` exports this; `tools/commands-parity.mjs`
 * holds the port's option lists against these.
 *
 * `gate` is the level step at which the next move in a list unlocks: with `gate: 8`
 * the second move arrives at level 9 and the third at 17, which is why a
 * low-level Bastian has one Blitz and an endgame one has three.
 */

export const COMMANDS = {
  /** Corvin — lifts something off an enemy instead of hitting it. */
  pilfer: { label: 'Pilfer', kind: 'steal' },

  /** Bastian — three escalating strikes, unlocked by level. */
  blitz: {
    label: 'Blitz',
    kind: 'choice',
    gate: 8,
    moves: [
      { label: 'Rising Gale', power: 1.6, element: 'wind' },
      { label: 'Hammerfall', power: 2.1, target: 'all' },
      { label: 'Sunbreaker', power: 2.8, element: 'fire' },
    ],
  },

  /** Idris — the same shape, drawn slower and cutting deeper. */
  iaido: {
    label: 'Iaido',
    kind: 'choice',
    gate: 9,
    moves: [
      { label: 'First Form: Dew', power: 1.5 },
      { label: 'Second Form: Reed', power: 2.0, target: 'all' },
      { label: 'Third Form: Silence', power: 2.6, status: { silence: 60 } },
    ],
  },

  /** Kestrel — reads a creature and writes it down. */
  annotate: { label: 'Annotate', kind: 'scan' },

  /** Wick — a blessing on the whole party, health and regeneration. */
  litany: {
    label: 'Litany',
    kind: 'fixed',
    side: 'party',
    move: { label: 'Litany of the Ninth', heal: 0.35, status: { regen: 100 } },
  },

  /**
   * Osric — a gamble, weighted so the good outcomes are common and the great one
   * is not. The weights are the character: he is not lucky, he is committed.
   */
  wager: {
    label: 'Wager',
    kind: 'roll',
    outcomes: [
      { label: 'Cinders', power: 1.4, element: 'fire', target: 'all', weight: 3 },
      { label: 'Hail', power: 1.6, element: 'ice', target: 'all', weight: 3 },
      { label: 'The Long Odds', power: 3.4, weight: 1.5 },
      { label: 'Nothing', power: 0, weight: 1 },
    ],
  },

  /**
   * Vesna — re-elements her weapon for the rest of the fight.
   *
   * The whole game's affinity table is the puzzle and this is the tool for solving
   * it: against the thing in the Well, which absorbs aether and shrugs off steel,
   * the answer is to stop swinging the biggest number and start swinging the right
   * one.
   */
  attune: {
    label: 'Attune',
    kind: 'attune',
    elements: ['fire', 'ice', 'bolt', 'water', 'wind', 'earth', 'holy', 'shadow'],
  },

  /** Aurelian — one device per turn, each solving a different problem. */
  contraption: {
    label: 'Contraption',
    kind: 'choice',
    moves: [
      { label: 'Scattergun', power: 1.5, target: 'all', desc: 'all foes' },
      { label: 'Ward Frame', heal: 0, status: { protect: 1, shell: 1 }, self: true, desc: 'party guard' },
      { label: 'Grapnel', power: 2.4, desc: 'one foe, hard' },
      { label: 'Smoke Pot', status: { blind: 1 }, target: 'all', desc: 'blind all' },
    ],
  },

  /**
   * Maret — strips a target's buffs *and* its elemental affinities for the rest of
   * the fight. She spent years signing the requisitions that made these things.
   */
  unmake: { label: 'Unmake', kind: 'target', move: { label: 'Unmake', unmake: true } },

  /** Tam — marks one enemy; everyone hits it harder until it dies. */
  quarry: { label: 'Quarry', kind: 'target', move: { label: 'Quarry', quarry: true } },

  /** Ilsabet — paints an enemy, and keeps one spell it knew. */
  render: { label: 'Render', kind: 'target', move: { label: 'Render', render: true } },

  /** Oda — a standing trade, changed as a turn, never for free. */
  stance: {
    label: 'Stance',
    kind: 'stance',
    stances: [
      { label: 'Open Hand', id: null, desc: 'no trade' },
      { label: 'Falling Guard', id: 'protect', desc: 'guard up, slow' },
      { label: 'Running Form', id: 'haste', desc: 'fast, fragile' },
      { label: 'Ninth Form', id: 'critUp', desc: 'strike true' },
    ],
  },

  /**
   * Rusk — spends his own health for damage.
   *
   * Priced off *max* HP, not current. Off current it was a fraction of a shrinking
   * number floored at 1, so at 1 HP "Everything" cost one point and left him on
   * one point: a free power-7.5 strike every turn for ever, four times the
   * strongest spell in the game. Off max HP the trade is the one the command is
   * supposed to be, and the biggest tier is a commitment he cannot make twice.
   */
  overclock: {
    label: 'Overclock',
    kind: 'cost',
    tiers: [
      { label: 'Quarter', cost: 0.25, power: 2.2 },
      { label: 'Half', cost: 0.5, power: 4.0 },
      { label: 'Everything', cost: 0.9, power: 7.5 },
    ],
  },

  /**
   * The Mask — repeats whatever the party did last, free.
   *
   * It never explains itself and has no moves of its own, which is the entire
   * characterisation, and mechanically it makes the Mask worth exactly as much as
   * the rest of the party is worth.
   */
  mimic: { label: 'Mimic', kind: 'mimic' },
};

/**
 * The moves a character can actually pick from a levelled list.
 *
 * The gate is why this is a function rather than the array: a list read straight
 * out of the table offers an endgame strike to a level-2 character.
 */
export function movesFor(command, level) {
  const spec = COMMANDS[command];
  if (!spec?.moves) return [];
  if (!spec.gate) return spec.moves;
  return spec.moves.filter((_, i) => level >= 1 + i * spec.gate);
}
