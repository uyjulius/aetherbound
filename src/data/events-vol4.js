import { wait, over } from '../engine/scheduler.js';
import { ESPERS } from './espers.js';

/**
 * Scripted events, volume four — work and trade.
 *
 * Same contract as `EVENTS`, `VOL2_EVENTS` and `VOL3_EVENTS`: every entry is a
 * generator receiving `(game, ctx)` and written as a coroutine, so a scene
 * reads top to bottom in source the way it plays on screen. Nothing in here is
 * on the critical path.
 *
 * Volume two was the cast, volume three was the places. This one is the money:
 * who pays whom, for what, and what happens to a town when that stops. It sits
 * almost entirely in the six towns nothing has used yet, because each of those
 * towns is already a diagram of one trade —
 *
 *   Caldwick   a kiln that has never been let out, and the fuel to keep it in
 *   Oxmere     a road with a weighing shed halfway down it
 *   Thistlebeck  one bridge, owned by one half of the town
 *   Greyharrow  a market that pays a fine because it is not allowed to pay rent
 *   Marrowgate  three hundred people living off what the ground gives back
 *   Lowfen     a town that is carried up a bank and down it again
 *
 * Two chains run four and five stages. Both are gated stage by stage on flags
 * rather than on a count, because both are arguments and an argument has an
 * order: you cannot settle the burners' hours before you know where the heat
 * is going, and you cannot accuse a sealer of weights before you have stood in
 * the shed and watched the beam.
 *
 * Neither chain is gated on the world state, and neither needs to be. The
 * ruined variants of Caldwick and Oxmere take the carter, the reeve, the
 * chalker and the roadwarden off the map themselves, so the chains belong to
 * the whole world without anything in here having to say so.
 *
 * Four scenes are gated on `party.worldState === 'ruin'`, and two of those are
 * the optional bosses: the Yardmaster at the old blooding gate in the
 * Bramblewold, and the Cold Forge in a bay off the Last Lantern road. Both are
 * businesses that never received notice to stop.
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
 * The active party rather than the roster: a line that belongs to a trade —
 * an engineer looking at a flue, an archivist looking at a title — is only
 * worth writing if the player can see it change when they change the party.
 */
function speaking(party, ids) {
  for (const id of ids) {
    const m = party.activeMembers.find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}

/**
 * Hand over magicite that may already be in the party's keeping.
 *
 * Every shard in the game is also sitting in a chest somewhere, so a scene
 * that ends by announcing a thing the player already owns needs a second
 * ending. This is volume three's arrangement and it is here for the same
 * reason, with the plain metal paid out instead.
 */
function* grantShard(game, id, label, field, spareId, spareLabel) {
  if (!game.party.espers.has(id)) {
    yield* game.grantChest({ kind: 'esper', id, label }, field);
    return;
  }
  yield* say(game, null, [
    `It is ${ESPERS[id].name}, and there is one of those in the party's keeping already.`,
    'Nobody says anything about that for a moment, and then somebody puts the other thing in the bag instead.',
  ]);
  yield* game.grantChest({ kind: 'item', id: spareId, label: spareLabel }, field);
}

export const VOL4_EVENTS = {
  // =========================================================================
  // Caldwick. Five stages: a shortage, a notice, the man who bought the wood,
  // where the heat actually goes, and what it costs to say so out loud.
  // =========================================================================

  /** Carter Nunn at the fuel gate. Fourteen days of wood on a sixty-day yard. */
  *caldwick_short_cord(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('lodge_settled')) {
      yield* say(game, 'Carter Nunn', [
        'Sixty days on the yard again by the end of the month. I came in on Tuesday and could not see across it, and I sat on the cart a while before I got down.',
      ]);
      return;
    }
    if (p.hasFlag('cord_short')) {
      yield* say(game, 'Carter Nunn', [
        'Eleven days now. I am not carting any slower. There is less at the other end to cart.',
      ]);
      return;
    }
    p.startQuest('lodge', 0);
    p.setFlag('cord_short');
    yield* say(game, 'Carter Nunn', [
      'Nineteen years I have brought wood in and taken dust out, and this yard has never once been under sixty days of fuel.',
      'It is under fourteen.',
    ]);
    yield* say(game, 'Vesna', ['Has the cutting stopped.']);
    yield* say(game, 'Carter Nunn', [
      'The cutting has not stopped. The wood is cut and stacked at Farrow\'s End and it is sitting there getting no drier than it already is.',
      'Somebody has bought the standing lot. Nine miles round, in one afternoon in March, before a stick of it came down.',
    ]);
    yield* say(game, 'Carter Nunn', [
      'Caldwick has bought that coppice cord by cord since my grandfather. At the gate, in coin, on a nod.',
      'There is a name on a contract now and I am told it is a Thistlebeck name, which in this town is the same as saying it is a name.',
    ]);
    yield* say(game, 'Carter Nunn', [
      'Ask Fettle what fourteen days means on the apron. He will put it to you better than I can, because I go home at night.',
    ]);
  },

  /** Burner Fettle. The lodge gives notice, and the notice is the length of the wood. */
  *caldwick_lodge_notice(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('lodge_settled')) {
      yield* say(game, 'Burner Fettle', [
        'Four on, four off, and the book says so, and I have read the book twice since Monday for no reason at all.',
      ]);
      return;
    }
    if (!p.hasFlag('cord_short')) {
      yield* say(game, 'Burner Fettle', [
        'Four on the apron, four off. There is nothing to tell you and I would rather not be told anything either.',
      ]);
      return;
    }
    if (p.hasFlag('lodge_notice')) {
      yield* say(game, 'Burner Fettle', [
        'The notice is up on the lodge door and the date on it does not move.',
        'Go and see the man who bought the wood. He is at the far end of a bridge at Thistlebeck and he is not hiding from anybody.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Burner Fettle', [
      'Fourteen days of fuel means we draw thin and charge thin. A thin charge burns hotter and faster, and the work on the apron goes up, not down.',
      'We have been doing six hours on since the spring. Four is the number. Four has been in the lodge book since there was a lodge book.',
    ]);
    yield* say(game, 'Vesna', ['What is in the sixth hour.']);
    yield* say(game, 'Burner Fettle', [
      'The sixth hour is where a man stops being able to tell hot from cold by looking at it. That is not a turn of phrase. That is the hour.',
      'Two of us have gone into the slaking well since March and both of them were in their sixth.',
    ]);
    yield* say(game, 'Burner Fettle', [
      'So the lodge has given notice. Fourteen days, which is the same as the wood, and nobody arranged that and everybody has noticed it.',
      'On the fifteenth we come off the apron and stay off, and then Caldwick finds out what it costs to let a kiln go. Eleven days, four hundred cord, forty men, and not one person alive who has done it.',
    ]);
    yield* say(game, 'Vesna', ['You would put it out.']);
    yield* say(game, 'Burner Fettle', [
      'I would not. I have said we will.',
      'Those are two different sentences and the whole town is standing in the gap between them, which is where the town has always stood, only now it can see the edges of it.',
    ]);
    p.setFlag('lodge_notice');
    p.advanceQuest('lodge', 1);
    yield* cinematic(game, false);
  },

  /** Broker Ivo Quint at Thistlebeck. He has the wood and it is not the problem. */
  *caldwick_cord_cornered(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('lodge_settled')) {
      yield* say(game, 'Broker Ivo Quint', [
        'March prices, in public, with the loss written down where the Old Side could read it upside down. I have never enjoyed anything more.',
      ]);
      return;
    }
    if (!p.hasFlag('lodge_notice')) {
      yield* say(game, 'Broker Ivo Quint', [
        'Standing timber, mostly, at the moment. It is a dull thing to hold and it does not go off.',
      ]);
      return;
    }
    if (p.hasFlag('cord_cornered')) {
      yield* say(game, 'Broker Ivo Quint', [
        'I am still holding it and it is still not the answer. Go and ask your reeve what goes in and what comes out.',
      ]);
      return;
    }
    yield* say(game, 'Broker Ivo Quint', [
      'Yes. Every standing cord within nine miles of Caldwick, bought in one afternoon, and I have not moved a stick of it since.',
      'Before you work round to it: I am not squeezing them. I would very much like to be squeezing them. Squeezing is quick, and this has taken four months.',
    ]);
    yield* say(game, 'Vesna', ['Then what is it for.']);
    yield* say(game, 'Broker Ivo Quint', [
      'Caldwick has never bought fuel at a price. It buys at a nod, at the gate, in coin, off men whose fathers sold to it.',
      'There is no figure anywhere in the world for what a cord to that kiln is worth. I mean that exactly. I have looked.',
    ]);
    yield* say(game, 'Broker Ivo Quint', [
      'So I hold the whole lot, and the first sale sets a figure, and every sale after it argues with the first, and in thirty years there is a market where there was a nod.',
      'That is the trade. It is slow and it is dull and it is the only one I have ever wanted to be in.',
    ]);
    yield* say(game, 'Vesna', ['They have eleven days.']);
    yield* say(game, 'Broker Ivo Quint', [
      'Eleven. I count as well.',
      'And here is the part I have been sitting with since August. They are burning more wood than they were in March, off the same draw, out of the same kiln, and that is not my doing and it is not the coppice.',
    ]);
    yield* say(game, 'Broker Ivo Quint', [
      'I have cornered the market in a thing that is not their problem, which has been the worst fortnight of my professional life.',
      'Go and ask the chalk-reeve what goes in at the top and what comes out at the bottom. If the answer is the one I think it is, I will sell at March prices and take the loss where both banks can watch me take it.',
    ]);
    p.setFlag('cord_cornered');
    p.advanceQuest('lodge', 2);
  },

  /**
   * Chalk-Reeve Ondrey's two columns, and the flue under the apron that the
   * gap goes down. The only fight in the chain, and it is housekeeping.
   */
  *caldwick_flue_arithmetic(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('flue_found')) {
      yield* say(game, 'Chalk-Reeve Ondrey', [
        'Forty charged, thirty-six drawn, and now I know the name of the hole. It has not improved the figures and it has improved me.',
      ]);
      return;
    }
    if (!p.hasFlag('cord_cornered')) {
      yield* say(game, 'Chalk-Reeve Ondrey', [
        'In-weight and out-weight, and a gap between them I am not going to discuss with strangers in a yard.',
      ]);
      return;
    }

    if (!p.hasFlag('flue_open')) {
      yield* cinematic(game, true);
      yield* say(game, 'Chalk-Reeve Ondrey', [
        'I have kept both columns since I was twenty-two. I have never once had to explain the gap between them, because until the spring there was not one.',
        'Forty bushel charged in at the top. Thirty-six drawn from the bottom. Every day since March, and the four does not go anywhere that I can put on a scale.',
      ]);
      yield* say(game, 'Vesna', ['Then it is not the lime. It is the heat.']);
      yield* say(game, 'Chalk-Reeve Ondrey', [
        'It is the heat, and the heat goes down.',
        'There is a flue under the apron that was cut in my great-grandfather\'s time. It is on no plan I hold. I know it is there because in February the ring road is dry over it and wet either side.',
      ]);
      const engineer = speaking(p, ['aurelian', 'rusk', 'bastian']);
      if (engineer) {
        const lines = {
          aurelian: [
            'A flue that draws is a flue that is going somewhere. They do not simply lose pressure into the ground; the ground is not interested.',
            'Somebody put the far end of that where they wanted it. Four bushel a day is not a leak, it is a delivery.',
          ],
          rusk: [
            'A CHANNEL WITH A DRAUGHT IN IT HAS TWO ENDS. THIS IS NOT AN OPINION.',
            'I WILL GO FIRST. I DO NOT MIND THE HEAT AND I HAVE NEVER MINDED THE DARK, AND ONE OF THOSE IS SOMETHING I HAVE ONLY RECENTLY FOUND OUT.',
          ],
          bastian: [
            'Four feet by three. I have been down worse and I have been down narrower, and the narrower ones were the ones that were meant to be walked in.',
            'Somebody meant this to be walked in.',
          ],
        };
        yield* say(game, engineer.name, lines[engineer.id]);
      }
      yield* say(game, 'Chalk-Reeve Ondrey', [
        'I am not going down it. I weigh things. That is the entire trade and I have been careful for thirty years not to let it become any other trade.',
      ]);
      p.setFlag('flue_open');
      p.advanceQuest('lodge', 3);
      yield* cinematic(game, false);
    }

    yield* say(game, null, [
      'The flue runs from under the apron out towards the ring wall, four feet by three, brick-lined, and swept by nothing but its own draught for two hundred years.',
      'It is not empty. Things have come in at the wall end and found somewhere warm and stayed.',
    ]);

    const result = yield* game.startBattleScene(
      { enemies: ['kilnwidow', 'slagcolt', 'slagcolt'] },
      { terrain: 'cobble', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    yield* cinematic(game, true);
    yield* say(game, null, [
      'Where the flue turns for the wall it has been opened out. Not broken through — cut, squared and lined, by somebody who was good at it and had time.',
      'It goes on into the back of a hearth, and the damper at that end is standing open. It has been open long enough for the pin to wear a groove in the iron.',
    ]);
    yield* say(game, 'Vesna', ['Whose hearth.']);
    yield* say(game, null, ['There is a mark on the brick where it was cut, and it is the mark on the sign over the forge door.']);
    yield* say(game, 'Chalk-Reeve Ondrey', [
      'Four bushel a day, down a hole, into a smith\'s fire. And Crane pays the burners in nails.',
      'His grandfather cut that. His grandfather told him what it was and how to work it, and then everybody who might have objected died of being old.',
    ]);
    p.setFlag('flue_found');
    p.advanceQuest('lodge', 4);
    yield* cinematic(game, false);
  },

  /**
   * The settlement, on the apron, with the book open on the wall.
   *
   * Both answers cost. Bricking the flue ends a forge that has run on borrowed
   * heat for two hundred years; buying the year's cord leaves the hole open
   * and comes out of the party's purse. There is no third answer and the town
   * has not got one either.
   */
  *caldwick_fourth_hour(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('lodge_settled')) {
      yield* say(game, 'Halber Crane', p.hasFlag('flue_bricked')
        ? [
          'Cold in here. Two hundred years and I had never once put a hand on that wall and found it cold.',
          'I am shoeing at the north end three days a week for Dunnock\'s brother, who is worse at it than Dunnock and pays better.',
        ]
        : [
          'The damper stays open and it is written down that it stays open, which is somehow worse than it being a secret.',
          'Fettle looks at the floor when he comes in for nails. He did not used to look at anything.',
        ]);
      return;
    }
    if (!p.hasFlag('flue_found')) {
      yield* say(game, 'Halber Crane', [
        'I have never lit my own forge and I have never made a secret of it. Take heat where it is, that is the whole of my grandfather\'s advice and most of mine.',
      ]);
      return;
    }

    yield* cinematic(game, true);
    if (p.worldState === 'ruin') {
      yield* say(game, null, [
        'The apron is cold and has been for some time. They hold the settlement on it anyway, because the book runs to the end of the month and the month is not over.',
      ]);
    }
    yield* say(game, null, [
      'Ondrey has the book open on the ring wall with a stone on the corner of it. Fettle is on the other side with his cap in his hand, which he has not done once in any of this.',
    ]);
    yield* say(game, 'Halber Crane', [
      'I have known since I was eleven. He sat me on that wall and showed me the damper and told me what it took off the kiln, and then he said nobody misses four bushel while there are sixty days on the yard.',
      'There have been sixty days on the yard every day of my life until March.',
    ]);
    yield* say(game, 'Vesna', ['And since March.']);
    yield* say(game, 'Halber Crane', [
      'Since March it has been four bushel that Fettle stands two extra hours to make up.',
      'I have had a fortnight to find a way of putting that which is not the way I have just put it, and I have not found one, and I have had a great deal of time on the anvil to look.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The mortar is mixed and standing by the apron door. Nobody will say who mixed it.',
      ['Brick up the flue', 'Buy the year\'s cord at the broker\'s price'],
      { cancelable: false },
    );
    game.dialogue.close();

    if (choice === 1) {
      if (!p.spendGold(5200)) {
        yield* say(game, 'Chalk-Reeve Ondrey', [
          'You are short. Quint will hold his price for a month and not an hour past it, and I have never known him to be talked out of an hour.',
        ]);
        return;
      }
      yield* cinematic(game, true);
      yield* say(game, null, [
        'Quint sells at March prices on the bridge, out of doors, with the figure written up on a board so that both banks can look at it on their way past.',
        'The difference goes across the trestle in the party\'s coin and he counts it twice and enters it as a loss, which is the part he had been looking forward to.',
      ]);
      yield* say(game, 'Broker Ivo Quint', [
        'There is a price now. It is a bad price and it is written down, and in eleven years somebody will argue with it, and that is the whole of the trade I am in.',
      ]);
      yield* say(game, 'Burner Fettle', [
        'Four on the apron from Monday.',
        'There is a hole under my feet that eats four bushel a day and I have agreed not to mind about it. I have agreed in writing, which is new for me.',
      ]);
      yield* say(game, 'Chalk-Reeve Ondrey', [
        'I will go on entering it. Forty charged, thirty-six drawn, and a note in the margin naming everybody who agreed to the four.',
        'In eighty years a man will find that page and think we were fools. He will be reading my handwriting while he does it, so he can think what he likes.',
      ]);
      yield* say(game, 'Burner Fettle', [
        'Off the lodge door. It has hung on that nail since my father\'s time and no man on that apron has ever slept through a shift.',
        'I am not saying the two facts are joined. I am saying I would not take it down for anybody who had not stood the fortnight we have just stood.',
      ]);
      yield* game.grantChest({ kind: 'key', id: 'wakefulcharm', label: 'a Wakeful Charm' }, ctx.field);
      p.setFlag('cord_bought');
    } else {
      yield* cinematic(game, true);
      yield* say(game, null, [
        'It takes an afternoon. Crane carries the brick himself and will not be helped with it, and Fettle mixes for him, and neither of them says anything for the length of the job.',
        'The last course goes in at the forge end, so that the man laying it is looking at his own hearth while he closes it.',
      ]);
      yield* say(game, 'Halber Crane', [
        'Two hundred and eleven years the kiln, and two hundred of them my family on the back of it.',
        'It has not been a forge. It has been a flue with an anvil at the end of it, and I have known the difference since I was eleven and have gone on calling it a forge.',
      ]);
      yield* say(game, 'Halber Crane', [
        'Take these. Struck this afternoon off the last heat, while the mortar went off behind me.',
        'There is one billet of that metal left in the district and it has been in my floor since my father put it there. It has gone into this and there will not be another, and I would rather it went up the road than into a case.',
      ]);
      yield* game.grantChest({ kind: 'key', id: 'enginecut', label: 'the Enginecut' }, ctx.field);
      yield* say(game, 'Burner Fettle', [
        'Four on the apron from Monday.',
        'I am not glad. I would like that entered, and I would like it entered in the same hand as the rest of it.',
      ]);
      yield* say(game, 'Chalk-Reeve Ondrey', ['It is entered.']);
      p.setFlag('flue_bricked');
    }

    p.setFlag('lodge_settled');
    p.completeQuest('lodge');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Oxmere. Four stages: two head short, a mark in somebody else's hand, a
  // beam that reads light, and the man who stamped it.
  // =========================================================================

  /** Roadwarden Cuffe at the count post. Two a morning, for five weeks. */
  *oxmere_two_head(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('sealer_settled')) {
      yield* say(game, 'Roadwarden Cuffe', [
        'Eleven forty in and eleven forty out. I have had a fortnight of that and I still go back and look at the slate twice.',
      ]);
      return;
    }
    if (p.hasFlag('count_short')) {
      yield* say(game, 'Roadwarden Cuffe', [
        'Two more this morning. I have stopped circling the number, which was the only part of this I was any good at.',
      ]);
      return;
    }
    p.startQuest('count', 0);
    p.setFlag('count_short');
    yield* say(game, 'Roadwarden Cuffe', [
      'Head in, head out, head lost. Two lost, every morning, five weeks running.',
      'A strayed beast comes back at supper. It is hungry and it is stupid and it comes back. These do not come back.',
    ]);
    yield* say(game, 'Vesna', ['Then somebody walks them out.']);
    yield* say(game, 'Roadwarden Cuffe', [
      'Through which gate.',
      'Eleven hundred and forty walk into this town and eleven hundred and thirty-eight walk out of it, and there is one road with a wall down both sides of it, and I am standing at the top of it counting.',
    ]);
    yield* say(game, 'Roadwarden Cuffe', [
      'Ivy chalks them at the lower standing, coming off the weigh.',
      'Start with her. She has chalked two hundred thousand animals and she will tell you she has never made a mark she did not mean, and she will be telling you the truth, and it will not help either of us.',
    ]);
  },

  /** Chalker Ivy. Somebody has been practising her hand. */
  *oxmere_chalk_bar(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('sealer_settled')) {
      yield* say(game, 'Chalker Ivy', [
        'Blue, red, bar across, and every one of them mine again. I have gone back to not thinking about it, which took a fortnight of thinking about it.',
      ]);
      return;
    }
    if (!p.hasFlag('count_short')) {
      yield* say(game, 'Chalker Ivy', [
        'Shoulder, not flank. A flank mark rubs off on the next animal and then you have two of a thing you have one of.',
      ]);
      return;
    }
    if (p.hasFlag('chalk_read')) {
      yield* say(game, 'Chalker Ivy', [
        'Eleven paces between my chalk and the gate. Go and stand in the shed at first weigh and watch the beam, not the beast.',
      ]);
      return;
    }
    yield* say(game, 'Chalker Ivy', [
      'Blue on the shoulder for Ferran, red for the fairs, a bar across for anything the drover would rather I did not ask about.',
      'Weight first, then the mark, then out through the lower gate. That is the order and it has been the order for four hundred years, because somebody sensible set it.',
    ]);
    yield* say(game, 'Vesna', ['Do you ever mark one twice.']);
    yield* say(game, 'Chalker Ivy', [
      'No.',
      'And there have been beasts going out under a bar that came off my hand in blue. So the answer is no, and it is also yes, and it is not me.',
    ]);
    yield* say(game, 'Chalker Ivy', [
      'A bar means nobody asks. Not the warden, not the buyer, not the fair man at the far end. That mark is worth more than the animal it is on and everybody in the trade knows it.',
      'It is chalked in my hand. That is the part I have been carrying about with me. Somebody has been practising my hand, and they have got it, and they have got the pressure as well, which is the hard half.',
    ]);
    yield* say(game, 'Vesna', ['How long is the walk from your chalk to the gate.']);
    yield* say(game, 'Chalker Ivy', [
      'Eleven paces, and the shed is in the middle of them.',
      'Go and stand in the shed at first weigh, and watch the beam and not the beast. I have watched the beast for thirty years and I am very good at it.',
    ]);
    p.setFlag('chalk_read');
    p.advanceQuest('count', 1);
  },

  /** The weighing shed at first weigh. The beam is level, low. */
  *oxmere_weighing_beam(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('sealer_settled')) {
      yield* say(game, null, [
        'The beam hangs true and the pointer sits where the mark is. Somebody has scratched a second mark beside it, harder, in case anybody forgets which one is which.',
      ]);
      return;
    }
    if (!p.hasFlag('chalk_read')) {
      yield* say(game, null, [
        'A shed with a platform, a beam, a rack of weights and two men, and a queue of cattle outside it that does not get shorter.',
      ]);
      return;
    }
    if (p.hasFlag('beam_light')) {
      yield* say(game, null, [
        'The pointer comes to rest the width of itself below the mark, all morning, and both men read it as level, because it has been level there since the spring.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The shed takes one beast at a time. The animal goes on the platform, the weights go on the arm, and there is a man at the arm and a man at the slate.',
      'The beam comes level. It comes level low — by the width of the pointer, every time, all morning — and both men call it level, because it has come level there since the spring and they are reading the shed, not the beam.',
    ]);
    const witness = speaking(p, ['kestrel', 'maret', 'aurelian', 'corvin']);
    if (witness) {
      const lines = {
        kestrel: [
          'A short arm reads light. Eleven hundred beasts reading light by the same small amount is two beasts that were never on the platform.',
          'And two beasts that were never there are two beasts lost, and lost is a column with nothing owed against it. That is not theft. That is bookkeeping, and it is worse, because it files.',
        ],
        maret: [
          'I have signed off on beams. You look at the seal and you look at the pointer and you sign, and I have never once in my service put a rule on an arm.',
          'Nobody does. That is the whole of the design.',
        ],
        aurelian: [
          'The arm is short. Not bent, not sprung — short, by about the thickness of two coins, taken off the end where the hook sits.',
          'Whoever did that understood exactly how much they could take before somebody noticed it in the pointer, and then took slightly less.',
        ],
        corvin: [
          'Everybody watches the weights. Nobody watches the arm the weights are on. I would like to say I worked that out this morning.',
        ],
      };
      yield* say(game, witness.name, lines[witness.id]);
    } else {
      yield* say(game, 'Vesna', [
        'A short arm reads light. Eleven hundred beasts light by the same small amount comes to two beasts that were never on the platform.',
        'Two that were never there are two lost, and lost is a column with nothing owed against it.',
      ]);
    }
    yield* say(game, null, [
      'On the shoulder of the beam there is a seal in soft lead with a district mark and a number, stamped this year. The stamp is right. It is the crispest thing in the shed.',
      'Below it, where the arm was shortened and the hook reset, the file marks are new and have been oiled.',
    ]);
    yield* say(game, 'Vesna', ['Whose number is on the seal.']);
    yield* say(game, null, [
      'It belongs to the Sealer of Weights for the district, who comes twice a year, in March and in September, and stamps every beam between here and the coast.',
      'It is September, and he is in the town, and he has been in the inn since Tuesday paying for his own drink.',
    ]);
    p.setFlag('beam_light');
    p.advanceQuest('count', 2);
    yield* cinematic(game, false);
  },

  /**
   * Sealer Dacomb, who does not deny any of it and is precise about which
   * part is his. Report the seal and two seasons of settled trade comes
   * undone; take the beam back quietly and he does it again in four more
   * towns. Both answers come out of the purse and only one of them is cheap.
   */
  *oxmere_sealer_of_weights(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('sealer_settled')) {
      yield* say(game, 'Roadwarden Cuffe', p.hasFlag('sealer_reported')
        ? [
          'Nothing has been sold by weight in this town since Thursday. We are selling by the look of the animal, like our great-grandfathers, and arguing like them as well.',
          'The new beam comes in March. I have written the date on the inside of the shed door where the men at the arm will see it every day until then.',
        ]
        : [
          'True beam by Tuesday and the count came right on the Wednesday. Ten head back off the fair buyer at his price, which he named twice to be sure I had heard it.',
          'He went south on the Thursday morning with the box under his arm. I opened the gate for him. That is the job.',
        ]);
      return;
    }
    if (!p.hasFlag('beam_light')) {
      yield* say(game, 'Sealer Dacomb', [
        'Four hundred beams a year between here and the coast, and every one of them wants a look, a stamp and a line in the book.',
        'It is not interesting. I have made my peace with that and I would rather you did not try to make it interesting on my behalf.',
      ]);
      return;
    }

    yield* cinematic(game, true);
    yield* say(game, 'Sealer Dacomb', [
      'You have been in the shed. Two mornings, standing where the light is bad, looking at the wrong end of the beam, which is the right end.',
      'I am not going to make you say it. That would waste an hour and it would be an hour of you being pleased with yourself.',
    ]);
    yield* say(game, 'Sealer Dacomb', [
      'I stamp four hundred beams a year and I am paid eleven gil a beam by an office that has not moved the figure in thirty years.',
      'I shorten one arm in nine. Always the same amount, always at the hook where the file will not be looked for, and always in a town that keeps a lost column, because a town with a lost column has already agreed not to look.',
    ]);
    yield* say(game, 'Vesna', ['And the two head a morning.']);
    yield* say(game, 'Sealer Dacomb', [
      'That is not mine. That is a second man with a piece of chalk and a talent, and he takes what my arithmetic leaves on the floor.',
      'I take the difference. I do not touch the animals. I would like that kept straight, and I am aware of how it sounds, and I would still like it kept straight.',
    ]);
    yield* say(game, 'Sealer Dacomb', [
      'You have three things you can do and I will save you one of them. I am not going to be chased. I am fifty-four and I have a horse.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The lead seal is soft enough to lift with a thumbnail, and the number under it is legible from where you are standing.',
      ['Report the seal', 'Take the beam back and let him finish his round'],
      { speaker: 'Sealer Dacomb', cancelable: false },
    );
    game.dialogue.close();

    if (choice === 0) {
      if (!p.spendGold(3500)) {
        yield* say(game, 'Roadwarden Cuffe', [
          'Then not this week. The four small holders go under in the first fortnight of an ungraded autumn and I am not writing to them about it with an empty parish box.',
          'Come back when you can stand it. He is not going anywhere until Thursday and he has told me so himself, which I did not enjoy.',
        ]);
        return;
      }
      yield* cinematic(game, true);
      yield* say(game, null, [
        'The number goes south in a letter and the answer comes back inside the week, which nothing from that office has ever done before.',
        'The seal is void. Every beam Dacomb has stamped in two years is void with it — Oxmere, the coast fairs, the four weighhouses on the Silt Road — and nothing can be sold by weight on any of them until it has been stamped again, by a sealer, of whom there is one.',
      ]);
      yield* say(game, 'Roadwarden Cuffe', [
        'Two seasons of settled trade, opened up. Men who paid honestly on a light beam can go back and ask for the difference, and men who were paid on it can be asked for it, and the two lots are mostly the same men.',
        'The drove goes south ungraded. They will take what the fair offers and the fair knows exactly what it is looking at.',
      ]);
      yield* say(game, null, [
        `The party puts 3500 gil into the parish box against the four smallest holders' autumn, and the reeve of the standings writes each of the four names on a separate line so that nobody can say afterwards that it was a lump.`,
      ]);
      yield* say(game, 'Roadwarden Cuffe', [
        'Take this. It is the warden\'s signet for this stretch of road and it is a very old ring for a job that is mostly opening a gate.',
        'I have not needed it to be a ring since I was appointed. I have needed it to be a ring twice this week.',
      ]);
      yield* game.grantChest({ kind: 'key', id: 'wardensignet', label: "a Warden's Signet" }, ctx.field);
      p.setFlag('sealer_reported');
    } else {
      if (!p.spendGold(2000)) {
        yield* say(game, 'Roadwarden Cuffe', [
          'The fair buyer has the ten head and he will not part with them at cost. He never has and he is not going to start for people who are counting their coin on his trestle.',
          'Come back heavier. The animals are in his lower pen and he is feeding them, which he is also charging for.',
        ]);
        return;
      }
      yield* cinematic(game, true);
      yield* say(game, null, [
        'The arm goes to Dunnock, who lengthens it in an afternoon and will not take anything for the work, and the beam hangs true on the Tuesday.',
        'The ten head come back off the fair buyer at the price he names, which he names twice, in case anybody had hoped he would not.',
      ]);
      yield* say(game, 'Sealer Dacomb', [
        'Four more towns before the frost and then I turn for the coast, and every one of them keeps a lost column, and I have the list in my head and have had for eleven years.',
        'You have bought one town its autumn. I would not have expected better of anybody standing where you were standing, and I have watched a good many people stand there.',
      ]);
      yield* say(game, 'Sealer Dacomb', [
        'Take the spare set. They are the light ones, they are cut true and stamped false, and they are worth a great deal more as an argument than as weights.',
        'I have another set. Obviously I have another set.',
      ]);
      yield* game.grantChest({ kind: 'key', id: 'magpiechain', label: 'a Magpie Chain' }, ctx.field);
      p.setFlag('beam_kept');
    }

    p.setFlag('sealer_settled');
    p.completeQuest('count');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // Standing arrangements. Nothing in this section starts a battle.
  // =========================================================================

  /**
   * Thistlebeck. Both halves of the town have been performing half of a
   * contract neither of them has read, for four hundred years, in a temper.
   */
  *thistlebeck_covenant(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('covenant_read')) {
      yield* say(game, 'Bridgeman Halloway', [
        'Two of us on it with brooms now, and we start at opposite ends, and we meet in the middle and neither of us has yet worked out what to say there.',
        'Crossings are up. Eleven hundred and sixty. Both sides tell me the number is wrong.',
      ]);
      return;
    }
    yield* say(game, 'Bridgeman Halloway', [
      'The Old Side maintains the bridge. It says so on the board and it has said so on the board since there has been a board.',
      'It has not been swept since the flood. I sweep it. I am not the Old Side, I am the bridgeman, and the difference has kept me in work and cost me every friend I had on the west bank.',
    ]);
    yield* say(game, 'Vesna', ['Who says the Old Side maintains it.']);
    yield* say(game, 'Bridgeman Halloway', [
      'The board says. And behind the board there is supposed to be a paper, and the paper is in the chest under the ringing floor with the rest of the parish.',
      'Nobody has had that open in my time. The key is Old Side and the lock is Farther Side, which is the shortest true sentence anybody has ever said about this town.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Bell-Keeper Wray', [
      'I will open it if they both stand here while I do it. Not to be difficult. Because whichever of them is not standing here will say the other one took something out.',
    ]);
    yield* say(game, null, [
      'It takes most of the morning to get an alderman and an alderwoman onto the same forty square feet of floor, and the ringing chamber is not forty square feet.',
      'The chest holds a parish roll, two bell-ropes wrapped in oilcloth, and one sheet.',
    ]);
    yield* say(game, null, [
      'It is in Ferran law-hand, dated four hundred and eleven years ago, and it is short, because it was written by people who were going to have to go on living beside each other.',
      'The Old Side keeps the span. The Farther Side keeps the west bank meadow in hay, and cuts it, and carts it over, for ever, in consideration of the keeping.',
    ]);
    yield* say(game, 'Alderwoman Pye', [
      'We cut that meadow.',
      'Every August of my life. Cut it, dried it, carted it across and stacked it under their wall, and I have never once asked why we do it, because we have always done it.',
    ]);
    yield* say(game, 'Alderman Frisk', ['And we have not swept since the flood.']);
    yield* say(game, 'Alderwoman Pye', ['No.']);
    yield* say(game, 'Alderman Frisk', ['Well.']);
    yield* say(game, null, [
      'That is the whole of the argument. It takes about four seconds, and neither of them is able to look at the other one during any of it.',
    ]);
    yield* say(game, 'Alderman Frisk', ['We will sweep.']);
    yield* say(game, 'Alderwoman Pye', ['We will go on cutting.']);
    yield* say(game, 'Bridgeman Halloway', [
      'I would like to say this changes something. It does not.',
      'It means that from Monday there are two of us on it with brooms, and we will have to work out who starts at which end, and that is going to take longer than the four hundred years did.',
    ]);
    yield* say(game, 'Bell-Keeper Wray', [
      'The rest of the chest is yours if you want it. There is a blade in there the parish took in lieu of a subscription in a year when nobody had coin, and a purse of the second-bridge money.',
      'The purse is short by a little. Somebody borrowed and put it back badly, a long time ago, and I would rather that stayed where it is.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'bellringer', label: 'a Bellringer' }, ctx.field);
    p.addGold(2600);
    yield* say(game, null, ['The subscription purse holds 2600 gil, in coin from four hundred years of Augusts.']);
    p.setFlag('covenant_read');
    p.completeQuest('covenant');
    yield* cinematic(game, false);
  },

  /**
   * Greyharrow. A cooper who cannot be admitted to his own trade because a
   * fort has no place of trade in it, in a town where nine hundred people
   * trade on a drill square and pay a fine for doing it.
   */
  *greyharrow_indenture(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('indenture_signed')) {
      yield* say(game, 'Cooper Wend', [
        'Nothing back yet. Ondwin has begun a second letter in case, and he is enjoying the second one more than he enjoyed the first, which I did not think possible.',
        'I have made eleven barrels since you were here. They are the same barrels.',
      ]);
      return;
    }
    yield* say(game, 'Cooper Wend', [
      'Nine years in that lane. Eleven trades working in it and not one of us is on a plan of anything.',
      'Solmere will not have me. An indenture is served in a place of trade, and there is no place of trade in a fort, and they are right about that, and they read the whole of it before they said so, which I will give them.',
    ]);
    yield* say(game, 'Vesna', ['You have made barrels for nine years.']);
    yield* say(game, 'Cooper Wend', [
      'I have made barrels for nine years for one customer who is not allowed to buy them and buys them anyway.',
      'That is not a trade. That is a hobby with a quartermaster in it. I cannot sign my own work, I cannot sell past the gate, and I cannot take a boy on, and there is a boy in that lane who has been standing at my shoulder for two years without being asked to.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Bevis Hark', [
      'Every stall on this square pays the garrison a half-gil the day. Not rent. They are not allowed to let rent on a drill square.',
      'It is a fine. We pay it in advance, cheerfully, for ever, and the clerk writes it up as a fine each time because he is not allowed to write it up as anything else.',
    ]);
    yield* say(game, 'Clerk Ondwin', [
      'A fine is levied for an offence. The offence is trading on the parade ground.',
      'I have issued nine years of them against Wend at a half-gil, in advance, and I have the counterfoils, because I have never in my life thrown a counterfoil away.',
    ]);
    yield* say(game, 'Clerk Ondwin', [
      'Three thousand two hundred and eleven times the Imperium has fined that man for trading in a place where the Imperium says there is no trade.',
      'Either the fines are wrong, in which case there is a refund I would very much like to see somebody try to authorise, or the place is a place of trade. I have wanted to write that sentence down since the day I arrived.',
    ]);
    yield* say(game, 'Captain Ilene Marr', [
      'Write it. I will sign it.',
      'When Solmere writes back asking what a garrison is doing certifying a cooper, I will put their letter in the book with the others, and the book is the only regimental history this place is going to make.',
    ]);
    yield* say(game, null, [
      'The form goes south in the quartermaster\'s bag, which is the only bag that goes anywhere from here.',
      'Wend goes back to the lane while it is still being discussed and does not stop working at any point during any of the discussing.',
    ]);
    yield* say(game, 'Cooper Wend', [
      'Take these. They are the pair I band in and I have another pair, and if the answer comes back no I am going to want them out of the house.',
      'The eleven trades put up for the carriage. It is in coppers. It took me most of an hour to count into the bag and I counted it twice because the first count was wrong in their favour.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'bandedgrips', label: 'a pair of Banded Grips' }, ctx.field);
    p.addGold(1800);
    yield* say(game, null, ['The lane\'s purse holds 1800 gil, almost all of it in coppers.']);
    p.setFlag('indenture_signed');
    p.completeQuest('indenture');
    yield* cinematic(game, false);
  },

  /**
   * The Greyharrow guardhouse drawer. Four garrisons have written misc against
   * it, and the fort's whole administrative genius is that everything must be
   * a number, which is exactly why nobody can do anything with this.
   */
  *greyharrow_misc_drawer(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('misc_struck')) {
      yield* say(game, 'Clerk Ondwin', [
        'The drawer is empty and the line is still on the inventory, because striking a line requires a form.',
        'It now reads misc, quantity nil. I have never been happier with a document.',
      ]);
      return;
    }
    yield* say(game, 'Quartermaster Bly', [
      'Everything in this fort is a number. I am supplied for four hundred men, I have sixty-one, and I sell the difference on a form I invented, and the form has a number on it.',
      'That drawer has one thing in it and the thing has never had a number. Four garrisons have written misc against it. I have written misc against it, twice, in my own hand, and I remember doing it both times.',
    ]);
    yield* say(game, 'Serjeant Kadd', [
      'It is cold. It has been cold in a drawer in a heated guardroom for six years and nobody has put that on a sheet either, because there is no sheet for a thing being cold.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, 'Clerk Ondwin', [
      'I cannot issue it, because issuing is against a stock number. I cannot condemn it, because condemning is against a stock number.',
      'I cannot lose it. Losing is also a form and the form asks what was lost.',
    ]);
    yield* say(game, 'Vesna', ['You could give it away.']);
    yield* say(game, null, ['Ondwin looks at the drawer for a while, and then at the wall behind the drawer.']);
    yield* say(game, 'Clerk Ondwin', ['There is no form for that at all.']);
    yield* say(game, 'Serjeant Kadd', ['Then there is nothing to fill in.']);
    yield* say(game, 'Quartermaster Bly', ['Take it before he thinks of one. He will think of one.']);
    yield* grantShard(game, 'thequietone', 'a shard of magicite', ctx.field, 'resonantcharm', 'a Resonant Charm');
    yield* say(game, 'Vesna', [
      'There is a name in it.',
      'It has not said anything since the first garrison and it is not going to start now, and I think that is a decision it made rather than a thing that happened to it.',
    ]);
    p.setFlag('misc_struck');
    p.completeQuest('inventory');
    yield* cinematic(game, false);
  },

  /**
   * Lowfen. Eight hundred bushel of Ferran lime, coming up the fen under
   * Lowfen's first haulage contract in four years, bound for the Engine City
   * and priced under anything Caldwick can burn.
   *
   * Stop it and the fen returns an advance it has already spent. Let it land
   * and Caldwick loses the trade the kiln was built round. Both answers come
   * out of the purse, and neither of them is the cheap one for somebody.
   */
  *lowfen_lime_barge(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('barge_decided')) {
      yield* say(game, 'Punt-Man Quare', p.hasFlag('barge_stopped')
        ? [
          'She sat on the flats nine days and it rained on seven of them, and burnt lime does not survive a wet week in an open boat.',
          'Nobody has said anything to Abbot about the strike. That is not the same as nobody having worked it out.',
        ]
        : [
          'Poled her up on the Tuesday and she was unloading at the Engine City wharf by the Friday, and Pell has been paid, and Pell has not spent it.',
          'There is a second cargo asked for in the spring. First time this fen has been asked for anything twice.',
        ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Carrier Pell', [
      'Eight hundred bushel of burnt lime, Ferran, off the workings, coming up the fen on Tuesday for the Engine City.',
      'It is the first contract this fen has been given in four years. Half of it was paid in advance in June and every gil of the half has been spent, most of it on the barge and the rest of it on people who were owed.',
    ]);
    yield* say(game, 'Vesna', ['Ferran burns with coal.']);
    yield* say(game, 'Carrier Pell', [
      'Ferran burns with coal off its own workings and does not cart wood nine miles to do it.',
      'It lands at half what Caldwick asks. I know what that means. I have carted for Caldwick and I have drunk with Nunn and I know exactly what it means, and I have a contract.',
    ]);
    if (p.hasFlag('lodge_settled')) {
      yield* say(game, 'Carrier Pell', [
        'They have just settled their hours, I hear. Good. It will be a well-run kiln with nothing to sell, which is a thing I have seen a fen village be.',
      ]);
    }
    yield* say(game, 'Flood-Reeve Abbot', [
      'There is one way it does not arrive and everybody in this town has already thought of it and nobody has said it, so I will.',
      'I call the flood strike two days early. Every punt goes up the terrace, there is nobody on the water, and a loaded barge with no local hands on the marks sits on the flats until somebody comes back for her. Nine days, at this time of year.',
    ]);
    yield* say(game, 'Flood-Reeve Abbot', [
      'It has been called wrong twice in a hundred years, by the same man, once. He went up the terrace and stayed on his own stone and nobody spoke to him for eleven years.',
      'If I call it on a dry week in September, I am him. I am not asking you to decide that for me. I am telling you what the price of it is, because I would rather somebody outside the parish had heard it said.',
    ]);
    yield* cinematic(game, false);

    const choice = yield* game.dialogue.ask(
      'The barge lies at the fen mouth tonight and comes up on the first tide.',
      ['See that she misses the tide', 'Let her land'],
      { cancelable: false },
    );
    game.dialogue.close();

    if (choice === 0) {
      if (!p.spendGold(3000)) {
        yield* say(game, 'Flood-Reeve Abbot', [
          'Then no. The advance has to go back on the day the contract fails and it has to go back whole, and this town has not got it, and I will not call a strike that ends with Pell in front of a Solmere clerk.',
          'Come back before Tuesday if that changes. After Tuesday it is a different conversation and a shorter one.',
        ]);
        return;
      }
      yield* cinematic(game, true);
      yield* say(game, null, [
        'Abbot calls the strike on the Sunday night, standing on the spine with a lamp, and Lowfen is off the water and up the bank in a day and a half.',
        'It is the fastest strike anybody in the town can remember, and nobody says so at the time, and several people say so afterwards and then stop.',
      ]);
      yield* say(game, null, [
        'The barge grounds on the flats east of the marks on the Tuesday morning. It rains on the Wednesday and on five days out of the eight after it.',
        'Burnt lime in the rain gets hot, and then it steams, and then it is a white mess in the bottom of a boat, and there is nothing at all to be done about any of it.',
      ]);
      yield* say(game, null, [
        `The advance goes back to the factor whole and on the day, and 3000 gil of it is the party's.`,
      ]);
      yield* say(game, 'Carrier Pell', [
        'The contract fails on weather. That is the clause and it is a real clause and I have read it eleven times since Sunday.',
        'I have not asked the reeve anything. I am not going to ask the reeve anything, and he knows I am not, and that is the arrangement we have arrived at without either of us opening his mouth.',
      ]);
      yield* say(game, 'Punt-Man Quare', [
        'Take the heart off the punt pole. It has been lashed under the grip since my father, and it keeps the water off a man who is going to be in the water regardless.',
      ]);
      yield* game.grantChest({ kind: 'item', id: 'tideheart', label: 'a Tide Heart' }, ctx.field);
      p.setFlag('barge_stopped');
    } else {
      if (!p.spendGold(4500)) {
        yield* say(game, 'Lime-Factor Vosk', [
          'Then she lands and Caldwick takes it on the chin, and the chin is two hundred and eleven years old and has not been hit before.',
          'I will hold the offer until the frost. I am not being kind. I have nobody else to make it to.',
        ]);
        return;
      }
      yield* cinematic(game, true);
      yield* say(game, null, [
        'The barge comes up on the Tuesday tide with two Lowfen men on the marks, and is unloading at the Engine City wharf on the Friday morning.',
        'The Engine City writes to Caldwick the following week. The letter is four lines long and three of them are about the weather.',
      ]);
      yield* say(game, 'Lime-Factor Vosk', [
        'Mortar for the Engine City was two thirds of the kiln. I have plaster for Solmere and a barrel a month for a man in Ferran who will not say what he does with it.',
        'That is not a business. That is a hobby with two hundred and eleven years of arrears attached.',
      ]);
      yield* say(game, null, [
        `The party buys the month's stock at Vosk's price, which is 4500 gil and which he does not lower by a single gil, because a factor who lowers a price is running a sale.`,
        'It goes out on carts to nobody in particular. The burners are paid on the Friday, in coin, at the gate, on a nod.',
      ]);
      yield* say(game, 'Lime-Factor Vosk', [
        'Take this off me. It came out of the kiln floor when they relined it in my father\'s time and it has been on my shelf being a paperweight ever since.',
        'It is cold. It has been in a room with that fire in it for forty years and it has never once been warm, and I have stopped mentioning that to people.',
      ]);
      yield* game.grantChest({ kind: 'item', id: 'stoneheart', label: 'a Stone Heart' }, ctx.field);
      p.setFlag('barge_landed');
    }

    p.setFlag('barge_decided');
    p.completeQuest('barge');
    yield* cinematic(game, false);
  },

  /**
   * Oxmere. Old Pettigrew makes eleven hurdles a week and the town buys nine,
   * and the trade goes when he does, and everybody involved knows the whole of
   * that and has known it for years.
   */
  *oxmere_last_hurdler(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('hurdles_kept')) {
      yield* say(game, 'Old Pettigrew', p.worldState === 'ruin'
        ? [
          'Eleven a week. Nobody is buying nine. They are stacked against the byre and the stack is taller than the byre.',
          'You will want to know why I am still cutting. So would I, and I have had a good deal longer at the question than you have.',
        ]
        : [
          'You have got the ninth rod wrong twice since. I watched you both times and said nothing, which is how I was taught.',
        ]);
      return;
    }
    yield* say(game, 'Old Pettigrew', [
      'Eleven a week. Six foot of hazel, a mortise every fourteen inches, and the ninth rod is the one that decides whether you have made a hurdle or a gate.',
      'Two get broken and one gets stolen. That is the year. I have said that to you already if you have been past before, and I will say it again, because it is still the year.',
    ]);
    yield* say(game, 'Vesna', ['Who else cuts them.']);
    yield* say(game, 'Old Pettigrew', [
      'In this parish, nobody. In the next, a man a year older than me who does it wrong, and we have not spoken since the fair before last, about the wrong.',
      'I took a boy on nineteen years ago. He shoes cattle now, at the top of the town, and he is very good at it, and I have never said one word to him about any of it.',
    ]);
    const choice = yield* game.dialogue.ask(
      'There is a shaving horse, a froe, and a bundle of hazel that has been standing in water since Thursday.',
      ['Sit down and be shown', 'Leave him to it'],
      { speaker: 'Old Pettigrew', cancelable: true },
    );
    game.dialogue.close();
    if (choice !== 0) {
      yield* say(game, 'Old Pettigrew', [
        'Right. Mind the stack on your way past; the third one from the end is not tied and it has had four people over.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It takes the afternoon. Nothing is measured. He holds each rod against the last one and the last one against the one before it, and by the eleventh the thing has drifted a finger\'s width, and he says that is what the drift is for.',
      'He puts somebody\'s hands where they go twice, and then stops doing it, and lets the third one be bad.',
    ]);
    yield* say(game, 'Old Pettigrew', [
      'That is a bad hurdle. It will hold a cow that has already decided not to go anywhere, which is most of them, and that is why bad hurdles have lasted four hundred years.',
      'You will not remember the mortise spacing by the spring. Nobody does. You will remember the drift, because I made you feel it, and that is the only part I could give you in an afternoon.',
    ]);
    yield* say(game, 'Vesna', ['Has anybody asked to be shown before.']);
    yield* say(game, 'Old Pettigrew', [
      'Nineteen years ago.',
      'Take the boar spear off the wall on your way. Hazel out of the same coppice, and I put the crossbar on it myself the year the wolves came down, and it has been on that wall since the year after.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'boarspear', label: 'a Boar Spear' }, ctx.field);
    p.addGold(900);
    yield* say(game, null, ['He will not be talked out of a day\'s wage for the afternoon either. It comes to 900 gil and he counts it out of a tin.']);
    p.setFlag('hurdles_kept');
    p.completeQuest('hurdles');
    yield* cinematic(game, false);
  },

  /**
   * Marrowgate. Three hundred and forty people live off what the ground gives
   * back after rain, and the whole trade depends on nobody ever establishing
   * whose ground it is.
   */
  *marrowgate_eight_yards(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('pitch_walked')) {
      yield* say(game, 'Fen Culliss', [
        'Rain on Tuesday. I did the north blocks and got a buckle and a bad hour.',
        'You are walking the pitch when you go through the square. I have watched you do it. You do not know you are doing it.',
      ]);
      return;
    }
    yield* say(game, 'Fen Culliss', [
      'Eight yards. Always eight, because whatever laid this laid it on eight, and the things that come up sit in the joints.',
      'Walk the pitch and you have covered a block. Walk anyhow and you have covered a quarter of it and gone home pleased with yourself.',
    ]);
    yield* say(game, 'Fen Culliss', [
      'Come out at first light and take the next line over from mine. Do not pick anything up until I have looked at it, and do not stand on the white where it is wet.',
    ]);
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The far blocks after rain are turf gone thin over marble, and what has worked its way up sits proud of the grass for about four hours and then settles back.',
      'Four things in a morning: a hinge, a hook, a coin that is not a coin, and a square of something that is exactly the size of the holes in the kerb.',
    ]);
    const finder = speaking(p, ['corvin', 'kestrel', 'tam', 'ilsabet']);
    if (finder) {
      const lines = {
        corvin: [
          'Nobody here is hiding anything and nobody here will tell you where they found it. I have been in nine trades and I have never seen that combination before.',
        ],
        kestrel: [
          'The square is a fixing. Eleven thousand holes in that kerb and every one of them held one of these, and there is not a word about them in four hundred years of catalogue.',
        ],
        tam: [
          'Ground gives it up when it is wet and takes it back when it dries. Same as the fen does. Same as everything does.',
        ],
        ilsabet: [
          'Put it down where it was and let me look at it there. I do not want it in a hand. A thing in a hand is already a different thing.',
        ],
      };
      yield* say(game, finder.name, lines[finder.id]);
    }
    yield* say(game, 'Fen Culliss', [
      'Quillam buys all four and asks nothing, and everybody says that is because he is delicate about where things come from.',
      'It is not that. If any of us ever says where, then somebody writes it down, and a written-down place is a site, and a site belongs to whoever wants it.',
    ]);
    yield* say(game, 'Fen Culliss', [
      'Anselm has walked four thousand yards north with a chain looking for the edge of this town and he has not found one, and his report says extent undetermined for the ninth year.',
      'Three hundred and forty of us are living off the word undetermined, and he knows we are, and he goes home and writes it, and he has never once asked me anything.',
    ]);
    yield* say(game, null, [
      'The fourth thing is a charm on a wire. Culliss turns it over for a while and then puts it into somebody\'s hand instead of into the bag.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'vagrantcharm', label: 'a Vagrant Charm' }, ctx.field);
    yield* say(game, 'Fen Culliss', ['That one is a copy of something. All the good ones are.']);
    p.addGold(2600);
    yield* say(game, null, [
      'Quillam pays out for the other three without looking at any of them, and does not ask where, and gives 2600 gil for a hinge, a hook and a coin that is not a coin.',
    ]);
    p.setFlag('pitch_walked');
    p.completeQuest('pitch');
    yield* cinematic(game, false);
  },

  /**
   * Marrowgate. Thirty years of ground-rent on a room that was here first,
   * levied under one clause of a four-hundred-year-old title, by a man who
   * sends a note before he raises it.
   */
  *marrowgate_undercroft_rent(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('rent_settled')) {
      yield* say(game, 'Perry Salk', [
        'A cellar with a good floor. That is the finding and I have had it read to me three times.',
        'I have not put the rooms down. Everybody expected me to put the rooms down and I have decided to be the sort of man who does not.',
      ]);
      return;
    }

    if (!p.hasFlag('brick_opened')) {
      yield* say(game, 'Perry Salk', [
        'The cellar is not mine. It was here. I put a house on top of it thirty years ago and I have been paying to heat somebody else\'s room ever since.',
        'Forty gil a year to the reliquary. It is not a sum. It is thirty years of a sum, and it is the reason a bed here is forty and not thirty-two.',
      ]);
      yield* say(game, 'Reliquar Ansence', [
        'The title is four hundred years old and it is one clause. All undercrofts and vaults of the prior settlement.',
        'It does not describe them. It did not have to; when it was written there were none to describe, because nobody had found any.',
      ]);
      yield* say(game, 'Vesna', ['And you collect on it.']);
      yield* say(game, 'Reliquar Ansence', [
        'I collect on it. Forty gil a year off a man heating a room he cannot use, and I have raised it twice, both times because the archive instructed me to, and both times I sent a note first.',
      ]);
      yield* say(game, 'Perry Salk', [
        'He does send a note. That is not nothing.',
        'It is also not much, and we have both had thirty years to get the measure of exactly how much it is.',
      ]);
      yield* say(game, null, [
        'The cellar goes back under the lane. Salk bricked it at nine yards because at nine yards he stopped enjoying himself, and the brick is dry and well laid and comes down in about an hour.',
      ]);
      p.setFlag('brick_opened');
      if (p.questStage('rent') < 0) p.startQuest('rent', 0);
    }

    yield* say(game, null, [
      'Past the brick the floor changes from Salk\'s flags to something laid on the eight-yard pitch, and the air changes with it.',
      'There is something down here that has had the run of eleven yards of dry stone for a long time and does not care for the draught.',
    ]);

    const result = yield* game.startBattleScene(
      { enemies: ['stonelayer', 'chalkwight', 'chalkwight'] },
      { terrain: 'marble', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    yield* cinematic(game, true);
    yield* say(game, null, [
      'Eleven yards in there is a stone set upright across the full width of the passage, dressed on both faces, with one line cut along the top of it.',
      'The floor on the far side is laid differently, and better, and by somebody with more time.',
    ]);
    const reader = speaking(p, ['kestrel', 'maret', 'aurelian']);
    if (reader) {
      const lines = {
        kestrel: [
          'That is a boundary. A cut line on a dressed upright is a boundary in every hand I have ever read, including four I cannot read.',
          'The undercroft is on that side of it. Everything on this side is a hole in the ground that somebody later put a floor in.',
        ],
        maret: [
          'I have signed for the seizure of buildings on worse evidence than that stone and I did not read past the tonnage on any of them.',
          'It is a boundary. I would have accepted it in an afternoon and I would have been right for once.',
        ],
        aurelian: [
          'Two floors, two pitches, and a stone between them that neither of them runs under.',
          'Whatever is behind that is the prior settlement. This side is a cellar, and it has been a cellar since before anybody wrote a clause about vaults.',
        ],
      };
      yield* say(game, reader.name, lines[reader.id]);
    } else {
      yield* say(game, 'Vesna', [
        'It is a boundary stone, and the undercroft starts on the far side of it.',
        'What Salk has been paying for is on this side.',
      ]);
    }
    yield* say(game, 'Reliquar Ansence', [
      'Then it is not an undercroft of the prior settlement. It is a cellar with a good floor.',
      'I will write it up and send the note. There is a form for a title being wrong and I have never used it, and I am going to have to read it twice before I start.',
    ]);
    yield* say(game, 'Perry Salk', ['Thirty years.']);
    yield* say(game, 'Reliquar Ansence', [
      'Thirty years, and I would collect it again tomorrow on the same clause, and you know that, and it is why you have never once been rude to me.',
    ]);
    yield* say(game, 'Perry Salk', ['It is why.']);
    yield* say(game, null, [
      'Under the boundary stone there is a chest with the parish\'s small money in it and a book, ruled and totted, in which no single entry is for as much as a gil.',
    ]);
    yield* game.grantChest({ kind: 'key', id: 'ledgerofsmalldebts', label: 'the Ledger of Small Debts' }, ctx.field);
    p.addGold(5000);
    yield* say(game, null, ['The chest holds 5000 gil, in coin four hundred years out of use and heavier than the coin that replaced it.']);
    p.setFlag('rent_settled');
    p.completeQuest('rent');
    yield* cinematic(game, false);
  },

  // =========================================================================
  // After. Four scenes in the ruined world, two of which are businesses that
  // never received notice to stop.
  // =========================================================================

  /**
   * Lowfen goes up the bank for the tenth time in a hundred years, and this
   * time the reeve is not saying when it comes down.
   */
  *lowfen_last_carry(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, 'Stone-Keeper Wend', [
        'Fourteen footings, swept and levelled and checked every month of my life, and used nine times.',
        'You will say that is a great deal of sweeping for nine. Ask me in November whether it was.',
      ]);
      return;
    }
    if (p.hasFlag('carried_up')) {
      yield* say(game, 'Stone-Keeper Wend', [
        'Ten. I have the figure now and I would rather have gone on not having it.',
        'I still sweep. There is nothing under the houses to sweep for, and I do the aprons round them, and nobody has asked me to stop.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('memory', { fade: 1.0 });
    yield* say(game, null, [
      'The lower town is on the terrace, in two ranks, each house on its own numbered stone. The timber spine below is empty from end to end and the water is going under it.',
      'It was struck in a day and a half, which is the fastest it has ever been done, and nobody in Lowfen is pleased about the record.',
    ]);
    yield* say(game, 'Stone-Keeper Wend', [
      'Everything in this town comes apart. Beds in four, table in three, loom in eleven, and the eleventh piece of a loom is the one you lose.',
      'Nine times in a hundred years, and every one of those nine went back down in the spring. Nobody has said anything about the spring.',
    ]);
    if (p.hasFlag('barge_stopped')) {
      yield* say(game, 'Carrier Pell', [
        'The only carrying this fen has done in a year and it was our own houses, up our own bank, for nothing.',
        'I am not saying that to you as a complaint. I am saying it because it is the truest sentence about the haulage trade I have ever had, and I want somebody to have heard it.',
      ]);
    } else if (p.hasFlag('barge_landed')) {
      yield* say(game, 'Carrier Pell', [
        'Lime money paid for the rollers and the new ropes, and the rollers and the ropes did a day and a half.',
        'I have never spent anything better and I would rather not have had to find that out.',
      ]);
    }
    yield* say(game, 'Widow Sarn', [
      'Sixteen stays empty. There is nobody to carry it up and there has not been for eleven years.',
      'Every strike, somebody asks. Every strike, we leave it. You cannot put a different family on a stone. It is not the law. It is worse than the law and it holds better.',
    ]);
    yield* say(game, null, [
      'The party carries for two days. Shutters, hurdles, the taproom trestles, the eel traps, and a dresser that does not come apart and is left where it stands.',
      'On the second evening the whole town is on the shelf, in its own order, on its own numbers, looking down at a spine with nothing on it.',
    ]);
    yield* say(game, 'Stone-Keeper Wend', [
      'Under sixteen there is a box. It went down when they went up and nobody came back for it, and I have swept over it every month for eleven years and never once lifted the stone.',
      'You lift it. I am not going to, and I would rather it was somebody who is leaving.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'gravewardknot', label: 'a Graveward Knot' }, ctx.field);
    p.addGold(1800);
    yield* say(game, null, ['There is 1800 gil in the box as well, wrapped separately, in a cloth with a stone number stitched into the corner of it.']);
    p.setFlag('carried_up');
    p.completeQuest('carriage');
    // No battle and no new map to hand the theme back, so this one does it.
    if (ctx.field?.mapDef?.music) game.playMusic(ctx.field.mapDef.music, { fade: 1.6 });
    yield* cinematic(game, false);
  },

  /**
   * Caldwick, after. The kiln went out on a Tuesday. There is no procedure for
   * it because there was never going to be one, and the lodge has to vote on
   * whether a fire that has no customers is worth eleven days.
   */
  *caldwick_cold_apron(game, ctx = {}) {
    const p = game.party;
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'The apron is hot enough through the boots to be worth thinking about where you stand, and everybody in the yard is standing where they always stand.',
      ]);
      return;
    }
    if (p.hasFlag('apron_voted')) {
      yield* say(game, 'Kilnwarden Rue', p.hasFlag('kiln_relit')
        ? [
          'Day four. Two hundred and eighty cord left and forty men who are all doing somebody else\'s job as well as their own.',
          'The book is being kept. I write GOOD in the same chalk as the rest now, which I should have done years ago.',
        ]
        : [
          'It stays out. I have written the last line and ruled under it and hung the slate up in the lodge, which is where slates go when they have stopped being used.',
          'I sweep the apron. Somebody would sweep it whatever I did, so it may as well be the man who was paid for it.',
        ]);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('sorrow', { fade: 1.2 });
    yield* say(game, null, [
      'The apron is cold and the ring road is cold with it, and for the first time in two hundred and eleven years the doors on the outer ring are worth more than the doors on the inner one.',
      'The kiln book is still up on the wall. The last line reads DAY 77,308, and nothing after it.',
    ]);
    yield* say(game, 'Kilnwarden Rue', [
      'It went out on a Tuesday. Two hundred and eleven years, and it chose a Tuesday.',
      'I have the relighting written down. Eleven days, four hundred cord, forty men. I have the eleven days and I have thirty-one of the men.',
    ]);
    yield* say(game, 'Vesna', ['And the four hundred cord.']);
    yield* say(game, 'Kilnwarden Rue', [
      'There is wood. There is a great deal of wood; nobody is buying standing timber now and nobody is cutting it either, so it is out there being wood.',
      'What there is not is anybody at the far end who wants mortar. The Engine City has stopped writing. Solmere has stopped writing. That barrel a month to Ferran stopped in the spring and I find I mind about that one most.',
    ]);
    yield* say(game, 'Burner Fettle', [
      'The lodge is split and it is split down the middle, and neither half will hold the tally, because both halves are in it.',
      'You hold it. You are the only people in this town who have not got a stone in this and are not related to somebody who has.',
    ]);
    if (p.hasFlag('flue_bricked')) {
      yield* say(game, 'Halber Crane', [
        'I am voting to light it. I have no forge left to take heat off it and I am voting to light it, and I would like Fettle to enter that.',
      ]);
    } else if (p.hasFlag('cord_bought')) {
      yield* say(game, 'Halber Crane', [
        'My flue goes into the back of a dead kiln. I have a hearth that has never had a fire of its own in it and a damper my grandfather set open.',
        'I am voting to light it. I am aware what that looks like from where Fettle is standing, and I am voting anyway.',
      ]);
    }
    yield* cinematic(game, false);
    yield* say(game, null, [
      'The count takes an hour and a half, because thirty-one people who have all known each other since birth cannot be got to vote in one line.',
      'It comes out at sixteen to fifteen.',
    ]);

    // Which way the sixteen falls is the only thing the chain leaves behind.
    // A lodge whose hours were settled before the sky changed still has a book
    // and a fourth hour to go back to; a lodge that was on six when everything
    // stopped is being asked to stand eleven days for a fire with nobody at the
    // other end of it, by the same people who asked last time.
    const relight = p.hasFlag('lodge_settled');
    if (relight) {
      yield* say(game, 'Kilnwarden Rue', [
        'Sixteen for.',
        'Charging starts Monday and we cut for a fortnight before it, and I want everybody who voted the other way out on the cutting, because they will be, and saying so now saves an argument I have not got the strength for.',
      ]);
      yield* say(game, 'Widow Skeeling', [
        'I voted the other way and I will be on the cutting.',
        'We were four rings out when I married and two rings in when it went out, and I would rather be cold in a town with a fire in it than warm in one without.',
      ]);
    } else {
      yield* say(game, 'Kilnwarden Rue', [
        'Sixteen against.',
        'Eleven days on six-hour shifts, for a fire that has nobody at the far end of it, asked for by the same men who asked in the spring. I would have voted the other way and I do not think I would have been right.',
      ]);
      yield* say(game, 'Widow Skeeling', [
        'I voted against and I am the one who will be cold.',
        'Two rings in, and the rent goes by how near the fire you are, and from Monday there is no near. My daughter has been trying to work out how to say that to me kindly since the count and she can stop.',
      ]);
    }

    yield* cinematic(game, true);
    yield* say(game, 'Burner Fettle', relight
      ? [
        'There is a tin behind the lodge door with two of these in it and nobody knows who put them there or when.',
        'They have been kept against the day the fire went out. The fire has gone out and we are relighting it with faggots and forty men, the way you actually light a fire, so the tin is no use to anybody here.',
      ]
      : [
        'There is a tin behind the lodge door with two of these in it and nobody knows who put them there or when.',
        'They have been kept against the day the fire went out. It has gone out and it is staying out, so there is no day left for them to be kept against.',
      ]);
    yield* game.grantChest({ kind: 'item', id: 'phoenixember', count: 2, label: '2 Phoenix Embers' }, ctx.field);
    p.addGold(3400);
    yield* say(game, null, ['The lodge box holds 3400 gil, which is subscriptions from men who are not going to be asking for them back.']);
    p.setFlag('apron_voted');
    p.setFlag(relight ? 'kiln_relit' : 'kiln_out');
    p.completeQuest('apron');
    if (ctx.field?.mapDef?.music) game.playMusic(ctx.field.mapDef.music, { fade: 1.6 });
    yield* cinematic(game, false);
  },

  /**
   * The Bramblewold pens. The blooding gate at the bottom of the Oxmere drove,
   * still counting what comes through it, four hundred years after the last
   * beast did.
   */
  *bramblewold_yardmaster(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('yard_slain')) {
      yield* say(game, null, [
        'The gate is off its hinges and lying in the lane, and the briar has come three feet over the stone at both ends of it, which it would not do before.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'Two posts in the thorn with a gate hung between them, shut, and a lane of laid stone running away on both sides into briar.',
        'The hinges have been greased. Not recently — but not four hundred years ago either.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'The briar stops dead at a line of posts and starts again on the far side of them. Between the two is a lane four paces wide, floored with laid stone, coming out of the wold and going back into it.',
      'It is a drove lane. The gate is still on its hinges and the hinges are greased.',
    ]);
    yield* say(game, 'Vesna', [
      'Everything that came down out of Oxmere came through here.',
      'Nine days on the road, and then a gate, and then this was the last four paces of it.',
    ]);
    yield* say(game, null, [
      'The tally boards are nailed to the inside of the post, one over another, four hundred years deep.',
      'The top board is not weathered.',
    ]);
    if (p.hasFlag('count_short') || p.hasFlag('beam_light')) {
      yield* say(game, 'Vesna', [
        'Head in, head out, head lost. Somebody has been keeping this gate\'s figures up to date and it has not been anybody in Oxmere.',
      ]);
    }
    yield* say(game, null, [
      'Something is standing on the far side of the gate with a hand on the top rail, in the attitude of a man who has been waiting since before the wood grew.',
    ]);
    yield* tremor(game, 1.6, 0.6);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['theyardmaster'] },
      { boss: true, terrain: 'grass', scenery: 'field', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('yard_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The gate comes off its hinges as he goes, which is the only thing in the wold that has moved in either direction in four hundred years.',
      'The top tally board is finished off in the same hand as the four hundred beneath it, and the last figure on it is entered and ruled under.',
    ]);
    yield* say(game, 'Vesna', [
      'He was not guarding the lane. He was working it.',
      'Somebody put him on this gate and paid him at it, and then the drove stopped coming and nobody walked down here to tell him.',
    ]);
    yield* game.grantChest({ kind: 'item', id: 'bloodingwraps', label: 'a pair of Blooding Wraps' }, ctx.field);
    p.addGold(22000);
    yield* say(game, null, [
      'Under the boards there is a strongbox with the yard\'s last month in it: 22000 gil, made up into wage packets for men who were paid at the gate, in coin, on a Friday.',
    ]);
    p.completeQuest('yard');
    yield* cinematic(game, false);
  },

  /**
   * A bay off the Last Lantern road, at twenty paces. A shop with no fire in
   * it that has been working to a standing order nobody ever came back to
   * close.
   */
  *lastlantern_cold_forge(game, ctx = {}) {
    const p = game.party;
    if (p.hasFlag('forge_slain')) {
      yield* say(game, null, [
        'The rack is still full and the piece on the anvil is still half done, and the slate by the hearth has nothing on it at all now.',
      ]);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, [
        'A bay cut square into the west wall at twenty paces, with a hearth in the back of it and the floor worn into a shallow dish in front of the hearth.',
        'There is a sound in it that is nearly the sound of work, and it stops while you are deciding what it is.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    game.playMusic('boss_final', { fade: 0.8 });
    yield* say(game, null, [
      'The bay at twenty paces is not a bay. It is a shop, cut square, with a hearth in the back wall and the floor in front of it worn into a dish by somebody standing in one place.',
      'Nothing is burning. Nothing has ever burned: the hearth has no flue and the brick behind it is the colour of brick.',
    ]);
    yield* say(game, null, [
      'The rack by the door is full. The work on it is finished and sorted by size, and there are nine hundred years of it, and the oldest of it is at the bottom and is the same as the newest.',
      'On a slate beside the hearth, in a hand that has not changed once: THE ORDER STANDS.',
    ]);
    yield* say(game, 'Vesna', [
      'Nobody closed the order.',
      'It has been working to a standing instruction for nine hundred years and the office that gave it went under the ground about eight hundred and fifty years ago.',
    ]);
    if (p.hasFlag('flue_bricked')) {
      yield* say(game, 'Vesna', [
        'Crane put a wall across his flue in one afternoon and went back to shoeing horses.',
        'Nobody has ever come down this road carrying a wall.',
      ]);
    }
    const smith = speaking(p, ['aurelian', 'rusk', 'bastian', 'maret']);
    if (smith) {
      const lines = {
        aurelian: [
          'You cannot work iron cold. That is not a rule of the trade, it is a property of iron, and the rack is full.',
        ],
        rusk: [
          'THE ORDER STANDS. I HAVE READ THAT SENTENCE BEFORE, IN A DIFFERENT HAND, ON A DIFFERENT WALL.',
          'I STOOD UNDER IT FOR ELEVEN YEARS. I WOULD LIKE TO GO IN FIRST.',
        ],
        bastian: [
          'Sorted by size. Nine hundred years of it, sorted by size.',
          'Somebody has been carrying the finished work to the rack and putting it in the right place, every time, and there is nobody here.',
        ],
        maret: [
          'A standing order runs until it is countermanded in writing by the office that raised it.',
          'I have signed four of those in my service. I have countermanded none of them, and I am now going to spend a while thinking about where the other three are.',
        ],
      };
      yield* say(game, smith.name, lines[smith.id]);
    }
    yield* tremor(game, 2.0, 0.75);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['thecoldforge'] },
      { boss: true, terrain: 'cobble', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    p.setFlag('forge_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It stops between one piece and the next. The piece is on the anvil, half worked, and it is going to be half worked for ever.',
      'It is the only unfinished thing in the room.',
    ]);
    yield* say(game, 'Vesna', [
      'Nine hundred years of finished work, and no cart ever came for any of it.',
      'It is all still here. It was always going to be all still here, and it went on making it, because nothing had come down the road to say otherwise.',
    ]);
    yield* game.grantChest({ kind: 'key', id: 'quenchward', label: 'a Quench Ward' }, ctx.field);
    p.addGold(34000);
    yield* say(game, null, [
      'The pay chest under the rack has never been opened. It holds 34000 gil, made up nine hundred years ago against a wage that was never drawn.',
    ]);
    p.completeQuest('coldforge');
    yield* cinematic(game, false);
  },
};

export function vol4EventById(id) {
  return VOL4_EVENTS[id] || null;
}
