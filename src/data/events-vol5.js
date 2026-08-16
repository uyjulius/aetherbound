import { wait, over } from '../engine/scheduler.js';
import { ESPERS } from './espers.js';

/**
 * Scripted events, volume five — sidequests and optional scenes.
 *
 * Same contract as `EVENTS`, `VOL2_EVENTS` and `VOL3_EVENTS`: every entry is a
 * generator receiving `(game, ctx)` and written as a coroutine, so a scene reads
 * top to bottom in source the way it plays on screen. Nothing in here is on the
 * critical path.
 *
 * Volume two covered the cast and volume three covered the places. This one
 * covers what people say afterwards: the rumour, the relic, the rota nobody can
 * account for, and the account that does not match the book. The Engines are
 * finished and the stories about them are not, and the stories are what most
 * people are actually living in.
 *
 * The shapes, chosen so as not to repeat the earlier volumes:
 *
 *   - a five-stage investigation with no order at all (eleven_*). Volume three's
 *     postbag was three deliveries gated on a count and then a fixed final
 *     scene in a fixed place. This one has no final scene: whichever of the five
 *     accounts the player happens to hear last runs the coda where they are
 *     standing, and the coda does not settle anything.
 *   - two scenes whose outcome turns on who is standing in the active four, and
 *     turns on it mechanically rather than rhetorically: the party can read a
 *     mason's mark, or cannot, and the parish's decision follows from that
 *     (marrowgate_hand, lastlantern_office).
 *   - two hunts, using the only two late bosses in the bestiary that suit a
 *     volume about belief: the thing in the wood that has started answering,
 *     and the thing on the Reach that contradicts the survey.
 *   - seventeen of the twenty never start a battle, because an argument about
 *     what happened is not improved by a sword.
 *
 * Six of the twenty end without an answer. That is deliberate and it is the
 * point of the volume; a mystery that is resolved on the spot was never about
 * what people believe, it was about what the player was told.
 *
 * Ten are gated on `party.worldState === 'ruin'`, since half of this is about a
 * thing that has already happened.
 */

// --- small helpers, matching the ones in the earlier volumes ----------------

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
 * The active party rather than the roster, for the same reason volume three
 * used the active party: a scene that changes on who is present has to change
 * on who is actually present, or nobody ever sees it change.
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
 * Both espers this volume awards are also sitting in a chest somewhere, so the
 * scene has to be able to end without announcing a thing the party already
 * owns. Same helper as volume three, and the same reason for it.
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

/** Give a map its own theme back, for scenes that end without a fight. */
function restoreTheme(game, ctx, fade = 1.6) {
  if (ctx?.field?.mapDef?.music) game.playMusic(ctx.field.mapDef.music, { fade });
}

// --- the eleven seconds -----------------------------------------------------

const ELEVEN_ACCOUNTS = [
  'eleven_bells', 'eleven_drove', 'eleven_avenue', 'eleven_order', 'eleven_gallery',
];

/**
 * Book an account and, if it was the fifth, run the coda on the spot.
 *
 * There is no fifth scene in a fixed place. Whichever account the player hears
 * last is where the sheet gets written up, and the sheet does not agree with
 * itself.
 */
function* elevenLogged(game, ctx) {
  const p = game.party;
  if (p.questStage('eleven') < 0) p.startQuest('eleven', 0);
  const done = countFlags(p, ELEVEN_ACCOUNTS);
  p.advanceQuest('eleven', done);
  if (done < ELEVEN_ACCOUNTS.length) return;

  yield* cinematic(game, true);
  game.playMusic('memory', { fade: 1.0 });
  yield* say(game, null, [
    'Written out on one sheet, in one hand, the five of them do not sit next to each other.',
    'Nine strokes of a bell. Four seconds off a herd. Sixty-two yards of marble. Seven counted out loud into a well. And a shift that came up at four and was told.',
  ]);
  yield* say(game, 'Vesna', [
    'I did not count. I was listening to something and it did not occur to me to count.',
    'What I can tell you is that it did not begin when the light went out and it has not stopped. It is still going.',
  ]);
  const kestrel = speaking(p, ['kestrel']);
  if (kestrel) {
    yield* say(game, 'Kestrel', [
      'The archive will take the officer of the watch. Not because he was standing where he could see anything — because his is the only one written in ink.',
      'In sixty years there will be one figure and it will be eleven, and there will be nothing at all underneath it.',
    ]);
  } else {
    yield* say(game, null, [
      'The sheet goes into a coat pocket. Nobody proposes doing anything else with it and nobody takes it out again that day.',
    ]);
  }
  yield* say(game, null, [
    'Somewhere in the fourth week people stopped saying what they saw and started saying eleven.',
    'Nobody asked will put a day on it. Several will put a week on it, and no two of the weeks are the same week.',
  ]);
  yield* game.grantChest({ kind: 'item', id: 'steadyband', label: 'a Steady Band' }, ctx?.field);
  p.setFlag('eleven_closed');
  p.completeQuest('eleven');
  restoreTheme(game, ctx);
  yield* cinematic(game, false);
}

export const VOL5_EVENTS = {
  // =========================================================================
  // The eleven seconds. Five accounts, five towns, no order, no answer.
  // =========================================================================

  /** Thistlebeck. Two bells, and one of them may not have rung. */
  *eleven_bells(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('eleven_bells')) {
      yield* say(game, 'Bell-Keeper Wray', [
        'I have not moved off nine and she has not moved off hers. We ring at noon and we are still four seconds apart.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Bell-Keeper Wray', [
        'I strike at noon and she strikes at noon and we are four seconds apart, and we have been four seconds apart for nineteen years.',
        'Neither of us is going to move. The bridge would never hear the end of it.',
      ]);
      return;
    }
    yield* say(game, 'Bell-Keeper Wray', [
      'The dark. Everybody wants the dark, and I stopped being civil about it in about the second week.',
      'I was on the rope, because at that hour I am always on the rope. It went, and I did what I do when anything goes, which is strike.',
    ]);
    yield* say(game, 'Bell-Keeper Wray', [
      'Nine. I struck nine, and I can strike nine asleep, and nine at my pace is eight seconds and a bit of the next one.',
    ]);
    yield* say(game, 'Vesna', ['And the other bell.']);
    yield* say(game, 'Bell-Keeper Wray', [
      'Struck as well. She says she started first, I say I started first, and there is no third party on this beck who would be believed by either of us.',
    ]);
    yield* say(game, 'Bell-Keeper Wray', [
      'Here is the thing I have not said on the bridge.',
      'From where I was standing there was one bell. One. Not two of them four seconds apart — one, the whole way through.',
      'So either she matched me to the stroke, which she has not managed in nineteen years of trying, or one of us was hearing the other one and thinking it was himself.',
    ]);
    p.setFlag('eleven_bells');
    yield* elevenLogged(game, ctx);
  },

  /** Oxmere. Eleven hundred head, and cattle are better than a clock. */
  *eleven_drove(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('eleven_drove')) {
      yield* say(game, 'Drift-Master Sallow', [
        'Four seconds. Nobody has offered me a reason to move off it and I have asked four people to try.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Drift-Master Sallow', [
        'Eleven hundred through the throat on Thursday. Stand where you are standing now and you will be a story in this town by Friday.',
      ]);
      return;
    }
    yield* say(game, 'Drift-Master Sallow', [
      'Eleven hundred head in the lower standing when it went. They lay down. All of them together, the way they go down for thunder they have not heard yet.',
      'Then they were up again. Front rank first, which is not how a herd gets up after thunder, and I have been carrying that about with me since.',
    ]);
    yield* say(game, 'Vesna', ['How long was it.']);
    yield* say(game, 'Drift-Master Sallow', [
      'Four seconds. I do not keep a clock. I have got cattle, and cattle are better, and cattle do not need winding.',
      'A beast takes longer to get up than it took to go down. That is fixed. Four down, six up, and the light was back before the last of them had their knees under them.',
    ]);
    yield* say(game, 'Drift-Master Sallow', [
      'Everybody says eleven. Everybody has said eleven since about the second week.',
      'If it was eleven, then my herd stood about in the dark for seven seconds with nothing to look at, quietly, and they do not do that. They have never once done that.',
    ]);
    p.setFlag('eleven_drove');
    yield* elevenLogged(game, ctx);
  },

  /** Marrowgate. Sixty-two yards of it, and the marble was the wrong temperature. */
  *eleven_avenue(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('eleven_avenue')) {
      yield* say(game, 'Night-Watch Praed', [
        'Sixty-two yards. I have paced it in daylight four times since, in case I had it wrong. I did not have it wrong.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Night-Watch Praed', [
        'Nothing to see. That is the report I have handed in eleven years running and nobody has ever asked me to expand on it.',
      ]);
      return;
    }
    yield* say(game, 'Night-Watch Praed', [
      'I was on the fourth kerb going north. I walk that avenue every night and there is nothing on it, which is why they give it to me and not to a younger man.',
      'It went out. I did not stop, because stopping in the middle of an avenue in the dark is how a man ends up sitting down on it.',
    ]);
    yield* say(game, 'Night-Watch Praed', ['I kept walking. When the light came back I was standing on the tenth kerb.']);
    yield* say(game, 'Vesna', ['How far is that.']);
    yield* say(game, 'Night-Watch Praed', [
      'Sixty-two yards. Eight to a kerb and a little over, and I have paced it since in daylight more than once.',
      'You do not do sixty-two yards in eleven seconds. Not in the dark, not carefully, and I was careful, because I have got a wife.',
    ]);
    yield* say(game, 'Night-Watch Praed', [
      'And the marble was warm. At that hour it is colder than the grass and it has been colder than the grass every night of my life.',
      'It was warm the whole way. It went cold about a minute after the light came back, at the ordinary rate, as though it had started the night again from the beginning.',
    ]);
    p.setFlag('eleven_avenue');
    yield* elevenLogged(game, ctx);
  },

  /** Ferran Outpost. Where the figure came from, which is not where anybody thinks. */
  *eleven_order(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('eleven_order')) {
      yield* say(game, 'Gate-Sentry Ostrel', [
        'Both figures are in the book and both of them are mine. One is struck through. That is the part I keep going back to.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Gate-Sentry Ostrel', [
        'Nothing goes in the day-book but what I saw and the time I saw it at.',
        'That is the whole of the trade and it takes about nine years before anybody will let you do it on your own.',
      ]);
      return;
    }
    yield* say(game, 'Gate-Sentry Ostrel', [
      'I was at the north post, looking into the well, which is against Order 116 and has been against Order 116 since before I was posted here.',
      'When it went I counted. Out loud, because out loud is steadier, and because there was nobody to hear me do it.',
    ]);
    yield* say(game, 'Vesna', ['What did you get to.']);
    yield* say(game, 'Gate-Sentry Ostrel', [
      'Seven. I wrote seven in the book with the time beside it and my mark under it.',
      'Then the officer of the watch came round and said eleven, and I struck out seven and wrote eleven, because that is what you do with an officer of the watch.',
    ]);
    yield* say(game, 'Gate-Sentry Ostrel', [
      'The dispatch went down to Solmere that night with eleven in it. Inside a fortnight every parish on this coast was saying eleven.',
      'I have asked a lot of them since. Not one of them counted.',
    ]);
    yield* say(game, 'Vesna', ['Whose seven was it.']);
    yield* say(game, 'Gate-Sentry Ostrel', [
      'Mine, and I was looking down a well at the time, which is not where the sky is. I would not take it to a magistrate.',
      'The seven is still under the ink. Hold the page up to a lamp and it is perfectly legible, and I have held that page up to a lamp more often than I would like to say.',
    ]);
    p.setFlag('eleven_order');
    yield* elevenLogged(game, ctx);
  },

  /** Highfell. Four men who were two hundred feet in, and saw nothing at all. */
  *eleven_gallery(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('eleven_gallery')) {
      yield* say(game, 'Gallery Hand Rannock', [
        'We were down. That is what the four of us have got, and one of us has stopped saying it that way.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Gallery Hand Rannock', [
        'Two hundred feet of hill over your head and no weather in it at all. Best room in Highfell and the pay is the same as the yard.',
      ]);
      return;
    }
    yield* say(game, 'Gallery Hand Rannock', [
      'Four of us in the west face. Down at six, up at four, the same as any day of the week.',
      'Nothing happened. There is no better way of putting that and I have had a year to find one.',
    ]);
    yield* say(game, 'Vesna', ['You did not see it.']);
    yield* say(game, 'Gallery Hand Rannock', [
      'We were two hundred feet in. There is nothing to see down there on a good day; that is rather the point of a gallery.',
      'We came up at four and the yard was standing about. Marn had the boys sat on the ramp and nobody had swept, and it was four in the afternoon.',
    ]);
    yield* say(game, 'Gallery Hand Rannock', [
      'Everyone on this hill has got a piece of it. The four of us have got a shift and a cold dinner.',
      'Doggett has started saying he felt it. Says the face went quiet and then came back.',
      'The other three of us have stopped correcting him, and I could not tell you which week we stopped.',
    ]);
    p.setFlag('eleven_gallery');
    yield* elevenLogged(game, ctx);
  },

  // =========================================================================
  // Two hunts. Both after the world changes state.
  // =========================================================================

  /**
   * The Weeping Wood. It has taken the sound out of itself since Ashenhall
   * burned, which is why people walk in to ask things: nothing answers, and
   * that is restful. Since the spring it answers, and it is right.
   */
  *weeping_answer(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('answering_slain')) {
      yield* say(game, null, [
        'The wood is quiet in the way it was quiet before. Somebody has put a bough across the path at shoulder height, and left it there.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'The spring comes up through the roots and goes nowhere, and the wood takes the sound of it before it has finished being a sound.',
        'People have been walking in here to ask things for a thousand years. Nothing answers. That is the arrangement and both sides have kept it.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'There is a woman on the path coming out, walking the way people walk when they have decided not to run.',
      'She does not stop to talk. She says one thing over her shoulder, which is that she asked where her brother was, and that she was answered, and that she was right the first time.',
    ]);
    yield* say(game, 'Vesna', [
      'A thousand years of nobody getting an answer in here, and the whole of the county built a practice on it.',
      'It is not that it has started talking. It is that it has stopped being able to help itself.',
    ]);
    const keeper = speaking(p, ['wick', 'oda']);
    if (keeper) {
      yield* say(game, keeper.name, [
        'You do not go somewhere to be answered. You go somewhere to hear yourself ask.',
        'Whatever is doing this has taken the useful half out of it.',
      ]);
    }
    yield* tremor(game, 1.8, 0.7);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['theanswering'] },
      { boss: true, terrain: 'grass', scenery: 'field', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('answering_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It goes quiet in stages, from the outside in, the way a crowd does.',
      'The last of it is a single answer, given to nobody, to a question nobody in the clearing had put out loud.',
    ]);
    yield* say(game, 'Vesna', [
      'It was right. I have checked the one it gave me and it was right.',
      'That is not the same as it knowing. I have been trying to make those two things come apart in my head since the stair.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'answeringmirror', label: 'an Answering Mirror' }, ctx.field);
    p.addGold(20000);
    yield* say(game, null, [
      'In the roots under it, in a hollow that has been kept dry by somebody, there is 20000 gil in offerings, sorted by coin and stacked in nines.',
    ]);
    p.completeQuest('wood');
    yield* cinematic(game, false);
  },

  /**
   * The Meridian Reach. Every survey mark on the northern division has been
   * altered to a different figure, and the new figures agree with each other
   * and with nothing that is on the ground.
   */
  *reach_gainsayer(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('gainsayer_slain')) {
      yield* say(game, null, [
        'The painted stone has nine marks on it and all nine are crossed through, and the ninth was crossed through in front of witnesses.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'The survey marker gives the northern division and the year it was walked, and somebody much later has written that there is plenty down south.',
        'The stones on the toll ledge are the right number for a toll in a currency nobody has minted in ninety years.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'Every marker between the well and the toll board has been recut. Not defaced — recut, carefully, to a different figure, by somebody who had the right chisel.',
      'The new figures are consistent. Walk them and they agree with each other the whole way and with nothing whatever underfoot.',
    ]);
    yield* say(game, null, [
      'The painted stone has nine marks and eight are struck through. As the party comes level with it, the ninth is struck through as well.',
    ]);
    const reader = speaking(p, ['kestrel', 'maret', 'aurelian']);
    if (reader) {
      yield* say(game, reader.name, [
        'It is not lying. Every figure on that road is wrong and every one of them is wrong by a different amount.',
        'A liar picks a number. This has gone to the trouble of picking eleven.',
      ]);
    }
    yield* say(game, 'Vesna', ['It has been out here on its own with a chisel and a road, and it has done the road.']);
    yield* tremor(game, 2.0, 0.8);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['thegainsayer'] },
      { boss: true, terrain: 'dirt', scenery: 'field', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('gainsayer_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It comes apart without arguing, which after the last quarter of an hour is the strangest thing it does.',
      'The chisel is in the road where it fell. It is Imperium issue, stamped, and worn down to about a third of a chisel.',
    ]);
    yield* say(game, 'Vesna', [
      'Somebody surveyed this road once and somebody has been unsurveying it ever since.',
      'I would like to know which of those two the Imperium paid for. I am not going to find out on this road.',
    ]);
    yield* grantEsper(game, 'windfoundling', 'a shard of magicite', ctx.field, 'overwindband', 'an Overwind Band');
    p.addGold(22000);
    yield* say(game, null, [
      'Under the toll ledge, in a course of stones laid hollow, there is 22000 gil in a currency that has not been legal since before the survey.',
    ]);
    p.completeQuest('gainsay');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Two scenes settled by who is standing in the active four.
  // =========================================================================

  /**
   * Marrowgate's hand. The parish bought it two winters ago off a man who has
   * since died, and has had a good two years, which in Marrowgate means the
   * well did not fail.
   *
   * Whether anybody ever establishes what it is depends entirely on whether the
   * party is carrying somebody who can read a mark. If it is not, the case gets
   * shut again and nobody ever finds out, and that ending is not a failure.
   */
  *marrowgate_hand(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('hand_done')) {
      yield* say(game, 'Goodwife Ledger', p.hasFlag('hand_told')
        ? ['It is on Onder\'s shelf with the rest of what comes up out of gardens. Nobody has asked me where it went.',
           'Four people have been past that shelf this week and none of them looked at it twice, and I have had a fortnight to decide how I feel about that.']
        : ['The case is shut and the parish touches the glass on the ninth of the month, which was never the arrangement and is where we have got to.',
           'The well has not failed. I am not going to pretend I know what that is worth.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'A glazed case on a bracket in the wall of the shop, and a hand in it, carved, palm up, at about the size of a hand.',
      'The glass has been cleaned recently and the bracket has not.',
    ]);
    yield* say(game, 'Goodwife Ledger', [
      'The keeper\'s hand, out of Ashenhall, and before you say anything I know what the hall says about its own relics.',
      'A man brought it down two winters ago and the parish raised four hundred gil for it in a week, which for three hundred and forty people is a fortnight of not eating meat.',
    ]);
    yield* say(game, 'Vesna', ['Where is he now.']);
    yield* say(game, 'Goodwife Ledger', [
      'Dead. Not suspiciously. He was sixty and it was February.',
      'Two good years since. The well has not failed and nothing has come out of the north end, and I am aware of what that sentence sounds like from outside.',
    ]);
    yield* cinematic(game, false);
    yield* say(game, 'Reliquar Ansence', [
      'I sell relics. I have sold relics in this town for nine years and I did not sell them that.',
      'Look at the wrist. That is all I am going to say to you in the middle of a lane, and it is more than I have said to anyone else.',
    ]);

    const READERS = {
      kestrel: [
        'There is a mark cut into the wrist, under the cuff of it. It is a Solmere trade mark and there is a year on it.',
        'The year is nine hundred and forty years after the hall burned.',
      ],
      aurelian: [
        'That is soapstone and that is a drill. Not a bow drill — a drill on a frame, which is a Works tool, and I know because we sell them.',
        'Somebody made this in an afternoon and made a good job of the fingers.',
      ],
      ilsabet: [
        'The knuckles are wrong. Whoever cut that was working from a drawing of a hand and not from a hand.',
        'You can see where they got to the thumb and had to decide something. I have made the same decision and mine was also wrong.',
      ],
      corvin: [
        'I have seen three of these. One in Solmere, one on the coast, and one I would rather not go into.',
        'They come out of the same shop and they are not a bad shop. Ask me how I know and I will change the subject with some skill.',
      ],
    };
    const reader = speaking(p, Object.keys(READERS));

    if (!reader) {
      yield* say(game, null, [
        'Nobody in the party can do anything with the wrist. It is a mark under a cuff of stone, cut small, and it is either a maker or a scratch.',
      ]);
      yield* say(game, 'Reliquar Ansence', [
        'Then it stays a mark under a cuff. I am not going to be the man in the lane who said it out loud and could not follow it up.',
        'Come back with somebody who reads stone. Or do not, and the parish carries on, and the well carries on, and so on.',
      ]);
      yield* say(game, 'Goodwife Ledger', [
        'You have been a long time at that case. Was there something.',
      ]);
      yield* say(game, 'Vesna', ['No.']);
      yield* say(game, null, ['She shuts the case, and cleans the glass again, which it did not need.']);
      p.addGold(1200);
      yield* say(game, null, ['The parish presses 1200 gil on the party for the walk down, and will not hear a word about it.']);
      // Deliberately no `hand_done` and no `completeQuest`. The scene has just
      // told the player to come back with somebody who reads stone; setting
      // those marked the quest Settled in the journal and left the re-entry
      // guard at the top of this event pointing at the closed-case dialogue,
      // so returning with Kestrel got a shrug and the good branch — the one
      // this whole scene exists for — could never be reached. `lastlantern_office`
      // has the same shape and gets it right by returning bare, like this.
      return;
    }

    yield* cinematic(game, true);
    yield* say(game, reader.name, READERS[reader.id]);
    yield* say(game, 'Reliquar Ansence', [
      'Yes. That is what I have had in my mouth for two winters.',
      'I did not sell it to them, so it is not my sale to unmake. That is the reasoning and I am aware of how it holds up.',
    ]);
    p.setFlag('hand_read');
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'Goodwife Ledger is at the other end of the lane with her hands in her apron, watching the party rather than the case.',
      ['Tell her', 'Leave it in the case'],
      { cancelable: false },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* cinematic(game, true);
      yield* say(game, 'Goodwife Ledger', [
        'Say it again with the year in it.',
      ]);
      yield* say(game, null, ['It is said again with the year in it. She listens to the whole of it standing up and does not sit down afterwards.']);
      yield* say(game, 'Goodwife Ledger', [
        'Right.',
        'It comes out of the case tonight, before the ninth, so that nobody has to be told anything on a day they were expecting to be told something.',
      ]);
      yield* say(game, 'Vesna', ['You could leave it where it is.']);
      yield* say(game, 'Goodwife Ledger', [
        'I could. I have been standing here working out whether I am the sort of woman who does, and it turns out I am not, and I would rather have found that out about something else.',
        'Three hundred and forty people put in for that. They can have it on the shelf with everything else that came out of a garden, and they can pick it up.',
      ]);
      yield* say(game, null, [
        'It goes onto Onder Quillam\'s shelf the same evening, between a ring and a hinge, with no label on it.',
        'Nobody says anything about it in the lane for four days, and then somebody does, and it is about the price.',
      ]);
      yield* say(game, 'Goodwife Ledger', ['Take it with you. I have looked at it enough and Onder will not sell it and I am not putting it back in a garden.']);
      yield* game.grantChest({ kind: 'item', id: 'quicklimecharm', label: 'a Quicklime Charm' }, ctx.field);
      p.setFlag('hand_told');
      yield* cinematic(game, false);
    } else {
      yield* say(game, 'Vesna', ['There was nothing on the wrist.']);
      yield* say(game, null, [
        'Goodwife Ledger looks at Vesna for slightly longer than the sentence took, and then goes back to the shop.',
      ]);
      yield* cinematic(game, true);
      yield* say(game, 'Reliquar Ansence', [
        'That is the answer I have been giving for two winters and it is a good deal harder to give the second time.',
        'Take the helm off the end of the counter. It came off a cairn east of here, I took it off myself with an apology, and it is exactly what I say it is.',
        'I do that once a year for my own sake. It is not much of a practice and it is the whole of one.',
      ]);
      yield* game.grantChest({ kind: 'item', id: 'gravehelm', label: 'a Grave Helm' }, ctx.field);
      yield* cinematic(game, false);
    }
    p.setFlag('hand_done');
    p.completeQuest('relic');
  },

  /**
   * The Last Lantern. The road is posted with numbers that are not distances,
   * and at the end of it a woman fills a lamp because she was handed the can.
   *
   * If the party is carrying somebody who can say what the numbers are, she is
   * told, and stops, and then does not stay stopped. If it is not, she never
   * finds out and hands the can on, which is all she was ever after.
   */
  *lastlantern_office(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('office_done')) {
      yield* say(game, 'Hesper Cawl', p.hasFlag('office_named')
        ? ['It was out for one night. I lit it again in the morning and I have not made any decision past that morning.',
           'I will decide about tomorrow tomorrow. That is not a way of avoiding it. That is the size of decision I can get through.']
        : ['Two of us can do it now. You did it once and you did it badly and that is still two.',
           'I have written the measure on the inside of the lid, in case the next one after you is worse at it.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The road in is twenty-four paces wide where it leaves the world and two paces wide where it arrives, and the posts along it are cut with numbers that get smaller.',
      'At the end of it there is a room ten paces by five with one bracket in it, and the lamp on the bracket is lit.',
    ]);
    yield* say(game, 'Hesper Cawl', [
      'Every ninth day, a measure and a half of oil, and the wick trimmed square and not slanted.',
      'Tunn gave me the can. His aunt gave him the can. I never met the aunt and Tunn was not talkative.',
    ]);
    yield* say(game, 'Vesna', ['What is it for.']);
    yield* say(game, 'Hesper Cawl', [
      'I have three answers and I have stopped preferring any of them.',
      'The posts count down, so it is a countdown to something. Or it is the last one and somebody has to keep the last one. Or Tunn\'s aunt liked a job.',
      'Nobody comes down that road. I have been here eleven years and the only feet on it have been mine and yours.',
    ]);
    yield* cinematic(game, false);

    const NAMERS = {
      kestrel: [
        'Twenty-four, twenty, sixteen, twelve, eight, six, four, two, one. That is not a countdown. That is a draw table.',
        'It is what a well gives, year on year, as it runs out. Somebody has posted a road with the failing yield of a well.',
        'The last figure on it is one, and the lamp is standing where the one is.',
      ],
      wick: [
        'Those are the hours of a vigil, counted down, and there are nine of them, and there were nine lanterns.',
        'This is the ninth office. Somebody set it out along a road so that a person walking it would arrive at the right hour without having to be told.',
      ],
      idris: [
        'That road went to Ashenhall. Not the road on the map — this one, and it was walked at night, and the posts were for people who could not be given lamps.',
        'I have not been down it. I have known where it was for forty years and I have not been down it.',
      ],
    };
    const namer = speaking(p, Object.keys(NAMERS));

    if (namer) {
      yield* cinematic(game, true);
      yield* say(game, namer.name, NAMERS[namer.id]);
      yield* say(game, 'Hesper Cawl', [
        'Say that again slowly and let me get it on the lid.',
      ]);
      yield* say(game, null, ['She writes it on the inside of the lid of the oil can, in pencil, in a hand that has not written much lately.']);
      yield* say(game, 'Hesper Cawl', [
        'Then it is finished. If it is a count and the count is at one, it is finished, and it has been finished since before Tunn.',
      ]);
      yield* say(game, null, [
        'She puts the lamp out that evening. It is the first time the room has been dark since anyone alive can account for, and it is dark for about eleven hours.',
        'She lights it again after breakfast, without saying anything about it, and trims the wick square.',
      ]);
      yield* say(game, 'Hesper Cawl', [
        'I will decide about tomorrow tomorrow.',
        'Take the old one off the bracket. It has been up there since Tunn and it has not held oil in years, and I have kept it because it was on the bracket.',
      ]);
      yield* game.grantChest({ kind: 'item', id: 'ninthlanternstaff', label: 'a Ninth Lantern Staff' }, ctx.field);
      p.setFlag('office_named');
      yield* cinematic(game, false);
    } else {
      yield* say(game, 'Hesper Cawl', [
        'You have not got it either. That is four sets of strangers and no two of you have even guessed the same wrong thing.',
      ]);
      const choice = yield* game.dialogue.ask(
        'She is holding the can out at about waist height and has been for a while.',
        ['Fill it', 'Leave it to her'],
        { speaker: 'Hesper Cawl', cancelable: true },
      );
      game.dialogue.close();
      if (choice !== 0) {
        yield* say(game, 'Hesper Cawl', [
          'Fair enough. It is my ninth day and not yours.',
          'Come back when you have got somebody who reads numbers off a post. I am not going anywhere and neither is the post.',
        ]);
        return;
      }
      yield* cinematic(game, true);
      yield* say(game, null, [
        'It takes about a quarter of an hour and it is done badly. The oil goes over the bracket and the wick comes out slanted, and she does not touch it afterwards.',
      ]);
      yield* say(game, 'Hesper Cawl', [
        'That is two of us who have done it. That is the entire object of the exercise and it has taken me eleven years.',
        'Tunn stood over me while I did my first one and told me nothing except that the wick goes square. I have improved on him by exactly one sentence.',
      ]);
      yield* say(game, 'Hesper Cawl', [
        'Take the coat off the hook. It was on the hook when I came and it is too big for me and it has been in this room a very long time.',
      ]);
      yield* game.grantChest({ kind: 'item', id: 'vigilrobe', label: 'a Vigil Robe' }, ctx.field);
      yield* cinematic(game, false);
    }
    p.setFlag('office_done');
    p.completeQuest('office');
  },

  // =========================================================================
  // What is believed on purpose, and what is believed because nobody checked.
  // =========================================================================

  /**
   * Oxmere's road warning. Cut deep, cut old, obeyed by everybody, and it means
   * a drove. The town has replaced it with something better and the something
   * better has kept children out of the road for four hundred years.
   */
  *oxmere_road_warning(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('droveroad_done')) {
      yield* say(game, 'Old Pettigrew', p.hasFlag('droveroad_told')
        ? ['They are still saying it. They say it now in the voice you use for a joke you have decided to keep.',
           'The children are still out of the road. I did wonder.']
        : ['Sixty years and I have told nobody, and I would like it noted that not telling is a job of work.']);
      return;
    }
    yield* say(game, null, [
      'The mile board is painted for the fairs and the roads, and under all of it, cut deep and much older than the paint: DO NOT SLEEP IN THE ROAD. THE ROAD IS WHERE THEY COME.',
    ]);
    yield* say(game, 'Widow Marle', [
      'Every child in this town has that by heart before they can read it. There is a rhyme and I am not going to say the rhyme.',
      'You do not sleep in the road. You do not sit in the road after dark. You do not go into the throat at night for a hat.',
    ]);
    yield* say(game, 'Vesna', ['What comes.']);
    yield* say(game, 'Widow Marle', [
      'Nobody will tell you and it is not because they are frightened. It is because none of them knows and all of them are certain.',
      'Ask Pettigrew. He is ninety-one and he has an opinion about the wording, which is not the same thing as an opinion about the meaning.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Old Pettigrew', [
      'They. Eleven hundred of them, twice a year, and the front of them cannot see the back of them, and they come up the middle of that road in the dark at four in the morning.',
      'That is your they. That is the whole of your they and it has never been anything else.',
    ]);
    yield* say(game, 'Old Pettigrew', [
      'Whoever cut that was a drover telling other drovers where not to put a bedroll down. It is a notice about traffic.',
      'Four hundred years took the drovers off that road and left the notice standing on it. The town has been filling in the gap ever since, and what it has put in the gap is a good deal better.',
    ]);
    yield* say(game, 'Vesna', ['Does anyone else know.']);
    yield* say(game, 'Old Pettigrew', [
      'Chalker Ivy worked it out about nine years ago and has said nothing, and Cuffe has never worked it out and would be extremely cross.',
      'I have had sixty years on it and I have told nobody, and I am telling you because you are leaving.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'There are eleven people at the head trough and it is the part of the day when everybody is standing about.',
      ['Say it at the trough', 'Leave it with him'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* say(game, null, [
        'It goes round the trough in about four minutes and comes back round improved.',
        'The drovers take it best. Two of them work out that they are they, and are pleased about it for the rest of the afternoon.',
      ]);
      yield* say(game, 'Roadwarden Cuffe', [
        'A word.',
        'That notice is the only order in this town that has never once had to be enforced. Not by me, not by my father, not by anybody.',
        'I am not asking you to take it back. I am asking you to be less right in future, and to do it somewhere with a smaller trough.',
      ]);
      yield* say(game, null, [
        'The rhyme is still being said by the end of the week, in the voice people use for a joke they have decided to keep.',
        'No child sleeps in the road that autumn either.',
      ]);
      p.setFlag('droveroad_told');
    } else {
      yield* say(game, 'Old Pettigrew', [
        'Good. Nobody cut that to fool anybody, and a thing nobody meant is not a lie, whatever else it is.',
        'It is a notice about traffic, read very carefully by four hundred years of people who were never on that road at four in the morning.',
      ]);
    }
    yield* say(game, 'Old Pettigrew', [
      'Take this. It came off a drover who slept in the road once, in my grandfather\'s time, and got up again, and never did it twice.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'secondbreath', label: 'a Second Breath' }, ctx.field);
    p.setFlag('droveroad_done');
    p.completeQuest('droveroad');
  },

  /**
   * Emberlyn's east road, closed by nobody, on the authority of nobody, since a
   * year nobody agrees on. This one does not get an answer and is not going to.
   */
  *emberlyn_eastroad(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('eastroad_done')) {
      yield* say(game, null, p.hasFlag('eastroad_rubbed')
        ? ['The line is back on the board, in a better hand than it was in, and the paint is not dry.',
           'Nobody at the toll has anything to say about who put it there, and four of them say it very quickly.']
        : ['EAST ROAD — CLOSED. ASK NOBODY WHY. The charcoal has been gone over often enough to have a ridge on it.']);
      return;
    }
    yield* say(game, null, [
      'The toll board gives the north road and the south road and what each costs, and under both, in charcoal gone over many times: EAST ROAD — CLOSED. ASK NOBODY WHY.',
    ]);
    yield* say(game, 'Drover Halm', [
      'Closed since the year twenty-nine, by the Imperium, on account of the bridge at the second ford.',
      'There is no bridge at the second ford. There is no second ford. I have been saying this sentence for thirty years and I have never once got to the end of it before somebody agreed with me.',
    ]);
    yield* say(game, 'Sabrena Loth', [
      'Thirty-four, and it was the sickness, and it was the parish and not the Imperium, and my mother had the closing of it read out in this room.',
      'She was eleven at the time. I have had that story off her at the length it deserves and at three other lengths.',
    ]);
    yield* say(game, 'Sesk', [
      'It was a man in a hurry. He had the chalk off the yard and he did it while the ostler was turning a horse, and he went out by the north gate and did not pay.',
      'That is not from anybody. I worked it out. Nobody writes on a board in charcoal if they are allowed to write on it.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The board has been repainted four times since. Whatever hand wrote the line first went under the second coat.',
      'The east road itself is metalled, kerbed, and clear for as far as anyone will walk down it, which is about a mile, which is as far as anyone has walked down it since the line went up.',
    ]);
    yield* say(game, 'Vesna', ['Where does it go.']);
    yield* say(game, 'Sesk', ['East.']);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The line is charcoal on a painted board and would come off with a cuff.',
      ['Rub it out', 'Leave the board alone'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* say(game, null, [
        'It comes off in one pass and leaves a clean grey patch the shape of the words.',
        'For six days the east road is open. Nobody uses it. On the seventh the line is back, in a better hand than it was in, in paint.',
      ]);
      yield* say(game, 'Toll Clerk Nabb', [
        'I did not see who. I am at that board eleven hours a day and I did not see who, and I want you to know that I have thought about that.',
      ]);
      p.setFlag('eastroad_rubbed');
    } else {
      yield* say(game, null, [
        'The board stays as it is. The party goes north, along with everybody else, on the road that costs four gil the axle.',
      ]);
      yield* say(game, 'Sesk', ['Everyone leaves it. You are the fourth lot to stand there deciding not to.']);
    }
    yield* say(game, 'Sabrena Loth', [
      'Take the coat off the peg by the door. It was left in year thirty-one by a man who said he was going east and then had a bowl of soup and went north.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'roadcoat', label: 'a Road Coat' }, ctx.field);
    p.setFlag('eastroad_done');
    p.completeQuest('eastroad');
  },

  /**
   * Duncastle's muster roll. Six crossings ruled in advance, six men dead the
   * following spring, and eleven years of being the town's one miracle.
   */
  *duncastle_roll(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('roll_done')) {
      yield* say(game, 'Roll-Clerk Ombry', p.hasFlag('roll_told')
        ? ['You told them and they took it as modesty. Two of them said it was very like me.',
           'I have stopped minding. There is a stage past minding and I have got to it and it is quite restful.']
        : ['The book is on the shelf and the pen is with you. Somebody else rules the columns now and rules them one line at a time.']);
      return;
    }
    yield* say(game, null, [
      'The muster roll is a hundred and ten names in columns, the old ones crossed and the new ones written underneath.',
      'Six of the crossings are in the same ink as the writing beneath them. The crossings were made first.',
    ]);
    yield* say(game, 'Gate-Captain Ord', [
      'Ombry ruled those six the winter before. Six men off that roll went into the ground the following spring and he had the lines through them already.',
      'This town has one miracle. People bring him things to look at. He looks at them.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Roll-Clerk Ombry', [
      'I had the pen charged. That is the whole of it and it has been the whole of it for eleven years.',
      'You do not stop mid-page to re-ink if you can help it. I ruled ahead as far as the pen would carry and the pen carried six.',
    ]);
    yield* say(game, 'Vesna', ['Have you said that.']);
    yield* say(game, 'Roll-Clerk Ombry', [
      'Every time I have been asked, in those words, for eleven years.',
      'It does not take. They hear a man explaining how he did it, which is what they came for, and they go away satisfied and tell somebody else.',
    ]);
    yield* say(game, 'Roll-Clerk Ombry', [
      'A woman came up from Lowfen in the spring and asked me to rule six lines for her village. Ahead.',
      'I told her what I have just told you and she thanked me and asked again, and I said no, and she said she understood, and she has written twice since.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'There are about forty people in the bailey and the trader\'s boxes are open, which is when it is fullest.',
      ['Say it in the bailey', 'Leave the book as it is'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* say(game, null, [
        'It is said in the bailey, plainly, with the book open and the pen held up, and it takes about two minutes.',
        'The bailey listens the whole way through. Nobody interrupts and nobody leaves.',
      ]);
      yield* say(game, 'Barred Trader', ['That is very like him.']);
      yield* say(game, null, [
        'Somebody at the back says the pen would have to have known. Somebody else says that is what they have been saying.',
        'By evening the story is that he was asked how he did it and gave an answer about ink, and the answer about ink is repeated with some affection.',
      ]);
      yield* say(game, 'Roll-Clerk Ombry', ['Thank you. I would not have got the pen up that high on my own.']);
      p.setFlag('roll_told');
    } else {
      yield* say(game, 'Roll-Clerk Ombry', [
        'No. It is eleven years old and it has people in it now who do not know they are in it.',
        'I am giving up the roll at the quarter day. Not because of this. Because I am sixty and my hand has gone, and because the next one will rule one line at a time out of respect and that will be the end of it.',
      ]);
    }
    yield* say(game, 'Roll-Clerk Ombry', [
      'Take the pen. It is a good pen and it is the whole of the case against me.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'unbrokenoath', label: 'an Unbroken Oath' }, ctx.field);
    p.setFlag('roll_done');
    p.completeQuest('sixlines');
  },

  /**
   * The Kingspyre. It has never gone out. Two men say they relit it, six years
   * apart, and the book has no gap in it, and the brick will not settle it.
   */
  *kingspyre_relight(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('pyre_asked')) {
      yield* say(game, null, [
        'The stack is sooted from the floor to the roof except for one clean band at about the height of a man, and the band goes the whole way round.',
      ]);
      return;
    }
    yield* say(game, null, [
      'The stoking board is ruled for a shift of eleven. NEVER LESS THAN FOUR ON THE FLOOR AND NEVER ONE ON THE FLOOR ALONE.',
      'Underneath, in the same paint and the same hand: UNDER NO CIRCUMSTANCES GO ROUND THE STACK TO FETCH A MAN BACK.',
    ]);
    yield* say(game, 'Stoke-Master Redd', [
      'It has not been out. Not in the book, not in my father\'s book, not in the book before that, and the books go back to the roof going on.',
      'That is the whole of what the Kingspyre is. It is not a fire. It is a fire that has not been out.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Stoke-Master Redd', [
      'I relit it in year thirty-eight. Off the lamp on the dais rail, at about two in the morning, on my own, which is against the board.',
      'It was down to nothing in the west quarter and I got it back before the shift came on. I have never written it and I have never lied about it, because nobody has ever asked me in those words.',
    ]);
    yield* say(game, 'Old Kell', [
      'He did not. I relit it in forty-four, off a taper I took from the stack itself, which is not possible if the stack was out, and it was not out, and I did it anyway.',
      'Both of those are true and I have had eleven years to make them sit together and they will not.',
    ]);
    yield* say(game, 'Vesna', ['You cannot both have.']);
    yield* say(game, 'Stoke-Master Redd', ['No.']);
    yield* say(game, 'Old Kell', ['No.']);
    yield* cinematic(game, false);

    const engineer = speaking(p, ['aurelian', 'rusk', 'bastian']);
    if (engineer) {
      yield* say(game, engineer.name, [
        'Go round the back of it and look at the brick. Soot does not lie about how high a fire has been.',
      ]);
    }
    yield* say(game, null, [
      'Behind the stack, where the board says not to go, the brick is sooted from the floor to the roof except for one clean band at about the height of a man.',
      'It goes the whole way round. It is either a year the fire did not reach, or it is where a scaffold plank sat, and there is no way in the world to tell which.',
    ]);
    yield* say(game, 'Vesna', [
      'Nobody is going to settle it. There are two men in this room who know what happened, and there are two things that happened.',
    ]);
    yield* say(game, null, [
      'Set into the brick behind the band, at about waist height, there is something that has not taken any soot at all.',
    ]);
    yield* grantEsper(game, 'thekingspyre', 'a shard of magicite', ctx.field, 'cinderheart', 'a Cinder Heart');
    yield* say(game, 'Stoke-Master Redd', [
      'Put the board back the way it was and do not tell the shift where you found that.',
      'They go round the stack once and then they go round it whenever they like, and then one of them is round there on his own.',
    ]);
    p.setFlag('pyre_asked');
    p.completeQuest('pyre');
  },

  /**
   * Harrowmere's well rim. Forty-one marks and then nothing, and the village
   * has had four hundred good years out of it, and the woman who cut them is
   * still alive and remembers exactly.
   */
  *harrowmere_tally(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('tally_told')) {
      yield* say(game, 'Nan Ockley', [
        'You have not said it. I did not think you would and I have been watching to see.',
      ]);
      return;
    }
    yield* say(game, null, [
      'Forty-one marks cut into the rim of the village well, close together, and then nothing.',
      'The stone has been worn smooth around them by four hundred years of buckets, and the marks have not been worn at all, because people put their hands somewhere else.',
    ]);
    yield* say(game, 'Elder Sabbath', [
      'Forty-one households at the founding. Or forty-one years the water held in the dry spell. Or a debt, which is the version the Ferrans liked and paid for.',
      'It is a good rim. I have said all three of those from the step at one time or another and I have meant about two of them.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Nan Ockley', [
      'Come away from the step and I will tell you, because you are not from here and you are going somewhere.',
      'I cut them. I was thirteen and the rope was new and my father had put in a trough that was too big.',
    ]);
    yield* say(game, 'Nan Ockley', [
      'I counted the buckets it took to fill it. Forty-one, and I cut them as I went so he could not say I had lost count.',
      'He looked at the rim and he said, well, and he built a smaller trough, and that is the whole of it.',
    ]);
    yield* say(game, 'Vesna', ['That is eighty years ago.']);
    yield* say(game, 'Nan Ockley', [
      'Seventy-nine. The story got out ahead of me by about a generation and I have never been quick.',
      'I have heard it read off that rim at two funerals. It is a better rim their way and I am not going to stand in a churchyard and take it off them.',
    ]);
    yield* say(game, 'Nan Ockley', [
      'Take the hood. It is warm and it is not the shape of anything and I have got another.',
      'And do not say it in the village. Say it anywhere else you like.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'feltedhood', label: 'a Felted Hood' }, ctx.field);
    p.setFlag('tally_told');
    p.completeQuest('tally');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // The ruined world, and the record being written in it.
  // =========================================================================

  /**
   * The Ninth Well, after. People have started coming, and one of them has
   * written down what happened here, and he is standing at the shaft head
   * reading it to eleven people with the party in the audience.
   */
  *ninthwell_account(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'The bolted notice gives the draw schedule and somebody has written under the last figure that there is not forty-two of anything down there.',
        'Nobody is standing at the shaft head. Nobody has any reason to be.',
      ]);
      return;
    }
    if (p.hasFlag('account_done')) {
      yield* say(game, 'Bede Ollin', p.hasFlag('account_corrected')
        ? ['I have got your corrections in. I read it out with them on Tuesday and it went better, which I did not expect and have not examined.',
           'Come back in the spring. It will have grown a bit. They always do and I have stopped fighting it.']
        : ['Fourth reading this month. Somebody asked me on Tuesday whether the four of them were real and I said that was not a useful question, and I stand by that.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'There are eleven people at the shaft head and a twelfth with a sheet of paper, standing where the draw gear used to be bolted down.',
      'None of them looks at the party for longer than it takes to decide they are not from Solmere.',
    ]);
    yield* say(game, 'Bede Ollin', [
      'Four of them went down. Four, and one was a knight who had sat forty years on a step waiting for the day, and he knew it when it came.',
      'The Chancellor was at the bottom of it with the Engine open, and he was struck down by a voice, and the voice said the names.',
    ]);
    yield* say(game, 'Bede Ollin', [
      'They said them out loud as they came back up. Every one. That is the part I want you to have if you have nothing else off me.',
    ]);
    yield* say(game, 'Vesna', ['That last part is true.']);
    yield* say(game, 'Bede Ollin', ['I made that part up.']);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'He has the sheet held in both hands and he is not looking at it, because he has it by heart.',
      ['Tell him what happened', 'Let him read'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* cinematic(game, true);
      yield* say(game, null, [
        'It takes the better part of an hour and he writes the whole of it down, and asks four questions, and all four of them are about the order things happened in.',
      ]);
      yield* say(game, 'Bede Ollin', [
        'Right. So it was slower, and there was more paperwork in it, and nobody was struck by anything.',
        'I can do that. It is harder and it is better and I will lose about two of the eleven.',
      ]);
      yield* say(game, 'Vesna', ['Do you know who I am.']);
      yield* say(game, 'Bede Ollin', [
        'You are somebody who was told it by somebody who was there. That is the good sort of witness and I have had six of you.',
        'The party that went down were four heroes out of Harrowmere and they are not in this county. I have that off three separate people.',
      ]);
      const witness = speaking(p, ['ilsabet', 'kestrel']);
      if (witness) {
        yield* say(game, witness.name, [
          'Leave it. He has got it more right than he had it an hour ago and that is the whole of what is available today.',
        ]);
      }
      p.setFlag('account_corrected');
      yield* cinematic(game, false);
    } else {
      yield* say(game, null, [
        'He reads it to the end. It takes eleven minutes and it is a good deal better than what happened.',
        'Two of the eleven are crying by the finish and one of them is holding a hat.',
      ]);
      yield* say(game, 'Vesna', ['We could have said.']);
      yield* say(game, null, ['Nobody answers that, and the party is a long time getting up the stair.']);
    }
    p.setFlag('account_done');
    p.completeQuest('account');
  },

  /**
   * The Fen Barrow, after. The plaque says do not settle it. Three parishes
   * have decided that means keep paying, and nobody can name who told them so.
   */
  *fenbarrow_debt(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'The iron plaque gives the year of the sealing and the instruction under it, and the step below it is bare mud.',
        'The seal on the door has been cut through, recently and badly, and nobody has been back to it.',
      ]);
      return;
    }
    if (p.hasFlag('debt_done')) {
      yield* say(game, null, p.hasFlag('debt_paid')
        ? ['The step is fuller than it was. What the party left is under three other things and has gone green at one corner.']
        : ['The step is fuller than it was. Somebody has started sorting it, which is new, and is being done in rows.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'BELOW LIES A DEBT. DO NOT SETTLE IT.',
      'On the step under the plaque there is bread, and coin, and a shoe, and a tooth in a twist of cloth, and a great deal else, in about a foot of it.',
    ]);
    yield* say(game, 'Fen Woman', [
      'Three parishes now. Lowfen come on the ninth, we come when we come, and the Marrowgate lot send theirs down with a carrier because they will not walk out on the fen.',
      'It is owed. That is what the plaque says. It says do not settle it, and settling it and paying it are not the same word.',
    ]);
    yield* say(game, 'Vesna', ['Who told you that.']);
    yield* say(game, 'Fen Woman', [
      'A man. In the autumn, on the road, and he had it off somebody at the outpost.',
      'I could not put a face on him and neither could Hessa and neither could the carrier, and the three of us have sat down and tried.',
    ]);
    yield* say(game, 'Fen Woman', [
      'He was not asking for anything and he did not take anything off the step. I looked. I am not a fool and I did look.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The step is at about knee height and there is room on it.',
      ['Leave 500 gil on the step', 'Leave nothing'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice === 0 && p.spendGold(500)) {
      yield* say(game, null, ['The coin goes on the step at the back, where the rain gets at it least, which is where everybody puts coin.']);
      yield* say(game, 'Fen Woman', ['You have done that before.']);
      yield* say(game, 'Vesna', ['No.']);
      p.setFlag('debt_paid');
    } else if (choice === 0) {
      yield* say(game, null, ['The party has not got five hundred to leave. The Fen Woman does not comment on that and does not need to.']);
    } else {
      yield* say(game, 'Fen Woman', [
        'Suit yourself. It is not a toll and nobody is counting, and if anybody starts counting I will have something to say about it.',
      ]);
    }
    yield* say(game, 'Fen Woman', [
      'Take that off the back of the step. It has been there since before I started coming and it is not bread and it is not coin.',
      'Somebody left a ring on a barrow step. I have thought about that more than is good for me.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'bloodironband', label: 'a Blood Iron Band' }, ctx.field);
    p.setFlag('debt_done');
    p.completeQuest('debt');
  },

  /**
   * Ashenhall, after. The ninth alcove is empty because the party emptied it,
   * and there is a card up explaining that the lamp is being cleaned.
   */
  *ashenhall_cleaned(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'The ninth alcove holds its lamp and the other eight are scoured to the brick.',
        'There is nobody at the door. The hall has not needed anybody at the door for a very long time.',
      ]);
      return;
    }
    if (p.hasFlag('alcove_done')) {
      yield* say(game, 'Hall-Keeper Bram', p.hasFlag('alcove_told')
        ? ['The card says AWAY. It said TAKEN for a morning and I had four conversations before noon, so it says AWAY.',
           'That is not cowardice. That is one man on a door with no lamp behind him.']
        : ['BEING CLEANED. That card has been up a year and two months and nobody has yet asked me who is doing the cleaning.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'There are nine visitors in the hall and they have come a long way, and one of them has brought a child on his shoulders to see it.',
      'The ninth alcove is empty. On the rail in front of it there is a card in a good hand: BEING CLEANED.',
    ]);
    yield* say(game, 'Hall-Keeper Bram', [
      'It is away being cleaned. It will be back.',
      'It comes off the bracket every so often; a thousand years of burning puts a great deal on the glass, and it wants doing properly and it wants doing in Solmere.',
    ]);
    yield* say(game, null, [
      'He says it the way a man says a thing he has said four hundred times. The visitors take it well. The one with the child says they will come back in the spring.',
    ]);
    yield* say(game, 'Hall-Keeper Bram', [
      'I put the card up myself. Nobody told me to and nobody has told me not to.',
      'It went out of that alcove in the autumn and there was a great deal of noise about it, and then Solmere stopped answering letters, and I have had a year of people with children in the doorway.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The hall is empty for about a quarter of an hour between one party of visitors and the next.',
      ['Tell him where it went', 'Leave the card up'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* cinematic(game, true);
      yield* say(game, 'Hall-Keeper Bram', [
        'Sit down and start at the alcove.',
      ]);
      yield* say(game, null, ['It is told from the alcove. He does not interrupt and he does not ask what happened to her.']);
      yield* say(game, 'Hall-Keeper Bram', [
        'Right. Then what do I put on the card.',
        'I am not being difficult. There is a card and it has a hook and something has to be on it by two o\'clock.',
      ]);
      yield* say(game, null, [
        'He writes TAKEN and puts it up, and it is up for one morning.',
        'By noon he has had four conversations in the doorway and by the afternoon the card says AWAY, and it has said AWAY since.',
      ]);
      yield* say(game, 'Hall-Keeper Bram', ['One word is worse than the other and I could not tell you which of them it is.']);
      p.setFlag('alcove_told');
      yield* cinematic(game, false);
    } else {
      yield* say(game, null, [
        'The next party of visitors comes in at about four. There are six of them and two have walked from the coast.',
        'The card is still up. Bram gives them the whole of it, including the part about the glass, and they are pleased with him.',
      ]);
    }
    yield* say(game, 'Hall-Keeper Bram', [
      'Take the cloth out of the alcove. It was under her the whole time and it has never been out in the light, and it will go the colour of everything else in about a year now.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'mantleofnine', label: 'a Mantle of Nine' }, ctx.field);
    p.setFlag('alcove_done');
    p.completeQuest('alcove');
  },

  // =========================================================================
  // Two accounts, one book, and nothing to settle it with.
  // =========================================================================

  /**
   * Greyharrow holds a day for the fighting at the ford. The garrison day-book
   * has the garrison nine miles away moving stone. Two men were at the ford and
   * neither of their fords is the other one's ford.
   */
  *greyharrow_ford(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('ford_asked')) {
      yield* say(game, 'Captain Ilene Marr', p.hasFlag('ford_read')
        ? ['They held the day in the spring with a verse in it about the day-book. It scans better than the rest of it.',
           'Sixty-one people heard me read that page out and sixty-one people came to the day. I have not decided what that is evidence of.']
        : ['The book is in the case and the day is in the spring, and I go to the day, because I am the Captain and the Captain goes.']);
      return;
    }
    yield* say(game, null, [
      'The muster board gives an establishment of four hundred and a present of sixty-one, and the sixty-one has been scraped off and rewritten until the slate has gone thin.',
      'Beside it, on a card that is newer than everything else on the wall: THE DAY OF THE FORD — SECOND WEEK OF APRIL. STALLHOLDERS SEE THE SERJEANT.',
    ]);
    yield* say(game, 'Bevis Hark', [
      'I was at the ford. Waist deep, on the far bank, from the middle of the morning until it was over.',
      'It came on quick and it was done by two and there were sixty of us and we did not give a foot of it.',
    ]);
    yield* say(game, 'Old Marchand', [
      'I was at the ford. It started at dusk and it went all night and there was nothing quick about any part of it.',
      'Hark was there. I have never once said he was not there. He has the day wrong and he has the light wrong and I am not going to argue with him at ninety.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Captain Ilene Marr', [
      'I have the day-book for that year. It is a garrison book, kept daily, signed off weekly, and it has never been out of the case.',
      'That week the establishment was at Highfell moving stone for the new gallery head. All of it. There is a return with a tonnage on it.',
    ]);
    yield* say(game, 'Vesna', ['And the ford.']);
    yield* say(game, 'Captain Ilene Marr', [
      'The ford is nine miles the other way and there is not a line about it in the book, that week or any week either side.',
      'I have had this book eleven years. I have read that fortnight so often I could give you the weather.',
    ]);
    yield* say(game, 'Captain Ilene Marr', [
      'Hark is not lying. Marchand is not lying. The book is not wrong; it is a garrison book and it was signed off by a man who is buried in the town.',
      'Those are three things and they will not go into two.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The book is on the table with the fortnight open, and there are people at the market end who would come over if anything were being read out.',
      ['Ask her to read the page out', 'Let the day stand'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice === 0) {
      yield* say(game, null, [
        'She reads the fortnight out on the drill square, at the pace a return is meant to be read at, which is not a pace that holds a crowd.',
        'Sixty-one people stay for the whole of it. Hark stays. Marchand is brought a chair.',
      ]);
      yield* say(game, 'Bevis Hark', ['That is a book about Highfell.']);
      yield* say(game, 'Captain Ilene Marr', ['Yes.']);
      yield* say(game, 'Bevis Hark', ['Then it is a book about Highfell.']);
      yield* say(game, null, [
        'The day is held in the spring. There is a new verse in it about a day-book, and the new verse scans better than any of the old ones.',
      ]);
      p.setFlag('ford_read');
    } else {
      yield* say(game, 'Captain Ilene Marr', [
        'Then it stands, and I go to it, and I stand at the front of it in a coat.',
        'I have carried that page about with me for eleven years and I am going to have to put it down somewhere, and I would rather not put it down on Marchand.',
      ]);
      yield* say(game, null, ['She shuts the case and turns the key, and then checks the key, which she has already turned.']);
    }
    yield* say(game, 'Field Armourer Kest', [
      'Take this out of the rack on your way. Half a sword, off the ford or off Highfell depending who you ask, and it has been in that rack since before my time.',
      'It has never needed the other half. That is not a saying about the sword. Somebody ground the end of it flat on purpose.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'brokenstandard', label: 'The Broken Standard' }, ctx.field);
    p.setFlag('ford_asked');
    p.completeQuest('ford');
  },

  /**
   * The Drowned Halls. Two sounders went down the same week and came up with
   * two different lower storeys. The party can go and look, and looking does
   * not help, and that is the point of going.
   */
  *drownedhalls_blue(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('blue_looked')) {
      yield* say(game, 'Sounder Krell', [
        'You went down. You came up. You have not said which and neither of us has asked you twice, and we have both wanted to.',
      ]);
      return;
    }
    yield* say(game, null, [
      'The surveyor plan is pinned in oiled cloth and drawn as two storeys with the stairs ruled across the gap.',
      'The lower plan has been inked over in blue and written across: STILL THERE. The blue is fresher than the plan by a great deal.',
    ]);
    yield* say(game, 'Sounder Krell', [
      'That is my hand and I go over it every spring. I went down in the year forty-nine, on the line, past the strongroom lintel.',
      'The lower storey is lit. Lamps, burning, under eleven feet of water, and I was down there long enough to count four of them and come up.',
    ]);
    yield* say(game, 'Sounder Ide', [
      'I went down the same week. Same line, same lintel, four days after him.',
      'It is black. It is the blackest water on this coast and there is nothing in it and there has never been anything in it.',
    ]);
    yield* say(game, 'Sounder Krell', ['She is not lying.']);
    yield* say(game, 'Sounder Ide', ['He is not lying either. That is the difficulty and we have been at it eleven years.']);
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The tide gauge stands at eleven feet. The highest mark ever cut into the brass is four, and it has been cut over three times, each time higher than the last.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The line is on the drum and the drum is greased and there are two people here who will work it.',
      ['Go down on the line', 'Stay on the boards'],
      { cancelable: true },
    );
    game.dialogue.close();

    if (choice !== 0) {
      yield* say(game, 'Sounder Ide', [
        'Sensible. Everybody who goes down comes up on one side of it and then they are on that side for good, and there are only the two sides.',
      ]);
      yield* say(game, 'Sounder Krell', ['Come back in the spring. The blue will be fresh and I will be at it with the pot.']);
      return;
    }

    yield* say(game, null, [
      'The line goes down past the strongroom lintel. Something is on the line before the lower storey is.',
    ]);
    const result = yield* game.startBattleScene(
      { enemies: ['deepcantor', 'keelworm', 'deepcantor'] },
      { terrain: 'marble', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    yield* cinematic(game, true);
    yield* say(game, null, [
      'The lower storey is peat-dark and the party is carrying the only light in it, which means the only thing anybody can be sure of is the last four feet.',
      'There is something further off, twice, at about the height a lamp would be on a bracket. Both times it is gone before anybody can get the light round to it.',
    ]);
    yield* say(game, 'Vesna', [
      'I could tell you what I think. I would be telling you what I think and it would go straight in the blue.',
    ]);
    yield* say(game, null, [
      'The party comes up on the line. Krell is at the drum and Ide is at the rail and neither of them asks.',
    ]);
    yield* say(game, 'Sounder Ide', ['You do not have to say.']);
    yield* say(game, null, [
      'Wedged under the strongroom lintel, where the water thins, there is something that has been keeping its own temperature down there.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'wellheart', label: 'a Well Heart' }, ctx.field);
    p.setFlag('blue_looked');
    p.completeQuest('lowerstorey');
    yield* cinematic(game, false);
  },

  /**
   * The Sunken Vault. The nave is under water and the hours are still being
   * said in the dry aisle by somebody who learned them at a door, by ear.
   */
  *sunkenvault_hours(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('hours_heard')) {
      yield* say(game, 'Vault-Keeper Merrit', [
        'Sixth hour is in about twenty minutes if you are staying. It is the short one and it is the one I am surest of.',
      ]);
      return;
    }
    yield* say(game, null, [
      'The aisles are dry and the nave is not, and both of them were meant to be dry.',
      'Somebody has chalked an arrow at the one place the water thins, and gone over it often enough that the chalk has built up a lip.',
    ]);
    yield* say(game, 'Vault-Keeper Merrit', [
      'Six a day, and the sixth at dusk, and I have not missed one since the water came up.',
      'I was nine when they still had the nave. I was not let in, so I sat outside the door on the step with my back to it, which is how you learn anything at nine.',
    ]);
    yield* say(game, 'Vesna', ['You never went in.']);
    yield* say(game, 'Vault-Keeper Merrit', [
      'I went in at eleven and the water was at the third step by then and they had stopped saying them properly.',
      'So what I have got is the door version. Every word of it off a step, through two inches of oak, at nine.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The fifth hour is said in the dry aisle with the water four feet away and the gauge ticking behind it.',
      'It takes about twenty minutes. She says it at a pace that has nothing to do with how long the words are.',
    ]);
    const wick = speaking(p, ['wick']);
    if (wick) {
      yield* say(game, 'Wick', [
        'Half of that is not the office. About a third of it is the office with the order changed, and there is a whole section in the middle that is somebody\'s list of names.',
      ]);
      yield* say(game, 'Wick', ['I am not going to say so. She is four feet from the water and she has not missed one.']);
    } else {
      yield* say(game, null, [
        'Nobody in the party has ever heard the office said any other way, so nobody in the party can tell.',
      ]);
    }
    yield* say(game, 'Vault-Keeper Merrit', [
      'It is wrong. You do not have to be polite about it; I have known since I was eleven.',
      'A man came through in the year forty and said the whole of the fourth hour properly, standing where you are, and I listened to it all the way to the end.',
    ]);
    yield* say(game, 'Vesna', ['You did not change it.']);
    yield* say(game, 'Vault-Keeper Merrit', [
      'No. His was the right one and mine is the one this building has had for forty years, and there is only one of us here every day at dusk.',
      'I have got his written down. It is in the box under the gauge and I have not opened the box.',
    ]);
    yield* say(game, 'Vault-Keeper Merrit', [
      'Take the robe off the hook. It is cut for somebody who has to be heard at the far end of a nave and there is no far end of the nave.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'chanterrobe', label: "a Chanter's Robe" }, ctx.field);
    p.setFlag('hours_heard');
    p.completeQuest('hours');
    yield* cinematic(game, false);
  },
};

export function vol5EventById(id) {
  return VOL5_EVENTS[id] || null;
}
