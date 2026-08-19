extends SceneTree
##
## Walks every character's stat curve and the experience table, printing one JSON
## blob for `../../tools/growth-parity.mjs` to compare against the reference.
##
##   godot --headless --path godot --script res://tools/growth_probe.gd

const Database := preload("res://scripts/data/database.gd")
const G := preload("res://scripts/data/growth.gd")

const STATS := ["hp", "mp", "vig", "spd", "sta", "mag", "res", "lck"]


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var stats := {}
	var ids: Array = db.characters.keys()
	ids.sort()
	for id in ids:
		var rows := {}
		for stat in STATS:
			var values: Array = []
			# Every level, not a sample: the interesting places are level 1, the
			# damping elbow at 41, and wherever a stat reaches its cap, and a
			# sampled curve can step over all three.
			for level in range(1, 100):
				values.append(G.stat_at(db.characters[id], stat, level))
			rows[stat] = values
		stats[id] = rows

	var exp_table: Array = []
	for level in range(0, 101):
		exp_table.append(G.exp_for_level(level))
	var levels: Array = []
	for total in [0, 1, 48, 49, 50, 500, 5000, 50000, 500000, 5000000, 50000000]:
		levels.append(G.level_for_exp(total))

	print(JSON.stringify({"stats": stats, "exp": exp_table, "levels": levels}))
	quit()
