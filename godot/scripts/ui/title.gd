extends Control
##
## The port's front door, and the first thing about it that is publishable.
##
## The cinematic front door still proves it is attached to the whole game. It
## loads the fourteen-character cast and every exported table before building
## the menu: a Godot build that only boots and paints proves that the engine
## starts, while this proves the data survived `to-godot.mjs`, the `.pck` kept
## its resources, and the browser sees the same file layout as the editor.
##
## When the tables are in hand it prints one line to the console:
##
##     AETHERBOUND_READY cast=14 tables=15 actions=12 renderer=gl_compatibility
##
## `tools/web-smoke.mjs` waits for exactly that and fails without it. A page that
## loads is not a game that runs — a Godot build which cannot find its resources
## still serves HTML and still paints a canvas.

const TITLE_VISTA := preload("res://assets/ui/aetherbound-title-vista.png")

# Colours come from the palette rather than from four numbers typed here. The
# palette is the reason assets from different sources read as one hand, and a
# title screen that opts out of it is the first place the game stops being one
# object.
var _ink := Color(0.07, 0.07, 0.09)
var _paper := Color.WHITE
var _select := Color.YELLOW
## The newest save, or `{}` when there is nothing to continue.
var _saved: Dictionary = {}
var _choices: VBoxContainer
var _choice := 0
var _background: TextureRect
var _aether_wash: ColorRect
var _elapsed := 0.0


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

	# Installed here rather than at first use: an action queried before the map is
	# built reads as "not pressed" forever, which is indistinguishable from a
	# player who is not touching the controls.
	var bindings: Dictionary = Actions.build(database.input)

	_build()
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


## The painted vista moves by only a few pixels while the menu remains responsive.
func _process(delta: float) -> void:
	_elapsed += delta
	# The key art barely moves: enough life for a title screen, never enough to
	# draw attention away from the menu or make the painted vista swim.
	if _background != null:
		var drift := Vector2(sin(_elapsed * 0.075) * 7.0, cos(_elapsed * 0.055) * 3.0)
		_background.position = Vector2(-24, -24) + drift
		_background.size = size + Vector2(48, 48)
	if _aether_wash != null:
		_aether_wash.color.a = 0.035 + sin(_elapsed * 0.8) * 0.012

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


## Compose the title over the generated vista. Kept in code because Continue is
## assembled from the newest save and needs to resize around its location summary.
func _build() -> void:
	clip_contents = true

	_background = TextureRect.new()
	_background.texture = TITLE_VISTA
	_background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_background.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_background)

	# Shape the generated vista around the interface. The left side carries the
	# words; the right remains open so the party, airship and broken ring stay the
	# image's focal path.
	var shade := TextureRect.new()
	shade.texture = _horizontal_shade()
	shade.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	shade.stretch_mode = TextureRect.STRETCH_SCALE
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)

	var bottom := TextureRect.new()
	bottom.texture = _bottom_shade()
	bottom.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bottom.stretch_mode = TextureRect.STRETCH_SCALE
	bottom.set_anchors_preset(Control.PRESET_FULL_RECT)
	bottom.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bottom)

	_aether_wash = ColorRect.new()
	_aether_wash.color = Color(0.28, 0.20, 0.72, 0.035)
	_aether_wash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_aether_wash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_aether_wash.material = _soft_light_material()
	add_child(_aether_wash)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 104)
	margin.add_theme_constant_override("margin_right", 104)
	margin.add_theme_constant_override("margin_top", 82)
	margin.add_theme_constant_override("margin_bottom", 58)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	margin.add_child(column)

	var overline := _label("AN ORIGINAL 3D FANTASY ROLE-PLAYING ADVENTURE", 19,
		Color(0.76, 0.81, 0.91, 0.92))
	overline.add_theme_constant_override("outline_size", 5)
	overline.add_theme_color_override("font_outline_color", Color(0.015, 0.025, 0.07, 0.75))
	column.add_child(overline)
	column.add_child(_spacer(2))

	var title := _label("AETHERBOUND", 112, Color(0.96, 0.94, 0.86))
	title.add_theme_constant_override("outline_size", 14)
	title.add_theme_color_override("font_outline_color", Color(0.018, 0.025, 0.065, 0.88))
	title.add_theme_constant_override("shadow_offset_x", 0)
	title.add_theme_constant_override("shadow_offset_y", 7)
	title.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.02, 0.62))
	column.add_child(title)

	var legend := HBoxContainer.new()
	legend.add_theme_constant_override("separation", 16)
	var rule := ColorRect.new()
	rule.color = Color(0.87, 0.68, 0.31, 0.92)
	rule.custom_minimum_size = Vector2(76, 2)
	rule.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	legend.add_child(rule)
	var legend_text := _label("THE SKY REMEMBERS", 24, Color(0.92, 0.76, 0.43))
	legend_text.add_theme_constant_override("outline_size", 5)
	legend_text.add_theme_color_override("font_outline_color", Color(0.02, 0.025, 0.06, 0.9))
	legend.add_child(legend_text)
	column.add_child(legend)

	column.add_child(_spacer(0, true))

	# New Game or Continue. Continue is offered only when there is something to
	# continue, and says what it would open — a Continue that silently starts a new
	# campaign is the most alarming button a game can have.
	_saved = Saves.latest()
	var menu_panel := PanelContainer.new()
	menu_panel.custom_minimum_size = Vector2(640, 0)
	menu_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	menu_panel.add_theme_stylebox_override("panel", _menu_style())
	column.add_child(menu_panel)
	_choices = VBoxContainer.new()
	_choices.add_theme_constant_override("separation", 12)
	menu_panel.add_child(_choices)
	for _i in 2:
		var choice_label := _label("", 29, _paper)
		choice_label.add_theme_constant_override("outline_size", 4)
		choice_label.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.02, 0.9))
		_choices.add_child(choice_label)
	_paint_choices()
	var written := 0
	for slot in Saves.list():
		if not slot.is_empty():
			written += 1
	print("TITLE_READY saves=%d continue=%s" % [
		written, "yes" if not _saved.is_empty() else "no"])

	column.add_child(_spacer(14))
	var controls := _label("↑  ↓   CHOOSE        ENTER   CONFIRM", 18,
		Color(0.78, 0.82, 0.89, 0.9))
	controls.add_theme_constant_override("outline_size", 5)
	controls.add_theme_color_override("font_outline_color", Color(0.01, 0.02, 0.05, 0.85))
	column.add_child(controls)

	var mark := _label("AETHERBOUND  ·  GODOT EDITION", 16,
		Color(0.66, 0.71, 0.81, 0.8))
	mark.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	mark.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	mark.position = Vector2(-430, -52)
	mark.size = Vector2(330, 30)
	mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(mark)


func _horizontal_shade() -> GradientTexture2D:
	var gradient := Gradient.new()
	gradient.offsets = PackedFloat32Array([0.0, 0.34, 0.67, 1.0])
	gradient.colors = PackedColorArray([
		Color(0.008, 0.014, 0.038, 0.94),
		Color(0.012, 0.022, 0.055, 0.74),
		Color(0.018, 0.025, 0.05, 0.18),
		Color(0.01, 0.015, 0.03, 0.05),
	])
	var texture := GradientTexture2D.new()
	texture.gradient = gradient
	texture.width = 1024
	texture.height = 2
	texture.fill_from = Vector2(0.0, 0.5)
	texture.fill_to = Vector2(1.0, 0.5)
	return texture


func _bottom_shade() -> GradientTexture2D:
	var gradient := Gradient.new()
	gradient.offsets = PackedFloat32Array([0.0, 0.58, 1.0])
	gradient.colors = PackedColorArray([
		Color(0.0, 0.0, 0.0, 0.0),
		Color(0.008, 0.012, 0.032, 0.12),
		Color(0.008, 0.012, 0.032, 0.82),
	])
	var texture := GradientTexture2D.new()
	texture.gradient = gradient
	texture.width = 2
	texture.height = 1024
	texture.fill_from = Vector2(0.5, 0.0)
	texture.fill_to = Vector2(0.5, 1.0)
	return texture


func _soft_light_material() -> CanvasItemMaterial:
	var material := CanvasItemMaterial.new()
	material.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	return material


func _menu_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.012, 0.02, 0.052, 0.76)
	style.border_color = Color(0.55, 0.65, 0.88, 0.55)
	style.set_border_width_all(1)
	style.border_width_left = 3
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 14
	style.corner_radius_bottom_right = 14
	style.corner_radius_bottom_left = 4
	style.content_margin_left = 24
	style.content_margin_right = 28
	style.content_margin_top = 18
	style.content_margin_bottom = 18
	return style


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
			colour = Palette.ui_color("textDim")
		elif i == _choice:
			colour = _select
		row.add_theme_color_override("font_color", colour)
