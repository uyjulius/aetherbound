extends SceneTree
##
## Runs every ported scene against a recording context and prints what each asked for,
## under all five branch policies.
##
##   godot --headless --path godot --script res://tools/events_probe.gd
##
## `tools/events-parity.mjs` compares this against the reference's own transcripts and
## reports coverage: how many of the 124 scenes are ported, and whether every one of
## those agrees. A scene the port does not have yet is missing, not wrong, and the
## difference is worth keeping visible.

const Database := preload("res://scripts/data/database.gd")
const Ctx := preload("res://scripts/game/event_context.gd")
const Vol1 := preload("res://scripts/data/events/vol1.gd")
const Vol2 := preload("res://scripts/data/events/vol2.gd")
const Vol3 := preload("res://scripts/data/events/vol3.gd")
const Vol4 := preload("res://scripts/data/events/vol4.gd")
const Vol5 := preload("res://scripts/data/events/vol5.gd")
const Bosses := preload("res://scripts/data/events/bosses.gd")

const POLICIES := ["first", "second", "last", "lost", "flagged"]


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var out := {}
	for volume in [Vol1, Vol2, Vol3, Vol4, Vol5]:
		for id in volume.IDS:
			var runs := {}
			for policy in POLICIES:
				var ctx = Ctx.new(policy, true)
				ctx.database = db
				await volume.run(String(id), ctx)
				runs[policy] = ctx.log
			out[String(id)] = runs

	# The optional bosses are one factory over sixteen exported specs rather than
	# sixteen scenes, so they are run from the table.
	for id in db.boss_events:
		var runs := {}
		for policy in POLICIES:
			var ctx = Ctx.new(policy, true)
			ctx.database = db
			await Bosses.run_spec(db.boss_events[id], ctx)
			runs[policy] = ctx.log
		out[String(id)] = runs

	print(JSON.stringify({"events": out}))
	quit()
