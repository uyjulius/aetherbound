class_name EnemyTags
extends Control
##
## The enemies' names, over the enemies.
##
## A fight in this port is two ranks of models on a floor, and until now the only way to tell
## which of them the cursor was on was a list of names in the corner: the player read a row,
## then looked for the creature it meant. The reference puts the name on the creature, so the
## list and the look-up disappear together.
##
## Health is shown only for a creature that has been scanned. That is the reference's rule and
## it is the whole point of the command: a bestiary entry is bought with a turn, and a port
## that printed every creature's HP for free would make Annotate worthless.
##
## Six creatures in a line put six labels along the same diagonal, on top of one another, so
## the labels are placed and then lifted off each other — left to right, so the stack grows in
## reading order, and the targeted one is placed last so it stays nearest its own creature.

## One line of lift per clash, in pixels at the design resolution.
const LINE := 26.0
const FONT_SIZE := 20.0

var _tags: Dictionary = {}


func _init() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


## Place a tag over every living enemy. `head_of` is asked for the screen position above a
## combatant and returns `Vector2.INF` when there is nothing to point at — a creature whose
## model has not loaded, or one behind the camera.
func sync(enemies: Array, targeted: Array, head_of: Callable) -> void:
	var placed: Array = []
	for e in enemies:
		var tag: PanelContainer = _tags.get(e.id)
		if tag == null:
			tag = _make_tag()
			_tags[e.id] = tag
			add_child(tag)
		if e.is_ko():
			tag.visible = false
			continue
		var at: Vector2 = head_of.call(e)
		if at == Vector2.INF:
			tag.visible = false
			continue
		tag.visible = true
		var is_target: bool = targeted.has(e)
		var label: Label = tag.get_child(0)
		label.text = "%s  %d/%d" % [String(e.name), maxi(0, int(e.hp)), int(e.max_hp)] \
			if e.scanned else String(e.name)
		label.add_theme_color_override("font_color",
			Palette.ui_color("select") if is_target else Palette.ui_color("text"))
		var box: StyleBoxFlat = tag.get_theme_stylebox("panel")
		box.border_color = Palette.ui_color("select") if is_target \
			else Color(Palette.ui_color("panelEdgeLight"), 0.4)
		tag.reset_size()
		placed.append({"tag": tag, "at": at, "target": is_target})

	# Left to right, and the targeted tag last so it wins ties by being lowest.
	placed.sort_custom(func(a, b):
		if bool(a["target"]) != bool(b["target"]):
			return not bool(a["target"])
		return float(a["at"].x) < float(b["at"].x))

	var taken: Array = []
	for entry in placed:
		var tag: PanelContainer = entry["tag"]
		var at: Vector2 = entry["at"]
		var width: float = maxf(90.0, tag.size.x)
		var y: float = at.y
		for _guard in range(placed.size() + 1):
			var clash := false
			for other in taken:
				if absf(float(other["y"]) - y) < LINE \
						and absf(float(other["x"]) - at.x) < (float(other["w"]) + width) * 0.5:
					clash = true
					break
			if not clash:
				break
			y -= LINE
		taken.append({"x": at.x, "y": y, "w": width})
		# Centred on the creature, as the reference's `translate(-50%, -50%)` has it.
		tag.position = Vector2(at.x - tag.size.x * 0.5, y - tag.size.y * 0.5)


## Nothing is left over between fights: a tag for a creature that is no longer in the battle
## would hang in the air over the next one.
func clear() -> void:
	for tag in _tags.values():
		tag.queue_free()
	_tags.clear()


func _make_tag() -> PanelContainer:
	var tag := PanelContainer.new()
	tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var box := StyleBoxFlat.new()
	box.bg_color = Color(0.031, 0.047, 0.125, 0.8)
	box.set_border_width_all(1)
	box.set_corner_radius_all(3)
	box.content_margin_left = 10.0
	box.content_margin_right = 10.0
	box.content_margin_top = 3.0
	box.content_margin_bottom = 3.0
	tag.add_theme_stylebox_override("panel", box)
	var label := Label.new()
	label.add_theme_font_size_override("font_size", FONT_SIZE)
	tag.add_child(label)
	return tag
