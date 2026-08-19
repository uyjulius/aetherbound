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
## What each of them is doing, so a clip is only restarted when it changes.
var _crowd_clips: Array[String] = []
## The party behind the leader, and what each of them is doing.
var _followers: Array[Node3D] = []
var _follower_clips: Array[String] = []
var _field_followers: Array = []
## What the walker is doing, so a clip is only restarted when it changes.
var _walker_clip := ""
var _ship: Node3D
var _sun: DirectionalLight3D
var _environment: Environment
var _place: Label
var _prompt: Label
var _warn: Label
var _bar: HBoxContainer
var _pad: GridContainer
var _pad_backing: PanelContainer
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
			"debug_lose", "debug_grid", "debug_chest", "debug_fly", "debug_scene"]:
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
	# The ship, which is won two thirds of the way through the story. Reaching it by playing
	# there is not something a check can do, and the reach of the ship is what decides whether
	# two of the continents can be visited at all.
	var y := InputEventKey.new()
	y.physical_keycode = KEY_Y
	InputMap.action_add_event("debug_fly", y)
	# A story scene with a fight in it, on demand. Every boss in this game arrives inside a
	# scene — the scene sets the stage, the fight happens, and the scene hands over what was
	# behind it — and until the fight was real, all three of those were untested together. The
	# barrow is the first one the party would reach.
	var j := InputEventKey.new()
	j.physical_keycode = KEY_J
	InputMap.action_add_event("debug_scene", j)

	_ctx = Ctx.new("first", false)
	_ctx.database = _db
	_ctx.party = _party
	_ctx.dialogue = _dialogue
	# A scene that starts a fight gets a fight. This used to print a line and answer "victory",
	# which meant every boss in the game was won by being reached — including the two the story
	# branches on the outcome of.
	_ctx.on_battle = func(encounter, opts):
		return await _fight_for_scene(encounter, opts)
	# And a scene that hands something over hands it over. Every esper in the game arrives
	# through here; while this only printed, the whole magic system was unobtainable.
	_ctx.on_chest = func(spec):
		print("SCENE_CHEST %s" % str(spec))
		await _grant(spec)
	_ctx.on_music = func(track, opts):
		print("SCENE_MUSIC %s" % track)
		Sound.play_music(String(track), float(opts.get("fade", 1.2)))
	# A scene that moves the party moves the party. The cataclysm throws them out onto the road
	# above Harrowmere, and while this only printed they stayed standing in the ruin it had just
	# made of the place they were.
	_ctx.on_goto_map = func(id, spawn):
		print("SCENE_GOTO %s" % id)
		_travel(String(id), String(spawn) if spawn != null else "")
	_ctx.on_restore_theme = func(fade):
		_play_map_music(float(fade))
	_ctx.on_run_event = func(id):
		# One scene handing over to another. `_run_event` guards against re-entry, so the handover
		# goes straight to the runner rather than through it.
		print("SCENE_CHAIN %s" % id)
		await Events.run(String(id), _ctx)
	# The ground moving and the light going wrong. Both are the reference's, and both were
	# recorded calls that did nothing: the cataclysm shook for eleven seconds and the screen never
	# moved.
	_ctx.on_shake = func(amount, _frequency):
		_shake_camera(float(amount))
	_ctx.on_flash = func(colour, strength):
		_flash_screen(colour, float(strength))
	_ctx.on_autosave = func(reason):
		print("SCENE_AUTOSAVE %s" % reason)
		Saves.save(Saves.AUTOSAVE_SLOT, _party, {
			"map_id": _ids[_index], "spawn": "",
			"position": {"x": _field.player.x, "z": _field.player.z,
				"facing": _field.player.facing},
			"location_name": String(_db.maps[_ids[_index]].get("name", "the road")),
		})

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

	# And what is waiting on the other side of it, when that is worse than what is here. This
	# is the only difficulty signposting the game has: every door in the world is open from
	# the first minute, so a party can walk off the Harrowmere road into a zone written for
	# level 68 with nothing to stop them. The sentence is the stopping.
	_warn = Label.new()
	_warn.add_theme_font_size_override("font_size", 22)
	_warn.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_warn.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	_warn.offset_top = -254.0
	_warn.offset_bottom = -222.0
	add_child(_warn)

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
	# The ship, if it was left on this map. It is in the save file, so it is still there.
	if not _party.airship.is_empty() and String(_party.airship.get("map", "")) == id:
		_field.parked = {
			"x": float(_party.airship.get("x", 0.0)),
			"z": float(_party.airship.get("z", 0.0)),
			"facing": float(_party.airship.get("facing", 0.0)),
		}
	if _ship != null:
		_place_airship()

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
	_report_doors(def)
	# Once, on the first map that finishes building: everything a browser had to download and
	# parse before the game could be played is in by now, and how long that took is the number
	# that decides whether somebody on a slow connection ever sees the game at all.
	Telemetry.once("assets", Telemetry.ASSETS_LOADED, {
		"map": id, "props": _scenery.placed if _scenery != null else 0,
		"tiles": _scenery.tiles if _scenery != null else 0,
		"seconds": Time.get_ticks_msec() / 1000.0})
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
	_spawn_followers()


## Show or hide the field's own furniture, so a menu or a fight has the screen to itself.
func _set_field_hud(showing: bool) -> void:
	if _pad_backing != null:
		# The pad is the field's. A battle is a menu, and a d-pad over it would say the party
		# can be walked around mid-fight.
		_pad_backing.visible = showing and (_dialogue == null or not _dialogue.is_open)
	if _bar != null:
		# Not over a conversation: the box is at the bottom of the screen and so is the bar.
		_bar.visible = showing and not (_dialogue != null and _dialogue.is_open)
	if _prompt != null:
		_prompt.visible = showing
	if _warn != null:
		_warn.visible = showing
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
	# them to press Z. Each entry is `[label, hint, action, hold]`.
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
		pairs.append(["Move", keys, ""])
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
		# `hold` is the reference's own flag: turning the camera and running are held rather
		# than tapped, so the button presses on the way down and releases on the way up.
		pairs.append([label, hint, String(entry.get("action", "")),
			String(entry.get("action", "")) in ["pageLeft", "pageRight", "run"]])
	for pair in pairs:
		var action := String(pair[2]) if pair.size() > 2 else ""
		if action.is_empty():
			# `Move` is the pad's label, not a button: there is a pad for that.
			var column := VBoxContainer.new()
			column.add_theme_constant_override("separation", 0)
			column.add_child(_bar_label(String(pair[0]), 20, Palette.ui_color("text")))
			column.add_child(_bar_label(String(pair[1]), 16, Palette.ui_color("textDim")))
			_bar.add_child(column)
			continue
		_bar.add_child(_bar_button(String(pair[0]), String(pair[1]), action,
			pair.size() > 3 and bool(pair[3])))

	_build_pad()


## A press from the screen rather than the keyboard.
##
## Said out loud because it is otherwise unobservable from outside: Godot draws its interface
## into a canvas, so nothing about these buttons appears in the page — a check that wants to
## know the touch controls work has nothing to look at but this line.
func _tap_down(action: String) -> void:
	print("TAP %s" % action)
	# Which controls people actually use, and on what. The reference counts this to find out
	# whether the on-screen pad is worth its space.
	Telemetry.track(Telemetry.CONTROL_USED, {"action": action, "how": "tap"})
	Actions.virtual_press(action)


func _bar_label(text: String, size: int, colour: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", colour)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return label


## One button on the bar.
##
## Pressable, which is the whole point: the reference's bar doubles as the touch controls, and
## on a phone it is the only way to play at all. A tap goes through `Actions.virtual_press`,
## which delivers it as an input event — so the screens that count events rather than polling
## see it exactly as they see a key.
func _bar_button(label: String, hint: String, action: String, hold: bool) -> Button:
	var button := Button.new()
	button.flat = true
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(96, 62)
	button.text = "%s\n%s" % [label, hint]
	button.add_theme_font_size_override("font_size", 20)
	button.add_theme_color_override("font_color", Palette.ui_color("text"))
	button.add_theme_color_override("font_hover_color", Palette.ui_color("select"))
	button.autowrap_mode = TextServer.AUTOWRAP_OFF
	if hold:
		button.button_down.connect(func(): _tap_down(action))
		button.button_up.connect(func(): Actions.virtual_release(action))
	else:
		# Pressed and released in the same breath: a tap on Talk is a key going down and up,
		# and a screen that waits for the release would never see the press.
		button.pressed.connect(func():
			_tap_down(action)
			await get_tree().process_frame
			Actions.virtual_release(action))
	return button


## What each pad button says.
##
## The keys rather than arrows: Godot's default font has no ▲, and a pad of four empty boxes is
## worse than no pad. Saying "W" also tells a player on a keyboard what the button is for,
## which an arrow does not.
const PAD_KEYS := {"up": "W", "down": "S", "left": "A", "right": "D"}


## The movement pad, held to walk.
##
## Field only, as in the reference: a battle is a menu, and a d-pad over it would suggest the
## party can be walked around mid-fight.
func _build_pad() -> void:
	# On a dark panel, so a pad over grass is still legible.
	var backing := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(Palette.ink)
	style.bg_color.a = 0.42
	style.set_corner_radius_all(8)
	style.set_content_margin_all(8)
	backing.add_theme_stylebox_override("panel", style)
	backing.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	backing.offset_left = 30.0
	backing.offset_top = -244.0
	backing.offset_bottom = -30.0
	add_child(backing)

	_pad = GridContainer.new()
	_pad.columns = 3
	_pad.add_theme_constant_override("h_separation", 4)
	_pad.add_theme_constant_override("v_separation", 4)
	backing.add_child(_pad)
	_pad_backing = backing
	for row in [["", "up", ""], ["left", "", "right"], ["", "down", ""]]:
		for action in row:
			if String(action).is_empty():
				var gap := Control.new()
				gap.custom_minimum_size = Vector2(62, 62)
				_pad.add_child(gap)
				continue
			var glyph: String = PAD_KEYS[String(action)]
			var button := Button.new()
			button.flat = true
			button.focus_mode = Control.FOCUS_NONE
			button.custom_minimum_size = Vector2(62, 62)
			button.text = glyph
			button.add_theme_font_size_override("font_size", 26)
			button.add_theme_color_override("font_color", Palette.ui_color("text"))
			button.add_theme_color_override("font_hover_color", Palette.ui_color("select"))
			button.button_down.connect(func(): _tap_down(String(action)))
			button.button_up.connect(func(): Actions.virtual_release(String(action)))
			_pad.add_child(button)


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


## The rest of the party, walking behind.
##
## Rebuilt whenever the active party changes, because each of them is a different mesh: the
## formation screen can put anybody in the line.
func _spawn_followers() -> void:
	for node in _followers:
		if node != null:
			node.queue_free()
	_followers.clear()
	_follower_clips.clear()
	_field_followers = []
	var members: Array = _party.active_members()
	for i in range(1, members.size()):
		var def: Dictionary = members[i].def
		var look: Dictionary = Dictionary(def.get("look", {})).duplicate()
		look["id"] = def.get("id", "")
		var node := _cast.character(look, float(look.get("height", 1.7)))
		if node == null:
			continue
		if _world != null:
			_world.add_child(node)
		_followers.append(node)
		_follower_clips.append("")
		_cast.play_character_clip(node, "idle")


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
	_crowd_clips.clear()
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
		_crowd_clips.append(String(def.get("clip", "loiter")))
	print("CROWD map=%s people=%d" % [_ids[_index], _crowd.size()])


## Flying.
##
## The movement, the momentum, the clamp and the landing rule are all in `Field`, checked
## against the reference over four scripted flights — this only shows the ship and offers what
## the simulation says is available.
func _fly(delta: float) -> void:
	var offer := _field.update_airship(delta, Actions.move_vector(), Actions.is_down("run"))
	_place_airship()
	_follow_camera()
	# Flight writes the prompt itself and never reaches `_update_prompt`, so the door warning
	# is cleared here or it hangs on screen for the rest of the flight. An air crossing gets
	# no warning of its own: the reference does not warn on one either, and the party is
	# looking down at the place from above rather than being told about it.
	if _warn != null:
		_warn.text = ""

	var crossing: Dictionary = offer.get("crossing", {})
	if not crossing.is_empty():
		_prompt.text = String(crossing.get("prompt", "Cross"))
		if Actions.just_pressed("confirm"):
			# Crossing is the airship's whole reason to exist: the Meridian Reach has no road
			# to it. The ship comes along, parked wherever the party lands next.
			var to := String(crossing.get("to", ""))
			var spawn := String(crossing.get("spawn", "default"))
			print("CROSSED to=%s" % to)
			Telemetry.track(Telemetry.CROSSING_USED, {"from": _ids[_index], "to": to})
			_field.vehicle = {}
			_travel(to, spawn)
			# Still aboard on the other side, which is what "cross" means.
			_field.board()
			_place_airship()
		_update_label()
		return

	if bool(offer.get("landable", false)):
		_prompt.text = "Land"
		if Actions.just_pressed("confirm"):
			_field.disembark()
			_party.airship = {
				"map": _ids[_index],
				"x": float(_field.parked.get("x", 0.0)),
				"z": float(_field.parked.get("z", 0.0)),
				"facing": float(_field.parked.get("facing", 0.0)),
			}
			print("LANDED map=%s at %.2f,%.2f" % [_ids[_index],
				_field.player.x, _field.player.z])
			Telemetry.track(Telemetry.AIRSHIP_LANDED, {"map": _ids[_index]})
			_place_airship()
			_play_map_music(1.2)
	else:
		_prompt.text = ""
	_update_label()


## Where the hull is, and whether the party is inside it.
##
## One model, moved: boarding used to spawn a second ship beside the one already parked, which
## is the reference's own note.
func _place_airship() -> void:
	if _ship == null:
		var spec: Dictionary = _scenery.plan.get("kits", {}).get("airship", {})
		if spec.is_empty():
			return
		var scene_path := "res://assets/props/%s" % String(spec.get("file", ""))
		if not ResourceLoader.exists(scene_path):
			return
		var scene: PackedScene = load(scene_path)
		_ship = scene.instantiate()
		var scale := float(spec.get("scale", 1.0))
		_ship.scale = Vector3(scale, scale, scale)
		_world.add_child(_ship)
	var flying := not _field.vehicle.is_empty()
	var source: Dictionary = _field.vehicle if flying else _field.parked
	if source.is_empty():
		_ship.visible = false
		return
	_ship.visible = true
	_ship.position = Vector3(float(source["x"]),
		Field.AIRSHIP_ALTITUDE if flying else Field.AIRSHIP_PARKED_Y, float(source["z"]))
	_ship.rotation.y = float(source["facing"]) + PI
	# The party is inside it while it flies.
	if _walker != null:
		_walker.visible = not flying
	for node in _followers:
		if node != null:
			node.visible = not flying
	for node in _crowd:
		if node != null:
			node.visible = not flying


## Walk the party's line along the leader's path.
func _move_followers(delta: float) -> void:
	if _followers.is_empty():
		return
	_field_followers = _field.update_followers(delta, _followers.size())
	for i in mini(_followers.size(), _field_followers.size()):
		var node := _followers[i]
		if node == null:
			continue
		var follower: Dictionary = _field_followers[i]
		node.position = Vector3(float(follower["x"]), 0.0, float(follower["z"]))
		node.rotation.y = float(follower["facing"]) + PI
		var speed := float(follower["speed"])
		var wanted := "idle"
		if speed > Field.WALK_SPEED * 0.92:
			wanted = "run"
		elif speed > 0.2:
			wanted = "walk"
		if _follower_clips[i] != wanted:
			_follower_clips[i] = wanted
			_cast.play_character_clip(node, wanted)


## Walk the crowd's models to wherever the simulation has put them.
func _move_crowd() -> void:
	for i in mini(_crowd.size(), _field.npcs.size()):
		var node := _crowd[i]
		if node == null:
			continue
		var npc: Dictionary = _field.npcs[i]
		node.position = Vector3(float(npc["x"]), 0.0, float(npc["z"]))
		# Facing the same way the party's model does, and by the same half turn: these meshes
		# look down +Z and the field measures facing from there.
		node.rotation.y = float(npc["facing"]) + PI
		var wanted := "walk" if float(npc.get("speed", 0.0)) > 0.2 \
			else String(npc["def"].get("clip", "loiter"))
		if i < _crowd_clips.size() and _crowd_clips[i] != wanted:
			_crowd_clips[i] = wanted
			_cast.play_character_clip(node, wanted)


## Point the camera where the simulation says it is.
##
## The rig is the reference's, ported and checked: `Field.Camera` holds the bearing, the
## detents, the smoothing and the lead, and `position()` is where that puts the eye. Nothing
## about the view is invented here.
func _follow_camera() -> void:
	if _camera == null or _field == null:
		return
	var eye := _field.camera.position()
	if _shake > 0.001:
		# A wobble on the eye, not on the target: the camera keeps looking at the party while the
		# ground under all of it moves. Frame-indexed rather than random so a shake looks like a
		# shake instead of like noise.
		var beat := float(Engine.get_frames_drawn())
		eye += Vector3(sin(beat * 1.7), cos(beat * 2.3), sin(beat * 3.1)) * _shake * 0.35
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
		_report_pacing(delta)
	# The tremor dies away on its own, so a scene that shakes once shakes once.
	if _shake > 0.0:
		_shake = maxf(0.0, _shake - delta * 2.5)
		_follow_camera()
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
	if Input.is_action_just_pressed("debug_scene"):
		# Round the list rather than one fixed scene: the two things a scene does that nothing
		# else does are fight and hand something over, and they are in different scenes.
		var scene := String(DEBUG_SCENES[_debug_scene % DEBUG_SCENES.size()])
		_debug_scene += 1
		_run_event(scene)
		return
	if Input.is_action_just_pressed("debug_fly"):
		print("BOARDED map=%s" % _ids[_index])
		Telemetry.track(Telemetry.AIRSHIP_BOARDED, {"map": _ids[_index]})
		Sound.play_music("airship", 1.2)
		_field.board()
		_place_airship()
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

	# In the air, the ship is the whole of the update: the party is aboard, there is nothing to
	# collide with and no encounters to walk into.
	if not _field.vehicle.is_empty():
		_fly(delta)
		return

	# The villagers, before the party moves: thirty-one of them wander and the rest turn to
	# look at whoever has come close. Outside `Field.update` on purpose — their colliders travel
	# with them, and the harness drives that function step for step against the reference.
	_field.update_npcs(delta)
	_move_crowd()
	_move_followers(delta)

	var result := _field.update(delta, Actions.move_vector(), Actions.is_down("run"))
	if bool(result["stuck"]):
		# Three seconds of asking to move and not moving. The field notices; this is the report,
		# with everything a remote diagnosis would need, because the one thing that cannot be
		# reproduced locally is somebody else's wedged party.
		print("STUCK map=%s at %.2f,%.2f" % [_ids[_index], _field.player.x, _field.player.z])
		Telemetry.track(Telemetry.PLAYER_STUCK, {
			"map": _ids[_index], "x": _field.player.x, "z": _field.player.z,
			"standing_clear": _field.standing_clear(),
			"facing": rad_to_deg(_field.player.facing),
			"held": Actions.move_vector().length(),
			"scene_running": _scene_running,
			"world_state": _party.world_state,
			"play_seconds": _party.play_time})
	if float(result["unstuck"]) > 0.0:
		Telemetry.track(Telemetry.PLAYER_UNSTUCK, {
			"map": _ids[_index], "after_seconds": float(result["unstuck"])})
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
			"airship":
				print("BOARDED map=%s" % _ids[_index])
				Telemetry.track(Telemetry.AIRSHIP_BOARDED, {"map": _ids[_index]})
				Sound.play_music("airship", 1.2)
				_field.board()
				_place_airship()
			"object":
				_examine(_interact["prop"])
		return
	_trigger = result["trigger"]
	_follow_camera()
	_update_prompt()
	queue_redraw()
	_update_label()


var _encounters := 0
## True while a fight a scene asked for is on screen, so the scene keeps ownership of what
## happens when it ends.
var _scene_battle := false
## Set from the fight's own options while a scene's fight is on screen.
var _scene_allows_defeat := false
## How hard the ground is moving, decayed every frame.
var _shake := 0.0

## What `J` runs, in order. The barrow is the first boss the party would reach and the only
## place a scene's fight can be seen at all; the toll clerk is a scene that hands over a key
## item, which is the other half of what a scene can do to a party.
## The granting scene first: the fight in the other one is lost by a starting party, and losing
## rolls the world back, which is a poor state to ask a second scene to start in.
const DEBUG_SCENES := ["carter_pass", "fenbarrow_boss"]
## Static, so it survives the scene reload a rollback does: losing the barrow fight reloads the
## field, and a counter that started again would run the same boss scene for ever.
static var _debug_scene := 0
## Distance walked this session and time since the last pacing report. Neither is saved: see
## `_report_pacing`.
var _walked := 0.0
var _since_pacing := 0.0
var _trigger: Dictionary = {}


## What confirm would do here, if anything.
func _update_prompt() -> void:
	if _prompt == null:
		return
	_warn.text = ""
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
		_say_danger(String(data.get("to", "")), String(data.get("spawn", "")))
		return
	_prompt.text = ""


## How far this session has actually walked, every five minutes of it.
##
## From the distance the field reports rather than from `Party.steps`, and that is not a
## shortcut: `steps` is serialised into every save and has never been incremented by anything,
## on either side of the port, so the reference's own walking-distance event has always reported
## zero. Counting it here into a number that is never saved gives the pacing signal the event
## was for without changing what a save contains.
func _report_pacing(delta: float) -> void:
	_since_pacing += delta
	if _since_pacing < 300.0:
		return
	_since_pacing = 0.0
	Telemetry.track(Telemetry.STEPS_WALKED, {
		"distance": _walked, "play_minutes": _party.play_time / 60.0,
		"map": _ids[_index], "party_level": _party.average_level()})


## Where the party is is the most useful property on every other event, so it is registered
## rather than repeated at each call site — and the first arrival somewhere is worth its own
## event, because the walk that leads to it only happens once.
##
## Walking through a door the game warned about is the clearest possible signal that the
## difficulty gradient is not reading, so that gets said too.
func _report_arrival(map_id: String, spawn: String) -> void:
	var def: Dictionary = _db.map(map_id)
	var level := Danger.level_of(def, spawn, _db.encounters, _db.enemies)
	var arrival := {
		"map": map_id, "map_name": String(def.get("name", "")), "spawn": spawn,
		"party_level": _party.average_level(), "play_seconds": _party.play_time,
		"danger": level,
	}
	Telemetry.register({"map": map_id, "map_name": String(def.get("name", "")),
		"world_state": _party.world_state})
	Telemetry.track(Telemetry.MAP_ENTERED, arrival)
	var seen := "seen_%s" % map_id
	if not _party.has_flag(seen):
		_party.set_flag(seen)
		Telemetry.track(Telemetry.MAP_FIRST_SEEN, arrival)
		var gap := level - _party.average_level()
		if gap >= 12.0:
			var ignored := arrival.duplicate()
			ignored["level_gap"] = gap
			Telemetry.track(Telemetry.DOOR_WARNING_IGNORED, ignored)


## Every door out of this map, and what is standing on the other side of it.
##
## One line per map, for the same reason `FIELD_READY` is one line per map: the warning itself
## only appears when the party is standing at a particular door, and a check that had to walk
## to one would cover one door in the world. This covers all of them, on the map's own data
## and at the party's real level, which is the pair of inputs the sentence is a function of.
func _report_doors(def: Dictionary) -> void:
	var warned := 0
	var exits: Array = def.get("exits", [])
	for door in exits:
		var level := Danger.level_of(_db.map(String(door.get("to", ""))),
			String(door.get("spawn", "")), _db.encounters, _db.enemies)
		if not Danger.note(level, _party.average_level()).is_empty():
			warned += 1
	print("DOORS map=%s exits=%d warned=%d" % [
		String(def.get("id", "?")), exits.size(), warned])


## The warning under a door's name, if the place through it is worse than the place the party
## is standing in.
##
## Three bands and no numbers, as the reference has it: a party that has never been shown a
## level on an enemy should not be handed one on a signpost. The three colours are the
## stylesheet's — `select` and `danger` from the palette happen to be two of them, and the
## middle one is `.sign-warn-bad` and lives nowhere else.
##
## The unresolved map, deliberately: `Database.map` hands back the map as authored, which is
## what the reference's `mapDefinition` does too, so both sides read the pre-cataclysm
## encounter tables and both sides agree about the door.
func _say_danger(to: String, spawn: String) -> void:
	if _warn == null or to == "":
		return
	var said := Danger.note(
		Danger.level_of(_db.map(to), spawn, _db.encounters, _db.enemies),
		_party.average_level())
	if said.is_empty():
		_warn.text = ""
		return
	_warn.text = String(said["text"])
	# Once per door per session: the interesting number is how many players are told, not how
	# many frames the sentence was on screen for.
	Telemetry.once("warn:%s" % to, Telemetry.DOOR_WARNING_SHOWN, {
		"to": to, "tone": String(said["tone"]),
		"party_level": _party.average_level()})
	_warn.add_theme_color_override("font_color", {
		"warn": Color("#ffd76a"), "bad": Color("#ff9d63"), "grave": Color("#e0574f"),
	}.get(String(said["tone"]), Palette.ui_color("select")))


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
	_report_arrival(map_id, spawn)
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
	Telemetry.track(Telemetry.NPC_TALKED, {
		"map": _ids[_index], "npc": String(def.get("id", "")),
		"name": String(def.get("name", "")), "lines": lines.size()})
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
	Telemetry.track(Telemetry.CHEST_OPENED, {"map": map_id, "chest": id})
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
		Telemetry.track(Telemetry.SAVE_POINT_USED, {
			"map": _ids[_index], "point": String(prop.get("id", ""))})
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
	Telemetry.track(Telemetry.PROP_INSPECTED, {
		"map": _ids[_index], "prop": String(prop.get("id", "")),
		"kind": String(prop.get("kind", ""))})
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
	Telemetry.track(Telemetry.INN_RESTED, {
		"map": _ids[_index], "price": price, "gold_after": _party.gold})
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


## A fight a scene asked for, awaited, with its result handed back to the scene.
##
## Not `_start_battle`: that one rolls a group out of an encounter table and belongs to walking
## about. A scene names its formation exactly, and bosses are named formations.
##
## The result is what the scene branches on, so a defeat is *returned* rather than rolled back
## here — some scenes are written to be lost, and the ones that are not hand "defeat" straight
## back to `_run_event`, which lets the wipe happen after the scene has closed itself.
func _fight_for_scene(encounter: Dictionary, opts: Dictionary) -> String:
	print("SCENE_BATTLE enemies=%s" % str(encounter.get("enemies", [])))
	if _world != null:
		_world.visible = false
	var def := MapBuilder.resolve(_db.maps[_ids[_index]], _party.world_state)
	var ground := String(_scenery.plan.get("ground", {}).get(
		String(def.get("base", "grass")), {}).get("texture", "grass.png"))
	var formation := encounter.duplicate()
	# `boss` rides on the encounter, because that is where the battle model reads it, and the
	# music and the escape rule both hang off it.
	if bool(opts.get("boss", false)):
		formation["boss"] = true
	_scene_battle = true
	# The reference's rule, and its flag: a defeat in a scene's fight is a wipe unless the scene
	# says otherwise. Nothing in the game says otherwise today, and the flag is honoured anyway
	# rather than assumed away — a scene written to be lost is a thing this engine allows.
	_scene_allows_defeat = bool(opts.get("allowDefeat", false))
	# The box comes off the screen for the fight and goes back afterwards: a scene is usually
	# mid-page when it calls for a fight, and the page belongs to the line before it.
	var box_was_open := _dialogue.visible
	_dialogue.visible = false
	_battle.begin(_party, formation, _db, ground, def)
	var result: String = await _battle.finished
	_dialogue.visible = box_was_open
	_scene_battle = false
	print("SCENE_BATTLE_END result=%s" % result)
	return result


## A shake, as an offset on the camera rather than on the world.
##
## The reference shakes its rig; this shakes what the rig is looking through, which comes to the
## same thing on screen and cannot move anything the simulation cares about. Decayed in
## `_process` so a scene calling it eighty times in a row reads as one long tremor.
func _shake_camera(amount: float) -> void:
	_shake = maxf(_shake, clampf(amount, 0.0, 1.5))


## A flash: the fade rect, in a colour, on its way out.
func _flash_screen(colour: Variant, strength: float) -> void:
	if _fade == null:
		return
	var tint := Color(String(colour)) if colour is String and String(colour) != "" \
		else Color(1, 1, 1)
	_fade.color = Color(tint, clampf(strength, 0.0, 1.0))
	var out := create_tween()
	out.tween_property(_fade, "color:a", 0.0, 0.45)


## Is anybody still on their feet? An empty roster is not a wipe: a scene can run before the
## party exists at all.
func _everybody_down() -> bool:
	if _party.roster.is_empty():
		return false
	for id in _party.active:
		if not _party.roster[id].is_ko():
			return false
	return true


func _note_no_encounter() -> void:
	print("BATTLE_NONE nothing to fight here")


func _on_battle_finished(result: String) -> void:
	_battle.visible = false
	if _world != null:
		_world.visible = true
	_follow_camera()
	print("BATTLE_CLOSED result=%s" % result)
	# A scene's fight belongs to the scene: it is waiting on the result and decides what a
	# defeat means. Rolling back from here would tear the world down underneath it.
	if _scene_battle:
		return
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
	Telemetry.track(Telemetry.PARTY_WIPED, {
		"map": _ids[_index], "party_level": _party.average_level(),
		"play_seconds": _party.play_time})
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
	var was_state := _party.world_state
	var known: bool = await Events.run(id, _ctx)
	# The one scene that is the end of the game. The reference sends this from inside the scene;
	# here it rides the scene finishing, because a port that put an analytics call inside a
	# ported scene would have a scene that differs from the one events parity checks.
	if id == "first_engine":
		Telemetry.track(Telemetry.GAME_COMPLETED, {
			"party_level": _party.average_level(), "play_seconds": _party.play_time,
			"roster_size": _party.roster.size(), "gold": _party.gold,
			"bestiary_seen": _party.bestiary.size()})
	_dialogue.close()
	print("SCENE_END %s known=%s" % [id, str(known)])
	# The cataclysm rewrites twenty-six maps, including the one the party is standing on. A
	# scene that turns the world over has to be followed by the world turning over, or the
	# player walks out of the end of it into the village that was just destroyed.
	if _party.world_state != was_state:
		print("WORLD_STATE %s -> %s" % [was_state, _party.world_state])
		_open(_index, "")
	_play_map_music(1.4)
	_scene_running = false
	# A scene can be lost. Some are written to be — they carry on and say something about it —
	# but a party left with nobody standing has to be rolled back, and only the scene knows when
	# it has finished saying its piece, so this is the moment to check rather than the fight's.
	if _everybody_down() and not _scene_allows_defeat:
		_lose()
	_scene_allows_defeat = false


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
		+ " · K shop · L inn · T chest · Y fly · P wipe · G grid · Esc back")
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
