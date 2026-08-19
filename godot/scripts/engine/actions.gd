class_name Actions
extends RefCounted
##
## Builds Godot's InputMap from the exported bindings.
##
## The whole game only ever asks "is CONFIRM pressed this frame?", never about
## raw keys, so remapping and gamepad support come for free — but only if both
## engines agree on what CONFIRM is. The bindings therefore live in one place,
## `src/engine/input.js`, and arrive here as data. A hand-kept `[input]` block in
## `project.godot` would drift the first time a key moved, and the control bar
## along the bottom of the screen *is* the game's statement of what the controls
## are.
##
## Two mappings cannot be data, because they are engine vocabulary rather than
## game content, and both are traps:
##
## - `KeyboardEvent.code` strings are not Godot key names. Most are mechanical
##   (`KeyW` → `W`, `ArrowUp` → `Up`), the rest are listed below, and anything
##   unresolved is an error at boot rather than a binding that quietly does
##   nothing.
## - **W3C standard gamepad indices are not Godot `JoyButton` values.** The web
##   spec puts the shoulders at 4 and 5; Godot's enum puts them at 9 and 10,
##   where the web spec has Back and Guide. Reusing the numbers gives a
##   controller whose shoulder buttons open the menu — and since the shoulders
##   are how you flee a battle, it would be found in a fight. They are mapped by
##   meaning here, not by number.

## `KeyboardEvent.code` values that are not `Key*`, `Arrow*` or `Digit*`.
##
## `ShiftLeft` and `ShiftRight` both become `Shift`: Godot's keycodes do not
## distinguish the two, so the reference's separate bindings collapse into one.
## That is a real difference and not a bug — it means `run` and `special` share a
## key exactly as they already do in the browser.
const SPECIAL_KEYS := {
	"ShiftLeft": "Shift", "ShiftRight": "Shift",
	"BracketLeft": "BracketLeft", "BracketRight": "BracketRight",
	"Escape": "Escape", "Enter": "Enter", "Space": "Space",
	"Backspace": "Backspace", "Tab": "Tab",
}

## W3C standard gamepad index → Godot `JoyButton`.
const PAD_BUTTONS := {
	0: JOY_BUTTON_A, 1: JOY_BUTTON_B, 2: JOY_BUTTON_X, 3: JOY_BUTTON_Y,
	4: JOY_BUTTON_LEFT_SHOULDER, 5: JOY_BUTTON_RIGHT_SHOULDER,
	8: JOY_BUTTON_BACK, 9: JOY_BUTTON_START,
	10: JOY_BUTTON_LEFT_STICK, 11: JOY_BUTTON_RIGHT_STICK,
	12: JOY_BUTTON_DPAD_UP, 13: JOY_BUTTON_DPAD_DOWN,
	14: JOY_BUTTON_DPAD_LEFT, 15: JOY_BUTTON_DPAD_RIGHT,
}

## Indices 6 and 7 are the triggers, which the web spec reports as buttons and
## Godot reports as axes. The reference binds `run` to them, so they become
## motion events rather than being dropped.
const PAD_AXES := {
	6: JOY_AXIS_TRIGGER_LEFT,
	7: JOY_AXIS_TRIGGER_RIGHT,
}

const TRIGGER_THRESHOLD := 0.5


## Install every action, replacing whatever was there.
##
## Returns a report of what each action actually resolved to — which is what
## `tools/glue-parity.mjs` compares, because a binding that fails to resolve is
## otherwise indistinguishable from a control nobody has tried yet.
static func build(data: Dictionary) -> Dictionary:
	var actions: Array = data.get("actions", [])
	var keyboard: Dictionary = data.get("keyboard", {})
	var pad: Dictionary = data.get("pad", {})
	if actions.is_empty():
		push_error("no input table — run `node tools/to-godot.mjs`")
		return {}

	var report := {}
	for raw_name in actions:
		var action := String(raw_name)
		if InputMap.has_action(action):
			InputMap.erase_action(action)
		InputMap.add_action(action)

		var keys := PackedStringArray()
		for code in keyboard.get(action, []):
			var keycode := _keycode(String(code))
			if keycode == KEY_NONE:
				push_error("input: no Godot key for `%s` (action %s)" % [code, action])
				continue
			# Physical, because `KeyboardEvent.code` is physical: W is where W
			# sits on the keyboard, whatever the layout says it types.
			var event := InputEventKey.new()
			event.physical_keycode = keycode
			InputMap.action_add_event(action, event)
			var label := OS.get_keycode_string(keycode)
			if not keys.has(label):
				keys.append(label)

		var buttons := PackedInt32Array()
		var axes := PackedInt32Array()
		for raw_index in pad.get(action, []):
			var index := int(raw_index)
			if PAD_BUTTONS.has(index):
				var button := InputEventJoypadButton.new()
				button.button_index = PAD_BUTTONS[index]
				InputMap.action_add_event(action, button)
				buttons.append(PAD_BUTTONS[index])
			elif PAD_AXES.has(index):
				var motion := InputEventJoypadMotion.new()
				motion.axis = PAD_AXES[index]
				motion.axis_value = 1.0
				InputMap.action_add_event(action, motion)
				axes.append(PAD_AXES[index])
			else:
				push_error("input: no Godot mapping for pad index %d (action %s)" % [index, action])

		report[action] = {"keys": keys, "buttons": buttons, "axes": axes}

	# Deadzones: the reference treats a stick past 0.45 as a d-pad press, and the
	# triggers as buttons past half travel.
	for action in report:
		InputMap.action_set_deadzone(action, TRIGGER_THRESHOLD if not report[action]["axes"].is_empty() else 0.45)
	return report


## `KeyboardEvent.code` → Godot keycode, or `KEY_NONE` if it does not resolve.
static func _keycode(code: String) -> int:
	var name := code
	if code.begins_with("Key"):
		name = code.substr(3)
	elif code.begins_with("Arrow"):
		name = code.substr(5)
	elif code.begins_with("Digit"):
		name = code.substr(5)
	elif SPECIAL_KEYS.has(code):
		name = SPECIAL_KEYS[code]
	return OS.find_keycode_from_string(name)


# ---------------------------------------------------------------------------
# The surface the game asks about
# ---------------------------------------------------------------------------

static func is_down(action: String) -> bool:
	return Input.is_action_pressed(action)


static func just_pressed(action: String) -> bool:
	return Input.is_action_just_pressed(action)


static func just_released(action: String) -> bool:
	return Input.is_action_just_released(action)


## Movement on screen, before the camera rotates it.
##
## Y is *down*-positive, matching the reference's `moveVector`, because the field's
## `transform_input` is written for `iy = -1` meaning screen-up. Flipping this sign
## inverts forward and back at every camera bearing — and it inverts them
## consistently, which is the kind of wrong that looks like a deliberate choice.
static func move_vector() -> Vector2:
	return Input.get_vector("left", "right", "up", "down")


## For the on-screen control bar: a tap the rest of the game cannot tell from a real key
## press.
##
## Through `parse_input_event` rather than `action_press`, and the difference matters. The
## latter sets the action's *state*, which is enough for anything that polls — walking, holding
## run — and invisible to anything that counts events. Three screens in this port count events
## on purpose, because a polled press is lost when the frame it arrived in belonged to somebody
## else: the dialogue box, the list screens and the battle menu. A tap has to reach those too,
## so it is delivered as an event and the state follows from it.
static func virtual_press(action: String) -> void:
	var event := InputEventAction.new()
	event.action = action
	event.pressed = true
	Input.parse_input_event(event)


static func virtual_release(action: String) -> void:
	var event := InputEventAction.new()
	event.action = action
	event.pressed = false
	Input.parse_input_event(event)
