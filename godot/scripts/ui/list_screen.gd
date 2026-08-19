class_name ListScreen
extends Control
##
## The shape both the field menu and the shop are: a stack of screens, a list on the
## left, and a panel on the right explaining whatever the cursor is on.
##
## Shared because the fiddly parts are shared. Scrolling a list is easy; reading a
## keypress in a single-threaded web build is not, and it went wrong twice — a polled
## `just_pressed` that a coroutine never observes, and an event counter that keeps
## ticking behind a closed screen and hands it a fistful of confirms the moment it
## opens. One copy of that, checked in a browser, is worth more than two.
##
## A screen is a dictionary, so a subclass builds one without declaring a class:
##
##   {title, rows, on_select, on_special, detail, rebuild, footer}
##
## `rows` are `{label, right, disabled, ...}` and carry whatever else the screen's own
## callbacks need. `rebuild` is for the screens that change as they are used — a bag
## empties, gil runs out — and runs after every select. `on_adjust` is for a screen where
## left and right change the highlighted row rather than moving the cursor, which is what
## a settings list wants.

## Rows shown at once before the list scrolls.
const PAGE := 12

signal closed

var party: Party
var database

## Screens, innermost last.
var _stack: Array = []
var _index := 0
var _scroll := 0

var _title: Label
var _list: VBoxContainer
var _detail: Label
var _footer: Label
## Presses, counted from real events rather than polled — see the class comment.
var _confirms := 0
var _cancels := 0
var _specials := 0


func _ready() -> void:
	# Anchors *and* offsets: `set_anchors_preset` alone leaves a fresh Control's offsets
	# behind, and a zero-sized rect draws nothing while looking correct in every log.
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process_input(true)
	_build()
	visible = false


func _input(event: InputEvent) -> void:
	if not visible or event.is_echo():
		return
	if event.is_action_pressed("confirm"):
		_confirms += 1
	if event.is_action_pressed("cancel"):
		_cancels += 1
	if event.is_action_pressed("special"):
		_specials += 1


func _build() -> void:
	var ground := ColorRect.new()
	ground.color = Color(Palette.ink)
	ground.color.a = 0.96
	ground.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(ground)

	_title = Label.new()
	_title.position = Vector2(72, 44)
	_title.add_theme_font_size_override("font_size", 40)
	_title.add_theme_color_override("font_color", Palette.ui_color("select"))
	add_child(_title)

	# Two windows, in the game's own chrome, rather than text floating on a dim screen. The
	# reference's menu is a set of panels and this was a column of words over the field: legible
	# enough to read and not obviously a screen, which is worse than it sounds on the shop's
	# comparison table, where a list and a description sit side by side and nothing said which
	# was which.
	var list_panel := PanelContainer.new()
	list_panel.add_theme_stylebox_override("panel", WindowBox.panel(0.9, 20.0))
	list_panel.position = Vector2(60, 116)
	list_panel.custom_minimum_size = Vector2(640, 828)
	add_child(list_panel)

	_list = VBoxContainer.new()
	_list.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	_list.add_theme_constant_override("separation", 6)
	list_panel.add_child(_list)

	var detail_panel := PanelContainer.new()
	detail_panel.add_theme_stylebox_override("panel", WindowBox.panel(0.9, 20.0))
	detail_panel.position = Vector2(724, 116)
	detail_panel.custom_minimum_size = Vector2(1136, 828)
	add_child(detail_panel)

	_detail = Label.new()
	_detail.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	_detail.add_theme_font_size_override("font_size", 22)
	_detail.add_theme_color_override("font_color", Palette.ui_color("text"))
	detail_panel.add_child(_detail)

	_footer = Label.new()
	_footer.position = Vector2(72, 972)
	_footer.add_theme_font_size_override("font_size", 20)
	_footer.add_theme_color_override("font_color", Palette.ui_color("textDim"))
	add_child(_footer)


# ---------------------------------------------------------------------------
# For subclasses
# ---------------------------------------------------------------------------

## The screen a subclass opens on.
func _root() -> Dictionary:
	return {"title": "?", "rows": []}


## Prefix for the two lines this screen prints. `MENU`, `SHOP`.
func _tag() -> String:
	return "SCREEN"


## Open on the root screen. Subclasses call this from their own `open`, after taking
## whatever else they need.
func _begin(for_party: Party, db) -> void:
	party = for_party
	database = db
	_stack.clear()
	# Zeroed here rather than trusted: a press that arrived while this screen was closed
	# belongs to whatever was on screen at the time.
	_confirms = 0
	_cancels = 0
	_specials = 0
	visible = true
	_push(_root())
	print("%s_OPEN gold=%d items=%d" % [_tag(), party.gold, party.inventory.size()])
	# Both screens that inherit this are worth an event and the reference has one for each, so
	# the tag chooses. A screen added later with a new tag reports as a menu rather than as
	# nothing, which is the safer of the two ways to be wrong.
	Telemetry.track(Telemetry.SHOP_OPENED if _tag() == "SHOP" else Telemetry.MENU_OPENED, {
		"gold": party.gold, "items": party.inventory.size(),
		"party_level": party.average_level()})


func close() -> void:
	visible = false
	_stack.clear()
	print("%s_CLOSED" % _tag())
	closed.emit()


# ---------------------------------------------------------------------------
# Running
# ---------------------------------------------------------------------------

func _process(_delta: float) -> void:
	if not visible or _stack.is_empty():
		return
	var screen: Dictionary = _stack[_stack.size() - 1]
	var rows: Array = screen["rows"]

	# Left and right belong to the row when a screen says so — a volume goes up and down in
	# place rather than sending the cursor somewhere.
	var on_adjust: Callable = screen.get("on_adjust", Callable())
	if on_adjust.is_valid() and not rows.is_empty():
		var dir := 0
		if Actions.just_pressed("right"):
			dir = 1
		elif Actions.just_pressed("left"):
			dir = -1
		if dir != 0:
			on_adjust.call(rows[_index], dir)
			Sound.sfx("cursor")
			_rebuild()

	for action in ["down", "up", "pageRight", "pageLeft"]:
		if Actions.just_pressed(action):
			var by := 1 if action == "down" else (-1 if action == "up"
				else (PAGE if action == "pageRight" else -PAGE))
			var before := _index
			_move(by, rows.size())
			# Only when the cursor actually went somewhere: a list already at its end
			# should not click for every press.
			if _index != before:
				Sound.sfx("cursor")

	if _cancels > 0:
		_cancels = 0
		Sound.sfx("cancel")
		_pop()
		return
	if _specials > 0:
		_specials = 0
		var on_special: Callable = screen.get("on_special", Callable())
		if on_special.is_valid() and not rows.is_empty():
			on_special.call(rows[_index])
			_rebuild()
	if _confirms > 0:
		_confirms = 0
		if rows.is_empty() or bool(rows[_index].get("disabled", false)):
			# The reference makes a noise at a row that cannot be chosen rather than
			# nothing, which is the difference between "not allowed" and "not listening".
			Sound.sfx("error")
		else:
			var on_select: Callable = screen.get("on_select", Callable())
			if on_select.is_valid():
				Sound.sfx("confirm")
				on_select.call(rows[_index])
				_rebuild()
	_paint()


func _move(by: int, count: int) -> void:
	if count == 0:
		return
	_index = clampi(_index + by, 0, count - 1)
	if _index < _scroll:
		_scroll = _index
	if _index >= _scroll + PAGE:
		_scroll = _index - PAGE + 1


func _push(screen: Dictionary) -> void:
	# Which screens are used and which are furniture. Once per screen per session, because the
	# question is whether a player ever opens the bestiary, not how often they scroll it.
	Telemetry.once("screen:%s:%s" % [_tag(), String(screen.get("title", "?"))],
		Telemetry.MENU_SCREEN_VIEWED,
		{"screen": String(screen.get("title", "")), "of": _tag()})
	_stack.append(screen)
	_index = 0
	_scroll = 0
	# Past any opening heading: a cursor resting on a row nobody can choose looks broken.
	var rows: Array = screen.get("rows", [])
	while _index < rows.size() - 1 and bool(rows[_index].get("header", false)):
		_index += 1
	_paint()


func _pop() -> void:
	_stack.pop_back()
	if _stack.is_empty():
		close()
		return
	_index = 0
	_scroll = 0
	_paint()


## Rebuild the current screen's rows in place.
func _rebuild() -> void:
	if _stack.is_empty():
		return
	var screen: Dictionary = _stack[_stack.size() - 1]
	var builder: Callable = screen.get("rebuild", Callable())
	if builder.is_valid():
		screen["rows"] = builder.call()
		_index = clampi(_index, 0, maxi(0, screen["rows"].size() - 1))
	_paint()


func _paint() -> void:
	if _stack.is_empty():
		return
	var screen: Dictionary = _stack[_stack.size() - 1]
	var rows: Array = screen["rows"]
	_title.text = String(screen.get("title", ""))

	while _list.get_child_count() < PAGE:
		var fresh := Label.new()
		fresh.add_theme_font_size_override("font_size", 26)
		_list.add_child(fresh)
	for i in PAGE:
		var row: Label = _list.get_child(i)
		var at := _scroll + i
		if at >= rows.size():
			row.text = ""
			continue
		var entry: Dictionary = rows[at]
		var header := bool(entry.get("header", false))
		row.text = ("%s" % String(entry.get("label", ""))) if header \
			else "%s %-28s %s" % [">" if at == _index else " ",
				String(entry.get("label", "")), String(entry.get("right", ""))]
		var colour := Palette.ui_color("text")
		if header:
			colour = Palette.ui_color("select")
		elif bool(entry.get("disabled", false)):
			colour = Palette.ui_color("textDisabled")
		elif at == _index:
			colour = Palette.ui_color("select")
		row.add_theme_color_override("font_color", colour)

	var detail: Callable = screen.get("detail", Callable())
	_detail.text = ""
	if detail.is_valid() and not rows.is_empty():
		_detail.text = String(detail.call(rows[_index]))
	_footer.text = "%d gil    %s" % [party.gold, String(screen.get("footer",
		"confirm select · cancel back"))]
