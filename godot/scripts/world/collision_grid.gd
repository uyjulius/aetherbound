class_name CollisionGrid
extends RefCounted
##
## Terrain walkability plus explicit colliders, and the movement resolution that
## reads them. A port of `CollisionGrid` in `src/world/map.js`, and the two are
## compared cell by cell and case by case by `tools/field-parity.mjs`.
##
## The grid is tiles; the colliders and every query are in world units. `TILE` is
## 2, so tile 3 spans world 6 to 8 and its centre is 7 — authored props sit on the
## tile *corner* and glyph-props on the centre, which is a difference worth
## knowing before comparing coordinates.
##
## **No `Vector2` in here.** Godot's vector types are built on `real_t`, which is
## single precision in a standard build, while a GDScript `float` is a double. A
## position that round-trips through a `Vector2` therefore loses about seven
## significant digits — invisible in a frame and not invisible in a walk: it showed
## up as the port drifting 0.0002 units from the reference over two hundred steps,
## growing, which is exactly what the parity harness exists to notice. Positions
## stay in `float` and come back as a two-element `PackedFloat64Array`.

var w := 0
var h := 0
var walk: PackedByteArray = PackedByteArray()
## `{kind: "circle", x, z, r, tag}` or `{kind: "rect", x, z, w, d, rot, tag}`.
var shapes: Array[Dictionary] = []
## `{x, z, w, d, kind, data}` in world units.
var triggers: Array[Dictionary] = []

var _tile := 2.0


func _init(width: int, height: int, tile_size: float = 2.0) -> void:
	w = width
	h = height
	_tile = tile_size
	walk.resize(width * height)


func set_walk(x: int, z: int, value: bool) -> void:
	if x < 0 or z < 0 or x >= w or z >= h:
		return
	walk[z * w + x] = 1 if value else 0


func is_walk_tile(x: int, z: int) -> bool:
	if x < 0 or z < 0 or x >= w or z >= h:
		return false
	return walk[z * w + x] == 1


## World position → walkable?
##
## `floor`, not truncation: at negative coordinates truncation rounds *towards*
## zero, so everything in the tile just outside the west or north edge reads as
## tile 0 and the world appears to extend one tile too far.
func is_walk_world(wx: float, wz: float) -> bool:
	return is_walk_tile(int(floor(wx / _tile)), int(floor(wz / _tile)))


func add_circle(x: float, z: float, r: float, tag: String = "") -> void:
	shapes.append({"kind": "circle", "x": x, "z": z, "r": r, "tag": tag})


func add_rect(x: float, z: float, width: float, depth: float, rot: float = 0.0,
		tag: String = "") -> void:
	shapes.append({"kind": "rect", "x": x, "z": z, "w": width, "d": depth,
		"rot": rot, "tag": tag})


## Resolve a movement from one point to another for a body of `radius`.
##
## Axis-separated: if the combined move is blocked, each axis is tried alone.
## That single detail is the difference between a character that slides along a
## wall and one that sticks on every corner, and sticking is the fastest way to
## make exploring feel bad.
func resolve(from_x: float, from_z: float, to_x: float, to_z: float,
		radius: float) -> PackedFloat64Array:
	if is_clear(to_x, to_z, radius):
		return PackedFloat64Array([to_x, to_z])
	if is_clear(to_x, from_z, radius):
		return PackedFloat64Array([to_x, from_z])
	if is_clear(from_x, to_z, radius):
		return PackedFloat64Array([from_x, to_z])

	# Never trap. If the *standing* position is itself illegal — a script placed
	# someone badly, a collider changed under a saved position, a ruin variant
	# redrew the ground — then every candidate above fails and the mover is stuck
	# in every direction forever, with no way out and no error. A body inside
	# geometry may always move, so it can escape; it simply cannot use collision
	# to stop, which it has already lost anyway.
	if not is_clear(from_x, from_z, radius):
		return PackedFloat64Array([to_x, to_z])
	return PackedFloat64Array([from_x, from_z])


## Is a circle at (x, z) free of terrain and collider overlaps?
##
## Named `is_clear` rather than `clear`, which on an Array means "empty this".
func is_clear(x: float, z: float, r: float) -> bool:
	# Sampled at the body's extremes rather than just its centre, so a body cannot
	# stand half inside a wall. The diagonals are at 0.7r, not r: a circle's
	# diagonal extreme is at r/√2 from centre on each axis.
	#
	# Unrolled rather than looped over a list of offsets. This runs four times per
	# resolve, sixty times a second, and building an array of nine pairs each time
	# is the kind of allocation that does not show up in a profile as one line.
	var d := r * 0.7
	if not is_walk_world(x, z): return false
	if not is_walk_world(x - r, z): return false
	if not is_walk_world(x + r, z): return false
	if not is_walk_world(x, z - r): return false
	if not is_walk_world(x, z + r): return false
	if not is_walk_world(x - d, z - d): return false
	if not is_walk_world(x + d, z - d): return false
	if not is_walk_world(x - d, z + d): return false
	if not is_walk_world(x + d, z + d): return false

	for s in shapes:
		if s["kind"] == "circle":
			# Multiplied rather than `pow`, which is a general exponential and shows
			# up in a profile: this runs nine times per collision query, four
			# queries per resolve, sixty resolves a second, against every collider
			# on the map.
			var cdx := x - float(s["x"])
			var cdz := z - float(s["z"])
			if sqrt(cdx * cdx + cdz * cdz) < float(s["r"]) + r:
				return false
		else:
			# Rotate the point into the rect's own frame, so a rotated prop is
			# tested against a box that hugs it rather than an axis-aligned one
			# swollen by the rotation.
			var c := cos(-float(s["rot"]))
			var sn := sin(-float(s["rot"]))
			var dx := x - float(s["x"])
			var dz := z - float(s["z"])
			var lx := dx * c - dz * sn
			var lz := dx * sn + dz * c
			if absf(lx) < float(s["w"]) / 2.0 + r and absf(lz) < float(s["d"]) / 2.0 + r:
				return false
	return true


## The first trigger whose area contains the point, if any.
func trigger_at(x: float, z: float) -> Dictionary:
	for t in triggers:
		if x >= t["x"] and x <= t["x"] + t["w"] and z >= t["z"] and z <= t["z"] + t["d"]:
			return t
	return {}
