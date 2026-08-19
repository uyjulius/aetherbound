extends Control
##
## A diagnostic view of the ported world: the grid, the colliders, the triggers
## and a party you can walk around them with.
##
## Deliberately a diagnostic and not a scene. The reference builds its ground,
## walls and props from geometry computed in code, and this project does not ship
## procedurally generated assets — so the scenery for these 95 maps is an asset
## problem with its own sub-project, and drawing boxes here to stand in for it
## would be exactly the shortcut that was ruled out. What *is* finished is the
## simulation: walkability, collision, camera-relative movement, triggers and
## encounter distance, all of it checked against the reference by
## `tools/field-parity.mjs`. This is that simulation, made visible.
##
## Controls: move, `run`, `pageLeft`/`pageRight` to orbit the camera in 45°
## detents, `menu` for the next map, `cancel` to go back.

const FieldSim := preload("res://scripts/world/field.gd")
const Database := preload("res://scripts/data/database.gd")
const PartyModel := preload("res://scripts/game/party.gd")
const DialogueBox := preload("res://scripts/ui/dialogue.gd")
const Ctx := preload("res://scripts/game/event_context.gd")
const BattleScreen := preload("res://scripts/ui/battle_view.gd")

## Maps worth opening on first, in this order: a town, an interior, a continent,
## a dungeon. `menu` walks the whole world from there.
const FIRST := ["harrowmere", "inn_harrowmere", "overworld", "sunkenvault"]

var _db: Database
var _field: Field
var _party: Party
var _dialogue: Dialogue
var _ctx: EventContext
## True while a scene is playing, so the field does not walk under it.
var _scene_running := false
var _last_event := ""
var _battle: BattleView
var _last_trigger := ""
var _interact: Dictionary = {}
## The encounter RNG, so the same walk meets the same monsters.
var _encounter_rng := RNG.new(0x9d2f11)
var _ids: PackedStringArray = PackedStringArray()
var _index := 0
var _label: Label


func _ready() -> void:
	_db = Database.new()
	if not _db.load_all():
		push_error("data tables did not load")
		return
	Palette.adopt(_db.palette)
	Actions.build(_db.input)

	var rest: Array = _db.maps.keys()
	rest.sort()
	for id in FIRST:
		if _db.maps.has(id):
			_ids.append(id)
	for id in rest:
		if not _ids.has(id):
			_ids.append(id)

	# A party, so the scenes have somebody to talk about. The opening three at the level
	# the reference's New Game gives them.
	_party = PartyModel.new(_db)
	_party.new_campaign()
	# The party, out loud. `tools/web-smoke.mjs` holds these against the ones harvested
	# from the reference's own New Game, so a starting kit that stops being fitted — or a
	# growth curve that drifts — is caught in the browser rather than in a fight.
	var roster: Array = []
	for id in _party.active:
		var m: Party.Member = _party.roster[id]
		roster.append("%s:%d/%d" % [id, m.hp, m.mp])
	print("PARTY_READY %s" % " ".join(roster))

	_dialogue = DialogueBox.new()
	add_child(_dialogue)

	_battle = BattleScreen.new()
	_battle.visible = false
	_battle.finished.connect(_on_battle_finished)
	add_child(_battle)

	# The reference binds a debug encounter to B and a boss to N. Kept, because a
	# diagnostic that can only reach a fight by walking until one happens is a
	# diagnostic nobody uses.
	for action in ["debug_battle", "debug_boss"]:
		if InputMap.has_action(action):
			InputMap.erase_action(action)
		InputMap.add_action(action)
	var b := InputEventKey.new()
	b.physical_keycode = KEY_B
	InputMap.action_add_event("debug_battle", b)
	var n := InputEventKey.new()
	n.physical_keycode = KEY_N
	InputMap.action_add_event("debug_boss", n)

	_ctx = Ctx.new("first", false)
	_ctx.database = _db
	_ctx.party = _party
	_ctx.dialogue = _dialogue
	# The field diagnostic has no battle runtime wired to it yet, so a scene that starts
	# one is told it was won. Said out loud rather than assumed: a scene that branches on
	# the outcome would otherwise look like it had fought something.
	_ctx.on_battle = func(encounter, _opts):
		print("SCENE_BATTLE enemies=%s (assumed victory)" % str(encounter.get("enemies", [])))
		return "victory"
	_ctx.on_chest = func(spec):
		print("SCENE_CHEST %s" % str(spec))
	_ctx.on_music = func(track, _opts):
		print("SCENE_MUSIC %s" % track)
	_ctx.on_goto_map = func(id, _spawn):
		print("SCENE_GOTO %s" % id)

	_label = Label.new()
	_label.add_theme_font_size_override("font_size", 20)
	_label.add_theme_color_override("font_color", Palette.ui_color("text"))
	_label.position = Vector2(24, 18)
	add_child(_label)

	_open(0)
	set_process(true)


func _open(index: int, spawn := "default") -> void:
	_index = posmod(index, _ids.size())
	var id := _ids[_index]
	_field = FieldSim.new(_db.maps[id], _db.legend, _db.footprints, spawn,
		_db.encounters, RngStreams.encounter)
	_last_event = ""
	# One line per map opened, so `tools/web-smoke.mjs` can prove the field runs in
	# a browser rather than only in the editor — and so a map that builds an empty
	# grid is visible as numbers rather than as a blank screen.
	print("FIELD_READY map=%s tiles=%dx%d colliders=%d triggers=%d" % [
		id, _field.built.width, _field.built.height,
		_field.grid.shapes.size(), _field.grid.triggers.size()])


func _process(delta: float) -> void:
	# A fight owns the screen outright: it has its own turn clock, and a field that kept
	# walking underneath would be accumulating encounter distance during a battle.
	if _battle != null and _battle.visible:
		# The grid and its HUD stay behind the fight rather than showing through it.
		_label.visible = false
		return
	_label.visible = true
	# A scene owns the screen while it plays. The field keeps its position and the
	# camera keeps its bearing; nothing walks under a conversation.
	if _scene_running:
		_update_label()
		return
	if Input.is_action_just_pressed("debug_battle"):
		# The map's own table where there is one. Harrowmere has none — a village is not
		# somewhere you get jumped — so a diagnostic that could only fight where the
		# design allows encounters would show nothing on the map it opens on.
		var table := _field.current_encounter_table()
		_start_battle(table if not table.is_empty() else {"enemies": ["fenrat", "fenrat"]})
		return
	if Input.is_action_just_pressed("debug_boss"):
		# One of the optional bosses, so a boss fight can be seen without finding it.
		_start_battle({"enemies": ["weighmaster"], "boss": true})
		return
	if Actions.just_pressed("special"):
		# On demand, so the browser check can start a scene without walking to one.
		_run_event("harrowmere_intro")
		return
	if Actions.just_pressed("cancel"):
		get_tree().change_scene_to_file("res://scenes/title.tscn")
		return
	if Actions.just_pressed("menu"):
		_open(_index + 1)
	if Actions.just_pressed("pageLeft"):
		_field.camera.orbit(1)
	if Actions.just_pressed("pageRight"):
		_field.camera.orbit(-1)

	var result := _field.update(delta, Actions.move_vector(), Actions.is_down("run"))
	if not result["encounter"].is_empty():
		_start_battle(result["encounter"])
		return
	# What the party has walked onto. A trigger fires once on entry and not again while
	# they stand on it, which is what `_last_trigger` is for.
	var trigger: Dictionary = result["trigger"]
	if trigger.is_empty():
		_last_trigger = ""
	else:
		var signature := "%s:%d,%d" % [String(trigger.get("kind", "")),
			int(trigger.get("x", 0)), int(trigger.get("z", 0))]
		if signature != _last_trigger:
			_last_trigger = signature
			if _fire_trigger(trigger):
				return

	# Talking. The prompt says who, and confirm starts whatever they have.
	_interact = _field.interact_target()
	if not _interact.is_empty() and Actions.just_pressed("confirm"):
		_talk_to(_interact["npc"])
		return
	_trigger = result["trigger"]
	queue_redraw()
	_update_label()


var _encounters := 0
var _trigger: Dictionary = {}


## Act on a trigger. Returns true when it took over the screen.
##
## A `once` trigger is spent by a flag armed *after* its scene finishes, so fleeing the
## fight or closing the tab does not quietly consume the content — the reference learned
## that one the hard way.
func _fire_trigger(trigger: Dictionary) -> bool:
	var data: Dictionary = trigger.get("data", {})
	var key := _field.trigger_key(trigger)
	if not key.is_empty() and _party.has_flag(key):
		return false

	match String(trigger.get("kind", "")):
		"exit":
			var to := String(data.get("to", ""))
			if to.is_empty() or not _db.maps.has(to):
				print("EXIT_UNKNOWN to=%s" % to)
				return false
			if not key.is_empty():
				_party.set_flag(key)
			_travel(to, String(data.get("spawn", "default")))
			return true
		"event":
			var id := String(data.get("event", ""))
			if id.is_empty():
				return false
			_run_event(id)
			if not key.is_empty():
				_party.set_flag(key)
			return true
	return false


## Walk out of one map and into another.
func _travel(map_id: String, spawn: String) -> void:
	var at := _ids.find(map_id)
	if at < 0:
		print("EXIT_UNKNOWN to=%s" % map_id)
		return
	print("MAP_ENTERED %s spawn=%s" % [map_id, spawn])
	_open(at, spawn)
	_last_trigger = ""


## Talk to somebody. Their scene if they have one, their lines if they do not, and a note
## about the shop or the bed they keep — those are screens of their own.
func _talk_to(npc: Dictionary) -> void:
	var def: Dictionary = npc["def"]
	var name := String(def.get("name", def.get("id", "?")))
	if def.has("event"):
		_run_event(String(def["event"]))
		return
	var lines: Array = []
	var talk: Variant = def.get("talk", null)
	if talk is Array:
		lines = talk
	elif talk != null:
		lines = [String(talk)]
	if def.has("shop"):
		lines.append("(%s keeps a shop. The shop screen is not built yet.)"
			% name)
	elif def.has("inn"):
		lines.append("(%s keeps an inn, %d gil. The inn is not built yet.)"
			% [name, int(def.get("inn", {}).get("price", 0))])
	if lines.is_empty():
		return
	_scene_running = true
	print("TALK %s lines=%d" % [String(def.get("id", "?")), lines.size()])
	await _dialogue.speak(name, lines)
	_scene_running = false


## Start a fight from an encounter table or an explicit formation.
func _start_battle(table: Dictionary) -> void:
	var group := Field.pick_group(table, _encounter_rng)
	if group.is_empty():
		_note_no_encounter()
		return
	_encounters += 1
	_battle.begin(_party, group, _db)


func _note_no_encounter() -> void:
	print("BATTLE_NONE nothing to fight here")


func _on_battle_finished(result: String) -> void:
	_battle.visible = false
	# Whatever the fight did to the party stays done. A defeat is not handled here —
	# a game over belongs with the title screen, which is a later piece.
	print("BATTLE_CLOSED result=%s" % result)


## Play a scene. The same coroutines the harness compares, driven by a live context.
func _run_event(id: String) -> void:
	if _scene_running:
		return
	_scene_running = true
	_last_event = id
	print("SCENE_START %s" % id)
	var known: bool = await Events.run(id, _ctx)
	_dialogue.close()
	print("SCENE_END %s known=%s" % [id, str(known)])
	_scene_running = false


func _update_label() -> void:
	var def: Dictionary = _db.maps[_ids[_index]]
	var table := _field.current_encounter_table()
	var remaining := _field.encounter_threshold - _field.step_accum
	var lines := [
		"%s — %s" % [String(def.get("name", "?")), String(def.get("subtitle", ""))],
		"%s   %d x %d tiles   %d colliders   %d triggers" % [
			_ids[_index], _field.built.width, _field.built.height,
			_field.grid.shapes.size(), _field.grid.triggers.size()],
		"at %.2f, %.2f   %s   bearing %d°   speed x%.2f" % [
			_field.player.x, _field.player.z,
			"standing clear" if _field.standing_clear() else "INSIDE GEOMETRY",
			int(round(rad_to_deg(_field.camera.yaw))) % 360, _field.speed_scale],
		("next encounter in %.0f units (%d so far)" % [remaining, _encounters]) if table \
			and not table.is_empty() else "no encounters here",
	]
	if not _interact.is_empty():
		lines.append("%s: %s" % [String(_interact["label"]),
			String(_interact["npc"]["def"].get("name", "?"))])
	if not _trigger.is_empty():
		var data: Dictionary = _trigger.get("data", {})
		lines.append("on a %s trigger%s" % [_trigger["kind"],
			(" -> %s" % data["to"]) if data.has("to") else ""])
	if _scene_running:
		lines.append("scene: %s" % _last_event)
	if _battle != null and _battle.visible:
		lines.append("in battle")
	lines.append("move / run · Q,E orbit · C next map · V scene · B fight · N boss · Esc back")
	_label.text = "\n".join(lines)


## Drawn top-down, scaled to fit, north up. Not a camera view: the point is to see
## the grid and the colliders at once, which a camera at the player's shoulder
## cannot do.
func _draw() -> void:
	if _field == null:
		return
	var tile := 2.0
	var w := float(_field.built.width) * tile
	var h := float(_field.built.height) * tile
	var margin := 150.0
	var scale := minf((size.x - margin) / w, (size.y - margin) / h)
	var origin := Vector2((size.x - w * scale) * 0.5, (size.y - h * scale) * 0.5 + 40.0)
	var to_screen := func(x: float, z: float) -> Vector2:
		return origin + Vector2(x, z) * scale

	var floor_colour := Palette.ramp_at("dirt", 0.35)
	var wall_colour := Palette.ramp_at("stone", 0.1)
	for z in _field.built.height:
		for x in _field.built.width:
			var walkable := _field.grid.is_walk_tile(x, z)
			draw_rect(Rect2(to_screen.call(x * tile, z * tile),
				Vector2(tile * scale, tile * scale) - Vector2.ONE),
				floor_colour if walkable else wall_colour, true)

	# Triggers under the colliders: a doorway is usually inside a building's
	# footprint and would be hidden the other way round.
	for t in _field.grid.triggers:
		var colour := Palette.ui_color("select") if t["kind"] == "exit" \
			else Palette.ui_color("mp")
		colour.a = 0.45
		draw_rect(Rect2(to_screen.call(t["x"], t["z"]),
			Vector2(t["w"], t["d"]) * scale), colour, true)

	var collider_colour := Palette.ui_color("danger")
	collider_colour.a = 0.75
	for s in _field.grid.shapes:
		if s["kind"] == "circle":
			draw_arc(to_screen.call(s["x"], s["z"]), float(s["r"]) * scale, 0.0, TAU,
				24, collider_colour, 1.5)
		else:
			# Rotated, so a building at an angle reads as the box that actually
			# blocks the player rather than an axis-aligned guess at it.
			var half := Vector2(float(s["w"]), float(s["d"])) * 0.5 * scale
			var centre: Vector2 = to_screen.call(s["x"], s["z"])
			var rot := float(s["rot"])
			var corners := PackedVector2Array()
			for corner in [Vector2(-half.x, -half.y), Vector2(half.x, -half.y),
					Vector2(half.x, half.y), Vector2(-half.x, half.y)]:
				corners.append(centre + corner.rotated(rot))
			corners.append(corners[0])
			draw_polyline(corners, collider_colour, 1.5)

	for npc in _field.npcs:
		draw_circle(to_screen.call(npc["x"], npc["z"]), 0.44 * scale,
			Palette.ui_color("good"))

	# The party, with its facing, and the camera's bearing as the longer line —
	# the two differ whenever the camera has been orbited, which is the thing
	# that made the reference's input transform wrong twice.
	var player: Vector2 = to_screen.call(_field.player.x, _field.player.z)
	draw_circle(player, Field.PLAYER_RADIUS * scale, Palette.ui_color("text"))
	draw_line(player, player + Vector2(sin(_field.player.facing),
		cos(_field.player.facing)) * 1.4 * scale, Palette.ui_color("hp"), 2.0)
	draw_line(player, player - Vector2(sin(_field.camera.yaw),
		cos(_field.camera.yaw)) * 2.6 * scale, Palette.ui_color("atb"), 1.0)
