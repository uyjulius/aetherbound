class_name Palette
extends RefCounted
##
## The master palette, read from the exported table.
##
## Every texture in the game — the AI-generated material plates included — is
## quantised into this palette before it ships, which is what makes assets from
## different sources read as one artist's hand rather than a pile of unrelated
## images. Ramps are five steps darkest to lightest and are *hue-shifted*:
## shadows lean cool, highlights lean warm. Flat value-only ramps are the
## tell-tale of machine art.
##
## Nothing here is authored. The values come from `src/engine/palette.js` through
## `tools/to-godot.mjs`, and `tools/glue-parity.mjs` compares every one of them —
## including the blends `ramp_hex` produces, which is where a rounding difference
## would hide.

## Ramp name → five hex strings.
static var ramps: Dictionary = {}
## UI chrome colours by role, and element signature colours.
static var ui: Dictionary = {}
static var element: Dictionary = {}
## The darkest and lightest values in the game. No pure black, no pure white.
static var ink := "#14121b"
static var paper := "#efe8db"

static var _loaded := false


## Take the palette from a loaded `Database`.
static func adopt(data: Dictionary) -> bool:
	if data.is_empty():
		push_error("no palette table — run `node tools/to-godot.mjs`")
		return false
	ramps = data.get("ramps", {})
	ui = data.get("ui", {})
	element = data.get("element", {})
	ink = String(data.get("ink", ink))
	paper = String(data.get("paper", paper))
	_loaded = not ramps.is_empty()
	return _loaded


static func is_loaded() -> bool:
	return _loaded


## `#rrggbb` → three 0..255 components.
static func hex_to_rgb(hex: String) -> Array:
	var h := hex.replace("#", "")
	return [
		h.substr(0, 2).hex_to_int(),
		h.substr(2, 2).hex_to_int(),
		h.substr(4, 2).hex_to_int(),
	]


## Three components → `#rrggbb`.
##
## Rounds and clamps exactly as the reference does. `round()` here matches
## JavaScript's `Math.round` because every value is non-negative — the two
## disagree only on negative halves, which a colour channel never is.
static func rgb_to_hex(r: float, g: float, b: float) -> String:
	return "#%02x%02x%02x" % [
		clampi(int(round(r)), 0, 255),
		clampi(int(round(g)), 0, 255),
		clampi(int(round(b)), 0, 255),
	]


## Sample a ramp with a continuous 0..1 parameter, blending between steps.
##
## Returns the hex string rather than a `Color` so it can be compared against the
## reference character for character; `ramp_at` gives the same thing as a Color.
static func ramp_hex(name: String, t: float) -> String:
	var ramp: Array = ramps.get(name, [])
	if ramp.is_empty():
		push_error("unknown ramp: %s" % name)
		return ink
	var x := clampf(t, 0.0, 1.0) * float(ramp.size() - 1)
	var i := int(floor(x))
	var f := x - float(i)
	if i >= ramp.size() - 1:
		return String(ramp[ramp.size() - 1])
	var a := hex_to_rgb(String(ramp[i]))
	var b := hex_to_rgb(String(ramp[i + 1]))
	return rgb_to_hex(
		float(a[0]) + float(b[0] - a[0]) * f,
		float(a[1]) + float(b[1] - a[1]) * f,
		float(a[2]) + float(b[2] - a[2]) * f)


static func ramp_at(name: String, t: float) -> Color:
	return Color(ramp_hex(name, t))


## Every colour in the palette, flat. This is the quantisation target the
## texture pipeline aims at, and its order matches the reference's.
static func flat() -> PackedStringArray:
	var out := PackedStringArray()
	for name in ramps.keys():
		for step in ramps[name]:
			out.append(String(step))
	out.append(ink)
	out.append(paper)
	return out


static func ui_color(role: String) -> Color:
	return Color(String(ui.get(role, paper)))


static func element_color(name: String) -> Color:
	return Color(String(element.get(name, paper)))
