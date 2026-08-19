extends SceneTree
##
## Loads every exported table and prints a fingerprint of what Godot actually
## sees. `../../tools/data-parity.mjs` computes the same fingerprint from the
## JavaScript source and fails on any difference.
##
##   godot --headless --path godot --script res://tools/data_probe.gd
##
## The fingerprint is row count, the sorted ids, and the sum and count of every
## number found anywhere in the table. Numbers are what matter: a bestiary that
## crosses with one enemy's attack rounded, one price shifted or one array
## truncated is a rebalanced game that still loads and still looks right. The id
## list catches rows going missing; the numeric sum catches values changing; the
## numeric count catches fields being dropped even when the values that survive
## happen to add up the same.

const Database := preload("res://scripts/data/database.gd")

const TABLES := ["enemies", "encounters", "items", "shops", "spells", "espers",
	"quests", "quest_kinds", "tracks", "characters", "maps", "char_models",
	"monster_models"]


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var out := {}
	for name in TABLES:
		var table: Dictionary = db.get(name)
		var sum := 0.0
		var count := 0
		var ids: Array = table.keys()
		ids.sort()
		for id in ids:
			var acc := _numbers(table[id])
			sum += acc[0]
			count += int(acc[1])
		out[name] = {
			"rows": table.size(),
			"ids": ids.hash(),
			"num_sum": snappedf(sum, 0.0001),
			"num_count": count,
		}
	out["cast_order"] = {
		"rows": db.cast_order.size(), "ids": db.cast_order.hash(),
		"num_sum": 0.0, "num_count": 0,
	}
	print(JSON.stringify(out))
	quit()


## Total and count of every number reachable inside a value.
##
## Booleans are excluded deliberately. GDScript will happily add `true` as 1 and
## JavaScript will not, and a fingerprint that disagrees for a reason unrelated
## to the data is a check people learn to ignore.
func _numbers(value: Variant) -> Array:
	var sum := 0.0
	var count := 0
	match typeof(value):
		TYPE_INT, TYPE_FLOAT:
			sum += float(value)
			count += 1
		TYPE_ARRAY:
			for item in value:
				var acc := _numbers(item)
				sum += acc[0]
				count += int(acc[1])
		TYPE_DICTIONARY:
			var keys: Array = value.keys()
			keys.sort()
			for key in keys:
				var acc := _numbers(value[key])
				sum += acc[0]
				count += int(acc[1])
	return [sum, count]
