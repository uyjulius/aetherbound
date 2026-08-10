/**
 * Bestiary, part four — the airship country, Lv 40 to 85.
 *
 * Volume three took the road as far as a road goes. These six regions were
 * always drawn on the map and never joined to anything: a stockyard below
 * Harrowmere, a burial field nobody will name, a stretch of downs that argues,
 * an acre that breeds, a cooling yard the Engines left running, and a road
 * that is still faster than the things beside it. They sit alongside volume
 * three's bands rather than after them, which is why the levels overlap: the
 * airship opens all six at once and the party picks its order.
 *
 * Six regions, six lessons, none of them repeated from volumes two or three:
 *
 *   the Blooding Yards  they take the choice, not the turn. Berserk locks a
 *                       character out of every command and swings them at
 *                       whatever is nearest — which is rarely what you wanted.
 *   the Kindly Ground   they make a body forget it is alive. A Zombied ally
 *                       takes your healer's spells as damage; the potions
 *                       still work, so put the white magic away.
 *   the Gainsay         everything here answers back. Every script opens with
 *                       a rule that reads its own ailments: blind it, silence
 *                       it, slow it, and it stops doing the small thing and
 *                       starts doing the large one. Read what a thing does
 *                       when you are winning.
 *   the Brood Acre      arithmetic. The only formations in the game that run
 *                       four and five deep, each of them soft. Single-target
 *                       excellence loses to four turns against your one.
 *   the Quench          the element on your *weapon*, not on your spell. Every
 *                       ordinary attack carries `actor.weapon.element`, and
 *                       everything here drinks one. Plain steel wins.
 *   the Overwind        the clock, but the other way from the Meridian. That
 *                       region counted down; this one simply moves first, and
 *                       keeps moving. Speed in the nineties and hundreds
 *                       against a party in the forties.
 *
 * ---------------------------------------------------------------------------
 * TWO ENGINE FACTS THIS VOLUME IS WRITTEN AGAINST
 *
 * ONE: `DEFENCE_CAP` is 200, and it applies to enemies too.
 *
 * Both damage formulas clamp their divisor before using it, so an enemy with
 * 232 defence takes exactly what one with 200 takes. Volume three's late
 * bestiary climbs to 232 on the assumption that the extra thirty were doing
 * something; they were not, and worse, they hid the fact that the region got
 * no harder. Nothing here exceeds 200 in either defence or magic defence. The
 * budget that would have gone there goes into hit points, evasion and speed,
 * which are the three defensive levers that still scale honestly — evasion
 * especially, since `hitChance` has a floor and no ceiling.
 *
 * TWO: AN ENEMY CANNOT USEFULLY CAST A HEAL OR A BUFF.
 *
 * `_buildEnemyAction` sends every spell that is not `allEnemies` at a random
 * *party* member, so an enemy scripted to cast Mendra heals the party and one
 * scripted to cast Wardflesh hands out Protect. Several older entries do this
 * and quietly help the player. Every script below therefore uses only attack
 * spells, status spells, and the four grey utilities that have implemented
 * effects — Siphon, Leech, Sap and Dispel. Toll, Reversal and Quicksilver have
 * no reader in `applySpecialSpell` and are not used anywhere.
 *
 * Two smaller notes, for whoever writes volume five:
 *
 *   `affinity.physical` is decoration. `elementalMultiplier` returns 1 for a
 *   null element and for the string 'physical', so a plain attack is never
 *   modified by it. Volumes one to three use it on eleven creatures. It does
 *   nothing and it is not used here.
 *
 *   `partyHasStatus` is documented in `enemies.js` and is not implemented in
 *   `_evaluateAI`'s switch, so it silently never matches. The implemented
 *   conditions are: always, hpBelow, selfHpBelow, turnEvery, turnIs, random,
 *   allyDown, hasStatus.
 *
 * A `hasStatus` rule can only fire on a turn the creature actually takes, so
 * it is useless keyed to anything that blocks a turn — sleep, stop, stone,
 * paralysis, freeze. The Gainsay keys its rules to blind, silence, slow,
 * poison, confuse, doom and imp, every one of which the party can inflict
 * (Dimming, Hush, Mire, Blight, Addle, Knell, Wither) and none of which the
 * creature holding the rule is immune to. A trigger a player cannot pull is
 * the same lie as an effect nothing reads.
 *
 * Reward scale follows volume three: a hunt pays about five times a regular of
 * its level, which is generous without becoming a better use of an afternoon
 * than the plot. Drops reach into `items-vol3.js`, so the two files are one
 * delivery — merge them together or half the boss rewards resolve to nothing.
 *
 * Merged into ENEMIES/ENCOUNTERS by the core module, same as every volume.
 */

export const VOL4_ENEMIES = {
  // ===================== the Blooding Yards (Lv 40-49) ====================
  /**
   * Pens, races and a killing floor, three miles of them, worked for two
   * hundred years and abandoned in a fortnight. The stock got out. The people
   * who ran the stock mostly did not, and the difference between the two
   * groups is no longer obvious.
   *
   * Everything here goads. Berserk has `duration: 0`, which the status engine
   * reads as *until the battle ends*: a berserked character loses Magic, Item
   * and their command outright and auto-attacks a random enemy for the rest of
   * the fight, at a twenty-five per cent bonus they did not ask for. The
   * region is therefore not a damage problem; it is a *targeting* problem, and
   * the tables are built to punish a swing you did not choose — a Tallow Mass
   * squatting at the defence cap with nothing worth taking, and a Flenser at
   * sixty-two evasion that a berserked party will miss all afternoon.
   *
   * The counters all exist and all cost something: Steadying Dram, Sovereign
   * Panacea, Steady Band, the Ninth Ward, and the Blooding Helm and Plate that
   * the two hunts here are carrying.
   */
  goadfly: {
    id: 'goadfly', name: 'Goad Fly', level: 40,
    look: { plan: 'insect', scale: 0.7, legs: 6, color: '#7d4436', accent: '#3a2226', eyeColor: '#ff7a2f', stinger: true },
    stats: { hp: 2700, mp: 60, atk: 202, def: 176, mag: 110, mdef: 160, spd: 68, eva: 38, lck: 22 },
    affinity: { wind: 'resist', ice: 'weak' },
    exp: 1000, gold: 1100, drops: [{ id: 'steadyingdram', chance: 0.25 }],
    steal: [{ id: 'eyedrops', chance: 0.35 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Nettle', power: 1.1, status: { berserk: 40 } } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Worry At It', power: 1.3 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  yardbull: {
    id: 'yardbull', name: 'Yard Bull', level: 41,
    look: { plan: 'quadruped', scale: 1.3, color: '#7d4436', accent: '#332c1c', eyeColor: '#e0574f', spines: true },
    stats: { hp: 3600, mp: 0, atk: 224, def: 192, mag: 60, mdef: 150, spd: 44, eva: 12, lck: 14 },
    affinity: { fire: 'weak', earth: 'resist' },
    immune: ['confuse', 'charm', 'silence'],
    exp: 1080, gold: 1150, drops: [{ id: 'hipotion', chance: 0.3 }],
    steal: [{ id: 'potion', chance: 0.4 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Through The Rail', power: 2.1 } },
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Gore', power: 1.9 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  bloodinghusk: {
    id: 'bloodinghusk', name: 'Blooding Husk', level: 42,
    look: { plan: 'undead', scale: 1.1, color: '#ddccab', accent: '#8b2a2c', weapon: 'axe', eyeColor: '#e0574f' },
    stats: { hp: 3400, mp: 120, atk: 228, def: 194, mag: 130, mdef: 172, spd: 34, eva: 8, lck: 10 },
    affinity: { holy: 'weak', shadow: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'doom', 'ko'],
    exp: 1160, gold: 1200, drops: [{ id: 'softstone', chance: 0.25 }],
    steal: [{ id: 'ironhelm', chance: 0.3 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Open Handed', power: 2.0, status: { berserk: 45 } } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: "Butcher's Cut", power: 1.5 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  hookman: {
    id: 'hookman', name: 'The Hookman', level: 43,
    look: { plan: 'humanoid', scale: 1.05, color: '#96603f', accent: '#3a2226', metal: '#666c74', weapon: 'axe', eyeColor: '#ffd76a' },
    stats: { hp: 3500, mp: 140, atk: 232, def: 190, mag: 128, mdef: 168, spd: 46, eva: 18, lck: 20 },
    affinity: { bolt: 'weak' },
    exp: 1240, gold: 1400, drops: [{ id: 'nervetonic', chance: 0.3 }],
    steal: [{ id: 'ironbrooch', chance: 0.2 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Hooking', power: 1.3, status: { berserk: 50 } } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Drag Down', power: 1.4, status: { slow: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  flensingmoth: {
    id: 'flensingmoth', name: 'Flensing Moth', level: 44,
    look: { plan: 'avian', scale: 0.75, color: '#bda98b', accent: '#7c4939', eyeColor: '#e0574f' },
    stats: { hp: 3300, mp: 200, atk: 226, def: 178, mag: 148, mdef: 178, spd: 72, eva: 44, lck: 28 },
    affinity: { fire: 'weak', wind: 'resist' },
    exp: 1320, gold: 1350, drops: [{ id: 'eyedrops', chance: 0.4 }],
    steal: [{ id: 'clarity', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'dimming' } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Flense', power: 1.2, status: { berserk: 35 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  shamblehound: {
    id: 'shamblehound', name: 'Shamble Hound', level: 45,
    look: { plan: 'quadruped', scale: 1.0, color: '#4b382d', accent: '#16241d', eyeColor: '#ffe45e' },
    stats: { hp: 3800, mp: 40, atk: 240, def: 186, mag: 90, mdef: 158, spd: 76, eva: 30, lck: 20 },
    affinity: { shadow: 'resist', holy: 'weak' },
    exp: 1400, gold: 1450, drops: [{ id: 'hipotion', chance: 0.3 }],
    steal: [{ id: 'swiftband', chance: 0.1 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Off The Chain', power: 2.2 } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Worry', power: 1.2, status: { berserk: 40 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  tallowmass: {
    id: 'tallowmass', name: 'Tallow Mass', level: 46,
    // The wrong thing to hit, sitting exactly on the defence cap with nine
    // thousand hit points and almost nothing worth taking off it. A party in
    // full command walks past. A berserked one does not get the option.
    look: { plan: 'blob', scale: 1.6, color: '#dbc891', accent: '#8d7c4a', eyeColor: '#f4f1e6', eyeCount: 3 },
    stats: { hp: 9000, mp: 60, atk: 190, def: 200, mag: 80, mdef: 190, spd: 14, eva: 0, lck: 6 },
    affinity: { fire: 'weak', ice: 'resist', poison: 'immune' },
    immune: ['poison', 'venom', 'ko', 'stone', 'sleep', 'confuse', 'berserk', 'stop', 'slow', 'blind', 'charm'],
    exp: 1500, gold: 900, drops: [{ id: 'balm', chance: 0.3 }],
    steal: [{ id: 'antidote', chance: 0.4 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Settle Over', power: 1.2, status: { slow: 45 }, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  theflenser: {
    id: 'theflenser', name: 'The Flenser', level: 48,
    look: { plan: 'humanoid', scale: 1.0, color: '#ac744c', accent: '#22242a', weapon: 'sword', eyeColor: '#ffe45e' },
    stats: { hp: 3900, mp: 180, atk: 252, def: 172, mag: 140, mdef: 160, spd: 84, eva: 62, lck: 34 },
    affinity: {},
    exp: 1680, gold: 1800, drops: [{ id: 'steadyingdram', chance: 0.35 }],
    steal: [{ id: 'thiefsknife', chance: 0.14 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Both Hands', power: 2.1 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Goading Cut', power: 1.2, status: { berserk: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ===================== the Kindly Ground (Lv 47-56) ======================
  /**
   * A burial field that took the whole of two bad winters and was called
   * kindly by the people doing the burying, who needed to call it something.
   *
   * The ailment here is Zombie, which nothing in the previous three volumes
   * inflicts, and which `applySpell` reads on exactly one line: a heal aimed
   * at a Zombied target is dealt as damage instead. That single line turns the
   * party's healer into the most dangerous thing on the field, and it does it
   * silently unless the player is reading the status row. Zombie also
   * `persists`, so it walks out of the battle and into the next one.
   *
   * Items are exempt — `doItem` never checks — which is the whole lesson:
   * stop casting, start drinking, and buy Grave Salt on the way in. The
   * Kindly Vestment and the Graveward Knot ward it outright, and both are down
   * here somewhere.
   */
  sextonhusk: {
    id: 'sextonhusk', name: 'Sexton Husk', level: 47,
    look: { plan: 'undead', scale: 1.05, color: '#ddccab', accent: '#4a4324', weapon: 'staff', eyeColor: '#94bf55' },
    stats: { hp: 4000, mp: 260, atk: 234, def: 192, mag: 170, mdef: 186, spd: 36, eva: 10, lck: 10 },
    affinity: { holy: 'weak', shadow: 'absorb', earth: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'zombie'],
    exp: 1500, gold: 1600, drops: [{ id: 'gravesalt', chance: 0.3 }],
    steal: [{ id: 'softstone', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'knell' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Grave Touch', power: 1.2, status: { zombie: 35 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  pallmoth: {
    id: 'pallmoth', name: 'Pall Moth', level: 48,
    look: { plan: 'avian', scale: 0.8, color: '#918f98', accent: '#4e4a52', eyeColor: '#dedbe0' },
    stats: { hp: 3900, mp: 300, atk: 232, def: 176, mag: 176, mdef: 182, spd: 70, eva: 42, lck: 28 },
    affinity: { holy: 'weak', shadow: 'absorb', wind: 'resist' },
    immune: ['blind', 'sleep'],
    exp: 1560, gold: 1620, drops: [{ id: 'gravesalt', chance: 0.28 }],
    steal: [{ id: 'echoherb', chance: 0.35 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Pall', power: 1.1, status: { zombie: 30 }, target: 'all' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  barrowmaw: {
    id: 'barrowmaw', name: 'Barrow Maw', level: 49,
    look: { plan: 'blob', scale: 1.5, color: '#4b382d', accent: '#332c1c', eyeColor: '#dbc891', eyeCount: 3 },
    stats: { hp: 5600, mp: 100, atk: 240, def: 198, mag: 120, mdef: 176, spd: 18, eva: 2, lck: 8 },
    affinity: { fire: 'weak', earth: 'absorb', poison: 'immune' },
    immune: ['poison', 'venom', 'ko', 'stone', 'sleep'],
    exp: 1640, gold: 1700, drops: [{ id: 'xpotion', chance: 0.2 }],
    steal: [{ id: 'softstone', chance: 0.35 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Take It Back Down', power: 1.9, drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Mouthful Of Ground', power: 1.4, status: { zombie: 40 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  lychgatewight: {
    id: 'lychgatewight', name: 'Lychgate Wight', level: 50,
    look: { plan: 'undead', scale: 1.15, color: '#a2acbb', accent: '#2b2933', weapon: 'axe', helmet: true, eyeColor: '#3fc6d6' },
    stats: { hp: 4700, mp: 220, atk: 250, def: 198, mag: 158, mdef: 184, spd: 40, eva: 12, lck: 12 },
    affinity: { holy: 'weak', shadow: 'absorb', ice: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'stone', 'zombie'],
    exp: 1740, gold: 1900, drops: [{ id: 'gravehelm', chance: 0.12 }],
    steal: [{ id: 'ironhelm', chance: 0.35 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'At The Gate', power: 1.6, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  theconsoler: {
    id: 'theconsoler', name: 'The Consoler', level: 51,
    look: { plan: 'humanoid', scale: 1.0, color: '#bda98b', accent: '#4e326c', weapon: 'staff', eyeColor: '#d63fb3' },
    stats: { hp: 4500, mp: 380, atk: 240, def: 186, mag: 196, mdef: 194, spd: 48, eva: 20, lck: 26 },
    affinity: { holy: 'weak', shadow: 'absorb', aether: 'resist' },
    immune: ['silence', 'charm', 'sleep'],
    exp: 1820, gold: 2000, drops: [{ id: 'hitonic', chance: 0.3 }],
    steal: [{ id: 'scholarhood', chance: 0.16 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'A Kind Word', power: 1.2, status: { zombie: 45 } } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'knell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  cerementspinner: {
    id: 'cerementspinner', name: 'Cerement Spinner', level: 52,
    look: { plan: 'insect', scale: 1.2, legs: 8, color: '#dedbe0', accent: '#95836b', eyeColor: '#e0574f', stinger: true },
    stats: { hp: 5200, mp: 180, atk: 254, def: 196, mag: 160, mdef: 180, spd: 50, eva: 26, lck: 18 },
    affinity: { fire: 'weak', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'venom', 'blind'],
    exp: 1900, gold: 2050, drops: [{ id: 'panacea', chance: 0.22 }],
    steal: [{ id: 'wardingcord', chance: 0.08 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Wind The Sheet', power: 1.3, status: { stop: 45 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Bind Cold', power: 1.4, status: { zombie: 35 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  charnelhound: {
    id: 'charnelhound', name: 'Charnel Hound', level: 54,
    look: { plan: 'quadruped', scale: 1.15, color: '#2b2933', accent: '#4b382d', eyeColor: '#94bf55', spines: true },
    stats: { hp: 5700, mp: 80, atk: 276, def: 190, mag: 110, mdef: 170, spd: 72, eva: 30, lck: 20 },
    affinity: { holy: 'weak', shadow: 'absorb' },
    immune: ['sleep', 'charm', 'zombie'],
    exp: 2100, gold: 2250, drops: [{ id: 'xpotion', chance: 0.25 }],
    steal: [{ id: 'swiftband', chance: 0.14 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Dig It Up', power: 2.2 } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Mouth Of Earth', power: 1.3, status: { zombie: 40 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  thegravedigger: {
    id: 'thegravedigger', name: 'The Gravedigger', level: 56,
    look: { plan: 'humanoid', scale: 1.2, color: '#9a6147', accent: '#332c1c', metal: '#666c74', weapon: 'axe', eyeColor: '#ffd76a' },
    stats: { hp: 6200, mp: 240, atk: 288, def: 198, mag: 168, mdef: 182, spd: 44, eva: 16, lck: 14 },
    affinity: { earth: 'absorb', wind: 'weak' },
    immune: ['sleep', 'confuse', 'charm', 'zombie', 'stone'],
    exp: 2280, gold: 2450, drops: [{ id: 'gravesalt', chance: 0.4 }],
    steal: [{ id: 'gravehelm', chance: 0.16 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Deep Enough', power: 2.3 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Spadework', power: 1.5, status: { zombie: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ========================= the Gainsay (Lv 54-63) ========================
  /**
   * High downs above the Undermarch where the wind comes back at you off the
   * scarp half a second after you have said anything. The country is named for
   * the habit and so is everything living on it.
   *
   * Every creature here opens its script with a `hasStatus` rule keyed to an
   * ailment the party can inflict, and every one of those rules converts the
   * lock into an escalation. Blind the Spite Fly and it stops aiming and hits
   * the whole party. Silence the Naysayer and it puts the staff down. Slow the
   * Crossgrain Hound and it takes one enormous turn instead of two ordinary
   * ones. This is the exact inverse of the Solmere machines, which could not
   * be locked at all: here everything can be, and the reflex is the trap.
   *
   * Note the immunity lists — they are the shortest in four volumes, on
   * purpose. A creature immune to the status its own rule reads would be a
   * rule that never fires, which is a lie with extra steps.
   */
  naysayer: {
    id: 'naysayer', name: 'The Naysayer', level: 54,
    look: { plan: 'humanoid', scale: 1.05, color: '#918f98', accent: '#4a4324', weapon: 'staff', eyeColor: '#f7d968' },
    stats: { hp: 5300, mp: 340, atk: 262, def: 188, mag: 198, mdef: 190, spd: 50, eva: 20, lck: 28 },
    affinity: { aether: 'resist', holy: 'weak' },
    immune: ['charm'],
    exp: 2100, gold: 2300, drops: [{ id: 'hitonic', chance: 0.3 }],
    steal: [{ id: 'focusring', chance: 0.18 }],
    ai: [
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'Hands Then', power: 2.4 } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'hush' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  spitefly: {
    id: 'spitefly', name: 'Spite Fly', level: 55,
    look: { plan: 'insect', scale: 0.8, legs: 6, color: '#4a4324', accent: '#94bf55', eyeColor: '#ff7a2f', stinger: true },
    stats: { hp: 5000, mp: 140, atk: 266, def: 180, mag: 140, mdef: 168, spd: 78, eva: 46, lck: 24 },
    affinity: { wind: 'resist', ice: 'weak' },
    exp: 2180, gold: 2320, drops: [{ id: 'antidote', chance: 0.4 }],
    steal: [{ id: 'clearwatercharm', chance: 0.05 }],
    ai: [
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'Blunder', power: 1.6, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Spite', power: 1.3, status: { venom: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  crossgrainhound: {
    id: 'crossgrainhound', name: 'Crossgrain Hound', level: 56,
    look: { plan: 'quadruped', scale: 1.1, color: '#6b5d37', accent: '#332c1c', eyeColor: '#e0574f', spines: true },
    stats: { hp: 5600, mp: 60, atk: 280, def: 186, mag: 100, mdef: 160, spd: 74, eva: 32, lck: 18 },
    affinity: { earth: 'resist', water: 'weak' },
    exp: 2260, gold: 2400, drops: [{ id: 'xpotion', chance: 0.24 }],
    steal: [{ id: 'sprinter', chance: 0.2 }],
    ai: [
      { if: 'hasStatus', status: 'slow', do: { kind: 'attack', name: 'All At Once', power: 2.6 } },
      { if: 'allyDown', do: { kind: 'attack', name: 'Cross The Grain', power: 2.0 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  bitterbriar: {
    id: 'bitterbriar', name: 'Bitter Briar', level: 57,
    look: { plan: 'plant', scale: 1.25, color: '#332c1c', accent: '#496035', eyeColor: '#ffe45e' },
    stats: { hp: 6400, mp: 200, atk: 272, def: 196, mag: 176, mdef: 184, spd: 22, eva: 4, lck: 10 },
    affinity: { fire: 'weak', earth: 'absorb' },
    immune: ['charm', 'sleep'],
    exp: 2340, gold: 2450, drops: [{ id: 'balm', chance: 0.35 }],
    steal: [{ id: 'panacea', chance: 0.2 }],
    ai: [
      { if: 'hasStatus', status: 'poison', do: { kind: 'attack', name: 'Spend The Rest', power: 2.5, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  theillwisher: {
    id: 'theillwisher', name: 'The Ill Wisher', level: 58,
    look: { plan: 'floater', scale: 0.95, color: '#2c1b4d', eyeColor: '#d63fb3', eyeCount: 2, tendrils: true },
    stats: { hp: 5800, mp: 420, atk: 258, def: 184, mag: 210, mdef: 196, spd: 56, eva: 34, lck: 32 },
    affinity: { shadow: 'absorb', holy: 'weak' },
    immune: ['sleep'],
    exp: 2440, gold: 2600, drops: [{ id: 'clarity', chance: 0.35 }],
    steal: [{ id: 'steadyband', chance: 0.08 }],
    ai: [
      { if: 'hasStatus', status: 'confuse', do: { kind: 'attack', name: 'Two Minds', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'addle' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  grudgewight: {
    id: 'grudgewight', name: 'Grudge Wight', level: 59,
    // Deliberately not immune to Doom, which everything else of its kind is.
    // Knell it and you have started a clock that ends with this rule.
    look: { plan: 'undead', scale: 1.15, color: '#bda98b', accent: '#2b2933', weapon: 'sword', eyeColor: '#e0574f' },
    stats: { hp: 6600, mp: 240, atk: 292, def: 194, mag: 168, mdef: 178, spd: 46, eva: 16, lck: 12 },
    affinity: { holy: 'weak', shadow: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'ko'],
    exp: 2540, gold: 2700, drops: [{ id: 'gravesalt', chance: 0.3 }],
    steal: [{ id: 'unbrokenoath', chance: 0.06 }],
    ai: [
      { if: 'hasStatus', status: 'doom', do: { kind: 'attack', name: 'Take You With Me', power: 3.0 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Old Grievance', power: 1.7 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  theobjection: {
    id: 'theobjection', name: 'The Objection', level: 61,
    // The one machine in the world that can be argued with, which is why its
    // immunity list is four entries short of every other construct's. Wither
    // has never had a use before now.
    look: { plan: 'construct', scale: 1.25, color: '#a6b0bc', accent: '#2b3038', eyeColor: '#3fc6d6', cannons: true },
    stats: { hp: 7400, mp: 300, atk: 300, def: 200, mag: 186, mdef: 198, spd: 30, eva: 4, lck: 8 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'resist' },
    immune: ['poison', 'charm'],
    exp: 2740, gold: 3000, drops: [{ id: 'shrapnel', chance: 0.35 }],
    steal: [{ id: 'wardstone', chance: 0.25 }],
    ai: [
      { if: 'hasStatus', status: 'imp', do: { kind: 'attack', name: 'One Long Sentence', power: 2.6, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'arcflash' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  theretort: {
    id: 'theretort', name: 'The Retort', level: 63,
    look: { plan: 'humanoid', scale: 1.1, color: '#ac744c', accent: '#241636', metal: '#8a5ce0', weapon: 'sword', eyeColor: '#d63fb3' },
    stats: { hp: 7800, mp: 320, atk: 312, def: 196, mag: 196, mdef: 190, spd: 62, eva: 28, lck: 30 },
    affinity: { shadow: 'resist', holy: 'weak' },
    immune: ['charm', 'sleep'],
    exp: 3050, gold: 3200, drops: [{ id: 'gainsayknife', chance: 0.04 }],
    steal: [{ id: 'quietedge', chance: 0.1 }],
    ai: [
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'Spend It All', power: 2.8 } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'Wide Swing', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Answer For It', power: 1.8 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Brood Acre (Lv 60-69) =======================
  /**
   * Eleven acres of failed hedge apiary that stopped being about bees. The
   * ground is one animal now, or nine thousand of them, depending on how
   * closely you are prepared to look.
   *
   * The Acre is the only region in the game whose formations run four and five
   * deep, and everything in it is built to make that survivable to author and
   * unsurvivable to ignore: hit points and defence well under the curve, gold
   * and experience under it too, and offence that only becomes frightening in
   * aggregate. Four creatures at speed seventy take roughly four turns to a
   * party member's one, and no amount of single-target excellence answers
   * that. Blanket spells, flasks, Sundering Charges and anything with
   * `target: 'all'` do.
   *
   * The two exceptions are the point of the exception: the Acre Widow is worth
   * killing, and the Waste Weevil is eleven thousand hit points of reason not
   * to start at the left.
   */
  brooddrone: {
    id: 'brooddrone', name: 'Brood Drone', level: 60,
    look: { plan: 'insect', scale: 0.55, legs: 6, color: '#4a4324', accent: '#8d7c4a', eyeColor: '#ffd76a' },
    stats: { hp: 2600, mp: 40, atk: 250, def: 150, mag: 90, mdef: 130, spd: 66, eva: 24, lck: 12 },
    affinity: { fire: 'weak', wind: 'weak' },
    exp: 900, gold: 700, drops: [{ id: 'potion', chance: 0.3 }],
    steal: [{ id: 'antidote', chance: 0.4 }],
    ai: [{ if: 'always', do: { kind: 'attack' } }],
  },
  chaffmidge: {
    id: 'chaffmidge', name: 'Chaff Midge', level: 61,
    look: { plan: 'insect', scale: 0.45, legs: 6, color: '#6b5d37', accent: '#94bf55', eyeColor: '#ffe45e' },
    stats: { hp: 2200, mp: 60, atk: 244, def: 142, mag: 120, mdef: 128, spd: 88, eva: 52, lck: 20 },
    affinity: { wind: 'absorb', ice: 'weak' },
    exp: 920, gold: 660, drops: [{ id: 'potion', chance: 0.3 }],
    steal: [{ id: 'eyedrops', chance: 0.4 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'galecut' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  broodnurse: {
    id: 'broodnurse', name: 'Brood Nurse', level: 62,
    look: { plan: 'insect', scale: 1.0, legs: 8, color: '#4b382d', accent: '#d5766a', eyeColor: '#e0574f', stinger: true },
    stats: { hp: 4400, mp: 200, atk: 268, def: 180, mag: 160, mdef: 170, spd: 52, eva: 22, lck: 16 },
    affinity: { fire: 'weak', poison: 'immune' },
    immune: ['poison', 'venom'],
    exp: 1500, gold: 1200, drops: [{ id: 'hipotion', chance: 0.35 }],
    steal: [{ id: 'antidote', chance: 0.4 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Count The Litter', power: 2.0, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Feed Them', power: 1.3, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  acrecrow: {
    id: 'acrecrow', name: 'Acre Crow', level: 63,
    look: { plan: 'avian', scale: 0.7, color: '#2b2933', accent: '#4e4a52', eyeColor: '#ffe45e' },
    stats: { hp: 3600, mp: 120, atk: 272, def: 164, mag: 140, mdef: 156, spd: 82, eva: 44, lck: 26 },
    affinity: { holy: 'weak', shadow: 'resist' },
    exp: 1300, gold: 1100, drops: [{ id: 'eyedrops', chance: 0.4 }],
    steal: [{ id: 'potion', chance: 0.45 }],
    ai: [
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Eye First', power: 1.2, status: { blind: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  litterhound: {
    id: 'litterhound', name: 'Litter Hound', level: 64,
    look: { plan: 'quadruped', scale: 0.8, color: '#7a4a22', accent: '#332c1c', eyeColor: '#ff7a2f' },
    stats: { hp: 4200, mp: 40, atk: 288, def: 172, mag: 96, mdef: 150, spd: 78, eva: 34, lck: 20 },
    affinity: { earth: 'resist', ice: 'weak' },
    exp: 1450, gold: 1200, drops: [{ id: 'hipotion', chance: 0.35 }],
    steal: [{ id: 'potion', chance: 0.45 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'One Of Nine', power: 1.9 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  spawnbriar: {
    id: 'spawnbriar', name: 'Spawn Briar', level: 65,
    look: { plan: 'plant', scale: 1.1, color: '#496035', accent: '#2f4a36', eyeColor: '#94bf55' },
    stats: { hp: 6000, mp: 220, atk: 278, def: 194, mag: 180, mdef: 182, spd: 26, eva: 4, lck: 8 },
    affinity: { fire: 'weak', earth: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'charm', 'blind'],
    exp: 2200, gold: 1800, drops: [{ id: 'balm', chance: 0.35 }],
    steal: [{ id: 'panacea', chance: 0.22 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Broadcast', power: 1.4, status: { poison: 60 }, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  huskbrood: {
    id: 'huskbrood', name: 'Husk Brood', level: 66,
    look: { plan: 'undead', scale: 0.9, color: '#ddccab', accent: '#4d422a', weapon: 'spear', eyeColor: '#94bf55' },
    stats: { hp: 5000, mp: 160, atk: 292, def: 182, mag: 150, mdef: 168, spd: 48, eva: 18, lck: 12 },
    affinity: { holy: 'weak', fire: 'weak', shadow: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom'],
    exp: 1900, gold: 1600, drops: [{ id: 'softstone', chance: 0.35 }],
    steal: [{ id: 'hipotion', chance: 0.4 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Close Up The Row', power: 1.8, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  acrewidow: {
    id: 'acrewidow', name: 'Acre Widow', level: 68,
    look: { plan: 'insect', scale: 1.35, legs: 8, color: '#3a2226', accent: '#ab8018', eyeColor: '#ff7a2f', stinger: true },
    stats: { hp: 8200, mp: 280, atk: 316, def: 198, mag: 194, mdef: 190, spd: 54, eva: 26, lck: 20 },
    affinity: { fire: 'resist', ice: 'weak', poison: 'absorb' },
    immune: ['poison', 'venom', 'blind', 'stop'],
    exp: 3600, gold: 3900, drops: [{ id: 'broodfang', chance: 0.05 }],
    steal: [{ id: 'panacea', chance: 0.3 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Everything I Have', power: 2.4, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Brood Sting', power: 1.5, status: { venom: 60 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  wasteweevil: {
    id: 'wasteweevil', name: 'Waste Weevil', level: 69,
    // Eleven thousand hit points and nothing on it. It is here so that the
    // player who opens on the biggest silhouette spends the whole fight on it.
    look: { plan: 'insect', scale: 1.3, legs: 6, color: '#8d7c4a', accent: '#4a4324', eyeColor: '#dbc891' },
    stats: { hp: 11000, mp: 60, atk: 264, def: 200, mag: 100, mdef: 196, spd: 20, eva: 2, lck: 6 },
    affinity: { bolt: 'weak', earth: 'resist', poison: 'immune' },
    immune: ['poison', 'venom', 'stone', 'stop', 'slow', 'blind', 'sleep', 'confuse', 'charm'],
    exp: 3300, gold: 2400, drops: [{ id: 'balm', chance: 0.4 }],
    steal: [{ id: 'softstone', chance: 0.4 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Grind Through', power: 1.3, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ========================= the Quench (Lv 66-76) =========================
  /**
   * A cooling yard the width of a town, where the Engines put their metal to
   * take the heat out of it. The pits are still full and still working, and
   * everything that has grown up around them has arranged itself around a
   * supply of one particular kind of energy.
   *
   * The Glass Reach taught the player to check an affinity before casting.
   * This teaches the harder half of the same lesson, because `doAttack` reads
   * `actor.weapon.element` on *every ordinary swing* — not only on a named
   * move — so an elemental weapon applies its element four hundred times a
   * dungeon without ever being chosen. A party carrying Quenchbrand into the
   * Temper is holding a healing item and swinging it.
   *
   * Between them these eight and the three hunts drink water, fire, ice,
   * lightning, aether, earth, shadow, wind and holy. The answer is the plain
   * rung of each weapon line — Oathcut, the Harrow Fold, the Overwind Lance,
   * Ironhail, Blooding Wraps, Brood Claws, Wager Stones, the Gainsay Knife —
   * every one of which is a purchasable step *below* the elemental one. That
   * gap is the price of the lesson and it is meant to be felt.
   */
  slakemaw: {
    id: 'slakemaw', name: 'Slake Maw', level: 66,
    look: { plan: 'blob', scale: 1.5, color: '#12566b', accent: '#25404e', eyeColor: '#96f0f5', eyeCount: 3 },
    stats: { hp: 8000, mp: 200, atk: 300, def: 198, mag: 180, mdef: 190, spd: 24, eva: 4, lck: 8 },
    affinity: { water: 'absorb', bolt: 'weak', fire: 'resist', poison: 'immune' },
    immune: ['poison', 'venom', 'ko', 'stop'],
    exp: 3400, gold: 3600, drops: [{ id: 'xpotion', chance: 0.3 }],
    steal: [{ id: 'quenchward', chance: 0.05 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Slake', power: 2.2, element: 'water', drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  quenchmoth: {
    id: 'quenchmoth', name: 'Quench Moth', level: 67,
    look: { plan: 'avian', scale: 0.8, color: '#7d4436', accent: '#ab8018', eyeColor: '#ff7a2f' },
    stats: { hp: 7400, mp: 320, atk: 306, def: 180, mag: 200, mdef: 186, spd: 74, eva: 42, lck: 28 },
    affinity: { fire: 'absorb', water: 'weak', ice: 'weak' },
    immune: ['seizure'],
    exp: 3500, gold: 3700, drops: [{ id: 'emberflask', chance: 0.4 }],
    steal: [{ id: 'emberward', chance: 0.12 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'pyre' } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Scale Off', power: 1.4, element: 'fire', status: { seizure: 50 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  temperhound: {
    id: 'temperhound', name: 'Temper Hound', level: 68,
    look: { plan: 'quadruped', scale: 1.15, color: '#9ccdd4', accent: '#37606f', eyeColor: '#e8edf5', spines: true },
    stats: { hp: 8000, mp: 120, atk: 322, def: 190, mag: 140, mdef: 180, spd: 70, eva: 30, lck: 20 },
    affinity: { ice: 'absorb', fire: 'weak' },
    immune: ['freeze', 'sleep'],
    exp: 3650, gold: 3800, drops: [{ id: 'frostflask', chance: 0.4 }],
    steal: [{ id: 'frostward', chance: 0.12 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Harden Off', power: 2.2 } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Cold Shut', power: 1.5, element: 'ice', status: { freeze: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  drawnwire: {
    id: 'drawnwire', name: 'The Drawn Wire', level: 69,
    look: { plan: 'construct', scale: 1.1, color: '#a6b0bc', accent: '#4a4324', eyeColor: '#f7d968' },
    stats: { hp: 8600, mp: 260, atk: 316, def: 200, mag: 190, mdef: 196, spd: 34, eva: 6, lck: 8 },
    affinity: { bolt: 'absorb', water: 'weak', earth: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone'],
    exp: 3800, gold: 4100, drops: [{ id: 'stormflask', chance: 0.4 }],
    steal: [{ id: 'stormward', chance: 0.12 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Draw Through', power: 2.2, element: 'bolt', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'arcflash' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  slackwater: {
    id: 'slackwater', name: 'Slack Water', level: 70,
    look: { plan: 'floater', scale: 1.0, color: '#25404e', eyeColor: '#3fc6d6', eyeCount: 1, tendrils: true },
    stats: { hp: 8400, mp: 500, atk: 300, def: 186, mag: 216, mdef: 198, spd: 60, eva: 36, lck: 30 },
    affinity: { aether: 'absorb', holy: 'weak', bolt: 'resist' },
    immune: ['sleep', 'poison', 'silence'],
    exp: 4000, gold: 4300, drops: [{ id: 'hitonic', chance: 0.4 }],
    steal: [{ id: 'wellheart', chance: 0.04 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  swarfspinner: {
    id: 'swarfspinner', name: 'Swarf Spinner', level: 71,
    look: { plan: 'insect', scale: 1.25, legs: 8, color: '#666c74', accent: '#8a6a23', eyeColor: '#ffd76a', stinger: true },
    stats: { hp: 9200, mp: 240, atk: 328, def: 198, mag: 186, mdef: 192, spd: 52, eva: 24, lck: 18 },
    affinity: { earth: 'absorb', wind: 'weak', fire: 'resist' },
    immune: ['poison', 'blind', 'stop'],
    exp: 4200, gold: 4500, drops: [{ id: 'panacea', chance: 0.3 }],
    steal: [{ id: 'stoneheart', chance: 0.04 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Wind In Swarf', power: 1.5, status: { stop: 55 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  scalewight: {
    id: 'scalewight', name: 'Scale Wight', level: 73,
    look: { plan: 'undead', scale: 1.2, color: '#918f98', accent: '#2b2933', weapon: 'axe', helmet: true, eyeColor: '#d63fb3' },
    stats: { hp: 10000, mp: 300, atk: 340, def: 198, mag: 200, mdef: 194, spd: 46, eva: 16, lck: 12 },
    affinity: { shadow: 'absorb', holy: 'weak', fire: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'stone'],
    exp: 4550, gold: 4900, drops: [{ id: 'xpotion', chance: 0.3 }],
    steal: [{ id: 'witheringclaws', chance: 0.03 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Hammerscale', power: 1.7, element: 'shadow', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  thecoldshut: {
    id: 'thecoldshut', name: 'The Cold Shut', level: 76,
    look: { plan: 'humanoid', scale: 1.15, color: '#b8b6bd', accent: '#25404e', metal: '#a6b0bc', weapon: 'sword', armored: true, eyeColor: '#96f0f5' },
    stats: { hp: 11500, mp: 340, atk: 358, def: 200, mag: 206, mdef: 196, spd: 58, eva: 22, lck: 20 },
    affinity: { wind: 'absorb', earth: 'weak', aether: 'resist' },
    immune: ['sleep', 'charm', 'stop', 'blind'],
    exp: 4950, gold: 5400, drops: [{ id: 'megalixir', chance: 0.08 }],
    steal: [{ id: 'oathcut', chance: 0.04 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'The Flaw Opens', power: 2.4 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Shut Cold', power: 1.8, element: 'wind', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================== the Overwind (Lv 74-85) ========================
  /**
   * The relay road, running out past the Long Silence to nowhere anybody has
   * been able to name. The Hollow Meridian counted; this place simply goes
   * first, and then goes first again.
   *
   * `atbRate` is `(24 + speed) / 42`, so a creature at speed 110 fills its
   * gauge at better than three per second where a party member at forty
   * manages one and a half. Everything here lives in the nineties and above,
   * and everything here is correspondingly *soft*: defence in the seventies
   * below the cap, hit points a rung under the Quench, damage per blow lower
   * than anything of its level. The danger is not the hit. It is that there
   * are four of them before your healer's bar has crossed the halfway mark.
   *
   * The counters are all on the party's own clock and all of them cost a slot:
   * Quicken and Quicken All, Mire and the Nerve Tonic, Sand Glass, Swift Band,
   * the Overwind Band, and the plain discipline of killing the fastest thing
   * on the field first rather than the largest.
   */
  theoutrunner: {
    id: 'theoutrunner', name: 'The Outrunner', level: 74,
    look: { plan: 'quadruped', scale: 1.05, color: '#c6cedb', accent: '#5b6674', eyeColor: '#ffd76a' },
    stats: { hp: 8600, mp: 60, atk: 316, def: 168, mag: 110, mdef: 156, spd: 98, eva: 44, lck: 26 },
    affinity: { wind: 'resist', earth: 'weak' },
    exp: 4750, gold: 5100, drops: [{ id: 'xpotion', chance: 0.3 }],
    steal: [{ id: 'sandglass', chance: 0.12 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Ahead Of It', power: 2.0 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  flickermoth: {
    id: 'flickermoth', name: 'Flicker Moth', level: 75,
    look: { plan: 'avian', scale: 0.65, color: '#e8edf5', accent: '#9ccdd4', eyeColor: '#fff3b8' },
    stats: { hp: 7800, mp: 300, atk: 310, def: 158, mag: 206, mdef: 168, spd: 106, eva: 56, lck: 32 },
    affinity: { bolt: 'absorb', earth: 'weak' },
    immune: ['blind', 'slow'],
    exp: 4850, gold: 5200, drops: [{ id: 'stormflask', chance: 0.4 }],
    steal: [{ id: 'swiftband', chance: 0.25 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'arcflash' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  springhusk: {
    id: 'springhusk', name: 'Spring Husk', level: 76,
    look: { plan: 'undead', scale: 1.05, color: '#dedbe0', accent: '#4a4324', weapon: 'sword', eyeColor: '#f7d968' },
    stats: { hp: 9400, mp: 200, atk: 330, def: 176, mag: 176, mdef: 172, spd: 90, eva: 34, lck: 16 },
    affinity: { holy: 'weak', shadow: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'doom', 'slow'],
    exp: 4950, gold: 5350, drops: [{ id: 'softstone', chance: 0.4 }],
    steal: [{ id: 'nervetonic', chance: 0.4 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Wound Too Far', power: 1.6 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  quickthorn: {
    id: 'quickthorn', name: 'Quickthorn', level: 77,
    // A plant at speed eighty-eight, which is the joke and also the warning:
    // in the Overwind the silhouette tells you nothing about the order.
    look: { plan: 'plant', scale: 1.0, color: '#496035', accent: '#94bf55', eyeColor: '#ffe45e' },
    stats: { hp: 10200, mp: 240, atk: 324, def: 186, mag: 196, mdef: 184, spd: 88, eva: 20, lck: 12 },
    affinity: { fire: 'weak', earth: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'stop', 'slow'],
    exp: 5100, gold: 5450, drops: [{ id: 'balm', chance: 0.4 }],
    steal: [{ id: 'panacea', chance: 0.35 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Come Up Overnight', power: 1.5, status: { poison: 55 }, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  theerrand: {
    id: 'theerrand', name: 'The Errand', level: 78,
    look: { plan: 'humanoid', scale: 1.0, color: '#96603f', accent: '#33477c', weapon: 'spear', eyeColor: '#ffd76a' },
    stats: { hp: 10000, mp: 280, atk: 336, def: 178, mag: 190, mdef: 178, spd: 100, eva: 40, lck: 28 },
    affinity: { aether: 'resist', bolt: 'weak' },
    immune: ['slow', 'stop', 'sleep'],
    exp: 5300, gold: 5700, drops: [{ id: 'hitonic', chance: 0.4 }],
    steal: [{ id: 'overwindband', chance: 0.08 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Pass Through', power: 1.5, target: 'all' } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Handed Off', power: 1.3, status: { slow: 60 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  coursinghound: {
    id: 'coursinghound', name: 'Coursing Hound', level: 79,
    look: { plan: 'quadruped', scale: 1.1, color: '#4e4a52', accent: '#22242a', eyeColor: '#e0574f', spines: true },
    stats: { hp: 10600, mp: 80, atk: 348, def: 172, mag: 120, mdef: 164, spd: 110, eva: 46, lck: 24 },
    affinity: { wind: 'absorb', ice: 'weak' },
    immune: ['slow', 'stop'],
    exp: 5450, gold: 5850, drops: [{ id: 'xpotion', chance: 0.35 }],
    steal: [{ id: 'sprinter', chance: 0.3 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Run It Down', power: 2.2 } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Hamstring', power: 1.2, status: { slow: 65 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  thewhirligig: {
    id: 'thewhirligig', name: 'The Whirligig', level: 81,
    look: { plan: 'construct', scale: 1.2, color: '#d8ac31', accent: '#3b2c12', eyeColor: '#fff3b8' },
    stats: { hp: 12000, mp: 300, atk: 344, def: 196, mag: 200, mdef: 192, spd: 96, eva: 16, lck: 8 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone', 'slow'],
    exp: 5800, gold: 6300, drops: [{ id: 'shrapnel', chance: 0.4 }],
    steal: [{ id: 'wardstone', chance: 0.35 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'attack', name: 'Spin Up', power: 1.4, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  snapwidow: {
    id: 'snapwidow', name: 'Snap Widow', level: 83,
    look: { plan: 'insect', scale: 1.2, legs: 8, color: '#241636', accent: '#8a5ce0', eyeColor: '#d63fb3', stinger: true },
    stats: { hp: 13000, mp: 320, atk: 362, def: 186, mag: 210, mdef: 188, spd: 102, eva: 40, lck: 22 },
    affinity: { shadow: 'absorb', holy: 'weak', poison: 'immune' },
    immune: ['poison', 'venom', 'stop', 'slow', 'blind'],
    exp: 6300, gold: 6900, drops: [{ id: 'panacea', chance: 0.4 }],
    steal: [{ id: 'wardingcord', chance: 0.2 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Snap', power: 2.4 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Set The Trip', power: 1.5, status: { paralysis: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  thefarrunner: {
    id: 'thefarrunner', name: 'The Far Runner', level: 85,
    look: { plan: 'humanoid', scale: 1.1, color: '#b8b6bd', accent: '#241636', metal: '#8a5ce0', weapon: 'sword', eyeColor: '#d63fb3' },
    stats: { hp: 15500, mp: 400, atk: 396, def: 192, mag: 224, mdef: 194, spd: 118, eva: 48, lck: 34 },
    affinity: { wind: 'absorb', shadow: 'resist', earth: 'weak' },
    immune: ['slow', 'stop', 'sleep', 'paralysis', 'charm'],
    exp: 7000, gold: 7800, drops: [{ id: 'overwindchakram', chance: 0.06 }],
    steal: [{ id: 'overwindband', chance: 0.2 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Nothing Catches It', power: 2.6, target: 'all' } },
      { if: 'turnEvery', n: 2, do: { kind: 'attack', name: 'Past You', power: 1.6 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ============================== bosses ==================================
  /**
   * Fifteen, two or three to a region, and every one of them is the
   * examination for its region's lesson rather than a larger version of its
   * wildlife.
   *
   * The Yardmaster opens the pens on a party that never bought a Steadying
   * Dram. The Kindly One Zombies the whole field at a third and then waits to
   * see whether the healer has noticed. The Answering has the shortest
   * immunity list of any boss in the game and three separate rules that read
   * what you did to it. The Temper drinks fire and holds the only copy of the
   * best fire sword in the game, which is as close to an argument as data can
   * make.
   *
   * A `hasStatus` rule is checked against the boss's own immunity list before
   * it is written, so no rule here is unreachable — the Cold Forge is not
   * blind-immune, the Long Run is not silence-immune, and the Whole Acre is
   * not poison-immune, each of them deliberately and each of them the seam the
   * fight is meant to be opened along.
   *
   * Rewards sit at about five times a regular of the same level, matching
   * volume three, for the same reason: a hunt should be worth doing and should
   * never be worth doing *instead of* the plot.
   */
  theyardmaster: {
    id: 'theyardmaster', name: 'The Yardmaster', level: 46, boss: true,
    look: { plan: 'humanoid', scale: 1.7, color: '#96603f', accent: '#3a2226', metal: '#8a6a23', weapon: 'axe', armored: true, helmet: true, eyeColor: '#e0574f' },
    stats: { hp: 16000, mp: 600, atk: 250, def: 198, mag: 170, mdef: 190, spd: 44, eva: 12, lck: 18 },
    affinity: { bolt: 'weak', fire: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm', 'berserk'],
    exp: 7500, gold: 9000, drops: [{ id: 'bloodinghelm', chance: 1.0 }],
    steal: [{ id: 'marrowichor', chance: 0.4 }, { id: 'bloodironband', chance: 0.2 }],
    intro: 'Everything that comes through the gate goes through the gate.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 4, do: { kind: 'attack', name: 'Nothing Walks Out', power: 3.0, target: 'all' } },
      { if: 'hpBelow', v: 0.4, phase: 3, do: { kind: 'attack', name: 'Open The Pens', power: 2.2, status: { berserk: 70 }, target: 'all' } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'attack', name: 'Take The Goad', power: 1.9, status: { berserk: 60 } } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'Swing Where You Were', power: 2.4, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'mire' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Poleaxe', power: 1.7, status: { paralysis: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thebutchersbill: {
    id: 'thebutchersbill', name: "The Butcher's Bill", level: 50, boss: true,
    look: { plan: 'humanoid', scale: 1.9, color: '#9a6147', accent: '#8b2a2c', metal: '#a2acbb', weapon: 'axe', horns: true, eyeColor: '#ff7a2f' },
    stats: { hp: 22000, mp: 700, atk: 272, def: 200, mag: 186, mdef: 194, spd: 40, eva: 8, lck: 14 },
    affinity: { holy: 'weak', shadow: 'absorb', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'silence', 'berserk'],
    exp: 9000, gold: 11000, drops: [{ id: 'bloodingplate', chance: 1.0 }],
    steal: [{ id: 'oathcut', chance: 0.08 }, { id: 'megalixir', chance: 0.3 }],
    intro: 'It is a long bill, and every line of it was somebody.',
    ai: [
      { if: 'hpBelow', v: 0.12, phase: 4, do: { kind: 'attack', name: 'Settle Up', power: 3.2, target: 'all', drain: true } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.65, phase: 2, do: { kind: 'attack', name: 'Both Pens', power: 2.2, status: { berserk: 65 }, target: 'all' } },
      { if: 'allyDown', do: { kind: 'attack', name: 'One Less Line', power: 2.4 } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Hang It Up', power: 1.6, status: { paralysis: 50 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Quarter', power: 1.9 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thekindlyone: {
    id: 'thekindlyone', name: 'The Kindly One', level: 54, boss: true,
    look: { plan: 'floater', scale: 1.9, color: '#4e4a52', eyeColor: '#dedbe0', eyeCount: 3, tendrils: true },
    stats: { hp: 26000, mp: 1000, atk: 262, def: 190, mag: 212, mdef: 198, spd: 52, eva: 28, lck: 26 },
    affinity: { holy: 'weak', shadow: 'absorb', earth: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison', 'zombie'],
    exp: 12000, gold: 14500, drops: [{ id: 'kindlyvestment', chance: 1.0 }],
    steal: [{ id: 'witheringclaws', chance: 0.08 }, { id: 'megalixir', chance: 0.35 }],
    intro: 'Lie down. Everyone else did, and look how quiet they are.',
    ai: [
      { if: 'hpBelow', v: 0.12, phase: 4, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'attack', name: 'The Kindness', power: 2.6, status: { zombie: 70 }, target: 'all' } },
      { if: 'hpBelow', v: 0.65, phase: 2, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'Feel For You', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Small Mercy', power: 1.7, status: { zombie: 50 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thelongbarrow: {
    id: 'thelongbarrow', name: 'The Long Barrow', level: 58, boss: true,
    look: { plan: 'plant', scale: 2.0, color: '#4b382d', accent: '#2b2933', eyeColor: '#dbc891' },
    stats: { hp: 30000, mp: 800, atk: 290, def: 200, mag: 206, mdef: 196, spd: 24, eva: 4, lck: 10 },
    affinity: { fire: 'weak', earth: 'absorb', shadow: 'absorb', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'venom', 'confuse', 'charm', 'zombie'],
    exp: 13800, gold: 16500, drops: [{ id: 'gravewardknot', chance: 1.0 }],
    steal: [{ id: 'ninthcrown', chance: 0.06 }, { id: 'megalixir', chance: 0.4 }],
    intro: 'Nine hundred of them lengthways, and room yet.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 4, do: { kind: 'attack', name: 'Everyone Fits', power: 3.0, target: 'all' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'attack', name: 'Take The Whole Row', power: 2.4, target: 'all', drain: true } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Turn The Sod', power: 1.8, status: { zombie: 60 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Settle', power: 1.6 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theanswering: {
    id: 'theanswering', name: 'The Answering', level: 62, boss: true,
    // The shortest immunity list of any boss in the game, and that is the
    // fight: three of its six rules only exist if the player reaches for the
    // lock that seems obvious.
    look: { plan: 'floater', scale: 2.0, color: '#12566b', eyeColor: '#96f0f5', eyeCount: 3, tendrils: true },
    stats: { hp: 34000, mp: 1200, atk: 300, def: 194, mag: 226, mdef: 200, spd: 58, eva: 30, lck: 30 },
    affinity: { aether: 'absorb', bolt: 'resist', holy: 'weak' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'charm'],
    exp: 15500, gold: 18500, drops: [{ id: 'answeringshield', chance: 1.0 }],
    steal: [{ id: 'answeringmirror', chance: 0.1 }, { id: 'megalixir', chance: 0.4 }],
    intro: 'Say something. It has been a very long time since anything did.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'attack', name: 'Answer In Kind', power: 2.4, target: 'all' } },
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'By Hand, Then', power: 2.8, target: 'all' } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'It Does Not Need To See', power: 2.4, target: 'all' } },
      { if: 'hasStatus', status: 'slow', do: { kind: 'attack', name: 'All Of It At Once', power: 2.6 } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thegainsayer: {
    id: 'thegainsayer', name: 'The Gainsayer', level: 65, boss: true,
    look: { plan: 'humanoid', scale: 1.75, color: '#b8b6bd', accent: '#4a4324', metal: '#d8ac31', weapon: 'staff', horns: true, eyeColor: '#fff3b8' },
    stats: { hp: 37000, mp: 1300, atk: 316, def: 196, mag: 232, mdef: 200, spd: 60, eva: 24, lck: 32 },
    affinity: { holy: 'absorb', shadow: 'weak', aether: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'charm', 'confuse'],
    exp: 17000, gold: 20000, drops: [{ id: 'echostone', chance: 1.0 }],
    steal: [{ id: 'thelongargument', chance: 0.1 }, { id: 'megalixir', chance: 0.45 }],
    intro: 'Whatever you were about to do. Do the other one.',
    ai: [
      { if: 'hpBelow', v: 0.12, phase: 4, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'attack', name: 'The Contrary', power: 2.8, target: 'all' } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'benediction' } },
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'Then Nothing Is Said', power: 2.6, target: 'all' } },
      { if: 'hasStatus', status: 'slow', do: { kind: 'attack', name: 'Then Take Your Time', power: 2.4, status: { stop: 60 }, target: 'all' } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'Then Neither Of Us Looks', power: 2.2, status: { blind: 70 }, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sanctus' } },
      { if: 'always', do: { kind: 'attack', name: 'Contradiction', power: 1.8 } },
    ],
  },

  theacremother: {
    id: 'theacremother', name: 'The Acre Mother', level: 68, boss: true,
    look: { plan: 'insect', scale: 2.1, legs: 8, color: '#3a2226', accent: '#d5766a', eyeColor: '#e0574f', stinger: true, eyeCount: 6 },
    stats: { hp: 40000, mp: 1000, atk: 320, def: 198, mag: 216, mdef: 196, spd: 54, eva: 22, lck: 20 },
    affinity: { fire: 'weak', poison: 'absorb', earth: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'venom', 'blind', 'charm'],
    exp: 18000, gold: 21500, drops: [{ id: 'broodfang', chance: 1.0 }],
    steal: [{ id: 'broodleathers', chance: 0.25 }, { id: 'megalixir', chance: 0.4 }],
    intro: 'Nine thousand of them, and she knows each one by the sound it makes.',
    ai: [
      { if: 'hpBelow', v: 0.12, phase: 4, do: { kind: 'attack', name: 'All Of Them At Once', power: 3.2, target: 'all' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'attack', name: 'The Whole Litter', power: 2.6, status: { venom: 70 }, target: 'all' } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      { if: 'allyDown', do: { kind: 'attack', name: 'Grief Of The Acre', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Lay In', power: 1.6, status: { stop: 55 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Brood Sting', power: 1.9, status: { venom: 60 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thelastlitter: {
    id: 'thelastlitter', name: 'The Last Litter', level: 71, boss: true,
    look: { plan: 'blob', scale: 1.9, color: '#4b382d', accent: '#d5766a', eyeColor: '#ffe45e', eyeCount: 3 },
    stats: { hp: 43000, mp: 900, atk: 332, def: 196, mag: 210, mdef: 192, spd: 48, eva: 14, lck: 12 },
    affinity: { fire: 'weak', earth: 'absorb', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'venom', 'confuse'],
    exp: 19500, gold: 23000, drops: [{ id: 'broodleathers', chance: 1.0 }],
    steal: [{ id: 'broodveil', chance: 0.3 }, { id: 'megalixir', chance: 0.4 }],
    intro: 'It is not one thing. It has never once been one thing.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 4, do: { kind: 'attack', name: 'Split Again', power: 3.0, target: 'all' } },
      { if: 'hpBelow', v: 0.4, phase: 3, do: { kind: 'attack', name: 'Come Apart', power: 2.4, target: 'all', drain: true } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Swallow One', power: 1.9, drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Wash Over', power: 1.7, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thewholeacre: {
    id: 'thewholeacre', name: 'The Whole Acre', level: 74, boss: true,
    // Not poison-immune, which for a plant of this size is a decision: Blight
    // is the obvious opener and it is also the rule that turns the fight.
    look: { plan: 'plant', scale: 2.2, color: '#4a4324', accent: '#496035', eyeColor: '#ffe45e' },
    stats: { hp: 48000, mp: 1100, atk: 344, def: 200, mag: 224, mdef: 198, spd: 30, eva: 6, lck: 10 },
    affinity: { fire: 'weak', earth: 'absorb', wind: 'weak' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'venom', 'charm', 'blind'],
    exp: 21500, gold: 25500, drops: [{ id: 'broodveil', chance: 1.0 }],
    steal: [{ id: 'ledgerofsmalldebts', chance: 0.2 }, { id: 'megalixir', chance: 0.5 }],
    intro: 'The field is the animal. It has been the animal for eleven years.',
    ai: [
      { if: 'hpBelow', v: 0.1, phase: 4, do: { kind: 'attack', name: 'Every Furrow', power: 3.4, target: 'all' } },
      { if: 'hpBelow', v: 0.3, phase: 3, do: { kind: 'attack', name: 'Root And Branch', power: 2.8, element: 'earth', target: 'all' } },
      { if: 'hpBelow', v: 0.6, phase: 2, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'hasStatus', status: 'poison', do: { kind: 'attack', name: 'It Is All Poison Here', power: 2.6, target: 'all' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Broadcast', power: 2.0, status: { poison: 70 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Bind The Rows', power: 1.8, status: { stop: 55 }, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theslakingpit: {
    id: 'theslakingpit', name: 'The Slaking Pit', level: 76, boss: true,
    look: { plan: 'blob', scale: 2.1, color: '#1a3c48', accent: '#12566b', eyeColor: '#96f0f5', eyeCount: 3 },
    stats: { hp: 52000, mp: 1200, atk: 352, def: 198, mag: 228, mdef: 198, spd: 40, eva: 10, lck: 12 },
    affinity: { water: 'absorb', ice: 'absorb', bolt: 'weak', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'venom', 'confuse', 'silence'],
    exp: 23000, gold: 27500, drops: [{ id: 'quenchlance', chance: 1.0 }],
    steal: [{ id: 'stillfold', chance: 0.08 }, { id: 'megalixir', chance: 0.5 }],
    intro: 'Nine hundred blades went in hot. It is still not full.',
    ai: [
      { if: 'hpBelow', v: 0.1, phase: 4, do: { kind: 'attack', name: 'Take The Temper Out', power: 3.2, target: 'all', drain: true } },
      { if: 'hpBelow', v: 0.3, phase: 3, do: { kind: 'attack', name: 'Everything Cools', power: 2.8, element: 'water', target: 'all' } },
      { if: 'hpBelow', v: 0.6, phase: 2, do: { kind: 'spell', spell: 'glaciate' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Draw The Heat', power: 2.0, element: 'ice', drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Slake', power: 1.8, element: 'water' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thetemper: {
    id: 'thetemper', name: 'The Temper', level: 78, boss: true,
    // Drinks fire, and is carrying the best fire sword in the game. The player
    // who beats it with plain steel is handed the reason plain steel exists.
    look: { plan: 'construct', scale: 2.0, color: '#7d4436', accent: '#3a2226', eyeColor: '#ff7a2f', cannons: true },
    stats: { hp: 56000, mp: 1200, atk: 366, def: 200, mag: 232, mdef: 200, spd: 44, eva: 8, lck: 10 },
    affinity: { fire: 'absorb', earth: 'absorb', water: 'weak', ice: 'weak', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'confuse', 'silence', 'blind', 'berserk'],
    exp: 25000, gold: 29500, drops: [{ id: 'quenchbrand', chance: 1.0 }],
    steal: [{ id: 'quenchcrown', chance: 0.3 }, { id: 'megalixir', chance: 0.5 }],
    intro: 'It has held one temperature since before there was a word for it.',
    ai: [
      { if: 'hpBelow', v: 0.1, phase: 4, do: { kind: 'spell', spell: 'conflagrate' } },
      { if: 'hpBelow', v: 0.3, phase: 3, do: { kind: 'attack', name: 'Hold The Heat', power: 3.0, element: 'fire', target: 'all' } },
      { if: 'hpBelow', v: 0.6, phase: 2, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'hasStatus', status: 'slow', do: { kind: 'attack', name: 'Anneal Slowly', power: 2.6, status: { seizure: 65 }, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Draw Down The Bloom', power: 2.0, element: 'earth', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'pyre' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thecoldforge: {
    id: 'thecoldforge', name: 'The Cold Forge', level: 80, boss: true,
    look: { plan: 'construct', scale: 2.3, color: '#414954', accent: '#12566b', eyeColor: '#96f0f5', cannons: true, treads: true, eyeCount: 3 },
    stats: { hp: 60000, mp: 1400, atk: 380, def: 200, mag: 240, mdef: 200, spd: 46, eva: 8, lck: 12 },
    affinity: { bolt: 'absorb', aether: 'absorb', holy: 'absorb', water: 'weak', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'silence', 'poison', 'berserk'],
    exp: 27000, gold: 32000, drops: [{ id: 'quenchgauntlets', chance: 1.0 }],
    steal: [{ id: 'answeringmirror', chance: 0.12 }, { id: 'megalixir', chance: 0.6 }],
    intro: 'No fire in it anywhere. It has been making things regardless.',
    ai: [
      { if: 'hpBelow', v: 0.08, phase: 5, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.25, phase: 4, do: { kind: 'attack', name: 'First Heat', power: 3.4, element: 'aether', target: 'all' } },
      { if: 'hpBelow', v: 0.45, phase: 3, do: { kind: 'spell', spell: 'benediction' } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'thunderhead' } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'It Works By Feel', power: 2.6, target: 'all' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Lance Array', power: 2.2, element: 'bolt', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Cold Work', power: 2.0 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theovertaking: {
    id: 'theovertaking', name: 'The Overtaking', level: 82, boss: true,
    look: { plan: 'quadruped', scale: 2.0, color: '#4e4a52', accent: '#241636', eyeColor: '#d63fb3', spines: true },
    stats: { hp: 66000, mp: 1200, atk: 386, def: 194, mag: 226, mdef: 194, spd: 112, eva: 34, lck: 24 },
    affinity: { wind: 'absorb', shadow: 'absorb', earth: 'weak', holy: 'weak' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'charm', 'paralysis'],
    exp: 29500, gold: 35000, drops: [{ id: 'overwindchakram', chance: 1.0 }],
    steal: [{ id: 'overwindcoat', chance: 0.3 }, { id: 'megalixir', chance: 0.5 }],
    intro: 'It was behind you at the top of the rise. It is not, now.',
    ai: [
      { if: 'hpBelow', v: 0.1, phase: 4, do: { kind: 'attack', name: 'Nothing In Front', power: 3.4, target: 'all' } },
      { if: 'hpBelow', v: 0.3, phase: 3, do: { kind: 'attack', name: 'Run It All Down', power: 2.8, target: 'all' } },
      { if: 'hpBelow', v: 0.6, phase: 2, do: { kind: 'spell', spell: 'galecut' } },
      { if: 'allyDown', do: { kind: 'attack', name: 'Take The Gap', power: 2.6 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Two Strides', power: 2.0, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thelongrun: {
    id: 'thelongrun', name: 'The Long Run', level: 84, boss: true,
    // Not silence-immune, alone among the great machines. It can be told to
    // stop talking, and what it does then is the fight.
    look: { plan: 'construct', scale: 2.2, color: '#a6b0bc', accent: '#22242a', eyeColor: '#3fc6d6', cannons: true, treads: true },
    stats: { hp: 72000, mp: 1500, atk: 396, def: 200, mag: 240, mdef: 200, spd: 104, eva: 12, lck: 12 },
    affinity: { bolt: 'absorb', aether: 'absorb', water: 'weak', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'poison', 'blind', 'berserk'],
    exp: 31500, gold: 37500, drops: [{ id: 'overwindrod', chance: 1.0 }],
    steal: [{ id: 'bothhands', chance: 0.12 }, { id: 'megalixir', chance: 0.6 }],
    intro: 'Nine hundred years on the same errand, and not tired yet.',
    ai: [
      { if: 'hpBelow', v: 0.08, phase: 5, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.25, phase: 4, do: { kind: 'attack', name: 'No Stopping It', power: 3.4, element: 'bolt', target: 'all' } },
      { if: 'hpBelow', v: 0.45, phase: 3, do: { kind: 'spell', spell: 'thunderhead' } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'Governor Off', power: 3.0 } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Two Turns To Your One', power: 2.2, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theoverwind: {
    id: 'theoverwind', name: 'The Overwind', level: 85, boss: true,
    // The pinnacle of the volume, and the only thing in four books faster than
    // the Far Runner. Everything it does, it does before you do.
    look: { plan: 'humanoid', scale: 2.0, color: '#dedbe0', accent: '#241636', metal: '#d63fb3', weapon: 'staff', horns: true, eyeColor: '#8a5ce0', eyeCount: 3 },
    stats: { hp: 82000, mp: 1800, atk: 412, def: 200, mag: 250, mdef: 200, spd: 120, eva: 30, lck: 32 },
    affinity: { wind: 'absorb', aether: 'absorb', shadow: 'absorb', holy: 'weak', earth: 'weak' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'charm', 'poison', 'blind', 'berserk', 'paralysis', 'freeze'],
    exp: 36000, gold: 46000, drops: [{ id: 'overwindband', chance: 1.0 }, { id: 'megalixir', chance: 1.0 }],
    steal: [{ id: 'quenchbrand', chance: 0.15 }, { id: 'megalixir', chance: 0.6 }],
    intro: 'The spring was wound past the stop. Nobody has ever said by whom.',
    ai: [
      { if: 'hpBelow', v: 0.07, phase: 5, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.2, phase: 4, do: { kind: 'attack', name: 'Past The Stop', power: 3.6, target: 'all' } },
      { if: 'hpBelow', v: 0.4, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'By Hand, Then, And Faster', power: 3.0, target: 'all' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'halve' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Three To Your One', power: 2.4, target: 'all' } },
      { if: 'always', do: { kind: 'attack', name: 'Ahead Of You', power: 2.0 } },
    ],
  },
};

/**
 * Encounter tables, two to a region: the near ground and the far.
 *
 * Every formation is the region's argument in miniature. The Yards always put
 * something evasive or something armoured beside the goader, so a berserked
 * swing has somewhere wrong to land. The Kindly Ground fields two Zombie
 * sources at once, because one is a nuisance and two is a decision. The
 * Gainsay never fields fewer than two different `hasStatus` rules, so no
 * single lock is safe across the whole formation.
 *
 * The Brood Acre is the exception that names the region: its tables are the
 * only ones in the game that run four and five deep. `_placeEnemies` fans them
 * out on a curve wide enough that five still read as five, and the battle UI
 * tags every one of them.
 *
 * A few tables reach back into volume three so the airship country borders its
 * neighbours as a gradient rather than a wall.
 */
export const VOL4_ENCOUNTERS = {
  blooding_yards: {
    rate: 26, terrain: 'dirt', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['goadfly', 'goadfly', 'yardbull'] },
      { weight: 24, enemies: ['hookman', 'bloodinghusk'] },
      { weight: 20, enemies: ['flensingmoth', 'flensingmoth', 'goadfly'] },
      { weight: 16, enemies: ['yardbull', 'tallowmass'] },
      { weight: 12, enemies: ['hourhand', 'shamblehound'] },
    ],
  },
  blooding_yards_pens: {
    rate: 28, terrain: 'dirt', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['theflenser', 'tallowmass'] },
      { weight: 24, enemies: ['shamblehound', 'shamblehound', 'hookman'] },
      { weight: 20, enemies: ['bloodinghusk', 'bloodinghusk', 'flensingmoth'] },
      { weight: 18, enemies: ['theflenser', 'yardbull'] },
      { weight: 12, enemies: ['hushhound', 'theflenser'] },
    ],
  },

  kindly_ground: {
    rate: 24, terrain: 'grass', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['sextonhusk', 'pallmoth'] },
      { weight: 24, enemies: ['pallmoth', 'pallmoth', 'barrowmaw'] },
      { weight: 20, enemies: ['lychgatewight', 'sextonhusk'] },
      { weight: 16, enemies: ['theconsoler', 'cerementspinner'] },
      { weight: 12, enemies: ['quarterhusk', 'sextonhusk'] },
    ],
  },
  kindly_ground_barrows: {
    rate: 26, terrain: 'dirt', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['thegravedigger', 'charnelhound'] },
      { weight: 24, enemies: ['charnelhound', 'charnelhound', 'theconsoler'] },
      { weight: 20, enemies: ['cerementspinner', 'lychgatewight'] },
      { weight: 18, enemies: ['barrowmaw', 'theconsoler', 'pallmoth'] },
      { weight: 12, enemies: ['thegravedigger', 'lychgatewight'] },
    ],
  },

  gainsay_downs: {
    rate: 26, terrain: 'grass', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['naysayer', 'spitefly', 'spitefly'] },
      { weight: 24, enemies: ['crossgrainhound', 'bitterbriar'] },
      { weight: 20, enemies: ['theillwisher', 'spitefly'] },
      { weight: 18, enemies: ['bitterbriar', 'naysayer'] },
      { weight: 10, enemies: ['crossgrainhound', 'crossgrainhound', 'theillwisher'] },
    ],
  },
  gainsay_deep: {
    rate: 28, terrain: 'dirt', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['theretort', 'grudgewight'] },
      { weight: 24, enemies: ['theobjection', 'theillwisher'] },
      { weight: 20, enemies: ['grudgewight', 'grudgewight', 'naysayer'] },
      { weight: 18, enemies: ['theretort', 'theobjection'] },
      { weight: 12, enemies: ['nightshift', 'theretort'] },
    ],
  },

  brood_acre: {
    rate: 30, terrain: 'grass', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['brooddrone', 'brooddrone', 'brooddrone', 'broodnurse'] },
      { weight: 24, enemies: ['chaffmidge', 'chaffmidge', 'chaffmidge', 'chaffmidge', 'acrecrow'] },
      { weight: 20, enemies: ['litterhound', 'litterhound', 'litterhound', 'brooddrone'] },
      { weight: 16, enemies: ['spawnbriar', 'brooddrone', 'brooddrone'] },
      { weight: 12, enemies: ['acrecrow', 'acrecrow', 'chaffmidge', 'chaffmidge'] },
    ],
  },
  brood_acre_hives: {
    rate: 32, terrain: 'dirt', scenery: 'field',
    groups: [
      { weight: 26, enemies: ['huskbrood', 'huskbrood', 'huskbrood', 'broodnurse'] },
      { weight: 24, enemies: ['acrewidow', 'brooddrone', 'brooddrone', 'brooddrone'] },
      { weight: 20, enemies: ['wasteweevil', 'chaffmidge', 'chaffmidge', 'chaffmidge'] },
      { weight: 18, enemies: ['spawnbriar', 'litterhound', 'litterhound', 'acrecrow'] },
      { weight: 12, enemies: ['wellspinner', 'acrewidow'] },
    ],
  },

  quench_flats: {
    rate: 26, terrain: 'sand', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['slakemaw', 'quenchmoth'] },
      { weight: 24, enemies: ['temperhound', 'drawnwire'] },
      { weight: 20, enemies: ['quenchmoth', 'quenchmoth', 'slakemaw'] },
      { weight: 16, enemies: ['slackwater', 'temperhound'] },
      { weight: 12, enemies: ['emptyvessel', 'slackwater'] },
    ],
  },
  quench_pits: {
    rate: 28, terrain: 'cobble', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['scalewight', 'swarfspinner'] },
      { weight: 24, enemies: ['thecoldshut', 'drawnwire'] },
      { weight: 20, enemies: ['swarfspinner', 'slackwater', 'slakemaw'] },
      { weight: 18, enemies: ['scalewight', 'scalewight', 'quenchmoth'] },
      { weight: 12, enemies: ['thecoldshut', 'scalewight'] },
    ],
  },

  overwind_road: {
    rate: 30, terrain: 'dirt', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['theoutrunner', 'flickermoth', 'flickermoth'] },
      { weight: 24, enemies: ['springhusk', 'theerrand'] },
      { weight: 20, enemies: ['coursinghound', 'coursinghound'] },
      { weight: 18, enemies: ['quickthorn', 'flickermoth'] },
      { weight: 10, enemies: ['edgewalker', 'theoutrunner'] },
    ],
  },
  overwind_far: {
    rate: 32, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['thewhirligig', 'snapwidow'] },
      { weight: 24, enemies: ['coursinghound', 'coursinghound', 'theerrand'] },
      { weight: 20, enemies: ['thefarrunner'] },
      { weight: 18, enemies: ['snapwidow', 'thewhirligig', 'flickermoth'] },
      { weight: 12, enemies: ['thefarrunner', 'coursinghound'] },
    ],
  },
};
