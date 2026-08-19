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
const SceneryBuilder := preload("res://scripts/world/scenery.gd")
const CastBuilder := preload("res://scripts/world/cast_models.gd")

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
## The world, in three dimensions. A Node3D under a Control still renders into the
## viewport's own 3D world, so the diagnostic overlay can sit on top of it.
var _world: Node3D
var _scenery: Scenery
var _camera: Camera3D
var _walker: Node3D
var _cast: CastModels
## One model per villager on this map, in the field's own npc order.
var _crowd: Array[Node3D] = []
## What the walker is doing, so a clip is only restarted when it changes.
var _walker_clip := ""
var _sun: DirectionalLight3D
var _environment: Environment
var _place: Label
var _prompt: Label
var _bar: HBoxContainer
## The top-down grid, which is what this screen used to be. Kept behind a key: it is the
## only view that shows collision and walkability at once, and that is worth having when the
## scenery starts disagreeing with the simulation.
var _show_grid := false


func _ready() -> void:
	_db = Database.new()
	if not _db.load_all():
		push_error("data tables did not load")
		return
	Palette.adopt(_db.palette)
	Actions.build(_db.input)
	# The command table, which the battle menu reads for its labels, its kinds and its moves.
	# Static like the palette, and just as invisible when nobody adopts it: the menu showed
	# "pilfer" where it should have said "Pilfer", because `label()` falls back to the id.
	Commands.adopt(_db.commands)

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
	var after_defeat: bool = Saves.pending_after_defeat
	Saves.pending = {}
	Saves.pending_after_defeat = false
	if not pending.is_empty():
		_party = Saves.restore_party(pending.get("party", {}), _db)
		_loaded_from = pending
		if after_defeat:
			# Standing the party up, as the reference does after a game over: arriving from
			# one with somebody still at zero sends the player back into what killed them.
			_party.rest_all()
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
	# Loading from inside the menu. The party and the map belong here, so the menu asks
	# and this does it — the same path the title's Continue takes, so there is one way
	# to open a save rather than two.
	_menu.load_requested.connect(func(data: Dictionary):
		Saves.pending = data
		get_tree().reload_current_scene())
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
	for action in ["debug_battle", "debug_boss", "debug_map", "debug_shop", "debug_inn",
			"debug_lose", "debug_grid", "debug_chest"]:
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
	# And the losing end. The rollback is the piece with the reasoning in it — a theme, a
	# line saying where the player is being sent and how much time they lost, and a reload
	# — and reaching it by actually being killed is not something a check can arrange.
	var o := InputEventKey.new()
	o.physical_keycode = KEY_P
	InputMap.action_add_event("debug_lose", o)
	# The old top-down view, on demand. It is the only picture that shows walkability and
	# collision together, which is exactly what is needed when the scenery and the
	# simulation start disagreeing.
	var g := InputEventKey.new()
	g.physical_keycode = KEY_G
	InputMap.action_add_event("debug_grid", g)
	# The nearest chest, without walking to it. There are 383 of them and their positions are
	# authored; finding one on foot is a poor way to check that opening one works.
	var t := InputEventKey.new()
	t.physical_keycode = KEY_T
	InputMap.action_add_event("debug_chest", t)

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

	_build_world()

	# Where you are, said once on arrival and then gone. The reference does the same, and it
	# is the only text a player needs on a field screen.
	_place = Label.new()
	_place.add_theme_font_size_override("font_size", 46)
	_place.add_theme_color_override("font_color", Palette.ui_color("text"))
	_place.add_theme_constant_override("shadow_offset_y", 2)
	_place.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_place.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	_place.anchor_right = 1.0
	_place.offset_top = 90.0
	_place.modulate.a = 0.0
	add_child(_place)

	# What confirm would do, where the reference puts it: over the party's head, and only
	# when there is something to do. Without it a player has no way to know that the person
	# they are standing next to can be spoken to at all.
	_prompt = Label.new()
	_prompt.add_theme_font_size_override("font_size", 30)
	_prompt.add_theme_color_override("font_color", Palette.ui_color("select"))
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_prompt.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_prompt.offset_top = -300.0
	_prompt.offset_bottom = -250.0
	add_child(_prompt)

	_build_control_bar()

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
	# Which chests here are already empty. The party carries that, which is to say the save
	# file does: the reference kept it on the shared map definition once, and all 383 chests in
	# the game reopened on reload.
	for chest_key in _party.opened_chests:
		var parts: PackedStringArray = String(chest_key).split(":")
		if parts.size() == 2 and parts[0] == id:
			_field.opened_chests[parts[1]] = true
	_last_event = ""
	if _scenery != null:
		_scenery.build(def, _field.built, _db.legend.get("glyphs", {}))
	# The map's own sky, sun and haze. It is the difference between a village at noon and a
	# marsh under cloud, and it is authored in the map table rather than anywhere here.
	Atmosphere.apply(_environment, _sun, def)
	_spawn_crowd()
	_follow_camera()
	# The map's own theme, from the resolved definition — so a ruined town plays what the
	# ruin says and not what the town used to.
	_play_map_music(1.4)
	# One line per map opened, so `tools/web-smoke.mjs` can prove the field runs in
	# a browser rather than only in the editor — and so a map that builds an empty
	# grid is visible as numbers rather than as a blank screen.
	print("FIELD_READY map=%s tiles=%dx%d colliders=%d triggers=%d" % [
		id, _field.built.width, _field.built.height,
		_field.grid.shapes.size(), _field.grid.triggers.size()])
	_announce(def)


## The 3D world: a camera, a sun, and somewhere for the scenery to hang.
##
## The environment is deliberately plain. The reference's look came from a toon and ink
## post-processing chain built for primitive geometry, and this port exists to replace that
## geometry — so what is here is Godot's own lighting on hand-made models, and the art
## direction is the palette and the reference's own texture plates.
func _build_world() -> void:
	_world = Node3D.new()
	add_child(_world)

	_scenery = SceneryBuilder.new()
	_world.add_child(_scenery)

	_camera = Camera3D.new()
	_camera.fov = 55.0
	_camera.far = 400.0
	_world.add_child(_camera)
	_camera.make_current()

	_sun = DirectionalLight3D.new()
	_sun.rotation = Vector3(deg_to_rad(-52.0), deg_to_rad(-38.0), 0.0)
	_sun.light_energy = 1.35
	_sun.shadow_enabled = true
	_world.add_child(_sun)

	_environment = Environment.new()
	_environment.background_mode = Environment.BG_COLOR
	_environment.background_color = Palette.ramp_at("water", 0.15)
	_environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_environment.ambient_light_color = Palette.ramp_at("stone", 0.75)
	_environment.ambient_light_energy = 0.55
	var holder := WorldEnvironment.new()
	holder.environment = _environment
	_world.add_child(holder)

	# Somebody to be, and it has to be the right somebody: `CastModels` picks the mesh the
	# reference picks for whoever is leading the party, from the same table and the same hash.
	_cast = CastBuilder.new(_db)
	_spawn_walker()


## Show or hide the field's own furniture, so a menu or a fight has the screen to itself.
func _set_field_hud(showing: bool) -> void:
	if _bar != null:
		# Not over a conversation: the box is at the bottom of the screen and so is the bar.
		_bar.visible = showing and not (_dialogue != null and _dialogue.is_open)
	if _prompt != null:
		_prompt.visible = showing
	if _place != null:
		_place.visible = showing


## The controls, along the bottom.
##
## The reference's control bar is the game's statement of what its controls *are* — the
## keys come from the same `input` table the bindings do, so a rebound key changes the bar
## without anybody editing it. What is not ported is that its bar is clickable: it doubles
## as a touch pad, and on a phone it is the only way to play. That is a real loss and it is
## named rather than hidden; a Godot build with 37 MB of engine to download is a poor phone
## game either way, and the web build is still at /js/ for anybody on one.
func _build_control_bar() -> void:
	_bar = HBoxContainer.new()
	_bar.add_theme_constant_override("separation", 34)
	_bar.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	_bar.offset_top = -104.0
	_bar.offset_bottom = -34.0
	add_child(_bar)

	# The labels and the hints are the reference's, in its order, from `controls.json`. "Talk"
	# for confirm and "Enter" rather than "Z" are decisions about how to explain the game to
	# somebody who has just arrived, and deriving them from the key table instead would tell
	# them to press Z.
	var pairs: Array = []
	var move: Array = _db.controls.get("move", [])
	if not move.is_empty():
		# Read in the order a keyboard reads them rather than the order a cross is drawn in:
		# the reference's pad is positional — up, left, right, down — and a text bar that
		# copies that order says "WADS".
		var by_action := {}
		for entry in move:
			by_action[String(entry.get("action", ""))] = String(entry.get("hint", ""))
		var keys := ""
		for action in ["up", "left", "down", "right"]:
			keys += String(by_action.get(action, ""))
		pairs.append(["Move", keys])
	for entry in _db.controls.get("bar", []):
		# Nothing that belongs to a fight, and nothing this port has not got: `Pause` and
		# `Flee` are the reference's and are left out rather than shown and ignored.
		if bool(entry.get("battleOnly", false)) or entry.get("action", null) == null:
			continue
		var label := String(entry.get("label", ""))
		var hint := String(entry.get("hint", ""))
		# Two buttons with one name become one entry with two keys: the reference has a Turn
		# button for each direction because you can click them, and "Turn Q · Turn E" reads as
		# a mistake.
		if not pairs.is_empty() and String(pairs[-1][0]) == label:
			pairs[-1][1] = "%s %s" % [String(pairs[-1][1]), hint]
			continue
		pairs.append([label, hint])
	for pair in pairs:
		var column := VBoxContainer.new()
		column.add_theme_constant_override("separation", 0)
		var label := Label.new()
		label.text = String(pair[0])
		label.add_theme_font_size_override("font_size", 20)
		label.add_theme_color_override("font_color", Palette.ui_color("text"))
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		column.add_child(label)
		var hint := Label.new()
		hint.text = String(pair[1])
		hint.add_theme_font_size_override("font_size", 16)
		hint.add_theme_color_override("font_color", Palette.ui_color("textDim"))
		hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		column.add_child(hint)
		_bar.add_child(column)


## Say where this is, then get out of the way.
func _announce(def: Dictionary) -> void:
	if _place == null:
		return
	var name := String(def.get("name", ""))
	var subtitle := String(def.get("subtitle", ""))
	_place.text = name if subtitle.is_empty() else "%s — %s" % [name, subtitle]
	_place.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(_place, "modulate:a", 1.0, 0.5)
	tween.tween_interval(1.8)
	tween.tween_property(_place, "modulate:a", 0.0, 0.9)


## The party's leader, as a model.
##
## Rebuilt rather than retinted when the lead changes, because a different character is a
## different mesh: nine models across fourteen people, by the reference's own cast list.
func _spawn_walker() -> void:
	if _walker != null:
		_walker.queue_free()
		_walker = null
	_walker_clip = ""
	var lead: Array = _party.active_members()
	if lead.is_empty():
		return
	var def: Dictionary = lead[0].def
	var look: Dictionary = Dictionary(def.get("look", {})).duplicate()
	look["id"] = def.get("id", "")
	# At the height the character sheet gives them, so Bastian looms over Tam by the ten
	# centimetres the writing says he does.
	_walker = _cast.character(look, float(look.get("height", 1.7)))
	if _walker == null:
		push_warning("no model for the party leader — the field is empty")
		return
	_world.add_child(_walker)
	_cast.play_character_clip(_walker, "idle")


## Everybody who lives here.
##
## Placed once per map with the clip the map gives them — a keeper works, a guest sits, a
## villager loiters — and left alone after that. They are already colliders: the field adds one
## per NPC and `field-parity.mjs` checks them, so these models are only the part you can see.
func _spawn_crowd() -> void:
	for node in _crowd:
		if node != null:
			node.queue_free()
	_crowd.clear()
	if _cast == null or _field == null:
		return
	for npc in _field.npcs:
		var def: Dictionary = npc.get("def", {})
		var look: Variant = def.get("look", null)
		if not (look is Dictionary):
			continue
		var with_id: Dictionary = Dictionary(look).duplicate()
		with_id["id"] = def.get("id", "")
		var node := _cast.character(with_id, float(Dictionary(look).get("height", 1.7)))
		if node == null:
			continue
		node.position = Vector3(float(npc["x"]), 0.0, float(npc["z"]))
		node.rotation.y = float(npc["facing"])
		_world.add_child(node)
		_crowd.append(node)
		# `clip` is the map's own word for what this person is doing.
		_cast.play_character_clip(node, String(def.get("clip", "loiter")))
	print("CROWD map=%s people=%d" % [_ids[_index], _crowd.size()])


## Point the camera where the simulation says it is.
##
## The rig is the reference's, ported and checked: `Field.Camera` holds the bearing, the
## detents, the smoothing and the lead, and `position()` is where that puts the eye. Nothing
## about the view is invented here.
func _follow_camera() -> void:
	if _camera == null or _field == null:
		return
	var eye := _field.camera.position()
	_camera.position = eye
	_camera.look_at(_field.camera.look, Vector3.UP)
	if _walker != null:
		_walker.position = Vector3(_field.player.x, 0.0, _field.player.z)
		# Turned to face the way they are walking, plus half a turn: these models face -Z and
		# the field's `facing` is measured from +Z, which is the same convention the camera
		# rig uses.
		_walker.rotation.y = _field.player.facing + PI
		# Walking, running or standing — the reference's own three, chosen by how fast the
		# simulation says the party is moving rather than by which key is down, so a party
		# pushed along by anything else animates too.
		var speed: float = _field.player.speed
		var wanted := "idle"
		if speed > 4.5:
			wanted = "run"
		elif speed > 0.2:
			wanted = "walk"
		if wanted != _walker_clip:
			_walker_clip = wanted
			_cast.play_character_clip(_walker, wanted)


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
		_set_field_hud(false)
		return
	# The menu likewise: it is a full screen, and a party walking behind it would be
	# accumulating encounter distance while somebody reads their equipment.
	if _menu != null and _menu.visible:
		_label.visible = false
		_set_field_hud(false)
		return
	if _shop != null and _shop.visible:
		_label.visible = false
		_set_field_hud(false)
		return
	_set_field_hud(true)
	# The diagnostic read-out lives behind the same key as the grid it describes. It is the
	# most useful screen in this project and the last thing a player should be shown.
	_label.visible = _show_grid
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
	if Input.is_action_just_pressed("debug_grid"):
		_show_grid = not _show_grid
		queue_redraw()
	if Input.is_action_just_pressed("debug_lose"):
		_lose()
		return
	if Input.is_action_just_pressed("debug_chest"):
		_open_nearest_chest()
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
	# Cancel does *not* leave the world. It used to jump straight back to the title screen —
	# no confirmation, no save — so one stray press threw away wherever the party had walked
	# to. The reference's Back button is for backing out of a screen, and on the field there is
	# nothing to back out of.
	if Actions.just_pressed("cancel"):
		_menu.open(_party, _db)
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

	# Talking, opening, examining. The prompt says which, and confirm does it.
	_interact = _field.interact_target()
	if not _interact.is_empty() and Actions.just_pressed("confirm"):
		match String(_interact.get("kind", "")):
			"npc":
				_talk_to(_interact["npc"])
			"chest":
				_open_chest(_interact["prop"])
			"object":
				_examine(_interact["prop"])
		return
	_trigger = result["trigger"]
	_follow_camera()
	_update_prompt()
	queue_redraw()
	_update_label()


var _encounters := 0
var _trigger: Dictionary = {}


## What confirm would do here, if anything.
func _update_prompt() -> void:
	if _prompt == null:
		return
	if not _interact.is_empty():
		var who := ""
		if String(_interact.get("kind", "")) == "npc":
			who = String(_interact["npc"]["def"].get("name", ""))
		_prompt.text = String(_interact["label"]) if who.is_empty() \
			else "%s  %s" % [String(_interact["label"]), who]
		return
	# A door says where it goes. The reference offers the same thing at an exit, and a village
	# whose gates are unmarked is a village nobody leaves on purpose.
	if not _trigger.is_empty() and String(_trigger.get("kind", "")) == "exit":
		var data: Dictionary = _trigger.get("data", {})
		_prompt.text = String(data.get("prompt", "")) if data.has("prompt") else ""
		return
	_prompt.text = ""


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


## A chest.
##
## Recorded before the contents are granted, and on the party rather than on the map: the
## chest is open the moment it is opened, and anything that interrupts what follows — a
## conversation, a change of map — must not leave the contents granted and the chest shut.
func _open_chest(prop: Dictionary) -> void:
	var id := String(prop.get("id", ""))
	var map_id := _ids[_index]
	_party.open_chest(map_id, id)
	_field.opened_chests[id] = true
	_scene_running = true
	Sound.sfx("chest")
	print("CHEST %s:%s" % [map_id, id])
	await _grant(prop.get("contains", {}))
	_scene_running = false
	# Said at the end rather than at the start: the contents are a conversation, and anything
	# waiting to do something else has to know the box has closed.
	print("CHEST_DONE %s" % id)


## What was in it. The reference's four kinds, in its words, with its one flourish: magicite
## gets its own cue, because finding one is the game's main progression beat and it should not
## sound like finding a hat.
func _grant(contents: Variant) -> void:
	if not (contents is Dictionary) or Dictionary(contents).is_empty():
		await _dialogue.speak(null, ["It is empty."])
		return
	var spec: Dictionary = contents
	var label := String(spec.get("label", ""))
	match String(spec.get("kind", "")):
		"item", "key":
			var item_id := String(spec.get("id", ""))
			var count := int(spec.get("count", 1))
			_party.add_item(item_id, count)
			if label.is_empty():
				label = String(_db.items.get(item_id, {}).get("name", "something"))
			print("FOUND kind=item id=%s count=%d" % [item_id, count])
			await _dialogue.speak(null, ["Found %s." % label])
		"gold":
			var amount := int(spec.get("amount", 0))
			_party.add_gold(amount)
			# Not `gold=` — anything watching this log for a party's balance would read an
			# amount found as a balance, and the inn's bill was checked against 150.
			print("FOUND kind=gold amount=%d" % amount)
			await _dialogue.speak(null, ["Found %d gil." % amount])
		"esper":
			var esper_id := String(spec.get("id", ""))
			var esper: Dictionary = _db.espers.get(esper_id, {})
			_party.add_esper(esper_id)
			print("FOUND kind=esper id=%s" % esper_id)
			Sound.play_music("esper", 0.6)
			var lines: Array = ["A shard of magicite — %s." % String(esper.get("name", esper_id))]
			var flavour := String(esper.get("flavour", ""))
			if not flavour.is_empty():
				lines.append(flavour)
			lines.append("Equip it from the Espers menu to begin learning its magic.")
			await _dialogue.speak(null, lines)
			_play_map_music(1.4)
		_:
			await _dialogue.speak(null, ["Nothing of use."])


## A prop with something to say. Signposts, notice boards, the things the maps ask to be
## examined rather than opened.
func _examine(prop: Dictionary) -> void:
	var data: Dictionary = prop.get("interact", {})
	# A save point. The reference asks through its dialogue box; this opens the same slot list
	# the menu uses, so there is one save screen rather than two.
	if bool(data.get("save", false)):
		print("SAVE_POINT %s" % String(prop.get("id", "?")))
		Sound.sfx("confirm")
		_menu.open_save(_party, _db)
		return
	# Some of them are scenes rather than signs: the marks on the well rim are a whole
	# conversation, and it is authored as an event.
	if data.has("event"):
		_run_event(String(data["event"]))
		return
	var lines: Array = []
	var text: Variant = data.get("text", data.get("lines", null))
	if text is Array:
		lines = text
	elif text != null:
		lines = [String(text)]
	if lines.is_empty():
		return
	_scene_running = true
	print("EXAMINED %s" % String(prop.get("id", "?")))
	# The prop's own name as the speaker where it has one — "Village Well" over a paragraph
	# about the water reads as a label rather than as somebody talking.
	var speaker: Variant = data.get("name", data.get("speaker", null))
	await _dialogue.speak(speaker, lines)
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


## Open the nearest chest on this map that still has something in it.
func _open_nearest_chest() -> void:
	var tile := float(_db.legend.get("tile", 2))
	var best: Dictionary = {}
	var best_distance := INF
	for prop in _db.maps[_ids[_index]].get("props", []):
		if String(prop.get("kit", "")) != "chest":
			continue
		if _field.opened_chests.has(String(prop.get("id", ""))):
			continue
		var at: Array = prop.get("at", [0, 0])
		var d := sqrt(pow(_field.player.x - float(at[0]) * tile, 2.0)
			+ pow(_field.player.z - float(at[1]) * tile, 2.0))
		if d < best_distance:
			best_distance = d
			best = prop
	if best.is_empty():
		print("NO_CHEST_HERE %s" % _ids[_index])
		return
	_open_chest(best)


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
	# The world stays where it is and stops being drawn: the fight has its own camera and its
	# own floor, and both live in the same 3D world as the field.
	if _world != null:
		_world.visible = false
	# The ground the party was standing on, so a fight on the Silt Road happens on the Silt
	# Road rather than on a default green.
	var def := MapBuilder.resolve(_db.maps[_ids[_index]], _party.world_state)
	var ground := String(_scenery.plan.get("ground", {}).get(
		String(def.get("base", "grass")), {}).get("texture", "grass.png"))
	_battle.begin(_party, group, _db, ground, def)


func _note_no_encounter() -> void:
	print("BATTLE_NONE nothing to fight here")


func _on_battle_finished(result: String) -> void:
	_battle.visible = false
	if _world != null:
		_world.visible = true
	_follow_camera()
	print("BATTLE_CLOSED result=%s" % result)
	if result == "defeat":
		_lose()
		return
	# The place gets its theme back. The victory cue is a track in the reference too, so
	# something has to put the town back afterwards.
	_play_map_music(1.4)


## A wipe.
##
## Back to the last save, and *said* — which is the reference's hard-won point. Standing the
## dead party up where they fell costs the defeat all its meaning and drops them in the
## middle of whatever killed them; rolling them back without telling them where to or how
## much they lost is indistinguishable from the game losing their progress by accident.
func _lose() -> void:
	_scene_running = true
	Sound.play_music("gameover", 0.6)
	print("PARTY_WIPED")
	var last := Saves.latest()
	if last.is_empty():
		# Never saved. The run restarts rather than dead-ending.
		await _dialogue.speak(null, ["The party falls.\n\nBeginning again at Harrowmere."])
		_party.rest_all()
		_open(0)
		_scene_running = false
		return
	var where := String(last.get("locationName", "an earlier point"))
	var when := Saves.format_time(float(last.get("party", {}).get("playTime", 0.0)))
	await _dialogue.speak(null, ["The party falls.\n\nReturning to %s — %s played."
		% [where, when]])
	print("ROLLED_BACK to=%s" % where)
	Saves.pending = last
	Saves.pending_after_defeat = true
	get_tree().reload_current_scene()


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
		+ " · K shop · L inn · T chest · P wipe · G grid · Esc back")
	_label.text = "\n".join(lines)


## Drawn top-down, scaled to fit, north up. Not a camera view: the point is to see
## the grid and the colliders at once, which a camera at the player's shoulder
## cannot do.
func _draw() -> void:
	if _field == null or not _show_grid:
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
