import { wait, over } from '../engine/scheduler.js';
import { ESPERS } from './espers.js';

/**
 * Scripted events, volume three — sidequests and optional scenes.
 *
 * Same contract as `EVENTS` and `VOL2_EVENTS`: every entry is a generator
 * receiving `(game, ctx)` and written as a coroutine, so a scene reads top to
 * bottom in source the way it plays on screen. Nothing in here is on the
 * critical path.
 *
 * Volume two covered the cast. This one covers the places, and takes its
 * shapes from what volume two did not do:
 *
 *   - a chain of five that is *not* ordered (postbag_*). Three deliveries in
 *     three towns, in any order the player likes, and a fifth scene that will
 *     not open until all three flags are set. Volume two's chains are gated
 *     stage by stage; this one is gated on a count, so the player is never
 *     told which town to go to next and never blocked at the wrong door.
 *   - a quest that can be lost for good. The channel marks at Saltmarch have
 *     to be set before the world changes state, and after it there is no way
 *     back to them (saltmarch_withies).
 *   - a scene whose whole content is decided by who is standing in the active
 *     four (verrenholt_moot).
 *   - six hunts, standing at the end of roads nobody has to walk down, using
 *     the late bosses of `enemies-vol3.js`. Five of them are open the moment
 *     the sky changes; the sixth wants the other five done first.
 *
 * Nine of the twenty-two are gated on `party.worldState === 'ruin'`, because
 * half of what this volume is about is places carrying on afterwards.
 */

// --- small helpers, matching the ones in events.js and events-vol2.js -------

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

/**
 * First of `ids` standing in the active four, or null.
 *
 * Deliberately the *active* party rather than the roster: a scene that turns
 * on who speaks has to turn on who is actually there, or the player never sees
 * it change.
 */
function speaking(party, ids) {
  for (const id of ids) {
    const m = party.activeMembers.find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}

/** How many of `flags` are set. Used to gate on a count rather than an order. */
function countFlags(party, flags) {
  return flags.filter((f) => party.hasFlag(f)).length;
}

/**
 * Hand over magicite the player may already be carrying.
 *
 * Every shard in the game is also sitting in a chest somewhere, and a scene
 * that ends by announcing a thing the party already owns is a scene that ends
 * badly. If the shard is already in hand, the scene says so and pays in metal
 * instead.
 */
function* grantEsper(game, id, label, field, fallbackId, fallbackLabel) {
  if (!game.party.espers.has(id)) {
    yield* game.grantChest({ kind: 'esper', id, label }, field);
    return;
  }
  yield* say(game, null, [
    `The shard is ${ESPERS[id].name}, and there is one of those in the party's keeping already.`,
    'Both are the same weight, and neither of them is any colder than the other.',
  ]);
  yield* game.grantChest({ kind: 'item', id: fallbackId, label: fallbackLabel }, field);
}

const POSTBAG_LETTERS = ['letter_sexton', 'letter_pier', 'letter_bell'];

export const VOL3_EVENTS = {
  // =========================================================================
  // Almer Selby's round. Three letters, three towns, any order, and a fourth
  // at the bottom of the bag that was never going to be posted.
  // =========================================================================

  /** The satchel in the ditch. Starts the round. */
  *postbag_found(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('postbag_closed')) {
      yield* say(game, 'Yard Porter', [
        'Bag is back on its hook by the weighbridge. Nobody has touched it and nobody is going to.',
      ]);
      return;
    }
    if (p.hasFlag('postbag')) {
      const done = countFlags(p, POSTBAG_LETTERS);
      yield* say(game, 'Yard Porter', done === 0
        ? ['Three names on the sealed ones. A sexton at Verrenholt, a woman off the Saltmarch pier, and the bellringer up at Duncastle.']
        : [`${done} of the three, by my count, and I do count.`,
           'The rest are where they were. They keep better than most freight.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'A leather satchel in the ditch under the hedge. The strap has been cut through in one pass rather than worn through in ten years.',
      'Fourteen letters. Seven are sealed. The seven that are open were opened carefully and then put back the right way round.',
    ]);
    yield* say(game, 'Yard Porter', [
      'Almer Selby carried that. Parish post, Emberlyn to the coast and back, twice a month, nine years.',
      'He stopped coming through in the spring. Nobody made much of it. A great many people stopped coming through in the spring.',
    ]);
    yield* say(game, 'Vesna', ['Who has the round now.']);
    yield* say(game, 'Yard Porter', [
      'Nobody has the round now. I go where the wagons go, and the wagons go where there is a load, and a letter is not a load.',
      'You lot are going everywhere. That is the entire trade. That is all it ever was.',
    ]);
    yield* say(game, null, [
      'Three of the sealed letters have addresses still legible: a sexton at Verrenholt, a woman off the pier at Saltmarch, the bellringer at Duncastle.',
      'The fourth sealed one at the bottom has no frank on it at all.',
    ]);
    p.setFlag('postbag');
    p.startQuest('postbag', 0);
    yield* cinematic(game, false);
  },

  /** Verrenholt. The man it is addressed to is in the fourth row. */
  *postbag_sexton(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('letter_sexton')) {
      yield* say(game, 'Sexton Mab', ['It is in the book, on his page, with the address copied into the margin. Nobody has come asking.']);
      return;
    }
    if (!p.hasFlag('postbag')) {
      yield* say(game, 'Sexton Mab', [
        'Fourth row is Hollises, mostly. The rest of the yard is whoever was here at the time.',
        'I dig all of them. That is not a claim to anything, it is a rota.',
      ]);
      return;
    }
    yield* say(game, 'Sexton Mab', [
      'Tobe Hollis. Fourth row, third from the wall, two years and a bit.',
      'Give it here. I can read an address without opening it, which is more than the parish can say for itself.',
    ]);
    yield* say(game, 'Vesna', ['Does it go in with him.']);
    yield* say(game, 'Sexton Mab', [
      'The ground has enough in it.',
      'It goes in the book. I write down who is in each row and what came for them afterwards, and there are four other entries on that page with something written underneath.',
    ]);
    yield* say(game, null, [
      'She copies the address into the margin in a hand a good deal better than the one on the envelope, and lays the letter flat between two pages.',
    ]);
    yield* say(game, 'Sexton Mab', [
      'If anyone ever comes asking after him, that is where I point them.',
      'It has happened once. She did not open it either.',
    ]);
    p.setFlag('letter_sexton');
    p.advanceQuest('postbag', countFlags(p, POSTBAG_LETTERS));
  },

  /** Saltmarch. She will not take it while anybody is watching. */
  *postbag_pier(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('letter_pier')) {
      yield* say(game, null, [
        'The boards where the letter sat are darker than the two either side of them.',
        'The woman is at the far end of the pier with her back to the town, which is where she is most days.',
      ]);
      return;
    }
    if (!p.hasFlag('postbag')) {
      yield* say(game, 'Woman on the Pier', ['High water at four. You are standing where the rope goes.']);
      return;
    }
    yield* say(game, null, ['She looks at the address, then at the water, then at the address again.']);
    yield* say(game, 'Woman on the Pier', [
      'That is his hand. He wrote small so he would not have to pay for the second sheet.',
      'Put it on the boards.',
    ]);
    yield* say(game, 'Vesna', ['You can have it in your hand.']);
    yield* say(game, 'Woman on the Pier', [
      'I did not say I did not want it. I said put it on the boards.',
      'I am not opening that with four strangers on the pier and the tide coming in behind them.',
    ]);
    yield* say(game, null, [
      'The letter goes on the boards, weighted with a shackle so the wind cannot have it.',
      'She does not move while anyone is still on the pier, and the party is a long time walking off it.',
    ]);
    p.setFlag('letter_pier');
    p.advanceQuest('postbag', countFlags(p, POSTBAG_LETTERS));
  },

  /** Duncastle. Eleven years, four lines, and three of them about a horse. */
  *postbag_bell(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('letter_bell')) {
      yield* say(game, 'Bellringer Quill', [
        'I have got the hour right every day since. That is not connected to anything and I am aware of it.',
      ]);
      return;
    }
    if (!p.hasFlag('postbag')) {
      yield* say(game, 'Bellringer Quill', [
        'Hour, half hour, and the muffled peal for a burial. Three jobs. I have had the rope forty years and it has had me.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Bellringer Quill', [
      'That is a Ferran frank and that is my brother\'s hand, and those two things have been in the same room before.',
      'Eleven years. He took their coin at the gate and I said something to him there that I have had eleven years to improve on.',
    ]);
    yield* say(game, null, ['He reads it standing in the bailey with his cap still on.']);
    yield* say(game, 'Bellringer Quill', [
      'Four lines. Three of them are about a horse.',
      'He has spelled my name the way he spelled it at seven, which I let him have then and am not going to stop letting him have now.',
    ]);
    yield* say(game, 'Vesna', ['And the fourth line.']);
    yield* say(game, 'Bellringer Quill', ['That one is mine.']);
    yield* say(game, null, [
      'He rings the hour four minutes early. The second and third strokes come too close together and he leaves them where they fell.',
    ]);
    p.setFlag('letter_bell');
    p.advanceQuest('postbag', countFlags(p, POSTBAG_LETTERS));
    yield* cinematic(game, false);
  },

  /** The unfranked one. It was in his own hand and it never went anywhere. */
  *postbag_last(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('postbag_closed')) {
      yield* say(game, null, ['The satchel hangs on the gate of a house by the mill. Somebody has re-tied the cut strap, badly, and left it hanging.']);
      return;
    }
    if (countFlags(p, POSTBAG_LETTERS) < 3) {
      yield* say(game, null, [
        'The last sealed letter is in the same hand as the round book on the flap, addressed to a house by the mill at Harrowmere.',
        'It has been carried for nine years and franked by nobody. There are three other letters in the bag with people still attached to them.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The bag is empty apart from the last one, which is addressed in the carrier\'s own hand to a house by the mill at Harrowmere.',
      'A man who walked past that door twice a month for nine years never once put it under it.',
    ]);
    const choice = yield* game.dialogue.ask(
      'It is sealed with a smear of wax and a thumb.',
      ['Put it under the door', 'Open it'],
      { cancelable: false },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* say(game, null, [
        'The house by the mill is standing and has somebody in it. The letter goes under the door at about eleven in the morning.',
        'Nobody in the party waits to see the light change on the other side of it, and the walk back to the road takes longer than it should.',
      ]);
      yield* say(game, 'Vesna', ['We are not going to know.']);
      yield* say(game, null, ['Nobody argues with that, and the argument would not have been about the letter.']);
    } else {
      yield* say(game, null, [
        'It is not a letter. It is his round, written out in order — every town, the times he made between them, nine years of them, one line each.',
        'At the bottom is a figure, underlined twice, in the hand he used when he was pleased with himself.',
      ]);
      yield* say(game, null, ['Underneath the figure, in a different ink and much later: still too slow.']);
      yield* say(game, 'Vesna', ['He was going to give it to her when it was quicker.']);
    }

    yield* say(game, null, [
      'The satchel goes on the gate of the house by the mill. The bell off the strap comes away in the hand and stays in it.',
    ]);
    p.addItem('wanderersbell');
    p.setFlag('postbag_closed');
    p.advanceQuest('postbag', 4);
    yield* game.celebrate(["Obtained a Wanderer's Bell."], ctx.field);
    p.completeQuest('postbag');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // The road, the channel, and the town meeting. No fighting in two of three.
  // =========================================================================

  /**
   * A dead carter's road pass. The paper outlives the man by regulation, which
   * is the only interesting thing the regulation does.
   */
  *carter_pass(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('carter_pass')) {
      yield* say(game, 'Toll Clerk Nabb', [
        'Two years and five months left on it. Do not lose it and do not let anybody at the checkpoint hold it for longer than reading takes.',
      ]);
      return;
    }
    yield* say(game, 'Toll Clerk Nabb', [
      'A pass is issued against a name and a trade. Silt Road, Ferran checkpoint, three years from the stamp, no renewals.',
      'Doule Cane died in the second week of his. It has two years and seven months left on it and it does not know.',
    ]);
    yield* say(game, 'Vesna', ['His wife cannot use it.']);
    yield* say(game, 'Toll Clerk Nabb', [
      'His wife is not a carter. That is the whole of the objection and I have put it in writing twice, in the same words, to the same office.',
      'She is at the yard end. Ask her yourself. If she says yes I will strike his name and write another one, and I will be extremely slow about the part where I look at your face.',
    ]);
    const choice = yield* game.dialogue.ask(
      'The yard end of the market is four minutes away and it is the sort of thing that can be left undone.',
      ['Go and ask her', 'Leave it'],
      { speaker: 'Toll Clerk Nabb', cancelable: true },
    );
    game.dialogue.close();
    if (choice !== 0) return;

    yield* cinematic(game, true);
    yield* say(game, "Carter's Widow", [
      'Take it. It is on the shelf with his cup, and I have moved the pair of them once, to dust under them, and put them back where they were.',
      'Eleven years he was on that road. The pass is the only thing the road gave him that has outlasted him, and I would rather it went through a gate than sat on a shelf.',
    ]);
    yield* say(game, null, [
      'Nabb strikes the name, writes another one, blots it, and turns the book round.',
    ]);
    yield* say(game, 'Toll Clerk Nabb', [
      'That is a forgery committed in front of a clerk, which is a different offence to the one you were expecting and a considerably lighter one.',
      'Hold it up at the checkpoint. Do not hand it over. They are not allowed to keep it and they will try, because everybody tries.',
    ]);
    yield* game.grantChest({ kind: 'key', id: 'siltroadpass', label: 'a Silt Road Pass' }, ctx.field);
    p.setFlag('carter_pass');
    p.completeQuest('carter');
    yield* cinematic(game, false);
  },

  /**
   * The channel marks at Saltmarch. This one can be lost.
   *
   * The withies go in before the world changes state or they do not go in at
   * all: afterwards the pilot is gone south, the line is lying in the mud east
   * of where it should be, and there is nothing here to complete. It is the
   * only quest in the three volumes with a door that shuts.
   */
  *saltmarch_withies(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('withies_set')) {
      yield* say(game, 'Harbour Pilot Dace', p.worldState === 'ruin'
        ? [
          'Channel is where we put it. Two boats in on the last tide, which is two more than the coast road has managed since the sky went.',
          'They came in on the marks in the dark. That is what the marks are for and nobody has ever thanked a withy.',
        ]
        : ['One and a half at the bend and the withies say so. I walk the line at low water out of habit and I have not had to move one since.']);
      return;
    }
    if (p.hasFlag('withies_lost')) {
      yield* say(game, 'Tide-Reeve Onna', [
        'There is water out there and no way through it. It is a strange thing for a port to be short of.',
      ]);
      return;
    }
    // The door shuts here. Nothing about this branch offers a way back.
    if (p.worldState === 'ruin') {
      yield* cinematic(game, true);
      yield* say(game, null, [
        'The withy line is down. What is left of it is lying east of where it should be, in the mud, still tied in its bundles.',
        'The board at the pier head where the tide was posted has come off two of its four nails and swings when the wind gets under it.',
      ]);
      yield* say(game, 'Tide-Reeve Onna', [
        'Dace went south in the autumn. He said the channel had walked and he was not going to stand on a pier and be asked about it every day.',
        'Nothing has come in since. Nothing is going to. There is water out there and no way through it, and I have stopped putting the tide up.',
      ]);
      yield* say(game, 'Vesna', ['It could be marked again.']);
      yield* say(game, 'Tide-Reeve Onna', [
        'By somebody who knows where it is. That was one man and he is in the south.',
        'You could put sixty sticks in that mud tomorrow and every one of them would be a lie.',
      ]);
      p.setFlag('withies_lost');
      if (p.questStage('withies') >= 0) p.advanceQuest('withies', 9);
      yield* cinematic(game, false);
      return;
    }

    if (p.questStage('withies') < 0) p.startQuest('withies', 0);
    yield* say(game, 'Harbour Pilot Dace', [
      'Two fathom at the pier head, one and a half at the bend, and nothing whatever where the chart says three.',
      'The withies go in every spring or the channel walks. It has gone a boat\'s width west since the year before last, and I am the only man alive who knows that.',
    ]);
    yield* say(game, 'Harbour Pilot Dace', [
      'It is willow, tar, and eight hundred gil. Then it is four days out on the flats with something in the weirs that objects to company.',
      'The parish has the four days. What the parish has not got is the eight hundred, and I have asked.',
    ]);
    const choice = yield* game.dialogue.ask(
      'The flats are dry twice a day and not a minute longer than that.',
      ['Pay the eight hundred', 'Not this spring'],
      { speaker: 'Harbour Pilot Dace', cancelable: true },
    );
    game.dialogue.close();
    if (choice !== 0) return;
    if (!p.spendGold(800)) {
      yield* say(game, 'Harbour Pilot Dace', ['You are short. The tide is not interested and neither is the willow merchant.']);
      return;
    }
    p.advanceQuest('withies', 1);
    yield* say(game, null, [
      'The bundles go out on a flat-bottomed punt at first light. Something has been feeding in the weirs and has not finished.',
    ]);
    const result = yield* game.startBattleScene(
      { enemies: ['weirmaw', 'crustcrab', 'saltferryman'] },
      { terrain: 'sand', scenery: 'none', canFlee: false },
    );
    if (result !== 'victory') return;

    yield* cinematic(game, true);
    yield* say(game, null, [
      'Sixty withies go in over two days. On the third, Dace walks the whole line at dead low water and moves eleven of them without explaining any of the eleven.',
    ]);
    yield* say(game, 'Harbour Pilot Dace', [
      'That one is right and it looks wrong. That is the one that matters. A stranger coming in at night follows the ones that look wrong.',
    ]);
    yield* say(game, null, [
      'A boat comes in on the ninth day. It is the wrong boat, out of the north, with a cargo nobody in Saltmarch ordered, and the whole town is on the pier for it.',
    ]);
    yield* say(game, 'Harbour Pilot Dace', [
      'Take the ward-plate off her. She came in on my marks and she is not going out on them until the master has paid harbour dues that he has already told me he cannot pay.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'tidewardshield', label: 'a Tideward Shield' }, ctx.field);
    p.setFlag('withies_set');
    p.completeQuest('withies');
    yield* cinematic(game, false);
  },

  /**
   * The Verrenholt moot. Ninety people in a town built for four thousand, and
   * an argument about the empty half of it.
   *
   * The entire content of this scene is whoever is standing in the active
   * four. Each voice argues from their own trade and the town does what that
   * voice makes it easy to do; the reeve's closing line is the same either
   * way, because the reeve is the one who has to do the work.
   */
  *verrenholt_moot(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('moot_held')) {
      yield* say(game, 'Reeve Hollis', p.hasFlag('moot_pulled')
        ? ['Two streets down, the lead sold, the timber stacked under the moot hall wall where it is dry.',
           'Nobody has said anything about it to me. That is not the same as nobody having a view.']
        : ['The east grid is standing and we are burning furze again. My hands have gone the colour of the furze.',
           'It was decided in a room with everybody in it, which is worth something in February and nothing at all in March.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Reeve Hollis', [
      'Ninety of us. Four hundred and six roofs, of which we are under nineteen.',
      'The east grid is empty from the cross street to the orchard. Timber, lead, and doorheads with names cut in them, and we are short of all three of the first two before the frost.',
    ]);
    yield* say(game, 'Reeve Hollis', [
      'The moot is tonight and it has been tonight four times.',
      'You are not from here, which in a town this size is a qualification. One of you speak.',
    ]);

    // Order is priority, not preference: the first of these standing in the
    // active four is the one the town hears.
    const VOICES = {
      aurelian: {
        pull: true,
        lines: [
          'Ninety people and four hundred roofs. You are heating the ones you are not standing in, and you are doing it with furze.',
          'Take the east grid down before the frost and you are warm in March. Leave it up and you will hold this meeting again in March, colder, and with fewer of you in the room.',
        ],
      },
      bastian: {
        pull: true,
        lines: [
          'I will do the east grid. Two streets a week. Good timber stacked separately, lead off the roofs first so the rain does the rest of it for you.',
          'Somebody is going to do it badly in January. It might as well be done properly in October by somebody who is leaving afterwards.',
        ],
      },
      maret: {
        pull: true,
        lines: [
          'I have signed for the removal of a great many things and I did not read past the tonnage on any of them.',
          'Do it yourselves and write down who agreed to it. Not for the record. So that in five years it is a thing ninety people did and not a thing that happened.',
        ],
      },
      kestrel: {
        pull: true,
        lines: [
          'There is a name against every one of those houses in the parish roll, and I have read your roll. It is a good roll. The hand changes four times and the columns never do.',
          'Take the lead and the rafters. Leave the doorheads standing. A doorhead is where you check a roll from, and you will want to check it.',
        ],
      },
      corvin: {
        pull: true,
        lines: [
          'The lead is worth four times the timber and there is a man in Solmere who buys lead by weight and asks nothing at all.',
          'Take the roofs and leave the walls up. It still looks like a town from the road that way, and people give more to a town.',
        ],
      },
      ilsabet: {
        pull: true,
        lines: [
          'Give me a week on the east grid first. Not the pretty end. The end with the orchard in it.',
          'Then pull it down. I am not asking you to keep it. I am asking you not to be remembering it from memory in five years, because you will be wrong and you will be certain.',
        ],
      },
      oda: {
        pull: false,
        lines: [
          'You have asked four strangers what to do with your own houses, and you asked us before you asked each other.',
          'I have no view. I would like it minuted that I sat here for an hour and had no view.',
        ],
      },
      tam: {
        pull: false,
        lines: [
          'Roofs off is quiet. Burning is loud.',
          'Loud goes for miles now. Things come to look at loud. Take nothing until you have somewhere to put it that is not a fire.',
        ],
      },
    };

    const voice = speaking(p, Object.keys(VOICES));
    let pull;
    if (voice) {
      const entry = VOICES[voice.id];
      yield* say(game, voice.name, entry.lines);
      pull = entry.pull;
    } else {
      yield* say(game, 'Vesna', [
        'I have been in three towns this month that are still the size they were on the map.',
        'You are the only one that has admitted it out loud. That is the whole of what I have to offer and it is not advice.',
      ]);
      pull = false;
    }

    yield* say(game, null, ['The moot goes on for another two hours after that, and none of the two hours is about the strangers.']);
    if (pull) {
      yield* say(game, 'Reeve Hollis', [
        'East grid comes down, cross street to the orchard, starting Monday.',
        'Sexton Mab has asked for the doorheads with names on and nobody had the appetite to argue with her at that hour.',
      ]);
      p.setFlag('moot_pulled');
    } else {
      yield* say(game, 'Reeve Hollis', [
        'East grid stands. We cut furze, and we cut it further out than last year, and we go two to a cart.',
        'It was decided in a room with all of us in it. I have written down that much.',
      ]);
      p.setFlag('moot_kept');
    }
    yield* say(game, 'Reeve Hollis', ['Either way it is me on the cart on Monday. That part was never on the table.']);
    p.setFlag('moot_held');
    p.completeQuest('moot');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Quiet scenes. None of these start a battle.
  // =========================================================================

  /**
   * Aurelian and a pump he drew at nineteen. The only scene in three volumes
   * where he is not the cleverest thing in the room and has to sit in it.
   */
  *aurelian_pump(game, ctx = {}) {
    const p = game.party;
    if (!p.roster.has('aurelian')) {
      yield* say(game, null, [
        'A lift pump on a brick plinth, running. It is the only thing in the yard that is doing anything at all.',
        'There is a maker\'s plate on the casing with a Solmere mark and a year on it and no name.',
      ]);
      return;
    }
    if (p.hasFlag('pump_opened')) {
      yield* say(game, 'Aurelian', ['It is still running. I have stopped looking at it every time we come through, which took some doing.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, ['A lift pump on a brick plinth, running, with a Solmere maker\'s mark and a year stamped into the casing.']);
    yield* say(game, 'Aurelian', [
      'That is mine. Year nineteen. I drew that in a fortnight and I drew it badly.',
      'The eccentric on that design fails inside a season. I know the figure because I worked it out and then argued for an hour with the man who had already told me it.',
    ]);
    yield* say(game, 'Vesna', ['It has been running for eleven years.']);
    yield* say(game, 'Aurelian', ['Yes. I noticed that as well.']);
    yield* say(game, null, [
      'He takes the casing off in the yard, in front of everyone, with the pump still turning, which is not how anybody is supposed to do that.',
    ]);
    yield* say(game, 'Aurelian', [
      'Somebody has had this open. There is a strap in here that is not in my drawing and it is a better strap than the one that is.',
      'Filed by hand. Filed by hand *well*, which is worse.',
    ]);
    yield* say(game, 'Vesna', ['Is there a name on it.']);
    yield* say(game, 'Aurelian', [
      'There is a file-mark and a date scratched inside the cover. Year twenty-nine. That is a man\'s handwriting if you know how to read a file, and it is not a name.',
      'He did not write to me about it. I would have written to me about it. I would have written twice.',
    ]);
    yield* say(game, null, [
      'He puts the casing back on, and then takes it off again, and cuts a short file-mark of his own alongside the other one before he closes it.',
      'He does not mention doing it and nobody asks him to.',
    ]);
    yield* say(game, 'Aurelian', [
      'Take this off me. I have had it in my coat since Solmere and it has been nothing but helpful.',
      'It wants to help. I have got to the age where I cannot tell that apart from a thing being obliging while it waits, and that pump has run eleven years on a strap a man filed by hand in his own time.',
    ]);
    yield* grantEsper(game, 'brasswright', 'a shard of magicite', ctx.field, 'attuningring', 'an Attuning Ring');
    p.setFlag('pump_opened');
    p.completeQuest('pump');
    yield* cinematic(game, false);
  },

  /**
   * Highfell's west gallery, and the difference between a shelf that is
   * settling and a shelf that has finished. Both answers pay for themselves.
   */
  *highfell_shelf(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('shelf_answered')) {
      yield* say(game, 'Old Marn', p.hasFlag('shelf_opened')
        ? ['Four men in on Monday and four out on Monday night, and the same again since. It has held.',
           'I do not go in. That is not a prediction, it is an arrangement I have with myself.']
        : ['Gallery is shut and Kant has stopped speaking to me in the yard, which he does by looking at my boots.',
           'It has not come down. That is not proof of anything and I am aware that it is not.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Overseer Ruel Kant', [
      'The west gallery has been shut since autumn and I want it open by the thaw. Highfell sells stone. That is the entire business and there is no second business.',
    ]);
    yield* say(game, 'Gallery Foreman', [
      'The shelf over it stands on four pillars. Two of them are wrong. Not cracked — wrong, the way a table is wrong before anybody has put anything on it.',
    ]);
    yield* say(game, 'Old Marn', [
      'Neither of them has been down there at first light. I have, for thirty-one years, before the yard starts and while the hill is still cold.',
      'If the face is talking, it is settling and it will stop. If the face has gone quiet, it has finished settling, and finished is the word you want to be frightened of.',
    ]);
    yield* say(game, 'Overseer Ruel Kant', [
      'They will not take mine and they will not take his. Go down at first light and say what you hear, and I will take yours, because you have got nothing on either side of it.',
    ]);
    yield* cinematic(game, false);
    yield* say(game, null, [
      'The face at first light is quiet. It stays quiet long enough that people start shifting their feet.',
      'Then there is one crack, a long way in and above, more felt than heard. Then it is quiet again, and it stays quiet.',
    ]);

    const choice = yield* game.dialogue.ask(
      'Kant is at the top of the ramp with the gallery book under his arm. He has been there since before the party came up.',
      ['Say the gallery is sound', 'Say the shelf will go'],
      { cancelable: false },
    );
    game.dialogue.close();

    yield* cinematic(game, true);
    if (choice === 0) {
      yield* say(game, 'Overseer Ruel Kant', [
        'Good. Four men on Monday, and the toolwright can stop telling me about his order book.',
        'There is two thousand in it for you, and before you ask, it comes out of the same purse the wake-keeper is paid from. Everything here comes out of that purse.',
      ]);
      p.addGold(2000);
      yield* say(game, null, [
        'Four men go in on Monday. They come out on Monday night, and again on Tuesday, and the shelf holds through the spring.',
        'Old Marn stands in the yard at first light every day of it and does not go down the ramp.',
      ]);
      p.setFlag('shelf_opened');
    } else {
      yield* say(game, 'Overseer Ruel Kant', [
        'Then it stays shut, and Highfell sells nothing out of the west face for a year, and I will hear about that in Solmere in writing.',
        'I asked and you answered. I am not going to pretend I am pleased about the second half of that.',
      ]);
      yield* say(game, 'Old Marn', [
        'Take these off me. I cut with them thirty years and they are better than anything Vaux is selling.',
        'I am not going to be cutting. That was true before you said anything, and now it is true out loud, which is the part I wanted.',
      ]);
      yield* game.grantChest({ kind: 'item', id: 'cairnbreakers', label: 'the Cairn Breakers' }, ctx.field);
      p.setFlag('shelf_shut');
    }
    p.setFlag('shelf_answered');
    p.completeQuest('shelf');
    yield* cinematic(game, false);
  },

  /**
   * The cabinet at Emberlyn. She buys descriptions rather than specimens, and
   * pays by the kind, which annoys almost everybody who brings her something
   * that nearly killed them.
   */
  *cabinet_of_species(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('cabinet_paid')) {
      yield* say(game, 'Cabinet-Keeper Orme', [
        'You are in the ledger under travelling parties, which is a column with two names in it.',
        'Come back with something I have not got a drawer for. I will know, because I have been through the drawers twice this month for want of anything else to do.',
      ]);
      return;
    }
    const kinds = p.bestiary.size;
    yield* say(game, 'Cabinet-Keeper Orme', [
      'I do not want the animal. Everybody brings me the animal and the animal arrives in a sack, in July.',
      'I want the description, written down by somebody who was close enough to it to be wrong about the colour.',
    ]);
    yield* say(game, 'Cabinet-Keeper Orme', [
      'A rat pays what a wyrm pays. People find that offensive and then they bring me rats, and the rats have been the more useful half of the cabinet.',
      'How many kinds have you got written down. Not killed — written down.',
    ]);
    if (kinds < 40) {
      yield* say(game, 'Cabinet-Keeper Orme', [
        `${kinds}. That is a road and a fen and the inside of one cave.`,
        'Come back at forty. Forty is where a person stops recording what frightened them and starts recording what was there.',
      ]);
      if (p.questStage('cabinet') < 0) p.startQuest('cabinet', 0);
      return;
    }
    yield* cinematic(game, true);
    const paid = Math.min(9000, kinds * 120);
    yield* say(game, 'Cabinet-Keeper Orme', [
      `${kinds}. Sit down. This will take the afternoon and I am not doing it standing up.`,
      'Colour first, then how it moved, then what it did when it saw you. Nobody remembers the third one and it is the only one worth a drawer.',
    ]);
    yield* say(game, null, [
      'It does take the afternoon. She writes in a hand so small it has to be read at an angle, and she stops twice to make somebody say a thing again in different words.',
    ]);
    p.addGold(paid);
    yield* say(game, 'Cabinet-Keeper Orme', [
      `${paid} gil, by the kind, and no argument about which of them was dangerous. The cabinet does not have a column for dangerous.`,
      'And take the glass. It is ground for a man who lost one eye at the pans and it is no use to his estate.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'keeneyecharm', label: 'a Keen Eye Charm' }, ctx.field);
    p.setFlag('cabinet_paid');
    if (p.questStage('cabinet') < 0) p.startQuest('cabinet', 0);
    p.completeQuest('cabinet');
    yield* cinematic(game, false);
  },

  /** The trader in the Duncastle bailey, who has been kept out for a fortnight. */
  *duncastle_bailey(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('bailey_asked')) {
      yield* say(game, 'Barred Trader', [
        'Still out here. Ord and I nod at each other across the ground now, which we did not do before, so the fortnight has produced something.',
      ]);
      return;
    }
    yield* say(game, 'Barred Trader', [
      'Fifteen days in this bailey. I have a licence out of Solmere with a seal on it the size of a saucer and I have shown it to four separate men in the same coat.',
      'They read it. They all read it right through. Then they hand it back the way you hand back a hat.',
    ]);
    yield* say(game, 'Vesna', ['We can ask.']);
    yield* say(game, 'Barred Trader', ['Ask Ord. Ord is the one who says no, and the other three are the ones who say Ord says no.']);
    yield* cinematic(game, true);
    yield* say(game, 'Gate-Captain Ord', [
      'He can come in. He could have come in on the first day. There is no order on him and there never was one.',
      'He has been in twice before, in other years, and both times he was back out through the postern inside the hour with his boxes still strapped.',
    ]);
    yield* say(game, 'Vesna', ['Why.']);
    yield* say(game, 'Gate-Captain Ord', [
      'Because everyone who buys from him is out here. Inside the wall there are ninety households and eleven of them have money, and the eleven send a girl out to the bailey.',
      'He knows that better than I do. He has just decided he would rather be kept out than be let in and have nothing happen.',
    ]);
    yield* cinematic(game, false);
    yield* say(game, 'Barred Trader', ['Did he say I could come in.']);
    yield* say(game, 'Vesna', ['Yes.']);
    yield* say(game, 'Barred Trader', ['Good.']);
    yield* say(game, null, ['He does not move. He is still there at dusk, and his boxes are open, and there are eight people round them.']);
    yield* say(game, 'Barred Trader', ['Ask him again next year. I like being asked and he likes saying it, and neither of us is going to get that off the eleven households.']);
    yield* say(game, null, ['He turns back to the boxes. Somebody is asking him the price of a thing he has already told them the price of.']);
    p.setFlag('bailey_asked');
    p.completeQuest('bailey');
  },

  /**
   * The walker in the Thornmarch. Three rings, no junctions, and the one thing
   * that cannot happen in a corridor with no junctions happened to her brother.
   */
  *thornmarch_circuit(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('circuit_walked')) {
      yield* say(game, 'Meg', ['Second leg today. I have not found it. I did not think I would and I have started earlier every year regardless.']);
      return;
    }
    yield* say(game, null, ['A woman coming the other way along the briar, walking at the pace of somebody who has a long way to go and knows exactly how long.']);
    yield* say(game, 'The Walker', [
      'You cannot get lost in here. That is the whole of why I use it.',
      'Three rings and not one turning. Keep walking and you arrive. Stop, and you are still somewhere on the way, which is not the same as being lost and people never believe me about that.',
    ]);
    yield* say(game, 'Vesna', ['You are not going anywhere.']);
    yield* say(game, 'The Walker', [
      'My brother came in the year the hall burned and did not come out.',
      'There is no junction in this march. There is nowhere in it to go wrong. I have walked it every spring since to find out how a man does that, and I have not found out how a man does that.',
    ]);
    const choice = yield* game.dialogue.ask(
      'She has not asked for anything and shows no sign of intending to.',
      ['Walk a leg with her', 'Let her get on'],
      { speaker: 'The Walker', cancelable: true },
    );
    game.dialogue.close();
    if (choice !== 0) {
      yield* say(game, 'The Walker', ['Right. Keep the briar on your left and you will be out by dark, and if you are not out by dark you will be out at dawn.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It takes most of the afternoon. She stops twice, both times at nothing anybody else can see, and both times for about as long as it takes to check a knot.',
      'She does not talk while she is walking. She talks at the stops.',
    ]);
    yield* say(game, 'The Walker', [
      'He was quicker than me. He was quicker than me at everything and it was not a competition, it was just a fact about the two of us that he found very restful.',
      'I have got the whole march in my legs now. I could do it in the dark. I did do it in the dark, twice, and I would not recommend the second one.',
    ]);
    yield* say(game, null, ['At the mouth of the second ring she stops for the third time, and this time she unties something from her belt.']);
    yield* say(game, 'The Walker', [
      'Take this. He tied it. It is a bad knot and I have never once retied it.',
      'Meg. You have been walking with me for four hours and it has not come up.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'pilgrimsknot', label: "a Pilgrim's Knot" }, ctx.field);
    p.setFlag('circuit_walked');
    p.completeQuest('circuit');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // The ruined world, quietly. Four scenes with nothing in them to fight.
  // =========================================================================

  /** Emberlyn's caravan-master loads for a north road that has stopped buying. */
  *emberlyn_caravan(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Caravan-Master Idryn', [
        'Eleven wagons out on the north road Thursday, back a fortnight Tuesday. It has been that since my father had the yard and it will be that after.',
      ]);
      return;
    }
    if (p.hasFlag('caravan_seen')) {
      yield* say(game, 'Caravan-Master Idryn', ['Loaded and roped. Out at first light. You are welcome to walk as far as the ford with us and no further, because we go slowly and you do not.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'Eleven wagons in the yard, loaded to the hoops and roped down properly, with the teams already in the traces at four in the afternoon.',
    ]);
    yield* say(game, 'Caravan-Master Idryn', [
      'North road, first light. Same as the last four times.',
    ]);
    yield* say(game, 'Vesna', ['There is nothing at the north end.']);
    yield* say(game, 'Caravan-Master Idryn', [
      'No. I have known that since the second time. I went up on the box myself to be sure and I was sure by the second morning.',
      'The yard has a shape. Men are paid on the day the wagons roll, not on the day they come back. I have eleven men and a yard and both of those are still true.',
    ]);
    yield* say(game, 'Caravan-Master Idryn', [
      'You can buy off the load if you want. Two thousand for what is on the third wagon, which is the good wagon, and you would be buying at the price it was before.',
      'I am not lowering it. If I lower it I am running a sale and then it is a sale and not a round.',
    ]);
    yield* cinematic(game, false);
    const choice = yield* game.dialogue.ask(
      'The third wagon is the one with the tarpaulin that has been mended rather than replaced.',
      ['Buy off the third wagon — 2000 gil', 'Let it go north'],
      { speaker: 'Caravan-Master Idryn', cancelable: true },
    );
    game.dialogue.close();
    if (choice === 0 && p.spendGold(2000)) {
      yield* say(game, null, ['He does not thank anybody. He goes to the tail of the wagon and corrects the manifest, and then reads the correction back to himself.']);
      yield* game.grantChest({ kind: 'item', id: 'xpotion', count: 4, label: '4 X-Potions' }, ctx.field);
      yield* say(game, 'Caravan-Master Idryn', ['Third wagon is short by four and the round is not. That is the first honest line in that book since the spring.']);
    } else if (choice === 0) {
      yield* say(game, 'Caravan-Master Idryn', ['You are short. So is everybody. That is why the north end has stopped buying and I am still going up there.']);
    } else {
      yield* say(game, 'Caravan-Master Idryn', ['Then it goes north unsold, which is what it was going to do at four o\'clock this afternoon anyway.']);
    }
    yield* say(game, null, ['They roll at first light. The yard porter shuts the gate behind them and sweeps the yard, which takes him until about nine.']);
    p.setFlag('caravan_seen');
    p.completeQuest('caravan');
  },

  /** The coast light. Nothing is coming in, and it gets lit. */
  *lighthouse_relit(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('light_relit')) {
      yield* say(game, null, [
        'The light is burning. Somebody has trimmed the wick since the party did, and trimmed it better.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'The tower is shut with a padlock the size of a fist and the glass at the top is whole.',
        'There has been no light in it since the requisitions took the oil, which the coast will tell you about at length.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The padlock has gone with the door it was on. The stair is dry the whole way up, which nothing else on this coast is.',
      'In the lamp room the wicks are in a tin, the glass has been washed, and there is oil in the reservoir that has not been touched.',
    ]);
    yield* say(game, 'Vesna', ['There is nothing out there to see it.']);
    const osric = p.activeMembers.find((m) => m.id === 'osric');
    if (osric) {
      yield* say(game, 'Osric', [
        'It is not for out there. I have taken a ship past nine lights and I have never once been thinking about the light.',
        'You look up at it from the beach. That is what it is for and no keeper has ever admitted it.',
      ]);
    }
    yield* say(game, null, [
      'It takes a quarter of an hour to catch and then it goes up all at once. The beam crosses the water and finds nothing, and goes round, and finds nothing.',
      'From the shingle at the foot of the tower the whole headland is lit up, which is not where anybody was looking.',
    ]);
    yield* say(game, null, [
      'Under the keeper\'s bunk, wrapped in oilcloth and tied with a fisherman\'s knot, there is something the wrong temperature for the room.',
    ]);
    yield* say(game, 'Vesna', [
      'There is a name in it. She kept this light.',
      'She was asked, and she said yes, and the light went out that same year and stayed out.',
    ]);
    yield* grantEsper(game, 'saltwidow', 'a shard of magicite', ctx.field, 'clearwatercharm', 'a Clearwater Charm');
    p.setFlag('light_relit');
    p.completeQuest('lighthouse');
    yield* cinematic(game, false);
  },

  /** The Cinderspine thaws, and what is under the drift is a road. */
  *cinderspine_thaw(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['The drift across the pass is nine feet deep and has been since before anybody kept a record of how deep it was.']);
      return;
    }
    if (p.hasFlag('thaw_walked')) {
      yield* say(game, null, ['The road is still there and the water is still coming off it. The fourteen carts have been moved to the side, in line, by somebody with time.']);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('sorrow', { fade: 1.2 });
    yield* say(game, null, [
      'The pass is running with water. It has been running for days: there are channels cut into the old snow and a sound under everything that is the whole hill draining.',
      'Where the drift stood there is a road. Made, metalled, with a camber on it and a kerb.',
    ]);
    yield* say(game, null, [
      'There are carts on it. Fourteen, in line, facing down. The traces are still buckled and there is nothing in the traces.',
    ]);
    const corvin = p.activeMembers.find((m) => m.id === 'corvin');
    if (corvin) {
      yield* say(game, 'Corvin', ['They are loaded.']);
      yield* say(game, null, [
        'Nobody moves for a while. Then somebody does, and it is not Corvin, and Corvin watches them do it with his hands where everybody can see them.',
      ]);
    } else {
      yield* say(game, null, ['They are all still loaded. Nobody says so for a good while, and then everybody says it at once.']);
    }
    yield* say(game, 'Vesna', [
      'This was a supply road. Somebody built a road up here and then a winter came down on it and never lifted.',
      'The Imperium has been going round the long way for a thousand years and paying men to say the pass was impassable.',
    ]);
    yield* say(game, null, [
      'At the top of the line, in the lead cart, there is a crate with the lid still nailed and a stencil on the side that has come through the thousand years better than the wood has.',
      'What is in it is packed in straw that crumbles, and it is colder than the meltwater.',
    ]);
    yield* say(game, 'Vesna', [
      'It has a name in it as well. It is older than the ones in the barrow and it is in the same hand.',
      'They were carrying it somewhere. They did not get it there and nobody came back for it.',
    ]);
    yield* grantEsper(game, 'lastwinter', 'a shard of magicite', ctx.field, 'winterheart', 'a Winter Heart');
    p.setFlag('thaw_walked');
    p.completeQuest('thaw');
    // No battle and no new map to restore the theme, so this scene hands the
    // pass its own music back on the way out.
    if (ctx.field?.mapDef?.music) game.playMusic(ctx.field.mapDef.music, { fade: 1.6 });
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Six hunts. All of them optional, all of them after the world changes.
  // =========================================================================

  /** The salt pans go dry in a night, and something is lying in number four. */
  *sump_that_drank(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('sump_slain')) {
      yield* say(game, 'Salter Gribb', [
        'Number four is working. The first crop off it was grey and the second was not, and I have sold the grey to a man who wanted it grey.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Salter Gribb', ['Four pans, eight inches in each, and a crust I can walk on by Thursday. There is nothing to see here and I say that with some pride.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Salter Gribb', [
      'Number four went in a night. Eight inches of brine on the Tuesday and dry brick on the Wednesday, and I did not hear a thing and I sleep forty feet from it.',
      'The crust in the bottom is in the shape of something that lay down in it. I have not been back in since and I have been salting on this shore since I was nine.',
    ]);
    yield* say(game, null, [
      'Number four pan is dry to the brick and the shape in the crust is eleven feet across.',
      'There is water in it after all, in the middle, and it is not standing still.',
    ]);
    yield* tremor(game, 1.4, 0.5);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['thegreatsump'] },
      { boss: true, terrain: 'sand', scenery: 'none', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('sump_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It does not so much die as stop holding on to itself, and what is left runs out through the brick it came up through.',
      'The pan starts filling that night, from underneath, and takes three days to come back to eight inches.',
    ]);
    yield* say(game, 'Salter Gribb', [
      'It was drinking the pans. Four hundred years this shore has been salting and the pans were what it was drinking.',
      'Take that. It was in the sump and it is not salt and I am not having it in my yard.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'deepwellpendant', label: 'a Deepwell Pendant' }, ctx.field);
    p.addGold(12000);
    yield* say(game, null, ['There is 12000 gil in the pan house, in a strongbox, under four hundredweight of salt that nobody has been able to sell since the sky went.']);
    p.completeQuest('sump');
    yield* cinematic(game, false);
  },

  /** A pane of the Glasswaste standing on edge, with the party in it. */
  *standing_pane(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('pane_slain')) {
      yield* say(game, null, [
        'The pieces are laid out where they fell, all of them about the same size, which is not how glass breaks.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['A sheet of fused glass lying flat in the waste, with the whole sky in it and nothing else.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The sheet is standing on edge. Eleven feet of it, upright in open ground, with the party in it from the boots up.',
      'The reflection arrives about a half-second late. It is not the surface. It arrives, and then it settles.',
    ]);
    const ilsabet = p.activeMembers.find((m) => m.id === 'ilsabet');
    if (ilsabet) {
      yield* say(game, 'Ilsabet', [
        'That is not a reflection. A reflection does not have to work out where the elbow goes.',
      ]);
    }
    yield* say(game, 'Vesna', ['It has been practising. It has had the whole waste to itself and nobody to practise on.']);
    yield* tremor(game, 1.2, 0.5);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['standingpane'] },
      { boss: true, terrain: 'sand', scenery: 'none', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('pane_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It goes over in one piece and breaks on the ground, and every piece is about the size of a hand.',
      'For a moment there are forty of the party lying in the waste, and then the light moves and they are pieces of glass.',
    ]);
    yield* say(game, null, [
      'Set in the ground where it stood, at the exact point the sheet came up out of the sand, is a ring of harder stuff with something wedged in it.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'ninefoldcharm', label: 'a Ninefold Charm' }, ctx.field);
    p.addGold(14000);
    yield* say(game, null, ['Under the ring there is 14000 gil in Ferran coin, fused into three lumps, and worth rather more than that as coin.']);
    p.completeQuest('pane');
    yield* cinematic(game, false);
  },

  /** The Stormspire, and nine hundred years of weather with somewhere to go. */
  *brood_of_glass(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('brood_slain')) {
      yield* say(game, null, [
        'The crown of the spire is bare. The lead box is still up there with its lid open, holding rainwater.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['Something has been up on the crown of the spire long enough to leave eight sets of marks in the lead. Nothing is up there now.']);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'The crown of the spire is not empty. It has not been empty for nine hundred years; it has simply never been climbed to.',
      'The nest is built out of the lead off the roof, and out of eight legs of somebody\'s scaffolding, and out of glass.',
    ]);
    yield* say(game, null, [
      'In the middle of it, split open along one seam, is a Ferran issue lead box with a requisition number still legible on the lid.',
    ]);
    yield* say(game, 'Vesna', [
      'They carried it up here to keep it away from the weather. Every storm on this coast for nine hundred years has come down on this one point.',
      'It went into the box and the box came up the tower, and something up here has been sitting on it ever since.',
    ]);
    yield* tremor(game, 1.8, 0.7);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['motherofglass', 'shardswarm', 'shardswarm'] },
      { boss: true, terrain: 'cobble', scenery: 'none', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('brood_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'She comes apart along the seams the lightning made and the pieces go off the crown in the wind, over the edge, out.',
      'The nest holds. It was built out of a roof and it is better made than the roof was.',
    ]);
    yield* grantEsper(game, 'stormcaller', 'a shard of magicite', ctx.field, 'stormheart', 'a Storm Heart');
    p.addGold(16000);
    yield* say(game, null, [
      'Under the lead box, in the bottom of the nest, there is 16000 gil in coin, wire and clasps, sorted by size.',
    ]);
    p.completeQuest('brood');
    yield* cinematic(game, false);
  },

  /** The Hollow Mine sump, and the shift that never got written down. */
  *last_shift(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('shift_slain')) {
      yield* say(game, null, [
        'The shift board at the adit has one more column on it than it used to, filled in and signed out, in four different hands.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['The shift board at the adit is chalked up for a shift that went down eleven years ago. Nobody has wiped it and nobody has added to it.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The shift board at the adit still has names on it. Eleven years of weather and it is still legible, because it is cut and not chalked.',
      'Every column has men signed in at the top and men signed out at the bottom, except the last one.',
    ]);
    const kestrel = p.activeMembers.find((m) => m.id === 'kestrel');
    if (kestrel) {
      yield* say(game, 'Kestrel', [
        'Nineteen down and nobody up. That is not a disaster, that is a clerical failure. A disaster has a sheet of its own and I have read all of those.',
      ]);
    }
    yield* say(game, null, [
      'The sump is at the bottom of the shaft, past five galleries, each one narrower than the one under it.',
      'There is a lamp burning down there. It has been burning for eleven years on a mine that stopped being supplied eleven years ago.',
    ]);
    yield* tremor(game, 1.6, 0.6);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['theunderforeman', 'nightshift', 'nightshift'] },
      { boss: true, terrain: 'cave', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('shift_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The lamp goes out when he does, and the sump is dark for the first time since the company left it.',
      'The seam is still in the face. It runs on past the sump and downward and it does not narrow.',
    ]);
    yield* say(game, 'Vesna', [
      'They did not stop digging because it ran out.',
      'They stopped because of what the seam had started running into, and then the company wrote up the sump as worked out, and everybody who could have argued was down here.',
    ]);
    yield* say(game, null, ['Somebody goes back up and fills in the last column on the board, and signs nineteen men out of it, which takes a while.']);
    yield* game.grantChest({ kind: 'item', id: 'oathstone', label: 'an Oathstone' }, ctx.field);
    p.addGold(18000);
    yield* say(game, null, ['The pay chest in the under-office holds 18000 gil, made up for a shift that was never paid out.']);
    p.completeQuest('shift');
    yield* cinematic(game, false);
  },

  /**
   * The tenth well. There were nine, everybody agrees there were nine, and the
   * arithmetic has never worked. Needs the ship: it is not on any road.
   */
  *tenth_well(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('tenth_slain')) {
      yield* say(game, null, [
        'The tenth shaft is open to the sky and full of rainwater, and it is exactly the same width as the other nine.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['A collar of dressed stone in open ground, with no road to it and nothing built round it.']);
      return;
    }
    if (!p.hasFlag('airship')) {
      yield* say(game, null, ['There is no road to this place and the ground for a mile round it will not take a cart. Whatever is here was not walked to.']);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'A collar of dressed stone, sunk flush, in ground that has never had a road on it. The stone is cut the same way the Ninth Well is cut, by the same hands, to the same width.',
      'There is no winding gear, no spoil heap and no camp. Whatever came out of this shaft was not brought out.',
    ]);
    const kestrel = p.activeMembers.find((m) => m.id === 'kestrel');
    if (kestrel) {
      yield* say(game, 'Kestrel', [
        'Sixty-one names and nine wells. I have done that arithmetic eleven times and it has never once come out, and I have blamed my own hand for it every time.',
        'It was not my hand.',
      ]);
    }
    yield* say(game, 'Vesna', [
      'There were nine and everyone agrees there were nine.',
      'Somebody dug one more and then did not put it on anything, and it has been open the whole time.',
    ]);
    yield* tremor(game, 2.0, 0.8);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['thetenthwell'] },
      { boss: true, terrain: 'cave', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('tenth_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The draw stops the way a held note stops, and the shaft fills with ordinary weather for the first time.',
      'It rains into it for the rest of the afternoon and the water does not go anywhere.',
    ]);
    yield* say(game, 'Vesna', [
      'It was not drawing for anybody. There is no pipe out of it and no engine on it.',
      'Somebody sank a well to find out whether they could, and then left it open, and it has been drinking for a thousand years with nowhere to put anything.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'engineheart', label: 'an Engine Heart' }, ctx.field);
    p.addGold(26000);
    yield* say(game, null, ['There is 26000 gil in the collar itself, in a course of stones that were laid hollow and packed with coin.']);
    p.completeQuest('tenth');
    yield* cinematic(game, false);
  },

  /**
   * The First Engine, at the end of the five other roads. It has been asking
   * one question for nine hundred years and nobody has ever been in the room
   * with the answer.
   */
  *first_engine(game, ctx = {}) {
    const p = game.party;
    const hunts = ['sump_slain', 'pane_slain', 'brood_slain', 'shift_slain', 'tenth_slain'];
    if (p.hasFlag('firstengine_slain')) {
      yield* say(game, null, [
        'The chamber is cold and the floor of it is dry. Nothing in here is turning and nothing in here is asking anything.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['A door in the rock with no keyway, no hinge and no handle, and a draught coming out from under it that is colder than the shaft.']);
      return;
    }
    const done = countFlags(p, hunts);
    if (done < hunts.length) {
      yield* say(game, null, [
        'The door does not move. It is not locked; there is nothing on it to lock.',
        `Cut into the rock beside it are five marks, and ${done} of them have been struck through by something that was here before the party was.`,
      ]);
      yield* say(game, 'Vesna', [
        'It is counting. It has been counting the whole time.',
        'It wants the other ones dealt with first, which means it knows what they were.',
      ]);
      return;
    }

    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'The fifth mark strikes itself through as the party comes up to the door, and the door goes back into the rock without any noise at all.',
      'The chamber behind it is older than the Well, older than the workings, and it was cut by people who did not have the tools that cut the Well.',
    ]);
    yield* say(game, 'The First Engine', [
      'QUERY: WHO BUILT ME.',
      'NO RECORD. QUERY REPEATED. NO RECORD. QUERY REPEATED FOR NINE HUNDRED YEARS.',
    ]);
    yield* say(game, 'Vesna', ['It is not a warden. Nobody put it here to stop anything.']);
    yield* tremor(game, 2.4, 0.9);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['thefirstengine'] },
      { boss: true, terrain: 'cobble', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('firstengine_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It comes down in stages, over about a minute, and each stage is a system deciding it has finished rather than a thing breaking.',
      'The last of it to stop is the part that was asking.',
    ]);
    yield* say(game, 'The First Engine', ['QUERY: WHO BUILT ME.']);
    const kestrel = p.activeMembers.find((m) => m.id === 'kestrel');
    if (kestrel) {
      yield* say(game, 'Kestrel', [
        'There was a record. There is a gap in the Vellum catalogue at that century that is exactly the width of one shelf, and the shelf brackets are still in the wall.',
        'Somebody kept it, and then somebody took it out, and both of those were decisions.',
      ]);
    }
    yield* say(game, 'Vesna', [
      'There is no record. There was one and it was destroyed, and whoever destroyed it did it carefully.',
      'Nobody alive knows who built you. That is the true answer and it is the first one you have had.',
    ]);
    yield* say(game, 'The First Engine', [
      'LOGGED.',
      'QUERY WITHDRAWN. NEW QUERY: WHO IS ASKING.',
    ]);
    yield* say(game, 'Vesna', ['Vesna.']);
    yield* say(game, 'The First Engine', ['LOGGED.']);
    yield* say(game, null, ['The core goes out halfway through the second syllable, which is the wrong place to stop.']);
    p.addGold(40000);
    p.addItem('ninthward');
    yield* game.celebrate([
      'Behind it, in a course of hollow stone, there is 40000 gil and a ring with nine bands on it.',
      'Obtained The Ninth Ward.',
    ], ctx.field);
    p.completeQuest('firstengine');
    yield* cinematic(game, false);
  },
};

export function vol3EventById(id) {
  return VOL3_EVENTS[id] || null;
}
