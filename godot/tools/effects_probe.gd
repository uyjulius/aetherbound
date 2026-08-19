extends SceneTree
##
## What a scene's calls actually *do* to a party.
##
##   godot --headless --path godot --script res://tools/effects_probe.gd -- <cases.json>
##
## `events_probe.gd` proves the port's scenes make the same calls the reference's do. This
## proves the calls land: it runs each one against a live `EventContext` with a real party
## behind it and prints the party afterwards, for `../../tools/effects-parity.mjs` to hold
## against the reference's own party methods.
##
## The two are not the same question, and the difference is not academic — the port shipped a
## context where a dozen calls recorded themselves and then did nothing, including the one that
## turns the world to ruin and the one that hands over an esper. Every transcript matched.

const Database := preload("res://scripts/data/database.gd")
const Ctx := preload("res://scripts/game/event_context.gd")
const PartyClass := preload("res://scripts/game/party.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		push_error("usage: effects_probe.gd -- <cases.json>")
		quit(1)
		return
	var raw := FileAccess.get_file_as_string(args[0])
	var parsed: Variant = JSON.parse_string(raw)
	if not (parsed is Array):
		push_error("cases file is not a JSON array")
		quit(1)
		return

	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var out := {}
	for case in parsed:
		var name := String(case.get("name", "?"))
		var party = PartyClass.new(db)
		party.new_campaign()
		var ctx = Ctx.new("first", false)
		ctx.database = db
		ctx.party = party
		# Anything a case needs done to the party before the scene touches it — a party at one
		# HP for the rest that heals them, a quest open for the advance that moves it.
		for step in case.get("setup", []):
			_prepare(party, String(step[0]), step[1])
		for step in case.get("calls", []):
			_apply(ctx, String(step[0]), step[1])
		var answer: Variant = null
		if case.has("ask"):
			answer = _ask(ctx, String(case["ask"][0]), case["ask"][1])
		out[name] = {"party": party.serialize(), "answer": answer}

	print(JSON.stringify({"cases": out}))
	quit()


## Preparation happens on the party directly: these are states a scene finds, not things a
## scene does.
func _prepare(party, what: String, args: Array) -> void:
	match what:
		"wound":
			for id in party.roster:
				var m = party.roster[id]
				m.hp = 1
				m.mp = 0
		"ko":
			party.roster[String(args[0])].hp = 0
		"spend_all":
			party.gold = 0
		_:
			push_error("unknown setup step: %s" % what)


func _apply(ctx, call: String, args: Array) -> void:
	match call:
		"set_flag":
			ctx.set_flag(String(args[0]))
		"start_quest":
			ctx.start_quest(String(args[0]))
		"start_quest_at":
			ctx.start_quest_at(String(args[0]), int(args[1]))
		"advance_quest":
			ctx.advance_quest(String(args[0]), int(args[1]))
		"complete_quest":
			ctx.complete_quest(String(args[0]))
		"add_item":
			if args.size() > 1:
				ctx.add_item(String(args[0]), int(args[1]))
			else:
				ctx.add_item(String(args[0]))
		"add_gold":
			ctx.add_gold(int(args[0]))
		"spend_gold":
			ctx.spend_gold(int(args[0]))
		"recruit":
			if args.size() > 1:
				ctx.recruit(String(args[0]), int(args[1]))
			else:
				ctx.recruit(String(args[0]))
		"add_esper":
			ctx.add_esper(String(args[0]))
		"remove_esper":
			ctx.remove_esper(String(args[0]))
		"clear_esper":
			ctx.clear_esper(String(args[0]))
		"member_learn_spell":
			ctx.member_learn_spell(String(args[0]), String(args[1]))
		"rest_all":
			ctx.rest_all()
		"world_state":
			ctx.world_state = String(args[0])
		_:
			push_error("unknown call: %s" % call)


## The questions a scene asks. Two of them decided how much gold a scene took, and both
## answered with a constant until this probe existed.
func _ask(ctx, call: String, args: Array) -> Variant:
	match call:
		"count_item":
			return ctx.count_item(String(args[0]))
		"gold":
			return ctx.gold()
		"has_flag":
			return ctx.has_flag(String(args[0]))
		"has_esper":
			return ctx.has_esper(String(args[0]))
		"in_roster":
			return ctx.in_roster(String(args[0]))
		"quest_stage":
			return ctx.quest_stage(String(args[0]))
		"bestiary_size":
			return ctx.bestiary_size()
		"member_level":
			var m: Dictionary = ctx.member(String(args[0]))
			return -1 if m.is_empty() else int(m.get("level", -1))
		"world_state":
			return ctx.world_state
		_:
			push_error("unknown question: %s" % call)
			return null
