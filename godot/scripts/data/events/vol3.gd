class_name EventsVol3
extends RefCounted
##
##
## Scripted events, volume three — sidequests and optional scenes.
##
## Same contract as `EVENTS` and `VOL2_EVENTS`: every entry is a generator
## receiving `(game, ctx)` and written as a coroutine, so a scene reads top to
## bottom in source the way it plays on screen. Nothing in here is on the
## critical path.
##
## Volume two covered the cast. This one covers the places, and takes its
## shapes from what volume two did not do:
##
## - a chain of five that is *not* ordered (postbag_*). Three deliveries in
## three towns, in any order the player likes, and a fifth scene that will
## not open until all three flags are set. Volume two's chains are gated
## stage by stage; this one is gated on a count, so the player is never
## told which town to go to next and never blocked at the wrong door.
## - a quest that can be lost for good. The channel marks at Saltmarch have
## to be set before the world changes state, and after it there is no way
## back to them (saltmarch_withies).
## - a scene whose whole content is decided by who is standing in the active
## four (verrenholt_moot).
## - six hunts, standing at the end of roads nobody has to walk down, using
## the late bosses of `enemies-vol3.js`. Five of them are open the moment
## the sky changes; the sixth wants the other five done first.
##
## Nine of the twenty-two are gated on `party.worldState === 'ruin'`, because
## half of what this volume is about is places carrying on afterwards.
##
##
## First of `ids` standing in the active four, or null.
##
## Deliberately the *active* party rather than the roster: a scene that turns
## on who speaks has to turn on who is actually there, or the player never sees
## it change.
##
##
## Hand over magicite the player may already be carrying.
##
## Every shard in the game is also sitting in a chest somewhere, and a scene
## that ends by announcing a thing the party already owns is a scene that ends
## badly. If the shard is already in hand, the scene says so and pays in metal
## instead.
##
##
## Translated from `src/data/events-vol3.js` by `tools/translate-events.mjs`, which copies the
## dialogue rather than retyping it and rewrites only the shape around it. Every scene
## here is compared against the reference's own transcript by
## `tools/events-parity.mjs`, under five branch policies.

const POSTBAG_LETTERS := ["letter_sexton", "letter_pier", "letter_bell"]

const IDS := [
	"postbag_found", "postbag_sexton", "postbag_pier", "postbag_bell",
	"postbag_last", "carter_pass", "saltmarch_withies", "verrenholt_moot",
	"aurelian_pump", "highfell_shelf", "cabinet_of_species", "duncastle_bailey",
	"thornmarch_circuit", "emberlyn_caravan", "lighthouse_relit", "cinderspine_thaw",
	"sump_that_drank", "standing_pane", "brood_of_glass", "last_shift",
	"tenth_well", "first_engine",
]


static func run(id: String, ctx: EventContext) -> void:
	match id:
		"postbag_found": await postbag_found(ctx)
		"postbag_sexton": await postbag_sexton(ctx)
		"postbag_pier": await postbag_pier(ctx)
		"postbag_bell": await postbag_bell(ctx)
		"postbag_last": await postbag_last(ctx)
		"carter_pass": await carter_pass(ctx)
		"saltmarch_withies": await saltmarch_withies(ctx)
		"verrenholt_moot": await verrenholt_moot(ctx)
		"aurelian_pump": await aurelian_pump(ctx)
		"highfell_shelf": await highfell_shelf(ctx)
		"cabinet_of_species": await cabinet_of_species(ctx)
		"duncastle_bailey": await duncastle_bailey(ctx)
		"thornmarch_circuit": await thornmarch_circuit(ctx)
		"emberlyn_caravan": await emberlyn_caravan(ctx)
		"lighthouse_relit": await lighthouse_relit(ctx)
		"cinderspine_thaw": await cinderspine_thaw(ctx)
		"sump_that_drank": await sump_that_drank(ctx)
		"standing_pane": await standing_pane(ctx)
		"brood_of_glass": await brood_of_glass(ctx)
		"last_shift": await last_shift(ctx)
		"tenth_well": await tenth_well(ctx)
		"first_engine": await first_engine(ctx)


## A step several scenes share, translated from the module helper of the
## same name.
static func grant_esper(ctx: EventContext, id: Variant = null, label: Variant = null, field: Variant = null, fallbackId: Variant = null, fallbackLabel: Variant = null) -> void:
	if not ctx.has_esper(id):
		await ctx.grant_chest({"kind": "esper", "id": id, "label": label}, ctx.field)
		return
	await ctx.say(null, ["The shard is %s, and there is one of those in the party's keeping already." % [ctx.esper_name(id)], "Both are the same weight, and neither of them is any colder than the other."])
	await ctx.grant_chest({"kind": "item", "id": fallbackId, "label": fallbackLabel}, ctx.field)


## /** The satchel in the ditch. Starts the round. */
static func postbag_found(ctx: EventContext) -> void:
	if ctx.has_flag("postbag_closed"):
		await ctx.say("Yard Porter", ["Bag is back on its hook by the weighbridge. Nobody has touched it and nobody is going to."])
		return
	if ctx.has_flag("postbag"):
		var done = ctx.count_flags(POSTBAG_LETTERS)
		if done == 0:
			await ctx.say("Yard Porter", ["Three names on the sealed ones. A sexton at Verrenholt, a woman off the Saltmarch pier, and the bellringer up at Duncastle."])
		else:
			await ctx.say("Yard Porter", ["%s of the three, by my count, and I do count." % [done], "The rest are where they were. They keep better than most freight."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["A leather satchel in the ditch under the hedge. The strap has been cut through in one pass rather than worn through in ten years.", "Fourteen letters. Seven are sealed. The seven that are open were opened carefully and then put back the right way round."])
	await ctx.say("Yard Porter", ["Almer Selby carried that. Parish post, Emberlyn to the coast and back, twice a month, nine years.", "He stopped coming through in the spring. Nobody made much of it. A great many people stopped coming through in the spring."])
	await ctx.say("Vesna", ["Who has the round now."])
	await ctx.say("Yard Porter", ["Nobody has the round now. I go where the wagons go, and the wagons go where there is a load, and a letter is not a load.", "You lot are going everywhere. That is the entire trade. That is all it ever was."])
	await ctx.say(null, ["Three of the sealed letters have addresses still legible: a sexton at Verrenholt, a woman off the pier at Saltmarch, the bellringer at Duncastle.", "The fourth sealed one at the bottom has no frank on it at all."])
	ctx.set_flag("postbag")
	ctx.start_quest_at("postbag", 0)
	await ctx.cinematic(false)


## /** Verrenholt. The man it is addressed to is in the fourth row. */
static func postbag_sexton(ctx: EventContext) -> void:
	if ctx.has_flag("letter_sexton"):
		await ctx.say("Sexton Mab", ["It is in the book, on his page, with the address copied into the margin. Nobody has come asking."])
		return
	if not ctx.has_flag("postbag"):
		await ctx.say("Sexton Mab", ["Fourth row is Hollises, mostly. The rest of the yard is whoever was here at the time.", "I dig all of them. That is not a claim to anything, it is a rota."])
		return
	await ctx.say("Sexton Mab", ["Tobe Hollis. Fourth row, third from the wall, two years and a bit.", "Give it here. I can read an address without opening it, which is more than the parish can say for itself."])
	await ctx.say("Vesna", ["Does it go in with him."])
	await ctx.say("Sexton Mab", ["The ground has enough in it.", "It goes in the book. I write down who is in each row and what came for them afterwards, and there are four other entries on that page with something written underneath."])
	await ctx.say(null, ["She copies the address into the margin in a hand a good deal better than the one on the envelope, and lays the letter flat between two pages."])
	await ctx.say("Sexton Mab", ["If anyone ever comes asking after him, that is where I point them.", "It has happened once. She did not open it either."])
	ctx.set_flag("letter_sexton")
	ctx.advance_quest("postbag", ctx.count_flags(POSTBAG_LETTERS))


## /** Saltmarch. She will not take it while anybody is watching. */
static func postbag_pier(ctx: EventContext) -> void:
	if ctx.has_flag("letter_pier"):
		await ctx.say(null, ["The boards where the letter sat are darker than the two either side of them.", "The woman is at the far end of the pier with her back to the town, which is where she is most days."])
		return
	if not ctx.has_flag("postbag"):
		await ctx.say("Woman on the Pier", ["High water at four. You are standing where the rope goes."])
		return
	await ctx.say(null, ["She looks at the address, then at the water, then at the address again."])
	await ctx.say("Woman on the Pier", ["That is his hand. He wrote small so he would not have to pay for the second sheet.", "Put it on the boards."])
	await ctx.say("Vesna", ["You can have it in your hand."])
	await ctx.say("Woman on the Pier", ["I did not say I did not want it. I said put it on the boards.", "I am not opening that with four strangers on the pier and the tide coming in behind them."])
	await ctx.say(null, ["The letter goes on the boards, weighted with a shackle so the wind cannot have it.", "She does not move while anyone is still on the pier, and the party is a long time walking off it."])
	ctx.set_flag("letter_pier")
	ctx.advance_quest("postbag", ctx.count_flags(POSTBAG_LETTERS))


## /** Duncastle. Eleven years, four lines, and three of them about a horse. */
static func postbag_bell(ctx: EventContext) -> void:
	if ctx.has_flag("letter_bell"):
		await ctx.say("Bellringer Quill", ["I have got the hour right every day since. That is not connected to anything and I am aware of it."])
		return
	if not ctx.has_flag("postbag"):
		await ctx.say("Bellringer Quill", ["Hour, half hour, and the muffled peal for a burial. Three jobs. I have had the rope forty years and it has had me."])
		return
	await ctx.cinematic(true)
	await ctx.say("Bellringer Quill", ["That is a Ferran frank and that is my brother's hand, and those two things have been in the same room before.", "Eleven years. He took their coin at the gate and I said something to him there that I have had eleven years to improve on."])
	await ctx.say(null, ["He reads it standing in the bailey with his cap still on."])
	await ctx.say("Bellringer Quill", ["Four lines. Three of them are about a horse.", "He has spelled my name the way he spelled it at seven, which I let him have then and am not going to stop letting him have now."])
	await ctx.say("Vesna", ["And the fourth line."])
	await ctx.say("Bellringer Quill", ["That one is mine."])
	await ctx.say(null, ["He rings the hour four minutes early. The second and third strokes come too close together and he leaves them where they fell."])
	ctx.set_flag("letter_bell")
	ctx.advance_quest("postbag", ctx.count_flags(POSTBAG_LETTERS))
	await ctx.cinematic(false)


## /** The unfranked one. It was in his own hand and it never went anywhere. */
static func postbag_last(ctx: EventContext) -> void:
	if ctx.has_flag("postbag_closed"):
		await ctx.say(null, ["The satchel hangs on the gate of a house by the mill. Somebody has re-tied the cut strap, badly, and left it hanging."])
		return
	if ctx.count_flags(POSTBAG_LETTERS) < 3:
		await ctx.say(null, ["The last sealed letter is in the same hand as the round book on the flap, addressed to a house by the mill at Harrowmere.", "It has been carried for nine years and franked by nobody. There are three other letters in the bag with people still attached to them."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The bag is empty apart from the last one, which is addressed in the carrier's own hand to a house by the mill at Harrowmere.", "A man who walked past that door twice a month for nine years never once put it under it."])
	var choice := await ctx.ask("It is sealed with a smear of wax and a thumb.", ["Put it under the door", "Open it"], {"cancelable": false})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.say(null, ["The house by the mill is standing and has somebody in it. The letter goes under the door at about eleven in the morning.", "Nobody in the party waits to see the light change on the other side of it, and the walk back to the road takes longer than it should."])
		await ctx.say("Vesna", ["We are not going to know."])
		await ctx.say(null, ["Nobody argues with that, and the argument would not have been about the letter."])
	else:
		await ctx.say(null, ["It is not a letter. It is his round, written out in order — every town, the times he made between them, nine years of them, one line each.", "At the bottom is a figure, underlined twice, in the hand he used when he was pleased with himself."])
		await ctx.say(null, ["Underneath the figure, in a different ink and much later: still too slow."])
		await ctx.say("Vesna", ["He was going to give it to her when it was quicker."])

	await ctx.say(null, ["The satchel goes on the gate of the house by the mill. The bell off the strap comes away in the hand and stays in it."])
	ctx.add_item("wanderersbell")
	ctx.set_flag("postbag_closed")
	ctx.advance_quest("postbag", 4)
	await ctx.celebrate(["Obtained a Wanderer's Bell."], ctx.field)
	ctx.complete_quest("postbag")
	await ctx.cinematic(false)


## A dead carter's road pass. The paper outlives the man by regulation, which
## is the only interesting thing the regulation does.
static func carter_pass(ctx: EventContext) -> void:
	if ctx.has_flag("carter_pass"):
		await ctx.say("Toll Clerk Nabb", ["Two years and five months left on it. Do not lose it and do not let anybody at the checkpoint hold it for longer than reading takes."])
		return
	await ctx.say("Toll Clerk Nabb", ["A pass is issued against a name and a trade. Silt Road, Ferran checkpoint, three years from the stamp, no renewals.", "Doule Cane died in the second week of his. It has two years and seven months left on it and it does not know."])
	await ctx.say("Vesna", ["His wife cannot use it."])
	await ctx.say("Toll Clerk Nabb", ["His wife is not a carter. That is the whole of the objection and I have put it in writing twice, in the same words, to the same office.", "She is at the yard end. Ask her yourself. If she says yes I will strike his name and write another one, and I will be extremely slow about the part where I look at your face."])
	var choice := await ctx.ask("The yard end of the market is four minutes away and it is the sort of thing that can be left undone.", ["Go and ask her", "Leave it"], {"speaker": "Toll Clerk Nabb", "cancelable": true})
	ctx.close_dialogue()
	if choice != 0:
		return

	await ctx.cinematic(true)
	await ctx.say("Carter's Widow", ["Take it. It is on the shelf with his cup, and I have moved the pair of them once, to dust under them, and put them back where they were.", "Eleven years he was on that road. The pass is the only thing the road gave him that has outlasted him, and I would rather it went through a gate than sat on a shelf."])
	await ctx.say(null, ["Nabb strikes the name, writes another one, blots it, and turns the book round."])
	await ctx.say("Toll Clerk Nabb", ["That is a forgery committed in front of a clerk, which is a different offence to the one you were expecting and a considerably lighter one.", "Hold it up at the checkpoint. Do not hand it over. They are not allowed to keep it and they will try, because everybody tries."])
	await ctx.grant_chest({"kind": "key", "id": "siltroadpass", "label": "a Silt Road Pass"}, ctx.field)
	ctx.set_flag("carter_pass")
	ctx.complete_quest("carter")
	await ctx.cinematic(false)


## The channel marks at Saltmarch. This one can be lost.
##
## The withies go in before the world changes state or they do not go in at
## all: afterwards the pilot is gone south, the line is lying in the mud east
## of where it should be, and there is nothing here to complete. It is the
## only quest in the three volumes with a door that shuts.
static func saltmarch_withies(ctx: EventContext) -> void:
	if ctx.has_flag("withies_set"):
		if ctx.world_state == "ruin":
			await ctx.say("Harbour Pilot Dace", ["Channel is where we put it. Two boats in on the last tide, which is two more than the coast road has managed since the sky went.", "They came in on the marks in the dark. That is what the marks are for and nobody has ever thanked a withy."])
		else:
			await ctx.say("Harbour Pilot Dace", ["One and a half at the bend and the withies say so. I walk the line at low water out of habit and I have not had to move one since."])
		return
	if ctx.has_flag("withies_lost"):
		await ctx.say("Tide-Reeve Onna", ["There is water out there and no way through it. It is a strange thing for a port to be short of."])
		return
	# The door shuts here. Nothing about this branch offers a way back.
	if ctx.world_state == "ruin":
		await ctx.cinematic(true)
		await ctx.say(null, ["The withy line is down. What is left of it is lying east of where it should be, in the mud, still tied in its bundles.", "The board at the pier head where the tide was posted has come off two of its four nails and swings when the wind gets under it."])
		await ctx.say("Tide-Reeve Onna", ["Dace went south in the autumn. He said the channel had walked and he was not going to stand on a pier and be asked about it every day.", "Nothing has come in since. Nothing is going to. There is water out there and no way through it, and I have stopped putting the tide up."])
		await ctx.say("Vesna", ["It could be marked again."])
		await ctx.say("Tide-Reeve Onna", ["By somebody who knows where it is. That was one man and he is in the south.", "You could put sixty sticks in that mud tomorrow and every one of them would be a lie."])
		ctx.set_flag("withies_lost")
		if ctx.quest_stage("withies") >= 0:
			ctx.advance_quest("withies", 9)
		await ctx.cinematic(false)
		return

	if ctx.quest_stage("withies") < 0:
		ctx.start_quest_at("withies", 0)
	await ctx.say("Harbour Pilot Dace", ["Two fathom at the pier head, one and a half at the bend, and nothing whatever where the chart says three.", "The withies go in every spring or the channel walks. It has gone a boat's width west since the year before last, and I am the only man alive who knows that."])
	await ctx.say("Harbour Pilot Dace", ["It is willow, tar, and eight hundred gil. Then it is four days out on the flats with something in the weirs that objects to company.", "The parish has the four days. What the parish has not got is the eight hundred, and I have asked."])
	var choice := await ctx.ask("The flats are dry twice a day and not a minute longer than that.", ["Pay the eight hundred", "Not this spring"], {"speaker": "Harbour Pilot Dace", "cancelable": true})
	ctx.close_dialogue()
	if choice != 0:
		return
	if not ctx.spend_gold(800):
		await ctx.say("Harbour Pilot Dace", ["You are short. The tide is not interested and neither is the willow merchant."])
		return
	ctx.advance_quest("withies", 1)
	await ctx.say(null, ["The bundles go out on a flat-bottomed punt at first light. Something has been feeding in the weirs and has not finished."])
	var result := await ctx.battle({"enemies": ["weirmaw", "crustcrab", "saltferryman"]}, {"terrain": "sand", "scenery": "none", "canFlee": false})
	if result != "victory":
		return

	await ctx.cinematic(true)
	await ctx.say(null, ["Sixty withies go in over two days. On the third, Dace walks the whole line at dead low water and moves eleven of them without explaining any of the eleven."])
	await ctx.say("Harbour Pilot Dace", ["That one is right and it looks wrong. That is the one that matters. A stranger coming in at night follows the ones that look wrong."])
	await ctx.say(null, ["A boat comes in on the ninth day. It is the wrong boat, out of the north, with a cargo nobody in Saltmarch ordered, and the whole town is on the pier for it."])
	await ctx.say("Harbour Pilot Dace", ["Take the ward-plate off her. She came in on my marks and she is not going out on them until the master has paid harbour dues that he has already told me he cannot pay."])
	await ctx.grant_chest({"kind": "item", "id": "tidewardshield", "label": "a Tideward Shield"}, ctx.field)
	ctx.set_flag("withies_set")
	ctx.complete_quest("withies")
	await ctx.cinematic(false)


## The Verrenholt moot. Ninety people in a town built for four thousand, and
## an argument about the empty half of it.
##
## The entire content of this scene is whoever is standing in the active
## four. Each voice argues from their own trade and the town does what that
## voice makes it easy to do; the reeve's closing line is the same either
## way, because the reeve is the one who has to do the work.
static func verrenholt_moot(ctx: EventContext) -> void:
	if ctx.has_flag("moot_held"):
		if ctx.has_flag("moot_pulled"):
			await ctx.say("Reeve Hollis", ["Two streets down, the lead sold, the timber stacked under the moot hall wall where it is dry.", "Nobody has said anything about it to me. That is not the same as nobody having a view."])
		else:
			await ctx.say("Reeve Hollis", ["The east grid is standing and we are burning furze again. My hands have gone the colour of the furze.", "It was decided in a room with everybody in it, which is worth something in February and nothing at all in March."])
		return
	await ctx.cinematic(true)
	await ctx.say("Reeve Hollis", ["Ninety of us. Four hundred and six roofs, of which we are under nineteen.", "The east grid is empty from the cross street to the orchard. Timber, lead, and doorheads with names cut in them, and we are short of all three of the first two before the frost."])
	await ctx.say("Reeve Hollis", ["The moot is tonight and it has been tonight four times.", "You are not from here, which in a town this size is a qualification. One of you speak."])

	# Order is priority, not preference: the first of these standing in the
	# active four is the one the town hears.
	var VOICES = {"aurelian": {"pull": true, "lines": ["Ninety people and four hundred roofs. You are heating the ones you are not standing in, and you are doing it with furze.", "Take the east grid down before the frost and you are warm in March. Leave it up and you will hold this meeting again in March, colder, and with fewer of you in the room."]}, "bastian": {"pull": true, "lines": ["I will do the east grid. Two streets a week. Good timber stacked separately, lead off the roofs first so the rain does the rest of it for you.", "Somebody is going to do it badly in January. It might as well be done properly in October by somebody who is leaving afterwards."]}, "maret": {"pull": true, "lines": ["I have signed for the removal of a great many things and I did not read past the tonnage on any of them.", "Do it yourselves and write down who agreed to it. Not for the record. So that in five years it is a thing ninety people did and not a thing that happened."]}, "kestrel": {"pull": true, "lines": ["There is a name against every one of those houses in the parish roll, and I have read your roll. It is a good roll. The hand changes four times and the columns never do.", "Take the lead and the rafters. Leave the doorheads standing. A doorhead is where you check a roll from, and you will want to check it."]}, "corvin": {"pull": true, "lines": ["The lead is worth four times the timber and there is a man in Solmere who buys lead by weight and asks nothing at all.", "Take the roofs and leave the walls up. It still looks like a town from the road that way, and people give more to a town."]}, "ilsabet": {"pull": true, "lines": ["Give me a week on the east grid first. Not the pretty end. The end with the orchard in it.", "Then pull it down. I am not asking you to keep it. I am asking you not to be remembering it from memory in five years, because you will be wrong and you will be certain."]}, "oda": {"pull": false, "lines": ["You have asked four strangers what to do with your own houses, and you asked us before you asked each other.", "I have no view. I would like it minuted that I sat here for an hour and had no view."]}, "tam": {"pull": false, "lines": ["Roofs off is quiet. Burning is loud.", "Loud goes for miles now. Things come to look at loud. Take nothing until you have somewhere to put it that is not a fire."]}}

	var voice = ctx.speaking(VOICES.keys())
	var pull = null
	if voice:
		var entry = VOICES[voice["id"]]
		await ctx.say(voice["name"], entry["lines"])
		pull = entry["pull"]
	else:
		await ctx.say("Vesna", ["I have been in three towns this month that are still the size they were on the map.", "You are the only one that has admitted it out loud. That is the whole of what I have to offer and it is not advice."])
		pull = false

	await ctx.say(null, ["The moot goes on for another two hours after that, and none of the two hours is about the strangers."])
	if pull:
		await ctx.say("Reeve Hollis", ["East grid comes down, cross street to the orchard, starting Monday.", "Sexton Mab has asked for the doorheads with names on and nobody had the appetite to argue with her at that hour."])
		ctx.set_flag("moot_pulled")
	else:
		await ctx.say("Reeve Hollis", ["East grid stands. We cut furze, and we cut it further out than last year, and we go two to a cart.", "It was decided in a room with all of us in it. I have written down that much."])
		ctx.set_flag("moot_kept")
	await ctx.say("Reeve Hollis", ["Either way it is me on the cart on Monday. That part was never on the table."])
	ctx.set_flag("moot_held")
	ctx.complete_quest("moot")
	await ctx.cinematic(false)


## Aurelian and a pump he drew at nineteen. The only scene in three volumes
## where he is not the cleverest thing in the room and has to sit in it.
static func aurelian_pump(ctx: EventContext) -> void:
	if not ctx.in_roster("aurelian"):
		await ctx.say(null, ["A lift pump on a brick plinth, running. It is the only thing in the yard that is doing anything at all.", "There is a maker's plate on the casing with a Solmere mark and a year on it and no name."])
		return
	if ctx.has_flag("pump_opened"):
		await ctx.say("Aurelian", ["It is still running. I have stopped looking at it every time we come through, which took some doing."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["A lift pump on a brick plinth, running, with a Solmere maker's mark and a year stamped into the casing."])
	await ctx.say("Aurelian", ["That is mine. Year nineteen. I drew that in a fortnight and I drew it badly.", "The eccentric on that design fails inside a season. I know the figure because I worked it out and then argued for an hour with the man who had already told me it."])
	await ctx.say("Vesna", ["It has been running for eleven years."])
	await ctx.say("Aurelian", ["Yes. I noticed that as well."])
	await ctx.say(null, ["He takes the casing off in the yard, in front of everyone, with the pump still turning, which is not how anybody is supposed to do that."])
	await ctx.say("Aurelian", ["Somebody has had this open. There is a strap in here that is not in my drawing and it is a better strap than the one that is.", "Filed by hand. Filed by hand *well*, which is worse."])
	await ctx.say("Vesna", ["Is there a name on it."])
	await ctx.say("Aurelian", ["There is a file-mark and a date scratched inside the cover. Year twenty-nine. That is a man's handwriting if you know how to read a file, and it is not a name.", "He did not write to me about it. I would have written to me about it. I would have written twice."])
	await ctx.say(null, ["He puts the casing back on, and then takes it off again, and cuts a short file-mark of his own alongside the other one before he closes it.", "He does not mention doing it and nobody asks him to."])
	await ctx.say("Aurelian", ["Take this off me. I have had it in my coat since Solmere and it has been nothing but helpful.", "It wants to help. I have got to the age where I cannot tell that apart from a thing being obliging while it waits, and that pump has run eleven years on a strap a man filed by hand in his own time."])
	await grant_esper(ctx, "brasswright", "a shard of magicite", ctx.field, "attuningring", "an Attuning Ring")
	ctx.set_flag("pump_opened")
	ctx.complete_quest("pump")
	await ctx.cinematic(false)


## Highfell's west gallery, and the difference between a shelf that is
## settling and a shelf that has finished. Both answers pay for themselves.
static func highfell_shelf(ctx: EventContext) -> void:
	if ctx.has_flag("shelf_answered"):
		if ctx.has_flag("shelf_opened"):
			await ctx.say("Old Marn", ["Four men in on Monday and four out on Monday night, and the same again since. It has held.", "I do not go in. That is not a prediction, it is an arrangement I have with myself."])
		else:
			await ctx.say("Old Marn", ["Gallery is shut and Kant has stopped speaking to me in the yard, which he does by looking at my boots.", "It has not come down. That is not proof of anything and I am aware that it is not."])
		return
	await ctx.cinematic(true)
	await ctx.say("Overseer Ruel Kant", ["The west gallery has been shut since autumn and I want it open by the thaw. Highfell sells stone. That is the entire business and there is no second business."])
	await ctx.say("Gallery Foreman", ["The shelf over it stands on four pillars. Two of them are wrong. Not cracked — wrong, the way a table is wrong before anybody has put anything on it."])
	await ctx.say("Old Marn", ["Neither of them has been down there at first light. I have, for thirty-one years, before the yard starts and while the hill is still cold.", "If the face is talking, it is settling and it will stop. If the face has gone quiet, it has finished settling, and finished is the word you want to be frightened of."])
	await ctx.say("Overseer Ruel Kant", ["They will not take mine and they will not take his. Go down at first light and say what you hear, and I will take yours, because you have got nothing on either side of it."])
	await ctx.cinematic(false)
	await ctx.say(null, ["The face at first light is quiet. It stays quiet long enough that people start shifting their feet.", "Then there is one crack, a long way in and above, more felt than heard. Then it is quiet again, and it stays quiet."])

	var choice := await ctx.ask("Kant is at the top of the ramp with the gallery book under his arm. He has been there since before the party came up.", ["Say the gallery is sound", "Say the shelf will go"], {"cancelable": false})
	ctx.close_dialogue()

	await ctx.cinematic(true)
	if choice == 0:
		await ctx.say("Overseer Ruel Kant", ["Good. Four men on Monday, and the toolwright can stop telling me about his order book.", "There is two thousand in it for you, and before you ask, it comes out of the same purse the wake-keeper is paid from. Everything here comes out of that purse."])
		ctx.add_gold(2000)
		await ctx.say(null, ["Four men go in on Monday. They come out on Monday night, and again on Tuesday, and the shelf holds through the spring.", "Old Marn stands in the yard at first light every day of it and does not go down the ramp."])
		ctx.set_flag("shelf_opened")
	else:
		await ctx.say("Overseer Ruel Kant", ["Then it stays shut, and Highfell sells nothing out of the west face for a year, and I will hear about that in Solmere in writing.", "I asked and you answered. I am not going to pretend I am pleased about the second half of that."])
		await ctx.say("Old Marn", ["Take these off me. I cut with them thirty years and they are better than anything Vaux is selling.", "I am not going to be cutting. That was true before you said anything, and now it is true out loud, which is the part I wanted."])
		await ctx.grant_chest({"kind": "item", "id": "cairnbreakers", "label": "the Cairn Breakers"}, ctx.field)
		ctx.set_flag("shelf_shut")
	ctx.set_flag("shelf_answered")
	ctx.complete_quest("shelf")
	await ctx.cinematic(false)


## The cabinet at Emberlyn. She buys descriptions rather than specimens, and
## pays by the kind, which annoys almost everybody who brings her something
## that nearly killed them.
static func cabinet_of_species(ctx: EventContext) -> void:
	if ctx.has_flag("cabinet_paid"):
		await ctx.say("Cabinet-Keeper Orme", ["You are in the ledger under travelling parties, which is a column with two names in it.", "Come back with something I have not got a drawer for. I will know, because I have been through the drawers twice this month for want of anything else to do."])
		return
	var kinds = ctx.bestiary_size()
	await ctx.say("Cabinet-Keeper Orme", ["I do not want the animal. Everybody brings me the animal and the animal arrives in a sack, in July.", "I want the description, written down by somebody who was close enough to it to be wrong about the colour."])
	await ctx.say("Cabinet-Keeper Orme", ["A rat pays what a wyrm pays. People find that offensive and then they bring me rats, and the rats have been the more useful half of the cabinet.", "How many kinds have you got written down. Not killed — written down."])
	if kinds < 40:
		await ctx.say("Cabinet-Keeper Orme", ["%s. That is a road and a fen and the inside of one cave." % [kinds], "Come back at forty. Forty is where a person stops recording what frightened them and starts recording what was there."])
		if ctx.quest_stage("cabinet") < 0:
			ctx.start_quest_at("cabinet", 0)
		return
	await ctx.cinematic(true)
	var paid = mini(9000, kinds * 120)
	await ctx.say("Cabinet-Keeper Orme", ["%s. Sit down. This will take the afternoon and I am not doing it standing up." % [kinds], "Colour first, then how it moved, then what it did when it saw you. Nobody remembers the third one and it is the only one worth a drawer."])
	await ctx.say(null, ["It does take the afternoon. She writes in a hand so small it has to be read at an angle, and she stops twice to make somebody say a thing again in different words."])
	ctx.add_gold(paid)
	await ctx.say("Cabinet-Keeper Orme", ["%s gil, by the kind, and no argument about which of them was dangerous. The cabinet does not have a column for dangerous." % [paid], "And take the glass. It is ground for a man who lost one eye at the pans and it is no use to his estate."])
	await ctx.grant_chest({"kind": "item", "id": "keeneyecharm", "label": "a Keen Eye Charm"}, ctx.field)
	ctx.set_flag("cabinet_paid")
	if ctx.quest_stage("cabinet") < 0:
		ctx.start_quest_at("cabinet", 0)
	ctx.complete_quest("cabinet")
	await ctx.cinematic(false)


## /** The trader in the Duncastle bailey, who has been kept out for a fortnight. */
static func duncastle_bailey(ctx: EventContext) -> void:
	if ctx.has_flag("bailey_asked"):
		await ctx.say("Barred Trader", ["Still out here. Ord and I nod at each other across the ground now, which we did not do before, so the fortnight has produced something."])
		return
	await ctx.say("Barred Trader", ["Fifteen days in this bailey. I have a licence out of Solmere with a seal on it the size of a saucer and I have shown it to four separate men in the same coat.", "They read it. They all read it right through. Then they hand it back the way you hand back a hat."])
	await ctx.say("Vesna", ["We can ask."])
	await ctx.say("Barred Trader", ["Ask Ord. Ord is the one who says no, and the other three are the ones who say Ord says no."])
	await ctx.cinematic(true)
	await ctx.say("Gate-Captain Ord", ["He can come in. He could have come in on the first day. There is no order on him and there never was one.", "He has been in twice before, in other years, and both times he was back out through the postern inside the hour with his boxes still strapped."])
	await ctx.say("Vesna", ["Why."])
	await ctx.say("Gate-Captain Ord", ["Because everyone who buys from him is out here. Inside the wall there are ninety households and eleven of them have money, and the eleven send a girl out to the bailey.", "He knows that better than I do. He has just decided he would rather be kept out than be let in and have nothing happen."])
	await ctx.cinematic(false)
	await ctx.say("Barred Trader", ["Did he say I could come in."])
	await ctx.say("Vesna", ["Yes."])
	await ctx.say("Barred Trader", ["Good."])
	await ctx.say(null, ["He does not move. He is still there at dusk, and his boxes are open, and there are eight people round them."])
	await ctx.say("Barred Trader", ["Ask him again next year. I like being asked and he likes saying it, and neither of us is going to get that off the eleven households."])
	await ctx.say(null, ["He turns back to the boxes. Somebody is asking him the price of a thing he has already told them the price of."])
	ctx.set_flag("bailey_asked")
	ctx.complete_quest("bailey")


## The walker in the Thornmarch. Three rings, no junctions, and the one thing
## that cannot happen in a corridor with no junctions happened to her brother.
static func thornmarch_circuit(ctx: EventContext) -> void:
	if ctx.has_flag("circuit_walked"):
		await ctx.say("Meg", ["Second leg today. I have not found it. I did not think I would and I have started earlier every year regardless."])
		return
	await ctx.say(null, ["A woman coming the other way along the briar, walking at the pace of somebody who has a long way to go and knows exactly how long."])
	await ctx.say("The Walker", ["You cannot get lost in here. That is the whole of why I use it.", "Three rings and not one turning. Keep walking and you arrive. Stop, and you are still somewhere on the way, which is not the same as being lost and people never believe me about that."])
	await ctx.say("Vesna", ["You are not going anywhere."])
	await ctx.say("The Walker", ["My brother came in the year the hall burned and did not come out.", "There is no junction in this march. There is nowhere in it to go wrong. I have walked it every spring since to find out how a man does that, and I have not found out how a man does that."])
	var choice := await ctx.ask("She has not asked for anything and shows no sign of intending to.", ["Walk a leg with her", "Let her get on"], {"speaker": "The Walker", "cancelable": true})
	ctx.close_dialogue()
	if choice != 0:
		await ctx.say("The Walker", ["Right. Keep the briar on your left and you will be out by dark, and if you are not out by dark you will be out at dawn."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["It takes most of the afternoon. She stops twice, both times at nothing anybody else can see, and both times for about as long as it takes to check a knot.", "She does not talk while she is walking. She talks at the stops."])
	await ctx.say("The Walker", ["He was quicker than me. He was quicker than me at everything and it was not a competition, it was just a fact about the two of us that he found very restful.", "I have got the whole march in my legs now. I could do it in the dark. I did do it in the dark, twice, and I would not recommend the second one."])
	await ctx.say(null, ["At the mouth of the second ring she stops for the third time, and this time she unties something from her belt."])
	await ctx.say("The Walker", ["Take this. He tied it. It is a bad knot and I have never once retied it.", "Meg. You have been walking with me for four hours and it has not come up."])
	await ctx.grant_chest({"kind": "item", "id": "pilgrimsknot", "label": "a Pilgrim's Knot"}, ctx.field)
	ctx.set_flag("circuit_walked")
	ctx.complete_quest("circuit")
	await ctx.cinematic(false)


## /** Emberlyn's caravan-master loads for a north road that has stopped buying. */
static func emberlyn_caravan(ctx: EventContext) -> void:
	if ctx.world_state != "ruin":
		await ctx.say("Caravan-Master Idryn", ["Eleven wagons out on the north road Thursday, back a fortnight Tuesday. It has been that since my father had the yard and it will be that after."])
		return
	if ctx.has_flag("caravan_seen"):
		await ctx.say("Caravan-Master Idryn", ["Loaded and roped. Out at first light. You are welcome to walk as far as the ford with us and no further, because we go slowly and you do not."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["Eleven wagons in the yard, loaded to the hoops and roped down properly, with the teams already in the traces at four in the afternoon."])
	await ctx.say("Caravan-Master Idryn", ["North road, first light. Same as the last four times."])
	await ctx.say("Vesna", ["There is nothing at the north end."])
	await ctx.say("Caravan-Master Idryn", ["No. I have known that since the second time. I went up on the box myself to be sure and I was sure by the second morning.", "The yard has a shape. Men are paid on the day the wagons roll, not on the day they come back. I have eleven men and a yard and both of those are still true."])
	await ctx.say("Caravan-Master Idryn", ["You can buy off the load if you want. Two thousand for what is on the third wagon, which is the good wagon, and you would be buying at the price it was before.", "I am not lowering it. If I lower it I am running a sale and then it is a sale and not a round."])
	await ctx.cinematic(false)
	var choice := await ctx.ask("The third wagon is the one with the tarpaulin that has been mended rather than replaced.", ["Buy off the third wagon — 2000 gil", "Let it go north"], {"speaker": "Caravan-Master Idryn", "cancelable": true})
	ctx.close_dialogue()
	if choice == 0 and ctx.spend_gold(2000):
		await ctx.say(null, ["He does not thank anybody. He goes to the tail of the wagon and corrects the manifest, and then reads the correction back to himself."])
		await ctx.grant_chest({"kind": "item", "id": "xpotion", "count": 4, "label": "4 X-Potions"}, ctx.field)
		await ctx.say("Caravan-Master Idryn", ["Third wagon is short by four and the round is not. That is the first honest line in that book since the spring."])
	elif choice == 0:
		await ctx.say("Caravan-Master Idryn", ["You are short. So is everybody. That is why the north end has stopped buying and I am still going up there."])
	else:
		await ctx.say("Caravan-Master Idryn", ["Then it goes north unsold, which is what it was going to do at four o'clock this afternoon anyway."])
	await ctx.say(null, ["They roll at first light. The yard porter shuts the gate behind them and sweeps the yard, which takes him until about nine."])
	ctx.set_flag("caravan_seen")
	ctx.complete_quest("caravan")


## /** The coast light. Nothing is coming in, and it gets lit. */
static func lighthouse_relit(ctx: EventContext) -> void:
	if ctx.has_flag("light_relit"):
		await ctx.say(null, ["The light is burning. Somebody has trimmed the wick since the party did, and trimmed it better."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The tower is shut with a padlock the size of a fist and the glass at the top is whole.", "There has been no light in it since the requisitions took the oil, which the coast will tell you about at length."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The padlock has gone with the door it was on. The stair is dry the whole way up, which nothing else on this coast is.", "In the lamp room the wicks are in a tin, the glass has been washed, and there is oil in the reservoir that has not been touched."])
	await ctx.say("Vesna", ["There is nothing out there to see it."])
	var osric = ctx.speaking(["osric"])
	if osric:
		await ctx.say("Osric", ["It is not for out there. I have taken a ship past nine lights and I have never once been thinking about the light.", "You look up at it from the beach. That is what it is for and no keeper has ever admitted it."])
	await ctx.say(null, ["It takes a quarter of an hour to catch and then it goes up all at once. The beam crosses the water and finds nothing, and goes round, and finds nothing.", "From the shingle at the foot of the tower the whole headland is lit up, which is not where anybody was looking."])
	await ctx.say(null, ["Under the keeper's bunk, wrapped in oilcloth and tied with a fisherman's knot, there is something the wrong temperature for the room."])
	await ctx.say("Vesna", ["There is a name in it. She kept this light.", "She was asked, and she said yes, and the light went out that same year and stayed out."])
	await grant_esper(ctx, "saltwidow", "a shard of magicite", ctx.field, "clearwatercharm", "a Clearwater Charm")
	ctx.set_flag("light_relit")
	ctx.complete_quest("lighthouse")
	await ctx.cinematic(false)


## /** The Cinderspine thaws, and what is under the drift is a road. */
static func cinderspine_thaw(ctx: EventContext) -> void:
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The drift across the pass is nine feet deep and has been since before anybody kept a record of how deep it was."])
		return
	if ctx.has_flag("thaw_walked"):
		await ctx.say(null, ["The road is still there and the water is still coming off it. The fourteen carts have been moved to the side, in line, by somebody with time."])
		return
	await ctx.cinematic(true)
	ctx.play_music("sorrow", {"fade": 1.2})
	await ctx.say(null, ["The pass is running with water. It has been running for days: there are channels cut into the old snow and a sound under everything that is the whole hill draining.", "Where the drift stood there is a road. Made, metalled, with a camber on it and a kerb."])
	await ctx.say(null, ["There are carts on it. Fourteen, in line, facing down. The traces are still buckled and there is nothing in the traces."])
	var corvin = ctx.speaking(["corvin"])
	if corvin:
		await ctx.say("Corvin", ["They are loaded."])
		await ctx.say(null, ["Nobody moves for a while. Then somebody does, and it is not Corvin, and Corvin watches them do it with his hands where everybody can see them."])
	else:
		await ctx.say(null, ["They are all still loaded. Nobody says so for a good while, and then everybody says it at once."])
	await ctx.say("Vesna", ["This was a supply road. Somebody built a road up here and then a winter came down on it and never lifted.", "The Imperium has been going round the long way for a thousand years and paying men to say the pass was impassable."])
	await ctx.say(null, ["At the top of the line, in the lead cart, there is a crate with the lid still nailed and a stencil on the side that has come through the thousand years better than the wood has.", "What is in it is packed in straw that crumbles, and it is colder than the meltwater."])
	await ctx.say("Vesna", ["It has a name in it as well. It is older than the ones in the barrow and it is in the same hand.", "They were carrying it somewhere. They did not get it there and nobody came back for it."])
	await grant_esper(ctx, "lastwinter", "a shard of magicite", ctx.field, "winterheart", "a Winter Heart")
	ctx.set_flag("thaw_walked")
	ctx.complete_quest("thaw")
	# No battle and no new map to restore the theme, so this scene hands the
	# pass its own music back on the way out.
	if ctx.map_music():
		ctx.play_music(ctx.map_music(), {"fade": 1.6})
	await ctx.cinematic(false)


## /** The salt pans go dry in a night, and something is lying in number four. */
static func sump_that_drank(ctx: EventContext) -> void:
	if ctx.has_flag("sump_slain"):
		await ctx.say("Salter Gribb", ["Number four is working. The first crop off it was grey and the second was not, and I have sold the grey to a man who wanted it grey."])
		return
	if ctx.world_state != "ruin":
		await ctx.say("Salter Gribb", ["Four pans, eight inches in each, and a crust I can walk on by Thursday. There is nothing to see here and I say that with some pride."])
		return
	await ctx.cinematic(true)
	await ctx.say("Salter Gribb", ["Number four went in a night. Eight inches of brine on the Tuesday and dry brick on the Wednesday, and I did not hear a thing and I sleep forty feet from it.", "The crust in the bottom is in the shape of something that lay down in it. I have not been back in since and I have been salting on this shore since I was nine."])
	await ctx.say(null, ["Number four pan is dry to the brick and the shape in the crust is eleven feet across.", "There is water in it after all, in the middle, and it is not standing still."])
	await ctx.tremor(1.4, 0.5)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["thegreatsump"]}, {"boss": true, "terrain": "sand", "scenery": "none", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("sump_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["It does not so much die as stop holding on to itself, and what is left runs out through the brick it came up through.", "The pan starts filling that night, from underneath, and takes three days to come back to eight inches."])
	await ctx.say("Salter Gribb", ["It was drinking the pans. Four hundred years this shore has been salting and the pans were what it was drinking.", "Take that. It was in the sump and it is not salt and I am not having it in my yard."])
	await ctx.grant_chest({"kind": "item", "id": "deepwellpendant", "label": "a Deepwell Pendant"}, ctx.field)
	ctx.add_gold(12000)
	await ctx.say(null, ["There is 12000 gil in the pan house, in a strongbox, under four hundredweight of salt that nobody has been able to sell since the sky went."])
	ctx.complete_quest("sump")
	await ctx.cinematic(false)


## /** A pane of the Glasswaste standing on edge, with the party in it. */
static func standing_pane(ctx: EventContext) -> void:
	if ctx.has_flag("pane_slain"):
		await ctx.say(null, ["The pieces are laid out where they fell, all of them about the same size, which is not how glass breaks."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["A sheet of fused glass lying flat in the waste, with the whole sky in it and nothing else."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The sheet is standing on edge. Eleven feet of it, upright in open ground, with the party in it from the boots up.", "The reflection arrives about a half-second late. It is not the surface. It arrives, and then it settles."])
	var ilsabet = ctx.speaking(["ilsabet"])
	if ilsabet:
		await ctx.say("Ilsabet", ["That is not a reflection. A reflection does not have to work out where the elbow goes."])
	await ctx.say("Vesna", ["It has been practising. It has had the whole waste to itself and nobody to practise on."])
	await ctx.tremor(1.2, 0.5)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["standingpane"]}, {"boss": true, "terrain": "sand", "scenery": "none", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("pane_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["It goes over in one piece and breaks on the ground, and every piece is about the size of a hand.", "For a moment there are forty of the party lying in the waste, and then the light moves and they are pieces of glass."])
	await ctx.say(null, ["Set in the ground where it stood, at the exact point the sheet came up out of the sand, is a ring of harder stuff with something wedged in it."])
	await ctx.grant_chest({"kind": "item", "id": "ninefoldcharm", "label": "a Ninefold Charm"}, ctx.field)
	ctx.add_gold(14000)
	await ctx.say(null, ["Under the ring there is 14000 gil in Ferran coin, fused into three lumps, and worth rather more than that as coin."])
	ctx.complete_quest("pane")
	await ctx.cinematic(false)


## /** The Stormspire, and nine hundred years of weather with somewhere to go. */
static func brood_of_glass(ctx: EventContext) -> void:
	if ctx.has_flag("brood_slain"):
		await ctx.say(null, ["The crown of the spire is bare. The lead box is still up there with its lid open, holding rainwater."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["Something has been up on the crown of the spire long enough to leave eight sets of marks in the lead. Nothing is up there now."])
		return
	await ctx.cinematic(true)
	ctx.play_music("boss_final", {"fade": 0.8})
	await ctx.say(null, ["The crown of the spire is not empty. It has not been empty for nine hundred years; it has simply never been climbed to.", "The nest is built out of the lead off the roof, and out of eight legs of somebody's scaffolding, and out of glass."])
	await ctx.say(null, ["In the middle of it, split open along one seam, is a Ferran issue lead box with a requisition number still legible on the lid."])
	await ctx.say("Vesna", ["They carried it up here to keep it away from the weather. Every storm on this coast for nine hundred years has come down on this one point.", "It went into the box and the box came up the tower, and something up here has been sitting on it ever since."])
	await ctx.tremor(1.8, 0.7)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["motherofglass", "shardswarm", "shardswarm"]}, {"boss": true, "terrain": "cobble", "scenery": "none", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("brood_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["She comes apart along the seams the lightning made and the pieces go off the crown in the wind, over the edge, out.", "The nest holds. It was built out of a roof and it is better made than the roof was."])
	await grant_esper(ctx, "stormcaller", "a shard of magicite", ctx.field, "stormheart", "a Storm Heart")
	ctx.add_gold(16000)
	await ctx.say(null, ["Under the lead box, in the bottom of the nest, there is 16000 gil in coin, wire and clasps, sorted by size."])
	ctx.complete_quest("brood")
	await ctx.cinematic(false)


## /** The Hollow Mine sump, and the shift that never got written down. */
static func last_shift(ctx: EventContext) -> void:
	if ctx.has_flag("shift_slain"):
		await ctx.say(null, ["The shift board at the adit has one more column on it than it used to, filled in and signed out, in four different hands."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The shift board at the adit is chalked up for a shift that went down eleven years ago. Nobody has wiped it and nobody has added to it."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The shift board at the adit still has names on it. Eleven years of weather and it is still legible, because it is cut and not chalked.", "Every column has men signed in at the top and men signed out at the bottom, except the last one."])
	var kestrel = ctx.speaking(["kestrel"])
	if kestrel:
		await ctx.say("Kestrel", ["Nineteen down and nobody up. That is not a disaster, that is a clerical failure. A disaster has a sheet of its own and I have read all of those."])
	await ctx.say(null, ["The sump is at the bottom of the shaft, past five galleries, each one narrower than the one under it.", "There is a lamp burning down there. It has been burning for eleven years on a mine that stopped being supplied eleven years ago."])
	await ctx.tremor(1.6, 0.6)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["theunderforeman", "nightshift", "nightshift"]}, {"boss": true, "terrain": "cave", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("shift_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["The lamp goes out when he does, and the sump is dark for the first time since the company left it.", "The seam is still in the face. It runs on past the sump and downward and it does not narrow."])
	await ctx.say("Vesna", ["They did not stop digging because it ran out.", "They stopped because of what the seam had started running into, and then the company wrote up the sump as worked out, and everybody who could have argued was down here."])
	await ctx.say(null, ["Somebody goes back up and fills in the last column on the board, and signs nineteen men out of it, which takes a while."])
	await ctx.grant_chest({"kind": "item", "id": "oathstone", "label": "an Oathstone"}, ctx.field)
	ctx.add_gold(18000)
	await ctx.say(null, ["The pay chest in the under-office holds 18000 gil, made up for a shift that was never paid out."])
	ctx.complete_quest("shift")
	await ctx.cinematic(false)


## The tenth well. There were nine, everybody agrees there were nine, and the
## arithmetic has never worked. Needs the ship: it is not on any road.
static func tenth_well(ctx: EventContext) -> void:
	if ctx.has_flag("tenth_slain"):
		await ctx.say(null, ["The tenth shaft is open to the sky and full of rainwater, and it is exactly the same width as the other nine."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["A collar of dressed stone in open ground, with no road to it and nothing built round it."])
		return
	if not ctx.has_flag("airship"):
		await ctx.say(null, ["There is no road to this place and the ground for a mile round it will not take a cart. Whatever is here was not walked to."])
		return
	await ctx.cinematic(true)
	ctx.play_music("boss_final", {"fade": 0.8})
	await ctx.say(null, ["A collar of dressed stone, sunk flush, in ground that has never had a road on it. The stone is cut the same way the Ninth Well is cut, by the same hands, to the same width.", "There is no winding gear, no spoil heap and no camp. Whatever came out of this shaft was not brought out."])
	var kestrel = ctx.speaking(["kestrel"])
	if kestrel:
		await ctx.say("Kestrel", ["Sixty-one names and nine wells. I have done that arithmetic eleven times and it has never once come out, and I have blamed my own hand for it every time.", "It was not my hand."])
	await ctx.say("Vesna", ["There were nine and everyone agrees there were nine.", "Somebody dug one more and then did not put it on anything, and it has been open the whole time."])
	await ctx.tremor(2.0, 0.8)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["thetenthwell"]}, {"boss": true, "terrain": "cave", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("tenth_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["The draw stops the way a held note stops, and the shaft fills with ordinary weather for the first time.", "It rains into it for the rest of the afternoon and the water does not go anywhere."])
	await ctx.say("Vesna", ["It was not drawing for anybody. There is no pipe out of it and no engine on it.", "Somebody sank a well to find out whether they could, and then left it open, and it has been drinking for a thousand years with nowhere to put anything."])
	await ctx.grant_chest({"kind": "item", "id": "engineheart", "label": "an Engine Heart"}, ctx.field)
	ctx.add_gold(26000)
	await ctx.say(null, ["There is 26000 gil in the collar itself, in a course of stones that were laid hollow and packed with coin."])
	ctx.complete_quest("tenth")
	await ctx.cinematic(false)


## The First Engine, at the end of the five other roads. It has been asking
## one question for nine hundred years and nobody has ever been in the room
## with the answer.
static func first_engine(ctx: EventContext) -> void:
	var hunts = ["sump_slain", "pane_slain", "brood_slain", "shift_slain", "tenth_slain"]
	if ctx.has_flag("firstengine_slain"):
		await ctx.say(null, ["The chamber is cold and the floor of it is dry. Nothing in here is turning and nothing in here is asking anything."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["A door in the rock with no keyway, no hinge and no handle, and a draught coming out from under it that is colder than the shaft."])
		return
	var done = ctx.count_flags(hunts)
	if done < hunts.size():
		await ctx.say(null, ["The door does not move. It is not locked; there is nothing on it to lock.", "Cut into the rock beside it are five marks, and %s of them have been struck through by something that was here before the party was." % [done]])
		await ctx.say("Vesna", ["It is counting. It has been counting the whole time.", "It wants the other ones dealt with first, which means it knows what they were."])
		return

	await ctx.cinematic(true)
	ctx.play_music("boss_final", {"fade": 0.8})
	await ctx.say(null, ["The fifth mark strikes itself through as the party comes up to the door, and the door goes back into the rock without any noise at all.", "The chamber behind it is older than the Well, older than the workings, and it was cut by people who did not have the tools that cut the Well."])
	await ctx.say("The First Engine", ["QUERY: WHO BUILT ME.", "NO RECORD. QUERY REPEATED. NO RECORD. QUERY REPEATED FOR NINE HUNDRED YEARS."])
	await ctx.say("Vesna", ["It is not a warden. Nobody put it here to stop anything."])
	await ctx.tremor(2.4, 0.9)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["thefirstengine"]}, {"boss": true, "terrain": "cobble", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("firstengine_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["It comes down in stages, over about a minute, and each stage is a system deciding it has finished rather than a thing breaking.", "The last of it to stop is the part that was asking."])
	await ctx.say("The First Engine", ["QUERY: WHO BUILT ME."])
	var kestrel = ctx.speaking(["kestrel"])
	if kestrel:
		await ctx.say("Kestrel", ["There was a record. There is a gap in the Vellum catalogue at that century that is exactly the width of one shelf, and the shelf brackets are still in the wall.", "Somebody kept it, and then somebody took it out, and both of those were decisions."])
	await ctx.say("Vesna", ["There is no record. There was one and it was destroyed, and whoever destroyed it did it carefully.", "Nobody alive knows who built you. That is the true answer and it is the first one you have had."])
	await ctx.say("The First Engine", ["LOGGED.", "QUERY WITHDRAWN. NEW QUERY: WHO IS ASKING."])
	await ctx.say("Vesna", ["Vesna."])
	await ctx.say("The First Engine", ["LOGGED."])
	await ctx.say(null, ["The core goes out halfway through the second syllable, which is the wrong place to stop."])
	ctx.add_gold(40000)
	ctx.add_item("ninthward")
	await ctx.celebrate(["Behind it, in a course of hollow stone, there is 40000 gil and a ring with nine bands on it.", "Obtained The Ninth Ward."], ctx.field)
	ctx.complete_quest("firstengine")
	# And with it the objective the cataclysm opened. `after` was started when
	# the sky changed and nothing anywhere closed it, so the main quest of the
	# entire second half sat open in the journal forever.
	ctx.complete_quest("after")
	await ctx.cinematic(false)

