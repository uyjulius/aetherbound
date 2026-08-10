import { wait, over } from '../engine/scheduler.js';
import { rng } from '../engine/rng.js';
import { ESPERS } from './espers.js';

/**
 * Scripted events, volume two — sidequests and optional scenes.
 *
 * Same contract as `EVENTS` in events.js: every entry is a generator receiving
 * `(game, ctx)` and written as a coroutine, so a scene reads top to bottom in
 * source the way it plays on screen. Nothing in here is on the critical path;
 * the main line runs identically whether or not a single one of these fires.
 *
 * Four shapes are deliberately mixed, because twenty-four boss doors would be
 * twenty-four of the same door:
 *
 *   - a four-step errand that starts with a seized mill wheel (millwheel_*)
 *   - a question answered by asking the right people in the right order
 *     (surveyor_*), gated on quest stage rather than on flags, so the order
 *     is enforced by the informants themselves
 *   - one decision with two outcomes that both take something off the player
 *     (the_last_measure)
 *   - personal scenes for the cast members the main line has no room for,
 *     most of which never start a battle
 *
 * Several are gated on `party.worldState === 'ruin'`, the same way the recruit
 * scenes in events.js are — the ruined world is a different set of
 * conversations held in the same places.
 */

// --- small helpers, matching the ones in events.js --------------------------

function* say(game, speaker, lines, opts = {}) {
  yield* game.dialogue.speak(speaker, [].concat(lines), opts);
}

function* cinematic(game, on) {
  game.stage.classList.toggle('cinema', on);
  yield wait(0.55);
}

/** Shake and darken — used when something wakes up. */
function* tremor(game, seconds = 1.6, strength = 0.5) {
  yield* over(seconds, (t) => {
    game.renderer.rig.shake(strength * (1 - t * 0.5), 2.0);
  });
}

/** First recruited member from a list of ids, or null. Scenes branch on this. */
function present(party, ids) {
  for (const id of ids) {
    const m = party.member(id);
    if (m) return m;
  }
  return null;
}

export const VOL2_EVENTS = {
  // =========================================================================
  // The mill wheel. Four steps, and the last one is not about a mill wheel.
  // =========================================================================

  /** Tolliver, by the mill. The start of the errand. */
  *millwheel_errand(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('mill_running')) {
      yield* say(game, 'Tolliver', p.worldState === 'ruin'
        ? [
          'Four parishes send me grain now. Solmere sends carts down for it, and Solmere has never sent me anything in its life.',
          'The wheel does not know what the sky is doing. That is the whole of my thinking on the matter and I have had a lot of time for it.',
        ]
        : ['It has not stopped since. I go out at night to listen to it, which my wife has views about.']);
      return;
    }
    if (p.questStage('millwheel') >= 0) {
      yield* say(game, 'Tolliver', p.hasFlag('mill_brass')
        ? ['You have the brass on you. I can hear it knocking. Put it in Halloran\'s hand before you put it down anywhere.']
        : ['Halloran has known the size for a fortnight. It is the brass he has not got.']);
      return;
    }
    p.startQuest('millwheel', 0);
    yield* say(game, 'Tolliver', [
      'Wheel is seized. Second time this month, and the second time is never the river.',
      'Bearing has gone oval. You feel it through the floor when it turns, like a man walking with a stone in his boot.',
      'Halloran would cast me a new one and he cannot. There is no brass in this village and has not been since the requisitions.',
    ]);
    yield* say(game, 'Vesna', ['We pass the forge anyway.']);
    yield* say(game, 'Tolliver', [
      'Then pass it slowly. Tell him it grinds for the whole parish and not only my flour, which is a thing he said to me once about horseshoes.',
    ]);
  },

  /** Halloran at the forge. He has the pattern and no metal. */
  *forge_brass(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('mill_running')) {
      yield* say(game, 'Halloran', ['Bearing is holding. I have made worse out of better metal and charged for it.']);
      return;
    }
    if (p.questStage('millwheel') < 0) {
      yield* say(game, 'Halloran', ['Scrap and seconds today. Come back when you want something that will not bend.']);
      return;
    }
    if (p.hasFlag('mill_brass')) {
      yield* say(game, 'Halloran', [
        'Ferran brass. Give it here.',
        'Sand is already rammed. Tell Tolliver to have the sluice up at first light and to stand well back from it.',
      ]);
      return;
    }
    if (p.questStage('millwheel') < 1) p.advanceQuest('millwheel', 1);
    yield* say(game, 'Halloran', [
      'Tolliver\'s bearing. I have the pattern cut and the sand rammed and no brass, which is the order those three things usually arrive in.',
      'Ferran took every ingot in the district for lamp housings. The quartermaster at the outpost is sitting on four hundredweight of it and a sentry who counts.',
    ]);
    yield* say(game, 'Halloran', [
      'Vell will not sell. Vell trades. I drank with him at the spring fair and he talked about one thing for two hours.',
      'Ask him what he is short of. He will tell you before you have finished asking.',
    ]);
  },

  /** Quartermaster Vell. The trade, and the cost of it. */
  *quartermaster_trade(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('mill_brass') || p.hasFlag('mill_running')) {
      yield* say(game, 'Quartermaster Vell', [
        'Brass went out on nobody\'s manifest and the stout came in on nobody\'s manifest. We are square and we are both deniable.',
      ]);
      return;
    }
    if (p.questStage('millwheel') < 1) {
      yield* say(game, 'Quartermaster Vell', ['Requisitions. No chit, no stock. What you have instead is a conversation, and I am not paid for those.']);
      return;
    }
    yield* say(game, 'Quartermaster Vell', [
      'Brass. Everyone wants brass. I have four hundredweight of it and I cannot get one bottle of anything drinkable past my own checkpoint.',
      'The Kettle & Cinder at Harrowmere keeps a stout the requisition list has never heard of. A case of that, and I will weigh out what the mill needs.',
    ]);
    const choice = yield* game.dialogue.ask(
      'A case is six hundred gil, and Vell sends his own runner for it — a civilian at that gate with a crate is a different sort of paperwork.',
      ['Pay the six hundred', 'Not today'],
      { speaker: 'Quartermaster Vell', cancelable: true },
    );
    game.dialogue.close();
    if (choice !== 0) return;
    if (!p.spendGold(600)) {
      yield* say(game, 'Quartermaster Vell', ['You are short, and counting is the one thing I am actually employed to do. Come back heavier.']);
      return;
    }
    p.setFlag('mill_brass');
    p.advanceQuest('millwheel', 2);
    yield* say(game, null, ['Vell weighs out an ingot, wraps it in oilcloth, and writes nothing down.']);
    yield* say(game, 'Quartermaster Vell', ['If anyone stops you, that is a lamp fitting and you are a pilgrim.']);
  },

  /**
   * The wheel turns. The errand was about a bearing right up until the metal
   * came out of the sand.
   */
  *millwheel_turns(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('mill_running')) {
      yield* say(game, null, ['The wheel turns. Under the rumble there is a note that does not belong to a wheel.']);
      return;
    }
    if (!p.hasFlag('mill_brass')) {
      yield* say(game, null, ['The wheel stands in the water at an angle it should not stand at. Nothing about it moves.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'Halloran pours at dusk. The bearing comes out of the sand the colour of a new coin, and he taps it, and then he taps it again because the first note was wrong.',
    ]);
    yield* say(game, 'Halloran', [
      'That is not brass the whole way through.',
      'There is something in the middle of the sprue that took the heat and did not run. Ferran cast this ingot out of something they had already used for something else.',
    ]);
    yield* say(game, 'Vesna', ['There is a name in it.']);
    yield* say(game, 'Halloran', [
      'Then the parish bread gets ground by somebody. I have heard worse arrangements and put my mark on two of them.',
      'The bearing goes in the wheel regardless. Tolliver has been eating out of a sack since the thaw.',
    ]);
    yield* say(game, null, [
      'The sluice comes up at first light. The wheel takes the water, sticks, and then goes.',
      'It runs the whole morning without knocking once.',
    ]);
    yield* say(game, 'Halloran', [
      'Take the offcut. I am not putting that in a scrap barrel and I am not putting it in anybody\'s wheel.',
      'It has been warm since it came off the saw and the forge has been out since Tuesday.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'lastlight', label: 'a Last Light' }, ctx.field);
    p.setFlag('mill_running');
    p.completeQuest('millwheel');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Who told the Ferran surveyor where the barrow was.
  // Four informants, in order. Each refuses to be useful out of turn.
  // =========================================================================

  /** The Regular, in the Kettle & Cinder. He has been going over it since spring. */
  *surveyor_question(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('surveyor_answered')) {
      yield* say(game, 'Regular', ['I know now. I have not settled whether knowing was the improvement I was after.']);
      return;
    }
    if (p.questStage('surveyor') >= 0) {
      yield* say(game, 'Regular', [
        'Odo keeps a ledger and Ivo keeps a rota. Between them this village writes down everything except the part that matters.',
      ]);
      return;
    }
    p.startQuest('surveyor', 0);
    yield* say(game, 'Regular', [
      'Ferran surveyor, spring, sat where you are standing. Bought a round for the room and asked where the old barrow was.',
      'Everybody told him. Me first, because I was nearest and I like being useful.',
    ]);
    yield* say(game, 'Regular', [
      'He did not write any of it down. Nine people gave him nine sets of directions and he never once reached for a pencil.',
      'A man who does not write down the thing he came to ask has already got it.',
    ]);
    yield* say(game, 'Vesna', ['Then why ask.']);
    yield* say(game, 'Regular', [
      'That is the bit I go over.',
      'Ask Odo what the man bought. Odo writes everything down; it is the only habit of his I admire and he knows it.',
    ]);
  },

  /** Odo's ledger. The map case was full when it was sold. */
  *surveyor_ledger(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('surveyor_answered') || p.questStage('surveyor') < 0) {
      yield* say(game, 'Odo', ['Salt, tinder, tonics, and a ledger nobody reads but me.']);
      return;
    }
    if (p.questStage('surveyor') >= 1) {
      yield* say(game, 'Odo', ['It is our parish mark on the corner of that case. Go and ask Ivo which gate the man used.']);
      return;
    }
    yield* say(game, 'Odo', [
      'The Ferran. Spring, yes. Lamp oil, a tin of blacking, and a map case.',
      'He paid in Solmere coin and I had to weigh it, which is why the line is in ink and not pencil.',
    ]);
    yield* say(game, 'Odo', [
      'Here is the part I have not said out loud in four months. The case was full when he bought it.',
      'He bought a case for what was already inside it. And that case had our parish mark stamped in the corner, so it did not come up the road with him.',
    ]);
    p.advanceQuest('surveyor', 1);
    yield* say(game, 'Odo', ['Somebody here drew what is in it. Ivo keeps the gate rota. Ask him which way the man went.']);
  },

  /** Watchman Ivo's rota. Both nights, the wrong gate. */
  *surveyor_rota(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('surveyor_answered') || p.questStage('surveyor') < 1) {
      yield* say(game, 'Watchman Ivo', ['The rota is the rota. Nobody reads it but me, and I read it twice.']);
      return;
    }
    if (p.questStage('surveyor') >= 2) {
      yield* say(game, 'Watchman Ivo', ['I have told you where he went. I am not walking up the hill with you and I would rather you did not say I sent you.']);
      return;
    }
    yield* say(game, 'Watchman Ivo', [
      'The surveyor. Two nights, both logged, because I log everything and it has never once been useful until this week.',
      'In at the north gate at dusk. Out at the north gate at dawn. The same both nights.',
    ]);
    yield* say(game, 'Vesna', ['The barrow is south-west.']);
    yield* say(game, 'Watchman Ivo', [
      'It is. And there is nothing north of that gate but the ridge path and the elder\'s garden wall.',
      'I wrote it down twice and I have not looked at it since, and I would like that on the record as a thing I chose.',
    ]);
    p.advanceQuest('surveyor', 2);
  },

  /** Elder Sabbath, who drew the map. */
  *surveyor_answer(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('surveyor_answered')) {
      yield* say(game, 'Elder Sabbath', ['You know. I am not going to be lighter about it now that you know.']);
      return;
    }
    if (p.questStage('surveyor') < 2) {
      yield* say(game, 'Elder Sabbath', ['Whatever you are working round to, work round to it faster. I am old and the kettle is on.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Elder Sabbath', [
      'You have been asking Ivo about his rota. Ivo tells me everything he is asked, which is why in forty years I have never asked him for anything.',
    ]);
    yield* say(game, 'Elder Sabbath', [
      'Yes. I drew it. At that table, from memory, in one evening, and I put the third door in the wrong place on purpose.',
      'They had the writ and the lamps and eleven years of practice. They were going to dig. The only thing left in the world to decide was where.',
    ]);
    yield* say(game, 'Vesna', ['So you decided.']);
    yield* say(game, 'Elder Sabbath', [
      'I sent them to the one chamber I was certain was empty. I had been in it as a boy. I put my hand flat on the floor of it.',
    ]);
    yield* say(game, 'Vesna', ['It was not empty.']);
    yield* say(game, 'Elder Sabbath', [
      'No.',
      'I have been sitting with that since the thaw. There is room on the bench if you would like to sit with it as well.',
    ]);
    p.setFlag('surveyor_answered');
    p.completeQuest('surveyor');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Personal scenes. Most of these never start a battle.
  // =========================================================================

  /**
   * Corvin's fence catches up with him. Pay or fight; the glove comes back
   * either way, and so does the fact that the lid was a fake.
   */
  *corvin_debt(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('corvin_settled')) {
      yield* say(game, 'Corvin', ['Ashby will find someone else to be owed by. It is a growth trade.']);
      return;
    }
    if (!p.roster.has('corvin')) {
      yield* say(game, null, ['A man sits on the milestone with a ledger open on his knee. He looks at each of you in turn and loses interest.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, ['A man is sitting on the milestone with a ledger open on his knee. He does not get up.']);
    yield* say(game, 'Corvin', ['That is Ashby. Do not look at him. Looking is a bid.']);
    yield* say(game, 'Ashby', [
      'Four years, Corvin. A reliquary lid, off the Ashenhall dig, sold to a gentleman in Solmere who had it valued on the Tuesday.',
      'It was cast last spring. The verdigris was painted on, and painted well, which is the only compliment in this ledger.',
    ]);
    yield* say(game, 'Corvin', [
      'It was a good lid.',
      'I have walked a different road every year since, and every year it is the same road with him sitting on it.',
    ]);
    yield* say(game, 'Ashby', [
      'Two thousand five hundred, or the glove.',
      'You left the glove as surety and you have not asked after it once, which tells me exactly what it is worth to you and exactly what it is worth to me.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'Ashby turns the ledger round so the line can be read.',
      ['Pay the 2500 gil', 'Tell him to take it up with the road'],
      { speaker: 'Ashby', cancelable: false },
    );
    game.dialogue.close();

    let paid = false;
    if (choice === 0) {
      paid = p.spendGold(2500);
      if (!paid) {
        yield* say(game, 'Ashby', ['You are short. I have taken worse offers than a short one and I have never taken that one.']);
      }
    }

    if (!paid) {
      yield* say(game, 'Ashby', ['Then we are doing the other thing. I brought the other thing with me.']);
      const result = yield* game.startBattleScene(
        { enemies: ['tollman', 'brigand', 'brigand'] },
        { boss: true, terrain: 'dirt', scenery: 'field', canFlee: false },
      );
      if (result !== 'victory') return;
      yield* say(game, null, [
        'Ashby is face down in the road with the ledger under him.',
        'Corvin takes the glove out of the coat, and then puts the ledger back where it was, squared up.',
      ]);
    } else {
      yield* say(game, null, ['Ashby counts it twice, marks the line through, and hands the glove over without looking at Corvin.']);
    }

    yield* game.grantChest({ kind: 'item', id: 'hoardersglove', label: "a Hoarder's Glove" }, ctx.field);
    yield* say(game, 'Corvin', ['He was right about the lid.']);
    p.setFlag('corvin_settled');
    p.completeQuest('ashby');
  },

  /**
   * Wick at the burnt alcoves of Ashenhall. He was taught eight names and one
   * of them belongs to the wrong person. No combat.
   */
  *wick_eighth_name(game, ctx = {}) {
    const p = game.party;
    const wick = p.member('wick');
    if (!wick) {
      yield* say(game, null, ['Eight alcoves, burnt to the brick, with a name cut under each. Seven of the cuts have been deepened at some point. One has not.']);
      return;
    }
    if (p.hasFlag('eighth_named')) {
      yield* say(game, 'Wick', ['I check it every time we pass. It is still the right name. That is the whole of the errand.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, ['Eight alcoves, burnt to the brick, with a name cut under each.']);
    yield* say(game, 'Wick', [
      'I had these before I could write my own. Corran. Melle. Ossa. Hew. Dain. Ferrow. Ivet.',
      'And the eighth is Anselm.',
    ]);
    yield* say(game, null, ['The name under the eighth alcove is not Anselm. It is a woman\'s name, and the cut is shallower than the other seven.']);
    yield* say(game, 'Wick', [
      'Anselm carried her here. Four days on a cart with the axle bound in rag — I had that by heart as well, and I never once asked who was on the cart.',
      'Somebody decided the porter was the tidier answer, and then everybody after them was taught the tidy version, including me, at six.',
    ]);
    yield* say(game, null, [
      'He takes a nail out of his cuff and works at the shallow cut until it is as deep as the other seven.',
      'It takes most of an hour. Nobody hurries him and nobody offers to take a turn.',
    ]);
    yield* say(game, 'Wick', ['Right. Say it back to me. I want it in more than one head this time.']);
    wick.learnSpell('reprise');
    p.setFlag('eighth_named');
    yield* say(game, null, ['Wick learned Reprise.']);
    p.completeQuest('eighth');
    yield* cinematic(game, false);
  },

  /**
   * Osric plays the Beachcomber for his own ship's papers. A real gamble on
   * the world stream — the player can walk away between cuts, and the stake
   * is gone whether or not the cut lands.
   */
  *osric_ledger_game(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('vagrant_won')) {
      yield* say(game, 'Beachcomber', ['There is a hole on my shelf where those papers were. I keep looking at the hole.']);
      return;
    }
    if (!p.roster.has('osric')) {
      yield* say(game, 'Beachcomber', [
        'Ship\'s papers came up in the wrack last month. Good hand on them.',
        'They are on the shelf with the other things nobody has come for.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Osric', ['Those are mine. That is my registry, that is my tonnage, and that is my signature under a fold I put in it myself.']);
    yield* say(game, 'Beachcomber', [
      'Then they are yours and I am not selling them. I do not sell what the tide brings up. I put it back.',
      'But you are standing here and the tide is not, so we will do it the other way.',
    ]);
    yield* say(game, 'Osric', ['His deck is complete. Look at it. Fifty-two cards on a beach.']);
    yield* cinematic(game, false);

    let losses = 0;
    for (;;) {
      const prompt = losses === 0
        ? 'The Beachcomber sets the deck on an upturned barrel and does not touch it again.'
        : 'The deck goes back on the barrel. There is chalk on the wood from the last cut, and from a good many before yours.';
      const choice = yield* game.dialogue.ask(
        prompt,
        ['Cut for the papers — 1500 gil', 'Leave it on the shelf'],
        { speaker: 'Beachcomber', cancelable: true },
      );
      game.dialogue.close();
      if (choice !== 0) {
        if (losses > 0) yield* say(game, 'Osric', ['Sensible. I have never once been that.']);
        return;
      }
      if (!p.spendGold(1500)) {
        yield* say(game, 'Osric', ['We are light. That is a sentence I have said in four countries and it has never improved with practice.']);
        return;
      }
      if (rng.world.chance(0.5)) break;
      losses++;
      yield* say(game, null, [
        'You cut the two of cups. He turns his own and does not look at it for long.',
        'He chalks the result on the barrel underneath the others.',
      ]);
      yield* say(game, 'Osric', losses === 2
        ? ['Again. The odds have not changed, which is the part people get wrong about odds.']
        : ['Again.']);
    }

    yield* cinematic(game, true);
    yield* say(game, null, ['You cut the nine of coins. The Beachcomber turns the four, holds it up so everyone can see it, and puts the deck away.']);
    yield* say(game, 'Beachcomber', [
      'Papers. And take the weight off my net with them — it has been on that line four years and it has never once been cold.',
    ]);
    yield* game.grantChest({ kind: 'esper', id: 'vagrantstar', label: 'a shard of magicite' }, ctx.field);
    yield* say(game, 'Osric', [
      `A registry, a tonnage and a star, for ${(losses + 1) * 1500} gil and an afternoon.`,
      'Do not tell me what the odds on that were. I know what the odds on that were.',
    ]);
    p.setFlag('vagrant_won');
    p.completeQuest('vagrant');
    yield* cinematic(game, false);
  },

  /**
   * Idris buries the sword he never drew. Ruined world only, at the shrine
   * where he sat for forty years. No combat.
   */
  *idris_second_sword(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('idris')) {
      yield* say(game, null, ['Somebody has dug a narrow hole beside the shrine step and has not filled it in.']);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Idris', ['Not here and not yet. I will know the day when it arrives and I will not need telling.']);
      return;
    }
    if (p.hasFlag('idris_buried')) {
      yield* say(game, 'Idris', ['It is where I put it. I have not been back to check, and I have thought about going back to check.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, ['Idris stops at the shrine step without saying he is stopping, and takes the second sword off his back.']);
    yield* say(game, 'Idris', [
      'Forty years on this step with two blades. One of them I have used.',
      'The other one is his. I have kept it sharp for a man who has been a mark on a wall in Ashenhall since the year the school burned.',
    ]);
    yield* say(game, 'Idris', ['I sharpened it in the mornings. That was the shape of the day. That was most of the shape of the day.']);
    yield* say(game, 'Vesna', ['What will the mornings be now.']);
    yield* say(game, 'Idris', ['Shorter.']);
    yield* say(game, null, [
      'He digs with the flat of the one he uses, which is not what it is for, and puts the other one in, and fills the hole with his hands.',
      'He does not mark it. Then he sits down on the step out of habit and gets straight back up.',
    ]);
    yield* say(game, null, ['Nobody suggests moving until the light has gone. The party rests at the shrine.']);
    p.restAll();
    p.setFlag('idris_buried');
    yield* say(game, null, ['HP and MP fully restored.']);
    p.completeQuest('vance');
    yield* cinematic(game, false);
  },

  /** Oda, on the ninth form, which does not exist. No combat. */
  *oda_ninth_form(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('oda')) {
      yield* say(game, null, ['A worn patch on the flagstones, roughly the size of a man standing still for a very long time.']);
      return;
    }
    if (p.hasFlag('ninth_form')) {
      yield* say(game, 'Oda', ['Eleven seconds. You are no better at it and you have stopped pretending, which is better.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Oda', ['Stand there. Do not move. I will tell you when.']);
    game.dialogue.close();
    yield wait(5.5);
    yield* say(game, 'Oda', ['When.']);
    yield* say(game, 'Vesna', ['How long was that.']);
    yield* say(game, 'Oda', [
      'Eleven seconds. You looked at your boots twice, and you came off your back foot at nine.',
      'The school taught eight forms and I have told you there is no ninth. That was not modesty.',
    ]);
    yield* say(game, 'Oda', [
      'There is no ninth because the ninth is the part between the other eight, and nobody has ever worked out how to teach somebody to be between things.',
      'Then the hall burned and took the school with it, and I have been between things ever since, at a professional standard.',
    ]);
    yield* say(game, 'Oda', [
      'Take these. They were my master\'s, I have not put wrappings on since the year it burned, and you are travelling with at least one man who hits things.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'stormfists', label: 'the Storm Fists' }, ctx.field);
    p.setFlag('ninth_form');
    p.completeQuest('stillwater');
    yield* cinematic(game, false);
  },

  /**
   * Kestrel reads the list. Ruined world only. No combat, no reward, and it
   * takes until dark.
   */
  *kestrel_sixty_one(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('kestrel')) {
      yield* say(game, null, ['A ledger box, roped shut, with a chalk number on the lid that has been rubbed out and rewritten sixty times.']);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Kestrel', ['Not while the branch is still a branch. I am not reading anything aloud in a building with a roll on it.']);
      return;
    }
    if (p.hasFlag('names_read')) {
      yield* say(game, 'Kestrel', ['Sixty. I will do the sixty-first when there is somewhere to do it.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Kestrel', ['Sit down. All of you. This runs until dark and I am not doing it twice.']);
    yield* say(game, null, [
      'She reads from the top. Every name gets the same weight — the ones with a town after them and the ones with only a draw date.',
      'Somewhere in the thirties her voice goes. She drinks, and then starts the line again from the beginning rather than from where she stopped.',
    ]);
    yield* say(game, null, ['It is fully dark by the time she reaches the bottom of the fourth sheet. There is a fifth sheet and she puts her hand flat on it.']);
    yield* say(game, 'Kestrel', ['Sixty. I am not reading the sixty-first.']);
    yield* say(game, 'Vesna', ['Why.']);
    yield* say(game, 'Kestrel', [
      'Because the sixty-first is still working.',
      'It is turning under the Engine House at this moment, four measures an hour, and I will not say a name out loud over the sound of it being used.',
    ]);
    p.setFlag('names_read');
    p.completeQuest('names');
    yield* cinematic(game, false);
  },

  /**
   * Somebody with a rank finally says it. Rusk needs an officer present — the
   * order went in at a rank and has to come out at one.
   */
  *rusk_stand_down(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('rusk')) {
      yield* say(game, null, ['A wall, and a rectangle of clean brick on it two heads taller than anyone here.']);
      return;
    }
    if (p.hasFlag('rusk_relieved')) {
      yield* say(game, 'Rusk', ['I AM ON THIS ROAD BECAUSE I CHOSE THE ROAD. THE CHOOSING IS THE PART THAT IS NEW AND I AM STILL GETTING THE HANG OF IT.']);
      return;
    }
    const officer = present(p, ['maret', 'aurelian', 'idris']);
    yield* say(game, 'Rusk', ['QUERY: HAS THE RELIEF COME.']);
    if (!officer) {
      yield* say(game, 'Vesna', ['You can stand down.']);
      yield* say(game, 'Rusk', [
        'IT IS NOT THAT I DO NOT BELIEVE YOU.',
        'THE ORDER WENT IN AT A RANK. IT HAS TO COME OUT AT A RANK. I HAVE TRIED IT THE OTHER WAY FOR ELEVEN YEARS AND IT DOES NOT TAKE.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    const lines = {
      maret: [
        'Rusk. Stand down.',
        'Maret Sunder. General of a standard that does not exist, of an army that does not exist, on a road that does. It is the only rank on the road and it will have to do.',
      ],
      aurelian: [
        'Rusk. Stand down.',
        'Aurelian Marchetti, Engineer-King of Solmere, of which there is currently about a third. The seal is in my coat and the coat is the same coat.',
      ],
      idris: [
        'Rusk. Stand down.',
        'Ser Idris Vance, Last Blade of Ashenhall. There is no house behind that and there has not been for forty years, and it was still a rank when they gave it to me.',
      ],
    };
    yield* say(game, officer.name, [lines[officer.id][0]]);
    yield* say(game, 'Rusk', ['ORDER RECEIVED. QUERY: ORDER FROM WHOM.']);
    yield* say(game, officer.name, [lines[officer.id][1]]);
    yield* say(game, 'Rusk', ['ORDER LOGGED. ORDER ACKNOWLEDGED.']);
    yield* say(game, null, ['The core dims by about a third. It stays there for four seconds and comes back up.']);
    yield* say(game, 'Rusk', [
      'I HAVE STOOD DOWN. I AM NOW STANDING BACK UP, WHICH IS A DIFFERENT THING, AND I WOULD LIKE IT ENTERED IN THE LOG.',
    ]);
    yield* say(game, officer.name, ['There is no log.']);
    yield* say(game, 'Rusk', [
      'NO. THERE HAS NOT BEEN A LOG SINCE YEAR FORTY-ONE.',
      'I WILL KEEP IT MYSELF. ENTRY ONE.',
    ]);
    p.setFlag('rusk_relieved');
    p.completeQuest('relief');
    yield* cinematic(game, false);
  },

  /** Tam teaches the party to walk. Ruined world only. No combat. */
  *tam_quiet_lesson(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('tam')) {
      yield* say(game, null, ['Something has been lying on the ridge long enough to press the grass flat. The grass has not come back up.']);
      return;
    }
    if (p.hasFlag('tam_taught')) {
      yield* say(game, 'Tam', ['Still loud. Less loud. Keep the heel last.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Tam', [
      'Stop. All of you stop.',
      'There is one on the ridge. Has been since the mile before last. You went past it three times and it let you.',
    ]);
    yield* say(game, 'Vesna', ['Why did it let us.']);
    yield* say(game, 'Tam', [
      'Because it is full. Not because you are clever.',
      'Walk like the ground is asleep. Heel last. Do not look up at the ridge — looking is loud.',
    ]);
    yield* say(game, null, ['The party covers half a mile at nobody\'s natural pace. Nothing on the ridge moves, and the wind does not change.']);
    yield* say(game, 'Tam', [
      'There. Keep it.',
      'Take the cord. Was on a man in the reeds, and he was quiet after, so it works.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'quietstep', label: 'a Quiet Step' }, ctx.field);
    p.setFlag('tam_taught');
    p.completeQuest('quiet');
    yield* cinematic(game, false);
  },

  /** Ilsabet paints one of the party. The player picks who sits. No combat. */
  *ilsabet_long_look(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('ilsabet')) {
      yield* say(game, null, ['A board propped against a wall with three ground colours laid in and nothing on top of them yet.']);
      return;
    }
    if (p.hasFlag('portrait_done')) {
      yield* say(game, 'Ilsabet', ['It is drying. Do not look at it wet — wet is a lie about what colour a thing is going to be.']);
      return;
    }
    const sitters = p.activeMembers.filter((m) => m.id !== 'ilsabet');
    if (!sitters.length) {
      yield* say(game, 'Ilsabet', ['I need somebody who is not me. I have done me and it was not interesting.']);
      return;
    }
    yield* say(game, 'Ilsabet', [
      'I have a board and about two hours of light and I am not wasting either on the scenery.',
      'One of you sits. Not for a portrait. I want somebody\'s face doing nothing.',
    ]);
    const choice = yield* game.dialogue.ask(
      'Who sits?',
      [...sitters.map((m) => m.name), 'Nobody sits'],
      { speaker: 'Ilsabet', cancelable: true },
    );
    game.dialogue.close();
    if (choice < 0 || choice >= sitters.length) {
      yield* say(game, 'Ilsabet', [
        'Fine. I will do the road, and the road will hold still, which is one thing the road has over all of you.',
      ]);
      return;
    }
    const sitter = sitters[choice];
    yield* cinematic(game, true);
    yield* say(game, 'Ilsabet', [
      `${sitter.name}. On the crate. Face that way and stop arranging it.`,
      'Put your face where it goes when you are not doing anything with it. That is the one I want. Everybody assumes I want the other one.',
    ]);
    yield* say(game, null, [
      'It takes the whole two hours. She works from the eyes outward and leaves the mouth until the light is nearly gone.',
      'She turns the board round without any announcement.',
    ]);
    yield* say(game, 'Vesna', ['It is not kind.']);
    yield* say(game, 'Ilsabet', [
      'No. Kind is a separate commission and it pays considerably better. This one is right.',
      'Later on there will be an argument about what all of us looked like. I am settling it now.',
    ]);
    p.setFlag('portrait_done');
    p.setFlag(`portrait_${sitter.id}`);
    p.completeQuest('portrait');
    yield* cinematic(game, false);
  },

  /**
   * The collapsed gallery under Solmere. Bastian lifts the beam; nothing
   * fights back. What is underneath is what the nine days were about.
   */
  *bastian_heavy_end(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('gallery_lifted')) {
      yield* say(game, null, ['The gallery mouth is open. Somebody has set a bench across it, which would stop nobody and is not meant to.']);
      return;
    }
    if (!p.roster.has('bastian')) {
      yield* say(game, null, [
        'A gallery mouth, shut by a fallen beam and eleven years of brick dust.',
        'There is a brass plate screwed to the beam with two names on it and no dates.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, ['A fallen beam across the gallery mouth, with a brass plate screwed to it. Two names, no dates.']);
    yield* say(game, 'Bastian', [
      'Ross and Kelmy. They were in there when it came down and they were in there nine days after.',
      'He came down on the ninth day and did the sums out loud, in front of the shift, and the sums were right.',
    ]);
    if (p.roster.has('aurelian')) {
      yield* say(game, 'Aurelian', [
        'I would have signed it on the seventh. Every hour past the seventh was arithmetic I already had.',
        'I waited two days and I have never once been able to say what for.',
      ]);
    }
    yield* say(game, 'Bastian', ['Move.']);
    yield* say(game, null, [
      'It takes him a long time. It is not a lift so much as an argument with a beam, conducted in stages, with rests in it.',
      'The brick dust comes off the top in one sheet and then the beam goes over.',
    ]);
    yield* say(game, 'Bastian', [
      'They were brought up years ago, before you ask. Their people had them out inside the month, without a writ, at night.',
      'Somebody had to carry the heavy end and it was not the Engine House.',
    ]);
    yield* say(game, null, [
      'What is under the beam is the face the gallery was driven at. Set in it, at chest height, is something that is not stone.',
    ]);
    yield* game.grantChest({ kind: 'esper', id: 'quarryhound', label: 'a shard of magicite' }, ctx.field);
    yield* say(game, 'Bastian', ['Nine days from that. Nine days.']);
    yield* say(game, null, ['He sets the beam down where it will not roll, and then stands looking at the plate for longer than the lift took.']);
    p.setFlag('gallery_lifted');
    p.completeQuest('gallery');
    yield* cinematic(game, false);
  },

  /**
   * Maret writes out what she countersigned. Quiet, and it puts the Engine Key
   * in the party's hands — which is what opens the low door under the Well.
   */
  *maret_countersign(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('maret')) {
      yield* say(game, null, ['A standing order board, and a rectangle on it where the damp has not got in because something used to hang there.']);
      return;
    }
    if (p.hasFlag('maret_confession')) {
      yield* say(game, 'Maret', [
        'It is pinned where I said it would be. Nobody has read it.',
        'That is not the point, and I have had to tell myself that it is not the point on four separate occasions.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Maret', [
      'I have written it out. Every requisition I countersigned, in order, with the tonnage, the date, and what the tonnage actually was.',
      'It runs to four pages. I expected it to be longer, and I have been sitting with the fact that it is not.',
    ]);
    yield* say(game, 'Maret', ['Vesna. Read the last page and tell me whether I have spelled the name right. I have only ever seen it stamped.']);
    yield* say(game, 'Vesna', ['You have missed a letter.']);
    yield* say(game, 'Maret', ['Then I will do the page again.']);
    yield* say(game, null, ['She does the page again. It takes a quarter of an hour and nobody fills the quarter of an hour with anything.']);
    yield* say(game, 'Maret', [
      'It goes on the outpost board, under the standing orders, where it will be the only thing on that board written by hand.',
      'And you had better take this now, because I am not walking back out through that gate afterwards.',
    ]);
    yield* game.grantChest({ kind: 'key', id: 'enginekey', label: 'the Engine Key' }, ctx.field);
    yield* say(game, 'Maret', [
      'The low door under the Well. It has been down as lost on the inventory since year forty-one, and it has been in my coat since year forty-one.',
      'I have taken it out perhaps twice. Both times I put it back.',
    ]);
    p.setFlag('maret_confession');
    p.completeQuest('countersign');
    yield* cinematic(game, false);
  },

  /** The Mask has picked up somebody's habit. Ruined world only. No combat. */
  *mask_reflection(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('themask')) {
      yield* say(game, null, ['Two sets of prints in the ash, the same size, one exactly inside the other.']);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['Nobody is standing there. Somebody was standing there.']);
      return;
    }
    if (p.hasFlag('mask_seen')) {
      yield* say(game, 'The Mask', ['…']);
      return;
    }
    // Vesna is excluded: she is the one who tells it to stop, and the habit it
    // drops has to belong to somebody other than the habit it picks up next.
    const others = p.activeMembers.filter((m) => m.id !== 'themask' && m.id !== 'vesna');
    const subject = others.length ? rng.world.pick(others) : null;
    yield* cinematic(game, true);
    yield* say(game, null, [
      'For three days the Mask has been doing one particular thing.',
      'It checks a strap it is not wearing, twice, at the same two points of the morning, and then puts its hand back down.',
    ]);
    if (subject) {
      yield* say(game, null, [
        `${subject.name} has done that for years. Nobody has ever mentioned it, because it is not the sort of thing anybody mentions.`,
      ]);
      yield* say(game, 'Vesna', ['Stop doing that.']);
      yield* say(game, null, [
        'It stops. It stops between one motion and the next, mid-reach, and puts the hand down.',
        'By the afternoon it is standing the way Vesna stands when she is listening to something the others cannot hear.',
      ]);
      yield* say(game, 'Vesna', ['Do the strap. Go back to the strap.']);
      yield* say(game, 'The Mask', ['…']);
      yield* say(game, null, ['It goes back to the strap.']);
    } else {
      yield* say(game, null, ['There is nobody in the party it could have taken that from. It does it again in the morning.']);
    }
    p.setFlag('mask_seen');
    p.completeQuest('mask_habit');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // The decision. Both answers take something.
  // =========================================================================

  /**
   * The last working lattice on the continent is heating what is left of
   * Solmere. Stopping it frees a name and costs the party the money it takes
   * to move sixty households south before winter; leaving it running keeps
   * the city alive and costs the party a shard of magicite, because the draw
   * has to come from somewhere and the party is the only somewhere left.
   *
   * There is no third option and neither of the two is free.
   */
  *the_last_measure(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('measure_decided')) {
      yield* say(game, null, p.hasFlag('solmere_dark')
        ? ['The cradle is empty. The pipes above it tick as they cool, and they have been ticking for days.']
        : ['The lattice turns. Four measures an hour, and the long room is the only warm room on this coast.']);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['The lattice turns in its brass cradle, very slowly, the way it has turned for eleven years.']);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('memory', { fade: 1.0 });
    yield* say(game, null, [
      'There is no roof over the east end of the Engine House any more. The cradle is untouched.',
      'The lattice is still turning. Four measures an hour, and every one of them goes out through the floor to the streets that are left.',
    ]);
    yield* say(game, 'Under-Clerk', [
      'Sixty-one households. Water at the standpipe, heat in the long room, and the Governor\'s Rest takes anyone who walks in and does not ask.',
      'I am still signing for it. There is nobody to hand the sheets to, so they go in the drawer.',
    ]);
    yield* say(game, 'Vesna', ['And it is a person.']);
    yield* say(game, 'Under-Clerk', ['Yes.']);
    if (p.roster.has('kestrel')) {
      yield* say(game, 'Kestrel', p.hasFlag('names_read')
        ? ['That is the sixty-first. That is the one I would not read out.']
        : ['Sixty-one on my list. Sixty are finished. This is the one that is not.']);
    }

    const choice = yield* game.dialogue.ask(
      'The inner ring has a name cut into it. You are close enough to read it.',
      ['Stop the draw', 'Leave it running'],
      { cancelable: false },
    );
    game.dialogue.close();

    if (choice === 0) {
      // --- stop it -------------------------------------------------------
      yield* say(game, null, [
        'The cradle takes about a minute to run down. The lattice comes apart in the last few seconds of it and the pieces are cold before they reach the floor.',
      ]);
      yield* say(game, null, ['Vesna says the name once, at speaking volume, the way you would say it across a table.']);
      yield* say(game, null, [
        'The standpipe stops that afternoon. By the second night the long room is colder than the street, the way a room with no fire in it always is.',
      ]);
      const owed = Math.min(p.gold, 4000);
      p.spendGold(owed);
      if (owed > 0) {
        yield* say(game, null, [
          `The party puts ${owed} gil into carts, coal and a fortnight of somebody else's grain, and it is not enough, and it goes anyway.`,
        ]);
      } else {
        yield* say(game, null, [
          'The party has nothing to put into carts or coal. What goes south with the households instead is most of what the party was carrying to eat.',
        ]);
      }
      yield* say(game, 'Under-Clerk', [
        'Sixty-one households on the Harrowmere road before the frost. I will walk at the back with the sheets.',
        'I would like it noted that I have not asked you whether it was worth it. I have decided not to ask.',
      ]);
      p.setFlag('solmere_dark');
      p.setFlag('name_returned');
    } else {
      // --- leave it running ----------------------------------------------
      yield* say(game, 'Under-Clerk', [
        'Then it holds until the frost and not past it. The seam it draws on is nearly out — you can hear the change in the pitch at night.',
        'To carry the city to spring, the cradle takes another measure. There is nowhere on this continent left to get one.',
      ]);
      yield* say(game, 'Vesna', ['There is one place.']);
      const candidates = ['brasswright', 'saltwidow', 'quarryhound', 'stormcaller', 'hoarking', 'greenmother'];
      const given = candidates.find((id) => p.espers.has(id)) ?? null;
      if (given) {
        p.espers.delete(given);
        for (const m of p.roster.values()) {
          if (m.esper && m.esper.id === given) m.esper = null;
        }
        yield* say(game, null, [
          'The shard goes into the cradle beside the lattice and takes about four seconds to settle.',
          `${ESPERS[given].name} is gone from the party's magicite.`,
        ]);
        yield* say(game, 'Vesna', [
          'There was a name in that one as well.',
          'I have read this one off the ring. I am not going to say it while the thing is still turning.',
        ]);
      } else {
        const owed = Math.min(p.gold, 6000);
        p.spendGold(owed);
        yield* say(game, null, owed > 0
          ? [`The party has no shard to give. What goes into the ledger instead is ${owed} gil, against a draw the city cannot pay for and will not stop.`]
          : ['The party has no shard to give and nothing in the purse to give instead. The Under-Clerk writes the line anyway and leaves the figure blank.']);
      }
      yield* say(game, 'Under-Clerk', [
        'The standpipe runs. The long room is warm. I have written down what it cost and there is still nobody to hand the sheet to.',
      ]);
      p.setFlag('solmere_lit');
      p.setFlag('measure_given');
    }

    p.setFlag('measure_decided');
    p.completeQuest('measure');
    // Every other scene that changes the music ends in a battle or a new map,
    // either of which re-enters the field and restores the theme. This one does
    // neither, so it has to hand the map its own music back.
    if (ctx.field?.mapDef?.music) game.playMusic(ctx.field.mapDef.music, { fade: 1.6 });
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Superbosses. Both optional, both after the world changes state.
  // =========================================================================

  /**
   * The eight burnt alcoves of Ashenhall light again once the ninth lantern
   * has been carried off. They are keeping her place.
   */
  *choir_under_ashenhall(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('choir_slain')) {
      yield* say(game, null, ['Nine alcoves, nine dark. The hall does not echo any more, which for a hall this size takes some doing.']);
      return;
    }
    if (p.worldState !== 'ruin' || !p.hasFlag('lantern_slain')) {
      yield* say(game, null, ['The burnt alcoves are cold. Something behind the brickwork clicks, twice, and stops.']);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'The eight burnt alcoves are lit.',
      'They were burnt a thousand years ago and they are burnt now and they are lit, and the light is coming from behind the brick rather than out of it.',
    ]);
    yield* say(game, 'Vesna', [
      'Eight of them, and the ninth alcove is the loud one, and there is nothing in the ninth alcove.',
      'They are keeping her place. They have been keeping her place since we took her out of it.',
    ]);
    yield* tremor(game, 1.4, 0.55);
    yield* cinematic(game, false);

    // Not the Eighth Lantern: this scene is gated on her already being dead,
    // and the whole point of it is that the other eight are holding her place.
    const result = yield* game.startBattleScene(
      { enemies: ['chorister', 'lanternbearer', 'lanternbearer'] },
      { boss: true, terrain: 'marble', scenery: 'none', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('choir_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'They go out in order, from the eighth back to the first, at about the pace a person walks the length of a hall.',
    ]);
    yield* say(game, 'Vesna', ['That was the last of the vigil. Nobody is standing over anything in here now.']);
    yield* game.grantChest({ kind: 'item', id: 'megalixir', count: 3, label: '3 Megalixirs' }, ctx.field);
    p.addGold(9000);
    yield* say(game, null, [
      'The offering plates hold 9000 gil in coin that stopped being legal four hundred years ago, stacked, and counted, and counted recently.',
    ]);
    p.completeQuest('choir');
    yield* cinematic(game, false);
  },

  /**
   * The low door under the Well. The Engine Key opens it; what is behind it is
   * the record, and the last things the Well took are standing up in it.
   */
  *the_well_reads_back(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('record_slain')) {
      yield* say(game, null, [
        'The low door stands open on a room with nothing in it but shelving.',
        'The shelving is empty and the room is a very great deal longer than the shaft it is cut into.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['A low door, flush with the shaft wall, no handle, and a keyway worn bright by use.']);
      return;
    }
    if (p.countItem('enginekey') < 1) {
      yield* say(game, null, ['The low door has a keyway worn bright by use and nothing else on it. It does not move.']);
      if (p.roster.has('maret')) {
        yield* say(game, 'Maret', ['I know that keyway. Ask me about it when I am sitting down and have had a moment.']);
      }
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'The key turns without any argument at all. Behind the door is shelving, and the shelving runs further back than the rock does.',
      'Every shelf is full. Nothing on any of them is a book.',
    ]);
    yield* say(game, 'Vesna', [
      'It is not guarding this. It is reading it.',
      'It has been reading us since the stair, and the three at the front are the three it read most recently.',
    ]);
    yield* tremor(game, 1.8, 0.7);
    yield* cinematic(game, false);

    // Not the Warden again — Vesna has just said this thing is reading rather
    // than guarding, and the Warden died at the shaft head on the main line.
    const result = yield* game.startBattleScene(
      { enemies: ['deadreckoner', 'stoppedman', 'stoppedman'] },
      { boss: true, terrain: 'cobble', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('record_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The shelving goes dark one bay at a time, from the door inward, and does not stop when it reaches the wall.',
    ]);
    yield* say(game, 'Vesna', [
      'It had all of them. Every name it ever drew, in order, and it was still taking them down when we came through the door.',
      'Somebody built a room to remember this in, and then put a lock on it and lost the key on purpose.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'elixir', count: 5, label: '5 Elixirs' }, ctx.field);
    p.addGold(15000);
    yield* say(game, null, ['Behind the last bay is a strongbox with 15000 gil in it, and a requisition slip made out to nobody.']);
    p.completeQuest('record');
    yield* cinematic(game, false);
  },

  /** The roadside well, after. The quietest thing in the game. */
  *vesna_still_here(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['Cold, clean, and somebody has left a tin cup on the rim.']);
      return;
    }
    if (p.hasFlag('tin_cup')) {
      yield* say(game, null, ['The cup is on the rim, upside down, drying. It has been moved since you were last here.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The windlass has gone. Somebody has rigged a rope over the beam with a knot in it every arm\'s length.',
      'The tin cup is still on the rim. It is upside down, which is not how you leave a cup you have finished with.',
    ]);
    yield* say(game, 'Vesna', ['Somebody is still filling it.']);
    yield* say(game, null, [
      'She draws a cup and drinks it and sets it back upside down, and then stands with her hand flat on the stone for a while.',
    ]);
    yield* say(game, 'Vesna', [
      'It is cold. It is exactly as cold as it was.',
      'I keep waiting for something to have changed. It was never going to be the water.',
    ]);
    yield* say(game, null, ['The party fills what it is carrying and sits on the wall until the light goes.']);
    p.restAll();
    p.setFlag('tin_cup');
    yield* say(game, null, ['HP and MP fully restored.']);
    p.completeQuest('tincup');
    yield* cinematic(game, false);
  },
};

export function vol2EventById(id) {
  return VOL2_EVENTS[id] || null;
}
