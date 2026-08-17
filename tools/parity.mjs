/**
 * Combat-maths parity: the Godot port against the reference implementation.
 *
 *   node tools/parity.mjs
 *
 * The web build is the spec. Every number in `src/battle/formulas.js` is the
 * result of a balance pass measured by `balance.mjs` — two deliberately
 * different damage curves, defence that saturates instead of clamping, a magic
 * stat that softens instead of capping, an experience coefficient fitted to
 * encounter payouts and paired with the encounter spacing. A port that agrees
 * with all of that except for where it truncates is a port that silently
 * re-opens bugs which took a full audit to find, and it would not look broken
 * in a screenshot.
 *
 * So both implementations run the same grid of inputs and any disagreement is
 * a failure. The grid lives in `godot/tools/parity_probe.gd` and covers the
 * awkward regions on purpose: defence either side of the saturation point,
 * magic either side of the softening point, the back row with and without a
 * reaching weapon, criticals, and defence-ignoring hits.
 *
 * Variance is excluded, and that is not a gap: it is a seeded RNG roll applied
 * on top of the deterministic term, so the two engines can only be compared on
 * the term itself. The roll is verified separately by `applyVariance`'s own
 * arithmetic being a pure function of (value, roll).
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  physicalDamage, monsterDamage, magicDamage, healAmount,
  effectiveDefence, hitChance, atbRate, expShare, goldShare, limitGain,
} from '../src/battle/formulas.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

// `effectiveMagic` is deliberately not exported by the reference module — it
// is an internal softening term — so it is restated here from the same two
// constants rather than reaching into the module's private scope.
const MAGIC_SOFT = 128;
const MAGIC_SLOPE = 0.35;
const effectiveMagic = (magic) => {
  const m = Math.max(1, magic);
  return m <= MAGIC_SOFT ? m : MAGIC_SOFT + (m - MAGIC_SOFT) * MAGIC_SLOPE;
};

const round6 = (n) => Number(n.toFixed(6));

/** The same grid the probe walks, in the same order. */
function referenceGrid() {
  const out = { physical: [], monster: [], magic: [], heal: [], defence: [], misc: [] };

  for (const level of [1, 6, 12, 24, 40, 60, 85]) {
    for (const vigour of [8, 34, 90]) {
      for (const weapon of [12, 26, 148]) {
        for (const defence of [0, 60, 150, 200, 232, 437]) {
          for (const row of ['front', 'back']) {
            for (const critical of [false, true]) {
              out.physical.push(physicalDamage({
                attackerLevel: level, vigour, weaponPower: weapon, defence,
                rows: { attacker: row, target: 'front' }, critical, variance: false,
              }));
            }
          }
        }
      }
    }
  }
  for (const weapon of [26, 148]) {
    for (const reachBack of [false, true]) {
      out.physical.push(physicalDamage({
        attackerLevel: 40, vigour: 34, weaponPower: weapon, defence: 150,
        rows: { attacker: 'back', target: 'front' }, reachBack, variance: false,
      }));
    }
  }

  for (const level of [1, 12, 32, 58, 85]) {
    for (const power of [40, 91, 260, 661]) {
      for (const defence of [0, 97, 200, 437]) {
        for (const multiplier of [1.0, 1.7, 2.8, 3.4]) {
          for (const row of ['front', 'back']) {
            out.monster.push(monsterDamage({
              level, power, defence, multiplier,
              rows: { attacker: 'front', target: row }, variance: false,
            }));
          }
        }
      }
    }
  }

  for (const level of [1, 18, 33, 55, 85]) {
    for (const magic of [10, 60, 128, 129, 200, 400]) {
      for (const spellPower of [21, 60, 108, 141, 165, 185]) {
        for (const magicDefence of [0, 88, 200, 230]) {
          out.magic.push(magicDamage({
            casterLevel: level, magic, spellPower, magicDefence, variance: false,
          }));
          // healAmount always rolls variance, so the deterministic term is
          // restated from the same constants rather than sampled.
          const mag = effectiveMagic(magic);
          out.heal.push(Math.max(1, Math.floor(
            spellPower * 4 + Math.floor((level * mag * spellPower) / 1360))));
        }
      }
    }
  }

  for (const defence of [0, 1, 50, 128, 199, 200, 201, 232, 300, 437, 1000]) {
    for (const ignore of [0, 0.25, 0.5, 1.0]) {
      out.defence.push(round6(effectiveDefence(defence, ignore)));
    }
  }

  for (const magic of [1, 64, 128, 129, 256, 512]) out.misc.push(round6(effectiveMagic(magic)));
  for (const speed of [1, 22, 40, 65, 120]) {
    for (const haste of [false, true]) {
      for (const slow of [false, true]) {
        for (const battleSpeed of [1, 3, 6]) {
          out.misc.push(round6(atbRate(speed, { haste, slow, battleSpeed })));
        }
      }
    }
  }
  for (const total of [5, 620, 4200, 36000]) {
    for (const survivors of [1, 2, 3, 4]) out.misc.push(expShare(total, survivors));
  }
  for (const gold of [6, 900, 15000, 46000]) out.misc.push(goldShare(gold));
  for (const damageTaken of [10, 500, 4000]) {
    for (const maxHP of [100, 1000, 8000]) {
      for (const currentHP of [0, 200, 900]) {
        for (const alliesDown of [0, 2]) {
          out.misc.push(round6(limitGain({ damageTaken, maxHP, currentHP, alliesDown })));
        }
      }
    }
  }
  for (const accuracy of [100, 106, 130]) {
    for (const targetEvade of [0, 22, 60, 140]) {
      for (const blind of [false, true]) {
        out.misc.push(round6(hitChance({ accuracy, targetEvade, blind })));
      }
    }
  }
  return out;
}

// --- run the port ------------------------------------------------------------

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/parity_probe.gd',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  // Godot prints engine chatter around the payload, so take the one line that
  // parses as our object rather than assuming it owns stdout.
  const line = raw.split('\n').find((l) => l.trim().startsWith('{') && l.includes('"physical"'));
  if (!line) throw new Error(`no JSON payload in Godot output:\n${raw.slice(0, 800)}`);
  ported = JSON.parse(line);
} catch (err) {
  say(`\x1b[31mFAIL\x1b[0m — could not run the Godot probe.`);
  say(`  ${err.message.split('\n')[0]}`);
  say('  Set GODOT=/path/to/godot if it is not on PATH.');
  process.exit(1);
}

const reference = referenceGrid();

say('\x1b[1mCombat maths: the Godot port against the reference implementation\x1b[0m');
say('─'.repeat(66));

let checked = 0;
const problems = [];
for (const key of Object.keys(reference)) {
  const a = reference[key];
  const b = ported[key] ?? [];
  if (a.length !== b.length) {
    problems.push(`${key}: reference produced ${a.length} values, the port produced ${b.length} — `
      + 'the two grids have drifted apart, so nothing below is comparable');
    continue;
  }
  let mismatched = 0;
  let firstAt = -1;
  for (let i = 0; i < a.length; i++) {
    checked++;
    // Floats are compared with a tolerance because the two engines differ in
    // the last bit of a transcendental; integers must match exactly, because
    // a damage number that rounds differently *is* a different game.
    const same = Number.isInteger(a[i]) && Number.isInteger(b[i])
      ? a[i] === b[i]
      : Math.abs(a[i] - b[i]) < 1e-9;
    if (!same) {
      mismatched++;
      if (firstAt < 0) firstAt = i;
    }
  }
  const width = String(a.length).length;
  say(`  ${key.padEnd(9)} ${String(a.length).padStart(width)} values  `
    + (mismatched
      ? `\x1b[31m${mismatched} disagree\x1b[0m (first at ${firstAt}: `
        + `reference ${a[firstAt]}, port ${b[firstAt]})`
      : '\x1b[32mall agree\x1b[0m'));
  if (mismatched) {
    problems.push(`${key}: ${mismatched} of ${a.length} values disagree, first at index ${firstAt} `
      + `(reference ${a[firstAt]}, port ${b[firstAt]})`);
  }
}

say();
if (problems.length) {
  for (const p of problems) say(`  \x1b[31m✗\x1b[0m ${p}`);
  say();
  say('\x1b[31mFAIL\x1b[0m — the port does not compute the same game. Every constant in');
  say('formulas.js was fitted against tools/balance.mjs; a port that disagrees has');
  say('silently rebalanced the game and no screenshot will show it.');
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${checked.toLocaleString()} values, the port and the reference agree on all of them.`);
