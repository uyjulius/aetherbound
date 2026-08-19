extends SceneTree
##
## Reads the danger of every door in the world and prints one JSON blob for
## `../../tools/danger-parity.mjs` to compare against the reference's `danger.js`.
##
##   godot --headless --path godot --script res://tools/danger_probe.gd
##
## Every map and every named spawn in it, plus the unnamed arrival each map has when a
## script drops the party in without saying where — because that is the case the fallback
## chain covers and the one a sampled probe would miss.

const Database := preload("res://scripts/data/database.gd")
const D := preload("res://scripts/world/danger.gd")

## The note bands, sampled where they turn. A grid rather than the interesting points alone:
## the bands are a chain of `>=` comparisons and an off-by-one in any of them shows up as
## one wrong word at one gap.
const PARTY_LEVELS := [1, 8, 17, 26, 40, 55, 68, 82, 99]


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var levels := {}
	var ids: Array = db.maps.keys()
	ids.sort()
	for id in ids:
		var map_def: Dictionary = db.maps[id]
		var rows := {}
		var spawns: Array = map_def.get("spawns", {}).keys()
		spawns.sort()
		# "" is the arrival with no spawn named, which the reference reaches by handing the
		# lookup an `undefined` key.
		spawns.push_front("")
		for spawn in spawns:
			rows[spawn] = D.level_of(map_def, String(spawn), db.encounters, db.enemies)
		levels[id] = rows

	# The words, over destination levels a real map produces and party levels a real party
	# passes through.
	var notes := {}
	for destination in range(0, 91):
		var row := {}
		for party in PARTY_LEVELS:
			var said: Dictionary = D.note(float(destination), float(party))
			row[str(party)] = "" if said.is_empty() \
				else "%s/%s" % [String(said["tone"]), String(said["text"])]
		notes[str(destination)] = row

	print(JSON.stringify({"levels": levels, "notes": notes}))
	quit()
