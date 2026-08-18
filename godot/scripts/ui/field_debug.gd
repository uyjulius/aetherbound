extends Control
##
## A diagnostic view of the ported world: the grid, the colliders, the triggers
## and a party you can walk around them with.
##
## Deliberately a diagnostic and not a scene. The reference builds its ground,
## walls and props from geometry computed in code, and this project does not ship
## procedurally generated assets — so the scenery for these 95 maps is an asset
## problem with its own sub-project, and drawing boxes here to stand in for it
## would be exactly the shortcut that was ruled out. What *is* finished is the
## simulation: walkability, collision, camera-relative movement, triggers and
## encounter distance, all of it checked against the reference by
## `tools/field-parity.mjs`. This is that simulation, made visible.
##
## Controls: move, `run`, `pageLeft`/`pageRight` to orbit the camera in 45°
## detents, `menu` for the next map, `cancel` to go back.

const FieldSim := preload("res://scripts/world/field.gd")
const Database := preload("res://scripts/data/database.gd")

## Maps worth opening on first, in this order: a town, an interior, a continent,
## a dungeon. `menu` walks the whole world from there.
const FIRST := ["harrowmere", "inn_harrowmere", "overworld", "sunkenvault"]

var _db: Database
var _field: Field
var _ids: PackedStringArray = PackedStringArray()
var _index := 0
var _label: Label


func _ready() -> void:
	_db = Database.new()
	if not _db.load_all():
		push_error("data tables did not load")
		return
	Palette.adopt(_db.palette)
	Actions.build(_db.input)

	var rest: Array = _db.maps.keys()
	rest.sort()
	for id in FIRST:
		if _db.maps.has(id):
			_ids.append(id)
	for id in rest:
		if not _ids.has(id):
			_ids.append(id)

	_label = Label.new()
	_label.add_theme_font_size_override("font_size", 20)
	_label.add_theme_color_override("font_color", Palette.ui_color("text"))
	_label.position = Vector2(24, 18)
	add_child(_label)

	_open(0)
	set_process(true)


func _open(index: int) -> void:
	_index = posmod(index, _ids.size())
	var id := _ids[_index]
	_field = FieldSim.new(_db.maps[id], _db.legend, _db.footprints, "default",
		_db.encounters, RngStreams.encounter)
	# One line per map opened, so `tools/web-smoke.mjs` can prove the field runs in
	# a browser rather than only in the editor — and so a map that builds an empty
	# grid is visible as numbers rather than as a blank screen.
	print("FIELD_READY map=%s tiles=%dx%d colliders=%d triggers=%d" % [
		id, _field.built.width, _field.built.height,
		_field.grid.shapes.size(), _field.grid.triggers.size()])


func _process(delta: float) -> void:
	if Actions.just_pressed("cancel"):
		get_tree().change_scene_to_file("res://scenes/title.tscn")
		return
	if Actions.just_pressed("menu"):
		_open(_index + 1)
	if Actions.just_pressed("pageLeft"):
		_field.camera.orbit(1)
	if Actions.just_pressed("pageRight"):
		_field.camera.orbit(-1)

	var result := _field.update(delta, Actions.move_vector(), Actions.is_down("run"))
	if not result["encounter"].is_empty():
		# Reported rather than fought: the battle runtime is a later sub-project,
		# and a counter that visibly ticks over is what proves the encounter
		# distance is being accumulated at all.
		_encounters += 1
	_trigger = result["trigger"]
	queue_redraw()
	_update_label()


var _encounters := 0
var _trigger: Dictionary = {}


func _update_label() -> void:
	var def: Dictionary = _db.maps[_ids[_index]]
	var table := _field.current_encounter_table()
	var remaining := _field.encounter_threshold - _field.step_accum
	var lines := [
		"%s — %s" % [String(def.get("name", "?")), String(def.get("subtitle", ""))],
		"%s   %d x %d tiles   %d colliders   %d triggers" % [
			_ids[_index], _field.built.width, _field.built.height,
			_field.grid.shapes.size(), _field.grid.triggers.size()],
		"at %.2f, %.2f   %s   bearing %d°   speed x%.2f" % [
			_field.player.x, _field.player.z,
			"standing clear" if _field.standing_clear() else "INSIDE GEOMETRY",
			int(round(rad_to_deg(_field.camera.yaw))) % 360, _field.speed_scale],
		("next encounter in %.0f units (%d so far)" % [remaining, _encounters]) if table \
			and not table.is_empty() else "no encounters here",
	]
	if not _trigger.is_empty():
		var data: Dictionary = _trigger.get("data", {})
		lines.append("on a %s trigger%s" % [_trigger["kind"],
			(" → %s" % data["to"]) if data.has("to") else ""])
	lines.append("move / run · Q,E orbit · C next map · Esc back")
	_label.text = "\n".join(lines)


## Drawn top-down, scaled to fit, north up. Not a camera view: the point is to see
## the grid and the colliders at once, which a camera at the player's shoulder
## cannot do.
func _draw() -> void:
	if _field == null:
		return
	var tile := 2.0
	var w := float(_field.built.width) * tile
	var h := float(_field.built.height) * tile
	var margin := 150.0
	var scale := minf((size.x - margin) / w, (size.y - margin) / h)
	var origin := Vector2((size.x - w * scale) * 0.5, (size.y - h * scale) * 0.5 + 40.0)
	var to_screen := func(x: float, z: float) -> Vector2:
		return origin + Vector2(x, z) * scale

	var floor_colour := Palette.ramp_at("dirt", 0.35)
	var wall_colour := Palette.ramp_at("stone", 0.1)
	for z in _field.built.height:
		for x in _field.built.width:
			var walkable := _field.grid.is_walk_tile(x, z)
			draw_rect(Rect2(to_screen.call(x * tile, z * tile),
				Vector2(tile * scale, tile * scale) - Vector2.ONE),
				floor_colour if walkable else wall_colour, true)

	# Triggers under the colliders: a doorway is usually inside a building's
	# footprint and would be hidden the other way round.
	for t in _field.grid.triggers:
		var colour := Palette.ui_color("select") if t["kind"] == "exit" \
			else Palette.ui_color("mp")
		colour.a = 0.45
		draw_rect(Rect2(to_screen.call(t["x"], t["z"]),
			Vector2(t["w"], t["d"]) * scale), colour, true)

	var collider_colour := Palette.ui_color("danger")
	collider_colour.a = 0.75
	for s in _field.grid.shapes:
		if s["kind"] == "circle":
			draw_arc(to_screen.call(s["x"], s["z"]), float(s["r"]) * scale, 0.0, TAU,
				24, collider_colour, 1.5)
		else:
			# Rotated, so a building at an angle reads as the box that actually
			# blocks the player rather than an axis-aligned guess at it.
			var half := Vector2(float(s["w"]), float(s["d"])) * 0.5 * scale
			var centre: Vector2 = to_screen.call(s["x"], s["z"])
			var rot := float(s["rot"])
			var corners := PackedVector2Array()
			for corner in [Vector2(-half.x, -half.y), Vector2(half.x, -half.y),
					Vector2(half.x, half.y), Vector2(-half.x, half.y)]:
				corners.append(centre + corner.rotated(rot))
			corners.append(corners[0])
			draw_polyline(corners, collider_colour, 1.5)

	for npc in _field.npcs:
		draw_circle(to_screen.call(npc["x"], npc["z"]), 0.44 * scale,
			Palette.ui_color("good"))

	# The party, with its facing, and the camera's bearing as the longer line —
	# the two differ whenever the camera has been orbited, which is the thing
	# that made the reference's input transform wrong twice.
	var player: Vector2 = to_screen.call(_field.player.x, _field.player.z)
	draw_circle(player, Field.PLAYER_RADIUS * scale, Palette.ui_color("text"))
	draw_line(player, player + Vector2(sin(_field.player.facing),
		cos(_field.player.facing)) * 1.4 * scale, Palette.ui_color("hp"), 2.0)
	draw_line(player, player - Vector2(sin(_field.camera.yaw),
		cos(_field.camera.yaw)) * 2.6 * scale, Palette.ui_color("atb"), 1.0)
