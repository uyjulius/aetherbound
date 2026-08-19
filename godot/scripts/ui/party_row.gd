class_name PartyRow
extends Control
##
## One character's line in a fight: their name, what is wrong with them, their health, their
## magic, the gauge that decides when they act, and the one that decides when they can do
## something about it.
##
## This replaces a row of text. Text was honest about the numbers and useless at the job the
## row actually has, which is to be read at a glance by somebody deciding what to do in the
## next second and a half. `237/237 HP  54 MP  [||||......]` has to be parsed; a bar that is
## a quarter full and turning amber does not.
##
## The bars are the reference's, down to the thresholds: health goes amber at a quarter and
## red at an eighth, the desperation gauge sits under health as a thinner track because it is
## a secondary resource, and both it and the turn gauge brighten when they are full — the
## moment each is asking to be spent. The colours come from the palette table, which now
## carries the two the stylesheet used to keep to itself.


## Where health stops being comfortable, and where it stops being survivable. The reference's
## `.bar.hp.low` and `.bar.hp.crit`.
const LOW := 0.25
const CRIT := 0.125

## The row's geometry. A grid would fight with the bars, which need exact widths to mean
## anything, so the columns are fixed: name and gauges on the left, numbers right-aligned in
## the middle, the turn gauge on the right where the eye can compare four of them.
const HEIGHT := 74.0
const NAME_WIDTH := 250.0
const NUMBERS_WIDTH := 150.0
const ATB_WIDTH := 120.0
const BAR_HEIGHT := 12.0
const LIMIT_HEIGHT := 7.0

## A status pill: three letters in a box, coloured by whether the status is something being
## done to the character or something they have. Godot's font cannot draw the reference's
## glyphs — 22 of its 26 symbols are simply absent, and an absent glyph reads as "nothing
## wrong" — so the port shows the short codes from the same table instead.
const PILL_HEIGHT := 20.0
const PILL_PAD := 5.0
const MAX_PILLS := 4

var _name: Label
var _numbers: Label
var _mp: Label
var _pills: Array = []
var _time := 0.0

## Everything `_draw` needs, snapshotted by `show_combatant` rather than read live, so the row
## draws the same thing on every frame between updates.
var _health := 1.0
var _limit := 0.0
var _atb := 0.0
var _dim := false
var _acting := false

var _track := StyleBoxFlat.new()
var _fill := StyleBoxFlat.new()


func _init() -> void:
	custom_minimum_size = Vector2(0.0, HEIGHT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	# The track a bar empties into: nearly black, with the panel's own edge colour as a hairline
	# so an empty bar is still visibly a bar.
	_track.bg_color = Color(0.016, 0.027, 0.078, 0.85)
	_track.set_border_width_all(1)
	_track.border_color = Color(Palette.ui_color("panelEdgeLight"), 0.35)
	_track.set_corner_radius_all(3)
	_fill.set_corner_radius_all(3)

	_name = Label.new()
	_name.add_theme_font_size_override("font_size", 26)
	_name.position = Vector2(0.0, -2.0)
	add_child(_name)

	_numbers = Label.new()
	_numbers.add_theme_font_size_override("font_size", 26)
	_numbers.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_numbers.size = Vector2(NUMBERS_WIDTH, 30.0)
	add_child(_numbers)

	_mp = Label.new()
	_mp.add_theme_font_size_override("font_size", 20)
	_mp.add_theme_color_override("font_color", Palette.ui_color("textDim"))
	_mp.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_mp.size = Vector2(NUMBERS_WIDTH, 24.0)
	add_child(_mp)


func _ready() -> void:
	_layout()
	resized.connect(_layout)


## The columns depend on the row's own width, which a container decides.
func _layout() -> void:
	_name.size = Vector2(NAME_WIDTH, 30.0)
	_numbers.position = Vector2(size.x - NUMBERS_WIDTH - ATB_WIDTH - 24.0, -2.0)
	_mp.position = Vector2(_numbers.position.x, 30.0)


## Take a snapshot of a combatant. Called every frame the fight is on screen; nothing here
## keeps a reference to the combatant, so a row cannot go stale against a battle that ended.
func show_combatant(c, acting: bool, table: Dictionary) -> void:
	var max_hp := maxf(1.0, float(c.max_hp))
	_health = clampf(float(c.hp) / max_hp, 0.0, 1.0)
	# Enemies have no desperation gauge and never appear in a party row, but the row is asked
	# for one rather than told, so a row can be handed anything with health.
	var limit: Variant = c.get("limit")
	_limit = clampf((float(limit) if limit != null else 0.0) / 100.0, 0.0, 1.0)
	_atb = clampf(float(c.atb) / 100.0, 0.0, 1.0)
	_dim = c.is_ko()
	_acting = acting

	_name.text = String(c.name)
	_name.add_theme_color_override("font_color", Palette.ui_color("textDisabled") if _dim
		else (Palette.ui_color("select") if acting else Palette.ui_color("text")))
	_numbers.text = "%d/%d" % [maxi(0, int(c.hp)), int(c.max_hp)]
	_numbers.add_theme_color_override("font_color", Palette.ui_color("textDisabled") if _dim
		else Palette.ui_color("text"))
	_mp.text = "MP %d/%d" % [int(c.mp), int(c.max_mp)]
	_sync_pills(c, table)
	queue_redraw()


## The status pills, after the name. Four at most, in the order the statuses were applied,
## which is the reference's rule — the fifth ailment matters less than a row that stays the
## same width.
func _sync_pills(c, table: Dictionary) -> void:
	# Two halves of the same table: what the status *is* decides the colour, and how it is
	# *shown* decides the letters.
	var defs: Dictionary = table.get("statuses", {})
	var display: Dictionary = table.get("display", {})
	var ids: Array = c.statuses.keys()
	var shown: Array = []
	for id in ids:
		if shown.size() >= MAX_PILLS:
			break
		# KO is not a pill: the row is already greyed out and the numbers already say zero.
		if String(id) == "ko":
			continue
		shown.append(id)
	while _pills.size() < shown.size():
		var pill := Label.new()
		pill.add_theme_font_size_override("font_size", 15)
		pill.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		pill.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		var box := StyleBoxFlat.new()
		box.set_corner_radius_all(3)
		box.content_margin_left = PILL_PAD
		box.content_margin_right = PILL_PAD
		pill.add_theme_stylebox_override("normal", box)
		add_child(pill)
		_pills.append(pill)
	# After the name, not over it: a long name pushes the pills right.
	var at := _name.position.x + _name.get_theme_font("font").get_string_size(
		_name.text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 26).x + 12.0
	for i in _pills.size():
		var pill: Label = _pills[i]
		pill.visible = i < shown.size()
		if not pill.visible:
			continue
		var id := String(shown[i])
		var entry: Dictionary = display.get(id, {})
		# A status with no entry in the table still has to show *something*: the alternative is
		# a character who is quietly poisoned.
		pill.text = String(entry.get("short", id.substr(0, 3).to_upper()))
		var good := String(Dictionary(defs.get(id, {})).get("kind", "bad")) == "good"
		var colour := Palette.ui_color("good") if good else Palette.ui_color("danger")
		pill.add_theme_color_override("font_color", Color(0.04, 0.05, 0.1))
		var box: StyleBoxFlat = pill.get_theme_stylebox("normal")
		box.bg_color = colour
		pill.reset_size()
		pill.position = Vector2(at, 4.0)
		at += pill.size.x + 4.0


func _process(delta: float) -> void:
	# Only the pulsing states need a redraw between updates, and only while they are pulsing.
	if _health <= CRIT or _atb >= 1.0 or _limit >= 1.0:
		_time += delta
		queue_redraw()


func _draw() -> void:
	if _acting:
		# The active character's row is washed warm, fading out to the right — the reference's
		# `linear-gradient(90deg, rgba(255,215,106,.16), transparent 70%)`. Vertex colours,
		# because `draw_rect` has one colour and a flat block over a whole row is a highlight
		# that shouts.
		var tint := Palette.ui_color("select")
		var left := Color(tint, 0.16)
		var right := Color(tint, 0.0)
		var edge := size.x * 0.7
		draw_polygon(
			[Vector2(0, 0), Vector2(edge, 0), Vector2(edge, size.y), Vector2(0, size.y)],
			[left, right, right, left])

	var bar_x := _name.position.x
	var bar_width := NAME_WIDTH
	_bar(Rect2(bar_x, 36.0, bar_width, BAR_HEIGHT), _health, _health_colour(),
		_health <= CRIT)
	_bar(Rect2(bar_x, 36.0 + BAR_HEIGHT + 4.0, bar_width, LIMIT_HEIGHT), _limit,
		Palette.ui_color("limit"), _limit >= 1.0)
	_bar(Rect2(size.x - ATB_WIDTH, 30.0, ATB_WIDTH, BAR_HEIGHT), _atb,
		Palette.ui_color("atb"), _atb >= 1.0)


## Amber at a quarter, red at an eighth. The thresholds are the stylesheet's and the colours
## are now the palette's.
func _health_colour() -> Color:
	if _health <= CRIT:
		return Palette.ui_color("hpCrit")
	if _health <= LOW:
		return Palette.ui_color("hpLow")
	return Palette.ui_color("hp")


## One track and its fill. `pulse` brightens on a 0.7 s cycle, which is the reference's
## `crit-pulse` and `atb-ready` animations — a gauge that is asking for attention.
func _bar(where: Rect2, amount: float, colour: Color, pulse: bool) -> void:
	draw_style_box(_track, where)
	if amount <= 0.0:
		return
	var shown := colour
	if pulse:
		shown = colour * lerpf(1.0, 1.6, 0.5 + 0.5 * sin(_time * TAU / 0.7))
		shown.a = colour.a
	_fill.bg_color = Color(shown, 0.4) if _dim else shown
	draw_style_box(_fill, Rect2(where.position + Vector2(1, 1),
		Vector2(maxf(2.0, (where.size.x - 2.0) * amount), where.size.y - 2.0)))
