class_name Field
extends RefCounted
##
## The field: where the party stands, how it moves, what it walks into.
##
## A port of the simulation half of `src/world/field.js` — movement, the camera's
## bearing, triggers and encounter distance. Deliberately not a scene: no meshes,
## no lights, nothing to draw. That makes it testable exactly (`tools/field-parity.mjs`
## drives it with fixed deltas and compares position by position against the
## reference) and it keeps the scenery question, which is an asset question, out
## of the movement code.
##
## Everything here is in world units. Tiles are 2 units, so a tile index times 2
## is its corner and times 2 plus 1 is its centre — glyph-props and spawns sit on
## centres, authored props on corners.

const PLAYER_RADIUS := 0.42
const WALK_SPEED := 4.4
const RUN_SPEED := 7.6

## How much further apart random encounters sit than the bestiary's tables ask.
##
## The per-table `rate` is a distance in world units and the numbers in it are
## 15–34. The overworld runs at 13.3 units a second, so at face value the tables
## wanted a fight every one to three seconds of running — measured against the
## game's own simulator, 800 forced battles across the campaign. One multiplier
## here rather than 36 edits in the bestiary keeps the relative density of every
## region intact, and it is paired with the experience coefficient so the distance
## walked per level is unchanged and only the number of interruptions falls.
const ENCOUNTER_SPACING := 2.6

## Facing by compass name, in radians. South is zero and the camera starts looking
## down -Z, which is why "north" is PI rather than zero.
const FACINGS := {"south": 0.0, "north": PI, "east": PI / 2.0, "west": -PI / 2.0}

## Seconds without movement while asking to move before the watchdog reports.
const STUCK_AFTER := 3.0
## Episodes reported per session. Rate-limited per *episode*, not once per session:
## a watchdog that can only fire once leaves the second stuck of the night
## unhealed, which a smoke run proved.
const STUCK_EPISODES := 3


class Player:
	extends RefCounted
	var x := 0.0
	var z := 0.0
	var facing := PI
	var target_facing := PI
	var speed := 0.0


## The camera's bearing and the input basis that follows from it.
class Camera:
	extends RefCounted
	var yaw := PI            ## looking down -Z
	var target_yaw := PI
	var pitch := 0.72
	var distance := 13.5
	var target_distance := 13.5
	var height := 1.4
	var smoothing := 7.5
	var look := Vector3(0, 1.4, 0)

	## Orbit in 45° detents. Free-spinning analogue orbit makes a top-down world
	## disorienting; detents keep the compass legible.
	func orbit(steps: int) -> void:
		target_yaw += float(steps) * PI / 4.0

	func update(dt: float, target_x: float, target_z: float) -> void:
		yaw += (target_yaw - yaw) * minf(1.0, dt * 6.0)
		distance += (target_distance - distance) * minf(1.0, dt * 4.0)
		# Lead the camera toward the player rather than snapping to them.
		look = look.lerp(Vector3(target_x, height, target_z), minf(1.0, dt * smoothing))

	## Where the camera actually sits, given its bearing.
	func position() -> Vector3:
		return Vector3(
			look.x + sin(yaw) * cos(pitch) * distance,
			look.y + sin(pitch) * distance,
			look.z + cos(yaw) * cos(pitch) * distance)

	## Turn an input vector into world movement for the current bearing.
	##
	## Built from the camera's own basis. The rig sits at
	## `look + (sin y, ·, cos y) * d`, so the direction it faces — which is where
	## the player expects "up" to go — is `forward = (-sin y, -cos y)`, and
	## `right = (cos y, -sin y)`. The input is `ix * right + (-iy) * forward`,
	## since screen-up is `iy = -1`.
	##
	## Two versions of this in the reference were wrong, and the second was wrong
	## in a way that only showed at some angles: correct at the default bearing and
	## at 180°, reversed at 90° and 270°, so turning the camera a quarter turn made
	## forward walk down the screen. The parity check sweeps four bearings for
	## exactly that reason.
	## Returns `[x, z]` as doubles. A `Vector2` here is single precision, and the
	## error survives into the player's position — see the note in
	## `collision_grid.gd`.
	func transform_input(ix: float, iy: float) -> PackedFloat64Array:
		var s := sin(yaw)
		var c := cos(yaw)
		return PackedFloat64Array([ix * c + iy * s, -ix * s + iy * c])


var built: MapBuild.Built
var grid: CollisionGrid
var player := Player.new()
var camera := Camera.new()
## `{id, x, z, home_x, home_z, facing, shape}` — `shape` is the live collider in
## the grid, so moving an NPC moves what blocks the player.
var npcs: Array[Dictionary] = []

var step_accum := 0.0
var encounter_threshold := INF
## Set when the map has no encounter table at all, so the distinction between
## "nothing rolled yet" and "nothing can roll here" stays visible.
var encounters_possible := false

## Movement multiplier for this map. The two continents run at 1.75 — a player
## crossing 64 tiles of overworld at town speed is a player watching a loading
## bar with scenery on it. Cutscenes may also set it.
var speed_scale := 1.0

var _rng: RNG
var _encounter_tables: Dictionary = {}
var _map_def: Dictionary = {}
var _tile := 2.0
var _stuck_for := 0.0
var _stuck_fired := false
var _stuck_episodes := 0


## Build a field for a map.
##
## `encounter_tables` is the exported `encounters` table, used to resolve the
## named tables that encounter *zones* refer to. `stream` is the seeded RNG the
## encounter distance is drawn from — the reference used `Math.random` here, which
## broke its own promise that a save replays exactly, and the port draws from the
## `encounter` stream instead.
func _init(map_def: Dictionary, legend: Dictionary, footprints: Dictionary,
		spawn_name := "default", encounter_tables: Dictionary = {},
		stream: RNG = null) -> void:
	_map_def = map_def
	_tile = float(legend.get("tile", 2))
	_encounter_tables = encounter_tables
	_rng = stream if stream != null else RngStreams.encounter
	speed_scale = float(map_def.get("speedScale", 1.0))
	built = MapBuild.build(map_def, legend, footprints)
	grid = built.grid
	_spawn_npcs()

	var spawn := resolve_spawn(spawn_name)
	player.x = spawn[0]
	player.z = spawn[1]
	player.facing = spawn_facing(spawn_name)
	player.target_facing = player.facing
	camera.look = Vector3(player.x, camera.height, player.z)

	encounter_threshold = roll_encounter_threshold()


## NPCs are colliders too, and they are added by the field rather than by the map
## build: they move, and their collider moves with them. Leaving them out made
## every villager walkable-through in the port while the reference blocked them.
func _spawn_npcs() -> void:
	for def in _map_def.get("npcs", []):
		var at: Array = def.get("at", [0, 0])
		var x := float(at[0]) * _tile + _tile / 2.0
		var z := float(at[1]) * _tile + _tile / 2.0
		grid.add_circle(x, z, 0.44, String(def.get("id", "npc")))
		npcs.append({
			"id": String(def.get("id", "npc")),
			"x": x, "z": z, "home_x": x, "home_z": z,
			"facing": float(FACINGS.get(String(def.get("face", "south")), 0.0)),
			"shape": grid.shapes[grid.shapes.size() - 1],
		})


## Where the party arrives.
##
## A named spawn wins, then `default`, then any spawn at all, then the first
## walkable tile — because a map that cannot be entered is worse than one entered
## in the wrong corner.
func resolve_spawn(name: String) -> PackedFloat64Array:
	var points: Dictionary = _map_def.get("spawns", {})
	var point: Variant = points.get(name, points.get("default", null))
	if point == null and not points.is_empty():
		point = points.values()[0]
	if point == null:
		for z in built.height:
			for x in built.width:
				if grid.is_walk_tile(x, z):
					return PackedFloat64Array([x * _tile + _tile / 2.0,
						z * _tile + _tile / 2.0])
		return PackedFloat64Array([0.0, 0.0])
	var at: Array = point.get("at", [0, 0])
	return PackedFloat64Array([float(at[0]) * _tile + _tile / 2.0,
		float(at[1]) * _tile + _tile / 2.0])


func spawn_facing(name: String) -> float:
	var points: Dictionary = _map_def.get("spawns", {})
	var point: Variant = points.get(name, points.get("default", null))
	if point == null and not points.is_empty():
		point = points.values()[0]
	if point == null:
		return PI
	return float(FACINGS.get(String(point.get("face", "south")), PI))


## The encounter table for wherever the player is standing.
##
## Zones are authored rectangles in tile space checked in order, so a small
## dangerous pocket can sit inside a larger safe region. A continent that rolls
## one table everywhere makes the whole map feel like one place.
func current_encounter_table() -> Dictionary:
	var zones: Array = _map_def.get("encounterZones", [])
	if not zones.is_empty():
		var tx := player.x / _tile
		var tz := player.z / _tile
		for zone in zones:
			var rect: Array = zone.get("rect", [])
			if rect.size() < 4:
				continue
			if tx >= float(rect[0]) and tx < float(rect[0]) + float(rect[2]) \
					and tz >= float(rect[1]) and tz < float(rect[1]) + float(rect[3]):
				var named: Variant = _encounter_tables.get(String(zone.get("table", "")), null)
				return named if named is Dictionary else {}
	var own: Variant = _map_def.get("encounters", null)
	return own if own is Dictionary else {}


## Which formation turns up.
##
## A table is a weighted list of groups, and a group already naming its enemies is a
## formation in its own right — which is how a scripted fight passes through the same
## door as a random one. Drawn from the encounter stream, like the distance.
static func pick_group(table: Dictionary, stream: RNG) -> Dictionary:
	if table.is_empty():
		return {}
	if table.has("enemies"):
		return table
	var groups: Array = table.get("groups", [])
	if groups.is_empty():
		return {}
	var entries: Array = []
	for group in groups:
		entries.append([float(group.get("weight", 1)), group])
	var chosen: Variant = stream.weighted(entries)
	return chosen if chosen is Dictionary else {}


## Distance until the next encounter.
##
## Distance rather than time, so standing still is safe and running does not
## inflate the rate.
func roll_encounter_threshold() -> float:
	var table := current_encounter_table()
	encounters_possible = not table.is_empty()
	if not encounters_possible:
		return INF
	var base := float(table.get("rate", 26)) * ENCOUNTER_SPACING
	return base * _rng.float_range(0.55, 1.45)


## Advance one frame.
##
## Returns what happened: `{"travelled": float, "encounter": Dictionary,
## "trigger": Dictionary, "stuck": bool}`. Empty dictionaries mean nothing fired;
## the caller decides what a trigger or an encounter *means*, because that is
## game flow rather than field simulation.
func update(dt: float, move: Vector2, running: bool, sprinting := false) -> Dictionary:
	var result := {"travelled": 0.0, "encounter": {}, "trigger": {}, "stuck": false}
	var moving := absf(move.x) > 0.01 or absf(move.y) > 0.01

	if moving:
		var speed := (RUN_SPEED if running else WALK_SPEED) * speed_scale \
			* (1.3 if sprinting else 1.0)
		var dir := camera.transform_input(move.x, move.y)
		var length := sqrt(dir[0] * dir[0] + dir[1] * dir[1])
		if length == 0.0:
			length = 1.0
		var nx := dir[0] / length
		var nz := dir[1] / length
		# The input's own magnitude still counts, so a half-pushed stick walks
		# slowly, but the *direction* is normalised first — otherwise a diagonal
		# on the keyboard moves 1.41 times as fast as a straight line.
		var magnitude := minf(1.0, sqrt(move.x * move.x + move.y * move.y))
		var step := speed * magnitude * dt
		var to := grid.resolve(player.x, player.z,
			player.x + nx * step, player.z + nz * step, PLAYER_RADIUS)
		var moved_x := to[0] - player.x
		var moved_z := to[1] - player.z
		var travelled := sqrt(moved_x * moved_x + moved_z * moved_z)
		player.x = to[0]
		player.z = to[1]
		player.target_facing = atan2(nx, nz)
		player.speed = travelled / maxf(dt, 1e-5)
		result["travelled"] = travelled
		result["encounter"] = _accumulate_steps(travelled)
		result["trigger"] = grid.trigger_at(player.x, player.z)
	else:
		player.speed = 0.0

	result["stuck"] = _watch_for_stuck(dt, moving, result["travelled"])
	player.facing += angle_difference(player.facing, player.target_facing) * minf(1.0, dt * 14.0)
	camera.update(dt, player.x, player.z)
	return result


## Distance walked since the last encounter, and the roll when it is far enough.
func _accumulate_steps(distance: float) -> Dictionary:
	var table := current_encounter_table()
	if table.is_empty():
		return {}
	step_accum += distance
	if step_accum < encounter_threshold:
		return {}
	step_accum = 0.0
	encounter_threshold = roll_encounter_threshold()
	return table


## Asking to move and not moving is the signature of a stuck player.
##
## Reported rather than fixed here: the reference heals it by resynchronising the
## input, which is a thing the caller owns. What matters is that the condition is
## noticed at all — a player wedged in geometry with working controls looks
## exactly like a player who has put the pad down.
func _watch_for_stuck(dt: float, asking: bool, travelled: float) -> bool:
	if not asking or travelled > 0.01:
		_stuck_for = 0.0
		_stuck_fired = false
		return false
	_stuck_for += dt
	if _stuck_for > STUCK_AFTER and not _stuck_fired and _stuck_episodes < STUCK_EPISODES:
		_stuck_fired = true
		_stuck_episodes += 1
		return true
	return false


## Is the party standing somewhere legal? Diagnostic, and the thing the never-trap
## rule in `resolve` exists to survive.
func standing_clear() -> bool:
	return grid.is_clear(player.x, player.z, PLAYER_RADIUS)
