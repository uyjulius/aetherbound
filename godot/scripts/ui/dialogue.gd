class_name Dialogue
extends Control
##
## The dialogue box: a name, a page of text that reveals itself, and sometimes a
## choice.
##
## A port of `src/ui/dialogue.js`, and the one layer where the port is a
## reimplementation rather than a translation — the reference draws with HTML and CSS,
## and there is nothing to be gained by pretending Control nodes are a DOM. What is
## carried over exactly is the *feel*: text reveals character by character, punctuation
## holds for a beat, confirm speeds the reveal and a fresh press turns the page. That
## contract is one every player of this kind of game already knows, and getting it
## slightly wrong is felt immediately even though nothing about it is visible in a
## screenshot.

## Frames each mark holds the reveal. A comma is a shorter breath than a full stop, and
## an ellipsis is most of a second.
const PUNCTUATION_PAUSE := {
	".": 7, "!": 7, "?": 7, ",": 3, ";": 4, ":": 4, "—": 5, "…": 10,
}

## Characters per frame at normal speed. Holding confirm triples it.
const SPEED := 1.6
const HELD_MULTIPLIER := 3.0

signal page_turned

var is_open := false

var _panel: PanelContainer
var _name_label: Label
var _text_label: RichTextLabel
var _more: Label
var _choices: VBoxContainer
var _choice_index := 0
var _choice_result := -99
## Confirm presses counted from real events rather than polled.
##
## `Input.is_action_just_pressed` is defined against the frame it was pressed in, and in
## a single-threaded web build a coroutine that awaits `process_frame` does not observe
## those frames the way `_process` does — pages turned themselves every twenty frames or
## so with nothing touching the keyboard. Counting events is unambiguous: a page turns
## when one more confirm has arrived than when the page opened.
var _confirms := 0
var _cancels := 0


func _ready() -> void:
	# Anchors *and* offsets. `set_anchors_preset` alone leaves the offsets a fresh
	# Control was born with, and a box with a zero-sized rect draws nothing at all while
	# looking, in every log, exactly like a box that opened correctly.
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Input is read here rather than polled, and the box must see keys even while the
	# rest of the screen is busy.
	set_process_input(true)
	_build()
	visible = false


func _input(event: InputEvent) -> void:
	if event.is_echo():
		return
	if event.is_action_pressed("confirm"):
		_confirms += 1
	if event.is_action_pressed("cancel"):
		_cancels += 1


func _build() -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	margin.anchor_top = 1.0
	margin.offset_top = -320.0
	margin.offset_bottom = -40.0
	margin.add_theme_constant_override("margin_left", 80)
	margin.add_theme_constant_override("margin_right", 80)
	add_child(margin)

	_panel = PanelContainer.new()
	# The reference's panel: a deep blue with a lit top edge, shared with every other window
	# in the game.
	_panel.add_theme_stylebox_override("panel", WindowBox.panel())
	margin.add_child(_panel)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	_panel.add_child(column)

	_name_label = Label.new()
	_name_label.add_theme_font_size_override("font_size", 26)
	_name_label.add_theme_color_override("font_color", Palette.ui_color("select"))
	column.add_child(_name_label)

	_text_label = RichTextLabel.new()
	_text_label.bbcode_enabled = false
	_text_label.fit_content = true
	_text_label.custom_minimum_size = Vector2(0, 96)
	_text_label.add_theme_font_size_override("normal_font_size", 26)
	_text_label.add_theme_color_override("default_color", Palette.ui_color("text"))
	column.add_child(_text_label)

	_choices = VBoxContainer.new()
	_choices.add_theme_constant_override("separation", 4)
	column.add_child(_choices)

	_more = Label.new()
	_more.text = "more"
	_more.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_more.add_theme_color_override("font_color", Palette.ui_color("textDim"))
	column.add_child(_more)


func open(speaker: Variant) -> void:
	if not is_open:
		# One line per box opened, so a scene that is running but invisible can be told
		# apart from a scene that is stuck before its first line.
		# One line per box opened, with its rect: a scene that runs while its box has a
		# zero-sized rect is invisible and otherwise indistinguishable from one that
		# played correctly, which cost an hour.
		print("DIALOGUE_OPEN speaker=%s box=%s" % [str(speaker), str(size)])
	is_open = true
	visible = true
	_name_label.text = String(speaker) if speaker != null else ""
	_name_label.visible = speaker != null


func close() -> void:
	is_open = false
	visible = false
	_text_label.text = ""
	_clear_choices()


## One page, revealed. Returns when the page has been turned.
##
## `instant` skips the reveal and `no_wait` leaves the page up — the two options the
## reference's scenes actually use.
func say(speaker: Variant, text: String, opts: Dictionary = {}) -> void:
	open(speaker)
	_text_label.text = ""
	_more.visible = false

	var characters := text.length()
	var shown := 0
	var hold := 0
	var skipped := bool(opts.get("instant", false))
	var confirms_at_open := _confirms
	var cancels_at_open := _cancels

	while shown < characters:
		if skipped:
			shown = characters
			break
		await _frame()
		if _confirms > confirms_at_open or _cancels > cancels_at_open:
			skipped = true
			confirms_at_open = _confirms
			cancels_at_open = _cancels
			# How much of the writing people actually read. Once a session: the interesting fact
			# is that somebody skips, not that they skipped the fortieth line of a scene.
			Telemetry.once("skipped", Telemetry.DIALOGUE_SKIPPED,
				{"at_character": shown, "of": characters})
			continue
		if hold > 0:
			hold -= 1
			continue
		var step := maxi(1, int(round(SPEED * (HELD_MULTIPLIER if Actions.is_down("confirm") else 1.0))))
		for _i in step:
			if shown >= characters:
				break
			var ch := text.substr(shown, 1)
			shown += 1
			# Every third glyph. Every glyph is grating; every few reads as speech, which
			# is the reference's finding and its comment.
			if shown % 3 == 0:
				Sound.sfx("text")
			hold = int(PUNCTUATION_PAUSE.get(ch, 0))
			if hold > 0:
				break
		_text_label.text = text.substr(0, shown)
	_text_label.text = text

	if bool(opts.get("no_wait", false)):
		return
	_more.visible = true
	# One more confirm than the page has already seen. A press that skipped the reveal is
	# therefore spent on the reveal and does not also turn the page, which is the
	# contract every player of this kind of game has already learned.
	var turn_at := _confirms
	while _confirms <= turn_at:
		await _frame()
	_more.visible = false
	page_turned.emit()


## Several pages, then close unless asked to stay.
func speak(speaker: Variant, lines: Array, opts: Dictionary = {}) -> void:
	for line in lines:
		await say(speaker, String(line), opts)
	if not bool(opts.get("keep_open", false)):
		close()


## A choice. Returns the index taken, or -1 when cancelled and cancelling is allowed.
func ask(question: Variant, choices: Array, opts: Dictionary = {}) -> int:
	if question != null and String(question) != "":
		await say(opts.get("speaker", null), String(question),
			{"no_wait": true, "instant": opts.get("instant", false)})
	else:
		open(opts.get("speaker", null))

	_clear_choices()
	_choice_index = 0
	_choice_result = -99
	for i in choices.size():
		var row := Label.new()
		row.add_theme_font_size_override("font_size", 24)
		_choices.add_child(row)
	_paint_choices(choices)

	var confirms_at_open := _confirms
	var cancels_at_open := _cancels
	while _choice_result == -99:
		await _frame()
		if Actions.just_pressed("down"):
			_choice_index = posmod(_choice_index + 1, choices.size())
			Sound.sfx("cursor")
			_paint_choices(choices)
		if Actions.just_pressed("up"):
			_choice_index = posmod(_choice_index - 1, choices.size())
			Sound.sfx("cursor")
			_paint_choices(choices)
		if _confirms > confirms_at_open:
			_choice_result = _choice_index
		if _cancels > cancels_at_open and bool(opts.get("cancelable", false)):
			_choice_result = -1

	_clear_choices()
	if not bool(opts.get("keep_open", false)):
		close()
	return _choice_result


func _paint_choices(choices: Array) -> void:
	for i in _choices.get_child_count():
		var row: Label = _choices.get_child(i)
		# A choice is either a string or a row with a label on it, which is how the
		# reference's menus carry a value alongside the text.
		var label: Variant = choices[i]
		if label is Dictionary:
			label = label.get("label", "?")
		row.text = "%s %s" % [">" if i == _choice_index else " ", String(label)]
		row.add_theme_color_override("font_color",
			Palette.ui_color("select") if i == _choice_index else Palette.ui_color("text"))


func _clear_choices() -> void:
	for child in _choices.get_children():
		child.queue_free()


## One frame. Kept in one place so the reveal cannot accidentally run on physics time.
func _frame() -> void:
	await get_tree().process_frame
