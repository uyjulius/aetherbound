extends SceneTree
##
## Exercises the ported engine glue — palette, input bindings, easing curves and
## the scheduler — and prints one JSON blob. `../../tools/glue-parity.mjs` runs
## the same cases through the JavaScript reference and fails on any difference.
##
##   godot --headless --path godot --script res://tools/glue_probe.gd
##
## The scheduler is driven with fixed deltas rather than real frames, because its
## routines resume by signal the moment `update()` is called. That makes the
## timing behaviour testable exactly instead of approximately: "finished on the
## fifth tick of 0.1s" is an assertion, where "finished after about half a
## second" is a hope.

const Database := preload("res://scripts/data/database.gd")
const P := preload("res://scripts/engine/palette.gd")
const A := preload("res://scripts/engine/actions.gd")
const E := preload("res://scripts/engine/ease.gd")
const S := preload("res://scripts/engine/scheduler.gd")

const RAMP_SAMPLES := [0.0, 0.13, 0.25, 0.5, 0.61, 0.75, 0.99, 1.0]
const EASE_SAMPLES := [0.0, 0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 0.9, 1.0]
const HEX_ROUND_TRIP := ["#14121b", "#efe8db", "#ff7a2f", "#000000", "#ffffff", "#3fc6d6"]


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	print(JSON.stringify({
		"palette": _palette(db),
		"input": _input(db),
		"ease": _ease(),
		"scheduler": _scheduler(),
	}))
	quit()


func _palette(db) -> Dictionary:
	if not P.adopt(db.palette):
		push_error("palette did not adopt")
		return {}

	var names: Array = P.ramps.keys()
	names.sort()
	var samples := {}
	for name in names:
		var row: Array = []
		for t in RAMP_SAMPLES:
			row.append(P.ramp_hex(String(name), t))
		samples[name] = row

	var trips := {}
	for hex in HEX_ROUND_TRIP:
		var rgb: Array = P.hex_to_rgb(hex)
		trips[hex] = {"rgb": rgb, "back": P.rgb_to_hex(rgb[0], rgb[1], rgb[2])}

	# Clamping and rounding at the edges, where the two languages could disagree.
	var edges := [
		P.rgb_to_hex(-40.0, 0.4, 0.5),
		P.rgb_to_hex(255.5, 300.0, 254.5),
		P.rgb_to_hex(127.5, 128.5, 1.5),
	]

	var flat: PackedStringArray = P.flat()
	return {
		"ramp_names": names,
		"ramp_values": P.ramps,
		"samples": samples,
		"round_trips": trips,
		"edges": edges,
		"flat_size": flat.size(),
		"flat_first": flat[0],
		"flat_last": flat[flat.size() - 1],
		"ink": P.ink,
		"paper": P.paper,
		"ui": P.ui,
		"element": P.element,
	}


func _input(db) -> Dictionary:
	var report: Dictionary = A.build(db.input)
	var out := {}
	for action in report:
		var entry: Dictionary = report[action]
		# Button and axis *names*, not numbers. The whole point of the mapping is
		# that the numbers differ between the web spec and Godot, so a comparison
		# on numbers would be comparing the bug to itself.
		var buttons: Array = []
		for value in entry["buttons"]:
			buttons.append(_button_name(int(value)))
		var axes: Array = []
		for value in entry["axes"]:
			axes.append(_axis_name(int(value)))
		out[action] = {
			"keys": Array(entry["keys"]),
			"buttons": buttons,
			"axes": axes,
			"events": InputMap.action_get_events(action).size(),
			"deadzone": snappedf(InputMap.action_get_deadzone(action), 0.001),
		}
	return out


func _button_name(value: int) -> String:
	match value:
		JOY_BUTTON_A: return "A"
		JOY_BUTTON_B: return "B"
		JOY_BUTTON_X: return "X"
		JOY_BUTTON_Y: return "Y"
		JOY_BUTTON_BACK: return "Back"
		JOY_BUTTON_GUIDE: return "Guide"
		JOY_BUTTON_START: return "Start"
		JOY_BUTTON_LEFT_STICK: return "LeftStick"
		JOY_BUTTON_RIGHT_STICK: return "RightStick"
		JOY_BUTTON_LEFT_SHOULDER: return "LeftShoulder"
		JOY_BUTTON_RIGHT_SHOULDER: return "RightShoulder"
		JOY_BUTTON_DPAD_UP: return "DpadUp"
		JOY_BUTTON_DPAD_DOWN: return "DpadDown"
		JOY_BUTTON_DPAD_LEFT: return "DpadLeft"
		JOY_BUTTON_DPAD_RIGHT: return "DpadRight"
	return "button%d" % value


func _axis_name(value: int) -> String:
	match value:
		JOY_AXIS_TRIGGER_LEFT: return "LeftTrigger"
		JOY_AXIS_TRIGGER_RIGHT: return "RightTrigger"
	return "axis%d" % value


func _ease() -> Dictionary:
	var out := {}
	for name in E.BY_NAME:
		var curve: Callable = E.BY_NAME[name]
		var row: Array = []
		for t in EASE_SAMPLES:
			row.append(snappedf(float(curve.call(t)), 0.000001))
		out[name] = row
	return out


## Timing behaviour, driven by hand. Each case reports the tick on which it
## finished and what it produced, both of which are exact.
func _scheduler() -> Dictionary:
	var out := {}

	# A plain wait, in tenths.
	var sched = S.new()
	var order: Array = []
	var routine = sched.run(func(r): 
		await r.wait(0.5)
		order.append("done"), "wait")
	var finished_on := -1
	for tick in 10:
		sched.update(0.1)
		if routine.done and finished_on < 0:
			finished_on = tick + 1
	out["wait_finished_on_tick"] = finished_on

	# Two short waits against a longer tick: the overshoot has to carry, or a
	# chain of waits drifts a frame on every step.
	sched = S.new()
	var stamps: Array = []
	var carried = sched.run(func(r):
		await r.wait(0.25)
		stamps.append("first")
		await r.wait(0.25)
		stamps.append("second"), "carry")
	sched.update(0.3)
	out["carry_after_one_tick"] = stamps.duplicate()
	sched.update(0.3)
	out["carry_after_two_ticks"] = stamps.duplicate()
	out["carry_done"] = carried.done

	# Frames.
	sched = S.new()
	var framed = sched.run(func(r): await r.frames(3), "frames")
	var frames_done_on := -1
	for tick in 6:
		sched.update(0.016)
		if framed.done and frames_done_on < 0:
			frames_done_on = tick + 1
	out["frames_finished_on_tick"] = frames_done_on

	# A predicate gate.
	sched = S.new()
	var gate := {"open": false}
	var gated = sched.run(func(r): await r.until(func(): return gate["open"]), "until")
	sched.update(0.1)
	var before: bool = gated.done
	gate["open"] = true
	sched.update(0.1)
	out["until_before_open"] = before
	out["until_after_open"] = gated.done

	# A tween, sampled every tick. The last value must land exactly.
	sched = S.new()
	var values: Array = []
	sched.run(func(r):
		await r.tween(0.0, 10.0, 0.5, func(v, t): values.append(snappedf(v, 0.000001)),
			Callable(E, "linear")), "tween")
	for _tick in 6:
		sched.update(0.1)
	out["tween_values"] = values

	# Zero-length waits drain inside one tick rather than costing a frame each.
	sched = S.new()
	var drained = sched.run(func(r):
		await r.wait(0.0)
		await r.wait(0.0)
		await r.wait(0.0), "drain")
	sched.update(0.1)
	out["zero_waits_done_in_one_tick"] = drained.done

	# Time scale and pause apply to everything at once.
	sched = S.new()
	sched.time_scale = 2.0
	var fast = sched.run(func(r): await r.wait(1.0), "fast")
	var fast_on := -1
	for tick in 12:
		sched.update(0.1)
		if fast.done and fast_on < 0:
			fast_on = tick + 1
	out["time_scale_2_finished_on_tick"] = fast_on

	sched = S.new()
	sched.paused = true
	var held = sched.run(func(r): await r.wait(0.1), "paused")
	for _tick in 10:
		sched.update(0.1)
	out["paused_blocks_progress"] = not held.done
	sched.paused = false
	sched.update(0.1)
	out["unpaused_resumes"] = held.done

	# Cancellation has to stop the body, not merely mark it.
	sched = S.new()
	var steps := {"count": 0}
	var doomed = sched.run(func(r):
		while true:
			await r.wait(0.1)
			steps["count"] += 1, "doomed")
	sched.update(0.1)
	sched.update(0.1)
	var before_cancel: int = steps["count"]
	doomed.cancel()
	for _tick in 5:
		sched.update(0.1)
	out["steps_before_cancel"] = before_cancel
	out["steps_after_cancel"] = steps["count"]
	out["cancelled_flag"] = doomed.cancelled
	out["routines_left"] = sched.count()

	# cancel_tag, which is the only form the reference actually uses.
	sched = S.new()
	var tagged := {"count": 0}
	sched.run(func(r):
		while true:
			await r.wait(0.1)
			tagged["count"] += 1, "battle-action")
	sched.update(0.1)
	sched.cancel_tag("battle-action")
	sched.update(0.1)
	sched.update(0.1)
	out["cancel_tag_stops_at"] = tagged["count"]
	out["busy_after_cancel_tag"] = sched.is_busy()
	sched.cancel_all()
	return out
