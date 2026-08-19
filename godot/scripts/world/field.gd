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

## How far ahead the party reaches, and how far that reach carries.
## How fast a villager strolls. The reference's number.
const NPC_SPEED := 1.9

# The airship. Every number is the reference's, because the reach of the ship decides which
# continents a player can get to at all.
const AIRSHIP_SPEED := 17.0
const AIRSHIP_BOOST_SPEED := 30.0
const AIRSHIP_ALTITUDE := 9.5
const AIRSHIP_PARKED_Y := 0.9
const AIRSHIP_CAMERA_DISTANCE := 30.0
const AIRSHIP_CAMERA_PITCH := 0.82

## A chest is a thing on the ground rather than a person to face.
const CHEST_REACH := 1.7

const REACH_AHEAD := 0.9
const REACH := 1.7


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
## Set for one frame when a reported episode ends, carrying how long it lasted.
var _stuck_recovered := 0.0
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

	# The camera this map wants. Ninety-four of the ninety-five say how far back and how steep
	# they should be read from — a town is close and level, a dungeon is closer, the overworld
	# pulls out — and the port was using the default for all of them, which is why the camera
	# kept ending up inside somebody's roof.
	camera.distance = float(map_def.get("cameraDistance", camera.distance))
	camera.target_distance = camera.distance
	camera.pitch = float(map_def.get("cameraPitch", camera.pitch))

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
			# Staggered, so a street of villagers does not set off in step.
			"wander_timer": 1.0 + RngStreams.fx.float_range(0.0, 3.0),
			"speed": 0.0,
			"facing": float(FACINGS.get(String(def.get("face", "south")), 0.0)),
			"shape": grid.shapes[grid.shapes.size() - 1],
			# The authored row, so an interaction can read what this person offers —
			# a line, a shop, a bed, a scene.
			"def": def,
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
## `warded` is the `noEncounter` relic: the party still walks, and nothing meets them.
func update(dt: float, move: Vector2, running: bool, sprinting := false,
		warded := false) -> Dictionary:
	var result := {"travelled": 0.0, "encounter": {}, "trigger": {}, "stuck": false,
		"unstuck": 0.0}
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
		result["encounter"] = {} if warded else _accumulate_steps(travelled)
		result["trigger"] = grid.trigger_at(player.x, player.z)
	else:
		player.speed = 0.0

	result["stuck"] = _watch_for_stuck(dt, moving, result["travelled"])
	# How long a stuck episode lasted, once, at the moment it ends. Whatever fixed it is the
	# root cause by another name, and a report of the trouble without a report of the recovery
	# cannot tell a wedged party from a player who put the pad down and came back.
	result["unstuck"] = _stuck_recovered
	_stuck_recovered = 0.0
	player.facing += angle_difference(player.facing, player.target_facing) * minf(1.0, dt * 14.0)
	camera.update(dt, player.x, player.z)
	return result


## Distance walked since the last encounter, and the roll when it is far enough.
##
## A warded party never gets here, which is the reference's own arrangement: the ward stops the
## roll rather than the counting, so putting the relic on does not bank distance for later.
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
		if _stuck_fired:
			_stuck_recovered = _stuck_for
		_stuck_for = 0.0
		_stuck_fired = false
		return false
	_stuck_for += dt
	if _stuck_for > STUCK_AFTER and not _stuck_fired and _stuck_episodes < STUCK_EPISODES:
		_stuck_fired = true
		_stuck_episodes += 1
		return true
	return false


## What the party is facing and could interact with, or an empty dictionary.
##
## Looked for slightly *ahead* of the player rather than at them, so you interact with
## what you are facing — standing on top of something and turning around should not keep
## opening it.
func interact_target() -> Dictionary:
	var ax := player.x + sin(player.facing) * REACH_AHEAD
	var az := player.z + cos(player.facing) * REACH_AHEAD
	var best := {}
	var best_distance := INF
	for npc in npcs:
		var def: Dictionary = npc["def"]
		if not (def.has("talk") or def.has("shop") or def.has("inn") or def.has("event")):
			continue
		var d := sqrt(pow(ax - float(npc["x"]), 2.0) + pow(az - float(npc["z"]), 2.0))
		if d < REACH and d < best_distance:
			best_distance = d
			best = {"kind": "npc", "npc": npc,
				"label": String(def.get("prompt", "Talk"))}

	# Chests, and props that ask to be examined. A chest already opened is not offered — the
	# reference records the opening on the *party*, which is to say in the save file, because
	# it used to live on the shared map definition and all 383 of them reopened on reload.
	for prop in _map_def.get("props", []):
		var at: Array = prop.get("at", [0, 0])
		var x := float(at[0]) * _tile
		var z := float(at[1]) * _tile
		var d := sqrt(pow(ax - x, 2.0) + pow(az - z, 2.0))
		if String(prop.get("kit", "")) == "chest":
			if opened_chests.has(String(prop.get("id", ""))):
				continue
			# A slightly longer reach than a person: a chest is a thing on the ground and
			# lining up with it exactly is nobody's idea of fun.
			if d < CHEST_REACH and d < best_distance:
				best_distance = d
				best = {"kind": "chest", "prop": prop, "label": "Open"}
		elif prop.has("interact"):
			var radius := float(prop.get("interactRadius", 1.8))
			if d < radius and d < best_distance:
				best_distance = d
				best = {"kind": "object", "prop": prop,
					"label": String(Dictionary(prop.get("interact", {})).get("prompt", "Examine"))}
	# A ship left on the ground is boardable from where it stands, so landing somewhere remote
	# is a decision rather than a mistake.
	if not parked.is_empty():
		var to_ship := sqrt(pow(ax - float(parked["x"]), 2.0)
			+ pow(az - float(parked["z"]), 2.0))
		if to_ship < 3.4 and to_ship < best_distance:
			best_distance = to_ship
			best = {"kind": "airship", "label": "Board"}
	return best


## How many breadcrumbs apart the party walks. The reference's number.
const FOLLOWER_SPACING := 9

## The party behind the leader: `{x, z, facing, speed}` each.
var followers: Array = []
var _trail: Array = []


## The ship, while the party is flying it: `{x, z, facing, thrust}`. Empty on the ground.
var vehicle: Dictionary = {}
## Where the hull is sitting, when it is sitting: `{x, z, facing}`.
var parked: Dictionary = {}


## Chests this field has been told are already open, by prop id.
##
## Passed in rather than read from the party, so the field stays a simulation with no
## opinion about save files — which is what lets `field-parity.mjs` drive it without one.
var opened_chests: Dictionary = {}


## Walk the rest of the party along behind the leader.
##
## Breadcrumbs rather than steering: the leader drops a crumb every 0.16 units and each
## follower walks to the crumb nine places behind the one in front. The reference's note says
## why, and it is the right reason — a follower that steers towards the leader takes shortcuts
## through walls, and a follower that walks the leader's own path cannot.
##
## Outside `update` for the same reason the villagers are: the harness drives that function
## against the reference's `_updatePlayer`, which does not move followers either.
func update_followers(dt: float, count: int) -> Array:
	if count <= 0:
		return []
	if _trail.is_empty() or Vector2(player.x - _trail[0][0], player.z - _trail[0][1]).length() > 0.16:
		_trail.insert(0, [player.x, player.z])
		if _trail.size() > 240:
			_trail.resize(240)
	while followers.size() < count:
		followers.append({"x": player.x, "z": player.z, "facing": player.facing, "speed": 0.0})
	while followers.size() > count:
		followers.pop_back()

	for i in followers.size():
		var follower: Dictionary = followers[i]
		var at: Array = _trail[mini(_trail.size() - 1, FOLLOWER_SPACING * (i + 1))]
		var dx := float(at[0]) - float(follower["x"])
		var dz := float(at[1]) - float(follower["z"])
		var distance := sqrt(dx * dx + dz * dz)
		if distance > 0.05:
			# A follower who has fallen behind hurries: 1.35 times running speed, which is the
			# reference's number and the difference between a party and a conga line.
			var step := minf(distance, RUN_SPEED * dt * (1.35 if distance > 2.4 else 1.0))
			follower["x"] = float(follower["x"]) + dx / distance * step
			follower["z"] = float(follower["z"]) + dz / distance * step
			follower["facing"] = atan2(dx, dz)
			follower["speed"] = step / maxf(dt, 1e-5)
		else:
			follower["speed"] = 0.0
	return followers


# ---------------------------------------------------------------------------
# The airship
# ---------------------------------------------------------------------------

## Get in. The ship lifts from wherever the party is standing.
##
## The parked hull is reused rather than a second one spawned, which is the reference's note
## and its reason: boarding used to leave a ship next to the one already there.
func board() -> void:
	if not vehicle.is_empty():
		return
	vehicle = {
		"x": player.x, "z": player.z, "facing": player.facing, "thrust": 0.0,
	}
	parked = {}
	camera.target_distance = AIRSHIP_CAMERA_DISTANCE
	camera.pitch = AIRSHIP_CAMERA_PITCH
	camera.height = AIRSHIP_ALTITUDE * 0.8


## Step off onto the tile below, leaving the ship where it stands — a little to one side, so
## the party is not standing inside it.
func disembark() -> void:
	if vehicle.is_empty():
		return
	var x := float(vehicle["x"])
	var z := float(vehicle["z"])
	var facing := float(vehicle["facing"])
	vehicle = {}
	parked = {
		"x": x + sin(facing + PI / 2.0) * 3.2,
		"z": z + cos(facing + PI / 2.0) * 3.2,
		"facing": facing,
	}
	player.x = x
	player.z = z
	player.facing = facing
	player.target_facing = facing
	player.speed = 0.0
	camera.target_distance = float(_map_def.get("cameraDistance", 13.5))
	camera.pitch = float(_map_def.get("cameraPitch", 0.72))
	camera.height = 1.4
	camera.look = Vector3(x, camera.height, z)
	encounter_threshold = roll_encounter_threshold()


## Is the ship over ground it could put down on?
##
## The landing tile *and* its four neighbours have to be clear, so the party never disembarks
## into a one-tile pocket they cannot walk out of.
func can_land() -> bool:
	if vehicle.is_empty():
		return false
	var x := float(vehicle["x"])
	var z := float(vehicle["z"])
	for offset in [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]:
		if not grid.is_walk_world(x + float(offset[0]) * _tile, z + float(offset[1]) * _tile):
			return false
	return true


## Is the ship pressed against the named edge of the map?
func at_crossing_edge(edge: String) -> bool:
	if vehicle.is_empty():
		return false
	var margin := _tile * 1.5
	var x := float(vehicle["x"])
	var z := float(vehicle["z"])
	match edge:
		"west": return x <= margin
		"east": return x >= float(grid.w) * _tile - margin
		"north": return z <= margin
		"south": return z >= float(grid.h) * _tile - margin
	return false


## Fly. Returns `{crossing, landable}` — what the screen should be offering.
##
## Momentum, so the ship feels heavy rather than like a cursor: about a second and a half to
## reach cruise and rather longer to stop. The clamp keeps it over the ground plane, because a
## ship that flies off the edge of a map is looking at nothing.
func update_airship(dt: float, move: Vector2, boosting: bool) -> Dictionary:
	if vehicle.is_empty():
		return {}
	var magnitude := minf(1.0, move.length())
	var moving := magnitude > 0.01
	var top := AIRSHIP_BOOST_SPEED if boosting else AIRSHIP_SPEED
	var wanted := top if moving else 0.0
	var thrust := float(vehicle["thrust"])
	thrust += (minf(1.0, wanted / AIRSHIP_BOOST_SPEED) - thrust) \
		* minf(1.0, dt * (0.9 if moving else 1.6))
	vehicle["thrust"] = thrust

	if moving:
		var dir := camera.transform_input(move.x, move.y)
		var length := sqrt(dir[0] * dir[0] + dir[1] * dir[1])
		if length <= 0.0:
			length = 1.0
		var target := atan2(dir[0] / length, dir[1] / length)
		var diff := target - float(vehicle["facing"])
		while diff > PI:
			diff -= PI * 2.0
		while diff < -PI:
			diff += PI * 2.0
		vehicle["facing"] = float(vehicle["facing"]) + diff * minf(1.0, dt * 2.4)

	var speed := thrust * AIRSHIP_BOOST_SPEED
	vehicle["x"] = float(vehicle["x"]) + sin(float(vehicle["facing"])) * speed * dt
	vehicle["z"] = float(vehicle["z"]) + cos(float(vehicle["facing"])) * speed * dt
	vehicle["x"] = clampf(float(vehicle["x"]), _tile, float(grid.w) * _tile - _tile)
	vehicle["z"] = clampf(float(vehicle["z"]), _tile, float(grid.h) * _tile - _tile)

	camera.update(dt, float(vehicle["x"]), float(vehicle["z"]))

	# A crossing is offered only in the air. A continent with no road to it is the whole reason
	# the ship exists, and letting a walker paddle across would undo that in one line.
	var crossing: Dictionary = _map_def.get("crossing", {})
	if not crossing.is_empty() and at_crossing_edge(String(crossing.get("edge", ""))):
		return {"crossing": crossing}
	return {"landable": can_land()}


## Move the people who move, and turn the ones the party walks up to.
##
## Deliberately *not* part of `update`. That function is the simulation the harness drives
## step for step against the reference's own `_updatePlayer`, and an NPC's collider travels
## with the NPC — so wandering inside it would change what the party can walk through halfway
## through a scripted walk and make every comparison meaningless. Thirty-one villagers wander;
## none of them decides anything.
##
## The clock comes from the `fx` stream for the same reason: it is seeded from the wall clock
## and never saved, because where a villager happens to be standing is not part of the game's
## state.
func update_npcs(dt: float) -> void:
	for npc in npcs:
		var def: Dictionary = npc["def"]
		var radius := float(def.get("wander", 0.0))
		if radius > 0.0:
			npc["wander_timer"] = float(npc.get("wander_timer", 0.0)) - dt
			if float(npc["wander_timer"]) <= 0.0:
				npc["wander_timer"] = 2.0 + RngStreams.fx.float_range(0.0, 4.0)
				var reach := radius * _tile
				npc["target_x"] = float(npc["home_x"]) + RngStreams.fx.float_range(-reach, reach)
				npc["target_z"] = float(npc["home_z"]) + RngStreams.fx.float_range(-reach, reach)
			if npc.has("target_x"):
				var dx := float(npc["target_x"]) - float(npc["x"])
				var dz := float(npc["target_z"]) - float(npc["z"])
				var distance := sqrt(dx * dx + dz * dz)
				if distance > 0.2:
					var step := minf(distance, NPC_SPEED * dt)
					var to := grid.resolve(float(npc["x"]), float(npc["z"]),
						float(npc["x"]) + dx / distance * step,
						float(npc["z"]) + dz / distance * step, 0.4)
					npc["x"] = to[0]
					npc["z"] = to[1]
					# The collider goes with them, or a villager blocks themselves.
					var shape: Dictionary = npc["shape"]
					shape["x"] = npc["x"]
					shape["z"] = npc["z"]
					npc["facing"] = atan2(dx, dz)
					npc["speed"] = step / maxf(dt, 1e-5)
				else:
					npc["speed"] = 0.0
		# Turning to look at somebody who has come close is most of what makes a village feel
		# inhabited, and it costs one angle.
		if bool(def.get("facePlayer", true)) and float(npc.get("speed", 0.0)) < 0.1:
			var to_player := sqrt(pow(player.x - float(npc["x"]), 2.0)
				+ pow(player.z - float(npc["z"]), 2.0))
			if to_player < 2.6:
				npc["facing"] = atan2(player.x - float(npc["x"]), player.z - float(npc["z"]))


## The flag that spends a `once` trigger.
##
## Keyed on the map and the event rather than on the trigger object, because it has to
## survive a save and a re-entry — and it is armed *after* the scene finishes, so a
## player who flees the fight or closes the tab has not silently spent the content.
func trigger_key(trigger: Dictionary) -> String:
	var data: Dictionary = trigger.get("data", {})
	if not bool(data.get("once", false)):
		return ""
	var name := String(data.get("event", ""))
	if name.is_empty():
		name = "%d,%d" % [int(trigger.get("x", 0)), int(trigger.get("z", 0))]
	return "trigger:%s:%s" % [String(_map_def.get("id", "?")), name]


## Is the party standing somewhere legal? Diagnostic, and the thing the never-trap
## rule in `resolve` exists to survive.
func standing_clear() -> bool:
	return grid.is_clear(player.x, player.z, PLAYER_RADIUS)
