/**
 * Which move a creature reaches for, given the state of the fight.
 *
 * Pulled out of `battle.js` so it can be tested and ported without dragging a
 * renderer along: this module imports nothing, takes plain values, and returns
 * a decision. `battle.js` supplies the live combatants; `tools/ai-parity.mjs`
 * supplies a grid of hypothetical ones and holds the Godot port against the
 * results.
 *
 * That matters more here than elsewhere. The phase rules in this file are where
 * the bestiary keeps its choreography — every boss's escalation is expressed as
 * `phase` numbers on `hpBelow` rules — and the logic reading them was wrong for
 * the life of the project in a way nothing could see: a phase rule fired once
 * and then locked itself out, so bosses got *weaker* as their health fell and
 * their signature moves ran for exactly one turn each.
 */

/**
 * How often a creature repeats the signature move of the phase it is in.
 *
 * Every third turn. Once, on entering, is too little — that was the old
 * behaviour, and it is what made bosses de-escalate. Every turn is too much: it
 * turns the end of every fight into one move on a loop, and when it was tried
 * it pushed six bosses under a 50% win rate against a party at their own level.
 */
export const PHASE_REPEAT = 3;

/** The move a creature falls back on when no rule matches. */
export const DEFAULT_ACTION = { kind: 'attack' };

/**
 * Pick a rule.
 *
 * `state` is deliberately all plain data and callbacks rather than combatant
 * objects, so the same call works for a live battle, a headless simulation and
 * a parity probe.
 *
 *   hpFraction     current HP over max, 0..1
 *   aiTurn         how many turns this creature has taken, counting from 1
 *   phase          the phase it is currently in (0 before any is entered)
 *   roll           () => 0..1, called *only* when a `random` rule is reached
 *   allyDown       whether any of its allies has fallen
 *   hasStatus      (id) => bool, for the creature itself
 *   partyHasStatus (id) => bool, for the player's side
 *
 * Returns `{ action, phase, entered }` — `phase` is what the creature's phase
 * should now be, and `entered` is true only on the turn it changes, which is
 * when the banner should play.
 */
export function chooseAction(rules, state) {
  const {
    hpFraction = 1, aiTurn = 1, phase = 0, roll = () => 1,
    allyDown = false, hasStatus = () => false, partyHasStatus = () => false,
  } = state;
  // Lazily, and this is not a micro-optimisation. Drawing a number on every
  // decision rather than only when a `random` rule is reached advances the
  // seeded stream on turns that never needed it, which silently reshuffles
  // every subsequent roll in the fight — the simulator's results moved the
  // first time this was written eagerly.
  const rollValue = () => (typeof roll === 'function' ? roll() : roll);

  const list = rules && rules.length ? rules : [{ if: 'always', do: DEFAULT_ACTION }];

  for (const rule of list) {
    let match = false;
    switch (rule.if) {
      case 'always': match = true; break;
      case 'hpBelow': match = hpFraction < rule.v; break;
      case 'selfHpBelow': match = hpFraction < rule.v; break;
      case 'turnEvery': match = aiTurn % rule.n === 0; break;
      case 'turnIs': match = aiTurn === rule.n; break;
      case 'random': match = rollValue() < rule.p; break;
      case 'allyDown': match = allyDown; break;
      case 'hasStatus': match = hasStatus(rule.status); break;
      case 'partyHasStatus': match = partyHasStatus(rule.status); break;
      default: match = false;
    }
    if (!match) continue;

    // A phase is a state the creature enters, not a move it spends. A higher
    // phase supersedes a lower one; entering announces itself once; and while
    // it stays in that phase the signature recurs on a beat rather than every
    // turn, so the fight escalates without becoming a metronome.
    if (rule.phase) {
      if (phase > rule.phase) continue;
      if (phase < rule.phase) {
        return { action: rule.do, phase: rule.phase, entered: true };
      }
      if (aiTurn % PHASE_REPEAT !== 0) continue;
    }
    return { action: rule.do, phase, entered: false };
  }
  return { action: DEFAULT_ACTION, phase, entered: false };
}
