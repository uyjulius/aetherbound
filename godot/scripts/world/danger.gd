class_name Danger
extends RefCounted
##
## How dangerous the place through a door is.
##
## Not one exit in this game is gated on a story flag, and that is on purpose — it is an
## open world, and a locked door on the road is the opposite of one. But open has to mean
## *informed*. The Pilgrim's Rest gate is a few steps from the Harrowmere road, and the
## moment the party walks through it they are standing in a zone written for level 68.
## Nothing anywhere said so, so the only feedback the world gave for going the wrong way
## was dying.
##
## So the door reads the room, exactly as the reference's `danger.js` does. What the
## signpost shows is the level of whatever is standing where the party will *arrive* — not
## the worst thing in the map, because the pilgrim road is fifty tiles long and the hard
## end of it is a journey away, and reporting the maximum would make every long map look
## like an ambush.


## Cache, since this walks encounter tables and maps never change at runtime.
##
## Keyed by map id and spawn, as the reference keys it — which means the cataclysm's
## rewritten maps share an entry with the maps they replace. That is not an oversight
## carried across blindly: the reference reads danger from `mapDefinition`, which hands
## back the *unresolved* map, so both sides are reading the pre-cataclysm encounter tables
## and both sides agree. A ruin that wants its own warning would need the resolver on both
## sides of the port, not a wider cache key here.
static var _cache: Dictionary = {}


## Mean level of everything a table can field.
##
## Unweighted: a group that comes up one time in twenty counts for as much as the common
## one, and a group of three counts three times. That is the reference's arithmetic and it
## is defensible on its own — the question a signpost answers is "what lives here", not
## "what will I probably meet first".
static func table_level(name: String, encounters: Dictionary, enemies: Dictionary) -> float:
	var table: Dictionary = encounters.get(name, {})
	return mean_level(table.get("groups", []), enemies)


## Mean level over a list of encounter groups. Named enemies that are not in the table are
## skipped rather than counted as level 0, which is the reference's behaviour and the only
## safe one: a typo in a group would otherwise drag a whole zone's warning down.
static func mean_level(groups: Array, enemies: Dictionary) -> float:
	var total := 0.0
	var count := 0
	for group in groups:
		for id in group.get("enemies", []):
			var enemy: Dictionary = enemies.get(String(id), {})
			if enemy.is_empty():
				continue
			total += float(enemy.get("level", 0))
			count += 1
	return total / float(count) if count > 0 else 0.0


## The level of the encounters waiting at a map's arrival point.
##
## Returns 0 for anywhere with no encounters at all — a town, an inn, a shop — which is
## exactly right: those doors need no warning.
static func level_of(map_def: Dictionary, spawn_name: String,
		encounters: Dictionary, enemies: Dictionary) -> float:
	if map_def.is_empty():
		return 0.0
	var key := "%s:%s" % [String(map_def.get("id", "")), spawn_name]
	if _cache.has(key):
		return float(_cache[key])

	var spawns: Dictionary = map_def.get("spawns", {})
	var spawn: Dictionary = {}
	if spawn_name != "" and spawns.has(spawn_name):
		spawn = spawns[spawn_name]
	elif spawns.has("world"):
		spawn = spawns["world"]
	elif spawns.has("default"):
		spawn = spawns["default"]

	var level := 0.0
	var zones: Array = map_def.get("encounterZones", [])
	if not spawn.is_empty() and not zones.is_empty():
		var at: Array = spawn.get("at", [0, 0])
		var sx := float(at[0])
		var sz := float(at[1])
		for zone in zones:
			var rect: Array = zone.get("rect", [])
			if rect.size() < 4:
				continue
			var x := float(rect[0])
			var y := float(rect[1])
			if sx >= x and sx < x + float(rect[2]) and sz >= y and sz < y + float(rect[3]):
				level = table_level(String(zone.get("table", "")), encounters, enemies)
				break

	# No zone covers the arrival tile, so the map's own table is what rolls.
	if level == 0.0:
		var own: Dictionary = map_def.get("encounters", {})
		level = mean_level(own.get("groups", []), enemies)

	_cache[key] = level
	return level


## What to say about it, given who is standing at the door.
##
## Three bands, and deliberately no numbers: a party that has never seen a level readout on
## an enemy should not be handed one on a signpost. The words are the ones a person at the
## roadside would use. An empty dictionary means the door needs no warning — either there is
## nothing through it or the party can handle what is.
static func note(destination_level: float, party_level: float) -> Dictionary:
	if destination_level == 0.0:
		return {}
	var gap := destination_level - party_level
	if gap >= 22.0:
		return {"text": "nobody comes back from there", "tone": "grave"}
	if gap >= 12.0:
		return {"text": "well past what you can handle", "tone": "bad"}
	if gap >= 5.0:
		return {"text": "harder than the road behind you", "tone": "warn"}
	return {}
