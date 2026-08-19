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
## detents, `menu` for the field menu, `M` for the next map, `cancel` to go back.

const FieldSim := preload("res://scripts/world/field.gd")
const Database := preload("res://scripts/data/database.gd")
const PartyModel := preload("res://scripts/game/party.gd")
const DialogueBox := preload("res://scripts/ui/dialogue.gd")
const Ctx := preload("res://scripts/game/event_context.gd")
const BattleScreen := preload("res://scripts/ui/battle_view.gd")
const MenuScreen := preload("res://scripts/ui/menu.gd")
const ShopScreen := preload("res://scripts/ui/shop.gd")
const MapBuilder := preload("res://scripts/world/map_build.gd")

## Maps worth opening on first, in this order: a town, an interior, a continent,
## a dungeon. `M` walks the whole world from there.
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
var _menu: Menu
var _shop: Shop
var _fade: ColorRect
var _last_trigger := ""
var _interact: Dictionary = {}
## The encounter RNG, so the same walk meets the same monsters.
var _encounter_rng := RNG.new(0x9d2f11)
var _ids: PackedStringArray = PackedStringArray()
var _index := 0
var _label: Label
## The save this session opened with, so the first map is the one it was left on.
var _loaded_from: Dictionary = {}


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

	# A party. Either the one a save was left with, or the opening three at the level the
	# reference's New Game gives them.
	var pending: Dictionary = Saves.pending
	Saves.pending = {}
	if not pending.is_empty():
		_party = Saves.restore_party(pending.get("party", {}), _db)
		_loaded_from = pending
		print("LOADED map=%s gold=%d roster=%d" % [String(pending.get("mapId", "?")),
			_party.gold, _party.roster.size()])
	else:
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

	_menu = MenuScreen.new()
	# Where the party is, when the save screen asks. Read at the moment of writing rather
	# than handed over once, so a save carries the map the player is standing on.
	_menu.where = func():
		return {
			"map_id": _ids[_index],
			"spawn": null,
			"position": {"x": _field.player.x, "z": _field.player.z,
				"facing": _field.player.facing},
			"location_name": String(_db.maps[_ids[_index]].get("name", "the road")),
		}
	add_child(_menu)

	_shop = ShopScreen.new()
	# The town's theme comes back when the shop door closes.
	_shop.closed.connect(func(): _play_map_music(0.8))
	add_child(_shop)

	# The screen going dark and coming back is the whole of an inn. Above everything so a
	# night's sleep covers the HUD too.
	_fade = ColorRect.new()
	_fade.color = Color(Palette.ink)
	_fade.color.a = 0.0
	_fade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fade)

	# The reference binds a debug encounter to B and a boss to N. Kept, because a
	# diagnostic that can only reach a fight by walking until one happens is a
	# diagnostic nobody uses.
	for action in ["debug_battle", "debug_boss", "debug_map", "debug_shop", "debug_inn"]:
		if InputMap.has_action(action):
			InputMap.erase_action(action)
		InputMap.add_action(action)
	var b := InputEventKey.new()
	b.physical_keycode = KEY_B
	InputMap.action_add_event("debug_battle", b)
	var n := InputEventKey.new()
	n.physical_keycode = KEY_N
	InputMap.action_add_event("debug_boss", n)
	# The map walk moves off `menu`, which the menu itself now owns as it does in the
	# reference.
	var m := InputEventKey.new()
	m.physical_keycode = KEY_M
	InputMap.action_add_event("debug_map", m)
	# The shop and the inn, without walking to them. Ninety-nine of the people in this
	# world keep one, and reaching the nearest on foot is a poor way to check a screen.
	var k := InputEventKey.new()
	k.physical_keycode = KEY_K
	InputMap.action_add_event("debug_shop", k)
	var l := InputEventKey.new()
	l.physical_keycode = KEY_L
	InputMap.action_add_event("debug_inn", l)

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
	_ctx.on_music = func(track, opts):
		print("SCENE_MUSIC %s" % track)
		Sound.play_music(String(track), float(opts.get("fade", 1.2)))
	_ctx.on_goto_map = func(id, _spawn):
		print("SCENE_GOTO %s" % id)

	_label = Label.new()
	_label.add_theme_font_size_override("font_size", 20)
	_label.add_theme_color_override("font_color", Palette.ui_color("text"))
	_label.position = Vector2(24, 18)
	add_child(_label)

	if _loaded_from.is_empty():
		_open(0)
	else:
		_resume(_loaded_from)
	set_process(true)


func _open(index: int, spawn := "default") -> void:
	_index = posmod(index, _ids.size())
	var id := _ids[_index]
	var def := MapBuilder.resolve(_db.maps[id], _party.world_state)
	_field = FieldSim.new(def, _db.legend, _db.footprints, spawn,
		_db.encounters, RngStreams.encounter)
	_last_event = ""
	# The map's own theme, from the resolved definition — so a ruined town plays what the
	# ruin says and not what the town used to.
	_play_map_music(1.4)
	# One line per map opened, so `tools/web-smoke.mjs` can prove the field runs in
	# a browser rather than only in the editor — and so a map that builds an empty
	# grid is visible as numbers rather than as a blank screen.
	print("FIELD_READY map=%s tiles=%dx%d colliders=%d triggers=%d" % [
		id, _field.built.width, _field.built.height,
		_field.grid.shapes.size(), _field.grid.triggers.size()])


## Whatever this map plays. Held in one place because five callers need to put it back:
## a fight, a shop, an inn, a scene and a load all take the music away for a while.
func _play_map_music(fade := 1.2) -> void:
	var def := MapBuilder.resolve(_db.maps[_ids[_index]], _party.world_state)
	var track := String(def.get("music", ""))
	if not track.is_empty():
		Sound.play_music(track, fade)


func _process(delta: float) -> void:
	# The clock, first and unconditionally. The reference adds a tick's worth of time on
	# every simulation step whatever is on screen — a menu, a fight, a conversation — so
	# a save slot's "3:41" is time spent playing rather than time spent walking.
	#
	# `steps` is left at zero on purpose: the reference has the field and serialises it,
	# and nothing has ever incremented it. A port that started counting would put a number
	# in a save that the JS build would then contradict.
	if _party != null:
		_party.play_time += delta
	# A fight owns the screen outright: it has its own turn clock, and a field that kept
	# walking underneath would be accumulating encounter distance during a battle.
	if _battle != null and _battle.visible:
		# The grid and its HUD stay behind the fight rather than showing through it.
		_label.visible = false
		return
	# The menu likewise: it is a full screen, and a party walking behind it would be
	# accumulating encounter distance while somebody reads their equipment.
	if _menu != null and _menu.visible:
		_label.visible = false
		return
	if _shop != null and _shop.visible:
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
	if Input.is_action_just_pressed("debug_shop"):
		_talk_to_keeper("shop")
		return
	if Input.is_action_just_pressed("debug_inn"):
		_talk_to_keeper("inn")
		return
	if Actions.just_pressed("special"):
		# On demand, so the browser check can start a scene without walking to one.
		_run_event("harrowmere_intro")
		return
	if Actions.just_pressed("cancel"):
		get_tree().change_scene_to_file("res://scenes/title.tscn")
		return
	if Actions.just_pressed("menu"):
		_menu.open(_party, _db)
		return
	if Input.is_action_just_pressed("debug_map"):
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
	# The autosave, on arriving somewhere new — the reference's rule, and its reasoning:
	# a wipe is rare enough that the game never trains the habit of saving, so the one
	# time it takes something away the player has almost certainly not saved recently.
	# Failures are swallowed: a full store must never be the reason somebody cannot walk
	# through a door.
	Saves.save(Saves.AUTOSAVE_SLOT, _party, {
		"map_id": map_id, "spawn": spawn,
		"position": {"x": _field.player.x, "z": _field.player.z,
			"facing": _field.player.facing},
		"location_name": String(_db.maps[map_id].get("name", "the road")),
	})


## Open the map a save was left on, at the position it was left at.
##
## Position and not just the map: saving in the middle of a dungeon and reloading at its
## entrance loses real progress, which is why the format carries both.
func _resume(data: Dictionary) -> void:
	var map_id := String(data.get("mapId", "harrowmere"))
	var at := _ids.find(map_id)
	if at < 0:
		push_warning("the save names a map this build does not have: %s" % map_id)
		_open(0)
		return
	var spawn: Variant = data.get("spawn", null)
	_open(at, String(spawn) if spawn != null else "default")
	var position: Variant = data.get("position", null)
	if position is Dictionary:
		_field.player.x = float(position.get("x", _field.player.x))
		_field.player.z = float(position.get("z", _field.player.z))
		_field.player.facing = float(position.get("facing", _field.player.facing))
		_field.player.target_facing = _field.player.facing
		_field.camera.look = Vector3(_field.player.x, _field.camera.height, _field.player.z)
	print("RESUMED map=%s at %.2f,%.2f" % [map_id, _field.player.x, _field.player.z])


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
	if lines.is_empty() and not (def.has("shop") or def.has("inn")):
		return
	_scene_running = true
	print("TALK %s lines=%d" % [String(def.get("id", "?")), lines.size()])
	if not lines.is_empty():
		await _dialogue.speak(name, lines)
	# Whatever they keep, after what they had to say. Their own line first is the
	# reference's order and it is the reason a shopkeeper has a personality at all.
	if def.has("shop"):
		_scene_running = false
		if _shop.open(String(def["shop"]), _party, _db):
			Sound.play_music("shop", 0.4)
		return
	if def.has("inn"):
		await _rest_at_inn(def.get("inn", {}), name)
	_scene_running = false


## A night at an inn: the price, the fade, the rest, the fade back.
##
## The beat is the reference's, waits and all. A rest that snapped the HP bars full
## without the screen going dark reads as a bug rather than as a night.
func _rest_at_inn(inn: Dictionary, name: String) -> void:
	var price := int(inn.get("price", 30))
	var choice := await _dialogue.ask("A room is %d gil. Rest?" % price,
		["Rest", "Not now"], {"speaker": name, "cancelable": true})
	if choice != 0:
		_dialogue.close()
		return
	if not _party.spend_gold(price):
		await _dialogue.speak(name, ["You haven\'t the coin. Come back when you have."])
		return
	_dialogue.close()
	print("INN_REST price=%d gold=%d" % [price, _party.gold])
	Sound.play_music("inn", 0.5)
	await _fade_to(1.0, 1.0)
	_party.rest_all()
	var rested: Array = []
	for id in _party.active:
		var m: Party.Member = _party.roster[id]
		rested.append("%s:%d/%d:%d/%d" % [id, m.hp, m.max_hp(), m.mp, m.max_mp()])
	print("INN_WOKE %s" % " ".join(rested))
	await _fade_to(0.0, 1.0)
	_play_map_music(1.2)
	await _dialogue.speak(null, ["The party wakes rested. HP and MP fully restored."])
	# Said out loud because the night ends *after* the fade and the line, and anything
	# checking this wants to know when the field is walkable again rather than guess from
	# how long a fade takes.
	print("INN_DONE")


func _fade_to(alpha: float, seconds: float) -> void:
	var tween := create_tween()
	tween.tween_property(_fade, "color:a", alpha, seconds)
	await tween.finished


## Talk to whoever on this map keeps a shop or an inn.
##
## The real path, from the map's own data — a debug key that opened a hard-coded shop
## would pass while the maps said something else entirely.
func _talk_to_keeper(kind: String) -> void:
	var def: Dictionary = _db.maps[_ids[_index]]
	for npc in def.get("npcs", []):
		if npc.has(kind):
			_talk_to({"def": npc})
			return
	print("NO_%s_HERE %s" % [kind.to_upper(), _ids[_index]])


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
	# The place gets its theme back. The victory cue is a track in the reference too, so
	# something has to put the town back afterwards.
	_play_map_music(1.4)
	# Whatever the fight did to the party stays done. A defeat is not handled here —
	# a game over belongs with the title screen, which is a later piece.
	print("BATTLE_CLOSED result=%s" % result)


## Play a scene, then put the map's music back — a scene that changed the track owns it
## only while it runs.
func _run_event(id: String) -> void:
	if _scene_running:
		return
	_scene_running = true
	_last_event = id
	print("SCENE_START %s" % id)
	var known: bool = await Events.run(id, _ctx)
	_dialogue.close()
	print("SCENE_END %s known=%s" % [id, str(known)])
	_play_map_music(1.4)
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
	lines.append("move / run · Q,E orbit · C menu · M next map · V scene · B fight · N boss"
		+ " · K shop · L inn · Esc back")
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
