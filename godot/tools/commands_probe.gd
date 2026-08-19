extends SceneTree
##
## Walks every per-character command at every level and prints the options it
## offers, plus a run of weighted rolls, for `../../tools/commands-parity.mjs`.
##
##   godot --headless --path godot --script res://tools/commands_probe.gd
##
## Every level rather than a sample: the whole point of a gate is that the list
## changes at one exact level, and a sampled sweep steps over it.

const Database := preload("res://scripts/data/database.gd")
const C := preload("res://scripts/battle/commands.gd")
const R := preload("res://scripts/engine/rng.gd")


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return
	if not C.adopt(db.commands):
		push_error("no commands table")
		quit(1)
		return

	var ids: Array = db.commands.keys()
	ids.sort()
	var options := {}
	for id in ids:
		var rows: Array = []
		for level in range(1, 100):
			var labels: Array = []
			for move in C.moves_for(String(id), level):
				# The fields as values, not as a formatted string: Godot prints 4.0
				# where JavaScript prints 4, and comparing the printing rather than
				# the number turns "the same table" into six false failures.
				labels.append({
					"label": String(move.get("label", "")),
					"power": float(move.get("power", 0.0)),
					"heal": float(move.get("heal", -1.0)),
					"element": String(move.get("element", "")),
					"target": String(move.get("target", "")),
					"status": move.get("status", {}),
				})
			rows.append(labels)
		options[id] = rows

	# Osric's wager, over a seeded stream: the weights decide how often the great
	# outcome turns up, which is a balance number rather than a flourish.
	var rolls: Array = []
	var stream: RNG = R.new(0x51a3c7)
	for _i in 200:
		rolls.append(String(C.roll_outcome("wager", stream).get("label", "")))

	var tiers: Array = []
	for max_hp in [100, 237, 1000, 7431]:
		for tier in C.overclock_tiers(max_hp):
			tiers.append({"label": tier["label"], "hp": int(tier["hp"]),
				"power": float(tier["power"])})

	print(JSON.stringify({
		"kinds": _kinds(ids), "options": options, "wager": rolls, "overclock": tiers,
	}))
	quit()


func _kinds(ids: Array) -> Dictionary:
	var out := {}
	for id in ids:
		out[id] = "%s|%s" % [C.label(String(id)), C.kind(String(id))]
	return out
