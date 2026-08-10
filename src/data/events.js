import { wait, until, tween, over, EASE } from '../engine/scheduler.js';
import { TILE } from '../world/map.js';
import { ESPERS } from './espers.js';

/**
 * Scripted events.
 *
 * Each event is a generator receiving `(game, ctx)`, where ctx carries the
 * field state and whatever triggered it. Written as coroutines so a scene reads
 * top to bottom in source the way it plays on screen:
 *
 *   yield* say('Vesna', 'It answered me.');
 *   yield* game.startBattleScene({ enemies: ['bogfather'] }, { boss: true });
 *   yield* grant(game, { kind: 'esper', id: 'hollowking' });
 *
 * Events fire from map triggers, NPCs and objects. `once: true` on a trigger
 * plus a story flag is the normal pattern for anything that must not repeat.
 */

// --- small helpers used by most scenes --------------------------------------

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

export const EVENTS = {
  /**
   * The Bogfather. Crossing into the barrow chamber wakes it.
   */
  *fenbarrow_boss(game, ctx) {
    if (game.party.hasFlag('bogfather_slain')) return;
    const field = ctx.field;

    yield* cinematic(game, true);
    yield* say(game, null, ['The standing water at the far end of the chamber is not water.']);
    yield* tremor(game, 1.4, 0.55);
    yield* say(game, 'Vesna', [
      'It has been waiting. I can feel how long.',
      'Nine hundred years of being *bored*.',
    ]);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['bogfather'] },
      { boss: true, terrain: 'cave', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    game.party.setFlag('bogfather_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The thing comes apart the way a wave does — all at once, and then not at all.',
      'What is left behind is a shard of something colder than the cave.',
    ]);
    yield* game.grantChest({ kind: 'esper', id: 'hollowking', label: 'a shard of magicite' }, field);
    yield* say(game, 'Vesna', [
      'This is what the Imperium is digging for.',
      'Not weapons. *People.* Something was a person, once, inside every one of these.',
    ]);
    yield* cinematic(game, false);
    game.party.completeQuest('barrow');
  },

  /**
   * Harrowmere's elder sends the player south. The opening hook.
   */
  *harrowmere_intro(game, ctx) {
    // An NPC whose event has already fired must still have something to say —
    // silently doing nothing on a second approach reads as a broken NPC.
    if (game.party.hasFlag('intro_done')) {
      yield* say(game, 'Elder Sabbath', game.party.hasFlag('bogfather_slain')
        ? ['You shut it, then. Or opened it wider. We will know soon enough.',
           'Go to Solmere. Ask for the Marchetti twins, and show them what you carry.']
        : ['The barrow lies south-west, past the fen. Take the road while it is still a road.']);
      return;
    }
    game.party.setFlag('intro_done');
    game.party.startQuest('barrow', 0);
    yield* cinematic(game, true);
    yield* say(game, 'Elder Sabbath', [
      'You came back with it still humming, then.',
      'The Ferrans have opened the barrow in the fen. Whatever they were looking for, they did not find it — they found the door.',
      'Go and shut it. Or go and see. I have stopped pretending those are different errands.',
    ]);
    yield* cinematic(game, false);
  },

  /**
   * Aurelian joins. Gated on the barrow, so the player arrives with proof.
   */
  *recruit_aurelian(game, ctx) {
    const p = game.party;
    if (p.roster.has('aurelian')) {
      yield* say(game, 'Aurelian', p.hasFlag('bastian_joined')
        ? ['My brother is sulking about the fuel ratios again. Ignore him; he is usually right.']
        : ['Find Bastian in the works below. He will not come for me, but he might come for you.']);
      return;
    }
    if (!p.hasFlag('bogfather_slain')) {
      yield* say(game, 'Aurelian Marchetti', [
        'You want an audience, and I want four hours of sleep. Neither of us is getting what we want today.',
        'Bring me something I do not already know. There is a barrow in the fen the Ferrans opened and then very quickly stopped talking about.',
      ]);
      return;
    }

    yield* cinematic(game, true);
    yield* say(game, 'Aurelian Marchetti', [
      'Let me see it. …Ah.',
      'That is not a battery. That is a *name*, held in a lattice, and it is still legible.',
      'Every measure of aether this city draws, we draw from one of these. I have told myself for eleven years that ours was empty.',
    ]);
    yield* say(game, 'Vesna', ['Was it?']);
    yield* say(game, 'Aurelian Marchetti', [
      'No.',
      'Then we had better go and find out what the Chancellor intends to do with a well full of people. I am coming with you.',
    ]);
    const m = p.recruit('aurelian');
    m.equipment.weapon = null;
    p.setFlag('aurelian_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Aurelian Marchetti joined the party.']);
    yield* cinematic(game, false);
    if (p.questStage('engine') < 0) p.startQuest('engine', 0);
  },

  /** Bastian joins, if Aurelian already has. */
  *recruit_bastian(game, ctx) {
    const p = game.party;
    if (p.roster.has('bastian')) {
      yield* say(game, 'Bastian', ['Say the word and I will put someone through a wall for you. Professionally.']);
      return;
    }
    if (!p.hasFlag('aurelian_joined')) {
      yield* say(game, 'Bastian Marchetti', [
        'If my brother sent you, the answer is no.',
        'If he did not send you, the answer is also no, but I will be nicer about it.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Bastian Marchetti', [
      'He is going himself. Actually going, not sending a memorandum.',
      'Then it is worse than he is saying. It always is.',
      'Fine. Somebody has to carry the heavy end.',
    ]);
    p.recruit('bastian');
    p.setFlag('bastian_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Bastian Marchetti joined the party.']);
    yield* cinematic(game, false);
  },

  /**
   * The Ferran Warden. Guards the annexe; beating it opens the keep.
   */
  *ferran_warden(game, ctx) {
    if (game.party.hasFlag('warden_slain')) return;
    const field = ctx.field;

    yield* cinematic(game, true);
    yield* say(game, null, [
      'The annexe doors are already open. Nothing inside is standing.',
      'At the far end, something the size of a cart unfolds itself off the floor.',
    ]);
    yield* tremor(game, 1.2, 0.6);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['ferranwarden'] },
      { boss: true, terrain: 'cobble', scenery: 'none', canFlee: false },
    );
    if (result !== 'victory') return;

    game.party.setFlag('warden_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The thing folds down and stays folded. Its core goes dark by degrees, like a room being left.',
    ]);
    yield* say(game, 'Vesna', [
      'There was a name in it. I heard it as it stopped.',
      'It was a woman\'s name, and it was recent.',
    ]);
    if (game.party.roster.has('aurelian')) {
      yield* say(game, 'Aurelian', [
        'Recent. Not a thousand years ago — *recent*.',
        'They are not digging these up any more. They are making them.',
      ]);
    }
    yield* cinematic(game, false);
    game.party.advanceQuest('engine', 1);
  },

  /**
   * Ashenhall's reliquary. The Eighth Lantern has been keeping vigil for a
   * thousand years and does not intend to be relieved.
   */
  *ashenhall_reliquary(game, ctx) {
    if (game.party.hasFlag('lantern_slain')) return;
    const field = ctx.field;

    yield* cinematic(game, true);
    yield* say(game, null, [
      'The ninth alcove is lit. Something is sitting in front of it with its back to you.',
      'It has been sitting there a very long time.',
    ]);
    yield* say(game, 'Vesna', ['It is not going to let us take it.']);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['eighthlantern'] },
      { boss: true, terrain: 'marble', scenery: 'none', canFlee: false },
    );
    if (result !== 'victory') return;

    game.party.setFlag('lantern_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The light goes out of it slowly, the way a lamp does when you carry it into wind.',
      'The ninth lantern comes free of the alcove without resistance, as though it had been waiting to be asked.',
    ]);
    yield* game.grantChest({ kind: 'esper', id: 'ninthlantern', label: 'the Ninth Lantern' }, field);
    yield* say(game, 'Vesna', [
      'She was the keeper. She stayed so the last one would not be taken.',
      'And we took it.',
    ]);
    yield* cinematic(game, false);
    game.party.completeQuest('lantern');
    game.party.advanceQuest('engine', 2);
  },

  /**
   * The Standing Oak, on the world map. Optional, and the reward is a healing
   * esper — the kind of thing a player who wanders should find.
   */
  *standing_oak(game, ctx) {
    const p = game.party;
    if (p.hasFlag('oak_slain')) {
      yield* say(game, null, ['The stump is already greening over. It was never really a tree.']);
      return;
    }
    const choice = yield* game.dialogue.ask(
      'The oak turns to face you. It is far too old to be a tree, and it knows your name.',
      ['Stand your ground', 'Back away slowly'],
      { cancelable: true },
    );
    game.dialogue.close();
    if (choice !== 0) return;

    const result = yield* game.startBattleScene(
      { enemies: ['greenmother_guardian'] },
      { boss: true, terrain: 'grass', scenery: 'field', canFlee: false },
    );
    if (result !== 'victory') return;
    p.setFlag('oak_slain');
    yield* say(game, null, ['What is left in the roots is warm, and green, and patient.']);
    yield* game.grantChest({ kind: 'esper', id: 'greenmother', label: 'a shard of magicite' }, ctx.field);
    p.completeQuest('oak');
  },

  /**
   * The Toll Baron ambushes the road once the player has been through Solmere.
   * A pure sidequest: he has no bearing on the plot and excellent loot.
   */
  *toll_baron(game, ctx) {
    const p = game.party;
    if (p.hasFlag('baron_slain')) {
      yield* say(game, null, ['The road is quiet. Somebody has taken the barricade for firewood.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'The Toll Baron', [
      'Road is mine. Has been since the garrison stopped patrolling it.',
      'The toll is everything you are carrying. I am told that is a lot, lately.',
    ]);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['tollbaron', 'brigand', 'brigand'] },
      { boss: true, terrain: 'dirt', scenery: 'field', canFlee: false },
    );
    if (result !== 'victory') return;
    p.setFlag('baron_slain');
    p.addGold(2500);
    yield* say(game, null, ['His strongbox holds 2500 gil and a great deal of other people\'s correspondence.']);
    p.completeQuest('baron');
  },

  /** The Cinder Wyrm, at the top of the pass. */
  *cinderspine_wyrm(game, ctx) {
    if (game.party.hasFlag('wyrm_slain')) return;
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The snow ahead is not settling. It is being breathed on.',
      'It does not roar. It inhales, and the whole pass goes dark.',
    ]);
    yield* tremor(game, 1.6, 0.7);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['cinderwyrm'] },
      { boss: true, terrain: 'snow', scenery: 'snow', canFlee: false },
    );
    if (result !== 'victory') return;

    game.party.setFlag('wyrm_slain');
    yield* cinematic(game, true);
    yield* say(game, null, [
      'It falls a long way, and the sound arrives a long time after it should.',
      'The snow where it lay is glass.',
    ]);
    yield* say(game, 'Vesna', [
      'No name in that one. Nothing in it at all.',
      'It was only ever an animal. Someone woke it and pointed it at the road.',
    ]);
    yield* cinematic(game, false);
    game.party.completeQuest('pass');
  },

  /** The Warden of the Ninth Well guards the shaft head. */
  *ninthwell_warden(game, ctx) {
    if (game.party.hasFlag('wellwarden_slain')) return;
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The gallery opens onto the Well. The draw machinery is still running, and it is running on nothing — the intake pipes are dry.',
      'Something is standing over the shaft with its back to it, the way a dog stands over a bone.',
    ]);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['enginewarden'] },
      { boss: true, terrain: 'cobble', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    game.party.setFlag('wellwarden_slain');
    yield* cinematic(game, true);
    yield* say(game, null, ['The machinery stops. In the quiet, something far below answers it.']);
    yield* cinematic(game, false);
    game.party.advanceQuest('engine', 3);
  },

  /**
   * The finale. Vhaine, then the ending.
   */
  *ninthwell_finale(game, ctx) {
    if (game.party.hasFlag('game_complete')) return;
    const p = game.party;

    yield* cinematic(game, true);
    game.playMusic('memory', { fade: 1.0 });
    yield* say(game, null, [
      'The chamber beneath the Well is not a chamber. It is the inside of something.',
      'Chancellor Aurek Vhaine is standing at the centre of it with his coat off, which is somehow the worst detail.',
    ]);
    yield* say(game, 'Vhaine', [
      'You brought a *sword* to the end of the world?',
      'I have been very patient with all of you. I dug for eleven years and found exactly one thing worth having, and it was not power.',
      'It was the discovery that there is no difference — none, not one — between a person and a battery. Only paperwork.',
    ]);
    yield* say(game, 'Vesna', [
      'There was a name in every one of them.',
      'There is a name in me.',
    ]);
    yield* say(game, 'Vhaine', ['Yes. And when I am finished, it will be the last one.']);
    yield* cinematic(game, false);

    const result = yield* game.startBattleScene(
      { enemies: ['vhaineshadow'] },
      { boss: true, terrain: 'cave', scenery: 'cave', canFlee: false },
    );
    if (result !== 'victory') return;

    // --- the ending -------------------------------------------------------
    p.setFlag('game_complete');
    p.completeQuest('engine');
    game.playMusic('hope', { fade: 1.6 });
    yield* cinematic(game, true);
    yield* say(game, null, [
      'He comes apart the way the others did, and there is a name inside him too.',
      'It is his own, and it is very old, and it has been in there a long time.',
    ]);
    yield* say(game, 'Vesna', [
      'He was one of them. From the beginning.',
      'Somebody put him in a lattice a thousand years ago, and he got out, and he spent every year since trying to make it true that it had not mattered.',
    ]);
    if (p.roster.has('aurelian')) {
      yield* say(game, 'Aurelian', [
        'Solmere runs on eleven of these. Eleven names.',
        'I am going home to turn my city off.',
      ]);
    }
    if (p.roster.has('bastian')) {
      yield* say(game, 'Bastian', ['I will carry the heavy end.']);
    }
    yield* say(game, 'Vesna', [
      'Then we start at the bottom of the Well and we work up.',
      'One at a time. We say the names out loud as we go.',
    ]);
    yield* say(game, null, [
      'The draw machinery above them stays stopped.',
      'It is going to be a very long walk, and none of it is going to be quick, and that is the point.',
    ]);
    yield* say(game, null, ['— AETHERBOUND —']);
    yield* cinematic(game, false);
    yield* game.showEnding();
  },

  /**
   * Idris, at the burnt shrine. He is the last retainer of a house that no
   * longer exists and has been sitting here since it stopped existing.
   */
  *recruit_idris(game, ctx) {
    const p = game.party;
    if (p.roster.has('idris')) {
      yield* say(game, 'Idris', ['The wood is quieter with company in it. I had forgotten that.']);
      return;
    }
    if (!p.hasFlag('lantern_slain')) {
      yield* say(game, 'Ser Idris Vance', [
        'I am waiting for something. You are not it.',
        'When Ashenhall gives up its last lamp, I will know. Until then, walk on.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Ser Idris Vance', [
      'You have it. I felt the hall go out.',
      'Forty years I sat here so that no one would carry it off, and I did not stand up, and someone carried it off.',
    ]);
    yield* say(game, 'Vesna', ['We can put it back.']);
    yield* say(game, 'Ser Idris Vance', [
      'No. You can put *her* back. There is a difference and it is the only one that has ever mattered.',
      'Show me where the well is.',
    ]);
    p.recruit('idris');
    p.setFlag('idris_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Ser Idris Vance joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('idris');
  },

  /**
   * Osric, sitting in his own shipwreck. Joins for the least noble reason of
   * anyone in the party, which is why he is the easiest to trust.
   */
  *recruit_osric(game, ctx) {
    const p = game.party;
    if (p.roster.has('osric')) {
      yield* say(game, 'Osric', ['Still afloat. Metaphorically. The ship is very much not.']);
      return;
    }
    const choice = yield* game.dialogue.ask(
      'A man is sitting in the wreck of an airship, shuffling a deck of cards that is missing most of its cards.',
      ['Ask what happened', 'Ask him to come with you', 'Leave him to it'],
      { speaker: 'Osric Vale', cancelable: true },
    );
    if (choice === 2 || choice < 0) { game.dialogue.close(); return; }
    if (choice === 0) {
      yield* say(game, 'Osric Vale', [
        'The Imperium requisitioned my lift-aether. All of it. Politely, with a form.',
        'A ship without lift is a very expensive shed, and I am sitting in my shed.',
      ]);
    }
    yield* cinematic(game, true);
    yield* say(game, 'Osric Vale', [
      'You are going to the Ninth Well. Everyone going anywhere is going to the Ninth Well.',
      'Here is my position. I want my ship back, and the only aether left in the world is at the bottom of that hole, and I am not brave enough to go down there alone.',
      'That is the entire offer. No principles. Deal?',
    ]);
    p.recruit('osric');
    p.setFlag('osric_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Osric Vale joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('osric');
  },

  /**
   * Maret defects at the outpost, once the Warden has shown her what the
   * Imperium has actually been making.
   */
  *recruit_maret(game, ctx) {
    const p = game.party;
    if (p.roster.has('maret')) {
      yield* say(game, 'Maret', ['I signed the orders that built that thing. Do not let me forget it.']);
      return;
    }
    if (!p.hasFlag('warden_slain')) {
      yield* say(game, 'General Maret Sunder', [
        'Outpost business. Move along, and do not go into the annexe.',
      ]);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'General Maret Sunder', [
      'I heard it stop. I have heard a lot of them stop; that one had a voice.',
      'I countersigned the requisition that filled it. I did not read past the tonnage.',
    ]);
    yield* say(game, 'Vesna', ['You could stop signing.']);
    yield* say(game, 'General Maret Sunder', [
      'I could do rather more than that.',
      'The Chancellor keeps his own counsel and his own keys, and I know where he keeps both. Take me with you.',
    ]);
    p.recruit('maret');
    p.setFlag('maret_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Maret Sunder joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('maret');
  },

  /**
   * The cataclysm. Fires when the player first reaches the Well's lower
   * galleries with the Warden dealt with — Vhaine pulls the Ninth Well open
   * and the world changes state.
   *
   * This is the hinge of the game: the same continent, the same road, the same
   * towns, all read differently afterwards. It is deliberately *not* a new set
   * of maps.
   */
  *cataclysm(game, ctx) {
    const p = game.party;
    if (p.worldState === 'ruin') return;

    yield* cinematic(game, true);
    game.playMusic('chase', { fade: 0.4 });
    yield* say(game, null, [
      'Far below, something enormous takes a breath it has not taken in a thousand years.',
    ]);
    yield* tremor(game, 2.2, 0.9);
    yield* say(game, 'Vhaine', [
      'THERE. Do you feel that? That is the sound of the paperwork being completed.',
    ]);
    game.renderer.postfx.flash([1, 0.85, 0.6], 1.0);
    yield* over(2.4, (t) => {
      game.renderer.postfx.flashStrength = 1 - t * 0.65;
      game.renderer.rig.shake(0.9 * (1 - t * 0.4), 1.6);
    });
    yield* say(game, null, [
      'The light goes out of the world for eleven seconds.',
      'When it comes back, it comes back the wrong colour, and it does not change again.',
    ]);
    yield* over(1.4, (t) => { game.renderer.postfx.flashStrength = 0.35 * (1 - t); });
    game.renderer.postfx.flashStrength = 0;

    p.worldState = 'ruin';
    p.setFlag('cataclysm');
    p.startQuest('after', 0);
    yield* say(game, 'Vesna', [
      'It is still here. Everything is still here.',
      'That is going to be the hard part.',
    ]);

    // The airship is handed over here rather than earned in a side scene. The
    // ruined world is the point at which the map stops being a road with
    // places on it and becomes a place to search, and the player needs the
    // means to search it in the same breath as the reason to.
    p.setFlag('airship');
    yield* say(game, 'Corvin', [
      'The Guild kept a ship moored above Harrowmere for the assay runs.',
      'Nobody is coming to collect it now.',
    ]);
    yield* cinematic(game, false);

    // Reload the current map so the ruined variant takes effect immediately.
    yield* say(game, null, ['You are thrown clear, onto the road above.']);
    game.gotoMap('overworld', 'ferran');
  },

  /** Tam, in the ruined world. Feral, and the only one who is doing better. */
  *recruit_tam(game, ctx) {
    const p = game.party;
    if (p.roster.has('tam')) {
      yield* say(game, 'Tam', ['Quiet now! Listen. …No. Gone. Was big.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'A child is crouched in the middle of the road with a beast the size of a cart, and the beast is letting them.',
      'The beast notices you, thinks about it, and leaves.',
    ]);
    yield* say(game, 'Tam', [
      'You walk loud. Everything walks loud since the sky broke. Except them. They are quiet now.',
      'You go to the hole? I go to the hole. I show you quiet.',
    ]);
    p.recruit('tam');
    p.setFlag('tam_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Tam joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('tam');
  },

  /** Ilsabet, in ruined Harrowmere, painting the thing that happened. */
  *recruit_ilsabet(game, ctx) {
    const p = game.party;
    if (p.roster.has('ilsabet')) {
      yield* say(game, 'Ilsabet', ['Hold still. Not for a portrait. I want your proportions for something worse.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Ilsabet Rook', [
      'I am painting it. All of it. Somebody has to and everyone else is busy being sad.',
      'My master says you paint a thing so that later there is proof it looked like that.',
    ]);
    yield* say(game, 'Vesna', ['Where is your master?']);
    yield* say(game, 'Ilsabet Rook', [
      'In the picture.',
      'I am coming with you. I want to see the hole it came out of, and I want to get it *right*.',
    ]);
    p.recruit('ilsabet');
    p.setFlag('ilsabet_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Ilsabet Rook joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('ilsabet');
  },

  /** Kestrel, in ruined Solmere, still filing. */
  *recruit_kestrel(game, ctx) {
    const p = game.party;
    if (p.roster.has('kestrel')) {
      yield* say(game, 'Kestrel', ['Catalogued. Cross-referenced. Deeply unhappy about both.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, 'Kestrel', [
      'Vellum Archive, Solmere branch. I am the branch.',
      'I have the draw records for every well on the continent, going back four hundred years, and I have read all of them twice since the sky changed.',
    ]);
    yield* say(game, 'Kestrel', [
      'There were never a thousand espers. There were sixty-one, and they all had names, and I have every one of them written down.',
      'I am not letting that list out of my hands. So I am afraid you are taking me with you.',
    ]);
    p.recruit('kestrel');
    p.setFlag('kestrel_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Kestrel joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('kestrel');
  },

  /** Oda, sitting in a shop in Harrowmere, waiting to be asked properly. */
  *recruit_oda(game, ctx) {
    const p = game.party;
    if (p.roster.has('oda')) {
      yield* say(game, 'Oda', ['Still water. Still here.']);
      return;
    }
    const choice = yield* game.dialogue.ask(
      'An old man is sitting perfectly still beside the shelves with his eyes shut. He has not bought anything.',
      ['Ask him to fight with you', 'Ask what he is waiting for', 'Leave him alone'],
      { speaker: 'Grandmaster Oda', cancelable: true },
    );
    if (choice === 2 || choice < 0) { game.dialogue.close(); return; }
    if (choice === 1) {
      yield* say(game, 'Grandmaster Oda', [
        'For someone to ask the other question.',
        'Most people ask this one. It is a good question and it is not the useful one.',
      ]);
    }
    yield* cinematic(game, true);
    yield* say(game, 'Grandmaster Oda', [
      'The school at Ashenhall taught eight forms. I am the ninth student and there is no ninth form.',
      'What is left, when the thing you were made for is gone? That is the whole of my discipline now.',
      'You are carrying an answer to that around your neck and you do not know it. Yes. I will come.',
    ]);
    p.recruit('oda');
    p.setFlag('oda_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Grandmaster Oda joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('oda');
  },

  /** Rusk, standing in the Engine House. Salvage that never stopped running. */
  *recruit_rusk(game, ctx) {
    const p = game.party;
    if (p.roster.has('rusk')) {
      yield* say(game, 'Rusk', ['FUNCTIONING. THAT IS NOT THE SAME AS WELL.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'A construct stands against the far wall, two heads taller than anyone here, with eleven years of dust on its shoulders.',
      'As you approach, its core lights.',
    ]);
    yield* say(game, 'Rusk', [
      'QUERY: ARE YOU THE RELIEF.',
      'I HAVE BEEN ON THIS WALL SINCE YEAR FORTY-ONE. NOBODY HAS SAID STAND DOWN.',
    ]);
    yield* say(game, 'Vesna', ['Who put you here?']);
    yield* say(game, 'Rusk', [
      'A MAN IN A CHANCELLOR\'S COAT. HE SAID IT WOULD BE AN HOUR.',
      'THERE IS A NAME IN MY LATTICE AND IT IS NOT MINE. I WOULD LIKE TO GIVE IT BACK.',
    ]);
    p.recruit('rusk');
    p.setFlag('rusk_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['Rusk joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('rusk');
  },

  /**
   * The Mask. Turns up at the Ninth Well after the world breaks, and will not
   * explain itself. The last recruit, and the only optional one.
   */
  *recruit_mask(game, ctx) {
    const p = game.party;
    if (p.roster.has('themask')) {
      yield* say(game, 'The Mask', ['…']);
      return;
    }
    if (p.worldState !== 'ruin') {
      yield* say(game, null, ['A figure stands at the shaft head with its back to you. When you look again, there is nobody there.']);
      return;
    }
    yield* cinematic(game, true);
    yield* say(game, null, [
      'The figure is still here. It has been here every time. It is wearing something over its face that is not quite a mask.',
      'It copies your posture exactly. When you shift your weight, it shifts first.',
    ]);
    const choice = yield* game.dialogue.ask('It waits.', ['Bow', 'Speak to it', 'Walk past'], { cancelable: true });
    if (choice === 2 || choice < 0) { game.dialogue.close(); yield* cinematic(game, false); return; }
    if (choice === 0) yield* say(game, null, ['You bow. It bows, a half-second before you finish.']);
    else yield* say(game, null, ['You speak. It moves its mouth in time with yours and makes no sound.']);
    yield* say(game, null, ['It falls into step behind you.']);
    p.recruit('themask');
    p.setFlag('mask_joined');
    ctx.field?.refreshParty();
    yield* say(game, null, ['The Mask joined the party.']);
    yield* cinematic(game, false);
    p.completeQuest('mask');
  },

  /** Reading the roadside plaque the first time gives a nudge toward the fen. */
  *barrow_hint(game) {
    yield* say(game, null, [
      'Boot prints in the mud, going in. None coming out.',
      'The seal on the barrow door has been cut, recently and badly.',
    ]);
    if (game.party.questStage('barrow') < 1) game.party.advanceQuest('barrow', 1);
  },
};

export function eventById(id) {
  return EVENTS[id] || null;
}
