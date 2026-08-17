/**
 * Adversarial balance check.
 *
 *   node tools/balance.mjs            # everything
 *   node tools/balance.mjs --sim      # only the progression simulation
 *   node tools/balance.mjs --data     # only the static data checks
 *   node tools/balance.mjs --quests   # only the quest graph
 *
 * `audit.mjs` asks whether content can be *reached*. This asks whether it can
 * be *played*: does a party that arrives at a region at the level the region
 * was written for actually survive it, does the experience curve deliver that
 * level without grinding, can an enemy's damage be felt at all once armour is
 * on, and does a forty-hour target come out of the encounter maths rather than
 * out of a comment.
 *
 * The method is a real simulation. It uses the game's own formulas module and
 * its own bestiary, plays a party forward from level 1 through every region in
 * order, and reports what actually happens. Anything hand-computed here would
 * be a second, wrong implementation of the combat system, and a checker that
 * models the game approximately reports bugs that do not exist.
 */

import { ENEMIES, ENCOUNTERS } from '../src/data/enemies.js';
import { ITEMS, SHOPS } from '../src/data/items.js';
import { QUESTS } from '../src/data/quests.js';
import { SPELLS } from '../src/data/spells.js';
import { ESPERS } from '../src/data/espers.js';
import { CHARACTERS, CAST_ORDER, statAt, expForLevel, levelForExp } from '../src/data/characters.js';
import {
  physicalDamage, magicDamage, healAmount, hitChance, elementalMultiplier,
  atbRate, expShare, STATUSES, DEFENCE_SOFT, AFFINITY, ELEMENTS, TICK_RATES,
  monsterDamage, MONSTER_SPELL_REFERENCE, effectiveDefence, goldShare, GOLD_RATE,
} from '../src/battle/formulas.js';
import { RNG } from '../src/engine/rng.js';
import { PACING } from '../src/battle/pacing.js';
import { chooseAction } from '../src/battle/ai.js';
import * as legendModule from '../src/world/map.js';
import { dangerNote, dangerOf } from '../src/world/danger.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const only = (flag) => args.includes(flag);
const runAll = !only('--sim') && !only('--data') && !only('--quests') && !only('--reach')
  && !only('--boss');

const findings = [];
function flag(severity, area, title, detail) {
  findings.push({ severity, area, title, detail });
}
const say = (s = '') => console.log(s);
const head = (s) => { say(); say(`\x1b[1m${s}\x1b[0m`); say('─'.repeat(s.length)); };

const rng = new RNG(0x51ba1a);

/**
 * The level the game actually starts you on.
 *
 * `main.js` opens with `party.recruit('vesna', 6)`, and every later recruit
 * arrives at the party's average. Simulating from level 1 measures a game
 * nobody plays — and it flattered the early curve, because levels 1-5 are the
 * cheap ones.
 */
const START_LEVEL = 6;

// ---------------------------------------------------------------------------
// Maps: load them, so region order can come from the world rather than a guess
// ---------------------------------------------------------------------------

const mapDir = path.join(root, 'src/data/maps');
const maps = new Map();
for (const file of fs.readdirSync(mapDir).filter((f) => f.endsWith('.js'))) {
  const mod = await import(path.join(mapDir, file));
  for (const value of Object.values(mod)) {
    if (!value || typeof value !== 'object') continue;
    if (value.terrain && value.id) maps.set(value.id, value);
    else for (const inner of Object.values(value)) {
      if (inner?.terrain && inner.id) maps.set(inner.id, inner);
    }
  }
}

/** Which encounter tables a map can roll, zones included. */
function tablesOf(def) {
  const out = new Set();
  if (def.encounters?.groups) out.add(def.id);
  for (const z of def.encounterZones ?? []) out.add(z.table);
  return out;
}

/**
 * Every way out of a map.
 *
 * Not just `exits`: a building is entered from a prop carrying `enter`, which
 * is how every inn, shop and forge in the game is reached. An earlier version
 * of this walk only followed `exits` and reported fifty-three interiors as
 * unreachable — a checker that models the engine approximately invents bugs,
 * and somebody then goes and "fixes" them.
 */
function doorsOf(def, { byAir = true } = {}) {
  const out = [];
  for (const e of def.exits ?? []) out.push(e.to);
  for (const p of def.props ?? []) {
    if (p.enter) out.push(p.enter);
    if (p.interact?.enter) out.push(p.interact.enter);
  }
  for (const t of def.triggers ?? []) if (t.to) out.push(t.to);
  // `crossing` is the map edge the airship flies off. It is the only genuinely
  // gated door in the game — everything past it needs the Gallowglass — so the
  // walk-in analysis excludes it and the completeness analysis does not.
  if (byAir && def.crossing?.to) out.push(def.crossing.to);
  return out;
}

/** Breadth-first walk of the door graph from the opening village. */
function reachability(start = 'harrowmere', opts = {}) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    const def = maps.get(id);
    if (!def) continue;
    for (const to of doorsOf(def, opts)) {
      if (dist.has(to)) continue;
      dist.set(to, dist.get(id) + 1);
      queue.push(to);
    }
  }
  return dist;
}

/**
 * How hard it is where the player arrives.
 *
 * Defers to the engine's own `dangerOf` rather than reimplementing the lookup.
 * An earlier version did reimplement it and got it wrong: when no zone covers
 * the arrival tile the map falls back to its own inline `encounters` table,
 * which is not in the `ENCOUNTERS` registry, so Ashfall and Kingspyre read as
 * level 0 at the door and the tool reported a 52-level cliff that does not
 * exist — the game warns about both correctly.
 */
function entryDanger(def, spawn = null) {
  return dangerOf(def, spawn);
}


/**
 * How far the player has to walk across the overworld to stand somewhere.
 *
 * The whole world map is one 64×44 field with forty-three doors on it and no
 * flag gating anywhere, so "two exits from the start" is true of nearly
 * everything and says nothing. Walking distance over passable ground is the
 * measure that matches what a player experiences.
 */
function overworldWalk() {
  const ow = maps.get('overworld');
  if (!ow) return null;
  const { LEGEND } = legendModule;
  const H = ow.terrain.length, W = ow.terrain[0].length;
  const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && LEGEND[ow.terrain[y][x]]?.walk;
  const home = (ow.exits ?? []).find((e) => e.to === 'harrowmere');
  if (!home) return null;

  const dist = new Map();
  const key = (x, y) => `${x},${y}`;
  // Start from the tile *next to* the door, since the door tile itself is the
  // transition and may sit on impassable ground.
  const seeds = [[home.at[0], home.at[1]], [home.at[0], home.at[1] - 1], [home.at[0] + 1, home.at[1] - 1]]
    .filter(([x, y]) => walk(x, y));
  const queue = seeds.map(([x, y]) => { dist.set(key(x, y), 0); return [x, y]; });
  while (queue.length) {
    const [x, y] = queue.shift();
    const d = dist.get(key(x, y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!walk(nx, ny) || dist.has(key(nx, ny))) continue;
      dist.set(key(nx, ny), d + 1);
      queue.push([nx, ny]);
    }
  }
  const at = (x, y) => {
    let best = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const v = dist.get(key(x + dx, y + dy));
      if (v !== undefined) best = Math.min(best, v);
    }
    return best;
  };
  return { ow, dist, at, W, H, walk };
}

// A table's own difficulty is the level of what is standing in it.
const tableLevel = new Map();
const tableMaxLevel = new Map();
for (const [name, table] of Object.entries(ENCOUNTERS)) {
  const levels = [];
  let worst = 0;
  for (const g of table.groups ?? []) {
    for (const id of g.enemies) {
      const e = ENEMIES[id];
      if (!e) continue;
      levels.push(e.level);
      worst = Math.max(worst, e.level);
    }
  }
  if (!levels.length) continue;
  tableLevel.set(name, levels.reduce((a, b) => a + b, 0) / levels.length);
  tableMaxLevel.set(name, worst);
}

// ---------------------------------------------------------------------------
// Equipment: what the party can actually be wearing at a point in the game
// ---------------------------------------------------------------------------

const EQUIP_SLOTS = ['weapon', 'head', 'body', 'offhand', 'relic1', 'relic2'];

/** Which item types a character may wear, expanded from their `equip` list. */
function canEquip(charId, item) {
  const c = CHARACTERS[charId];
  const allowed = c.equip ?? [];
  if (item.kind === 'weapon') return allowed.includes(item.type);
  if (item.kind === 'armor' || item.kind === 'armour') {
    if (item.slot === 'head') return allowed.includes('helm') || allowed.includes('hat');
    if (item.slot === 'body') {
      return allowed.includes('heavyArmor') || allowed.includes('lightArmor') || allowed.includes('robe');
    }
    if (item.slot === 'offhand') return allowed.includes('shield');
  }
  if (item.kind === 'relic') return true;
  return false;
}

/**
 * Everything a shop anywhere sells, cheapest first. Gear is gated by money in
 * this game rather than by level, so affordability is the honest model of what
 * a party is wearing — and it makes the gold economy part of the difficulty
 * curve instead of a separate spreadsheet nobody checks.
 */
const purchasable = [];
for (const shop of Object.values(SHOPS)) {
  for (const id of shop.stock ?? []) {
    const item = ITEMS[id];
    if (!item || !item.slot) continue;
    if (!purchasable.some((p) => p.id === id)) purchasable.push(item);
  }
}
purchasable.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

/** A crude but honest score: what this piece is worth to a fighter. */
function gearScore(item) {
  const s = item.stats ?? {};
  return (s.atk ?? 0) * 1.0 + (s.def ?? 0) * 0.8 + (s.mdef ?? 0) * 0.5
    + (s.hp ?? 0) * 0.06 + (s.vig ?? 0) * 1.2 + (s.mag ?? 0) * 1.2
    + (s.sta ?? 0) * 1.0 + (s.spd ?? 0) * 1.0 + (s.res ?? 0) * 0.6;
}

// ---------------------------------------------------------------------------
// A simulated party member — the same stat pipeline `Member` uses
// ---------------------------------------------------------------------------

class SimMember {
  constructor(id, level) {
    this.id = id;
    this.def = CHARACTERS[id];
    this.level = level;
    this.exp = expForLevel(level);
    this.equipment = {};
    this.spells = new Set();
    this.row = 'front';
    this.hp = this.maxHP;
    this.mp = this.maxMP;
  }

  get name() { return this.def.name; }
  get items() { return Object.values(this.equipment).filter(Boolean); }

  stat(s) {
    let v = statAt(this.id, s, this.level);
    for (const it of this.items) v += it.stats?.[s] ?? 0;
    return Math.max(1, Math.round(v));
  }

  get maxHP() {
    let v = statAt(this.id, 'hp', this.level);
    for (const it of this.items) v += it.stats?.hp ?? 0;
    return Math.max(1, Math.round(v));
  }

  get maxMP() {
    let v = statAt(this.id, 'mp', this.level);
    for (const it of this.items) v += it.stats?.mp ?? 0;
    return Math.max(0, Math.round(v));
  }

  // These mirror PartyCombatant's getters exactly.
  get attack() {
    const base = this.equipment.weapon?.stats?.atk ?? 12;
    let bonus = 0;
    for (const it of this.items) bonus += it.stats?.atk ?? 0;
    return base + (bonus - (this.equipment.weapon?.stats?.atk ?? 0));
  }
  get defence() {
    let d = Math.floor(this.stat('sta') * 0.7);
    for (const it of this.items) d += it.stats?.def ?? 0;
    return d;
  }
  get magicDefence() {
    let d = Math.floor(this.stat('res') * 0.8);
    for (const it of this.items) d += it.stats?.mdef ?? 0;
    return d;
  }
  get evade() {
    let e = Math.floor(this.stat('spd') * 0.22);
    for (const it of this.items) e += it.stats?.eva ?? 0;
    return e;
  }
  get affinity() {
    const a = {};
    for (const it of this.items) Object.assign(a, it.resist ?? {});
    return a;
  }

  gainExp(n) {
    this.exp += n;
    const before = this.level;
    this.level = levelForExp(this.exp);
    if (this.level > before) {
      this.hp = Math.min(this.maxHP, this.hp
        + statAt(this.id, 'hp', this.level) - statAt(this.id, 'hp', before));
      this.mp = Math.min(this.maxMP, this.mp
        + statAt(this.id, 'mp', this.level) - statAt(this.id, 'mp', before));
    }
    return this.level - before;
  }
}

class SimEnemy {
  constructor(def, i) {
    this.def = def;
    this.uid = `${def.id}#${i}`;
    this.name = def.name;
    this.level = def.level;
    this.maxHP = def.stats.hp;
    this.hp = def.stats.hp;
    this.mp = def.stats.mp;
    this.aiTurn = 0;
    this.phase = 1;
    this.row = 'front';
  }
  get attack() { return this.def.stats.atk; }
  get defence() { return this.def.stats.def; }
  get magicDefence() { return this.def.stats.mdef; }
  get evade() { return this.def.stats.eva ?? 0; }
  get affinity() { return this.def.affinity ?? {}; }
  stat(s) {
    const map = { vig: 'atk', spd: 'spd', sta: 'def', mag: 'mag', res: 'mdef', lck: 'lck' };
    return this.def.stats[map[s] ?? s] ?? 10;
  }
}

// ---------------------------------------------------------------------------
// The battle simulation
// ---------------------------------------------------------------------------

const DT = 0.1;                     // simulation step, seconds
const HARD_TIMEOUT = 600;           // ten minutes is a loss by any measure
const MENU_DELAY = 1.6;             // a human reading a menu and picking
const ACTION_TIME = 1.1;            // roughly what the animations cost

/**
 * Run one battle. Returns what happened, in the terms a balance question is
 * actually asked in: how long, how close, and did anybody die.
 *
 * The party plays the way most players play — heal when someone is低, otherwise
 * hit the thing in front. Deliberately not optimal: a check that only passes
 * for perfect play tells you nothing about the game most people will meet.
 */
function simulateBattle(party, enemyIds, {
  battleSpeed = 3, healAt = 0.4, useMagic = true, allowHeal = true, items = null,
} = {}) {
  const foes = enemyIds.map((id, i) => ENEMIES[id] ? new SimEnemy(ENEMIES[id], i) : null).filter(Boolean);
  if (!foes.length) return null;

  const heroes = party.map((m) => ({
    m, hp: m.hp, mp: m.mp, maxHP: m.maxHP, maxMP: m.maxMP,
    atb: 0, busy: 0, ko: m.hp <= 0, statuses: new Set(),
  }));
  // Bosses open with a part-filled gauge, as the battle state does, so they
  // always land at least one move.
  for (const f of foes) { f.atb = f.def.boss ? 55 : 0; f.busy = 0; }

  let t = 0;
  let damageTaken = 0;
  let hpFloor = 1;
  const startHP = heroes.reduce((n, h) => n + h.hp, 0);

  const aliveHeroes = () => heroes.filter((h) => !h.ko);
  const aliveFoes = () => foes.filter((f) => f.hp > 0);

  while (t < HARD_TIMEOUT) {
    t += DT;
    if (!aliveFoes().length || !aliveHeroes().length) break;

    for (const h of heroes) {
      if (h.ko) continue;
      if (h.busy > 0) { h.busy -= DT; continue; }
      h.atb = Math.min(100, h.atb + atbRate(h.m.stat('spd'), { battleSpeed }) * DT * 100 * 0.16);
      if (h.atb < 100) continue;
      h.atb = 0;
      h.busy = MENU_DELAY + ACTION_TIME;
      heroAct(h);
    }

    for (const f of foes) {
      if (f.hp <= 0) continue;
      if (f.busy > 0) { f.busy -= DT; continue; }
      f.atb = Math.min(100, f.atb + atbRate(f.stat('spd'), { battleSpeed }) * DT * 100 * 0.16);
      if (f.atb < 100) continue;
      f.atb = 0;
      f.busy = ACTION_TIME;
      f.aiTurn++;
      foeAct(f);
    }
  }

  const survivors = aliveHeroes().length;
  return {
    seconds: t,
    win: !aliveFoes().length && survivors > 0,
    timeout: t >= HARD_TIMEOUT,
    survivors,
    deaths: heroes.length - survivors,
    hpLost: damageTaken,
    hpLostFrac: damageTaken / Math.max(1, startHP),
    lowestHPFrac: hpFloor,
    heroes,
    exp: foes.reduce((n, f) => n + f.def.exp, 0),
    gold: foes.reduce((n, f) => n + f.def.gold, 0),
  };

  // --- the two actors ------------------------------------------------------

  function heroAct(h) {
    // Heal first, on the same rule a player uses: somebody is about to die.
    const hurt = aliveHeroes().filter((x) => x.hp / x.maxHP < healAt)
      .sort((a, b) => a.hp / a.maxHP - b.hp / b.maxHP)[0];
    if (hurt && allowHeal) {
      const heal = bestHeal(h);
      if (heal && h.mp >= heal.mp) {
        h.mp -= heal.mp;
        const amount = healAmount({
          casterLevel: h.m.level, magic: h.m.stat('mag'), spellPower: heal.power,
        });
        hurt.hp = Math.min(hurt.maxHP, hurt.hp + amount);
        return;
      }
      // No spell, or no MP left for it: the bag. For years of this audit the
      // bag did not exist, which measured a party poorer than any party that
      // ever walks into a boss room — and, more to the point, made consumable
      // prices invisible to the one tool whose job is the economy. An item
      // costs the turn, exactly as it does in battle.js.
      if (items) {
        for (const id of ['xpotion', 'hipotion', 'potion']) {
          if (items[id] > 0) {
            items[id]--;
            hurt.hp = Math.min(hurt.maxHP, hurt.hp + ITEMS[id].effect.heal);
            return;
          }
        }
      }
    }

    // A dry caster drinks. 40 MP is the band where every attack spell worth
    // a turn has stopped being castable; below it the mage is a bad fighter
    // with a stick, and no player lets them stay one while tonics are held.
    if (items && h.m.def.innateMagic && h.mp < 40 && items.hitonic > 0) {
      items.hitonic--;
      h.mp = Math.min(h.maxMP, h.mp + ITEMS.hitonic.effect.mp);
      return;
    }

    const target = aliveFoes().sort((a, b) => a.hp - b.hp)[0];
    if (!target) return;

    const spell = useMagic ? bestAttackSpell(h, target) : null;
    if (spell && h.mp >= spell.mp) {
      h.mp -= spell.mp;
      let dmg = magicDamage({
        casterLevel: h.m.level, magic: h.m.stat('mag'), spellPower: spell.power,
        magicDefence: target.magicDefence,
      });
      dmg = Math.round(dmg * Math.max(0, elementalMultiplier(spell.element, target.affinity)));
      target.hp -= dmg;
      return;
    }

    // Plain attack.
    const acc = hitChance({ accuracy: 100 + h.m.stat('lck') * 0.2, targetEvade: target.evade });
    if (rng.next() > acc) return;
    const crit = rng.next() < Math.min(0.6, h.m.stat('lck') / 400);
    let dmg = physicalDamage({
      attackerLevel: h.m.level,
      vigour: h.m.stat('vig'),
      weaponPower: h.m.attack,
      defence: target.defence,
      rows: { attacker: h.m.row, target: 'front' },
      critical: crit,
    });
    const el = h.m.equipment.weapon?.element ?? null;
    dmg = Math.round(dmg * Math.max(0, elementalMultiplier(el, target.affinity)));
    target.hp -= dmg;
  }

  function foeAct(f) {
    const spec = pickAI(f);
    const live = aliveHeroes();
    if (!live.length) return;
    const targets = spec.target === 'all' ? live : [live[rng.int(live.length)]];

    if (spec.kind === 'spell') {
      const spell = SPELLS[spec.spell];
      if (!spell) return;
      // 'special' spells that are damage in different clothes. Halve is half
      // a hero's current HP and Sap is a drain with a power rating — on some
      // scripts they are most of the boss's real output, and skipping them
      // measured The Long Hand as a pushover whose main loop was "do
      // nothing". Statuses stay unmodelled: doom and stop are dice, these
      // two are arithmetic.
      if (spell.kind === 'special' && spell.effect === 'fractionHP') {
        for (const h of targets) hurt(h, Math.floor(h.hp * spell.fraction));
        return;
      }
      if (spell.kind === 'special' && spell.effect === 'drainHP') {
        for (const h of targets) {
          hurt(h, monsterDamage({
            level: f.level, power: f.def.stats.mag, defence: h.m.magicDefence,
            multiplier: spell.power / MONSTER_SPELL_REFERENCE,
          }));
        }
        return;
      }
      if (spell.kind !== 'attack') return;      // buffs/heals do not hurt anybody
      for (const h of targets) {
        let dmg = monsterDamage({
          level: f.level, power: f.def.stats.mag, defence: h.m.magicDefence,
          multiplier: spell.power / MONSTER_SPELL_REFERENCE,
        });
        dmg = Math.round(dmg * Math.max(0, elementalMultiplier(spell.element, h.m.affinity)));
        hurt(h, dmg);
      }
      return;
    }

    for (const h of targets) {
      const acc = hitChance({ accuracy: 106, targetEvade: h.m.evade });
      if (rng.next() > acc) continue;
      let dmg = monsterDamage({
        level: f.level,
        power: f.attack,
        defence: h.m.defence,
        rows: { attacker: 'front', target: h.m.row },
        multiplier: spec.power ?? 1,
      });
      dmg = Math.round(dmg * Math.max(0, elementalMultiplier(spec.element ?? null, h.m.affinity)));
      hurt(h, dmg);
    }
  }

  function hurt(h, dmg) {
    h.hp -= dmg;
    damageTaken += dmg;
    hpFloor = Math.min(hpFloor, Math.max(0, h.hp) / h.maxHP);
    if (h.hp <= 0) { h.hp = 0; h.ko = true; }
  }

  /**
   * Which move a creature reaches for — the engine's own walk, imported.
   *
   * This used to be a hand-copy of `_evaluateAI`, and the copy is exactly why
   * the phase bug had to be found and fixed twice: a simulator that mirrors the
   * game approximately reports on a game nobody plays. Now both call
   * `chooseAction`, so the sim cannot drift from the thing it is measuring.
   *
   * Statuses this model does not carry simply answer false, which is honest —
   * it means a `hasStatus` rule is under-counted here rather than invented.
   */
  function pickAI(f) {
    const decision = chooseAction(f.def.ai, {
      hpFraction: f.hp / f.maxHP,
      aiTurn: f.aiTurn,
      phase: f.phase,
      roll: () => rng.next(),
      allyDown: foes.some((x) => x.hp <= 0),
    });
    f.phase = decision.phase;
    return decision.action;
  }
}

function bestHeal(h) {
  let best = null;
  for (const id of h.m.spells) {
    const s = SPELLS[id];
    if (!s || s.kind !== 'heal' || s.effect === 'fullHeal') continue;
    if (!best || s.power > best.power) best = s;
  }
  return best;
}

function bestAttackSpell(h, target) {
  let best = null, bestDmg = 0;
  for (const id of h.m.spells) {
    const s = SPELLS[id];
    if (!s || s.kind !== 'attack') continue;
    if (h.mp < s.mp) continue;
    const raw = magicDamage({
      casterLevel: h.m.level, magic: h.m.stat('mag'), spellPower: s.power,
      magicDefence: target.magicDefence, variance: false,
    });
    const dmg = raw * Math.max(0, elementalMultiplier(s.element, target.affinity));
    if (dmg > bestDmg) { best = s; bestDmg = dmg; }
  }
  // Only worth the MP if it beats a swing by a real margin.
  const swing = physicalDamage({
    attackerLevel: h.m.level, vigour: h.m.stat('vig'), weaponPower: h.m.attack,
    defence: target.defence, variance: false,
  });
  return bestDmg > swing * 1.15 ? best : null;
}

// ---------------------------------------------------------------------------
// 1. Static data checks — things that are wrong before anybody presses a button
// ---------------------------------------------------------------------------

function dataChecks() {
  head('1. Bestiary data');

  // --- does every point of armour still do something? ----------------------
  //
  // The old hard clamp discarded everything past 200, so fifty-three creatures
  // carrying 201-232 were all exactly as tough as each other. The curve
  // saturates instead, and this checks that: how much separation survives
  // between the toughest thing in the bestiary and the merely tough.
  const defs = Object.values(ENEMIES).map((e) => e.stats.def).sort((a, b) => b - a);
  const top = defs[0], mid = defs[Math.floor(defs.length / 2)];
  const shown = (d) => (255 - effectiveDefence(d)) / 256;
  say(`defence softens above ${DEFENCE_SOFT}: `
    + `the toughest creature (def ${top}) lets ${(shown(top) * 100).toFixed(0)}% through, `
    + `a median one (def ${mid}) ${(shown(mid) * 100).toFixed(0)}%`);
  // The question is whether the *top* of the range still separates. A first
  // version asked whether each creature's defence resolved close to the soft
  // point's, which just finds every creature whose defence is near 200 — a
  // property of the number, not a defect.
  const p90 = defs[Math.floor(defs.length * 0.1)];
  const separation = shown(p90) - shown(top);
  say(`the top decile (def ${p90}) and the toughest (def ${top}) differ by `
    + `${(separation * 100).toFixed(1)} points of damage taken`);
  if (separation < 0.01) {
    flag('major', 'enemy strength', 'The toughest creatures are indistinguishable from each other',
      `Defence ${p90} and defence ${top} resolve to the same damage taken, so the top of the `
      + 'bestiary\'s armour range is decorative.');
  }

  // The party's own armour has to keep mattering too, in both directions.
  const bestArmourFor = (slot) => Object.values(ITEMS)
    .filter((i) => i.slot === slot && (i.stats?.def ?? 0) > 0)
    .sort((a, b) => (b.stats.def ?? 0) - (a.stats.def ?? 0))[0];
  const relicDef = Object.values(ITEMS).filter((i) => i.kind === 'relic' && (i.stats?.def ?? 0) > 0)
    .sort((a, b) => b.stats.def - a.stats.def).slice(0, 2);
  const maxPartyDef = Math.floor(statAt('rusk', 'sta', 60) * 0.7)
    + ['head', 'body', 'offhand'].reduce((n, s2) => n + (bestArmourFor(s2)?.stats.def ?? 0), 0)
    + relicDef.reduce((n, r) => n + r.stats.def, 0);
  say(`best-armoured party defence at level 60: ${maxPartyDef}, `
    + `letting ${(shown(maxPartyDef) * 100).toFixed(0)}% of a hit through `
    + `(unarmoured, ${(shown(0) * 100).toFixed(0)}%)`);
  if (shown(maxPartyDef) < 0.12) {
    flag('minor', 'enemy strength', 'The best armour in the game makes a character near-immune',
      `${(shown(maxPartyDef) * 100).toFixed(0)}% of a physical hit gets through, which is close `
      + 'enough to nothing that late-game physical enemies stop being a threat at all.');
  }

  // --- unknown ids ---------------------------------------------------------
  const badDrop = [], badSteal = [], badSpell = [], badStatus = [], badElement = [], badAffinity = [];
  for (const e of Object.values(ENEMIES)) {
    for (const d of e.drops ?? []) if (!ITEMS[d.id]) badDrop.push(`${e.id}:${d.id}`);
    for (const s of e.steal ?? []) if (!ITEMS[s.id]) badSteal.push(`${e.id}:${s.id}`);
    for (const s of e.immune ?? []) if (!STATUSES[s]) badStatus.push(`${e.id}:${s}`);
    for (const [k, v] of Object.entries(e.affinity ?? {})) {
      if (k !== 'physical' && !ELEMENTS.includes(k)) badElement.push(`${e.id}:${k}`);
      if (!(v in AFFINITY)) badAffinity.push(`${e.id}:${k}=${v}`);
    }
    for (const rule of e.ai ?? []) {
      if (rule.do?.kind === 'spell' && !SPELLS[rule.do.spell]) badSpell.push(`${e.id}:${rule.do.spell}`);
      for (const s of Object.keys(rule.do?.status ?? {})) if (!STATUSES[s]) badStatus.push(`${e.id}:${s}`);
    }
  }
  for (const [label, list] of [['drop', badDrop], ['steal', badSteal], ['spell', badSpell],
    ['status', badStatus], ['element', badElement], ['affinity value', badAffinity]]) {
    if (list.length) {
      flag('major', 'data', `${list.length} unknown ${label} ids in the bestiary`, list.slice(0, 10).join(', '));
    }
  }
  say(`unknown ids: ${badDrop.length + badSteal.length + badSpell.length + badStatus.length
    + badElement.length + badAffinity.length}`);

  // --- AI rules that can never fire ----------------------------------------
  //
  // Getting this right matters more than finding a lot. A first version
  // reported 102 dead rules and nearly all of them were the checker being
  // wrong: it read every `{hpBelow 0.2, phase 3}` sitting above a
  // `{hpBelow 0.5, phase 2}` as dead, when in fact the 50% rule fires first
  // on the way down and the 20% one fires later. HP only falls, so the order
  // that reads backwards is the order that works.

  /** Every status the player has any way of putting on an enemy. */
  const inflictable = new Set();
  for (const s of Object.values(SPELLS)) {
    if (!s.target?.includes('Enem') && s.target !== 'any' && s.target !== 'allAny') continue;
    for (const k of Object.keys(s.status ?? {})) inflictable.add(k);
  }
  for (const it of Object.values(ITEMS)) {
    if (!it.target?.includes('Enem')) continue;
    for (const k of Object.keys(it.effect?.status ?? {})) inflictable.add(k);
  }
  // Character commands and summons reach statuses the spell list does not.
  const battleSrc = fs.readFileSync(path.join(root, 'src/battle/battle.js'), 'utf8');
  for (const s of Object.keys(STATUSES)) {
    if (new RegExp(`status:\\s*\\{\\s*${s}\\b`).test(battleSrc)) inflictable.add(s);
    if (new RegExp(`'${s}All'`).test(battleSrc)) inflictable.add(s);
  }
  for (const e of Object.values(ESPERS)) {
    const eff = e.summon?.effect ?? '';
    for (const s of Object.keys(STATUSES)) if (eff === `${s}All`) inflictable.add(s);
  }

  const dead = [];
  for (const e of Object.values(ENEMIES)) {
    const rules = e.ai ?? [];
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      // A rule after an unconditional one is unreachable.
      if (i > 0 && rules.slice(0, i).some((p) => p.if === 'always' && !p.phase)) {
        dead.push(`${e.id}[${i}] sits below an unconditional rule`);
        continue;
      }
      // `hasStatus` needs somebody to be able to inflict it.
      if (r.if === 'hasStatus') {
        if ((e.immune ?? []).includes(r.status)) {
          dead.push(`${e.id}[${i}] waits for ${r.status}, and is immune to ${r.status}`);
        } else if (!inflictable.has(r.status)) {
          dead.push(`${e.id}[${i}] waits for ${r.status}, which the player cannot inflict on anything`);
        }
      }
      // A phase rule is only dead if an earlier rule with a *higher* phase
      // number fires first and locks it out — which, for HP thresholds, means
      // the higher phase has the looser threshold.
      if (r.phase && r.if === 'hpBelow') {
        const blocker = rules.slice(0, i).find((p) =>
          p.phase && p.phase > r.phase && p.if === 'hpBelow' && p.v >= r.v);
        if (blocker) {
          dead.push(`${e.id}[${i}] phase ${r.phase} at hp<${r.v} is locked out by `
            + `phase ${blocker.phase} at hp<${blocker.v} above it`);
        }
      }
    }
  }
  say(`statuses the player can inflict on an enemy: ${[...inflictable].sort().join(', ')}`);
  say(`AI rules that can never fire: ${dead.length}`);
  if (dead.length) {
    flag('minor', 'battles', `${dead.length} enemy AI rules can never fire`,
      dead.slice(0, 12).join('; ') + (dead.length > 12 ? `; …and ${dead.length - 12} more` : ''));
  }

  // --- mechanics that exist and do nothing ---------------------------------
  //
  // The most expensive kind of bug in a game this size, because it never
  // throws and never looks broken: a spell the player learns, pays MP for and
  // spends a turn on, whose effect no line of code reads. Beguile, Wither and
  // Buoy were all in this state — three spells, and four relics selling
  // immunity to a status that could not do anything to anybody.
  const battleCode = fs.readFileSync(path.join(root, 'src/battle/battle.js'), 'utf8');
  const inflictedBy = new Map();
  for (const sp of Object.values(SPELLS)) {
    for (const k of Object.keys(sp.status ?? {})) {
      if (!inflictedBy.has(k)) inflictedBy.set(k, []);
      inflictedBy.get(k).push(sp.name);
    }
  }
  for (const it of Object.values(ITEMS)) {
    for (const k of Object.keys(it.effect?.status ?? {})) {
      if (!inflictedBy.has(k)) inflictedBy.set(k, []);
      inflictedBy.get(k).push(it.name);
    }
  }
  const inert = [];
  for (const [id, def] of Object.entries(STATUSES)) {
    // A status earns its keep generically if it blocks turns, ticks damage, or
    // kills on expiry — those are read from the table, not by name.
    if (def.blocksTurn || def.tick || def.onExpire) continue;
    if (new RegExp(`['"\`]${id}['"\`]`).test(battleCode)) continue;
    const from = inflictedBy.get(id);
    if (from?.length) inert.push(`${def.name} (from ${[...new Set(from)].join(', ')})`);
  }
  say(`statuses that can be inflicted and are never read: ${inert.length}`);
  if (inert.length) {
    flag('major', 'battles', `${inert.length} statuses can be inflicted and do nothing`,
      'The spell resolves, the icon appears, the MP is spent, and no code anywhere acts on it: '
      + inert.join('; '));
  }

  // The same rot one step downstream: gear sold against a status that cannot
  // land, which is a purchase the player makes for nothing.
  const liveStatus = new Set(Object.entries(STATUSES)
    .filter(([id, d]) => d.blocksTurn || d.tick || d.onExpire
      || new RegExp(`['"\`]${id}['"\`]`).test(battleCode)).map(([id]) => id));
  const hollowGear = [];
  for (const it of Object.values(ITEMS)) {
    const dead = (it.immune ?? []).filter((st) => !liveStatus.has(st));
    if (dead.length && dead.length === (it.immune ?? []).length) hollowGear.push(`${it.name} (${dead.join(', ')})`);
  }
  if (hollowGear.length) {
    flag('minor', 'battles', `${hollowGear.length} items sell immunity only to statuses that do nothing`,
      hollowGear.join('; '));
  }

  // --- enemies whose whole script is one plain attack -----------------------
  const plain = Object.values(ENEMIES).filter((e) => {
    const rules = e.ai ?? [];
    return rules.length <= 1 && (rules[0]?.do?.kind ?? 'attack') === 'attack' && !rules[0]?.do?.name;
  });
  say(`enemies with no behaviour beyond a plain attack: ${plain.length}`);
  if (plain.length > Object.keys(ENEMIES).length * 0.2) {
    flag('minor', 'battles', `${plain.length} of ${Object.keys(ENEMIES).length} enemies only ever swing`,
      'Nothing to read, nothing to counter — these fights resolve identically every time. '
      + plain.slice(0, 8).map((e) => e.name).join(', ') + '…');
  }

  // --- does the cast still differ from itself at the end? -------------------
  //
  // A stat that stops counting is a stat that stops being a decision, and the
  // symptom is that the specialists converge. Four mages casting the same
  // number is the same defect as fifty-three creatures with the same armour.
  const mages = CAST_ORDER.filter((id) => CHARACTERS[id].innateMagic);
  const casts = mages.map((id) => ({
    id, name: CHARACTERS[id].name,
    dmg: magicDamage({
      casterLevel: 85, magic: statAt(id, 'mag', 85), spellPower: 120,
      magicDefence: 150, variance: false,
    }),
  })).sort((a, b) => b.dmg - a.dmg);
  const spread = casts[0].dmg / casts[casts.length - 1].dmg;
  say(`the ${casts.length} casters at level 85: `
    + casts.map((c) => `${c.name} ${c.dmg}`).join(', '));
  say(`spread between best and worst caster: ${((spread - 1) * 100).toFixed(0)}%`);
  if (spread < 1.04) {
    flag('major', 'scaling', 'Every caster in the party casts for the same number',
      `Only ${((spread - 1) * 100).toFixed(0)}% separates the best from the worst at level 85, so `
      + 'the magic stat has stopped counting — which means level-ups, rods and magic relics all '
      + 'stop buying anything, and the mages of the cast are mechanically the same character.');
  }

  // --- healing items that stop mattering -----------------------------------
  head('2. Consumables against the HP curve');
  const potionRows = [];
  for (const lv of [5, 15, 25, 35, 45, 55, 65]) {
    const hp = Math.round(CAST_ORDER.slice(0, 4)
      .reduce((n, id) => n + statAt(id, 'hp', lv), 0) / 4);
    potionRows.push({ lv, hp,
      potion: ITEMS.potion.effect.heal / hp,
      hipotion: ITEMS.hipotion.effect.heal / hp,
      xpotion: ITEMS.xpotion.effect.heal / hp });
  }
  say('level  avg maxHP   Potion   Hi-Potion   X-Potion   (fraction of a bar restored)');
  for (const r of potionRows) {
    say(`  ${String(r.lv).padStart(2)}   ${String(r.hp).padStart(7)}   `
      + `${(r.potion * 100).toFixed(0).padStart(5)}%   ${(r.hipotion * 100).toFixed(0).padStart(7)}%   `
      + `${(r.xpotion * 100).toFixed(0).padStart(7)}%`);
  }
  const endgame = potionRows[potionRows.length - 1];
  if (endgame.xpotion > 1.4) {
    flag('minor', 'scaling', 'X-Potions full-heal the endgame party several times over',
      `At level ${endgame.lv} an X-Potion restores ${(endgame.xpotion * 100).toFixed(0)}% of a `
      + 'character\'s maximum HP for 1200 gil, which makes healing magic and the healer '
      + 'redundant in exactly the fights meant to test them.');
  }
  if (endgame.potion < 0.05) {
    flag('info', 'scaling', 'Potions are worthless by the endgame',
      `${(endgame.potion * 100).toFixed(1)}% of a bar at level ${endgame.lv}. That is normal for the `
      + 'genre, but the shops that still stock them are selling dead weight.');
  }
}

// ---------------------------------------------------------------------------
// 1b. The two damage formulas against each other
// ---------------------------------------------------------------------------

/**
 * Physical and magical damage at the same level, from the same module the
 * game uses. No simulation is involved, so nothing here can be an artefact of
 * how the model plays: it is the formulas' own arithmetic.
 */
function damageScaling() {
  head('2b. Physical against magical, at the tier each is meant for');

  const tiers = [
    { lv: 10, weapon: 'ironsword', spell: 'ember' },
    { lv: 20, weapon: 'guardsabre', spell: 'pyre' },
    { lv: 30, weapon: 'emberbrand', spell: 'pyre' },
    { lv: 40, weapon: 'tidecleaver', spell: 'conflagrate' },
    { lv: 55, weapon: 'aetherglass', spell: 'hollow' },
    { lv: 70, weapon: 'aetherglass', spell: 'sunder' },
    { lv: 85, weapon: 'aetherglass', spell: 'lastword' },
  ].filter((t) => ITEMS[t.weapon] && SPELLS[t.spell]);

  say('        the strongest swing            the strongest spell             ratio   MP');
  const rows = [];
  for (const t of tiers) {
    const w = ITEMS[t.weapon], s = SPELLS[t.spell];
    const vig = statAt('bastian', 'vig', t.lv);
    const mag = statAt('vesna', 'mag', t.lv);
    const mp = statAt('vesna', 'mp', t.lv);
    // A level-matched target: mid-table defence for the level band.
    const peers = Object.values(ENEMIES).filter((e) => Math.abs(e.level - t.lv) <= 3);
    const def = peers.length ? Math.round(peers.reduce((n, e) => n + e.stats.def, 0) / peers.length) : 100;
    const mdef = peers.length ? Math.round(peers.reduce((n, e) => n + e.stats.mdef, 0) / peers.length) : 100;
    const phys = physicalDamage({
      attackerLevel: t.lv, vigour: vig, weaponPower: w.stats.atk, defence: def, variance: false,
    });
    const magd = magicDamage({
      casterLevel: t.lv, magic: mag, spellPower: s.power, magicDefence: mdef, variance: false,
    });
    rows.push({ ...t, phys, magd, ratio: magd / phys, casts: Math.floor(mp / s.mp) });
    say(`  lv${String(t.lv).padStart(2)}  ${w.name.padEnd(13)} ${String(phys).padStart(6)}    `
      + `${s.name.padEnd(13)} ${String(magd).padStart(7)}    ${(magd / phys).toFixed(0).padStart(4)}×   `
      + `${String(Math.floor(mp / s.mp)).padStart(2)} casts`);
  }

  const worst = rows[rows.length - 1];
  if (worst.ratio > 4) {
    flag('major', 'scaling',
      `Magic outdamages physical by ${rows[0].ratio.toFixed(0)}× at level ${rows[0].lv} `
      + `and ${worst.ratio.toFixed(0)}× at level ${worst.lv}`,
      'The two formulas do not scale the same way. magicDamage multiplies level × magic × spell '
      + 'power, so it grows cubically. physicalDamage *adds* its level term:\n'
      + '    base = weaponPower + (vig + level)² / 256\n'
      + 'so weapon power never gets multiplied by anything, and the level term is divided by 256 '
      + 'before it is added. The SNES formula this is modelled on multiplies instead — attack '
      + 'power × level² / 256 — which is what keeps a sword worth swinging at level 80.\n'
      + `As written, every physical class in the cast (Bastian, Idris, Rusk, Oda, Corvin, Tam) is `
      + `dead weight past the midpoint, and a mage with ${worst.casts} casts in the tank clears `
      + 'any fight in the game on their own.');
  }

  // Boss HP against a single spell, which is the fight in one number.
  const bosses = Object.values(ENEMIES).filter((e) => e.boss).sort((a, b) => a.level - b.level);
  // Spells come from espers, not from having the MP for them. Gating only on
  // MP handed a level-12 mage Sunder and reported the game's first boss as
  // dying to one cast of a spell nobody can own for another forty levels.
  const spellTier = (level) => (level >= 60 ? 5 : level >= 44 ? 4 : level >= 28 ? 3 : level >= 14 ? 2 : 1);
  const oneShot = [];
  for (const b of bosses) {
    const mag = statAt('vesna', 'mag', b.level);
    const best = Object.values(SPELLS)
      .filter((s) => s.kind === 'attack' && s.mp <= statAt('vesna', 'mp', b.level)
        && (s.tier ?? 1) <= spellTier(b.level))
      .sort((a, c) => c.power - a.power)[0];
    if (!best) continue;
    const dmg = magicDamage({
      casterLevel: b.level, magic: mag, spellPower: best.power,
      magicDefence: b.stats.mdef, variance: false,
    });
    const casts = b.stats.hp / dmg;
    if (casts <= 4) oneShot.push({ b, best, dmg, casts });
  }
  say();
  say(`${oneShot.length} of ${bosses.length} bosses die to four casts or fewer of one spell`);
  if (oneShot.length) {
    flag('major', 'battles', `${oneShot.length} of ${bosses.length} bosses fall to four casts of one spell`,
      oneShot.slice(0, 8).map((o) => `${o.b.name} (${o.casts.toFixed(1)}× ${o.best.name})`).join(', ')
      + '. Every phase script, elemental affinity and immunity list on these creatures is written '
      + 'for a fight that is over before the second phase can trigger.');
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 1c. The economies: experience and money
// ---------------------------------------------------------------------------

function economy() {
  head('2c. Experience and money per fight');

  const rows = [];
  for (const [name, table] of Object.entries(ENCOUNTERS)) {
    const groups = table.groups ?? [];
    if (!groups.length) continue;
    const W = groups.reduce((n, g) => n + g.weight, 0);
    let exp = 0, gold = 0, lv = 0, count = 0;
    for (const g of groups) {
      const p = g.weight / W;
      for (const id of g.enemies) {
        const e = ENEMIES[id];
        if (!e) continue;
        exp += p * e.exp; gold += p * e.gold * GOLD_RATE; lv += e.level; count++;
      }
    }
    // The party the region is written for. Floored at the level the game
    // actually starts you on — `main.js` recruits Vesna at 6, so nobody is
    // ever standing in the Silt Road at level 3 and asking it for a level.
    const level = Math.max(START_LEVEL, Math.round(lv / count));
    const each = exp / 4;                                  // a full party of four
    const need = expForLevel(level + 1) - expForLevel(level);
    rows.push({ name, level, exp, each, gold, perLevel: need / each });
  }
  rows.sort((a, b) => a.level - b.level);

  say('table                    lv   exp each   fights per level   gil/fight');
  for (const r of rows) {
    const colour = r.perLevel > 25 ? '\x1b[31m' : r.perLevel < 6 ? '\x1b[33m' : '';
    say(`${colour}${r.name.padEnd(24)} ${String(r.level).padStart(3)} `
      + `${r.each.toFixed(0).padStart(9)} ${r.perLevel.toFixed(0).padStart(18)} `
      + `${r.gold.toFixed(0).padStart(11)}\x1b[0m`);
  }

  const early = rows.filter((r) => r.level <= 10);
  const late = rows.filter((r) => r.level >= 60);
  const earlyAvg = early.reduce((n, r) => n + r.perLevel, 0) / Math.max(1, early.length);
  const lateAvg = late.reduce((n, r) => n + r.perLevel, 0) / Math.max(1, late.length);
  say();
  say(`opening regions: ${earlyAvg.toFixed(0)} fights per level   `
    + `endgame regions: ${lateAvg.toFixed(0)} fights per level`);

  // The number a player actually feels: how many fights from the level the
  // game starts them on to a level where the mid-game is survivable.
  let toTwenty = 0;
  for (let lv = START_LEVEL; lv < 20; lv++) {
    const need = expForLevel(lv + 1) - expForLevel(lv);
    // The best-paying region the party could reasonably be standing in — a
    // player grinds where the experience is, so assuming otherwise would
    // inflate the number.
    const open = rows.filter((r) => r.level <= lv + 2);
    const best = open.sort((a, b) => b.exp - a.exp)[0] ?? rows[0];
    toTwenty += Math.ceil(need / (best.exp / 3));           // a party of three, generously
  }
  say(`from the level the game starts you on (${START_LEVEL}) to level 20: `
    + `${toTwenty} random battles, staying in level-appropriate regions the whole way`);

  if (earlyAvg > 20) {
    flag('major', 'scaling', `The opening regions need ${earlyAvg.toFixed(0)} random battles per level`,
      `The game starts the party at level ${START_LEVEL}. Getting from there to level 20 — still `
      + `the first third of the map — is ${toTwenty} random battles even with a party of three `
      + '(a full party of four is worse, since experience is divided among the conscious). The '
      + 'genre this is modelled on gives a level every three to six fights at that stage.\n'
      + `The cause is that expForLevel grows as (level-1)^2.42 while the encounter tables' payouts `
      + `grow far more slowly. It flattens to ${lateAvg.toFixed(0)} fights per level by the `
      + 'endgame, so the curve is at its steepest exactly where a player is still deciding whether '
      + 'to keep going — the wrong way round.');
  }

  // Money: what is there to spend it on, and when does that run out?
  const priced = Object.values(ITEMS).filter((i) => (i.price ?? 0) > 0 && i.slot);
  const dearest = [...priced].sort((a, b) => b.price - a.price);
  // A full kit for four characters: the four costliest pieces per slot.
  const kit = ['weapon', 'head', 'body', 'offhand'].map((slot) =>
    [...priced].filter((i) => i.slot === slot).sort((a, b) => b.price - a.price)[0]?.price ?? 0);
  const fullKit = kit.reduce((n, p) => n + p, 0) * 4;
  let cumulative = 0, saturatedAt = null;
  for (const r of rows) {
    cumulative += r.gold * 30;                             // thirty fights a region
    if (!saturatedAt && cumulative > fullKit) saturatedAt = r;
  }
  say(`the best gear in the game for all four characters costs ${fullKit.toLocaleString()} gil`);
  say(`thirty fights per region earns ${Math.round(cumulative).toLocaleString()} gil across the campaign`);
  if (saturatedAt) {
    say(`that total is passed at ${saturatedAt.name} (level ${saturatedAt.level})`);
    if (saturatedAt.level < 45) {
      flag('major', 'scaling',
        `Money stops mattering around level ${saturatedAt.level}, with the whole back half to go`,
        `Ordinary encounters pay out ${Math.round(cumulative).toLocaleString()} gil over a campaign `
        + `whose most expensive purchase is ${dearest[0].name} at ${dearest[0].price.toLocaleString()}. `
        + 'After that point every chest of gold, every gil drop and every shop is decoration, and '
        + `the ${Math.round(cumulative / fullKit)}× surplus also means X-Potions can be bought by `
        + 'the hundred — which is what actually removes the difficulty from the endgame.');
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 2. Reachability against difficulty — can you walk somewhere that kills you?
// ---------------------------------------------------------------------------

function reachChecks() {
  head('3. Where you can walk versus what lives there');
  const dist = reachability();
  const rows = [];
  for (const [id, def] of maps) {
    const d = dist.get(id);
    if (d === undefined) continue;
    for (const t of tablesOf(def)) {
      const lv = tableLevel.get(t);
      if (lv === undefined) continue;
      rows.push({ map: id, table: t, doors: d, level: lv, worst: tableMaxLevel.get(t) });
    }
  }
  rows.sort((a, b) => a.doors - b.doors || a.level - b.level);

  const onFoot = reachability('harrowmere', { byAir: false });
  const unreachable = [...maps.keys()].filter((id) => !dist.has(id));
  say(`${dist.size} of ${maps.size} maps reachable from Harrowmere; `
    + `${onFoot.size} of those without the airship`);
  if (unreachable.length) {
    flag('major', 'world', `${unreachable.length} maps have no path from the opening village`,
      'No exit, door, trigger or airship crossing leads to them, so they are only enterable if an '
      + `event teleports the party in: ${unreachable.slice(0, 14).join(', ')}`
      + `${unreachable.length > 14 ? '…' : ''}`);
  }

  // How far a level-1 party has to walk on the world map before it is standing
  // somewhere that will kill it. This is the number that matters in an open
  // world: no exit anywhere in the game is gated on a story flag, so terrain
  // and distance are the only things holding the player back.
  const world = overworldWalk();
  if (world) {
    const zoneRows = [];
    for (const z of world.ow.encounterZones ?? []) {
      const lv = tableLevel.get(z.table);
      if (lv === undefined) continue;
      const [zx, zy, zw, zh] = z.rect;
      let nearest = Infinity;
      for (let y = zy; y < zy + zh; y++) {
        for (let x = zx; x < zx + zw; x++) {
          if (!world.walk(x, y)) continue;
          nearest = Math.min(nearest, world.at(x, y));
        }
      }
      zoneRows.push({ table: z.table, level: lv, worst: tableMaxLevel.get(z.table), steps: nearest });
    }
    zoneRows.sort((a, b) => a.steps - b.steps);
    say();
    say('overworld zone            mean lv   worst   steps from the Harrowmere gate');
    for (const z of zoneRows) {
      say(`${z.table.padEnd(24)} ${z.level.toFixed(0).padStart(8)} ${String(z.worst).padStart(7)} `
        + `${(Number.isFinite(z.steps) ? String(z.steps) : 'unreachable').padStart(11)}`);
    }

    // Towns, which is where a wandering player is actually heading. What
    // matters is what is standing at the door, not what is at the far end of
    // the map behind it.
    const townRows = [];
    for (const e of world.ow.exits ?? []) {
      const def = maps.get(e.to);
      if (!def) continue;
      const steps = world.at(e.at[0], e.at[1]);
      let deepest = 0;
      for (const t of tablesOf(def)) deepest = Math.max(deepest, tableLevel.get(t) ?? 0);
      if (!deepest) continue;
      townRows.push({ to: e.to, steps, entry: entryDanger(def, e.spawn), deepest });
    }
    townRows.sort((a, b) => a.steps - b.steps);
    say();
    say('door                 steps   at the door   deepest inside');
    for (const t of townRows.slice(0, 10)) {
      say(`  ${t.to.padEnd(18)} ${String(t.steps).padStart(4)}   `
        + `${(t.entry ? `lv ${t.entry.toFixed(0)}` : '—').padStart(11)}   ${`lv ${t.deepest.toFixed(0)}`.padStart(14)}`);
    }

    // These doors are close and lethal, and that is fine in an open world —
    // what was not fine was the silence. Every one of them must now be covered
    // by a signpost warning, so the check is that the warning fires, not that
    // the door is safe.
    const nearDeadly = townRows.filter((t) => t.steps <= 25 && t.entry >= 25);
    const unwarned = nearDeadly.filter((t) =>
      !dangerNote(t.entry, START_LEVEL));
    say();
    say(`${nearDeadly.length} doors within 25 steps lead somewhere written for level 25+; `
      + `${nearDeadly.length - unwarned.length} of them warn a starting party`);
    for (const t of nearDeadly) {
      const note = dangerNote(t.entry, START_LEVEL);
      say(`  ${t.to.padEnd(16)} ${String(t.steps).padStart(3)} steps  lv ${t.entry.toFixed(0).padStart(2)}  `
        + `${note ? `"${note.text}"` : '\x1b[31mNO WARNING\x1b[0m'}`);
    }
    if (unwarned.length) {
      flag('major', 'scaling',
        `${unwarned.length} doors near the start are lethal and say nothing`,
        unwarned.map((t) => `${t.to} (${t.steps} steps, lv${t.entry.toFixed(0)})`).join(', ')
        + '. No exit in the game is gated on a story flag — that is deliberate, it is an open '
        + 'world — so the signpost is the only thing standing between a starting party and a '
        + 'region written forty levels above them.');
    }
    const deepJump = townRows.filter((t) => t.deepest - t.entry >= 35);
    if (deepJump.length) {
      flag('minor', 'scaling', `${deepJump.length} maps climb 35+ levels between the entrance and the far end`,
        deepJump.map((t) => `${t.to} lv${t.entry.toFixed(0)}→${t.deepest.toFixed(0)}`).join(', ')
        + '. The gradient inside one map is steeper than the gradient across the whole world, so '
        + 'the player has no way to judge how deep is too deep.');
    }

    // Difficulty should rise with distance. Measure it on the world map, where
    // the player can actually feel it.
    const n = zoneRows.filter((z) => Number.isFinite(z.steps)).length;
    if (n > 2) {
      const fin = zoneRows.filter((z) => Number.isFinite(z.steps));
      const mx = fin.reduce((a, z) => a + z.steps, 0) / n;
      const my = fin.reduce((a, z) => a + z.level, 0) / n;
      let cov = 0, vx = 0, vy = 0;
      for (const z of fin) {
        cov += (z.steps - mx) * (z.level - my);
        vx += (z.steps - mx) ** 2;
        vy += (z.level - my) ** 2;
      }
      const corr = cov / Math.sqrt(vx * vy);
      say();
      say(`correlation between walking distance and overworld enemy level: ${corr.toFixed(2)}`);
      if (corr < 0.35) {
        flag('major', 'scaling',
          `Walking further from the start does not make the overworld harder (r=${corr.toFixed(2)})`,
          'The world map is the one place the player reads difficulty as geography. If the gradient '
          + 'is not there, the only feedback that they have wandered too far is dying.');
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3. The progression simulation
// ---------------------------------------------------------------------------

function progression() {
  head(`4. Playing it forward from level ${START_LEVEL}`);

  // Regions in the order the levels say they were written for.
  const order = [...tableLevel.entries()]
    .filter(([name]) => (ENCOUNTERS[name].groups ?? []).length)
    .sort((a, b) => a[1] - b[1]);

  // The opening four, and the espers they would plausibly be carrying.
  const party = ['vesna', 'corvin', 'aurelian', 'wick'].map((id) => new SimMember(id, START_LEVEL));
  for (const m of party) {
    if (m.def.innateMagic) { m.spells.add('ember'); m.spells.add('mend'); }
  }
  let gold = 500;
  let seconds = 0;
  let battles = 0;

  const rows = [];
  for (const [table, meanLevel] of order) {
    const def = ENCOUNTERS[table];
    const groups = def.groups ?? [];
    const totalWeight = groups.reduce((n, g) => n + g.weight, 0);

    // Shop between regions: buy the best each character can wear and afford.
    // Money is the only gate on gear in this game, so this is what a player
    // arrives in — not the best in the game, and not nothing.
    for (const m of party) {
      for (const slot of EQUIP_SLOTS) {
        const wearable = purchasable.filter((it) => {
          if (it.slot === 'relic1' || it.slot === 'relic2') return false;
          const target = it.kind === 'relic' ? ['relic1', 'relic2'] : [it.slot];
          return target.includes(slot) && canEquip(m.id, it);
        });
        const have = m.equipment[slot];
        const best = wearable
          .filter((it) => it.price <= gold * 0.45 && gearScore(it) > gearScore(have ?? { stats: {} }))
          .sort((a, b) => gearScore(b) - gearScore(a))[0];
        if (best) { gold -= best.price; m.equipment[slot] = best; }
      }
    }
    // Spells come from espers; approximate the player having kept up by
    // granting tiers as the levels that teach them come into range.
    const avg = party.reduce((n, m) => n + m.level, 0) / party.length;
    for (const m of party) {
      if (!m.def.innateMagic) continue;
      if (avg >= 10) { m.spells.add('pyre'); m.spells.add('mendra'); }
      if (avg >= 24) { m.spells.add('hollow'); }
      if (avg >= 34) { m.spells.add('conflagrate'); m.spells.add('mendall'); }
      if (avg >= 46) { m.spells.add('sunder'); }
    }

    // Fight this region until the party is level with the next one — the
    // condition a player actually plays under, rather than a fixed count.
    const nextLevel = order[order.indexOf(order.find(([n]) => n === table)) + 1]?.[1] ?? meanLevel + 4;
    let fights = 0, wipes = 0, deaths = 0, regionSeconds = 0, regionExp = 0, regionGold = 0;
    let hpLossTotal = 0, closest = 1, chain = 0, rests = 0;
    const chains = [];
    const cap = 400;
    for (const m of party) { m.hp = m.maxHP; m.mp = m.maxMP; }   // arrive rested

    while (fights < cap) {
      const roll = rng.next() * totalWeight;
      let acc = 0, group = groups[0];
      for (const g of groups) { acc += g.weight; if (roll <= acc) { group = g; break; } }

      // No free rest between fights. An earlier version restored the party to
      // full before every encounter, which is an inn on every tile — it made
      // every region cost "under 4% of the party's health" and reported the
      // whole game as frictionless. Attrition is the entire point of a random
      // encounter, so the party carries its wounds and rests only when it has
      // to, and what gets measured is how many fights it can chain.
      const r = simulateBattle(party, group.enemies);
      if (!r) break;
      fights++; battles++;
      chain++;
      // Commit the battle's damage back onto the party.
      for (let i = 0; i < party.length; i++) {
        party[i].hp = r.heroes[i].ko ? 0 : r.heroes[i].hp;
        party[i].mp = r.heroes[i].mp;
      }
      const pool = party.reduce((n, m) => n + Math.max(0, m.hp), 0)
        / party.reduce((n, m) => n + m.maxHP, 0);
      const dry = party.every((m) => m.mp < 20);
      if (pool < 0.35 || dry || party.some((m) => m.hp <= 0)) {
        // Back to an inn or a save point.
        for (const m of party) { m.hp = m.maxHP; m.mp = m.maxMP; }
        chains.push(chain);
        chain = 0;
        rests++;
      }
      regionSeconds += r.seconds;
      seconds += r.seconds;
      hpLossTotal += r.hpLostFrac;
      closest = Math.min(closest, r.lowestHPFrac);
      deaths += r.deaths;
      if (!r.win) { wipes++; if (wipes > fights * 0.5 && fights > 12) break; }
      else {
        regionExp += r.exp; regionGold += goldShare(r.gold);
        gold += goldShare(r.gold);
        const each = expShare(r.exp, Math.max(1, r.survivors));
        for (const m of party) m.gainExp(each);
      }
      const now = party.reduce((n, m) => n + m.level, 0) / party.length;
      if (now >= nextLevel) break;
    }

    const level = party.reduce((n, m) => n + m.level, 0) / party.length;
    if (chain) chains.push(chain);
    rows.push({
      table, meanLevel, worst: tableMaxLevel.get(table),
      fights, wipes, deaths, rests, level, gold,
      chain: chains.length ? chains.reduce((n, c) => n + c, 0) / chains.length : fights,
      secondsEach: regionSeconds / Math.max(1, fights),
      hpLoss: hpLossTotal / Math.max(1, fights),
      closest,
    });
  }

  say('table                     mean lv  party lv  fights  wipes  s/fight  HP lost  fights/rest      gold');
  for (const r of rows) {
    const warn = r.wipes > 0 ? '\x1b[31m' : r.chain > 25 ? '\x1b[33m' : '';
    say(`${warn}${r.table.padEnd(24)} ${r.meanLevel.toFixed(0).padStart(7)} `
      + `${r.level.toFixed(1).padStart(9)} ${String(r.fights).padStart(7)} `
      + `${String(r.wipes).padStart(6)} ${r.secondsEach.toFixed(0).padStart(8)} `
      + `${(r.hpLoss * 100).toFixed(0).padStart(7)}% ${r.chain.toFixed(0).padStart(12)} `
      + `${String(Math.round(r.gold)).padStart(9)}\x1b[0m`);
  }

  const hours = seconds / 3600;
  const finalLevel = party.reduce((n, m) => n + m.level, 0) / party.length;
  // What the simulation does not sit through: the encounter transition, the
  // Victory banner, and the spoils text. Those are fixed costs the game
  // charges for every single random battle, and they dominate the total once
  // the fights themselves are this short. This used to be a hard-coded 8 —
  // a guess nobody could argue with because nothing in the game recorded the
  // real durations. Now the fades and beats come from battle/pacing.js, the
  // same module the game reads, plus two modelled human costs: SETUP for the
  // scene build, victory poses and music sting the constants do not cover,
  // and READ for the spoils — a button press if the dialogue blocks, a
  // glance if it clears itself.
  const SETUP = 1.0;
  const READ = PACING.spoilsBlocking ? 2.5 : 0.9;
  const CEREMONY = PACING.fadeToBattle + PACING.fadeIntoBattle + PACING.fadeOutOfBattle
    + PACING.fadeBackToField + PACING.victoryBeat + SETUP + READ;
  const wall = (seconds + battles * CEREMONY) / 3600;
  say();
  say(`${battles} battles, party finishes at level ${finalLevel.toFixed(1)}, `
    + `${Math.round(gold).toLocaleString()} gil in hand`);
  say(`${hours.toFixed(1)}h resolving them, ${wall.toFixed(1)}h once the fixed `
    + `${CEREMONY.toFixed(1)}s of transition, Victory banner and spoils text per battle is counted`);
  if (CEREMONY > 5) {
    flag('minor', 'battles',
      `Every random battle charges ${CEREMONY.toFixed(1)}s of ceremony on top of the fight`,
      `Across ${battles} battles that is ${((battles * CEREMONY) / 3600).toFixed(1)} hours of fades, `
      + 'banner and spoils text — bought with no decisions at all. The spoils dialogue blocking on '
      + 'a button press for a one-line "Gained 61 EXP" is most of it; the fades are the rest. '
      + 'Five seconds is the budget; everything past it is the game charging the player rent.');
  }

  // --- the findings --------------------------------------------------------

  const grindy = rows.filter((r) => r.fights >= 120);
  if (grindy.length) {
    flag('major', 'scaling', `${grindy.length} regions need 120+ fights to reach the next region's level`,
      grindy.slice(0, 8).map((r) => `${r.table} ${r.fights}`).join(', ')
      + '. That is grinding, not pacing — the experience awarded is not keeping up with the curve.');
  }
  // Needing no grinding in a region is not the same as never seeing it — the
  // party still walks through and still fights on the way. What is actually
  // wrong is a region written so far below the party that its encounters are
  // a formality, so the measure is the level gap, not the fight count.
  const trivial = rows.filter((r) => r.level - r.meanLevel >= 8);
  if (trivial.length) {
    flag('minor', 'scaling', `${trivial.length} regions sit 8+ levels below the party that reaches them`,
      trivial.slice(0, 8).map((r) => `${r.table} (lv${r.meanLevel.toFixed(0)} vs party ${r.level.toFixed(0)})`).join(', ')
      + '. Their encounters cannot threaten anybody by the time anybody is standing in them.');
  }
  // A rare wipe is the game working. A region that kills the party more than
  // one time in ten is not tuned, it is a wall.
  const deadly = rows.filter((r) => r.fights > 5 && r.wipes / r.fights > 0.1);
  if (deadly.length) {
    flag('major', 'battles', `${deadly.length} regions wipe the party at their own level`,
      deadly.slice(0, 8).map((r) => `${r.table} (${r.wipes} in ${r.fights})`).join(', '));
  }
  // How many encounters the party can chain before it has to go back and
  // rest. This is what attrition actually feels like: a dungeon you can clear
  // in one run without ever opening the menu has no encounters in it, it has
  // a walking-speed tax.
  const frictionless = rows.filter((r) => r.chain > 25);
  const avgChain = rows.reduce((n, r) => n + r.chain, 0) / rows.length;
  say(`the party can chain ${avgChain.toFixed(0)} encounters between rests on average`);
  if (frictionless.length > rows.length * 0.4) {
    flag('major', 'battles',
      `${frictionless.length} of ${rows.length} regions can be crossed without ever resting`,
      `The party chains ${avgChain.toFixed(0)} fights on average before HP or MP forces it back to `
      + 'an inn. A random encounter that never threatens anything is a toll booth: the player pays '
      + 'time and gets no decision back. This is the single most common complaint about the genre.');
  }
  const slow = rows.filter((r) => r.secondsEach > 90);
  if (slow.length) {
    flag('minor', 'battles', `${slow.length} regions average over 90 seconds a fight`,
      slow.slice(0, 6).map((r) => `${r.table} ${r.secondsEach.toFixed(0)}s`).join(', '));
  }
  say();
  flag('info', 'scaling', `${battles} forced random battles across the campaign`,
    `${hours.toFixed(1)} hours to resolve and ${wall.toFixed(1)} hours of wall clock with the `
    + 'per-battle ceremony counted, against a 40-hour target. The fights themselves are that '
    + 'short only because one spell ends them; the battle count is the real cost, and it is '
    + 'driven by the experience curve rather than by anything the player chooses to do.');
  return { rows, hours, wall, finalLevel, gold };
}

// ---------------------------------------------------------------------------
// 4. Bosses
// ---------------------------------------------------------------------------

/**
 * The five fights the game actually makes a player have, in order.
 *
 * Everything else in the bestiary is optional, and the optional ladder is
 * correctly tuned — this is the route that has to work.
 */
const MAIN_LINE = ['bogfather', 'ferranwarden', 'eighthlantern', 'enginewarden', 'vhaineshadow'];

/**
 * Experience the critical path pays, per party member, before each boss.
 *
 * Measured by breadth-first search over the real terrain grids: the walking
 * distance between each pair of story beats, divided by the encounter table's
 * own `rate` times `ENCOUNTER_SPACING`, at twice the shortest route to allow
 * for chests, wrong turns and backtracking. It is deliberately a fixed table
 * rather than a live simulation — the simulation walks every region in the
 * game, which is the thing this check exists to *not* assume anybody does.
 *
 * These are absolute experience totals, so they move whenever the encounter
 * spacing or the `expForLevel` coefficient moves. Both changed together when
 * encounters were spaced out; the levels they resolve to did not.
 */
const MAIN_LINE_EXP = {
  bogfather: 146, ferranwarden: 519, eighthlantern: 1192,
  enginewarden: 2154, vhaineshadow: 2869,
};

/**
 * Does the road deliver the party the bosses on it are written for?
 *
 * This is the join the rest of the audit never looked at. `bossChecks` builds
 * its test party at *the boss's own level* and asks whether the fight is fair;
 * the smoke test grants millions of experience before each story fight so it
 * can reach the ending. Both are correct about what they measure and neither
 * asks whether a player arrives at that level. They did not: the Eighth
 * Lantern was written at 30 and met at 15, and the Warden of the Ninth Well at
 * 32 and met at 18 — with no route past it — so the main line was arithmetically
 * unwinnable without roughly 128 battles of grinding at one corridor.
 */
function criticalPath() {
  head('5b. The road the game actually asks you to walk');
  const rows = [];
  for (const id of MAIN_LINE) {
    const b = ENEMIES[id];
    if (!b) { flag('major', 'scaling', `Main-line boss '${id}' is missing from the bestiary`, ''); continue; }
    const party = levelForExp(MAIN_LINE_EXP[id]);
    rows.push({ id, name: b.name, boss: b.level, party, gap: b.level - party });
  }
  say('boss                        written for   party arrives at   gap');
  for (const r of rows) {
    const colour = Math.abs(r.gap) > 3 ? '\x1b[31m' : '';
    say(`${colour}${r.name.padEnd(28)} ${String(r.boss).padStart(11)} ${String(r.party).padStart(18)} `
      + `${(r.gap > 0 ? '+' : '') + r.gap}\x1b[0m`);
  }

  const unfair = rows.filter((r) => r.gap > 3);
  if (unfair.length) {
    flag('major', 'scaling', `${unfair.length} mandatory bosses are written above the level the road delivers`,
      unfair.map((r) => `${r.name} lv${r.boss} vs party ${r.party} (+${r.gap})`).join(', ')
      + '. These fights cannot be avoided, so the gap is not difficulty — it is a grind wall, and '
      + 'the player has to farm it off at the one corridor that stops them.');
  }
  const trivial = rows.filter((r) => r.gap < -4);
  if (trivial.length) {
    flag('minor', 'scaling', `${trivial.length} mandatory bosses are far below the party that reaches them`,
      trivial.map((r) => `${r.name} lv${r.boss} vs party ${r.party}`).join(', '));
  }
  // The ladder may only climb. A story whose fights get easier as it goes has
  // its climax in the middle.
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].boss < rows[i - 1].boss) {
      flag('major', 'scaling', 'The main line gets easier as it goes',
        `${rows[i].name} (lv${rows[i].boss}) comes after ${rows[i - 1].name} (lv${rows[i - 1].boss}). `
        + 'Every fight the story makes mandatory should be at least as hard as the one before it, '
        + 'or the player meets the peak of the game somewhere in the middle and finishes downhill.');
      break;
    }
  }
  const last = rows[rows.length - 1];
  if (last && rows.some((r) => r.boss > last.boss)) {
    flag('major', 'scaling', 'The final boss is not the hardest fight on the main line',
      `${last.name} is lv${last.boss}; the main line peaks at lv${Math.max(...rows.map((r) => r.boss))}.`);
  }
  return rows;
}

function bossChecks() {
  head('5. Bosses');
  // `--boss id[,id]` narrows the table to the bosses being tuned. The shape
  // checks below (first boss, finale, quartiles) only mean anything against
  // the full roster, so they are skipped on a filtered run.
  const bossArg = args[args.indexOf('--boss') + 1];
  const bossFilter = args.includes('--boss') && bossArg ? new Set(bossArg.split(',')) : null;
  const bosses = Object.values(ENEMIES).filter((e) => e.boss)
    .filter((e) => !bossFilter || bossFilter.has(e.id))
    .sort((a, b) => a.level - b.level);
  const rows = [];

  for (const b of bosses) {
    // A party at the boss's own level, in gear it could afford by then. Gold
    // is approximated from the level, which is what the progression run shows
    // it tracks.
    // What the party could plausibly have spent by this level: the best kit in
    // the game for four costs 220,800 gil, and they should only be able to
    // afford all of it right at the end.
    const budget = Math.round(0.36 * Math.pow(b.level, 3));

    // The bag comes out of the same purse as the armour. A slice of the boss
    // budget buys consumables *before* gear is scored, because that is the
    // order a player shops in on a boss run — and because it is what finally
    // makes an item's price a balance lever: raise X-Potions and the sim
    // arrives carrying fewer of them. Stack caps keep the endgame surplus
    // from turning into a bottomless bag; a hundred X-Potions is exactly the
    // failure mode the economy findings exist to catch, not to simulate away.
    // ...but only once there is money not already spoken for. The first
    // draft took 12% flat at every level, which pushed the level-27 party
    // down a whole gear price tier and reported the Cinder Wyrm as a
    // steel-proof wall it is not — 90% swords-only with the armour a real
    // party owns, 17% in the model's skimped kit. Below the mid-game the
    // economy section shows every gil going into gear, so the slice ramps in
    // across the band where its own numbers say surplus appears, and reaches
    // the full 12% by the level money stops mattering (currently 49).
    const surplus = Math.max(0, Math.min(1, (b.level - 25) / 20));
    const itemSlice = budget * 0.12 * surplus;
    const stock = (id, share, cap) =>
      Math.max(0, Math.min(cap, Math.floor(share / ITEMS[id].price)));
    const bag = { xpotion: stock('xpotion', itemSlice * 0.6, 8), hipotion: 0, potion: 0,
      hitonic: stock('hitonic', itemSlice * 0.4, 4) };
    if (!bag.xpotion) bag.hipotion = stock('hipotion', itemSlice * 0.6, 8);
    if (!bag.xpotion && !bag.hipotion) bag.potion = stock('potion', itemSlice * 0.6, 8);

    const build = (prepared) => {
    const party = ['vesna', 'corvin', 'aurelian', 'wick'].map((id) => new SimMember(id, b.level));
    for (const m of party) {
      if (m.def.innateMagic) {
        m.spells.add('mend'); m.spells.add('ember');
        if (b.level >= 10) { m.spells.add('pyre'); m.spells.add('mendra'); }
        if (b.level >= 24) m.spells.add('hollow');
        if (b.level >= 34) { m.spells.add('conflagrate'); m.spells.add('mendall'); }
        if (b.level >= 46) m.spells.add('sunder');
      }
      let purse = (budget - itemSlice) / 4;
      // A player fighting a boss with a known weakness brings the weapon that
      // exploits it — that is the whole point of the affinity table, and of
      // Vesna's Attune. Scoring gear on raw stats alone made a heavily
      // armoured boss with two elemental weaknesses look unbeatable by steel.
      const weak = new Set(Object.entries(b.affinity ?? {})
        .filter(([, v]) => v === 'weak').map(([k]) => k));
      for (const slot of EQUIP_SLOTS) {
        const wearable = purchasable.filter((it) => {
          const target = it.kind === 'relic' ? ['relic1', 'relic2'] : [it.slot];
          return target.includes(slot) && canEquip(m.id, it) && it.price <= purse;
        });
        // `prepared` brings the element the boss is weak to, which is what the
        // affinity table is for and what Annotate points at. `unprepared` just
        // buys the best numbers, which is what most players do on a first pass.
        const score = (it) => gearScore(it) * (prepared && weak.has(it.element) ? 2 : 1);
        const best = wearable.sort((a, b2) => score(b2) - score(a))[0];
        if (best) { purse -= best.price; m.equipment[slot] = best; }
      }
      m.hp = m.maxHP; m.mp = m.maxMP;
    }
    return party;
    };
    const readyParty = build(true);
    const plainParty = build(false);

    // Two runs: the way the numbers say to play, and the way the game reads as
    // if it wants to be played. The gap between them is the finding.
    // The steel run turns off *offensive* spells only. An earlier version cut
    // healing too, so it was not measuring whether a sword can win a fight, it
    // was measuring whether a party with no healer can — and it reported five
    // bosses as magic-only when three of them are simply written to resist
    // physical damage and one is a straightforward slog.
    const run = (useMagic, party) => {
      let wins = 0, seconds = 0, deaths = 0, timeouts = 0, bite = 0;
      // 30 trials, not 10. The new shape checks below read individual bosses
      // off this table, and at N=10 a boss's win rate moves in 10% steps —
      // coarse enough that a re-tuned boss flickers in and out of a finding
      // between runs that changed nothing.
      const N = 30;
      const pool = party.reduce((n, m) => n + m.maxHP, 0);
      for (let i = 0; i < N; i++) {
        for (const m of party) { m.hp = m.maxHP; m.mp = m.maxMP; }
        const r = simulateBattle(party, [b.id], { useMagic, allowHeal: true, items: { ...bag } });
        if (!r) break;
        if (r.win) wins++;
        if (r.timeout) timeouts++;
        seconds += r.seconds;
        deaths += r.deaths;
        // How much of the party's health the boss actually took. A fight can
        // be short and still be a fight; it cannot be a fight if nothing was
        // ever at stake, and win/lose alone never shows that.
        bite += Math.min(1, r.hpLost / pool);
      }
      return { winRate: wins / N, seconds: seconds / N, deaths: deaths / N, timeouts, bite: bite / N };
    };
    const magic = run(true, readyParty);
    const steel = run(false, readyParty);
    const plain = run(true, plainParty);
    rows.push({ id: b.id, name: b.name, level: b.level, hp: b.stats.hp, magic, steel, plain });
  }

  say('                                        ── prepared ──  ── unprepared ──  swords only');
  say('boss                            lv      HP   win%   cost    win%     cost   win%');
  for (const r of rows) {
    const colour = r.plain.bite < 0.2 ? '\x1b[33m' : r.steel.winRate < 0.25 ? '\x1b[31m' : '';
    say(`${colour}${r.name.slice(0, 30).padEnd(30)} ${String(r.level).padStart(3)} `
      + `${String(r.hp).padStart(7)} ${(r.magic.winRate * 100).toFixed(0).padStart(5)}% `
      + `${(r.magic.bite * 100).toFixed(0).padStart(5)}% `
      + `${(r.plain.winRate * 100).toFixed(0).padStart(6)}% `
      + `${(r.plain.bite * 100).toFixed(0).padStart(7)}% `
      + `${(r.steel.winRate * 100).toFixed(0).padStart(6)}%\x1b[0m`);
  }

  const unwinnable = rows.filter((r) => r.magic.winRate < 0.34);
  if (unwinnable.length) {
    flag('major', 'battles', `${unwinnable.length} bosses are lost more often than won at their own level`,
      unwinnable.slice(0, 10).map((r) => `${r.name} lv${r.level} ${(r.magic.winRate * 100).toFixed(0)}%`).join(', '));
  }
  // Length alone is the wrong measure — a well-played boss fight can be short.
  // What separates a boss from a wall is how much it takes off the party
  // before it dies.
  // Measured against the *unprepared* party, not the optimal one.
  //
  // The earlier version asked whether a boss could threaten a party at its own
  // level, in the best gear its money allows, holding a weapon of exactly the
  // element it is weak to, healing perfectly. A boss that survives all of that
  // is not a bar worth setting; the party did everything right. What matters is
  // whether a boss can threaten somebody who walked in with good numbers and
  // no plan — because that player is the one who needs the fight to teach them
  // that the affinity table exists.
  const pushovers = rows.filter((r) => r.plain.bite < 0.2);
  if (!bossFilter && pushovers.length > rows.length * 0.10) {
    flag('major', 'battles',
      `${pushovers.length} of ${rows.length} bosses never take a fifth of an unprepared party's health`,
      pushovers.slice(0, 10).map((r) => `${r.name} ${(r.plain.bite * 100).toFixed(0)}%`).join(', ')
      + '. These are measured against a party at the boss\'s level in the best gear its money '
      + 'allows and carrying the potions and tonics that money buys, but with no elemental weapon '
      + 'and no plan — the player who most needs the fight to teach them that the affinity table '
      + 'exists. The old threshold let a quarter of the roster through; a tenth is already generous.');
  }

  // The shape of the ledger, not just its floor. A campaign teaches with its
  // first boss and pays off with its last, so those two are not allowed to be
  // pushovers no matter how the average looks — and the finale has to be the
  // peak. The audit used to check only that no boss was *unbeatable*, which is
  // how the game ended up with its hardest fight at level 46 and a final boss
  // that cost less of the party's health than the mid-game did: every row
  // passed, and the curve those rows drew was upside down.
  const first = rows[0];
  const finale = rows[rows.length - 1];
  const anchors = bossFilter ? []
    : rows.filter((r) => (r.level >= 60 || r === first) && r.plain.bite < 0.2);
  if (anchors.length) {
    flag('major', 'battles',
      `${anchors.length} final-act (or first) bosses never take a fifth of an unprepared party's health`,
      anchors.map((r) => `${r.name} lv${r.level} ${(r.plain.bite * 100).toFixed(0)}%`).join(', ')
      + '. The first boss is where a player learns that bosses are a different grammar; the last '
      + 'act is where the campaign pays its bill. A pushover in either place is not an average '
      + 'problem, it is a broken promise, so these are named individually rather than pooled.');
  }
  // The last boss on the *level ladder* has to be a real fight. It is
  // deliberately not measured against the whole roster: sixteen of these are
  // optional post-game superbosses written to be harder than the ending, which
  // is the genre working as intended rather than a defect. An earlier version
  // of this check asked the finale to sit in the top quarter of all 45, and
  // the only way to satisfy it was to keep inflating the last boss past
  // content the player never has to touch. The main line's own ladder is
  // checked separately, in `criticalPath`.
  if (!bossFilter && finale.plain.bite < 0.5) {
    flag('major', 'battles',
      'The last boss on the ladder is not a real fight',
      `${finale.name} (lv${finale.level}) takes only ${(finale.plain.bite * 100).toFixed(0)}% of an `
      + 'unprepared party\'s health. Whatever else is optional, the top of the level curve has to '
      + 'cost at least half the party\'s health pool.');
  }
  // A wall is the other failure. Prepared means the right element, the best
  // affordable gear and a full bag — a party that did everything the game
  // asked. Losing more than one such fight in five is not difficulty, it is
  // the tuning charging the player for the designer's mistake.
  const walls = rows.filter((r) => r.magic.winRate < 0.8 && r.magic.winRate >= 0.34);
  if (walls.length) {
    flag('minor', 'battles', `${walls.length} bosses beat a fully prepared party more than once in five`,
      walls.map((r) => `${r.name} lv${r.level} ${(r.magic.winRate * 100).toFixed(0)}%`).join(', '));
  }
  // A boss written `physical: resist` is meant to be a puzzle, and losing it
  // with swords is the puzzle working. What is not fine is a boss with no such
  // note that steel simply cannot beat.
  const steelLoses = rows.filter((r) => r.steel.winRate < 0.25 && r.magic.winRate >= 0.9
    && ENEMIES[r.id]?.affinity?.physical !== 'resist'
    && ENEMIES[r.id]?.affinity?.physical !== 'immune');
  if (steelLoses.length) {
    flag('major', 'battles',
      `${steelLoses.length} bosses cannot be beaten with weapons, and do not say so`,
      steelLoses.slice(0, 10).map((r) => `${r.name} (${(r.steel.winRate * 100).toFixed(0)}% vs `
        + `${(r.magic.winRate * 100).toFixed(0)}%)`).join(', ')
      + '. A boss that resists physical damage should carry `physical: resist` so Annotate reports '
      + 'it and the player can act on it; these just quietly cannot be hit hard enough.');
  }
  const slogs = rows.filter((r) => r.magic.seconds > 240 || r.magic.timeouts);
  if (slogs.length) {
    flag('minor', 'battles', `${slogs.length} bosses run past four minutes`,
      slogs.slice(0, 8).map((r) => `${r.name} ${r.magic.seconds.toFixed(0)}s`).join(', '));
  }

  // HP curve sanity: a boss should be a step up on the region around it.
  const bad = [];
  for (const b of bosses) {
    const peers = Object.values(ENEMIES).filter((e) => !e.boss && Math.abs(e.level - b.level) <= 2);
    if (!peers.length) continue;
    const peerHP = peers.reduce((n, e) => n + e.stats.hp, 0) / peers.length;
    if (b.stats.hp < peerHP * 2.5) bad.push(`${b.name} ${b.stats.hp} vs ${Math.round(peerHP)} peer avg`);
  }
  if (bad.length) {
    flag('minor', 'enemy strength', `${bad.length} bosses have less than 2.5× the HP of the mobs around them`,
      bad.slice(0, 8).join('; '));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 5. Quests
// ---------------------------------------------------------------------------

async function questChecks() {
  head('6. Quests');

  const eventFiles = ['events.js', 'events-vol2.js', 'events-vol3.js', 'events-vol4.js',
    'events-vol5.js', 'events-bosses.js'];
  const src = eventFiles
    .map((f) => path.join(root, 'src/data', f))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');

  const grab = (re) => {
    const out = [];
    let m;
    const r = new RegExp(re, 'g');
    while ((m = r.exec(src))) out.push(m[1]);
    return out;
  };
  const started = new Set(grab(`startQuest\\(\\s*['"\`]([\\w-]+)['"\`]`));
  const advanced = new Set(grab(`advanceQuest\\(\\s*['"\`]([\\w-]+)['"\`]`));
  const completed = new Set(grab(`completeQuest\\(\\s*['"\`]([\\w-]+)['"\`]`));
  const staged = new Set(grab(`questStage\\(\\s*['"\`]([\\w-]+)['"\`]`));
  const all = new Set([...started, ...advanced, ...completed, ...staged]);

  say(`${all.size} quest ids: ${started.size} are ever started, ${advanced.size} advance, `
    + `${completed.size} complete, ${staged.size} are read back`);

  // A quest that begins and ends inside one scene has no in-progress phase to
  // show, and reporting all sixty-nine of those as "never started" was noise:
  // most of this list is a single conversation with a single outcome. What
  // actually strands a player is a quest whose start and finish are in
  // different events with nothing in the journal in between.
  const eventsFor = new Map();
  for (const [file, text] of eventFiles.map((f) => [f, (() => {
    const fp = path.join(root, 'src/data', f);
    return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
  })()])) {
    const lines = text.split('\n');
    let current = null;
    for (const line of lines) {
      const def = line.match(/^\s{0,4}\*?\s*([A-Za-z0-9_]+)\s*\(game/)
        || line.match(/^\s{0,4}([A-Za-z0-9_]+):\s*function\*/);
      if (def) current = `${file}:${def[1]}`;
      for (const m of line.matchAll(/(?:start|advance|complete)Quest\(\s*['"`]([\w-]+)['"`]/g)) {
        if (current) (eventsFor.get(m[1]) ?? eventsFor.set(m[1], new Set()).get(m[1])).add(current);
      }
    }
  }
  const multiScene = [...all].filter((q) => (eventsFor.get(q)?.size ?? 1) > 1);
  const strandedMulti = multiScene.filter((q) => !started.has(q));
  say(`${multiScene.length} quests span more than one scene; `
    + `${multiScene.length - strandedMulti.length} of those open the journal entry`);
  if (strandedMulti.length) {
    flag('major', 'quests',
      `${strandedMulti.length} multi-scene quests never open a journal entry`,
      'The player is sent away to do something and the journal stays empty until they finish: '
      + `${strandedMulti.join(', ')}`);
  }

  const neverEnds = [...all].filter((q) => started.has(q) && !completed.has(q));
  if (neverEnds.length) {
    flag('major', 'quests', `${neverEnds.length} quests can be started but never completed`,
      `They sit in the journal forever: ${neverEnds.join(', ')}. `
      + `"after" is the one that matters — it is opened at the cataclysm, which is the objective `
      + 'for the entire second half of the game, and nothing ever advances or closes it.');
  }

  // A stage counts as read if code branches on it *or* the journal has text
  // for it — writing the number and showing the player where they are is a
  // use, and it is the one that matters to somebody coming back after a week.
  const described = new Set(Object.entries(QUESTS)
    .filter(([, q]) => Array.isArray(q.stages) && q.stages.length > 1).map(([id]) => id));
  const advancedNeverRead = [...advanced].filter((q) => !staged.has(q) && !described.has(q));
  if (advancedNeverRead.length) {
    flag('minor', 'quests', `${advancedNeverRead.length} quests advance through stages nothing reads`,
      'The stage number is written, never branched on, and has no journal line, so the '
      + `intermediate steps have no effect on anything: ${advancedNeverRead.join(', ')}`);
  }

  // The journal itself.
  const menuSrc = fs.readFileSync(path.join(root, 'src/ui/menu.js'), 'utf8');
  // The method definition, not the call site that opens it from the root menu.
  const at = menuSrc.search(/^\s*_pushQuests\(\)\s*\{/m);
  const questBlock = at < 0 ? '' : menuSrc.slice(at, at + 700);
  if (/label:\s*id\b/.test(questBlock)) {
    flag('major', 'quests', 'The quest journal lists raw ids and a stage number',
      'The Quests screen shows entries like "postbag — Stage 0". There is no title, no description '
      + 'and no objective anywhere in the data, so a player who puts the game down for a week has '
      + 'no way to find out what they were doing. In a forty-hour game that is the screen they will '
      + 'need most.');
  }

  // The bestiary has the same defect, and it is the screen most likely to be
  // read as unfinished: every creature in the game has a written name.
  const bat = menuSrc.search(/^\s*_pushBestiary\(\)\s*\{/m);
  const bestiaryBlock = bat < 0 ? '' : menuSrc.slice(bat, bat + 700);
  if (/label:\s*id\b/.test(bestiaryBlock)) {
    const sample = Object.values(ENEMIES).slice(0, 4);
    flag('major', 'quests', 'The bestiary lists internal ids instead of the creatures\' names',
      `Every enemy carries a written name and the screen shows the key instead: `
      + `${sample.map((e) => `"${e.id}" for ${e.name}`).join(', ')}. It also shows only a kill `
      + 'count — no portrait, stats, weaknesses or the text Annotate already gathers — so the one '
      + 'screen that rewards a player for fighting everything gives them a list of variable names.');
  }

  // Flags: written but never read, and read but never written.
  //
  // Not a simple `setFlag('x')` match. The events use ternaries — the kiln
  // scene writes `setFlag(relight ? 'kiln_relit' : 'kiln_out')` — and a naive
  // pattern reads the second branch as a flag nothing ever sets, then reports
  // a working sidequest as broken. Take every string literal in the call.
  const callArgs = (fn) => {
    const out = [];
    const re = new RegExp(`${fn}\\(([^;]{0,160}?)\\)`, 'g');
    let m;
    while ((m = re.exec(src))) {
      for (const lit of m[1].match(/['"`]([\w-]+)['"`]/g) ?? []) out.push(lit.slice(1, -1));
    }
    return out;
  };
  const setFlags = new Set(callArgs('setFlag'));
  const readFlags = new Set([
    ...callArgs('hasFlag'),
    ...grab(`requires:\\s*['"\`]([\\w-]+)['"\`]`),
    ...grab(`flag:\\s*['"\`]([\\w-]+)['"\`]`),
  ]);
  // Map data gates on flags too.
  for (const def of maps.values()) {
    const scan = (o) => {
      if (!o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) {
        if ((k === 'requires' || k === 'flag' || k === 'ifFlag' || k === 'unless') && typeof v === 'string') readFlags.add(v);
        else if (typeof v === 'object') scan(v);
      }
    };
    scan(def);
  }
  const writeOnly = [...setFlags].filter((f) => !readFlags.has(f));
  const readOnly = [...readFlags].filter((f) => !setFlags.has(f));
  say(`story flags: ${setFlags.size} set, ${readFlags.size} read`);
  if (readOnly.length) {
    flag('major', 'quests', `${readOnly.length} story flags are checked but never set`,
      'Whatever they gate can never open: '
      + `${readOnly.slice(0, 14).join(', ')}${readOnly.length > 14 ? '…' : ''}`);
  }
  if (writeOnly.length > setFlags.size * 0.5) {
    flag('info', 'quests', `${writeOnly.length} of ${setFlags.size} story flags are set and never read`,
      'Mostly "this happened" bookkeeping, which is fine, but it means most of the world state the '
      + 'game records has no consequence anywhere.');
  }
  return { all, started, completed };
}

// ---------------------------------------------------------------------------

if (runAll || only('--data')) { dataChecks(); damageScaling(); economy(); }
if (runAll || only('--reach')) reachChecks();
if (runAll || only('--sim')) progression();
if (runAll || only('--data') || only('--sim')) criticalPath();
if (runAll || only('--sim') || only('--boss')) bossChecks();
if (runAll || only('--quests')) await questChecks();

head('Findings');
const order = { major: 0, minor: 1, info: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);
if (!findings.length) say('Nothing to report.');
for (const f of findings) {
  const tag = f.severity === 'major' ? '\x1b[31mMAJOR\x1b[0m'
    : f.severity === 'minor' ? '\x1b[33mminor\x1b[0m' : '\x1b[90minfo \x1b[0m';
  say(`\n[${tag}] (${f.area}) ${f.title}`);
  say(`        ${f.detail.replace(/\n/g, '\n        ')}`);
}
say();
say(`${findings.filter((f) => f.severity === 'major').length} major, `
  + `${findings.filter((f) => f.severity === 'minor').length} minor, `
  + `${findings.filter((f) => f.severity === 'info').length} informational`);
