extends SceneTree
##
## Builds the collision grid for every map and walks a fixed set of movement
## cases, printing one JSON blob. `../../tools/field-parity.mjs` compares the
## grids against ones harvested from the reference build, and the movement cases
## against the reference's own `CollisionGrid`.
##
##   godot --headless --path godot --script res://tools/field_probe.gd
##
## The synthetic grid the movement cases run on is small and deliberately awkward:
## a one-tile gap, an inside corner, a dead end, a circle collider and a rotated
## rectangle, and a start position that is already illegal. Sampling comfortable
## ground would prove nothing — the interesting behaviour is all at the edges.

const Database := preload("res://scripts/data/database.gd")
const Build := preload("res://scripts/world/map_build.gd")
const FieldSim := preload("res://scripts/world/field.gd")
const Grid := preload("res://scripts/world/collision_grid.gd")

## Rows for the synthetic grid. `#` is wall, `.` is floor.
const CASE_ROWS := [
	"########",
	"#......#",
	"#.##...#",
	"#.#....#",
	"#....#.#",
	"#.#..#.#",
	"#......#",
	"########",
]
const CASE_RADII := [0.1, 0.42, 0.8]


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	# Every map in the world before the cataclysm, and the twenty-six that carry a `ruin`
	# block again in the world after it. Keyed the way the harvest keys them.
	var wanted: Array = []
	var ids: Array = db.maps.keys()
	ids.sort()
	for id in ids:
		wanted.append([id, "whole", String(id)])
	for id in ids:
		if not Dictionary(db.maps[id]).get("ruin", {}).is_empty():
			wanted.append([id, "ruin", "%s#ruin" % id])

	var maps := {}
	for entry in wanted:
		var id: String = entry[0]
		var state: String = entry[1]
		var key: String = entry[2]
		# A *field*, not just a map build: NPCs carry colliders and the field is
		# what places them, so a grid without them would be missing every villager
		# in the world. The reference's grids were harvested with the field running
		# for the same reason.
		var field = FieldSim.new(Build.resolve(db.maps[id], state), db.legend,
			db.footprints, "default", db.encounters, RNG.new(1))
		var rows := PackedStringArray()
		for z in field.built.height:
			var row := ""
			for x in field.built.width:
				row += "." if field.grid.is_walk_tile(x, z) else "#"
			rows.append(row)
		maps[key] = {
			"width": field.built.width,
			"height": field.built.height,
			"walk": rows,
			"shapes": _shapes(field.grid),
			"triggers": _triggers(field.grid),
			"spawn": [snappedf(field.player.x, 0.0001), snappedf(field.player.z, 0.0001)],
			"standing_clear": field.standing_clear(),
		}

	print(JSON.stringify({"maps": maps, "cases": _cases(), "walks": _walks(db),
		"flights": _flights(db)}))
	quit()


## Colliders as plain geometry, without tags: the reference tags an authored prop
## with its optional `id` and the port with whatever identifies it, so comparing
## the labels would fail on props that never had one. The geometry is the part
## that stops a player.
func _shapes(grid) -> Array:
	var out: Array = []
	for s in grid.shapes:
		if s["kind"] == "circle":
			out.append({"kind": "circle", "x": snappedf(s["x"], 0.0001),
				"z": snappedf(s["z"], 0.0001), "r": snappedf(s["r"], 0.0001)})
		else:
			out.append({"kind": "rect", "x": snappedf(s["x"], 0.0001),
				"z": snappedf(s["z"], 0.0001), "w": snappedf(s["w"], 0.0001),
				"d": snappedf(s["d"], 0.0001), "rot": snappedf(s["rot"], 0.0001)})
	return out


func _triggers(grid) -> Array:
	var out: Array = []
	for t in grid.triggers:
		var data: Dictionary = t.get("data", {})
		out.append({
			"x": snappedf(t["x"], 0.0001), "z": snappedf(t["z"], 0.0001),
			"w": snappedf(t["w"], 0.0001), "d": snappedf(t["d"], 0.0001),
			"kind": t["kind"], "to": data.get("to", null),
		})
	return out


## Scripted flights: the airship, stepped the way the walks are.
##
## The same script and the same delta as the harvest. What is compared is where the ship ends
## up, which is a game rule rather than a feel: two continents in this world have no road to
## them, and how far the ship travels in a second decides whether they can be reached.
const FLIGHT_SCRIPT := [
	[[0, -1], 90], [[1, 0], 60], [[0, 0], 40],
	[[-1, 0], 120], [[0.7, 0.7], 80], [[0, 0], 60],
]
const FLIGHT_MAPS := ["overworld", "eastreach"]


func _flights(db) -> Dictionary:
	var out := {}
	for id in FLIGHT_MAPS:
		if not db.maps.has(id):
			continue
		for boosting in [false, true]:
			var field = FieldSim.new(Build.resolve(db.maps[id], "whole"), db.legend,
				db.footprints, "default", db.encounters, RNG.new(1))
			field.camera.yaw = PI
			field.camera.target_yaw = PI
			field.board()
			var trail: Array = []
			for entry in FLIGHT_SCRIPT:
				var move := Vector2(float(entry[0][0]), float(entry[0][1]))
				for _i in int(entry[1]):
					field.update_airship(1.0 / 60.0, move, boosting)
					trail.append([
						snappedf(float(field.vehicle["x"]), 0.000001),
						snappedf(float(field.vehicle["z"]), 0.000001),
						snappedf(float(field.vehicle["facing"]), 0.000001),
						snappedf(float(field.vehicle["thrust"]), 0.000001),
					])
			var crossing: Dictionary = Dictionary(db.maps[id]).get("crossing", {})
			out["%s@%s" % [id, "boost" if boosting else "cruise"]] = {
				"trail": trail,
				"landable": field.can_land(),
				"crossing": field.at_crossing_edge(String(crossing.get("edge", ""))) \
					if not crossing.is_empty() else false,
			}
	return out


## Scripted walks: a fixed sequence of held directions at a fixed delta, with the
## camera turned to a different bearing in each one. The trail is compared
## position by position against the reference's own field, which is the only way
## to catch a movement bug that is correct at the default camera angle — the
## reference shipped exactly that bug twice.
func _walks(db) -> Dictionary:
	var out := {}
	var script: Array = [
		[Vector2(0, -1), 40], [Vector2(1, 0), 40], [Vector2(0, 1), 25],
		[Vector2(-1, 0), 55], [Vector2(0.7, -0.7), 40], [Vector2(-0.7, -0.7), 30],
	]
	for id in ["harrowmere", "inn_harrowmere", "overworld", "sunkenvault"]:
		if not db.maps.has(id):
			continue
		for detents in [0, 1, 2, 3]:
			var field = FieldSim.new(db.maps[id], db.legend, db.footprints, "default",
				db.encounters, RNG.new(0x51a3c7))
			# Turned instantly rather than eased, so the bearing under test is the
			# bearing the whole walk uses.
			field.camera.orbit(detents)
			field.camera.yaw = field.camera.target_yaw
			var trail: Array = []
			for leg in script:
				var move: Vector2 = leg[0]
				for _step in int(leg[1]):
					field.update(1.0 / 60.0, move, false)
					trail.append([snappedf(field.player.x, 0.000001),
						snappedf(field.player.z, 0.000001)])
			out["%s@%d" % [id, detents]] = {
				"trail": trail,
				"steps": snappedf(field.step_accum, 0.0001),
			}
	return out


func _cases() -> Dictionary:
	var grid = Grid.new(8, 8, 2.0)
	for z in CASE_ROWS.size():
		var row: String = CASE_ROWS[z]
		for x in row.length():
			grid.set_walk(x, z, row.substr(x, 1) == ".")
	# One of each collider kind, the rectangle rotated so the local-frame test is
	# actually exercised rather than degenerating into an axis-aligned box.
	grid.add_circle(7.0, 7.0, 0.9, "circle")
	grid.add_rect(9.0, 5.0, 2.4, 1.2, PI / 6.0, "rect")

	var clear_results: Array = []
	for radius in CASE_RADII:
		# Quarter-unit steps across the whole grid: 4,225 samples per radius, which
		# lands on tile edges, tile centres and collider boundaries alike.
		var x := 0.0
		while x <= 16.0:
			var z := 0.0
			while z <= 16.0:
				clear_results.append(1 if grid.is_clear(x, z, radius) else 0)
				z += 0.25
			x += 0.25

	var moves: Array = []
	var starts := [
		Vector2(3.0, 3.0), Vector2(3.0, 5.0), Vector2(9.0, 3.0), Vector2(11.0, 11.0),
		Vector2(7.0, 9.0), Vector2(5.0, 5.0),
		# Already inside geometry: every candidate fails and the never-trap rule
		# is the only thing that lets this body move at all.
		Vector2(5.0, 5.5), Vector2(7.2, 7.2),
	]
	var deltas := [
		Vector2(0.5, 0.0), Vector2(-0.5, 0.0), Vector2(0.0, 0.5), Vector2(0.0, -0.5),
		Vector2(0.4, 0.4), Vector2(-0.4, 0.4), Vector2(0.4, -0.4), Vector2(-0.4, -0.4),
		Vector2(2.5, 0.0), Vector2(0.0, 2.5), Vector2(1.8, 1.8),
	]
	for from in starts:
		for delta in deltas:
			for radius in CASE_RADII:
				var to: PackedFloat64Array = grid.resolve(from.x, from.y,
					from.x + delta.x, from.y + delta.y, radius)
				moves.append([snappedf(to[0], 0.0001), snappedf(to[1], 0.0001)])

	var triggers: Array = []
	grid.triggers.append({"x": 4.0, "z": 4.0, "w": 2.0, "d": 2.0, "kind": "exit",
		"data": {"to": "elsewhere"}})
	grid.triggers.append({"x": 5.0, "z": 5.0, "w": 3.0, "d": 1.0, "kind": "event",
		"data": {}})
	var px := 3.0
	while px <= 9.0:
		var pz := 3.0
		while pz <= 9.0:
			var hit: Dictionary = grid.trigger_at(px, pz)
			triggers.append(hit.get("kind", "") if not hit.is_empty() else "")
			pz += 0.5
		px += 0.5

	return {"clear": clear_results, "resolve": moves, "trigger_at": triggers}
