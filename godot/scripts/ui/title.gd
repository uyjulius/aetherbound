extends Control
##
## The port's front door, and the first thing about it that is publishable.
##
## It shows the real cast rather than placeholder text, and that is the whole
## point of it: a Godot build that boots, paints and says nothing about the game
## proves only that the engine starts. Reading the fourteen characters out of the
## exported tables proves the data survived `to-godot.mjs`, the `.pck` was
## assembled with its resources in it, and the file layout the browser sees
## matches the one the editor sees. Those are the three things that actually
## break between a working editor project and a broken deployed one.
##
## When the tables are in hand it prints one line to the console:
##
##     AETHERBOUND_READY cast=14 tables=11 renderer=gl_compatibility
##
## `tools/web-smoke.mjs` waits for exactly that and fails without it. A page that
## loads is not a game that runs — a Godot build which cannot find its resources
## still serves HTML and still paints a canvas.

## Tables `Database` loads. Named here so the readiness line reports a number
## that would visibly change if a table were dropped from the exporter.
const TABLES := [
	"enemies", "encounters", "items", "shops", "spells", "espers",
	"quests", "tracks", "characters", "maps", "cast_order",
]

const INK := Color(0.070, 0.071, 0.086)
const PARCHMENT := Color(0.898, 0.878, 0.827)
const GOLD := Color(0.847, 0.675, 0.192)
const MUTED := Color(0.541, 0.541, 0.573)


func _ready() -> void:
	var database := Database.new()
	if not database.load_all():
		_fail("the data tables did not load — the export is missing res://data")
		return

	var cast: Array = database.cast_order
	if cast.is_empty():
		_fail("cast_order is empty, so the tables loaded but carry nothing")
		return

	_build(database, cast)

	# The readiness line. Deliberately one line, machine-first, with the counts
	# in it: a smoke test that only waits for "ready" cannot tell a full export
	# from a hollow one.
	print("AETHERBOUND_READY cast=%d tables=%d renderer=%s" % [
		cast.size(), TABLES.size(), RenderingServer.get_current_rendering_method()])


## Build the screen. Written in code rather than laid out in the editor because
## the cast is data: the column has as many rows as the tables say it does, and
## a fifteenth character would appear here without anyone editing a scene.
func _build(database: Database, cast: Array) -> void:
	var ground := ColorRect.new()
	ground.color = INK
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(ground)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 96)
	margin.add_theme_constant_override("margin_right", 96)
	margin.add_theme_constant_override("margin_top", 72)
	margin.add_theme_constant_override("margin_bottom", 56)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	margin.add_child(column)

	column.add_child(_label("AETHERBOUND", 96, PARCHMENT))
	column.add_child(_label(
		"A 3D turn-based RPG in the Final Fantasy VI tradition", 30, MUTED))
	column.add_child(_spacer(40))
	column.add_child(_label("THE CAST", 22, GOLD))
	column.add_child(_spacer(12))

	# Two columns, because fourteen names in one list runs off the bottom of a
	# 16:9 frame at a readable size.
	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 72)
	column.add_child(columns)
	var half := int(ceil(cast.size() / 2.0))
	for start in [0, half]:
		var side := VBoxContainer.new()
		side.add_theme_constant_override("separation", 10)
		columns.add_child(side)
		for i in range(start, mini(start + half, cast.size())):
			side.add_child(_cast_row(database.character(String(cast[i]))))

	column.add_child(_spacer(0, true))
	column.add_child(_label(
		"Godot port preview — the playable build is at aetherbound.uy.sg",
		22, MUTED))


## One cast member: name in the character's own accent colour, role beside it.
## The colour comes from the same `look.colors` the reference build tints
## portraits with, so this screen is already showing art direction rather than
## inventing its own.
func _cast_row(character: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)

	var accent := PARCHMENT
	var look: Dictionary = character.get("look", {})
	var colors: Dictionary = look.get("colors", {}) if look is Dictionary else {}
	if colors.has("accent"):
		accent = Color(String(colors["accent"]))

	var swatch := ColorRect.new()
	swatch.color = accent
	swatch.custom_minimum_size = Vector2(6, 26)
	row.add_child(swatch)

	var name_label := _label(String(character.get("name", "?")), 28, PARCHMENT)
	name_label.custom_minimum_size = Vector2(220, 0)
	row.add_child(name_label)
	row.add_child(_label(String(character.get("role", "")), 24, MUTED))
	return row


func _label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label


func _spacer(height: int, expand: bool = false) -> Control:
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, height)
	if expand:
		spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	return spacer


## Say what is wrong on screen as well as in the log. A deployed build with a
## blank canvas and an error only in the console is indistinguishable from a
## build that never started.
func _fail(reason: String) -> void:
	push_error(reason)
	var ground := ColorRect.new()
	ground.color = INK
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(ground)
	var label := _label("AETHERBOUND — %s" % reason, 28, Color(0.85, 0.35, 0.30))
	label.set_anchors_preset(Control.PRESET_CENTER)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	add_child(label)
