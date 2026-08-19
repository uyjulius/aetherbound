class_name EventsVol4
extends RefCounted
##
##
## Scripted events, volume four — work and trade.
##
## Same contract as `EVENTS`, `VOL2_EVENTS` and `VOL3_EVENTS`: every entry is a
## generator receiving `(game, ctx)` and written as a coroutine, so a scene
## reads top to bottom in source the way it plays on screen. Nothing in here is
## on the critical path.
##
## Volume two was the cast, volume three was the places. This one is the money:
## who pays whom, for what, and what happens to a town when that stops. It sits
## almost entirely in the six towns nothing has used yet, because each of those
## towns is already a diagram of one trade —
##
## Caldwick   a kiln that has never been let out, and the fuel to keep it in
## Oxmere     a road with a weighing shed halfway down it
## Thistlebeck  one bridge, owned by one half of the town
## Greyharrow  a market that pays a fine because it is not allowed to pay rent
## Marrowgate  three hundred people living off what the ground gives back
## Lowfen     a town that is carried up a bank and down it again
##
## Two chains run four and five stages. Both are gated stage by stage on flags
## rather than on a count, because both are arguments and an argument has an
## order: you cannot settle the burners' hours before you know where the heat
## is going, and you cannot accuse a sealer of weights before you have stood in
## the shed and watched the beam.
##
## Neither chain is gated on the world state, and neither needs to be. The
## ruined variants of Caldwick and Oxmere take the carter, the reeve, the
## chalker and the roadwarden off the map themselves, so the chains belong to
## the whole world without anything in here having to say so.
##
## Four scenes are gated on `party.worldState === 'ruin'`, and two of those are
## the optional bosses: the Yardmaster at the old blooding gate in the
## Bramblewold, and the Cold Forge in a bay off the Last Lantern road. Both are
## businesses that never received notice to stop.
##
##
## First of `ids` standing in the active four, or null.
##
## The active party rather than the roster: a line that belongs to a trade —
## an engineer looking at a flue, an archivist looking at a title — is only
## worth writing if the player can see it change when they change the party.
##
##
## Hand over magicite that may already be in the party's keeping.
##
## Every shard in the game is also sitting in a chest somewhere, so a scene
## that ends by announcing a thing the player already owns needs a second
## ending. This is volume three's arrangement and it is here for the same
## reason, with the plain metal paid out instead.
##
##
## Translated from `src/data/events-vol4.js` by `tools/translate-events.mjs`, which copies the
## dialogue rather than retyping it and rewrites only the shape around it. Every scene
## here is compared against the reference's own transcript by
## `tools/events-parity.mjs`, under five branch policies.

const IDS := [
	"caldwick_short_cord", "caldwick_lodge_notice", "caldwick_cord_cornered", "caldwick_flue_arithmetic",
	"caldwick_fourth_hour", "oxmere_two_head", "oxmere_chalk_bar", "oxmere_weighing_beam",
	"oxmere_sealer_of_weights", "thistlebeck_covenant", "greyharrow_indenture", "greyharrow_misc_drawer",
	"lowfen_lime_barge", "oxmere_last_hurdler", "marrowgate_eight_yards", "marrowgate_undercroft_rent",
	"lowfen_last_carry", "caldwick_cold_apron", "bramblewold_yardmaster", "lastlantern_cold_forge",
]


static func run(id: String, ctx: EventContext) -> void:
	match id:
		"caldwick_short_cord": await caldwick_short_cord(ctx)
		"caldwick_lodge_notice": await caldwick_lodge_notice(ctx)
		"caldwick_cord_cornered": await caldwick_cord_cornered(ctx)
		"caldwick_flue_arithmetic": await caldwick_flue_arithmetic(ctx)
		"caldwick_fourth_hour": await caldwick_fourth_hour(ctx)
		"oxmere_two_head": await oxmere_two_head(ctx)
		"oxmere_chalk_bar": await oxmere_chalk_bar(ctx)
		"oxmere_weighing_beam": await oxmere_weighing_beam(ctx)
		"oxmere_sealer_of_weights": await oxmere_sealer_of_weights(ctx)
		"thistlebeck_covenant": await thistlebeck_covenant(ctx)
		"greyharrow_indenture": await greyharrow_indenture(ctx)
		"greyharrow_misc_drawer": await greyharrow_misc_drawer(ctx)
		"lowfen_lime_barge": await lowfen_lime_barge(ctx)
		"oxmere_last_hurdler": await oxmere_last_hurdler(ctx)
		"marrowgate_eight_yards": await marrowgate_eight_yards(ctx)
		"marrowgate_undercroft_rent": await marrowgate_undercroft_rent(ctx)
		"lowfen_last_carry": await lowfen_last_carry(ctx)
		"caldwick_cold_apron": await caldwick_cold_apron(ctx)
		"bramblewold_yardmaster": await bramblewold_yardmaster(ctx)
		"lastlantern_cold_forge": await lastlantern_cold_forge(ctx)


## A step several scenes share, translated from the module helper of the
## same name.
static func grant_shard(ctx: EventContext, id: Variant = null, label: Variant = null, field: Variant = null, spareId: Variant = null, spareLabel: Variant = null) -> void:
	if not ctx.has_esper(id):
		await ctx.grant_chest({"kind": "esper", "id": id, "label": label}, ctx.field)
		return
	await ctx.say(null, ["It is %s, and there is one of those in the party's keeping already." % [ctx.esper_name(id)], "Nobody says anything about that for a moment, and then somebody puts the other thing in the bag instead."])
	await ctx.grant_chest({"kind": "item", "id": spareId, "label": spareLabel}, ctx.field)


## /** Carter Nunn at the fuel gate. Fourteen days of wood on a sixty-day yard. */
static func caldwick_short_cord(ctx: EventContext) -> void:
	if ctx.has_flag("lodge_settled"):
		await ctx.say("Carter Nunn", ["Sixty days on the yard again by the end of the month. I came in on Tuesday and could not see across it, and I sat on the cart a while before I got down."])
		return
	if ctx.has_flag("cord_short"):
		await ctx.say("Carter Nunn", ["Eleven days now. I am not carting any slower. There is less at the other end to cart."])
		return
	ctx.start_quest_at("lodge", 0)
	ctx.set_flag("cord_short")
	await ctx.say("Carter Nunn", ["Nineteen years I have brought wood in and taken dust out, and this yard has never once been under sixty days of fuel.", "It is under fourteen."])
	await ctx.say("Vesna", ["Has the cutting stopped."])
	await ctx.say("Carter Nunn", ["The cutting has not stopped. The wood is cut and stacked at Farrow's End and it is sitting there getting no drier than it already is.", "Somebody has bought the standing lot. Nine miles round, in one afternoon in March, before a stick of it came down."])
	await ctx.say("Carter Nunn", ["Caldwick has bought that coppice cord by cord since my grandfather. At the gate, in coin, on a nod.", "There is a name on a contract now and I am told it is a Thistlebeck name, which in this town is the same as saying it is a name."])
	await ctx.say("Carter Nunn", ["Ask Fettle what fourteen days means on the apron. He will put it to you better than I can, because I go home at night."])


## /** Burner Fettle. The lodge gives notice, and the notice is the length of the wood. */
static func caldwick_lodge_notice(ctx: EventContext) -> void:
	if ctx.has_flag("lodge_settled"):
		await ctx.say("Burner Fettle", ["Four on, four off, and the book says so, and I have read the book twice since Monday for no reason at all."])
		return
	if not ctx.has_flag("cord_short"):
		await ctx.say("Burner Fettle", ["Four on the apron, four off. There is nothing to tell you and I would rather not be told anything either."])
		return
	if ctx.has_flag("lodge_notice"):
		await ctx.say("Burner Fettle", ["The notice is up on the lodge door and the date on it does not move.", "Go and see the man who bought the wood. He is at the far end of a bridge at Thistlebeck and he is not hiding from anybody."])
		return
	await ctx.cinematic(true)
	await ctx.say("Burner Fettle", ["Fourteen days of fuel means we draw thin and charge thin. A thin charge burns hotter and faster, and the work on the apron goes up, not down.", "We have been doing six hours on since the spring. Four is the number. Four has been in the lodge book since there was a lodge book."])
	await ctx.say("Vesna", ["What is in the sixth hour."])
	await ctx.say("Burner Fettle", ["The sixth hour is where a man stops being able to tell hot from cold by looking at it. That is not a turn of phrase. That is the hour.", "Two of us have gone into the slaking well since March and both of them were in their sixth."])
	await ctx.say("Burner Fettle", ["So the lodge has given notice. Fourteen days, which is the same as the wood, and nobody arranged that and everybody has noticed it.", "On the fifteenth we come off the apron and stay off, and then Caldwick finds out what it costs to let a kiln go. Eleven days, four hundred cord, forty men, and not one person alive who has done it."])
	await ctx.say("Vesna", ["You would put it out."])
	await ctx.say("Burner Fettle", ["I would not. I have said we will.", "Those are two different sentences and the whole town is standing in the gap between them, which is where the town has always stood, only now it can see the edges of it."])
	ctx.set_flag("lodge_notice")
	ctx.advance_quest("lodge", 1)
	await ctx.cinematic(false)


## /** Broker Ivo Quint at Thistlebeck. He has the wood and it is not the problem. */
static func caldwick_cord_cornered(ctx: EventContext) -> void:
	if ctx.has_flag("lodge_settled"):
		await ctx.say("Broker Ivo Quint", ["March prices, in public, with the loss written down where the Old Side could read it upside down. I have never enjoyed anything more."])
		return
	if not ctx.has_flag("lodge_notice"):
		await ctx.say("Broker Ivo Quint", ["Standing timber, mostly, at the moment. It is a dull thing to hold and it does not go off."])
		return
	if ctx.has_flag("cord_cornered"):
		await ctx.say("Broker Ivo Quint", ["I am still holding it and it is still not the answer. Go and ask your reeve what goes in and what comes out."])
		return
	await ctx.say("Broker Ivo Quint", ["Yes. Every standing cord within nine miles of Caldwick, bought in one afternoon, and I have not moved a stick of it since.", "Before you work round to it: I am not squeezing them. I would very much like to be squeezing them. Squeezing is quick, and this has taken four months."])
	await ctx.say("Vesna", ["Then what is it for."])
	await ctx.say("Broker Ivo Quint", ["Caldwick has never bought fuel at a price. It buys at a nod, at the gate, in coin, off men whose fathers sold to it.", "There is no figure anywhere in the world for what a cord to that kiln is worth. I mean that exactly. I have looked."])
	await ctx.say("Broker Ivo Quint", ["So I hold the whole lot, and the first sale sets a figure, and every sale after it argues with the first, and in thirty years there is a market where there was a nod.", "That is the trade. It is slow and it is dull and it is the only one I have ever wanted to be in."])
	await ctx.say("Vesna", ["They have eleven days."])
	await ctx.say("Broker Ivo Quint", ["Eleven. I count as well.", "And here is the part I have been sitting with since August. They are burning more wood than they were in March, off the same draw, out of the same kiln, and that is not my doing and it is not the coppice."])
	await ctx.say("Broker Ivo Quint", ["I have cornered the market in a thing that is not their problem, which has been the worst fortnight of my professional life.", "Go and ask the chalk-reeve what goes in at the top and what comes out at the bottom. If the answer is the one I think it is, I will sell at March prices and take the loss where both banks can watch me take it."])
	ctx.set_flag("cord_cornered")
	ctx.advance_quest("lodge", 2)


## Chalk-Reeve Ondrey's two columns, and the flue under the apron that the
## gap goes down. The only fight in the chain, and it is housekeeping.
static func caldwick_flue_arithmetic(ctx: EventContext) -> void:
	if ctx.has_flag("flue_found"):
		await ctx.say("Chalk-Reeve Ondrey", ["Forty charged, thirty-six drawn, and now I know the name of the hole. It has not improved the figures and it has improved me."])
		return
	if not ctx.has_flag("cord_cornered"):
		await ctx.say("Chalk-Reeve Ondrey", ["In-weight and out-weight, and a gap between them I am not going to discuss with strangers in a yard."])
		return

	if not ctx.has_flag("flue_open"):
		await ctx.cinematic(true)
		await ctx.say("Chalk-Reeve Ondrey", ["I have kept both columns since I was twenty-two. I have never once had to explain the gap between them, because until the spring there was not one.", "Forty bushel charged in at the top. Thirty-six drawn from the bottom. Every day since March, and the four does not go anywhere that I can put on a scale."])
		await ctx.say("Vesna", ["Then it is not the lime. It is the heat."])
		await ctx.say("Chalk-Reeve Ondrey", ["It is the heat, and the heat goes down.", "There is a flue under the apron that was cut in my great-grandfather's time. It is on no plan I hold. I know it is there because in February the ring road is dry over it and wet either side."])
		var engineer = ctx.speaking(["aurelian", "rusk", "bastian"])
		if engineer:
			var lines = {"aurelian": ["A flue that draws is a flue that is going somewhere. They do not simply lose pressure into the ground; the ground is not interested.", "Somebody put the far end of that where they wanted it. Four bushel a day is not a leak, it is a delivery."], "rusk": ["A CHANNEL WITH A DRAUGHT IN IT HAS TWO ENDS. THIS IS NOT AN OPINION.", "I WILL GO FIRST. I DO NOT MIND THE HEAT AND I HAVE NEVER MINDED THE DARK, AND ONE OF THOSE IS SOMETHING I HAVE ONLY RECENTLY FOUND OUT."], "bastian": ["Four feet by three. I have been down worse and I have been down narrower, and the narrower ones were the ones that were meant to be walked in.", "Somebody meant this to be walked in."]}
			await ctx.say(engineer["name"], lines[engineer["id"]])
		await ctx.say("Chalk-Reeve Ondrey", ["I am not going down it. I weigh things. That is the entire trade and I have been careful for thirty years not to let it become any other trade."])
		ctx.set_flag("flue_open")
		ctx.advance_quest("lodge", 3)
		await ctx.cinematic(false)

	await ctx.say(null, ["The flue runs from under the apron out towards the ring wall, four feet by three, brick-lined, and swept by nothing but its own draught for two hundred years.", "It is not empty. Things have come in at the wall end and found somewhere warm and stayed."])

	var result := await ctx.battle({"enemies": ["kilnwidow", "slagcolt", "slagcolt"]}, {"terrain": "cobble", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	await ctx.cinematic(true)
	await ctx.say(null, ["Where the flue turns for the wall it has been opened out. Not broken through — cut, squared and lined, by somebody who was good at it and had time.", "It goes on into the back of a hearth, and the damper at that end is standing open. It has been open long enough for the pin to wear a groove in the iron."])
	await ctx.say("Vesna", ["Whose hearth."])
	await ctx.say(null, ["There is a mark on the brick where it was cut, and it is the mark on the sign over the forge door."])
	await ctx.say("Chalk-Reeve Ondrey", ["Four bushel a day, down a hole, into a smith's fire. And Crane pays the burners in nails.", "His grandfather cut that. His grandfather told him what it was and how to work it, and then everybody who might have objected died of being old."])
	ctx.set_flag("flue_found")
	ctx.advance_quest("lodge", 4)
	await ctx.cinematic(false)


## The settlement, on the apron, with the book open on the wall.
##
## Both answers cost. Bricking the flue ends a forge that has run on borrowed
## heat for two hundred years; buying the year's cord leaves the hole open
## and comes out of the party's purse. There is no third answer and the town
## has not got one either.
static func caldwick_fourth_hour(ctx: EventContext) -> void:
	if ctx.has_flag("lodge_settled"):
		if ctx.has_flag("flue_bricked"):
			await ctx.say("Halber Crane", ["Cold in here. Two hundred years and I had never once put a hand on that wall and found it cold.", "I am shoeing at the north end three days a week for Dunnock's brother, who is worse at it than Dunnock and pays better."])
		else:
			await ctx.say("Halber Crane", ["The damper stays open and it is written down that it stays open, which is somehow worse than it being a secret.", "Fettle looks at the floor when he comes in for nails. He did not used to look at anything."])
		return
	if not ctx.has_flag("flue_found"):
		await ctx.say("Halber Crane", ["I have never lit my own forge and I have never made a secret of it. Take heat where it is, that is the whole of my grandfather's advice and most of mine."])
		return

	await ctx.cinematic(true)
	if ctx.world_state == "ruin":
		await ctx.say(null, ["The apron is cold and has been for some time. They hold the settlement on it anyway, because the book runs to the end of the month and the month is not over."])
	await ctx.say(null, ["Ondrey has the book open on the ring wall with a stone on the corner of it. Fettle is on the other side with his cap in his hand, which he has not done once in any of this."])
	await ctx.say("Halber Crane", ["I have known since I was eleven. He sat me on that wall and showed me the damper and told me what it took off the kiln, and then he said nobody misses four bushel while there are sixty days on the yard.", "There have been sixty days on the yard every day of my life until March."])
	await ctx.say("Vesna", ["And since March."])
	await ctx.say("Halber Crane", ["Since March it has been four bushel that Fettle stands two extra hours to make up.", "I have had a fortnight to find a way of putting that which is not the way I have just put it, and I have not found one, and I have had a great deal of time on the anvil to look."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The mortar is mixed and standing by the apron door. Nobody will say who mixed it.", ["Brick up the flue", "Buy the year's cord at the broker's price"], {"cancelable": false})
	ctx.close_dialogue()

	if choice == 1:
		if not ctx.spend_gold(5200):
			await ctx.say("Chalk-Reeve Ondrey", ["You are short. Quint will hold his price for a month and not an hour past it, and I have never known him to be talked out of an hour."])
			return
		await ctx.cinematic(true)
		await ctx.say(null, ["Quint sells at March prices on the bridge, out of doors, with the figure written up on a board so that both banks can look at it on their way past.", "The difference goes across the trestle in the party's coin and he counts it twice and enters it as a loss, which is the part he had been looking forward to."])
		await ctx.say("Broker Ivo Quint", ["There is a price now. It is a bad price and it is written down, and in eleven years somebody will argue with it, and that is the whole of the trade I am in."])
		await ctx.say("Burner Fettle", ["Four on the apron from Monday.", "There is a hole under my feet that eats four bushel a day and I have agreed not to mind about it. I have agreed in writing, which is new for me."])
		await ctx.say("Chalk-Reeve Ondrey", ["I will go on entering it. Forty charged, thirty-six drawn, and a note in the margin naming everybody who agreed to the four.", "In eighty years a man will find that page and think we were fools. He will be reading my handwriting while he does it, so he can think what he likes."])
		await ctx.say("Burner Fettle", ["Off the lodge door. It has hung on that nail since my father's time and no man on that apron has ever slept through a shift.", "I am not saying the two facts are joined. I am saying I would not take it down for anybody who had not stood the fortnight we have just stood."])
		await ctx.grant_chest({"kind": "key", "id": "wakefulcharm", "label": "a Wakeful Charm"}, ctx.field)
		ctx.set_flag("cord_bought")
	else:
		await ctx.cinematic(true)
		await ctx.say(null, ["It takes an afternoon. Crane carries the brick himself and will not be helped with it, and Fettle mixes for him, and neither of them says anything for the length of the job.", "The last course goes in at the forge end, so that the man laying it is looking at his own hearth while he closes it."])
		await ctx.say("Halber Crane", ["Two hundred and eleven years the kiln, and two hundred of them my family on the back of it.", "It has not been a forge. It has been a flue with an anvil at the end of it, and I have known the difference since I was eleven and have gone on calling it a forge."])
		await ctx.say("Halber Crane", ["Take these. Struck this afternoon off the last heat, while the mortar went off behind me.", "There is one billet of that metal left in the district and it has been in my floor since my father put it there. It has gone into this and there will not be another, and I would rather it went up the road than into a case."])
		await ctx.grant_chest({"kind": "key", "id": "enginecut", "label": "the Enginecut"}, ctx.field)
		await ctx.say("Burner Fettle", ["Four on the apron from Monday.", "I am not glad. I would like that entered, and I would like it entered in the same hand as the rest of it."])
		await ctx.say("Chalk-Reeve Ondrey", ["It is entered."])
		ctx.set_flag("flue_bricked")

	ctx.set_flag("lodge_settled")
	ctx.complete_quest("lodge")
	await ctx.cinematic(false)


## /** Roadwarden Cuffe at the count post. Two a morning, for five weeks. */
static func oxmere_two_head(ctx: EventContext) -> void:
	if ctx.has_flag("sealer_settled"):
		await ctx.say("Roadwarden Cuffe", ["Eleven forty in and eleven forty out. I have had a fortnight of that and I still go back and look at the slate twice."])
		return
	if ctx.has_flag("count_short"):
		await ctx.say("Roadwarden Cuffe", ["Two more this morning. I have stopped circling the number, which was the only part of this I was any good at."])
		return
	ctx.start_quest_at("count", 0)
	ctx.set_flag("count_short")
	await ctx.say("Roadwarden Cuffe", ["Head in, head out, head lost. Two lost, every morning, five weeks running.", "A strayed beast comes back at supper. It is hungry and it is stupid and it comes back. These do not come back."])
	await ctx.say("Vesna", ["Then somebody walks them out."])
	await ctx.say("Roadwarden Cuffe", ["Through which gate.", "Eleven hundred and forty walk into this town and eleven hundred and thirty-eight walk out of it, and there is one road with a wall down both sides of it, and I am standing at the top of it counting."])
	await ctx.say("Roadwarden Cuffe", ["Ivy chalks them at the lower standing, coming off the weigh.", "Start with her. She has chalked two hundred thousand animals and she will tell you she has never made a mark she did not mean, and she will be telling you the truth, and it will not help either of us."])


## /** Chalker Ivy. Somebody has been practising her hand. */
static func oxmere_chalk_bar(ctx: EventContext) -> void:
	if ctx.has_flag("sealer_settled"):
		await ctx.say("Chalker Ivy", ["Blue, red, bar across, and every one of them mine again. I have gone back to not thinking about it, which took a fortnight of thinking about it."])
		return
	if not ctx.has_flag("count_short"):
		await ctx.say("Chalker Ivy", ["Shoulder, not flank. A flank mark rubs off on the next animal and then you have two of a thing you have one of."])
		return
	if ctx.has_flag("chalk_read"):
		await ctx.say("Chalker Ivy", ["Eleven paces between my chalk and the gate. Go and stand in the shed at first weigh and watch the beam, not the beast."])
		return
	await ctx.say("Chalker Ivy", ["Blue on the shoulder for Ferran, red for the fairs, a bar across for anything the drover would rather I did not ask about.", "Weight first, then the mark, then out through the lower gate. That is the order and it has been the order for four hundred years, because somebody sensible set it."])
	await ctx.say("Vesna", ["Do you ever mark one twice."])
	await ctx.say("Chalker Ivy", ["No.", "And there have been beasts going out under a bar that came off my hand in blue. So the answer is no, and it is also yes, and it is not me."])
	await ctx.say("Chalker Ivy", ["A bar means nobody asks. Not the warden, not the buyer, not the fair man at the far end. That mark is worth more than the animal it is on and everybody in the trade knows it.", "It is chalked in my hand. That is the part I have been carrying about with me. Somebody has been practising my hand, and they have got it, and they have got the pressure as well, which is the hard half."])
	await ctx.say("Vesna", ["How long is the walk from your chalk to the gate."])
	await ctx.say("Chalker Ivy", ["Eleven paces, and the shed is in the middle of them.", "Go and stand in the shed at first weigh, and watch the beam and not the beast. I have watched the beast for thirty years and I am very good at it."])
	ctx.set_flag("chalk_read")
	ctx.advance_quest("count", 1)


## /** The weighing shed at first weigh. The beam is level, low. */
static func oxmere_weighing_beam(ctx: EventContext) -> void:
	if ctx.has_flag("sealer_settled"):
		await ctx.say(null, ["The beam hangs true and the pointer sits where the mark is. Somebody has scratched a second mark beside it, harder, in case anybody forgets which one is which."])
		return
	if not ctx.has_flag("chalk_read"):
		await ctx.say(null, ["A shed with a platform, a beam, a rack of weights and two men, and a queue of cattle outside it that does not get shorter."])
		return
	if ctx.has_flag("beam_light"):
		await ctx.say(null, ["The pointer comes to rest the width of itself below the mark, all morning, and both men read it as level, because it has been level there since the spring."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["The shed takes one beast at a time. The animal goes on the platform, the weights go on the arm, and there is a man at the arm and a man at the slate.", "The beam comes level. It comes level low — by the width of the pointer, every time, all morning — and both men call it level, because it has come level there since the spring and they are reading the shed, not the beam."])
	var witness = ctx.speaking(["kestrel", "maret", "aurelian", "corvin"])
	if witness:
		var lines = {"kestrel": ["A short arm reads light. Eleven hundred beasts reading light by the same small amount is two beasts that were never on the platform.", "And two beasts that were never there are two beasts lost, and lost is a column with nothing owed against it. That is not theft. That is bookkeeping, and it is worse, because it files."], "maret": ["I have signed off on beams. You look at the seal and you look at the pointer and you sign, and I have never once in my service put a rule on an arm.", "Nobody does. That is the whole of the design."], "aurelian": ["The arm is short. Not bent, not sprung — short, by about the thickness of two coins, taken off the end where the hook sits.", "Whoever did that understood exactly how much they could take before somebody noticed it in the pointer, and then took slightly less."], "corvin": ["Everybody watches the weights. Nobody watches the arm the weights are on. I would like to say I worked that out this morning."]}
		await ctx.say(witness["name"], lines[witness["id"]])
	else:
		await ctx.say("Vesna", ["A short arm reads light. Eleven hundred beasts light by the same small amount comes to two beasts that were never on the platform.", "Two that were never there are two lost, and lost is a column with nothing owed against it."])
	await ctx.say(null, ["On the shoulder of the beam there is a seal in soft lead with a district mark and a number, stamped this year. The stamp is right. It is the crispest thing in the shed.", "Below it, where the arm was shortened and the hook reset, the file marks are new and have been oiled."])
	await ctx.say("Vesna", ["Whose number is on the seal."])
	await ctx.say(null, ["It belongs to the Sealer of Weights for the district, who comes twice a year, in March and in September, and stamps every beam between here and the coast.", "It is September, and he is in the town, and he has been in the inn since Tuesday paying for his own drink."])
	ctx.set_flag("beam_light")
	ctx.advance_quest("count", 2)
	await ctx.cinematic(false)


## Sealer Dacomb, who does not deny any of it and is precise about which
## part is his. Report the seal and two seasons of settled trade comes
## undone; take the beam back quietly and he does it again in four more
## towns. Both answers come out of the purse and only one of them is cheap.
static func oxmere_sealer_of_weights(ctx: EventContext) -> void:
	if ctx.has_flag("sealer_settled"):
		if ctx.has_flag("sealer_reported"):
			await ctx.say("Roadwarden Cuffe", ["Nothing has been sold by weight in this town since Thursday. We are selling by the look of the animal, like our great-grandfathers, and arguing like them as well.", "The new beam comes in March. I have written the date on the inside of the shed door where the men at the arm will see it every day until then."])
		else:
			await ctx.say("Roadwarden Cuffe", ["True beam by Tuesday and the count came right on the Wednesday. Ten head back off the fair buyer at his price, which he named twice to be sure I had heard it.", "He went south on the Thursday morning with the box under his arm. I opened the gate for him. That is the job."])
		return
	if not ctx.has_flag("beam_light"):
		await ctx.say("Sealer Dacomb", ["Four hundred beams a year between here and the coast, and every one of them wants a look, a stamp and a line in the book.", "It is not interesting. I have made my peace with that and I would rather you did not try to make it interesting on my behalf."])
		return

	await ctx.cinematic(true)
	await ctx.say("Sealer Dacomb", ["You have been in the shed. Two mornings, standing where the light is bad, looking at the wrong end of the beam, which is the right end.", "I am not going to make you say it. That would waste an hour and it would be an hour of you being pleased with yourself."])
	await ctx.say("Sealer Dacomb", ["I stamp four hundred beams a year and I am paid eleven gil a beam by an office that has not moved the figure in thirty years.", "I shorten one arm in nine. Always the same amount, always at the hook where the file will not be looked for, and always in a town that keeps a lost column, because a town with a lost column has already agreed not to look."])
	await ctx.say("Vesna", ["And the two head a morning."])
	await ctx.say("Sealer Dacomb", ["That is not mine. That is a second man with a piece of chalk and a talent, and he takes what my arithmetic leaves on the floor.", "I take the difference. I do not touch the animals. I would like that kept straight, and I am aware of how it sounds, and I would still like it kept straight."])
	await ctx.say("Sealer Dacomb", ["You have three things you can do and I will save you one of them. I am not going to be chased. I am fifty-four and I have a horse."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The lead seal is soft enough to lift with a thumbnail, and the number under it is legible from where you are standing.", ["Report the seal", "Take the beam back and let him finish his round"], {"speaker": "Sealer Dacomb", "cancelable": false})
	ctx.close_dialogue()

	if choice == 0:
		if not ctx.spend_gold(3500):
			await ctx.say("Roadwarden Cuffe", ["Then not this week. The four small holders go under in the first fortnight of an ungraded autumn and I am not writing to them about it with an empty parish box.", "Come back when you can stand it. He is not going anywhere until Thursday and he has told me so himself, which I did not enjoy."])
			return
		await ctx.cinematic(true)
		await ctx.say(null, ["The number goes south in a letter and the answer comes back inside the week, which nothing from that office has ever done before.", "The seal is void. Every beam Dacomb has stamped in two years is void with it — Oxmere, the coast fairs, the four weighhouses on the Silt Road — and nothing can be sold by weight on any of them until it has been stamped again, by a sealer, of whom there is one."])
		await ctx.say("Roadwarden Cuffe", ["Two seasons of settled trade, opened up. Men who paid honestly on a light beam can go back and ask for the difference, and men who were paid on it can be asked for it, and the two lots are mostly the same men.", "The drove goes south ungraded. They will take what the fair offers and the fair knows exactly what it is looking at."])
		await ctx.say(null, ["The party puts 3500 gil into the parish box against the four smallest holders' autumn, and the reeve of the standings writes each of the four names on a separate line so that nobody can say afterwards that it was a lump."])
		await ctx.say("Roadwarden Cuffe", ["Take this. It is the warden's signet for this stretch of road and it is a very old ring for a job that is mostly opening a gate.", "I have not needed it to be a ring since I was appointed. I have needed it to be a ring twice this week."])
		await ctx.grant_chest({"kind": "key", "id": "wardensignet", "label": "a Warden's Signet"}, ctx.field)
		ctx.set_flag("sealer_reported")
	else:
		if not ctx.spend_gold(2000):
			await ctx.say("Roadwarden Cuffe", ["The fair buyer has the ten head and he will not part with them at cost. He never has and he is not going to start for people who are counting their coin on his trestle.", "Come back heavier. The animals are in his lower pen and he is feeding them, which he is also charging for."])
			return
		await ctx.cinematic(true)
		await ctx.say(null, ["The arm goes to Dunnock, who lengthens it in an afternoon and will not take anything for the work, and the beam hangs true on the Tuesday.", "The ten head come back off the fair buyer at the price he names, which he names twice, in case anybody had hoped he would not."])
		await ctx.say("Sealer Dacomb", ["Four more towns before the frost and then I turn for the coast, and every one of them keeps a lost column, and I have the list in my head and have had for eleven years.", "You have bought one town its autumn. I would not have expected better of anybody standing where you were standing, and I have watched a good many people stand there."])
		await ctx.say("Sealer Dacomb", ["Take the spare set. They are the light ones, they are cut true and stamped false, and they are worth a great deal more as an argument than as weights.", "I have another set. Obviously I have another set."])
		await ctx.grant_chest({"kind": "key", "id": "magpiechain", "label": "a Magpie Chain"}, ctx.field)
		ctx.set_flag("beam_kept")

	ctx.set_flag("sealer_settled")
	ctx.complete_quest("count")
	await ctx.cinematic(false)


## Thistlebeck. Both halves of the town have been performing half of a
## contract neither of them has read, for four hundred years, in a temper.
static func thistlebeck_covenant(ctx: EventContext) -> void:
	if ctx.has_flag("covenant_read"):
		await ctx.say("Bridgeman Halloway", ["Two of us on it with brooms now, and we start at opposite ends, and we meet in the middle and neither of us has yet worked out what to say there.", "Crossings are up. Eleven hundred and sixty. Both sides tell me the number is wrong."])
		return
	await ctx.say("Bridgeman Halloway", ["The Old Side maintains the bridge. It says so on the board and it has said so on the board since there has been a board.", "It has not been swept since the flood. I sweep it. I am not the Old Side, I am the bridgeman, and the difference has kept me in work and cost me every friend I had on the west bank."])
	await ctx.say("Vesna", ["Who says the Old Side maintains it."])
	await ctx.say("Bridgeman Halloway", ["The board says. And behind the board there is supposed to be a paper, and the paper is in the chest under the ringing floor with the rest of the parish.", "Nobody has had that open in my time. The key is Old Side and the lock is Farther Side, which is the shortest true sentence anybody has ever said about this town."])
	await ctx.cinematic(true)
	await ctx.say("Bell-Keeper Wray", ["I will open it if they both stand here while I do it. Not to be difficult. Because whichever of them is not standing here will say the other one took something out."])
	await ctx.say(null, ["It takes most of the morning to get an alderman and an alderwoman onto the same forty square feet of floor, and the ringing chamber is not forty square feet.", "The chest holds a parish roll, two bell-ropes wrapped in oilcloth, and one sheet."])
	await ctx.say(null, ["It is in Ferran law-hand, dated four hundred and eleven years ago, and it is short, because it was written by people who were going to have to go on living beside each other.", "The Old Side keeps the span. The Farther Side keeps the west bank meadow in hay, and cuts it, and carts it over, for ever, in consideration of the keeping."])
	await ctx.say("Alderwoman Pye", ["We cut that meadow.", "Every August of my life. Cut it, dried it, carted it across and stacked it under their wall, and I have never once asked why we do it, because we have always done it."])
	await ctx.say("Alderman Frisk", ["And we have not swept since the flood."])
	await ctx.say("Alderwoman Pye", ["No."])
	await ctx.say("Alderman Frisk", ["Well."])
	await ctx.say(null, ["That is the whole of the argument. It takes about four seconds, and neither of them is able to look at the other one during any of it."])
	await ctx.say("Alderman Frisk", ["We will sweep."])
	await ctx.say("Alderwoman Pye", ["We will go on cutting."])
	await ctx.say("Bridgeman Halloway", ["I would like to say this changes something. It does not.", "It means that from Monday there are two of us on it with brooms, and we will have to work out who starts at which end, and that is going to take longer than the four hundred years did."])
	await ctx.say("Bell-Keeper Wray", ["The rest of the chest is yours if you want it. There is a blade in there the parish took in lieu of a subscription in a year when nobody had coin, and a purse of the second-bridge money.", "The purse is short by a little. Somebody borrowed and put it back badly, a long time ago, and I would rather that stayed where it is."])
	await ctx.grant_chest({"kind": "item", "id": "bellringer", "label": "a Bellringer"}, ctx.field)
	ctx.add_gold(2600)
	await ctx.say(null, ["The subscription purse holds 2600 gil, in coin from four hundred years of Augusts."])
	ctx.set_flag("covenant_read")
	ctx.complete_quest("covenant")
	await ctx.cinematic(false)


## Greyharrow. A cooper who cannot be admitted to his own trade because a
## fort has no place of trade in it, in a town where nine hundred people
## trade on a drill square and pay a fine for doing it.
static func greyharrow_indenture(ctx: EventContext) -> void:
	if ctx.has_flag("indenture_signed"):
		await ctx.say("Cooper Wend", ["Nothing back yet. Ondwin has begun a second letter in case, and he is enjoying the second one more than he enjoyed the first, which I did not think possible.", "I have made eleven barrels since you were here. They are the same barrels."])
		return
	await ctx.say("Cooper Wend", ["Nine years in that lane. Eleven trades working in it and not one of us is on a plan of anything.", "Solmere will not have me. An indenture is served in a place of trade, and there is no place of trade in a fort, and they are right about that, and they read the whole of it before they said so, which I will give them."])
	await ctx.say("Vesna", ["You have made barrels for nine years."])
	await ctx.say("Cooper Wend", ["I have made barrels for nine years for one customer who is not allowed to buy them and buys them anyway.", "That is not a trade. That is a hobby with a quartermaster in it. I cannot sign my own work, I cannot sell past the gate, and I cannot take a boy on, and there is a boy in that lane who has been standing at my shoulder for two years without being asked to."])
	await ctx.cinematic(true)
	await ctx.say("Bevis Hark", ["Every stall on this square pays the garrison a half-gil the day. Not rent. They are not allowed to let rent on a drill square.", "It is a fine. We pay it in advance, cheerfully, for ever, and the clerk writes it up as a fine each time because he is not allowed to write it up as anything else."])
	await ctx.say("Clerk Ondwin", ["A fine is levied for an offence. The offence is trading on the parade ground.", "I have issued nine years of them against Wend at a half-gil, in advance, and I have the counterfoils, because I have never in my life thrown a counterfoil away."])
	await ctx.say("Clerk Ondwin", ["Three thousand two hundred and eleven times the Imperium has fined that man for trading in a place where the Imperium says there is no trade.", "Either the fines are wrong, in which case there is a refund I would very much like to see somebody try to authorise, or the place is a place of trade. I have wanted to write that sentence down since the day I arrived."])
	await ctx.say("Captain Ilene Marr", ["Write it. I will sign it.", "When Solmere writes back asking what a garrison is doing certifying a cooper, I will put their letter in the book with the others, and the book is the only regimental history this place is going to make."])
	await ctx.say(null, ["The form goes south in the quartermaster's bag, which is the only bag that goes anywhere from here.", "Wend goes back to the lane while it is still being discussed and does not stop working at any point during any of the discussing."])
	await ctx.say("Cooper Wend", ["Take these. They are the pair I band in and I have another pair, and if the answer comes back no I am going to want them out of the house.", "The eleven trades put up for the carriage. It is in coppers. It took me most of an hour to count into the bag and I counted it twice because the first count was wrong in their favour."])
	await ctx.grant_chest({"kind": "item", "id": "bandedgrips", "label": "a pair of Banded Grips"}, ctx.field)
	ctx.add_gold(1800)
	await ctx.say(null, ["The lane's purse holds 1800 gil, almost all of it in coppers."])
	ctx.set_flag("indenture_signed")
	ctx.complete_quest("indenture")
	await ctx.cinematic(false)


## The Greyharrow guardhouse drawer. Four garrisons have written misc against
## it, and the fort's whole administrative genius is that everything must be
## a number, which is exactly why nobody can do anything with this.
static func greyharrow_misc_drawer(ctx: EventContext) -> void:
	if ctx.has_flag("misc_struck"):
		await ctx.say("Clerk Ondwin", ["The drawer is empty and the line is still on the inventory, because striking a line requires a form.", "It now reads misc, quantity nil. I have never been happier with a document."])
		return
	await ctx.say("Quartermaster Bly", ["Everything in this fort is a number. I am supplied for four hundred men, I have sixty-one, and I sell the difference on a form I invented, and the form has a number on it.", "That drawer has one thing in it and the thing has never had a number. Four garrisons have written misc against it. I have written misc against it, twice, in my own hand, and I remember doing it both times."])
	await ctx.say("Serjeant Kadd", ["It is cold. It has been cold in a drawer in a heated guardroom for six years and nobody has put that on a sheet either, because there is no sheet for a thing being cold."])
	await ctx.cinematic(true)
	await ctx.say("Clerk Ondwin", ["I cannot issue it, because issuing is against a stock number. I cannot condemn it, because condemning is against a stock number.", "I cannot lose it. Losing is also a form and the form asks what was lost."])
	await ctx.say("Vesna", ["You could give it away."])
	await ctx.say(null, ["Ondwin looks at the drawer for a while, and then at the wall behind the drawer."])
	await ctx.say("Clerk Ondwin", ["There is no form for that at all."])
	await ctx.say("Serjeant Kadd", ["Then there is nothing to fill in."])
	await ctx.say("Quartermaster Bly", ["Take it before he thinks of one. He will think of one."])
	await grant_shard(ctx, "thequietone", "a shard of magicite", ctx.field, "resonantcharm", "a Resonant Charm")
	await ctx.say("Vesna", ["There is a name in it.", "It has not said anything since the first garrison and it is not going to start now, and I think that is a decision it made rather than a thing that happened to it."])
	ctx.set_flag("misc_struck")
	ctx.complete_quest("inventory")
	await ctx.cinematic(false)


## Lowfen. Eight hundred bushel of Ferran lime, coming up the fen under
## Lowfen's first haulage contract in four years, bound for the Engine City
## and priced under anything Caldwick can burn.
##
## Stop it and the fen returns an advance it has already spent. Let it land
## and Caldwick loses the trade the kiln was built round. Both answers come
## out of the purse, and neither of them is the cheap one for somebody.
static func lowfen_lime_barge(ctx: EventContext) -> void:
	if ctx.has_flag("barge_decided"):
		if ctx.has_flag("barge_stopped"):
			await ctx.say("Punt-Man Quare", ["She sat on the flats nine days and it rained on seven of them, and burnt lime does not survive a wet week in an open boat.", "Nobody has said anything to Abbot about the strike. That is not the same as nobody having worked it out."])
		else:
			await ctx.say("Punt-Man Quare", ["Poled her up on the Tuesday and she was unloading at the Engine City wharf by the Friday, and Pell has been paid, and Pell has not spent it.", "There is a second cargo asked for in the spring. First time this fen has been asked for anything twice."])
		return
	await ctx.cinematic(true)
	await ctx.say("Carrier Pell", ["Eight hundred bushel of burnt lime, Ferran, off the workings, coming up the fen on Tuesday for the Engine City.", "It is the first contract this fen has been given in four years. Half of it was paid in advance in June and every gil of the half has been spent, most of it on the barge and the rest of it on people who were owed."])
	await ctx.say("Vesna", ["Ferran burns with coal."])
	await ctx.say("Carrier Pell", ["Ferran burns with coal off its own workings and does not cart wood nine miles to do it.", "It lands at half what Caldwick asks. I know what that means. I have carted for Caldwick and I have drunk with Nunn and I know exactly what it means, and I have a contract."])
	if ctx.has_flag("lodge_settled"):
		await ctx.say("Carrier Pell", ["They have just settled their hours, I hear. Good. It will be a well-run kiln with nothing to sell, which is a thing I have seen a fen village be."])
	await ctx.say("Flood-Reeve Abbot", ["There is one way it does not arrive and everybody in this town has already thought of it and nobody has said it, so I will.", "I call the flood strike two days early. Every punt goes up the terrace, there is nobody on the water, and a loaded barge with no local hands on the marks sits on the flats until somebody comes back for her. Nine days, at this time of year."])
	await ctx.say("Flood-Reeve Abbot", ["It has been called wrong twice in a hundred years, by the same man, once. He went up the terrace and stayed on his own stone and nobody spoke to him for eleven years.", "If I call it on a dry week in September, I am him. I am not asking you to decide that for me. I am telling you what the price of it is, because I would rather somebody outside the parish had heard it said."])
	await ctx.cinematic(false)

	var choice := await ctx.ask("The barge lies at the fen mouth tonight and comes up on the first tide.", ["See that she misses the tide", "Let her land"], {"cancelable": false})
	ctx.close_dialogue()

	if choice == 0:
		if not ctx.spend_gold(3000):
			await ctx.say("Flood-Reeve Abbot", ["Then no. The advance has to go back on the day the contract fails and it has to go back whole, and this town has not got it, and I will not call a strike that ends with Pell in front of a Solmere clerk.", "Come back before Tuesday if that changes. After Tuesday it is a different conversation and a shorter one."])
			return
		await ctx.cinematic(true)
		await ctx.say(null, ["Abbot calls the strike on the Sunday night, standing on the spine with a lamp, and Lowfen is off the water and up the bank in a day and a half.", "It is the fastest strike anybody in the town can remember, and nobody says so at the time, and several people say so afterwards and then stop."])
		await ctx.say(null, ["The barge grounds on the flats east of the marks on the Tuesday morning. It rains on the Wednesday and on five days out of the eight after it.", "Burnt lime in the rain gets hot, and then it steams, and then it is a white mess in the bottom of a boat, and there is nothing at all to be done about any of it."])
		await ctx.say(null, ["The advance goes back to the factor whole and on the day, and 3000 gil of it is the party's."])
		await ctx.say("Carrier Pell", ["The contract fails on weather. That is the clause and it is a real clause and I have read it eleven times since Sunday.", "I have not asked the reeve anything. I am not going to ask the reeve anything, and he knows I am not, and that is the arrangement we have arrived at without either of us opening his mouth."])
		await ctx.say("Punt-Man Quare", ["Take the heart off the punt pole. It has been lashed under the grip since my father, and it keeps the water off a man who is going to be in the water regardless."])
		await ctx.grant_chest({"kind": "item", "id": "tideheart", "label": "a Tide Heart"}, ctx.field)
		ctx.set_flag("barge_stopped")
	else:
		if not ctx.spend_gold(4500):
			await ctx.say("Lime-Factor Vosk", ["Then she lands and Caldwick takes it on the chin, and the chin is two hundred and eleven years old and has not been hit before.", "I will hold the offer until the frost. I am not being kind. I have nobody else to make it to."])
			return
		await ctx.cinematic(true)
		await ctx.say(null, ["The barge comes up on the Tuesday tide with two Lowfen men on the marks, and is unloading at the Engine City wharf on the Friday morning.", "The Engine City writes to Caldwick the following week. The letter is four lines long and three of them are about the weather."])
		await ctx.say("Lime-Factor Vosk", ["Mortar for the Engine City was two thirds of the kiln. I have plaster for Solmere and a barrel a month for a man in Ferran who will not say what he does with it.", "That is not a business. That is a hobby with two hundred and eleven years of arrears attached."])
		await ctx.say(null, ["The party buys the month's stock at Vosk's price, which is 4500 gil and which he does not lower by a single gil, because a factor who lowers a price is running a sale.", "It goes out on carts to nobody in particular. The burners are paid on the Friday, in coin, at the gate, on a nod."])
		await ctx.say("Lime-Factor Vosk", ["Take this off me. It came out of the kiln floor when they relined it in my father's time and it has been on my shelf being a paperweight ever since.", "It is cold. It has been in a room with that fire in it for forty years and it has never once been warm, and I have stopped mentioning that to people."])
		await ctx.grant_chest({"kind": "item", "id": "stoneheart", "label": "a Stone Heart"}, ctx.field)
		ctx.set_flag("barge_landed")

	ctx.set_flag("barge_decided")
	ctx.complete_quest("barge")
	await ctx.cinematic(false)


## Oxmere. Old Pettigrew makes eleven hurdles a week and the town buys nine,
## and the trade goes when he does, and everybody involved knows the whole of
## that and has known it for years.
static func oxmere_last_hurdler(ctx: EventContext) -> void:
	if ctx.has_flag("hurdles_kept"):
		if ctx.world_state == "ruin":
			await ctx.say("Old Pettigrew", ["Eleven a week. Nobody is buying nine. They are stacked against the byre and the stack is taller than the byre.", "You will want to know why I am still cutting. So would I, and I have had a good deal longer at the question than you have."])
		else:
			await ctx.say("Old Pettigrew", ["You have got the ninth rod wrong twice since. I watched you both times and said nothing, which is how I was taught."])
		return
	await ctx.say("Old Pettigrew", ["Eleven a week. Six foot of hazel, a mortise every fourteen inches, and the ninth rod is the one that decides whether you have made a hurdle or a gate.", "Two get broken and one gets stolen. That is the year. I have said that to you already if you have been past before, and I will say it again, because it is still the year."])
	await ctx.say("Vesna", ["Who else cuts them."])
	await ctx.say("Old Pettigrew", ["In this parish, nobody. In the next, a man a year older than me who does it wrong, and we have not spoken since the fair before last, about the wrong.", "I took a boy on nineteen years ago. He shoes cattle now, at the top of the town, and he is very good at it, and I have never said one word to him about any of it."])
	var choice := await ctx.ask("There is a shaving horse, a froe, and a bundle of hazel that has been standing in water since Thursday.", ["Sit down and be shown", "Leave him to it"], {"speaker": "Old Pettigrew", "cancelable": true})
	ctx.close_dialogue()
	if choice != 0:
		await ctx.say("Old Pettigrew", ["Right. Mind the stack on your way past; the third one from the end is not tied and it has had four people over."])
		return
	await ctx.cinematic(true)
	await ctx.say(null, ["It takes the afternoon. Nothing is measured. He holds each rod against the last one and the last one against the one before it, and by the eleventh the thing has drifted a finger's width, and he says that is what the drift is for.", "He puts somebody's hands where they go twice, and then stops doing it, and lets the third one be bad."])
	await ctx.say("Old Pettigrew", ["That is a bad hurdle. It will hold a cow that has already decided not to go anywhere, which is most of them, and that is why bad hurdles have lasted four hundred years.", "You will not remember the mortise spacing by the spring. Nobody does. You will remember the drift, because I made you feel it, and that is the only part I could give you in an afternoon."])
	await ctx.say("Vesna", ["Has anybody asked to be shown before."])
	await ctx.say("Old Pettigrew", ["Nineteen years ago.", "Take the boar spear off the wall on your way. Hazel out of the same coppice, and I put the crossbar on it myself the year the wolves came down, and it has been on that wall since the year after."])
	await ctx.grant_chest({"kind": "item", "id": "boarspear", "label": "a Boar Spear"}, ctx.field)
	ctx.add_gold(900)
	await ctx.say(null, ["He will not be talked out of a day's wage for the afternoon either. It comes to 900 gil and he counts it out of a tin."])
	ctx.set_flag("hurdles_kept")
	ctx.complete_quest("hurdles")
	await ctx.cinematic(false)


## Marrowgate. Three hundred and forty people live off what the ground gives
## back after rain, and the whole trade depends on nobody ever establishing
## whose ground it is.
static func marrowgate_eight_yards(ctx: EventContext) -> void:
	if ctx.has_flag("pitch_walked"):
		await ctx.say("Fen Culliss", ["Rain on Tuesday. I did the north blocks and got a buckle and a bad hour.", "You are walking the pitch when you go through the square. I have watched you do it. You do not know you are doing it."])
		return
	await ctx.say("Fen Culliss", ["Eight yards. Always eight, because whatever laid this laid it on eight, and the things that come up sit in the joints.", "Walk the pitch and you have covered a block. Walk anyhow and you have covered a quarter of it and gone home pleased with yourself."])
	await ctx.say("Fen Culliss", ["Come out at first light and take the next line over from mine. Do not pick anything up until I have looked at it, and do not stand on the white where it is wet."])
	await ctx.cinematic(true)
	await ctx.say(null, ["The far blocks after rain are turf gone thin over marble, and what has worked its way up sits proud of the grass for about four hours and then settles back.", "Four things in a morning: a hinge, a hook, a coin that is not a coin, and a square of something that is exactly the size of the holes in the kerb."])
	var finder = ctx.speaking(["corvin", "kestrel", "tam", "ilsabet"])
	if finder:
		var lines = {"corvin": ["Nobody here is hiding anything and nobody here will tell you where they found it. I have been in nine trades and I have never seen that combination before."], "kestrel": ["The square is a fixing. Eleven thousand holes in that kerb and every one of them held one of these, and there is not a word about them in four hundred years of catalogue."], "tam": ["Ground gives it up when it is wet and takes it back when it dries. Same as the fen does. Same as everything does."], "ilsabet": ["Put it down where it was and let me look at it there. I do not want it in a hand. A thing in a hand is already a different thing."]}
		await ctx.say(finder["name"], lines[finder["id"]])
	await ctx.say("Fen Culliss", ["Quillam buys all four and asks nothing, and everybody says that is because he is delicate about where things come from.", "It is not that. If any of us ever says where, then somebody writes it down, and a written-down place is a site, and a site belongs to whoever wants it."])
	await ctx.say("Fen Culliss", ["Anselm has walked four thousand yards north with a chain looking for the edge of this town and he has not found one, and his report says extent undetermined for the ninth year.", "Three hundred and forty of us are living off the word undetermined, and he knows we are, and he goes home and writes it, and he has never once asked me anything."])
	await ctx.say(null, ["The fourth thing is a charm on a wire. Culliss turns it over for a while and then puts it into somebody's hand instead of into the bag."])
	await ctx.grant_chest({"kind": "item", "id": "vagrantcharm", "label": "a Vagrant Charm"}, ctx.field)
	await ctx.say("Fen Culliss", ["That one is a copy of something. All the good ones are."])
	ctx.add_gold(2600)
	await ctx.say(null, ["Quillam pays out for the other three without looking at any of them, and does not ask where, and gives 2600 gil for a hinge, a hook and a coin that is not a coin."])
	ctx.set_flag("pitch_walked")
	ctx.complete_quest("pitch")
	await ctx.cinematic(false)


## Marrowgate. Thirty years of ground-rent on a room that was here first,
## levied under one clause of a four-hundred-year-old title, by a man who
## sends a note before he raises it.
static func marrowgate_undercroft_rent(ctx: EventContext) -> void:
	if ctx.has_flag("rent_settled"):
		await ctx.say("Perry Salk", ["A cellar with a good floor. That is the finding and I have had it read to me three times.", "I have not put the rooms down. Everybody expected me to put the rooms down and I have decided to be the sort of man who does not."])
		return

	if not ctx.has_flag("brick_opened"):
		await ctx.say("Perry Salk", ["The cellar is not mine. It was here. I put a house on top of it thirty years ago and I have been paying to heat somebody else's room ever since.", "Forty gil a year to the reliquary. It is not a sum. It is thirty years of a sum, and it is the reason a bed here is forty and not thirty-two."])
		await ctx.say("Reliquar Ansence", ["The title is four hundred years old and it is one clause. All undercrofts and vaults of the prior settlement.", "It does not describe them. It did not have to; when it was written there were none to describe, because nobody had found any."])
		await ctx.say("Vesna", ["And you collect on it."])
		await ctx.say("Reliquar Ansence", ["I collect on it. Forty gil a year off a man heating a room he cannot use, and I have raised it twice, both times because the archive instructed me to, and both times I sent a note first."])
		await ctx.say("Perry Salk", ["He does send a note. That is not nothing.", "It is also not much, and we have both had thirty years to get the measure of exactly how much it is."])
		await ctx.say(null, ["The cellar goes back under the lane. Salk bricked it at nine yards because at nine yards he stopped enjoying himself, and the brick is dry and well laid and comes down in about an hour."])
		ctx.set_flag("brick_opened")
		if ctx.quest_stage("rent") < 0:
			ctx.start_quest_at("rent", 0)

	await ctx.say(null, ["Past the brick the floor changes from Salk's flags to something laid on the eight-yard pitch, and the air changes with it.", "There is something down here that has had the run of eleven yards of dry stone for a long time and does not care for the draught."])

	var result := await ctx.battle({"enemies": ["stonelayer", "chalkwight", "chalkwight"]}, {"terrain": "marble", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	await ctx.cinematic(true)
	await ctx.say(null, ["Eleven yards in there is a stone set upright across the full width of the passage, dressed on both faces, with one line cut along the top of it.", "The floor on the far side is laid differently, and better, and by somebody with more time."])
	var reader = ctx.speaking(["kestrel", "maret", "aurelian"])
	if reader:
		var lines = {"kestrel": ["That is a boundary. A cut line on a dressed upright is a boundary in every hand I have ever read, including four I cannot read.", "The undercroft is on that side of it. Everything on this side is a hole in the ground that somebody later put a floor in."], "maret": ["I have signed for the seizure of buildings on worse evidence than that stone and I did not read past the tonnage on any of them.", "It is a boundary. I would have accepted it in an afternoon and I would have been right for once."], "aurelian": ["Two floors, two pitches, and a stone between them that neither of them runs under.", "Whatever is behind that is the prior settlement. This side is a cellar, and it has been a cellar since before anybody wrote a clause about vaults."]}
		await ctx.say(reader["name"], lines[reader["id"]])
	else:
		await ctx.say("Vesna", ["It is a boundary stone, and the undercroft starts on the far side of it.", "What Salk has been paying for is on this side."])
	await ctx.say("Reliquar Ansence", ["Then it is not an undercroft of the prior settlement. It is a cellar with a good floor.", "I will write it up and send the note. There is a form for a title being wrong and I have never used it, and I am going to have to read it twice before I start."])
	await ctx.say("Perry Salk", ["Thirty years."])
	await ctx.say("Reliquar Ansence", ["Thirty years, and I would collect it again tomorrow on the same clause, and you know that, and it is why you have never once been rude to me."])
	await ctx.say("Perry Salk", ["It is why."])
	await ctx.say(null, ["Under the boundary stone there is a chest with the parish's small money in it and a book, ruled and totted, in which no single entry is for as much as a gil."])
	await ctx.grant_chest({"kind": "key", "id": "ledgerofsmalldebts", "label": "the Ledger of Small Debts"}, ctx.field)
	ctx.add_gold(5000)
	await ctx.say(null, ["The chest holds 5000 gil, in coin four hundred years out of use and heavier than the coin that replaced it."])
	ctx.set_flag("rent_settled")
	ctx.complete_quest("rent")
	await ctx.cinematic(false)


## Lowfen goes up the bank for the tenth time in a hundred years, and this
## time the reeve is not saying when it comes down.
static func lowfen_last_carry(ctx: EventContext) -> void:
	if ctx.world_state != "ruin":
		await ctx.say("Stone-Keeper Wend", ["Fourteen footings, swept and levelled and checked every month of my life, and used nine times.", "You will say that is a great deal of sweeping for nine. Ask me in November whether it was."])
		return
	if ctx.has_flag("carried_up"):
		await ctx.say("Stone-Keeper Wend", ["Ten. I have the figure now and I would rather have gone on not having it.", "I still sweep. There is nothing under the houses to sweep for, and I do the aprons round them, and nobody has asked me to stop."])
		return
	await ctx.cinematic(true)
	ctx.play_music("memory", {"fade": 1.0})
	await ctx.say(null, ["The lower town is on the terrace, in two ranks, each house on its own numbered stone. The timber spine below is empty from end to end and the water is going under it.", "It was struck in a day and a half, which is the fastest it has ever been done, and nobody in Lowfen is pleased about the record."])
	await ctx.say("Stone-Keeper Wend", ["Everything in this town comes apart. Beds in four, table in three, loom in eleven, and the eleventh piece of a loom is the one you lose.", "Nine times in a hundred years, and every one of those nine went back down in the spring. Nobody has said anything about the spring."])
	if ctx.has_flag("barge_stopped"):
		await ctx.say("Carrier Pell", ["The only carrying this fen has done in a year and it was our own houses, up our own bank, for nothing.", "I am not saying that to you as a complaint. I am saying it because it is the truest sentence about the haulage trade I have ever had, and I want somebody to have heard it."])
	elif ctx.has_flag("barge_landed"):
		await ctx.say("Carrier Pell", ["Lime money paid for the rollers and the new ropes, and the rollers and the ropes did a day and a half.", "I have never spent anything better and I would rather not have had to find that out."])
	await ctx.say("Widow Sarn", ["Sixteen stays empty. There is nobody to carry it up and there has not been for eleven years.", "Every strike, somebody asks. Every strike, we leave it. You cannot put a different family on a stone. It is not the law. It is worse than the law and it holds better."])
	await ctx.say(null, ["The party carries for two days. Shutters, hurdles, the taproom trestles, the eel traps, and a dresser that does not come apart and is left where it stands.", "On the second evening the whole town is on the shelf, in its own order, on its own numbers, looking down at a spine with nothing on it."])
	await ctx.say("Stone-Keeper Wend", ["Under sixteen there is a box. It went down when they went up and nobody came back for it, and I have swept over it every month for eleven years and never once lifted the stone.", "You lift it. I am not going to, and I would rather it was somebody who is leaving."])
	await ctx.grant_chest({"kind": "item", "id": "gravewardknot", "label": "a Graveward Knot"}, ctx.field)
	ctx.add_gold(1800)
	await ctx.say(null, ["There is 1800 gil in the box as well, wrapped separately, in a cloth with a stone number stitched into the corner of it."])
	ctx.set_flag("carried_up")
	ctx.complete_quest("carriage")
	# No battle and no new map to hand the theme back, so this one does it.
	if ctx.map_music():
		ctx.play_music(ctx.map_music(), {"fade": 1.6})
	await ctx.cinematic(false)


## Caldwick, after. The kiln went out on a Tuesday. There is no procedure for
## it because there was never going to be one, and the lodge has to vote on
## whether a fire that has no customers is worth eleven days.
static func caldwick_cold_apron(ctx: EventContext) -> void:
	if ctx.world_state != "ruin":
		await ctx.say(null, ["The apron is hot enough through the boots to be worth thinking about where you stand, and everybody in the yard is standing where they always stand."])
		return
	if ctx.has_flag("apron_voted"):
		if ctx.has_flag("kiln_relit"):
			await ctx.say("Kilnwarden Rue", ["Day four. Two hundred and eighty cord left and forty men who are all doing somebody else's job as well as their own.", "The book is being kept. I write GOOD in the same chalk as the rest now, which I should have done years ago."])
		else:
			await ctx.say("Kilnwarden Rue", ["It stays out. I have written the last line and ruled under it and hung the slate up in the lodge, which is where slates go when they have stopped being used.", "I sweep the apron. Somebody would sweep it whatever I did, so it may as well be the man who was paid for it."])
		return
	await ctx.cinematic(true)
	ctx.play_music("sorrow", {"fade": 1.2})
	await ctx.say(null, ["The apron is cold and the ring road is cold with it, and for the first time in two hundred and eleven years the doors on the outer ring are worth more than the doors on the inner one.", "The kiln book is still up on the wall. The last line reads DAY 77,308, and nothing after it."])
	await ctx.say("Kilnwarden Rue", ["It went out on a Tuesday. Two hundred and eleven years, and it chose a Tuesday.", "I have the relighting written down. Eleven days, four hundred cord, forty men. I have the eleven days and I have thirty-one of the men."])
	await ctx.say("Vesna", ["And the four hundred cord."])
	await ctx.say("Kilnwarden Rue", ["There is wood. There is a great deal of wood; nobody is buying standing timber now and nobody is cutting it either, so it is out there being wood.", "What there is not is anybody at the far end who wants mortar. The Engine City has stopped writing. Solmere has stopped writing. That barrel a month to Ferran stopped in the spring and I find I mind about that one most."])
	await ctx.say("Burner Fettle", ["The lodge is split and it is split down the middle, and neither half will hold the tally, because both halves are in it.", "You hold it. You are the only people in this town who have not got a stone in this and are not related to somebody who has."])
	if ctx.has_flag("flue_bricked"):
		await ctx.say("Halber Crane", ["I am voting to light it. I have no forge left to take heat off it and I am voting to light it, and I would like Fettle to enter that."])
	elif ctx.has_flag("cord_bought"):
		await ctx.say("Halber Crane", ["My flue goes into the back of a dead kiln. I have a hearth that has never had a fire of its own in it and a damper my grandfather set open.", "I am voting to light it. I am aware what that looks like from where Fettle is standing, and I am voting anyway."])
	await ctx.cinematic(false)
	await ctx.say(null, ["The count takes an hour and a half, because thirty-one people who have all known each other since birth cannot be got to vote in one line.", "It comes out at sixteen to fifteen."])

	# Which way the sixteen falls is the only thing the chain leaves behind.
	# A lodge whose hours were settled before the sky changed still has a book
	# and a fourth hour to go back to; a lodge that was on six when everything
	# stopped is being asked to stand eleven days for a fire with nobody at the
	# other end of it, by the same people who asked last time.
	var relight = ctx.has_flag("lodge_settled")
	if relight:
		await ctx.say("Kilnwarden Rue", ["Sixteen for.", "Charging starts Monday and we cut for a fortnight before it, and I want everybody who voted the other way out on the cutting, because they will be, and saying so now saves an argument I have not got the strength for."])
		await ctx.say("Widow Skeeling", ["I voted the other way and I will be on the cutting.", "We were four rings out when I married and two rings in when it went out, and I would rather be cold in a town with a fire in it than warm in one without."])
	else:
		await ctx.say("Kilnwarden Rue", ["Sixteen against.", "Eleven days on six-hour shifts, for a fire that has nobody at the far end of it, asked for by the same men who asked in the spring. I would have voted the other way and I do not think I would have been right."])
		await ctx.say("Widow Skeeling", ["I voted against and I am the one who will be cold.", "Two rings in, and the rent goes by how near the fire you are, and from Monday there is no near. My daughter has been trying to work out how to say that to me kindly since the count and she can stop."])

	await ctx.cinematic(true)
	if relight:
		await ctx.say("Burner Fettle", ["There is a tin behind the lodge door with two of these in it and nobody knows who put them there or when.", "They have been kept against the day the fire went out. The fire has gone out and we are relighting it with faggots and forty men, the way you actually light a fire, so the tin is no use to anybody here."])
	else:
		await ctx.say("Burner Fettle", ["There is a tin behind the lodge door with two of these in it and nobody knows who put them there or when.", "They have been kept against the day the fire went out. It has gone out and it is staying out, so there is no day left for them to be kept against."])
	await ctx.grant_chest({"kind": "item", "id": "phoenixember", "count": 2, "label": "2 Phoenix Embers"}, ctx.field)
	ctx.add_gold(3400)
	await ctx.say(null, ["The lodge box holds 3400 gil, which is subscriptions from men who are not going to be asking for them back."])
	ctx.set_flag("apron_voted")
	ctx.set_flag("kiln_relit" if relight else "kiln_out")
	ctx.complete_quest("apron")
	if ctx.map_music():
		ctx.play_music(ctx.map_music(), {"fade": 1.6})
	await ctx.cinematic(false)


## The Bramblewold pens. The blooding gate at the bottom of the Oxmere drove,
## still counting what comes through it, four hundred years after the last
## beast did.
static func bramblewold_yardmaster(ctx: EventContext) -> void:
	if ctx.has_flag("yard_slain"):
		await ctx.say(null, ["The gate is off its hinges and lying in the lane, and the briar has come three feet over the stone at both ends of it, which it would not do before."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["Two posts in the thorn with a gate hung between them, shut, and a lane of laid stone running away on both sides into briar.", "The hinges have been greased. Not recently — but not four hundred years ago either."])
		return
	await ctx.cinematic(true)
	ctx.play_music("boss_final", {"fade": 0.8})
	await ctx.say(null, ["The briar stops dead at a line of posts and starts again on the far side of them. Between the two is a lane four paces wide, floored with laid stone, coming out of the wold and going back into it.", "It is a drove lane. The gate is still on its hinges and the hinges are greased."])
	await ctx.say("Vesna", ["Everything that came down out of Oxmere came through here.", "Nine days on the road, and then a gate, and then this was the last four paces of it."])
	await ctx.say(null, ["The tally boards are nailed to the inside of the post, one over another, four hundred years deep.", "The top board is not weathered."])
	if ctx.has_flag("count_short") or ctx.has_flag("beam_light"):
		await ctx.say("Vesna", ["Head in, head out, head lost. Somebody has been keeping this gate's figures up to date and it has not been anybody in Oxmere."])
	await ctx.say(null, ["Something is standing on the far side of the gate with a hand on the top rail, in the attitude of a man who has been waiting since before the wood grew."])
	await ctx.tremor(1.6, 0.6)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["theyardmaster"]}, {"boss": true, "terrain": "grass", "scenery": "field", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("yard_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["The gate comes off its hinges as he goes, which is the only thing in the wold that has moved in either direction in four hundred years.", "The top tally board is finished off in the same hand as the four hundred beneath it, and the last figure on it is entered and ruled under."])
	await ctx.say("Vesna", ["He was not guarding the lane. He was working it.", "Somebody put him on this gate and paid him at it, and then the drove stopped coming and nobody walked down here to tell him."])
	await ctx.grant_chest({"kind": "item", "id": "bloodingwraps", "label": "a pair of Blooding Wraps"}, ctx.field)
	ctx.add_gold(22000)
	await ctx.say(null, ["Under the boards there is a strongbox with the yard's last month in it: 22000 gil, made up into wage packets for men who were paid at the gate, in coin, on a Friday."])
	ctx.complete_quest("yard")
	await ctx.cinematic(false)


## A bay off the Last Lantern road, at twenty paces. A shop with no fire in
## it that has been working to a standing order nobody ever came back to
## close.
static func lastlantern_cold_forge(ctx: EventContext) -> void:
	if ctx.has_flag("forge_slain"):
		await ctx.say(null, ["The rack is still full and the piece on the anvil is still half done, and the slate by the hearth has nothing on it at all now."])
		return
	if ctx.world_state != "ruin":
		await ctx.say(null, ["A bay cut square into the west wall at twenty paces, with a hearth in the back of it and the floor worn into a shallow dish in front of the hearth.", "There is a sound in it that is nearly the sound of work, and it stops while you are deciding what it is."])
		return
	await ctx.cinematic(true)
	ctx.play_music("boss_final", {"fade": 0.8})
	await ctx.say(null, ["The bay at twenty paces is not a bay. It is a shop, cut square, with a hearth in the back wall and the floor in front of it worn into a dish by somebody standing in one place.", "Nothing is burning. Nothing has ever burned: the hearth has no flue and the brick behind it is the colour of brick."])
	await ctx.say(null, ["The rack by the door is full. The work on it is finished and sorted by size, and there are nine hundred years of it, and the oldest of it is at the bottom and is the same as the newest.", "On a slate beside the hearth, in a hand that has not changed once: THE ORDER STANDS."])
	await ctx.say("Vesna", ["Nobody closed the order.", "It has been working to a standing instruction for nine hundred years and the office that gave it went under the ground about eight hundred and fifty years ago."])
	if ctx.has_flag("flue_bricked"):
		await ctx.say("Vesna", ["Crane put a wall across his flue in one afternoon and went back to shoeing horses.", "Nobody has ever come down this road carrying a wall."])
	var smith = ctx.speaking(["aurelian", "rusk", "bastian", "maret"])
	if smith:
		var lines = {"aurelian": ["You cannot work iron cold. That is not a rule of the trade, it is a property of iron, and the rack is full."], "rusk": ["THE ORDER STANDS. I HAVE READ THAT SENTENCE BEFORE, IN A DIFFERENT HAND, ON A DIFFERENT WALL.", "I STOOD UNDER IT FOR ELEVEN YEARS. I WOULD LIKE TO GO IN FIRST."], "bastian": ["Sorted by size. Nine hundred years of it, sorted by size.", "Somebody has been carrying the finished work to the rack and putting it in the right place, every time, and there is nobody here."], "maret": ["A standing order runs until it is countermanded in writing by the office that raised it.", "I have signed four of those in my service. I have countermanded none of them, and I am now going to spend a while thinking about where the other three are."]}
		await ctx.say(smith["name"], lines[smith["id"]])
	await ctx.tremor(2.0, 0.75)
	await ctx.cinematic(false)

	var result := await ctx.battle({"enemies": ["thecoldforge"]}, {"boss": true, "terrain": "cobble", "scenery": "cave", "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("forge_slain")
	await ctx.cinematic(true)
	await ctx.say(null, ["It stops between one piece and the next. The piece is on the anvil, half worked, and it is going to be half worked for ever.", "It is the only unfinished thing in the room."])
	await ctx.say("Vesna", ["Nine hundred years of finished work, and no cart ever came for any of it.", "It is all still here. It was always going to be all still here, and it went on making it, because nothing had come down the road to say otherwise."])
	await ctx.grant_chest({"kind": "key", "id": "quenchward", "label": "a Quench Ward"}, ctx.field)
	ctx.add_gold(34000)
	await ctx.say(null, ["The pay chest under the rack has never been opened. It holds 34000 gil, made up nine hundred years ago against a wage that was never drawn."])
	ctx.complete_quest("coldforge")
	await ctx.cinematic(false)

