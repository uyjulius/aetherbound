extends SceneTree
##
## Walks the ported RNG through a fixed script of draws and prints one JSON blob.
## `../../tools/rng-parity.mjs` runs the identical script through the JavaScript
## reference and fails on any disagreement.
##
##   godot --headless --path godot --script res://tools/rng_probe.gd
##
## The script is deliberately in a fixed order and consumes draws from a single
## stream per seed, because that is the property under test: not "does it produce
## plausible numbers" but "does it produce *these* numbers, in this order, after
## this exact sequence of calls". Any reordering here has to be mirrored on the
## JavaScript side or the comparison is meaningless.
##
## `_initialize`, not `_init`: the latter runs before the tree exists, so `quit()`
## there is ignored and headless Godot hangs with no output.

const R := preload("res://scripts/engine/rng.gd")

const SEEDS := [0, 1, 0x2f6e2b1, 0x51a3c7, 0x9d2f11, 0x7c40b3, 0x33ba9e, 4294967295, 123456789]
const INT_MODULI := [1, 2, 3, 5, 6, 7, 10, 16, 100, 256, 1000]
const RANGES := [[0, 0], [1, 6], [-4, 4], [10, 99]]
const FLOAT_RANGES := [[0.0, 1.0], [-3.5, 2.25], [10.0, 10.0], [1.0, 1000.0]]
const CHANCE256 := [0, 1, 64, 128, 255, 256]
const CHANCES := [0.0, 0.25, 0.5, 0.75, 1.0]
const PICK_FROM := ["a", "b", "c", "d", "e"]


func _initialize() -> void:
	var runs: Array = []
	for seed_value in SEEDS:
		runs.append(_walk(seed_value))
	print(JSON.stringify({"runs": runs}))
	quit()


func _walk(seed_value: int) -> Dictionary:
	# Inferred rather than annotated `RNG`: a `--script` run does not rescan the
	# filesystem, so a freshly added `class_name` is unknown until something has
	# imported the project. A probe that only parses after an import is a probe
	# that fails confusingly on a clean checkout.
	var r := R.new(seed_value)
	var out := {"seed": seed_value, "state": r.get_state()}

	var draws: Array = []
	for _i in 32:
		draws.append(r.u32())
	out["u32"] = draws

	var float_ranges: Array = []
	for pair in FLOAT_RANGES:
		float_ranges.append(snappedf(r.float_range(pair[0], pair[1]), 0.000001))
	out["float_range"] = float_ranges

	var ints: Array = []
	for n in INT_MODULI:
		for _i in 3:
			ints.append(r.int_below(n))
	out["int_below"] = ints

	var ranges: Array = []
	for pair in RANGES:
		for _i in 3:
			ranges.append(r.int_range(pair[0], pair[1]))
	out["int_range"] = ranges

	var rolls: Array = []
	for n in CHANCE256:
		for _i in 3:
			rolls.append(r.chance256(n))
	out["chance256"] = rolls

	var chances: Array = []
	for p in CHANCES:
		for _i in 3:
			chances.append(r.chance(p))
	out["chance"] = chances

	var picks: Array = []
	for _i in 6:
		picks.append(r.pick(PICK_FROM))
	out["pick"] = picks

	# Both entry shapes the reference accepts, because they take different
	# branches through the same float accumulation.
	var pairs: Array = []
	for _i in 6:
		pairs.append(r.weighted([[1, "one"], [3, "three"], [0.5, "half"], [7, "seven"]]))
	out["weighted_pairs"] = pairs

	var dicts: Array = []
	for _i in 6:
		var chosen: Dictionary = r.weighted([
			{"weight": 2, "id": "a"}, {"weight": 5, "id": "b"}, {"weight": 0.25, "id": "c"},
		])
		dicts.append(chosen["id"])
	out["weighted_dicts"] = dicts

	var shuffles: Array = []
	for _i in 3:
		var deck: Array = []
		for k in 12:
			deck.append(k)
		shuffles.append(r.shuffle(deck))
	out["shuffle"] = shuffles

	# Save, draw, restore, draw again. The two runs must match each other as well
	# as the reference — a state round trip that loses a word looks like a working
	# RNG until a save is reloaded mid-battle.
	var saved: Array = r.get_state()
	var after_save: Array = []
	for _i in 5:
		after_save.append(r.u32())
	r.set_state(saved)
	var after_restore: Array = []
	for _i in 5:
		after_restore.append(r.u32())
	# And again from the *signed* form of the same state, which is what a save
	# written by the reference build actually contains: JavaScript's bitwise
	# operators return int32, so most of the xoshiro state comes back negative.
	# The port has to read that and produce the same stream, or every save made
	# in the browser is unreadable here.
	var signed_state: Array = []
	for word in saved:
		signed_state.append(word - 4294967296 if word > 0x7fffffff else word)
	r.set_state(signed_state)
	var after_signed: Array = []
	for _i in 5:
		after_signed.append(r.u32())

	out["saved_state"] = saved
	out["after_save"] = after_save
	out["after_restore"] = after_restore
	out["after_signed_restore"] = after_signed
	return out
