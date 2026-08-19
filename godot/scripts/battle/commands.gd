class_name Commands
extends RefCounted
##
## The fourteen per-character commands, read from the exported table.
##
## Every character's second command is the reason to bring them, and the numbers on
## the options are balance decisions rather than flavour. They cross as data —
## `src/battle/commands.js` through `tools/to-godot.mjs` — so this file is lookup
## and level gating and nothing else. `tools/commands-parity.mjs` compares the
## option lists at every level, and the weighted pick, against the reference.

static var table: Dictionary = {}


static func adopt(data: Dictionary) -> bool:
	table = data
	return not table.is_empty()


static func spec(command: String) -> Dictionary:
	return table.get(command, {})


static func label(command: String) -> String:
	return String(spec(command).get("label", command))


static func kind(command: String) -> String:
	return String(spec(command).get("kind", ""))


## The moves a character can actually pick at this level.
##
## The gate is the level step at which the next entry unlocks: with a gate of 8 the
## second arrives at level 9 and the third at 17, which is why a low-level Bastian
## has one Blitz and an endgame one has three. Read straight from the table instead
## and a level-2 character is offered an endgame strike.
static func moves_for(command: String, level: int) -> Array:
	var entry := spec(command)
	var moves: Array = entry.get("moves", [])
	if moves.is_empty():
		return []
	var gate := int(entry.get("gate", 0))
	if gate == 0:
		return moves.duplicate()
	var out: Array = []
	for i in moves.size():
		if level >= 1 + i * gate:
			out.append(moves[i])
	return out


## Osric's gamble. Weighted so the good outcomes are common and the great one is
## not — he is not lucky, he is committed.
static func roll_outcome(command: String, stream: RNG) -> Dictionary:
	var outcomes: Array = spec(command).get("outcomes", [])
	if outcomes.is_empty():
		return {}
	var entries: Array = []
	for outcome in outcomes:
		entries.append([float(outcome.get("weight", 1)), outcome])
	var chosen: Variant = stream.weighted(entries)
	return chosen if chosen is Dictionary else {}


## Rusk's tiers, with the health each costs this character. Priced off *max* HP:
## off current it was a fraction of a shrinking number floored at one, so at 1 HP
## the biggest tier cost a point and left him on a point — a free power-7.5 strike
## every turn, for ever.
static func overclock_tiers(max_hp: int) -> Array:
	var out: Array = []
	for tier in spec("overclock").get("tiers", []):
		out.append({
			"label": String(tier.get("label", "")),
			"cost": float(tier.get("cost", 0)),
			"power": float(tier.get("power", 0)),
			"hp": int(floor(float(max_hp) * float(tier.get("cost", 0)))),
		})
	return out
