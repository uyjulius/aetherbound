extends SceneTree
##
## Runs every ported scene against a recording context and prints what each asked
## for, under all five branch policies.
##
##   godot --headless --path godot --script res://tools/events_probe.gd
##
## `tools/events-parity.mjs` compares this against the reference's own transcripts and
## reports coverage: how many of the 124 scenes are ported, and whether every one of
## those agrees. A scene the port does not have yet is missing, not wrong, and the
## difference is worth keeping visible.

const Ctx := preload("res://scripts/game/event_context.gd")
const Vol1 := preload("res://scripts/data/events/vol1.gd")

const POLICIES := ["first", "second", "last", "lost", "flagged"]


func _initialize() -> void:
	var out := {}
	for id in Vol1.IDS:
		var runs := {}
		for policy in POLICIES:
			var ctx = Ctx.new(policy, true)
			await Vol1.run(String(id), ctx)
			runs[policy] = ctx.log
		out[String(id)] = runs
	print(JSON.stringify({"events": out}))
	quit()
