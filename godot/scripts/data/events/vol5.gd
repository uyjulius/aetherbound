class_name EventsVol5
extends RefCounted
##
##
## Scripted events, volume five — sidequests and optional scenes.
##
## Same contract as `EVENTS`, `VOL2_EVENTS` and `VOL3_EVENTS`: every entry is a
## generator receiving `(game, ctx)` and written as a coroutine, so a scene reads
## top to bottom in source the way it plays on screen. Nothing in here is on the
## critical path.
##
## Volume two covered the cast and volume three covered the places. This one
## covers what people say afterwards: the rumour, the relic, the rota nobody can
## account for, and the account that does not match the book. The Engines are
## finished and the stories about them are not, and the stories are what most
## people are actually living in.
##
## The shapes, chosen so as not to repeat the earlier volumes:
##
## - a five-stage investigation with no order at all (eleven_*). Volume three's
## postbag was three deliveries gated on a count and then a fixed final
## scene in a fixed place. This one has no final scene: whichever of the five
## accounts the player happens to hear last runs the coda where they are
## standing, and the coda does not settle anything.
## - two scenes whose outcome turns on who is standing in the active four, and
## turns on it mechanically rather than rhetorically: the party can read a
## mason's mark, or cannot, and the parish's decision follows from that
## (marrowgate_hand, lastlantern_office).
## - two hunts, using the only two late bosses in the bestiary that suit a
## volume about belief: the thing in the wood that has started answering,
## and the thing on the Reach that contradicts the survey.
## - seventeen of the twenty never start a battle, because an argument about
## what happened is not improved by a sword.
##
## Six of the twenty end without an answer. That is deliberate and it is the
## point of the volume; a mystery that is resolved on the spot was never about
## what people believe, it was about what the player was told.
##
## Ten are gated on `party.worldState === 'ruin'`, since half of this is about a
## thing that has already happened.
##
##
## First of `ids` standing in the active four, or null.
##
## The active party rather than the roster, for the same reason volume three
## used the active party: a scene that changes on who is present has to change
## on who is actually present, or nobody ever sees it change.
##
##
## Hand over magicite the player may already be carrying.
##
## Both espers this volume awards are also sitting in a chest somewhere, so the
## scene has to be able to end without announcing a thing the party already
## owns. Same helper as volume three, and the same reason for it.
##
##
## Book an account and, if it was the fifth, run the coda on the spot.
##
## There is no fifth scene in a fixed place. Whichever account the player hears
## last is where the sheet gets written up, and the sheet does not agree with
## itself.
##
##
## Translated from `src/data/events-vol5.js` by `tools/translate-events.mjs`, which copies the
## dialogue rather than retyping it and rewrites only the shape around it. Every scene
## here is compared against the reference's own transcript by
## `tools/events-parity.mjs`, under five branch policies.

const ELEVEN_ACCOUNTS := ["eleven_bells", "eleven_drove", "eleven_avenue", "eleven_order", "eleven_gallery"]

const IDS := [
	"eleven_bells", "eleven_drove", "eleven_avenue", "eleven_order",
	"eleven_gallery", "weeping_answer", "reach_gainsayer", "marrowgate_hand",
	"lastlantern_office", "oxmere_road_warning", "emberlyn_eastroad", "duncastle_roll",
	"kingspyre_relight", "harrowmere_tally", "ninthwell_account", "fenbarrow_debt",
	"ashenhall_cleaned", "greyharrow_ford", "drownedhalls_blue", "sunkenvault_hours",
]


static func run(id: String, ctx: EventContext) -> void:
	match id:
		"eleven_bells": await eleven_bells(ctx)
		"eleven_drove": await eleven_drove(ctx)
		"eleven_avenue": await eleven_avenue(ctx)
		"eleven_order": await eleven_order(ctx)
		"eleven_gallery": await eleven_gallery(ctx)
		"weeping_answer": await weeping_answer(ctx)
		"reach_gainsayer": await reach_gainsayer(ctx)
		"marrowgate_hand": await marrowgate_hand(ctx)
		"lastlantern_office": await lastlantern_office(ctx)
		"oxmere_road_warning": await oxmere_road_warning(ctx)
		"emberlyn_eastroad": await emberlyn_eastroad(ctx)
		"duncastle_roll": await duncastle_roll(ctx)
		"kingspyre_relight": await kingspyre_relight(ctx)
		"harrowmere_tally": await harrowmere_tally(ctx)
		"ninthwell_account": await ninthwell_account(ctx)
		"fenbarrow_debt": await fenbarrow_debt(ctx)
		"ashenhall_cleaned": await ashenhall_cleaned(ctx)
		"greyharrow_ford": await greyharrow_ford(ctx)
		"drownedhalls_blue": await drownedhalls_blue(ctx)
		"sunkenvault_hours": await sunkenvault_hours(ctx)


## A step several scenes share, translated from the module helper of the
## same name.
static func grant_esper(ctx: EventContext, id: Variant = null, label: Variant = null, field: Variant = null, fallbackId: Variant = null, fallbackLabel: Variant = null) -> void:
	if not ctx.has_esper(id):
		await ctx.grant_chest({"kind": "esper", "id": id, "label": label}, ctx.field)
		return
	await ctx.say(null, ["The shard is %s, and there is one of those in the party's keeping already." % [ctx.esper_name(id)], "Both are the same weight, and neither of them is any colder than the other."])
	await ctx.grant_chest({"kind": "item", "id": fallbackId, "label": fallbackLabel}, ctx.field)


## A step several scenes share, translated from the module helper of the
## same name.
static func eleven_logged(ctx: EventContext) -> void:
	if ctx.quest_stage("eleven") < 0:
		ctx.start_quest_at("eleven", 0)
	var done = ctx.count_flags(ELEVEN_ACCOUNTS)
	ctx.advance_quest("eleven", done)
	if done < ELEVEN_ACCOUNTS.size():
		return

	await ctx.cinematic(true)
	ctx.play_music("memory", {"fade": 1.0})
	await ctx.say(null, ["Written out on one sheet, in one hand, the five of them do not sit next to each other.", "Nine strokes of a bell. Four seconds off a herd. Sixty-two yards of marble. Seven counted out loud into a well. And a shift that came up at four and was told."])
	await ctx.say("Vesna", ["I did not count. I was listening to something and it did not occur to me to count.", "What I can tell you is that it did not begin when the light went out and it has not stopped. It is still going."])
	var kestrel = ctx.speaking(["kestrel"])
	if kestrel:
		await ctx.say("Kestrel", ["The archive will take the officer of the watch. Not because he was standing where he could see anything — because his is the only one written in ink.", "In sixty years there will be one figure and it will be eleven, and there will be nothing at all underneath it."])
	else:
		await ctx.say(null, ["The sheet goes into a coat pocket. Nobody proposes doing anything else with it and nobody takes it out again that day."])
	await ctx.say(null, ["Somewhere in the fourth week people stopped saying what they saw and started saying eleven.", "Nobody asked will put a day on it. Several will put a week on it, and no two of the weeks are the same week."])
	await ctx.grant_chest({"kind": "item", "id": "steadyband", "label": "a Steady Band"}, ctx.field)
	ctx.set_flag("eleven_closed")
	ctx.complete_quest("eleven")
	ctx.restore_theme(1.6)
	await ctx.cinematic(false)


## /** Thistlebeck. Two bells, and one of them may not have rung. */
static func eleven_bells(ctx: EventContext) -> void:
	if ctx.has_flag("eleven_bells"):
		await ctx.say("Bell-Keeper Wray", ["I have not moved off nine and she has not moved off hers. We ring at noon and we are still four seconds apart."])
		return
	if ctx.world_state != "ruin":
		await ctx.say("Bell-Keeper Wray", ["I strike at noon and she strikes at noon and we are four seconds apart, and we have been four seconds apart for nineteen years.", "Neither of us is going to move. The bridge would never hear the end of it."])
		return
	await ctx.say("Bell-Keeper Wray", ["The dark. Everybody wants the dark, and I stopped being civil about it in about the second week.", "I was on the rope, because at that hour I am always on the rope. It went, and I did what I do when anything goes, which is strike."])
	await ctx.say("Bell-Keeper Wray", ["Nine. I struck nine, and I can strike nine asleep, and nine at my pace is eight seconds and a bit of the next one."])
	await ctx.say("Vesna", ["And the other bell."])
	await ctx.say("Bell-Keeper Wray", ["Struck as well. She says she started first, I say I started first, and there is no third party on this beck who would be believed by either of us."])
	await ctx.say("Bell-Keeper Wray", ["Here is the thing I have not said on the bridge.", "From where I was standing there was one bell. One. Not two of them four seconds apart — one, the whole way through.", "So either she matched me to the stroke, which she has not managed in nineteen years of trying, or one of us was hearing the other one and thinking it was himself."])
	ctx.set_flag("eleven_bells")
	await eleven_logged(ctx)


## /** Oxmere. Eleven hundred head, and cattle are better than a clock. */
static func eleven_drove(ctx: EventContext) -> void:
	if ctx.has_flag("eleven_drove"):
		await ctx.say("Drift-Master Sallow", ["Four seconds. Nobody has offered me a reason to move off it and I have asked four people to try."])
		return
	if ctx.world_state != "ruin":
		await ctx.say("Drift-Master Sallow", ["Eleven hundred through the throat on Thursday. Stand where you are standing now and you will be a story in this town by Friday."])
		return
	await ctx.say("Drift-Master Sallow", ["Eleven hundred head in the lower standing when it went. They lay down. All of them together, the way they go down for thunder they have not heard yet.", "Then they were up again. Front rank first, which is not how a herd gets up after thunder, and I have been carrying that about with me since."])
	await ctx.say("Vesna", ["How long was it."])
	await ctx.say("Drift-Master Sallow", ["Four seconds. I do not keep a clock. I have got cattle, and cattle are better, and cattle do not need winding.", "A beast takes longer to get up than it took to go down. That is fixed. Four down, six up, and the light was back before the last of them had their knees under them."])
	await ctx.say("Drift-Master Sallow", ["Everybody says eleven. Everybody has said eleven since about the second week.", "If it was eleven, then my herd stood about in the dark for seven seconds with nothing to look at, quietly, and they do not do that. They have never once done that."])
	ctx.set_flag("eleven_drove")
	await eleven_logged(ctx)


## /** Marrowgate. Sixty-two yards of it, and the marble was the wrong temperature. */
static func eleven_avenue(ctx: EventContext) -> void:
	if ctx.has_flag("eleven_avenue"):
		await ctx.say("Night-Watch Praed", ["Sixty-two yards. I have paced it in daylight four times since, in case I had it wrong. I did not have it wrong."])
		return
	if ctx.world_state != "ruin":
		await ctx.say("Night-Watch Praed", ["Nothing to see. That is the report I have handed in eleven years running and nobody has ever asked me to expand on it."])
		return
	await ctx.say("Night-Watch Praed", ["I was on the fourth kerb going north. I walk that avenue every night and there is nothing on it, which is why they give it to me and not to a younger man.", "It went out. I did not stop, because stopping in the middle of an avenue in the dark is how a man ends up sitting down on it."])
	await ctx.say("Night-Watch Praed", ["I kept walking. When the light came back I was standing on the tenth kerb."])
	await ctx.say("Vesna", ["How far is that."])
	await ctx.say("Night-Watch Praed", ["Sixty-two yards. Eight to a kerb and a little over, and I have paced it since in daylight more than once.", "You do not do sixty-two yards in eleven seconds. Not in the dark, not carefully, and I was careful, because I have got a wife."])
	await ctx.say("Night-Watch Praed", ["And the marble was warm. At that hour it is colder than the grass and it has been colder than the grass every night of my life.", "It was warm the whole way. It went cold about a minute after the light came back, at the ordinary rate, as though it had started the night again from the beginning."])
	ctx.set_flag("eleven_avenue")
	await eleven_logged(ctx)


## /** Ferran Outpost. Where the figure came from, which is not where anybody thinks. */
static func eleven_order(ctx: EventContext) -> void:
	if ctx.has_flag("eleven_order"):
		await ctx.say("Gate-Sentry Ostrel", ["Both figures are in the book and both of them are mine. One is struck through. That is the part I keep going back to."])
		return
	if ctx.world_state != "ruin":
		await ctx.say("Gate-Sentry Ostrel", ["Nothing goes in the day-book but what I saw and the time I saw it at.", "That is the whole of the trade and it takes about nine years before anybody will let you do it on your own."])
		return
	await ctx.say("Gate-Sentry Ostrel", ["I was at the north post, looking into the well, which is against Order 116 and has been against Order 116 since before I was posted here.", "When it went I counted. Out loud, because out loud is steadier, and because there was nobody to hear me do it."])
	await ctx.say("Vesna", ["What did you get to."])
	await ctx.say("Gate-Sentry Ostrel", ["Seven. I wrote seven in the book with the time beside it and my mark under it.", "Then the officer of the watch came round and said eleven, and I struck out seven and wrote eleven, because that is what you do with an officer of the watch."])
	await ctx.say("Gate-Sentry Ostrel", ["The dispatch went down to Solmere that night with eleven in it. Inside a fortnight every parish on this coast was saying eleven.", "I have asked a lot of them since. Not one of them counted."])
	await ctx.say("Vesna", ["Whose seven was it."])
	await ctx.say("Gate-Sentry Ostrel", ["Mine, and I was looking down a well at the time, which is not where the sky is. I would not take it to a magistrate.", "The seven is still under the ink. Hold the page up to a lamp and it is perfectly legible, and I have held that page up to a lamp more often than I would like to say."])
	ctx.set_flag("eleven_order")
	await eleven_logged(ctx)


## /** Highfell. Four men who were two hundred feet in, and saw nothing at all. */
static func eleven_gallery(ctx: EventContext) -> void:
	if ctx.has_flag("eleven_gallery"):
		await ctx.say("Gallery Hand Rannock", ["We were down. That is what the four of us have got, and one of us has stopped saying it that way."])
		return
	if ctx.world_state != "ruin":
		await ctx.say("Gallery Hand Rannock", ["Two hundred feet of hill over your head and no weather in it at all. Best room in Highfell and the pay is the same as the yard."])
		return
	await ctx.say("Gallery Hand Rannock", ["Four of us in the west face. Down at six, up at four, the same as any day of the week.", "Nothing happened. There is no better way of putting that and I have had a year to find one."])
	await ctx.say("Vesna", ["You did not see it."])
	await ctx.say("Gallery Hand Rannock", ["We were two hundred feet in. There is nothing to see down there on a good day; that is rather the point of a gallery.", "We came up at four and the yard was standing about. Marn had the boys sat on the ramp and nobody had swept, and it was four in the afternoon."])
	await ctx.say("Gallery Hand Rannock", ["Everyone on this hill has got a piece of it. The four of us have got a shift and a cold dinner.", "Doggett has started saying he felt it. Says the face went quiet and then came back.", "The other three of us have stopped correcting him, and I could not tell you which week we stopped."])
	ctx.set_flag("eleven_gallery")
	await eleven_logged(ctx)


## The Weeping Wood. It has taken the sound out of itself since Ashenhall
## burned, which is why people walk in to ask things: nothing answers, and
## that is restful. Since the spring it answers, and it is right.
static func weeping_answer(ctx: EventContext) -> void:
	if ctx.has_flag("answering_slain"):
		await ctx.say(null, ["The wood is quiet in the way it was quiet before. Somebody has put a bough across the path at shoulder height, and left it there."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The spring comes up through the roots and goes nowhere, and the wood takes the sound of it before it has finished being a sound.", "People have been walking in here to ask things for a thousand years. Nothing answers. That is the arrangement and both sides have kept it."])
		return
	await ctx.cinematic(true)
	ctx.play_music("boss_final", {"fade": 0.8})
	await ctx.say(null, ["There is a woman on the path coming out, walking the way people walk when they have decided not to run.", "She does not stop to talk. She says one thing over her shoulder, which is that she asked where her brother was, and that she was answered, and that she was right the first time."])
	await ctx.say("Vesna", ["A thousand years of nobody getting an answer in here, and the whole of the county built a practice on it.", "It is not that it has started talking. It is that it has stopped being able to help itself."])
	var keeper = ctx.speaking(["wick", "oda"])
	if keeper:
		await ctx.say(keeper["name"], ["You do not go somewhere to be answered. You go somewhere to hear yourself ask.", "Whatever is doing this has taken the useful half out of it."])
	await ctx.tremor(1.8, 0.7)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["theanswering"]}, {"boss": true, "terrain": "grass", "scenery": "field", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("answering_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["It goes quiet in stages, from the outside in, the way a crowd does.", "The last of it is a single answer, given to nobody, to a question nobody in the clearing had put out loud."])
	await ctx.say("Vesna", ["It was right. I have checked the one it gave me and it was right.", "That is not the same as it knowing. I have been trying to make those two things come apart in my head since the stair."])
	await ctx.grant_chest({"kind": "item", "id": "answeringmirror", "label": "an Answering Mirror"}, ctx.field)
	ctx.add_gold(20000)
	await ctx.say(null, ["In the roots under it, in a hollow that has been kept dry by somebody, there is 20000 gil in offerings, sorted by coin and stacked in nines."])
	ctx.complete_quest("wood")
	await ctx.cinematic(false)


## The Meridian Reach. Every survey mark on the northern division has been
## altered to a different figure, and the new figures agree with each other
## and with nothing that is on the ground.
static func reach_gainsayer(ctx: EventContext) -> void:
	if ctx.has_flag("gainsayer_slain"):
		await ctx.say(null, ["The painted stone has nine marks on it and all nine are crossed through, and the ninth was crossed through in front of witnesses."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The survey marker gives the northern division and the year it was walked, and somebody much later has written that there is plenty down south.", "The stones on the toll ledge are the right number for a toll in a currency nobody has minted in ninety years."])
		return
	await ctx.cinematic(true)
	ctx.play_music("boss_final", {"fade": 0.8})
	await ctx.say(null, ["Every marker between the well and the toll board has been recut. Not defaced — recut, carefully, to a different figure, by somebody who had the right chisel.", "The new figures are consistent. Walk them and they agree with each other the whole way and with nothing whatever underfoot."])
	await ctx.say(null, ["The painted stone has nine marks and eight are struck through. As the party comes level with it, the ninth is struck through as well."])
	var reader = ctx.speaking(["kestrel", "maret", "aurelian"])
	if reader:
		await ctx.say(reader["name"], ["It is not lying. Every figure on that road is wrong and every one of them is wrong by a different amount.", "A liar picks a number. This has gone to the trouble of picking eleven."])
	await ctx.say("Vesna", ["It has been out here on its own with a chisel and a road, and it has done the road."])
	await ctx.tremor(2.0, 0.8)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["thegainsayer"]}, {"boss": true, "terrain": "dirt", "scenery": "field", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("gainsayer_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["It comes apart without arguing, which after the last quarter of an hour is the strangest thing it does.", "The chisel is in the road where it fell. It is Imperium issue, stamped, and worn down to about a third of a chisel."])
	await ctx.say("Vesna", ["Somebody surveyed this road once and somebody has been unsurveying it ever since.", "I would like to know which of those two the Imperium paid for. I am not going to find out on this road."])
	await grant_esper(ctx, "windfoundling", "a shard of magicite", ctx.field, "overwindband", "an Overwind Band")
	ctx.add_gold(22000)
	await ctx.say(null, ["Under the toll ledge, in a course of stones laid hollow, there is 22000 gil in a currency that has not been legal since before the survey."])
	ctx.complete_quest("gainsay")
	await ctx.cinematic(false)


## Marrowgate's hand. The parish bought it two winters ago off a man who has
## since died, and has had a good two years, which in Marrowgate means the
## well did not fail.
##
## Whether anybody ever establishes what it is depends entirely on whether the
## party is carrying somebody who can read a mark. If it is not, the case gets
## shut again and nobody ever finds out, and that ending is not a failure.
static func marrowgate_hand(ctx: EventContext) -> void:
	if ctx.has_flag("hand_done"):
		if ctx.has_flag("hand_told"):
			await ctx.say("Goodwife Ledger", ["It is on Onder's shelf with the rest of what comes up out of gardens. Nobody has asked me where it went.", "Four people have been past that shelf this week and none of them looked at it twice, and I have had a fortnight to decide how I feel about that."])
		else:
			await ctx.say("Goodwife Ledger", ["The case is shut and the parish touches the glass on the ninth of the month, which was never the arrangement and is where we have got to.", "The well has not failed. I am not going to pretend I know what that is worth."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["A glazed case on a bracket in the wall of the shop, and a hand in it, carved, palm up, at about the size of a hand.", "The glass has been cleaned recently and the bracket has not."])
	await ctx.say("Goodwife Ledger", ["The keeper's hand, out of Ashenhall, and before you say anything I know what the hall says about its own relics.", "A man brought it down two winters ago and the parish raised four hundred gil for it in a week, which for three hundred and forty people is a fortnight of not eating meat."])
	await ctx.say("Vesna", ["Where is he now."])
	await ctx.say("Goodwife Ledger", ["Dead. Not suspiciously. He was sixty and it was February.", "Two good years since. The well has not failed and nothing has come out of the north end, and I am aware of what that sentence sounds like from outside."])
	await ctx.cinematic(false)
	await ctx.say("Reliquar Ansence", ["I sell relics. I have sold relics in this town for nine years and I did not sell them that.", "Look at the wrist. That is all I am going to say to you in the middle of a lane, and it is more than I have said to anyone else."])

	var READERS = {"kestrel": ["There is a mark cut into the wrist, under the cuff of it. It is a Solmere trade mark and there is a year on it.", "The year is nine hundred and forty years after the hall burned."], "aurelian": ["That is soapstone and that is a drill. Not a bow drill — a drill on a frame, which is a Works tool, and I know because we sell them.", "Somebody made this in an afternoon and made a good job of the fingers."], "ilsabet": ["The knuckles are wrong. Whoever cut that was working from a drawing of a hand and not from a hand.", "You can see where they got to the thumb and had to decide something. I have made the same decision and mine was also wrong."], "corvin": ["I have seen three of these. One in Solmere, one on the coast, and one I would rather not go into.", "They come out of the same shop and they are not a bad shop. Ask me how I know and I will change the subject with some skill."]}
	var reader = ctx.speaking(READERS.keys())

	if not reader:
		await ctx.say(null, ["Nobody in the party can do anything with the wrist. It is a mark under a cuff of stone, cut small, and it is either a maker or a scratch."])
		await ctx.say("Reliquar Ansence", ["Then it stays a mark under a cuff. I am not going to be the man in the lane who said it out loud and could not follow it up.", "Come back with somebody who reads stone. Or do not, and the parish carries on, and the well carries on, and so on."])
		await ctx.say("Goodwife Ledger", ["You have been a long time at that case. Was there something."])
		await ctx.say("Vesna", ["No."])
		await ctx.say(null, ["She shuts the case, and cleans the glass again, which it did not need."])
		ctx.add_gold(1200)
		await ctx.say(null, ["The parish presses 1200 gil on the party for the walk down, and will not hear a word about it."])
		# Deliberately no `hand_done` and no `completeQuest`. The scene has just
		# told the player to come back with somebody who reads stone; setting
		# those marked the quest Settled in the journal and left the re-entry
		# guard at the top of this event pointing at the closed-case dialogue,
		# so returning with Kestrel got a shrug and the good branch — the one
		# this whole scene exists for — could never be reached. `lastlantern_office`
		# has the same shape and gets it right by returning bare, like this.
		return

	await ctx.cinematic(true)
	await ctx.say(reader["name"], READERS[reader["id"]])
	await ctx.say("Reliquar Ansence", ["Yes. That is what I have had in my mouth for two winters.", "I did not sell it to them, so it is not my sale to unmake. That is the reasoning and I am aware of how it holds up."])
	ctx.set_flag("hand_read")
	await ctx.cinematic(false)

	var choice := await ctx.ask("Goodwife Ledger is at the other end of the lane with her hands in her apron, watching the party rather than the case.", ["Tell her", "Leave it in the case"], {"cancelable": false})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.cinematic(true)
		await ctx.say("Goodwife Ledger", ["Say it again with the year in it."])
		await ctx.say(null, ["It is said again with the year in it. She listens to the whole of it standing up and does not sit down afterwards."])
		await ctx.say("Goodwife Ledger", ["Right.", "It comes out of the case tonight, before the ninth, so that nobody has to be told anything on a day they were expecting to be told something."])
		await ctx.say("Vesna", ["You could leave it where it is."])
		await ctx.say("Goodwife Ledger", ["I could. I have been standing here working out whether I am the sort of woman who does, and it turns out I am not, and I would rather have found that out about something else.", "Three hundred and forty people put in for that. They can have it on the shelf with everything else that came out of a garden, and they can pick it up."])
		await ctx.say(null, ["It goes onto Onder Quillam's shelf the same evening, between a ring and a hinge, with no label on it.", "Nobody says anything about it in the lane for four days, and then somebody does, and it is about the price."])
		await ctx.say("Goodwife Ledger", ["Take it with you. I have looked at it enough and Onder will not sell it and I am not putting it back in a garden."])
		await ctx.grant_chest({"kind": "item", "id": "quicklimecharm", "label": "a Quicklime Charm"}, ctx.field)
		ctx.set_flag("hand_told")
		await ctx.cinematic(false)
	else:
		await ctx.say("Vesna", ["There was nothing on the wrist."])
		await ctx.say(null, ["Goodwife Ledger looks at Vesna for slightly longer than the sentence took, and then goes back to the shop."])
		await ctx.cinematic(true)
		await ctx.say("Reliquar Ansence", ["That is the answer I have been giving for two winters and it is a good deal harder to give the second time.", "Take the helm off the end of the counter. It came off a cairn east of here, I took it off myself with an apology, and it is exactly what I say it is.", "I do that once a year for my own sake. It is not much of a practice and it is the whole of one."])
		await ctx.grant_chest({"kind": "item", "id": "gravehelm", "label": "a Grave Helm"}, ctx.field)
		await ctx.cinematic(false)
	ctx.set_flag("hand_done")
	ctx.complete_quest("relic")


## The Last Lantern. The road is posted with numbers that are not distances,
## and at the end of it a woman fills a lamp because she was handed the can.
##
## If the party is carrying somebody who can say what the numbers are, she is
## told, and stops, and then does not stay stopped. If it is not, she never
## finds out and hands the can on, which is all she was ever after.
static func lastlantern_office(ctx: EventContext) -> void:
	if ctx.has_flag("office_done"):
		if ctx.has_flag("office_named"):
			await ctx.say("Hesper Cawl", ["It was out for one night. I lit it again in the morning and I have not made any decision past that morning.", "I will decide about tomorrow tomorrow. That is not a way of avoiding it. That is the size of decision I can get through."])
		else:
			await ctx.say("Hesper Cawl", ["Two of us can do it now. You did it once and you did it badly and that is still two.", "I have written the measure on the inside of the lid, in case the next one after you is worse at it."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The road in is twenty-four paces wide where it leaves the world and two paces wide where it arrives, and the posts along it are cut with numbers that get smaller.", "At the end of it there is a room ten paces by five with one bracket in it, and the lamp on the bracket is lit."])
	await ctx.say("Hesper Cawl", ["Every ninth day, a measure and a half of oil, and the wick trimmed square and not slanted.", "Tunn gave me the can. His aunt gave him the can. I never met the aunt and Tunn was not talkative."])
	await ctx.say("Vesna", ["What is it for."])
	await ctx.say("Hesper Cawl", ["I have three answers and I have stopped preferring any of them.", "The posts count down, so it is a countdown to something. Or it is the last one and somebody has to keep the last one. Or Tunn's aunt liked a job.", "Nobody comes down that road. I have been here eleven years and the only feet on it have been mine and yours."])
	await ctx.cinematic(false)

	var NAMERS = {"kestrel": ["Twenty-four, twenty, sixteen, twelve, eight, six, four, two, one. That is not a countdown. That is a draw table.", "It is what a well gives, year on year, as it runs out. Somebody has posted a road with the failing yield of a well.", "The last figure on it is one, and the lamp is standing where the one is."], "wick": ["Those are the hours of a vigil, counted down, and there are nine of them, and there were nine lanterns.", "This is the ninth office. Somebody set it out along a road so that a person walking it would arrive at the right hour without having to be told."], "idris": ["That road went to Ashenhall. Not the road on the map — this one, and it was walked at night, and the posts were for people who could not be given lamps.", "I have not been down it. I have known where it was for forty years and I have not been down it."]}
	var namer = ctx.speaking(NAMERS.keys())

	if namer:
		await ctx.cinematic(true)
		await ctx.say(namer["name"], NAMERS[namer["id"]])
		await ctx.say("Hesper Cawl", ["Say that again slowly and let me get it on the lid."])
		await ctx.say(null, ["She writes it on the inside of the lid of the oil can, in pencil, in a hand that has not written much lately."])
		await ctx.say("Hesper Cawl", ["Then it is finished. If it is a count and the count is at one, it is finished, and it has been finished since before Tunn."])
		await ctx.say(null, ["She puts the lamp out that evening. It is the first time the room has been dark since anyone alive can account for, and it is dark for about eleven hours.", "She lights it again after breakfast, without saying anything about it, and trims the wick square."])
		await ctx.say("Hesper Cawl", ["I will decide about tomorrow tomorrow.", "Take the old one off the bracket. It has been up there since Tunn and it has not held oil in years, and I have kept it because it was on the bracket."])
		await ctx.grant_chest({"kind": "item", "id": "ninthlanternstaff", "label": "a Ninth Lantern Staff"}, ctx.field)
		ctx.set_flag("office_named")
		await ctx.cinematic(false)
	else:
		await ctx.say("Hesper Cawl", ["You have not got it either. That is four sets of strangers and no two of you have even guessed the same wrong thing."])
		var choice := await ctx.ask("She is holding the can out at about waist height and has been for a while.", ["Fill it", "Leave it to her"], {"speaker": "Hesper Cawl", "cancelable": true})
		ctx.close_dialogue()
		if choice != 0:
			await ctx.say("Hesper Cawl", ["Fair enough. It is my ninth day and not yours.", "Come back when you have got somebody who reads numbers off a post. I am not going anywhere and neither is the post."])
			return
		await ctx.cinematic(true)
		await ctx.say(null, ["It takes about a quarter of an hour and it is done badly. The oil goes over the bracket and the wick comes out slanted, and she does not touch it afterwards."])
		await ctx.say("Hesper Cawl", ["That is two of us who have done it. That is the entire object of the exercise and it has taken me eleven years.", "Tunn stood over me while I did my first one and told me nothing except that the wick goes square. I have improved on him by exactly one sentence."])
		await ctx.say("Hesper Cawl", ["Take the coat off the hook. It was on the hook when I came and it is too big for me and it has been in this room a very long time."])
		await ctx.grant_chest({"kind": "item", "id": "vigilrobe", "label": "a Vigil Robe"}, ctx.field)
		await ctx.cinematic(false)
	ctx.set_flag("office_done")
	ctx.complete_quest("office")


## Oxmere's road warning. Cut deep, cut old, obeyed by everybody, and it means
## a drove. The town has replaced it with something better and the something
## better has kept children out of the road for four hundred years.
static func oxmere_road_warning(ctx: EventContext) -> void:
	if ctx.has_flag("droveroad_done"):
		if ctx.has_flag("droveroad_told"):
			await ctx.say("Old Pettigrew", ["They are still saying it. They say it now in the voice you use for a joke you have decided to keep.", "The children are still out of the road. I did wonder."])
		else:
			await ctx.say("Old Pettigrew", ["Sixty years and I have told nobody, and I would like it noted that not telling is a job of work."])
		return
	await ctx.say(null, ["The mile board is painted for the fairs and the roads, and under all of it, cut deep and much older than the paint: DO NOT SLEEP IN THE ROAD. THE ROAD IS WHERE THEY COME."])
	await ctx.say("Widow Marle", ["Every child in this town has that by heart before they can read it. There is a rhyme and I am not going to say the rhyme.", "You do not sleep in the road. You do not sit in the road after dark. You do not go into the throat at night for a hat."])
	await ctx.say("Vesna", ["What comes."])
	await ctx.say("Widow Marle", ["Nobody will tell you and it is not because they are frightened. It is because none of them knows and all of them are certain.", "Ask Pettigrew. He is ninety-one and he has an opinion about the wording, which is not the same thing as an opinion about the meaning."])
	await ctx.cinematic(true)
	await ctx.say("Old Pettigrew", ["They. Eleven hundred of them, twice a year, and the front of them cannot see the back of them, and they come up the middle of that road in the dark at four in the morning.", "That is your they. That is the whole of your they and it has never been anything else."])
	await ctx.say("Old Pettigrew", ["Whoever cut that was a drover telling other drovers where not to put a bedroll down. It is a notice about traffic.", "Four hundred years took the drovers off that road and left the notice standing on it. The town has been filling in the gap ever since, and what it has put in the gap is a good deal better."])
	await ctx.say("Vesna", ["Does anyone else know."])
	await ctx.say("Old Pettigrew", ["Chalker Ivy worked it out about nine years ago and has said nothing, and Cuffe has never worked it out and would be extremely cross.", "I have had sixty years on it and I have told nobody, and I am telling you because you are leaving."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("There are eleven people at the head trough and it is the part of the day when everybody is standing about.", ["Say it at the trough", "Leave it with him"], {"cancelable": true})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.say(null, ["It goes round the trough in about four minutes and comes back round improved.", "The drovers take it best. Two of them work out that they are they, and are pleased about it for the rest of the afternoon."])
		await ctx.say("Roadwarden Cuffe", ["A word.", "That notice is the only order in this town that has never once had to be enforced. Not by me, not by my father, not by anybody.", "I am not asking you to take it back. I am asking you to be less right in future, and to do it somewhere with a smaller trough."])
		await ctx.say(null, ["The rhyme is still being said by the end of the week, in the voice people use for a joke they have decided to keep.", "No child sleeps in the road that autumn either."])
		ctx.set_flag("droveroad_told")
	else:
		await ctx.say("Old Pettigrew", ["Good. Nobody cut that to fool anybody, and a thing nobody meant is not a lie, whatever else it is.", "It is a notice about traffic, read very carefully by four hundred years of people who were never on that road at four in the morning."])
	await ctx.say("Old Pettigrew", ["Take this. It came off a drover who slept in the road once, in my grandfather's time, and got up again, and never did it twice."])
	await ctx.grant_chest({"kind": "item", "id": "secondbreath", "label": "a Second Breath"}, ctx.field)
	ctx.set_flag("droveroad_done")
	ctx.complete_quest("droveroad")


## Emberlyn's east road, closed by nobody, on the authority of nobody, since a
## year nobody agrees on. This one does not get an answer and is not going to.
static func emberlyn_eastroad(ctx: EventContext) -> void:
	if ctx.has_flag("eastroad_done"):
		if ctx.has_flag("eastroad_rubbed"):
			await ctx.say(null, ["The line is back on the board, in a better hand than it was in, and the paint is not dry.", "Nobody at the toll has anything to say about who put it there, and four of them say it very quickly."])
		else:
			await ctx.say(null, ["EAST ROAD — CLOSED. ASK NOBODY WHY. The charcoal has been gone over often enough to have a ridge on it."])
		return
	await ctx.say(null, ["The toll board gives the north road and the south road and what each costs, and under both, in charcoal gone over many times: EAST ROAD — CLOSED. ASK NOBODY WHY."])
	await ctx.say("Drover Halm", ["Closed since the year twenty-nine, by the Imperium, on account of the bridge at the second ford.", "There is no bridge at the second ford. There is no second ford. I have been saying this sentence for thirty years and I have never once got to the end of it before somebody agreed with me."])
	await ctx.say("Sabrena Loth", ["Thirty-four, and it was the sickness, and it was the parish and not the Imperium, and my mother had the closing of it read out in this room.", "She was eleven at the time. I have had that story off her at the length it deserves and at three other lengths."])
	await ctx.say("Sesk", ["It was a man in a hurry. He had the chalk off the yard and he did it while the ostler was turning a horse, and he went out by the north gate and did not pay.", "That is not from anybody. I worked it out. Nobody writes on a board in charcoal if they are allowed to write on it."])
	await ctx.cinematic(true)
	await ctx.say(null, ["The board has been repainted four times since. Whatever hand wrote the line first went under the second coat.", "The east road itself is metalled, kerbed, and clear for as far as anyone will walk down it, which is about a mile, which is as far as anyone has walked down it since the line went up."])
	await ctx.say("Vesna", ["Where does it go."])
	await ctx.say("Sesk", ["East."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The line is charcoal on a painted board and would come off with a cuff.", ["Rub it out", "Leave the board alone"], {"cancelable": true})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.say(null, ["It comes off in one pass and leaves a clean grey patch the shape of the words.", "For six days the east road is open. Nobody uses it. On the seventh the line is back, in a better hand than it was in, in paint."])
		await ctx.say("Toll Clerk Nabb", ["I did not see who. I am at that board eleven hours a day and I did not see who, and I want you to know that I have thought about that."])
		ctx.set_flag("eastroad_rubbed")
	else:
		await ctx.say(null, ["The board stays as it is. The party goes north, along with everybody else, on the road that costs four gil the axle."])
		await ctx.say("Sesk", ["Everyone leaves it. You are the fourth lot to stand there deciding not to."])
	await ctx.say("Sabrena Loth", ["Take the coat off the peg by the door. It was left in year thirty-one by a man who said he was going east and then had a bowl of soup and went north."])
	await ctx.grant_chest({"kind": "item", "id": "roadcoat", "label": "a Road Coat"}, ctx.field)
	ctx.set_flag("eastroad_done")
	ctx.complete_quest("eastroad")


## Duncastle's muster roll. Six crossings ruled in advance, six men dead the
## following spring, and eleven years of being the town's one miracle.
static func duncastle_roll(ctx: EventContext) -> void:
	if ctx.has_flag("roll_done"):
		if ctx.has_flag("roll_told"):
			await ctx.say("Roll-Clerk Ombry", ["You told them and they took it as modesty. Two of them said it was very like me.", "I have stopped minding. There is a stage past minding and I have got to it and it is quite restful."])
		else:
			await ctx.say("Roll-Clerk Ombry", ["The book is on the shelf and the pen is with you. Somebody else rules the columns now and rules them one line at a time."])
		return
	await ctx.say(null, ["The muster roll is a hundred and ten names in columns, the old ones crossed and the new ones written underneath.", "Six of the crossings are in the same ink as the writing beneath them. The crossings were made first."])
	await ctx.say("Gate-Captain Ord", ["Ombry ruled those six the winter before. Six men off that roll went into the ground the following spring and he had the lines through them already.", "This town has one miracle. People bring him things to look at. He looks at them."])
	await ctx.cinematic(true)
	await ctx.say("Roll-Clerk Ombry", ["I had the pen charged. That is the whole of it and it has been the whole of it for eleven years.", "You do not stop mid-page to re-ink if you can help it. I ruled ahead as far as the pen would carry and the pen carried six."])
	await ctx.say("Vesna", ["Have you said that."])
	await ctx.say("Roll-Clerk Ombry", ["Every time I have been asked, in those words, for eleven years.", "It does not take. They hear a man explaining how he did it, which is what they came for, and they go away satisfied and tell somebody else."])
	await ctx.say("Roll-Clerk Ombry", ["A woman came up from Lowfen in the spring and asked me to rule six lines for her village. Ahead.", "I told her what I have just told you and she thanked me and asked again, and I said no, and she said she understood, and she has written twice since."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("There are about forty people in the bailey and the trader's boxes are open, which is when it is fullest.", ["Say it in the bailey", "Leave the book as it is"], {"cancelable": true})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.say(null, ["It is said in the bailey, plainly, with the book open and the pen held up, and it takes about two minutes.", "The bailey listens the whole way through. Nobody interrupts and nobody leaves."])
		await ctx.say("Barred Trader", ["That is very like him."])
		await ctx.say(null, ["Somebody at the back says the pen would have to have known. Somebody else says that is what they have been saying.", "By evening the story is that he was asked how he did it and gave an answer about ink, and the answer about ink is repeated with some affection."])
		await ctx.say("Roll-Clerk Ombry", ["Thank you. I would not have got the pen up that high on my own."])
		ctx.set_flag("roll_told")
	else:
		await ctx.say("Roll-Clerk Ombry", ["No. It is eleven years old and it has people in it now who do not know they are in it.", "I am giving up the roll at the quarter day. Not because of this. Because I am sixty and my hand has gone, and because the next one will rule one line at a time out of respect and that will be the end of it."])
	await ctx.say("Roll-Clerk Ombry", ["Take the pen. It is a good pen and it is the whole of the case against me."])
	await ctx.grant_chest({"kind": "item", "id": "unbrokenoath", "label": "an Unbroken Oath"}, ctx.field)
	ctx.set_flag("roll_done")
	ctx.complete_quest("sixlines")


## The Kingspyre. It has never gone out. Two men say they relit it, six years
## apart, and the book has no gap in it, and the brick will not settle it.
static func kingspyre_relight(ctx: EventContext) -> void:
	if ctx.has_flag("pyre_asked"):
		await ctx.say(null, ["The stack is sooted from the floor to the roof except for one clean band at about the height of a man, and the band goes the whole way round."])
		return
	await ctx.say(null, ["The stoking board is ruled for a shift of eleven. NEVER LESS THAN FOUR ON THE FLOOR AND NEVER ONE ON THE FLOOR ALONE.", "Underneath, in the same paint and the same hand: UNDER NO CIRCUMSTANCES GO ROUND THE STACK TO FETCH A MAN BACK."])
	await ctx.say("Stoke-Master Redd", ["It has not been out. Not in the book, not in my father's book, not in the book before that, and the books go back to the roof going on.", "That is the whole of what the Kingspyre is. It is not a fire. It is a fire that has not been out."])
	await ctx.cinematic(true)
	await ctx.say("Stoke-Master Redd", ["I relit it in year thirty-eight. Off the lamp on the dais rail, at about two in the morning, on my own, which is against the board.", "It was down to nothing in the west quarter and I got it back before the shift came on. I have never written it and I have never lied about it, because nobody has ever asked me in those words."])
	await ctx.say("Old Kell", ["He did not. I relit it in forty-four, off a taper I took from the stack itself, which is not possible if the stack was out, and it was not out, and I did it anyway.", "Both of those are true and I have had eleven years to make them sit together and they will not."])
	await ctx.say("Vesna", ["You cannot both have."])
	await ctx.say("Stoke-Master Redd", ["No."])
	await ctx.say("Old Kell", ["No."])
	await ctx.cinematic(false)

	var engineer = ctx.speaking(["aurelian", "rusk", "bastian"])
	if engineer:
		await ctx.say(engineer["name"], ["Go round the back of it and look at the brick. Soot does not lie about how high a fire has been."])
	await ctx.say(null, ["Behind the stack, where the board says not to go, the brick is sooted from the floor to the roof except for one clean band at about the height of a man.", "It goes the whole way round. It is either a year the fire did not reach, or it is where a scaffold plank sat, and there is no way in the world to tell which."])
	await ctx.say("Vesna", ["Nobody is going to settle it. There are two men in this room who know what happened, and there are two things that happened."])
	await ctx.say(null, ["Set into the brick behind the band, at about waist height, there is something that has not taken any soot at all."])
	await grant_esper(ctx, "thekingspyre", "a shard of magicite", ctx.field, "cinderheart", "a Cinder Heart")
	await ctx.say("Stoke-Master Redd", ["Put the board back the way it was and do not tell the shift where you found that.", "They go round the stack once and then they go round it whenever they like, and then one of them is round there on his own."])
	ctx.set_flag("pyre_asked")
	ctx.complete_quest("pyre")


## Harrowmere's well rim. Forty-one marks and then nothing, and the village
## has had four hundred good years out of it, and the woman who cut them is
## still alive and remembers exactly.
static func harrowmere_tally(ctx: EventContext) -> void:
	if ctx.has_flag("tally_told"):
		await ctx.say("Nan Ockley", ["You have not said it. I did not think you would and I have been watching to see."])
		return
	await ctx.say(null, ["Forty-one marks cut into the rim of the village well, close together, and then nothing.", "The stone has been worn smooth around them by four hundred years of buckets, and the marks have not been worn at all, because people put their hands somewhere else."])
	await ctx.say("Elder Sabbath", ["Forty-one households at the founding. Or forty-one years the water held in the dry spell. Or a debt, which is the version the Ferrans liked and paid for.", "It is a good rim. I have said all three of those from the step at one time or another and I have meant about two of them."])
	await ctx.cinematic(true)
	await ctx.say("Nan Ockley", ["Come away from the step and I will tell you, because you are not from here and you are going somewhere.", "I cut them. I was thirteen and the rope was new and my father had put in a trough that was too big."])
	await ctx.say("Nan Ockley", ["I counted the buckets it took to fill it. Forty-one, and I cut them as I went so he could not say I had lost count.", "He looked at the rim and he said, well, and he built a smaller trough, and that is the whole of it."])
	await ctx.say("Vesna", ["That is eighty years ago."])
	await ctx.say("Nan Ockley", ["Seventy-nine. The story got out ahead of me by about a generation and I have never been quick.", "I have heard it read off that rim at two funerals. It is a better rim their way and I am not going to stand in a churchyard and take it off them."])
	await ctx.say("Nan Ockley", ["Take the hood. It is warm and it is not the shape of anything and I have got another.", "And do not say it in the village. Say it anywhere else you like."])
	await ctx.grant_chest({"kind": "item", "id": "feltedhood", "label": "a Felted Hood"}, ctx.field)
	ctx.set_flag("tally_told")
	ctx.complete_quest("tally")
	await ctx.cinematic(false)


## The Ninth Well, after. People have started coming, and one of them has
## written down what happened here, and he is standing at the shaft head
## reading it to eleven people with the party in the audience.
static func ninthwell_account(ctx: EventContext) -> void:
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The bolted notice gives the draw schedule and somebody has written under the last figure that there is not forty-two of anything down there.", "Nobody is standing at the shaft head. Nobody has any reason to be."])
		return
	if ctx.has_flag("account_done"):
		if ctx.has_flag("account_corrected"):
			await ctx.say("Bede Ollin", ["I have got your corrections in. I read it out with them on Tuesday and it went better, which I did not expect and have not examined.", "Come back in the spring. It will have grown a bit. They always do and I have stopped fighting it."])
		else:
			await ctx.say("Bede Ollin", ["Fourth reading this month. Somebody asked me on Tuesday whether the four of them were real and I said that was not a useful question, and I stand by that."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["There are eleven people at the shaft head and a twelfth with a sheet of paper, standing where the draw gear used to be bolted down.", "None of them looks at the party for longer than it takes to decide they are not from Solmere."])
	await ctx.say("Bede Ollin", ["Four of them went down. Four, and one was a knight who had sat forty years on a step waiting for the day, and he knew it when it came.", "The Chancellor was at the bottom of it with the Engine open, and he was struck down by a voice, and the voice said the names."])
	await ctx.say("Bede Ollin", ["They said them out loud as they came back up. Every one. That is the part I want you to have if you have nothing else off me."])
	await ctx.say("Vesna", ["That last part is true."])
	await ctx.say("Bede Ollin", ["I made that part up."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("He has the sheet held in both hands and he is not looking at it, because he has it by heart.", ["Tell him what happened", "Let him read"], {"cancelable": true})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.cinematic(true)
		await ctx.say(null, ["It takes the better part of an hour and he writes the whole of it down, and asks four questions, and all four of them are about the order things happened in."])
		await ctx.say("Bede Ollin", ["Right. So it was slower, and there was more paperwork in it, and nobody was struck by anything.", "I can do that. It is harder and it is better and I will lose about two of the eleven."])
		await ctx.say("Vesna", ["Do you know who I am."])
		await ctx.say("Bede Ollin", ["You are somebody who was told it by somebody who was there. That is the good sort of witness and I have had six of you.", "The party that went down were four heroes out of Harrowmere and they are not in this county. I have that off three separate people."])
		var witness = ctx.speaking(["ilsabet", "kestrel"])
		if witness:
			await ctx.say(witness["name"], ["Leave it. He has got it more right than he had it an hour ago and that is the whole of what is available today."])
		ctx.set_flag("account_corrected")
		await ctx.cinematic(false)
	else:
		await ctx.say(null, ["He reads it to the end. It takes eleven minutes and it is a good deal better than what happened.", "Two of the eleven are crying by the finish and one of them is holding a hat."])
		await ctx.say("Vesna", ["We could have said."])
		await ctx.say(null, ["Nobody answers that, and the party is a long time getting up the stair."])
	ctx.set_flag("account_done")
	ctx.complete_quest("account")


## The Fen Barrow, after. The plaque says do not settle it. Three parishes
## have decided that means keep paying, and nobody can name who told them so.
static func fenbarrow_debt(ctx: EventContext) -> void:
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The iron plaque gives the year of the sealing and the instruction under it, and the step below it is bare mud.", "The seal on the door has been cut through, recently and badly, and nobody has been back to it."])
		return
	if ctx.has_flag("debt_done"):
		if ctx.has_flag("debt_paid"):
			await ctx.say(null, ["The step is fuller than it was. What the party left is under three other things and has gone green at one corner."])
		else:
			await ctx.say(null, ["The step is fuller than it was. Somebody has started sorting it, which is new, and is being done in rows."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["BELOW LIES A DEBT. DO NOT SETTLE IT.", "On the step under the plaque there is bread, and coin, and a shoe, and a tooth in a twist of cloth, and a great deal else, in about a foot of it."])
	await ctx.say("Fen Woman", ["Three parishes now. Lowfen come on the ninth, we come when we come, and the Marrowgate lot send theirs down with a carrier because they will not walk out on the fen.", "It is owed. That is what the plaque says. It says do not settle it, and settling it and paying it are not the same word."])
	await ctx.say("Vesna", ["Who told you that."])
	await ctx.say("Fen Woman", ["A man. In the autumn, on the road, and he had it off somebody at the outpost.", "I could not put a face on him and neither could Hessa and neither could the carrier, and the three of us have sat down and tried."])
	await ctx.say("Fen Woman", ["He was not asking for anything and he did not take anything off the step. I looked. I am not a fool and I did look."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The step is at about knee height and there is room on it.", ["Leave 500 gil on the step", "Leave nothing"], {"cancelable": true})
	ctx.close_dialogue()

	if choice == 0 and ctx.spend_gold(500):
		await ctx.say(null, ["The coin goes on the step at the back, where the rain gets at it least, which is where everybody puts coin."])
		await ctx.say("Fen Woman", ["You have done that before."])
		await ctx.say("Vesna", ["No."])
		ctx.set_flag("debt_paid")
	elif choice == 0:
		await ctx.say(null, ["The party has not got five hundred to leave. The Fen Woman does not comment on that and does not need to."])
	else:
		await ctx.say("Fen Woman", ["Suit yourself. It is not a toll and nobody is counting, and if anybody starts counting I will have something to say about it."])
	await ctx.say("Fen Woman", ["Take that off the back of the step. It has been there since before I started coming and it is not bread and it is not coin.", "Somebody left a ring on a barrow step. I have thought about that more than is good for me."])
	await ctx.grant_chest({"kind": "item", "id": "bloodironband", "label": "a Blood Iron Band"}, ctx.field)
	ctx.set_flag("debt_done")
	ctx.complete_quest("debt")


## Ashenhall, after. The ninth alcove is empty because the party emptied it,
## and there is a card up explaining that the lamp is being cleaned.
static func ashenhall_cleaned(ctx: EventContext) -> void:
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The ninth alcove holds its lamp and the other eight are scoured to the brick.", "There is nobody at the door. The hall has not needed anybody at the door for a very long time."])
		return
	if ctx.has_flag("alcove_done"):
		if ctx.has_flag("alcove_told"):
			await ctx.say("Hall-Keeper Bram", ["The card says AWAY. It said TAKEN for a morning and I had four conversations before noon, so it says AWAY.", "That is not cowardice. That is one man on a door with no lamp behind him."])
		else:
			await ctx.say("Hall-Keeper Bram", ["BEING CLEANED. That card has been up a year and two months and nobody has yet asked me who is doing the cleaning."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["There are nine visitors in the hall and they have come a long way, and one of them has brought a child on his shoulders to see it.", "The ninth alcove is empty. On the rail in front of it there is a card in a good hand: BEING CLEANED."])
	await ctx.say("Hall-Keeper Bram", ["It is away being cleaned. It will be back.", "It comes off the bracket every so often; a thousand years of burning puts a great deal on the glass, and it wants doing properly and it wants doing in Solmere."])
	await ctx.say(null, ["He says it the way a man says a thing he has said four hundred times. The visitors take it well. The one with the child says they will come back in the spring."])
	await ctx.say("Hall-Keeper Bram", ["I put the card up myself. Nobody told me to and nobody has told me not to.", "It went out of that alcove in the autumn and there was a great deal of noise about it, and then Solmere stopped answering letters, and I have had a year of people with children in the doorway."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The hall is empty for about a quarter of an hour between one party of visitors and the next.", ["Tell him where it went", "Leave the card up"], {"cancelable": true})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.cinematic(true)
		await ctx.say("Hall-Keeper Bram", ["Sit down and start at the alcove."])
		await ctx.say(null, ["It is told from the alcove. He does not interrupt and he does not ask what happened to her."])
		await ctx.say("Hall-Keeper Bram", ["Right. Then what do I put on the card.", "I am not being difficult. There is a card and it has a hook and something has to be on it by two o'clock."])
		await ctx.say(null, ["He writes TAKEN and puts it up, and it is up for one morning.", "By noon he has had four conversations in the doorway and by the afternoon the card says AWAY, and it has said AWAY since."])
		await ctx.say("Hall-Keeper Bram", ["One word is worse than the other and I could not tell you which of them it is."])
		ctx.set_flag("alcove_told")
		await ctx.cinematic(false)
	else:
		await ctx.say(null, ["The next party of visitors comes in at about four. There are six of them and two have walked from the coast.", "The card is still up. Bram gives them the whole of it, including the part about the glass, and they are pleased with him."])
	await ctx.say("Hall-Keeper Bram", ["Take the cloth out of the alcove. It was under her the whole time and it has never been out in the light, and it will go the colour of everything else in about a year now."])
	await ctx.grant_chest({"kind": "item", "id": "mantleofnine", "label": "a Mantle of Nine"}, ctx.field)
	ctx.set_flag("alcove_done")
	ctx.complete_quest("alcove")


## Greyharrow holds a day for the fighting at the ford. The garrison day-book
## has the garrison nine miles away moving stone. Two men were at the ford and
## neither of their fords is the other one's ford.
static func greyharrow_ford(ctx: EventContext) -> void:
	if ctx.has_flag("ford_asked"):
		if ctx.has_flag("ford_read"):
			await ctx.say("Captain Ilene Marr", ["They held the day in the spring with a verse in it about the day-book. It scans better than the rest of it.", "Sixty-one people heard me read that page out and sixty-one people came to the day. I have not decided what that is evidence of."])
		else:
			await ctx.say("Captain Ilene Marr", ["The book is in the case and the day is in the spring, and I go to the day, because I am the Captain and the Captain goes."])
		return
	await ctx.say(null, ["The muster board gives an establishment of four hundred and a present of sixty-one, and the sixty-one has been scraped off and rewritten until the slate has gone thin.", "Beside it, on a card that is newer than everything else on the wall: THE DAY OF THE FORD — SECOND WEEK OF APRIL. STALLHOLDERS SEE THE SERJEANT."])
	await ctx.say("Bevis Hark", ["I was at the ford. Waist deep, on the far bank, from the middle of the morning until it was over.", "It came on quick and it was done by two and there were sixty of us and we did not give a foot of it."])
	await ctx.say("Old Marchand", ["I was at the ford. It started at dusk and it went all night and there was nothing quick about any part of it.", "Hark was there. I have never once said he was not there. He has the day wrong and he has the light wrong and I am not going to argue with him at ninety."])
	await ctx.cinematic(true)
	await ctx.say("Captain Ilene Marr", ["I have the day-book for that year. It is a garrison book, kept daily, signed off weekly, and it has never been out of the case.", "That week the establishment was at Highfell moving stone for the new gallery head. All of it. There is a return with a tonnage on it."])
	await ctx.say("Vesna", ["And the ford."])
	await ctx.say("Captain Ilene Marr", ["The ford is nine miles the other way and there is not a line about it in the book, that week or any week either side.", "I have had this book eleven years. I have read that fortnight so often I could give you the weather."])
	await ctx.say("Captain Ilene Marr", ["Hark is not lying. Marchand is not lying. The book is not wrong; it is a garrison book and it was signed off by a man who is buried in the town.", "Those are three things and they will not go into two."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The book is on the table with the fortnight open, and there are people at the market end who would come over if anything were being read out.", ["Ask her to read the page out", "Let the day stand"], {"cancelable": true})
	ctx.close_dialogue()

	if choice == 0:
		await ctx.say(null, ["She reads the fortnight out on the drill square, at the pace a return is meant to be read at, which is not a pace that holds a crowd.", "Sixty-one people stay for the whole of it. Hark stays. Marchand is brought a chair."])
		await ctx.say("Bevis Hark", ["That is a book about Highfell."])
		await ctx.say("Captain Ilene Marr", ["Yes."])
		await ctx.say("Bevis Hark", ["Then it is a book about Highfell."])
		await ctx.say(null, ["The day is held in the spring. There is a new verse in it about a day-book, and the new verse scans better than any of the old ones."])
		ctx.set_flag("ford_read")
	else:
		await ctx.say("Captain Ilene Marr", ["Then it stands, and I go to it, and I stand at the front of it in a coat.", "I have carried that page about with me for eleven years and I am going to have to put it down somewhere, and I would rather not put it down on Marchand."])
		await ctx.say(null, ["She shuts the case and turns the key, and then checks the key, which she has already turned."])
	await ctx.say("Field Armourer Kest", ["Take this out of the rack on your way. Half a sword, off the ford or off Highfell depending who you ask, and it has been in that rack since before my time.", "It has never needed the other half. That is not a saying about the sword. Somebody ground the end of it flat on purpose."])
	await ctx.grant_chest({"kind": "item", "id": "brokenstandard", "label": "The Broken Standard"}, ctx.field)
	ctx.set_flag("ford_asked")
	ctx.complete_quest("ford")


## The Drowned Halls. Two sounders went down the same week and came up with
## two different lower storeys. The party can go and look, and looking does
## not help, and that is the point of going.
static func drownedhalls_blue(ctx: EventContext) -> void:
	if ctx.has_flag("blue_looked"):
		await ctx.say("Sounder Krell", ["You went down. You came up. You have not said which and neither of us has asked you twice, and we have both wanted to."])
		return
	await ctx.say(null, ["The surveyor plan is pinned in oiled cloth and drawn as two storeys with the stairs ruled across the gap.", "The lower plan has been inked over in blue and written across: STILL THERE. The blue is fresher than the plan by a great deal."])
	await ctx.say("Sounder Krell", ["That is my hand and I go over it every spring. I went down in the year forty-nine, on the line, past the strongroom lintel.", "The lower storey is lit. Lamps, burning, under eleven feet of water, and I was down there long enough to count four of them and come up."])
	await ctx.say("Sounder Ide", ["I went down the same week. Same line, same lintel, four days after him.", "It is black. It is the blackest water on this coast and there is nothing in it and there has never been anything in it."])
	await ctx.say("Sounder Krell", ["She is not lying."])
	await ctx.say("Sounder Ide", ["He is not lying either. That is the difficulty and we have been at it eleven years."])
	await ctx.cinematic(true)
	await ctx.say(null, ["The tide gauge stands at eleven feet. The highest mark ever cut into the brass is four, and it has been cut over three times, each time higher than the last."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The line is on the drum and the drum is greased and there are two people here who will work it.", ["Go down on the line", "Stay on the boards"], {"cancelable": true})
	ctx.close_dialogue()

	if choice != 0:
		await ctx.say("Sounder Ide", ["Sensible. Everybody who goes down comes up on one side of it and then they are on that side for good, and there are only the two sides."])
		await ctx.say("Sounder Krell", ["Come back in the spring. The blue will be fresh and I will be at it with the pot."])
		return

	await ctx.say(null, ["The line goes down past the strongroom lintel. Something is on the line before the lower storey is."])
	var result := await ctx.battle({"enemies": ["deepcantor", "keelworm", "deepcantor"]}, {"terrain": "marble", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	await ctx.cinematic(true)
	await ctx.say(null, ["The lower storey is peat-dark and the party is carrying the only light in it, which means the only thing anybody can be sure of is the last four feet.", "There is something further off, twice, at about the height a lamp would be on a bracket. Both times it is gone before anybody can get the light round to it."])
	await ctx.say("Vesna", ["I could tell you what I think. I would be telling you what I think and it would go straight in the blue."])
	await ctx.say(null, ["The party comes up on the line. Krell is at the drum and Ide is at the rail and neither of them asks."])
	await ctx.say("Sounder Ide", ["You do not have to say."])
	await ctx.say(null, ["Wedged under the strongroom lintel, where the water thins, there is something that has been keeping its own temperature down there."])
	await ctx.grant_chest({"kind": "item", "id": "wellheart", "label": "a Well Heart"}, ctx.field)
	ctx.set_flag("blue_looked")
	ctx.complete_quest("lowerstorey")
	await ctx.cinematic(false)


## The Sunken Vault. The nave is under water and the hours are still being
## said in the dry aisle by somebody who learned them at a door, by ear.
static func sunkenvault_hours(ctx: EventContext) -> void:
	if ctx.has_flag("hours_heard"):
		await ctx.say("Vault-Keeper Merrit", ["Sixth hour is in about twenty minutes if you are staying. It is the short one and it is the one I am surest of."])
		return
	await ctx.say(null, ["The aisles are dry and the nave is not, and both of them were meant to be dry.", "Somebody has chalked an arrow at the one place the water thins, and gone over it often enough that the chalk has built up a lip."])
	await ctx.say("Vault-Keeper Merrit", ["Six a day, and the sixth at dusk, and I have not missed one since the water came up.", "I was nine when they still had the nave. I was not let in, so I sat outside the door on the step with my back to it, which is how you learn anything at nine."])
	await ctx.say("Vesna", ["You never went in."])
	await ctx.say("Vault-Keeper Merrit", ["I went in at eleven and the water was at the third step by then and they had stopped saying them properly.", "So what I have got is the door version. Every word of it off a step, through two inches of oak, at nine."])
	await ctx.cinematic(true)
	await ctx.say(null, ["The fifth hour is said in the dry aisle with the water four feet away and the gauge ticking behind it.", "It takes about twenty minutes. She says it at a pace that has nothing to do with how long the words are."])
	var wick = ctx.speaking(["wick"])
	if wick:
		await ctx.say("Wick", ["Half of that is not the office. About a third of it is the office with the order changed, and there is a whole section in the middle that is somebody's list of names."])
		await ctx.say("Wick", ["I am not going to say so. She is four feet from the water and she has not missed one."])
	else:
		await ctx.say(null, ["Nobody in the party has ever heard the office said any other way, so nobody in the party can tell."])
	await ctx.say("Vault-Keeper Merrit", ["It is wrong. You do not have to be polite about it; I have known since I was eleven.", "A man came through in the year forty and said the whole of the fourth hour properly, standing where you are, and I listened to it all the way to the end."])
	await ctx.say("Vesna", ["You did not change it."])
	await ctx.say("Vault-Keeper Merrit", ["No. His was the right one and mine is the one this building has had for forty years, and there is only one of us here every day at dusk.", "I have got his written down. It is in the box under the gauge and I have not opened the box."])
	await ctx.say("Vault-Keeper Merrit", ["Take the robe off the hook. It is cut for somebody who has to be heard at the far end of a nave and there is no far end of the nave."])
	await ctx.grant_chest({"kind": "item", "id": "chanterrobe", "label": "a Chanter's Robe"}, ctx.field)
	ctx.set_flag("hours_heard")
	ctx.complete_quest("hours")
	await ctx.cinematic(false)

