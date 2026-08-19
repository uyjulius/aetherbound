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
##     AETHERBOUND_READY cast=14 tables=15 actions=12 renderer=gl_compatibility
##
## `tools/web-smoke.mjs` waits for exactly that and fails without it. A page that
## loads is not a game that runs — a Godot build which cannot find its resources
## still serves HTML and still paints a canvas.

# Colours come from the palette rather than from four numbers typed here. The
# palette is the reason assets from different sources read as one hand, and a
# title screen that opts out of it is the first place the game stops being one
# object.
var _ink := Color(0.07, 0.07, 0.09)
var _paper := Color.WHITE
var _select := Color.YELLOW
var _muted := Color.GRAY
## The newest save, or `{}` when there is nothing to continue.
var _saved: Dictionary = {}
var _choices: VBoxContainer
var _choice := 0


func _ready() -> void:
	var database := Database.new()
	if not database.load_all():
		_fail("the data tables did not load — the export is missing res://data")
		return

	var cast: Array = database.cast_order
	if cast.is_empty():
		_fail("cast_order is empty, so the tables loaded but carry nothing")
		return

	if not Palette.adopt(database.palette):
		_fail("the palette table is missing")
		return
	_ink = Color(Palette.ink)
	_paper = Palette.ui_color("text")
	_select = Palette.ui_color("select")
	_muted = Palette.ui_color("textDim")

	# Installed here rather than at first use: an action queried before the map is
	# built reads as "not pressed" forever, which is indistinguishable from a
	# player who is not touching the controls.
	var bindings: Dictionary = Actions.build(database.input)

	_build(database, cast)
	# The prelude, at the reference's own fade. The audio node parents itself to the tree
	# root, so this keeps playing across the change of scene into the field.
	Sound.play_music("prelude", 1.6)

	# The readiness line. Deliberately one line, machine-first, with the counts
	# in it: a smoke test that only waits for "ready" cannot tell a full export
	# from a hollow one.
	print("AETHERBOUND_READY cast=%d tables=%d actions=%d renderer=%s" % [
		cast.size(), Database.TABLES.size(), bindings.size(),
		RenderingServer.get_current_rendering_method()])

	# The instrumentation the JS build has always sent, from the build that now holds the
	# root. Off outside a browser and off under Playwright, so this line does nothing at all
	# in the checks that run it sixty times a night.
	Telemetry.start("godot", database.analytics)
	Telemetry.register({"renderer": RenderingServer.get_current_rendering_method()})
	Telemetry.track(Telemetry.APP_LOADED, {
		"cast": cast.size(), "tables": Database.TABLES.size(), "actions": bindings.size()})
	Telemetry.track(Telemetry.TITLE_VIEWED, {"has_save": not _saved.is_empty()})
	# Said out loud, because "off" is the state that has to be provable: the browser check
	# insists this reads `automated browser`, and a build that started reporting from the test
	# suite would be caught by the same line that proves the module loaded at all.
	var telemetry := Telemetry.summary()
	print("ANALYTICS enabled=%s reason=%s events=%d" % [
		str(bool(telemetry["enabled"])).to_lower(), String(telemetry["reason"]),
		Dictionary(telemetry["events"]).size()])


## Build the screen. Written in code rather than laid out in the editor because
## the cast is data: the column has as many rows as the tables say it does, and
## a fifteenth character would appear here without anyone editing a scene.
func _process(_delta: float) -> void:
	if Actions.just_pressed("down") or Actions.just_pressed("up"):
		_choice = 1 - _choice
		Sound.sfx("cursor")
		_paint_choices()
	if Actions.just_pressed("confirm"):
		Sound.sfx("confirm")
		if _choice == 1 and not _saved.is_empty():
			# The party as they were left, not a new one. Handed over rather than loaded
			# here: the field owns the world and this screen is about to stop existing.
			Saves.pending = _saved
			print("TITLE_CONTINUE map=%s lv=%d" % [String(_saved.get("mapId", "?")),
				int(_saved.get("leadLevel", 0))])
			Telemetry.track(Telemetry.GAME_LOADED, {
				"map": String(_saved.get("mapId", "")),
				"lead_level": int(_saved.get("leadLevel", 0)),
				"play_seconds": float(_saved.get("playTime", 0.0)),
				"from": "title"})
		else:
			Saves.pending = {}
			print("TITLE_NEW_GAME")
			Telemetry.track(Telemetry.GAME_STARTED, {})
		get_tree().change_scene_to_file("res://scenes/field_debug.tscn")


func _build(database: Database, cast: Array) -> void:
	var ground := ColorRect.new()
	ground.color = _ink
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

	column.add_child(_label("AETHERBOUND", 96, _paper))
	column.add_child(_label(
		"A 3D turn-based RPG in the Final Fantasy VI tradition", 30, _muted))
	column.add_child(_spacer(40))
	column.add_child(_label("THE CAST", 22, _select))
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

	# New Game or Continue. Continue is offered only when there is something to
	# continue, and says what it would open — a Continue that silently starts a new
	# campaign is the most alarming button a game can have.
	_saved = Saves.latest()
	_choices = VBoxContainer.new()
	_choices.add_theme_constant_override("separation", 8)
	column.add_child(_choices)
	for _i in 2:
		_choices.add_child(_label("", 30, _paper))
	_paint_choices()
	var written := 0
	for slot in Saves.list():
		if not slot.is_empty():
			written += 1
	print("TITLE_READY saves=%d continue=%s" % [
		written, "yes" if not _saved.is_empty() else "no"])

	column.add_child(_spacer(16))
	column.add_child(_label("move to choose · confirm to begin", 20, _muted))
	# The web build is still here, and still the reference every number in this one is
	# checked against. Saying where it went costs a line and saves somebody a search.
	column.add_child(_label("the original web build is at /js/", 18, _muted))


## One cast member: name in the character's own accent colour, role beside it.
## The colour comes from the same `look.colors` the reference build tints
## portraits with, so this screen is already showing art direction rather than
## inventing its own.
func _cast_row(character: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)

	var accent := _paper
	var look: Dictionary = character.get("look", {})
	var colors: Dictionary = look.get("colors", {}) if look is Dictionary else {}
	if colors.has("accent"):
		accent = Color(String(colors["accent"]))

	var swatch := ColorRect.new()
	swatch.color = accent
	swatch.custom_minimum_size = Vector2(6, 26)
	row.add_child(swatch)

	var name_label := _label(String(character.get("name", "?")), 28, _paper)
	name_label.custom_minimum_size = Vector2(220, 0)
	row.add_child(name_label)
	row.add_child(_label(String(character.get("role", "")), 24, _muted))
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
	ground.color = _ink
	ground.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(ground)
	var label := _label("AETHERBOUND — %s" % reason, 28, Color(0.85, 0.35, 0.30))
	label.set_anchors_preset(Control.PRESET_CENTER)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	add_child(label)


## The two rows, and what Continue would open.
func _paint_choices() -> void:
	if _choices == null:
		return
	var summary := ""
	if not _saved.is_empty():
		var party: Dictionary = _saved.get("party", {})
		summary = "  —  %s, Lv %d, %s, %d gil" % [
			String(_saved.get("locationName", "somewhere")),
			int(_saved.get("leadLevel", 1)),
			Saves.format_time(float(party.get("playTime", 0.0))),
			int(party.get("gold", 0))]
	var labels := ["New Game",
		("Continue%s" % summary) if not _saved.is_empty() else "Continue  —  no save found"]
	# Continue cannot be chosen when there is nothing behind it, so the cursor never
	# rests there.
	if _saved.is_empty():
		_choice = 0
	for i in _choices.get_child_count():
		var row: Label = _choices.get_child(i)
		row.text = "%s %s" % [">" if i == _choice else " ", labels[i]]
		var colour := _paper
		if i == 1 and _saved.is_empty():
			colour = _muted
		elif i == _choice:
			colour = _select
		row.add_theme_color_override("font_color", colour)
