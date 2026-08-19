extends SceneTree
##
## What the port would play, and what it has to play it with.
##
##   godot --headless --path godot --script res://tools/audio_probe.gd
##
## Two lists, for `../../tools/audio-parity.mjs`. The first is every map's theme in both
## worlds, resolved the way the field resolves it — a ruined town plays what the ruin
## block says, and a port that read that wrongly would play the wrong music for the whole
## second act while looking correct on every other measure. The second is what the audio
## manifest actually holds, so a track the game asks for and cannot find is a failure
## here rather than a silence in somebody's browser.

const Database := preload("res://scripts/data/database.gd")
const Build := preload("res://scripts/world/map_build.gd")

const MANIFEST := "res://audio/manifest.json"


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var music := {}
	var ids: Array = db.maps.keys()
	ids.sort()
	for id in ids:
		for state in ["whole", "ruin"]:
			var key: String = id if state == "whole" else "%s#ruin" % id
			# Only where the world state changes something: a map with no `ruin` block is
			# the same map, and listing it twice would say otherwise.
			if state == "ruin" and Dictionary(db.maps[id]).get("ruin", {}).is_empty():
				continue
			music[key] = String(Build.resolve(db.maps[id], state).get("music", ""))

	var manifest := {}
	if FileAccess.file_exists(MANIFEST):
		var parsed: Variant = JSON.parse_string(
			FileAccess.open(MANIFEST, FileAccess.READ).get_as_text())
		if parsed is Dictionary:
			manifest = parsed

	# Whether each file the manifest names is actually in the export, which is a different
	# question from whether the manifest mentions it.
	var present := {}
	for id in Dictionary(manifest.get("music", {})):
		present[id] = ResourceLoader.exists(
			"res://audio/%s" % String(manifest["music"][id].get("file", "")))
	var sfx_present := {}
	for name in Dictionary(manifest.get("sfx", {})):
		sfx_present[name] = ResourceLoader.exists(
			"res://audio/%s" % String(manifest["sfx"][name].get("file", "")))

	print(JSON.stringify({
		"map_music": music,
		"tracks": Dictionary(manifest.get("music", {})).keys(),
		"sfx": Dictionary(manifest.get("sfx", {})).keys(),
		"present": present,
		"sfx_files": sfx_present,
	}))
	quit()
