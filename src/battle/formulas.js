import { rng } from '../engine/rng.js';

/**
 * Combat mathematics.
 *
 * Modelled on the SNES-era formulas — integer-ish, wide variance bands, and
 * defence that divides rather than subtracts — because those are what make a
 * turn-based game feel the way players expect. A modern additive-defence model
 * produces flat, boring numbers where every hit is nearly identical.
 */

export const ELEMENTS = [
  'fire', 'ice', 'bolt', 'water', 'wind', 'earth', 'poison', 'holy', 'shadow', 'aether',
];

/** Affinity multipliers. Absorb turns damage into healing. */
export const AFFINITY = {
  weak: 2.0,
  normal: 1.0,
  resist: 0.5,
  immune: 0.0,
  absorb: -1.0,
};

export const STATUSES = {
  // --- disabling ---------------------------------------------------------
  ko:        { name: 'KO', kind: 'bad', persists: true, blocksTurn: true },
  stone:     { name: 'Petrified', kind: 'bad', persists: true, blocksTurn: true },
  sleep:     { name: 'Asleep', kind: 'bad', blocksTurn: true, wakesOnHit: true, duration: 0 },
  stop:      { name: 'Stopped', kind: 'bad', blocksTurn: true, duration: 12 },
  paralysis: { name: 'Paralysed', kind: 'bad', blocksTurn: true, duration: 8 },
  freeze:    { name: 'Frozen', kind: 'bad', blocksTurn: true, wakesOnHit: true, duration: 10 },
  // --- behavioural -------------------------------------------------------
  confuse:   { name: 'Confused', kind: 'bad', duration: 10, wakesOnHit: true },
  berserk:   { name: 'Berserk', kind: 'bad', duration: 0 },
  charm:     { name: 'Charmed', kind: 'bad', duration: 12 },
  muddle:    { name: 'Muddled', kind: 'bad', duration: 9 },
  // --- damage over time --------------------------------------------------
  poison:    { name: 'Poisoned', kind: 'bad', persists: true, tick: 'poison' },
  venom:     { name: 'Envenomed', kind: 'bad', tick: 'venom', duration: 0 },
  doom:      { name: 'Doomed', kind: 'bad', duration: 30, onExpire: 'kill' },
  seizure:   { name: 'Seizure', kind: 'bad', tick: 'seizure', duration: 0 },
  regen:     { name: 'Regen', kind: 'good', tick: 'regen', duration: 0 },
  // --- stat modifiers ----------------------------------------------------
  silence:   { name: 'Silenced', kind: 'bad', persists: false, duration: 0 },
  blind:     { name: 'Blinded', kind: 'bad', persists: true },
  slow:      { name: 'Slow', kind: 'bad', duration: 0 },
  haste:     { name: 'Haste', kind: 'good', duration: 0 },
  shell:     { name: 'Shell', kind: 'good', duration: 0 },
  protect:   { name: 'Protect', kind: 'good', duration: 0 },
  reflect:   { name: 'Reflect', kind: 'good', duration: 0 },
  safe:      { name: 'Safe', kind: 'good', duration: 0 },
  float:     { name: 'Float', kind: 'good', duration: 0 },
  vanish:    { name: 'Vanish', kind: 'good', duration: 0 },
  zombie:    { name: 'Zombie', kind: 'bad', persists: true },
  imp:       { name: 'Imp', kind: 'bad', persists: true },
  morph:     { name: 'Attuned', kind: 'good', duration: 0 },
  critUp:    { name: 'Focused', kind: 'good', duration: 0 },
};

export const BLOCKING_STATUSES = Object.entries(STATUSES)
  .filter(([, s]) => s.blocksTurn).map(([k]) => k);

// ---------------------------------------------------------------------------
// Core damage
// ---------------------------------------------------------------------------

/**
 * The most defence can ever count for, out of 256. Chosen so that a fully
 * armoured endgame character still takes about a fifth of what an unarmoured
 * one would, rather than the 1 damage the uncapped formula gives.
 */
export const DEFENCE_CAP = 200;

/**
 * Physical damage.
 *
 * damage = (attack power term) × (level/vigour term), then divided by defence.
 * The ±12.5% spread is deliberate: identical hits every turn make combat feel
 * like a spreadsheet.
 */
export function physicalDamage({
  attackerLevel, vigour, weaponPower, defence,
  rows = { attacker: 'front', target: 'front' },
  critical = false, multiplier = 1, ignoreDefence = 0, variance = true,
}) {
  const vig = Math.max(1, vigour);
  const base = weaponPower + Math.floor((vig + attackerLevel) * (vig + attackerLevel) / 256);
  let dmg = Math.floor(base * 2.2);

  if (critical) dmg = Math.floor(dmg * 2);
  dmg = Math.floor(dmg * multiplier);

  // Back row halves damage dealt *and* received.
  if (rows.attacker === 'back') dmg = Math.floor(dmg / 2);

  // Defence divides out of 256, so a defence of 255 would make a character
  // literally invulnerable to physical damage — and stacked endgame armour
  // clears 300 without trying, which is the classic SNES exploit rather than
  // an intentional reward. Capping the *effective* value at 200 keeps a fifth
  // of the damage coming through no matter what is worn, so armour always
  // matters and never finishes the argument.
  const capped = Math.min(DEFENCE_CAP, Math.max(0, defence));
  const effectiveDef = Math.floor(capped * (1 - ignoreDefence));
  dmg = Math.floor((dmg * (255 - effectiveDef)) / 256) + 1;

  if (rows.target === 'back') dmg = Math.floor(dmg / 2);
  if (variance) dmg = applyVariance(dmg);
  return Math.max(1, dmg);
}

/**
 * Magic damage. Rows do not apply — magic reaches the back line, which is the
 * whole reason rows are an interesting choice.
 */
export function magicDamage({
  casterLevel, magic, spellPower, magicDefence,
  multiplier = 1, variance = true,
}) {
  const mag = Math.max(1, magic);
  const base = spellPower * 4 + Math.floor((casterLevel * mag * spellPower) / 32);
  let dmg = Math.floor(base * multiplier);
  // Same cap as physical, for the same reason: resistance should reduce a
  // spell, never nullify it.
  dmg = Math.floor((dmg * (255 - Math.min(DEFENCE_CAP, Math.max(0, magicDefence)))) / 256) + 1;
  if (variance) dmg = applyVariance(dmg);
  return Math.max(1, dmg);
}

/** Healing scales off magic but ignores defence entirely. */
export function healAmount({ casterLevel, magic, spellPower, multiplier = 1 }) {
  const base = spellPower * 4 + Math.floor((casterLevel * Math.max(1, magic) * spellPower) / 28);
  return Math.max(1, applyVariance(Math.floor(base * multiplier)));
}

/** ±12.5%, the classic spread. */
export function applyVariance(value) {
  const roll = 224 + rng.battle.int(33);   // 224..256
  return Math.floor((value * roll) / 256);
}

// ---------------------------------------------------------------------------
// Hit, evade, crit
// ---------------------------------------------------------------------------

export function hitChance({ accuracy = 100, targetEvade = 0, blind = false, vanish = false, alwaysHits = false }) {
  if (alwaysHits) return 1;
  if (vanish) return 0;               // physical attacks pass through
  let acc = accuracy - targetEvade;
  if (blind) acc = Math.floor(acc * 0.45);
  return Math.max(0.02, Math.min(1, acc / 100));
}

export function rollHit(params) {
  return rng.battle.next() < hitChance(params);
}

export function rollCritical({ luck = 16, bonus = 0 }) {
  // ~4% at 16 luck, ~10% at 40. Focused adds a flat bonus.
  return rng.battle.next() < Math.min(0.6, luck / 400 + bonus);
}

/** Status infliction: caster's magic vs target's resistance and immunities. */
export function rollStatus({ chance = 100, targetRes = 0, immune = [], status, level = 1, targetLevel = 1 }) {
  if (immune.includes(status)) return false;
  // Level difference matters: a much higher-level target shrugs things off.
  const levelTerm = Math.max(0.35, 1 - (targetLevel - level) * 0.02);
  const p = (chance / 100) * levelTerm * Math.max(0.05, 1 - targetRes / 220);
  return rng.battle.next() < p;
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

/**
 * Combine a target's elemental affinities into a single multiplier.
 * Weakness and resistance stack multiplicatively; absorb wins outright.
 */
export function elementalMultiplier(element, affinities = {}) {
  // A plain swing has no element, so it looks up `physical` — which eleven
  // creatures across the bestiary already declare and which, until this line
  // existed, did nothing at all. A wisp that reads "physical: resist" should
  // shrug off a sword.
  const key = element || 'physical';
  const a = affinities[key];
  if (a === undefined) return 1;
  return AFFINITY[a] ?? 1;
}

// ---------------------------------------------------------------------------
// ATB
// ---------------------------------------------------------------------------

/**
 * ATB fill per second.
 *
 * Speed contributes strongly but with diminishing returns, so a fast character
 * gets meaningfully more turns without a speed build trivialising the game.
 */
export function atbRate(speed, { haste = false, slow = false, stop = false, battleSpeed = 3 }) {
  if (stop) return 0;
  let rate = (24 + Math.max(1, speed)) / 42;
  if (haste) rate *= 1.5;
  if (slow) rate *= 0.55;
  // Config slider 1..6 — the player's own pacing preference.
  rate *= 0.55 + battleSpeed * 0.15;
  return rate;
}

/** Damage-over-time tick sizes, as a fraction of max HP. */
export const TICK_RATES = {
  poison: 0.045,
  venom: 0.085,
  seizure: 0.06,
  regen: 0.055,
};

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

/**
 * Experience awarded per surviving party member.
 * Divided by the number of *conscious* members, so a smaller party levels
 * faster — the classic incentive to occasionally split up.
 */
export function expShare(totalExp, survivors) {
  return Math.max(1, Math.floor(totalExp / Math.max(1, survivors)));
}

/** Desperation-attack gauge gain: rises sharply as HP falls. */
export function limitGain({ damageTaken, maxHP, currentHP, alliesDown = 0 }) {
  const hpFraction = Math.max(0, currentHP) / Math.max(1, maxHP);
  const dangerBonus = hpFraction < 0.25 ? 2.4 : hpFraction < 0.5 ? 1.5 : 1.0;
  const base = (damageTaken / Math.max(1, maxHP)) * 100 * 0.85;
  return Math.min(100, base * dangerBonus + alliesDown * 6);
}
