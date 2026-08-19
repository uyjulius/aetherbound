extends SceneTree
##
## Build one map's scenery headlessly and report what it actually made.
##
##   godot --headless --path godot --script res://tools/scenery_probe.gd [map]
##
## Headless Godot builds no frames, so this cannot say whether the world *looks* right — but
## it can say whether the pieces exist, how many instances each material carries, and where
## they are, which is exactly what a blank screen in a browser does not tell you.

const Database := preload("res://scripts/data/database.gd")
const Build := preload("res://scripts/world/map_build.gd")
const SceneryBuilder := preload("res://scripts/world/scenery.gd")


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return
	# The palette, before anything asks it for a colour: the water surface has no plate and
	# takes its blue from the ramps, which are static and empty until they are adopted.
	Palette.adopt(db.palette)

	var wanted := OS.get_cmdline_user_args()
	if wanted.is_empty():
		wanted = ["harrowmere"]

	var report := {"maps": {}}
	for id in wanted:
		if not db.maps.has(id):
			push_error("no map called %s" % id)
			quit(1)
			return
		var def := Build.resolve(db.maps[id], "whole")
		var built = Build.build(def, db.legend, db.footprints)
		var scenery = SceneryBuilder.new()
		get_root().add_child(scenery)
		scenery.build(def, built, db.legend.get("glyphs", {}))
		var surfaces := 0
		for child in scenery.get_children():
			if child is MultiMeshInstance3D:
				surfaces += 1
		report["maps"][id] = {
			"props": scenery.placed,
			"tiles": scenery.tiles,
			"surfaces": surfaces,
		}
		scenery.queue_free()
	print(JSON.stringify(report))
	quit()
