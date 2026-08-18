class_name RngStreams
extends RefCounted
##
## The named global streams, with the reference build's seeds.
##
## Separate streams so combat variance is independent of everything else: if the
## same generator fed both damage rolls and screen-shake jitter, turning off a
## visual effect would change the outcome of a fight, and a replay from a save
## would diverge for a cosmetic reason.
##
## `fx` is seeded from the clock and never saved — it exists to make sparks look
## different each time, and including it in a save would make cosmetic noise part
## of the game state.

static var battle := RNG.new(0x51a3c7)
static var encounter := RNG.new(0x9d2f11)
static var loot := RNG.new(0x7c40b3)
static var world := RNG.new(0x33ba9e)
static var fx := RNG.new(int(Time.get_unix_time_from_system()) & 0x7fffffff)

## The streams that belong in a save. `fx` is not one of them.
const SAVED := ["battle", "encounter", "loot", "world"]


static func stream(name: String) -> RNG:
	match name:
		"battle": return battle
		"encounter": return encounter
		"loot": return loot
		"world": return world
		"fx": return fx
	push_error("no rng stream named %s" % name)
	return null


static func serialize() -> Dictionary:
	var out := {}
	for name in SAVED:
		out[name] = stream(name).get_state()
	return out


static func deserialize(data: Dictionary) -> void:
	if data.is_empty():
		return
	for name in SAVED:
		if data.has(name):
			stream(name).set_state(data[name])
