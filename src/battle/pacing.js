/**
 * The fixed cost of a battle that is not the battle.
 *
 * Every encounter charges these seconds no matter what happens inside it: the
 * fades around the scene swap, the beat between the Victory banner and the
 * spoils, and — while `spoilsBlocking` is true — a dialogue box that will not
 * go away without a button press even when all it has to say is that you
 * earned 61 exp.
 *
 * The numbers live here, in one module with no DOM in it, because the balance
 * audit prices the campaign's ~800 forced battles in wall-clock hours, and a
 * duration that exists only inline in battle.js is a duration the audit has
 * to guess at. It guessed "8 seconds" for as long as the guess was a comment;
 * nobody could argue with it, because there was nothing written down to argue
 * with. Now `tools/balance.mjs` imports this file and the argument is a diff.
 */
export const PACING = {
  // main.js, around the scene swap in and out of BattleState. Short enough
  // to stop taxing the 796th battle, long enough that the swap still reads
  // as a place change rather than a glitch.
  fadeToBattle: 0.2,
  fadeIntoBattle: 0.3,
  fadeOutOfBattle: 0.3,
  fadeBackToField: 0.35,

  // battle.js finishSequence: how long the Victory banner plays, and the
  // forced pause before the spoils appear. The banner overlaps the spoils, so
  // only the beat is a queue; the banner just has to not outstay it.
  victoryBanner: 1.2,
  victoryBeat: 0.5,

  // When true, every victory's spoils are a dialogue the player must dismiss.
  // When false, routine spoils show as a self-clearing banner and only the
  // ones worth stopping for — a level, a new spell, loot — open the dialogue.
  // True was the shipped behaviour, and across a campaign it billed over an
  // hour of button presses for one-line messages nobody chose to read.
  spoilsBlocking: false,
};
