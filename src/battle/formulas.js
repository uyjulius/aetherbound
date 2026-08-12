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
 * Where defence stops being worth much, out of 256.
 *
 * Defence divides out of 256, so a raw value of 255 would make a combatant
 * literally invulnerable and a stacked endgame character clears 400 without
 * trying. The obvious answer — clamp at 200 — was worse than it looked: every
 * point past the clamp was *discarded*, so fifty-three creatures in the
 * bestiary carrying 201–232 were all exactly as tough as each other and their
 * authored numbers meant nothing.
 *
 * So it saturates instead. Low defences pass through almost unchanged (28
 * reads as 26), high ones compress smoothly and never reach the ceiling, and
 * no point of armour anywhere is ever thrown away.
 */
export const DEFENCE_SOFT = 200;

/** Kept under the old name because the item and bestiary notes cite it. */
export const DEFENCE_CAP = DEFENCE_SOFT;

export function effectiveDefence(defence, ignore = 0) {
  const d = Math.max(0, defence) * (1 - ignore);
  return DEFENCE_SOFT * (1 - Math.exp(-d / DEFENCE_SOFT));
}

/** What survives a given defence, as a fraction. */
function throughDefence(dmg, defence, ignore = 0) {
  return Math.floor((dmg * (255 - effectiveDefence(defence, ignore))) / 256) + 1;
}

/**
 * How much of the magic stat counts.
 *
 * Both damage formulas take level *and* a stat that itself grows with level.
 * Left unbounded that is cubic growth, which is how magic came to outdamage
 * steel by a hundred to one at level 85. Softening the stat leaves the level
 * term as the only compounding one, and puts both schools on the same curve.
 *
 * It *softens*, it does not clamp. The first version took `min(128, magic)`
 * and that was the defence cap's mistake made twice: every mage in the cast
 * passes 128 around level 33, so from a third of the way into the game
 * Ilsabet, Vesna, Wick and Kestrel all cast for exactly the same number, and
 * every point of magic on a level-up, a rod or a relic bought nothing. A stat
 * that stops counting is a stat that stops being a decision.
 */
const MAGIC_SOFT = 128;
const MAGIC_SLOPE = 0.35;

function effectiveMagic(magic) {
  const m = Math.max(1, magic);
  return m <= MAGIC_SOFT ? m : MAGIC_SOFT + (m - MAGIC_SOFT) * MAGIC_SLOPE;
}

/**
 * Physical damage, for a member of the party.
 *
 * attack power = weapon + vigour × 2, and the level term *multiplies* it. That
 * is the whole point: an earlier version added `(vig + level)² / 256` to the
 * weapon's power instead, so weapon power was never multiplied by anything and
 * a sword at level 85 hit for 305 while a spell hit for 34,000. Six of the
 * fourteen playable characters are built to swing things.
 *
 * The ±12.5% spread is deliberate: identical hits every turn make combat feel
 * like a spreadsheet.
 */
export function physicalDamage({
  attackerLevel, vigour, weaponPower, defence,
  rows = { attacker: 'front', target: 'front' },
  critical = false, multiplier = 1, ignoreDefence = 0, variance = true,
}) {
  const vig = Math.max(1, vigour);
  const power = Math.max(1, weaponPower) + vig * 2;
  const lv = Math.max(1, attackerLevel);
  // Half the attack power as a floor, the rest from the level term. A full
  // `power` floor made early combat far faster than late: at level 12 the
  // level term is only a fifth of the total, so damage barely moved with
  // level and mobs died in one hit while the game's first boss died before it
  // could take a turn.
  let dmg = Math.floor(power * 0.5 + (lv * lv * power) / 768);

  if (critical) dmg = Math.floor(dmg * 2);
  dmg = Math.floor(dmg * multiplier);

  // Back row halves damage dealt *and* received.
  if (rows.attacker === 'back') dmg = Math.floor(dmg / 2);
  dmg = throughDefence(dmg, defence, ignoreDefence);
  if (rows.target === 'back') dmg = Math.floor(dmg / 2);

  if (variance) dmg = applyVariance(dmg);
  return Math.max(1, dmg);
}

/**
 * Damage dealt *by* a creature, physical or magical.
 *
 * Monsters do not share the party's curve, and should not. A party member's
 * output has to climb from killing rats to killing a thing with eighty
 * thousand hit points; a monster's job is to take a predictable bite out of a
 * health bar, which means scaling off the number the bestiary actually
 * authored — `atk` or `mag` — with level as a gentle multiplier rather than a
 * squared one.
 *
 * Running enemies through the party's formula is what made the bestiary's
 * stats decorative: the level term dwarfed them, so a creature written as a
 * heavy hitter hit exactly as hard as one written as a nuisance.
 */
export function monsterDamage({
  level, power, multiplier = 1, defence,
  rows = { attacker: 'front', target: 'front' },
  ignoreDefence = 0, variance = true,
}) {
  const base = Math.max(1, power) * (1 + Math.max(1, level) / 50);
  let dmg = Math.floor(base * multiplier);
  dmg = throughDefence(dmg, defence, ignoreDefence);
  if (rows.target === 'back') dmg = Math.floor(dmg / 2);
  if (variance) dmg = applyVariance(dmg);
  return Math.max(1, dmg);
}

/**
 * How hard a spell hits when a *creature* casts it, relative to its swing.
 *
 * A power-60 spell is one plain attack's worth; Unlight, at 165, is nearly
 * three. Keeps the bestiary's spell choices meaningful without giving enemies
 * the party's damage curve.
 */
export const MONSTER_SPELL_REFERENCE = 60;

/**
 * Magic damage. Rows do not apply — magic reaches the back line, which is the
 * whole reason rows are an interesting choice.
 */
export function magicDamage({
  casterLevel, magic, spellPower, magicDefence,
  multiplier = 1, variance = true,
}) {
  const mag = effectiveMagic(magic);
  // The divisor is set against the old flat cap so a mid-range caster's output
  // is unchanged; what moves is that a dedicated mage is now ahead of a
  // dabbler, and magic gear does something again.
  const base = spellPower * 1.5 + Math.floor((casterLevel * mag * spellPower) / 257);
  let dmg = Math.floor(base * multiplier);
  dmg = throughDefence(dmg, magicDefence);
  if (variance) dmg = applyVariance(dmg);
  return Math.max(1, dmg);
}

/**
 * Healing scales off magic but ignores defence entirely — which is why its
 * divisor is so much larger than the damage one. Without a defence term to
 * pass through, the same numbers would restore several health bars a cast.
 */
export function healAmount({ casterLevel, magic, spellPower, multiplier = 1 }) {
  const mag = effectiveMagic(magic);
  const base = spellPower * 4 + Math.floor((casterLevel * mag * spellPower) / 1360);
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

/**
 * What a purse of spoils is actually worth.
 *
 * The bestiary's gold values are sound *relative to each other* — a brigand
 * is worth more than a rat, and should be — but taken at face value they paid
 * out about twenty times what there is to buy. Every piece of equipment in the
 * game, for all four characters, costs 220,800 gil; ordinary encounters were
 * handing over four and a half million. Money stopped being a decision around
 * level 38, with the entire back half still to play, and the surplus is what
 * let a player carry a hundred X-Potions into every boss fight.
 *
 * One rate here rather than two hundred edits in the bestiary, so the relative
 * worth of every creature is preserved and the economy is a single number
 * somebody can argue with.
 */
export const GOLD_RATE = 0.25;

export function goldShare(totalGold) {
  return Math.max(1, Math.round(totalGold * GOLD_RATE));
}

/** Desperation-attack gauge gain: rises sharply as HP falls. */
export function limitGain({ damageTaken, maxHP, currentHP, alliesDown = 0 }) {
  const hpFraction = Math.max(0, currentHP) / Math.max(1, maxHP);
  const dangerBonus = hpFraction < 0.25 ? 2.4 : hpFraction < 0.5 ? 1.5 : 1.0;
  const base = (damageTaken / Math.max(1, maxHP)) * 100 * 0.85;
  return Math.min(100, base * dangerBonus + alliesDown * 6);
}
