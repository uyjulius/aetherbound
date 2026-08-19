class_name EventsVol1
extends RefCounted
##
##
## Scripted events.
##
## Each event is a generator receiving `(game, ctx)`, where ctx carries the
## field state and whatever triggered it. Written as coroutines so a scene reads
## top to bottom in source the way it plays on screen:
##
## yield* say('Vesna', 'It answered me.');
## yield* game.startBattleScene({ enemies: ['bogfather'] }, { boss: true });
## yield* grant(game, { kind: 'esper', id: 'hollowking' });
##
## Events fire from map triggers, NPCs and objects. `once: true` on a trigger
## plus a story flag is the normal pattern for anything that must not repeat.
##
##
## Translated from `src/data/events.js` by `tools/translate-events.mjs`, which copies the
## dialogue rather than retyping it and rewrites only the shape around it. Every scene
## here is compared against the reference's own transcript by
## `tools/events-parity.mjs`, under five branch policies.

const IDS := [
	"fenbarrow_boss", "harrowmere_intro", "recruit_aurelian", "recruit_bastian",
	"ferran_warden", "ashenhall_reliquary", "standing_oak", "toll_baron",
	"cinderspine_wyrm", "ninthwell_warden", "ninthwell_finale", "recruit_idris",
	"recruit_osric", "recruit_maret", "cataclysm", "recruit_tam",
	"recruit_ilsabet", "recruit_kestrel", "recruit_oda", "recruit_rusk",
	"recruit_mask", "barrow_hint",
]


static func run(id: String, ctx: EventContext) -> void:
	match id:
		"fenbarrow_boss": await fenbarrow_boss(ctx)
		"harrowmere_intro": await harrowmere_intro(ctx)
		"recruit_aurelian": await recruit_aurelian(ctx)
		"recruit_bastian": await recruit_bastian(ctx)
		"ferran_warden": await ferran_warden(ctx)
		"ashenhall_reliquary": await ashenhall_reliquary(ctx)
		"standing_oak": await standing_oak(ctx)
		"toll_baron": await toll_baron(ctx)
		"cinderspine_wyrm": await cinderspine_wyrm(ctx)
		"ninthwell_warden": await ninthwell_warden(ctx)
		"ninthwell_finale": await ninthwell_finale(ctx)
		"recruit_idris": await recruit_idris(ctx)
		"recruit_osric": await recruit_osric(ctx)
		"recruit_maret": await recruit_maret(ctx)
		"cataclysm": await cataclysm(ctx)
		"recruit_tam": await recruit_tam(ctx)
		"recruit_ilsabet": await recruit_ilsabet(ctx)
		"recruit_kestrel": await recruit_kestrel(ctx)
		"recruit_oda": await recruit_oda(ctx)
		"recruit_rusk": await recruit_rusk(ctx)
		"recruit_mask": await recruit_mask(ctx)
		"barrow_hint": await barrow_hint(ctx)


## The Bogfather. Crossing into the barrow chamber wakes it.
static func fenbarrow_boss(ctx: EventContext) -> void:
	if ctx.has_flag("bogfather_slain"):
		return

	await ctx.cinematic(true)
	await ctx.say(null, ["The standing water at the far end of the chamber is not water."])
	await ctx.tremor(1.4, 0.55)
	await ctx.say("Vesna", ["It has been waiting. I can feel how long.", "Nine hundred years of being *bored*."])
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["bogfather"]}, {"boss": true, "terrain": "cave", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("bogfather_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["The thing comes apart the way a wave does — all at once, and then not at all.", "What is left behind is a shard of something colder than the cave."])
	await ctx.grant_chest({"kind": "esper", "id": "hollowking", "label": "a shard of magicite"}, ctx.field)
	await ctx.say("Vesna", ["This is what the Imperium is digging for.", "Not weapons. *People.* Something was a person, once, inside every one of these."])
	await ctx.cinematic(false)
	ctx.complete_quest("barrow")


## Harrowmere's elder sends the player south. The opening hook.
static func harrowmere_intro(ctx: EventContext) -> void:
	# An NPC whose event has already fired must still have something to say —
	# silently doing nothing on a second approach reads as a broken NPC.
	if ctx.has_flag("intro_done"):
		if ctx.has_flag("bogfather_slain"):
			await ctx.say("Elder Sabbath", ["You shut it, then. Or opened it wider. We will know soon enough.", "Go to Solmere. Ask for the Marchetti twins, and show them what you carry."])
		else:
			await ctx.say("Elder Sabbath", ["The barrow lies south-west, past the fen. Take the road while it is still a road."])
		return
	ctx.set_flag("intro_done")
	ctx.start_quest_at("barrow", 0)
	await ctx.cinematic(true)
	await ctx.say("Elder Sabbath", ["You came back with it still humming, then.", "The Ferrans have opened the barrow in the fen. Whatever they were looking for, they did not find it — they found the door.", "Go and shut it. Or go and see. I have stopped pretending those are different errands."])
	await ctx.cinematic(false)


## Aurelian joins. Gated on the barrow, so the player arrives with proof.
static func recruit_aurelian(ctx: EventContext) -> void:
	if ctx.in_roster("aurelian"):
		if ctx.has_flag("bastian_joined"):
			await ctx.say("Aurelian", ["My brother is sulking about the fuel ratios again. Ignore him; he is usually right."])
		else:
			await ctx.say("Aurelian", ["Find Bastian in the works below. He will not come for me, but he might come for you."])
		return
	if not ctx.has_flag("bogfather_slain"):
		await ctx.say("Aurelian Marchetti", ["You want an audience, and I want four hours of sleep. Neither of us is getting what we want today.", "Bring me something I do not already know. There is a barrow in the fen the Ferrans opened and then very quickly stopped talking about."])
		return

	await ctx.cinematic(true)
	await ctx.say("Aurelian Marchetti", ["Let me see it. …Ah.", "That is not a battery. That is a *name*, held in a lattice, and it is still legible.", "Every measure of aether this city draws, we draw from one of these. I have told myself for eleven years that ours was empty."])
	await ctx.say("Vesna", ["Was it?"])
	await ctx.say("Aurelian Marchetti", ["No.", "Then we had better go and find out what the Chancellor intends to do with a well full of people. I am coming with you."])
	var m = ctx.recruit("aurelian")
	ctx.set_flag("aurelian_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Aurelian Marchetti joined the party."])
	await ctx.cinematic(false)
	if ctx.quest_stage("engine") < 0:
		ctx.start_quest_at("engine", 0)


## /** Bastian joins, if Aurelian already has. */
static func recruit_bastian(ctx: EventContext) -> void:
	if ctx.in_roster("bastian"):
		await ctx.say("Bastian", ["Say the word and I will put someone through a wall for you. Professionally."])
		return
	if not ctx.has_flag("aurelian_joined"):
		await ctx.say("Bastian Marchetti", ["If my brother sent you, the answer is no.", "If he did not send you, the answer is also no, but I will be nicer about it."])
		return
	await ctx.cinematic(true)
	await ctx.say("Bastian Marchetti", ["He is going himself. Actually going, not sending a memorandum.", "Then it is worse than he is saying. It always is.", "Fine. Somebody has to carry the heavy end."])
	ctx.recruit("bastian")
	ctx.set_flag("bastian_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Bastian Marchetti joined the party."])
	await ctx.cinematic(false)


## The Ferran Warden. Guards the annexe; beating it opens the keep.
static func ferran_warden(ctx: EventContext) -> void:
	if ctx.has_flag("warden_slain"):
		return

	await ctx.cinematic(true)
	await ctx.say(null, ["The annexe doors are already open. Nothing inside is standing.", "At the far end, something the size of a cart unfolds itself off the floor."])
	await ctx.tremor(1.2, 0.6)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["ferranwarden"]}, {"boss": true, "terrain": "cobble", "scenery": "none", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("warden_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["The thing folds down and stays folded. Its core goes dark by degrees, like a room being left."])
	await ctx.say("Vesna", ["There was a name in it. I heard it as it stopped.", "It was a woman's name, and it was recent."])
	if ctx.in_roster("aurelian"):
		await ctx.say("Aurelian", ["Recent. Not a thousand years ago — *recent*.", "They are not digging these up any more. They are making them."])
	await ctx.cinematic(false)
	ctx.advance_quest("engine", 1)


## Ashenhall's reliquary. The Eighth Lantern has been keeping vigil for a
## thousand years and does not intend to be relieved.
static func ashenhall_reliquary(ctx: EventContext) -> void:
	if ctx.has_flag("lantern_slain"):
		return

	await ctx.cinematic(true)
	await ctx.say(null, ["The ninth alcove is lit. Something is sitting in front of it with its back to you.", "It has been sitting there a very long time."])
	await ctx.say("Vesna", ["It is not going to let us take it."])
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["eighthlantern"]}, {"boss": true, "terrain": "marble", "scenery": "none", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("lantern_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["The light goes out of it slowly, the way a lamp does when you carry it into wind.", "The ninth lantern comes free of the alcove without resistance, as though it had been waiting to be asked."])
	await ctx.grant_chest({"kind": "esper", "id": "ninthlantern", "label": "the Ninth Lantern"}, ctx.field)
	await ctx.say("Vesna", ["She was the keeper. She stayed so the last one would not be taken.", "And we took it."])
	await ctx.cinematic(false)
	ctx.complete_quest("lantern")
	ctx.advance_quest("engine", 2)


## The Standing Oak, on the world map. Optional, and the reward is a healing
## esper — the kind of thing a player who wanders should find.
static func standing_oak(ctx: EventContext) -> void:
	if ctx.has_flag("oak_slain"):
		await ctx.say(null, ["The stump is already greening over. It was never really a tree."])
		return
	var choice := await ctx.ask("The oak turns to face you. It is far too old to be a tree, and it knows your name.", ["Stand your ground", "Back away slowly"], {"cancelable": true})
	ctx.close_dialogue()
	if choice != 0:
		return

	var result := await ctx.battle({"enemies": ["greenmother_guardian"]}, {"boss": true, "terrain": "grass", "scenery": "field", "canFlee": false})
	if result != "victory":
		return
	ctx.set_flag("oak_slain")
	await ctx.say(null, ["What is left in the roots is warm, and green, and patient."])
	await ctx.grant_chest({"kind": "esper", "id": "greenmother", "label": "a shard of magicite"}, ctx.field)
	ctx.complete_quest("oak")


## The Toll Baron ambushes the road once the player has been through Solmere.
## A pure sidequest: he has no bearing on the plot and excellent loot.
static func toll_baron(ctx: EventContext) -> void:
	if ctx.has_flag("baron_slain"):
		await ctx.say(null, ["The road is quiet. Somebody has taken the barricade for firewood."])
		return
	await ctx.cinematic(true)
	await ctx.say("The Toll Baron", ["Road is mine. Has been since the garrison stopped patrolling it.", "The toll is everything you are carrying. I am told that is a lot, lately."])
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["tollbaron", "brigand", "brigand"]}, {"boss": true, "terrain": "dirt", "scenery": "field", "canFlee": false})
	if result != "victory":
		return
	ctx.set_flag("baron_slain")
	ctx.add_gold(2500)
	await ctx.say(null, ["His strongbox holds 2500 gil and a great deal of other people's correspondence."])
	ctx.complete_quest("baron")


## /** The Cinder Wyrm, at the top of the pass. */
static func cinderspine_wyrm(ctx: EventContext) -> void:
	if ctx.has_flag("wyrm_slain"):
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The snow ahead is not settling. It is being breathed on.", "It does not roar. It inhales, and the whole pass goes dark."])
	await ctx.tremor(1.6, 0.7)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["cinderwyrm"]}, {"boss": true, "terrain": "snow", "scenery": "snow", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("wyrm_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["It falls a long way, and the sound arrives a long time after it should.", "The snow where it lay is glass."])
	await ctx.say("Vesna", ["No name in that one. Nothing in it at all.", "It was only ever an animal. Someone woke it and pointed it at the road."])
	await ctx.cinematic(false)
	ctx.complete_quest("pass")


## /** The Warden of the Ninth Well guards the shaft head. */
static func ninthwell_warden(ctx: EventContext) -> void:
	if ctx.has_flag("wellwarden_slain"):
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The gallery opens onto the Well. The draw machinery is still running, and it is running on nothing — the intake pipes are dry.", "Something is standing over the shaft with its back to it, the way a dog stands over a bone."])
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["enginewarden"]}, {"boss": true, "terrain": "cobble", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("wellwarden_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["The machinery stops. In the quiet, something far below answers it."])
	await ctx.cinematic(false)
	ctx.advance_quest("engine", 3)


## The finale. Vhaine, then the ending.
static func ninthwell_finale(ctx: EventContext) -> void:
	if ctx.has_flag("game_complete"):
		return

	await ctx.cinematic(true)
	ctx.play_music("memory", {"fade": 1.0})
	await ctx.say(null, ["The chamber beneath the Well is not a chamber. It is the inside of something.", "Chancellor Aurek Vhaine is standing at the centre of it with his coat off, which is somehow the worst detail."])
	await ctx.say("Vhaine", ["You brought a *sword* to the end of the world?", "I have been very patient with all of you. I dug for eleven years and found exactly one thing worth having, and it was not power.", "It was the discovery that there is no difference — none, not one — between a person and a battery. Only paperwork."])
	await ctx.say("Vesna", ["There was a name in every one of them.", "There is a name in me."])
	await ctx.say("Vhaine", ["Yes. And when I am finished, it will be the last one."])
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["vhaineshadow"]}, {"boss": true, "terrain": "cave", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	# --- the ending -------------------------------------------------------
	ctx.set_flag("game_complete")
	ctx.complete_quest("engine")
	ctx.play_music("hope", {"fade": 1.6})
	await ctx.cinematic(true)
	await ctx.say(null, ["He comes apart the way the others did, and there is a name inside him too.", "It is his own, and it is very old, and it has been in there a long time."])
	await ctx.say("Vesna", ["He was one of them. From the beginning.", "Somebody put him in a lattice a thousand years ago, and he got out, and he spent every year since trying to make it true that it had not mattered."])
	if ctx.in_roster("aurelian"):
		await ctx.say("Aurelian", ["Solmere runs on eleven of these. Eleven names.", "I am going home to turn my city off."])
	if ctx.in_roster("bastian"):
		await ctx.say("Bastian", ["I will carry the heavy end."])
	await ctx.say("Vesna", ["Then we start at the bottom of the Well and we work up.", "One at a time. We say the names out loud as we go."])
	await ctx.say(null, ["The draw machinery above them stays stopped.", "It is going to be a very long walk, and none of it is going to be quick, and that is the point."])
	await ctx.say(null, ["— AETHERBOUND —"])
	await ctx.cinematic(false)
	await ctx.show_ending()


## Idris, at the burnt shrine. He is the last retainer of a house that no
## longer exists and has been sitting here since it stopped existing.
static func recruit_idris(ctx: EventContext) -> void:
	if ctx.in_roster("idris"):
		await ctx.say("Idris", ["The wood is quieter with company in it. I had forgotten that."])
		return
	if not ctx.has_flag("lantern_slain"):
		await ctx.say("Ser Idris Vance", ["I am waiting for something. You are not it.", "When Ashenhall gives up its last lamp, I will know. Until then, walk on."])
		return
	await ctx.cinematic(true)
	await ctx.say("Ser Idris Vance", ["You have it. I felt the hall go out.", "Forty years I sat here so that no one would carry it off, and I did not stand up, and someone carried it off."])
	await ctx.say("Vesna", ["We can put it back."])
	await ctx.say("Ser Idris Vance", ["No. You can put *her* back. There is a difference and it is the only one that has ever mattered.", "Show me where the well is."])
	ctx.recruit("idris")
	ctx.set_flag("idris_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Ser Idris Vance joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("idris")


## Osric, sitting in his own shipwreck. Joins for the least noble reason of
## anyone in the party, which is why he is the easiest to trust.
static func recruit_osric(ctx: EventContext) -> void:
	if ctx.in_roster("osric"):
		await ctx.say("Osric", ["Still afloat. Metaphorically. The ship is very much not."])
		return
	var choice := await ctx.ask("A man is sitting in the wreck of an airship, shuffling a deck of cards that is missing most of its cards.", ["Ask what happened", "Ask him to come with you", "Leave him to it"], {"speaker": "Osric Vale", "cancelable": true})
	if choice == 2 or choice < 0:
		ctx.close_dialogue()
		return
	if choice == 0:
		await ctx.say("Osric Vale", ["The Imperium requisitioned my lift-aether. All of it. Politely, with a form.", "A ship without lift is a very expensive shed, and I am sitting in my shed."])
	await ctx.cinematic(true)
	await ctx.say("Osric Vale", ["You are going to the Ninth Well. Everyone going anywhere is going to the Ninth Well.", "Here is my position. I want my ship back, and the only aether left in the world is at the bottom of that hole, and I am not brave enough to go down there alone.", "That is the entire offer. No principles. Deal?"])
	ctx.recruit("osric")
	ctx.set_flag("osric_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Osric Vale joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("osric")


## Maret defects at the outpost, once the Warden has shown her what the
## Imperium has actually been making.
static func recruit_maret(ctx: EventContext) -> void:
	if ctx.in_roster("maret"):
		await ctx.say("Maret", ["I signed the orders that built that thing. Do not let me forget it."])
		return
	if not ctx.has_flag("warden_slain"):
		await ctx.say("General Maret Sunder", ["Outpost business. Move along, and do not go into the annexe."])
		return
	await ctx.cinematic(true)
	await ctx.say("General Maret Sunder", ["I heard it stop. I have heard a lot of them stop; that one had a voice.", "I countersigned the requisition that filled it. I did not read past the tonnage."])
	await ctx.say("Vesna", ["You could stop signing."])
	await ctx.say("General Maret Sunder", ["I could do rather more than that.", "The Chancellor keeps his own counsel and his own keys, and I know where he keeps both. Take me with you."])
	ctx.recruit("maret")
	ctx.set_flag("maret_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Maret Sunder joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("maret")


## The cataclysm. Fires when the player first reaches the Well's lower
## galleries with the Warden dealt with — Vhaine pulls the Ninth Well open
## and the world changes state.
##
## This is the hinge of the game: the same continent, the same road, the same
## towns, all read differently afterwards. It is deliberately *not* a new set
## of maps.
static func cataclysm(ctx: EventContext) -> void:
	if ctx.world_state == "ruin":
		return

	await ctx.cinematic(true)
	ctx.play_music("chase", {"fade": 0.4})
	await ctx.say(null, ["Far below, something enormous takes a breath it has not taken in a thousand years."])
	await ctx.tremor(2.2, 0.9)
	await ctx.say("Vhaine", ["THERE. Do you feel that? That is the sound of the paperwork being completed."])
	ctx.flash([1, 0.85, 0.6], 1.0)
	await ctx.over(2.4, func(t: float, _dt: float):
		ctx.shake(0.9 * (1 - t * 0.4), 1.6)
	)
	await ctx.say(null, ["The light goes out of the world for eleven seconds.", "When it comes back, it comes back the wrong colour, and it does not change again."])
	await ctx.over(1.4, func(t: float, _dt: float):
		pass
	)

	ctx.world_state = "ruin"
	ctx.set_flag("cataclysm")
	ctx.start_quest_at("after", 0)
	await ctx.say("Vesna", ["It is still here. Everything is still here.", "That is going to be the hard part."])

	# The airship is handed over here rather than earned in a side scene. The
	# ruined world is the point at which the map stops being a road with
	# places on it and becomes a place to search, and the player needs the
	# means to search it in the same breath as the reason to.
	ctx.set_flag("airship")
	await ctx.say("Corvin", ["The Guild kept a ship moored above Harrowmere for the assay runs.", "Nobody is coming to collect it now."])
	await ctx.cinematic(false)

	# Reload the current map so the ruined variant takes effect immediately.
	await ctx.say(null, ["You are thrown clear, onto the road above."])
	ctx.goto_map("overworld", "ferran")


## /** Tam, in the ruined world. Feral, and the only one who is doing better. */
static func recruit_tam(ctx: EventContext) -> void:
	if ctx.in_roster("tam"):
		await ctx.say("Tam", ["Quiet now! Listen. …No. Gone. Was big."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["A child is crouched in the middle of the road with a beast the size of a cart, and the beast is letting them.", "The beast notices you, thinks about it, and leaves."])
	await ctx.say("Tam", ["You walk loud. Everything walks loud since the sky broke. Except them. They are quiet now.", "You go to the hole? I go to the hole. I show you quiet."])
	ctx.recruit("tam")
	ctx.set_flag("tam_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Tam joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("tam")


## /** Ilsabet, in ruined Harrowmere, painting the thing that happened. */
static func recruit_ilsabet(ctx: EventContext) -> void:
	if ctx.in_roster("ilsabet"):
		await ctx.say("Ilsabet", ["Hold still. Not for a portrait. I want your proportions for something worse."])
		return
	await ctx.cinematic(true)
	await ctx.say("Ilsabet Rook", ["I am painting it. All of it. Somebody has to and everyone else is busy being sad.", "My master says you paint a thing so that later there is proof it looked like that."])
	await ctx.say("Vesna", ["Where is your master?"])
	await ctx.say("Ilsabet Rook", ["In the picture.", "I am coming with you. I want to see the hole it came out of, and I want to get it *right*."])
	ctx.recruit("ilsabet")
	ctx.set_flag("ilsabet_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Ilsabet Rook joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("ilsabet")


## /** Kestrel, in ruined Solmere, still filing. */
static func recruit_kestrel(ctx: EventContext) -> void:
	if ctx.in_roster("kestrel"):
		await ctx.say("Kestrel", ["Catalogued. Cross-referenced. Deeply unhappy about both."])
		return
	await ctx.cinematic(true)
	await ctx.say("Kestrel", ["Vellum Archive, Solmere branch. I am the branch.", "I have the draw records for every well on the continent, going back four hundred years, and I have read all of them twice since the sky changed."])
	await ctx.say("Kestrel", ["There were never a thousand espers. There were sixty-one, and they all had names, and I have every one of them written down.", "I am not letting that list out of my hands. So I am afraid you are taking me with you."])
	ctx.recruit("kestrel")
	ctx.set_flag("kestrel_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Kestrel joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("kestrel")


## /** Oda, sitting in a shop in Harrowmere, waiting to be asked properly. */
static func recruit_oda(ctx: EventContext) -> void:
	if ctx.in_roster("oda"):
		await ctx.say("Oda", ["Still water. Still here."])
		return
	var choice := await ctx.ask("An old man is sitting perfectly still beside the shelves with his eyes shut. He has not bought anything.", ["Ask him to fight with you", "Ask what he is waiting for", "Leave him alone"], {"speaker": "Grandmaster Oda", "cancelable": true})
	if choice == 2 or choice < 0:
		ctx.close_dialogue()
		return
	if choice == 1:
		await ctx.say("Grandmaster Oda", ["For someone to ask the other question.", "Most people ask this one. It is a good question and it is not the useful one."])
	await ctx.cinematic(true)
	await ctx.say("Grandmaster Oda", ["The school at Ashenhall taught eight forms. I am the ninth student and there is no ninth form.", "What is left, when the thing you were made for is gone? That is the whole of my discipline now.", "You are carrying an answer to that around your neck and you do not know it. Yes. I will come."])
	ctx.recruit("oda")
	ctx.set_flag("oda_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Grandmaster Oda joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("oda")


## /** Rusk, standing in the Engine House. Salvage that never stopped running. */
static func recruit_rusk(ctx: EventContext) -> void:
	if ctx.in_roster("rusk"):
		await ctx.say("Rusk", ["FUNCTIONING. THAT IS NOT THE SAME AS WELL."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["A construct stands against the far wall, two heads taller than anyone here, with eleven years of dust on its shoulders.", "As you approach, its core lights."])
	await ctx.say("Rusk", ["QUERY: ARE YOU THE RELIEF.", "I HAVE BEEN ON THIS WALL SINCE YEAR FORTY-ONE. NOBODY HAS SAID STAND DOWN."])
	await ctx.say("Vesna", ["Who put you here?"])
	await ctx.say("Rusk", ["A MAN IN A CHANCELLOR'S COAT. HE SAID IT WOULD BE AN HOUR.", "THERE IS A NAME IN MY LATTICE AND IT IS NOT MINE. I WOULD LIKE TO GIVE IT BACK."])
	ctx.recruit("rusk")
	ctx.set_flag("rusk_joined")
	ctx.refresh_party()
	await ctx.say(null, ["Rusk joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("rusk")


## The Mask. Turns up at the Ninth Well after the world breaks, and will not
## explain itself. The last recruit, and the only optional one.
static func recruit_mask(ctx: EventContext) -> void:
	if ctx.in_roster("themask"):
		await ctx.say("The Mask", ["…"])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["A figure stands at the shaft head with its back to you. When you look again, there is nobody there."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The figure is still here. It has been here every time. It is wearing something over its face that is not quite a mask.", "It copies your posture exactly. When you shift your weight, it shifts first."])
	var choice := await ctx.ask("It waits.", ["Bow", "Speak to it", "Walk past"], {"cancelable": true})
	if choice == 2 or choice < 0:
		ctx.close_dialogue()
		await ctx.cinematic(false)
		return
	if choice == 0:
		await ctx.say(null, ["You bow. It bows, a half-second before you finish."])
	else:
		await ctx.say(null, ["You speak. It moves its mouth in time with yours and makes no sound."])
	await ctx.say(null, ["It falls into step behind you."])
	ctx.recruit("themask")
	ctx.set_flag("mask_joined")
	ctx.refresh_party()
	await ctx.say(null, ["The Mask joined the party."])
	await ctx.cinematic(false)
	ctx.complete_quest("mask")


## /** Reading the roadside plaque the first time gives a nudge toward the fen. */
static func barrow_hint(ctx: EventContext) -> void:
	await ctx.say(null, ["Boot prints in the mud, going in. None coming out.", "The seal on the barrow door has been cut, recently and badly."])
	if ctx.quest_stage("barrow") < 1:
		ctx.advance_quest("barrow", 1)

