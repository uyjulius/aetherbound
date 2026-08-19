class_name BattleView
extends Control
##
## A fight you can play.
##
## The engine underneath this is `battle.gd`, which is compared against the reference
## fight for fight — 24 harvested battles over 254 turns — so nothing here decides
## anything about a fight. What it does is the other half: show the gauges filling, ask
## the player what to do, and say what happened.
##
## Two persistent panels, as in the reference: the party's status on the right and the
## active character's commands on the left, with the enemy line above and floating
## numbers over whatever was hit.
##
## And the combatants themselves, on a stage of their own. Which mesh plays which creature is
## the reference's decision — a hash of the species' look over a roster of thirty-six, checked
## for all two hundred by `tools/models-parity.mjs` — and so is which authored clip counts as
## an attack. The floor is the ground the party was standing on when the fight started, which
## is the reference's habit too: a fight on the Silt Road happens on the Silt Road.

const BattleModel := preload("res://scripts/battle/battle.gd")
const CastBuilder := preload("res://scripts/world/cast_models.gd")

## Where the two lines stand, and how far apart. A JRPG fight is read left to right and the
## party is nearer the camera.
const PARTY_Z := 2.4
const ENEMY_Z := -4.2
const SPACING := 2.4

## Emitted with "victory", "defeat" or "flee" when the fight is over.
signal finished(result: String)

var battle: Battle

var _party_rows: VBoxContainer
var _enemy_rows: VBoxContainer
var _commands: VBoxContainer
var _banner: Label
var _log: Label
var _popups: Control

## Which command is highlighted, and which enemy, while a turn is being decided.
var _command_index := 0
var _target_index := 0
var _choosing_target := false
var _pending := ""
var _confirms := 0
var _cancels := 0
var _lines: Array[String] = []

## The stage: a camera, a light, a floor and the combatants standing on it.
var _stage: Node3D
var _cast: CastModels
var _bodies: Dictionary = {}
var _clips: Dictionary = {}
var _ground := "grass.png"
## The map the fight started on, for its sky and its haze.
var _map_def: Dictionary = {}

const COMMANDS := ["Attack", "Defend", "Magic", "Item"]


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process_input(true)
	_build()


func _input(event: InputEvent) -> void:
	if event.is_echo():
		return
	if event.is_action_pressed("confirm"):
		_confirms += 1
	if event.is_action_pressed("cancel"):
		_cancels += 1


func _build() -> void:

	_banner = Label.new()
	_banner.add_theme_font_size_override("font_size", 44)
	_banner.add_theme_color_override("font_color", Palette.ui_color("select"))
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	_banner.anchor_right = 1.0
	_banner.offset_top = 48.0
	add_child(_banner)

	# The enemy line, across the top.
	_enemy_rows = VBoxContainer.new()
	_enemy_rows.position = Vector2(80, 150)
	_enemy_rows.add_theme_constant_override("separation", 6)
	add_child(_enemy_rows)

	# The party's status, bottom right, which is where thirty years of this genre has
	# trained everyone to look for it.
	_party_rows = VBoxContainer.new()
	_party_rows.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	_party_rows.offset_left = -640.0
	_party_rows.offset_top = -300.0
	_party_rows.offset_right = -60.0
	_party_rows.offset_bottom = -60.0
	_party_rows.add_theme_constant_override("separation", 10)
	add_child(_party_rows)

	_commands = VBoxContainer.new()
	_commands.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	_commands.offset_left = 60.0
	_commands.offset_top = -300.0
	_commands.offset_bottom = -60.0
	_commands.add_theme_constant_override("separation", 8)
	add_child(_commands)

	_log = Label.new()
	_log.position = Vector2(80, 620)
	_log.add_theme_font_size_override("font_size", 22)
	_log.add_theme_color_override("font_color", Palette.ui_color("textDim"))
	add_child(_log)

	_popups = Control.new()
	_popups.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_popups.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_popups)


## Start a fight. The engine decides everything; this only presents it.
func begin(party: Party, encounter: Dictionary, database, ground := "grass.png",
		map_def: Dictionary = {}) -> void:
	_ground = ground
	_map_def = map_def
	if _cast == null:
		_cast = CastBuilder.new(database)
	battle = BattleModel.new(party, encounter, database)
	# No policy: a player turn opens a menu and waits for `commit_action`, which is what
	# the harness's scripted policies stand in for.
	battle.command_policy = Callable()
	_lines.clear()
	_note("A fight begins: %s" % ", ".join(_enemy_names()))
	_raise_stage(database)
	print("BATTLE_START enemies=%d party=%d" % [battle.enemies.size(), battle.party.size()])
	# The reference's own choice of track and fade: a boss gets its own theme, and 0.6
	# seconds is short enough that the fight starts on the downbeat rather than after it.
	Sound.play_music("boss" if battle.is_boss else "battle", 0.6)
	visible = true
	_refresh()


## Build the stage: everybody on it, facing each other.
func _raise_stage(database) -> void:
	_tear_down_stage()
	_stage = Node3D.new()
	add_child(_stage)

	var camera := Camera3D.new()
	camera.fov = 48.0
	# Off to one side and low, which is how this kind of fight has always been framed: both
	# lines visible, the party nearer, nobody in anybody's way.
	camera.position = Vector3(2.6, 5.8, 11.4)
	_stage.add_child(camera)
	camera.look_at(Vector3(0.0, 1.0, -1.2), Vector3.UP)
	camera.make_current()

	var sun := DirectionalLight3D.new()
	sun.rotation = Vector3(deg_to_rad(-46.0), deg_to_rad(-30.0), 0.0)
	sun.light_energy = 1.4
	sun.shadow_enabled = true
	_stage.add_child(sun)

	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(Palette.ink)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Palette.ramp_at("stone", 0.7)
	environment.ambient_light_energy = 0.6
	# Under the sky of wherever this fight started. The reference keeps the field's atmosphere
	# through a battle for the same reason: a fight in a marsh should not look like a fight on
	# a plain.
	Atmosphere.apply(environment, sun, _map_def)
	var holder := WorldEnvironment.new()
	holder.environment = environment
	_stage.add_child(holder)

	_lay_floor()

	# The party, nearest the camera and facing away from it; the creatures opposite, facing
	# back. Both lines are centred, so a fight against one is not a fight in a corner.
	for i in battle.party.size():
		var combatant: Combatant = battle.party[i]
		var def: Dictionary = combatant.member.def
		var look: Dictionary = Dictionary(def.get("look", {})).duplicate()
		look["id"] = def.get("id", "")
		var body := _cast.character(look, float(look.get("height", 1.7)))
		if body == null:
			continue
		body.position = _slot(i, battle.party.size(), PARTY_Z)
		body.rotation.y = PI
		_stage.add_child(body)
		_bodies[combatant.id] = body
		_clips[combatant.id] = ""
		_play_clip(combatant, "battleIdle")

	for i in battle.enemies.size():
		var combatant: Combatant = battle.enemies[i]
		var look: Dictionary = (combatant as EnemyCombatant).def.get("look", {})
		# Their own scale, as the bestiary declares it: a slug is not a dragon.
		var height := 1.7 * float(look.get("scale", 1.0))
		var body := _cast.monster(look, height)
		if body == null:
			continue
		body.position = _slot(i, battle.enemies.size(), ENEMY_Z)
		_stage.add_child(body)
		_bodies[combatant.id] = body
		_clips[combatant.id] = ""
		_play_clip(combatant, "idle")
	print("STAGE party=%d enemies=%d" % [battle.party.size(), battle.enemies.size()])


## A slab of the ground the party was standing on. Scaled from the same block the world is
## paved with, so a battle floor is the same asset and the same plate as a street.
func _lay_floor() -> void:
	if not ResourceLoader.exists("res://assets/props/block.glb"):
		return
	var scene: PackedScene = load("res://assets/props/block.glb")
	var slab: Node3D = scene.instantiate()
	# Measured through the whole hierarchy: this model's mesh is two nodes down and two
	# centimetres across, and a loop over the root's own children finds neither.
	var box := _cast.bounds(slab)
	if box.size.x <= 0.0001:
		return
	slab.scale = Vector3(44.0 / box.size.x, 0.6 / box.size.y, 34.0 / box.size.z)
	# The slab's *top* at zero, which is where everybody's feet are. Putting its centre there
	# instead buried the party to the knee, and a fight in a lawn is worse than no lawn.
	slab.position.y = -(box.position.y + box.size.y) * slab.scale.y
	var material := StandardMaterial3D.new()
	var path := "res://assets/textures/%s" % _ground
	if ResourceLoader.exists(path):
		material.albedo_texture = load(path)
		material.uv1_triplanar = true
		material.uv1_scale = Vector3.ONE * 0.5
	else:
		material.albedo_color = Palette.ramp_at("stone", 0.4)
	_paint(slab, material)
	_stage.add_child(slab)


## Put one material on every surface under a node.
func _paint(node: Node, material: Material) -> void:
	var stack: Array = [node]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		if current is GeometryInstance3D:
			(current as GeometryInstance3D).material_override = material
		for child in current.get_children():
			stack.append(child)


func _slot(index: int, total: int, z: float) -> Vector3:
	var offset := (float(index) - float(total - 1) / 2.0) * SPACING
	return Vector3(offset, 0.0, z)


func _tear_down_stage() -> void:
	if _stage != null:
		_stage.queue_free()
		_stage = null
	_bodies.clear()
	_clips.clear()


## Play a clip on a combatant, if it is not already playing.
func _play_clip(combatant: Combatant, clip: String) -> void:
	var body: Node3D = _bodies.get(combatant.id, null)
	if body == null or String(_clips.get(combatant.id, "")) == clip:
		return
	_clips[combatant.id] = clip
	if combatant.kind == "party":
		_cast.play_character_clip(body, clip)
	else:
		_cast.play_monster_clip(body, clip)


## What everybody should be doing, from the state the engine is in. Read rather than
## commanded: the engine decides the fight and this only looks at it.
func _sync_clips() -> void:
	if battle == null:
		return
	for combatant in battle.party + battle.enemies:
		var wanted := "battleIdle" if combatant.kind == "party" else "idle"
		if combatant.is_ko():
			wanted = "dead"
		elif combatant == battle.active_actor and battle.phase == BattleModel.Phase.MENU:
			wanted = "battleIdle" if combatant.kind == "party" else "idle"
		_play_clip(combatant, wanted)


func _enemy_names() -> Array:
	var out: Array = []
	for e in battle.enemies:
		out.append(e.name)
	return out


func _process(delta: float) -> void:
	if battle == null:
		return
	if battle.phase == BattleModel.Phase.ENDING:
		return

	battle.update(delta)
	battle.hold_escape(delta, Actions.is_down("pageLeft") and Actions.is_down("pageRight"))
	_sync_clips()

	if battle.phase == BattleModel.Phase.MENU and battle.active_actor != null:
		_drive_menu()
	_refresh()

	if battle.phase == BattleModel.Phase.ENDING:
		_end()


## The command list, and then the target. Two steps, because a target chosen before a
## command is a target chosen for the wrong reason.
func _drive_menu() -> void:
	if not _choosing_target:
		if Actions.just_pressed("down"):
			_command_index = posmod(_command_index + 1, COMMANDS.size())
		if Actions.just_pressed("up"):
			_command_index = posmod(_command_index - 1, COMMANDS.size())
		if _confirms > 0:
			_confirms = 0
			_pending = COMMANDS[_command_index]
			if _pending == "Defend":
				battle.commit_action({"actor": battle.active_actor, "kind": "defend"})
				_note("%s braces." % battle.active_actor.name)
				return
			_choosing_target = true
			_target_index = 0
		return

	var living := _living_enemies()
	if living.is_empty():
		_choosing_target = false
		return
	if Actions.just_pressed("down") or Actions.just_pressed("right"):
		_target_index = posmod(_target_index + 1, living.size())
	if Actions.just_pressed("up") or Actions.just_pressed("left"):
		_target_index = posmod(_target_index - 1, living.size())
	if _cancels > 0:
		_cancels = 0
		_choosing_target = false
		return
	if _confirms > 0:
		_confirms = 0
		var actor := battle.active_actor
		var target: Combatant = living[mini(_target_index, living.size() - 1)]
		var before := target.hp
		match _pending:
			"Attack":
				battle.commit_action({"actor": actor, "kind": "attack", "targets": [target]})
			"Magic":
				var spell := _first_spell(actor)
				if spell.is_empty():
					_note("%s has nothing to cast." % actor.name)
					battle.commit_action({"actor": actor, "kind": "attack", "targets": [target]})
				else:
					battle.commit_action({"actor": actor, "kind": "spell", "spell": spell,
						"targets": [target]})
					Sound.sfx("magic")
					_note("%s casts %s." % [actor.name, String(spell.get("name", "a spell"))])
			"Item":
				var item := _first_item()
				if item.is_empty():
					_note("The bag is empty.")
					battle.commit_action({"actor": actor, "kind": "attack", "targets": [target]})
				else:
					battle.commit_action({"actor": actor, "kind": "item", "item": item,
						"targets": [actor]})
					Sound.sfx("heal")
					_note("%s uses %s." % [actor.name, String(item.get("name", "an item"))])
			_:
				battle.commit_action({"actor": actor, "kind": "attack", "targets": [target]})
		if _pending == "Attack":
			var dealt := before - target.hp
			_note("%s hits %s for %d." % [actor.name, target.name, dealt] if dealt > 0
				else "%s misses %s." % [actor.name, target.name])
			_popup(target, dealt)
			Sound.sfx("hit" if dealt > 0 else "cancel")
			# The swing and the flinch, on the two who are in it.
			_clips[actor.id] = ""
			_play_clip(actor, "attack")
			if dealt > 0:
				_clips[target.id] = ""
				_play_clip(target, "hurt")
		_choosing_target = false


## The cheapest readable choice for a diagnostic: the character's first known attack
## spell they can afford. The full magic list is a menu of its own and belongs with the
## rest of the menus.
func _first_spell(actor: Combatant) -> Dictionary:
	if actor.kind != "party" or battle == null:
		return {}
	var known: Array = []
	for spell_id in actor.member.spells:
		if float(actor.member.spells[spell_id]) < 100.0:
			continue
		var spell: Dictionary = battle._db.spells.get(String(spell_id), {})
		if String(spell.get("kind", "")) == "attack" and actor.mp >= int(spell.get("mp", 0)):
			known.append(spell)
	known.sort_custom(func(a, b): return String(a["id"]) < String(b["id"]))
	return known[0] if not known.is_empty() else {}


func _first_item() -> Dictionary:
	for id in battle.party_ref().inventory:
		var item: Dictionary = battle._db.items.get(String(id), {})
		if item.get("effect", {}).has("heal"):
			return item
	return {}


func _living_enemies() -> Array:
	var out: Array = []
	for e in battle.enemies:
		if not e.is_ko():
			out.append(e)
	return out


func _refresh() -> void:
	_sync_rows(_party_rows, battle.party, true)
	_sync_rows(_enemy_rows, battle.enemies, false)
	_sync_commands()
	_log.text = "\n".join(_lines.slice(maxi(0, _lines.size() - 4)))


## One row per combatant: a name, the numbers, and the gauge.
func _sync_rows(into: VBoxContainer, who: Array, party_side: bool) -> void:
	while into.get_child_count() < who.size():
		var row := Label.new()
		row.add_theme_font_size_override("font_size", 24)
		into.add_child(row)
	for i in who.size():
		var c: Combatant = who[i]
		var row: Label = into.get_child(i)
		var gauge := int(round(c.atb / 10.0))
		var marks := "|".repeat(gauge) + ".".repeat(10 - gauge)
		if party_side:
			row.text = "%-10s %5d/%-5d HP  %4d MP  [%s]%s" % [
				c.name, c.hp, c.max_hp, c.mp, marks,
				"" if c.statuses.is_empty() else "  " + ",".join(c.statuses.keys())]
		else:
			var pointer := ""
			if _choosing_target and battle.phase == BattleModel.Phase.MENU:
				var living := _living_enemies()
				if not living.is_empty() and living[mini(_target_index, living.size() - 1)] == c:
					pointer = "> "
			row.text = "%s%-16s %5d/%-5d" % [pointer, c.name, c.hp, c.max_hp]
		var dim := c.is_ko()
		row.add_theme_color_override("font_color", Palette.ui_color("textDisabled") if dim
			else (Palette.ui_color("select") if c == battle.active_actor else Palette.ui_color("text")))


func _sync_commands() -> void:
	var showing := battle.phase == BattleModel.Phase.MENU and battle.active_actor != null
	while _commands.get_child_count() < COMMANDS.size() + 1:
		var row := Label.new()
		row.add_theme_font_size_override("font_size", 26)
		_commands.add_child(row)
	var header: Label = _commands.get_child(0)
	header.text = ("%s's turn" % battle.active_actor.name) if showing else ""
	header.add_theme_color_override("font_color", Palette.ui_color("select"))
	for i in COMMANDS.size():
		var row: Label = _commands.get_child(i + 1)
		row.visible = showing
		if not showing:
			continue
		row.text = "%s %s" % [">" if i == _command_index and not _choosing_target else " ", COMMANDS[i]]
		row.add_theme_color_override("font_color",
			Palette.ui_color("select") if i == _command_index else Palette.ui_color("text"))
	if showing and _choosing_target:
		header.text = "%s — choose a target" % battle.active_actor.name


## A number that rises and fades where the blow landed. The only animation here, and it
## is worth it: a fight where damage appears in a log reads as a spreadsheet.
func _popup(target: Combatant, amount: int) -> void:
	var label := Label.new()
	label.text = str(amount) if amount > 0 else "miss"
	label.add_theme_font_size_override("font_size", 34)
	label.add_theme_color_override("font_color",
		Palette.ui_color("danger") if amount > 0 else Palette.ui_color("textDim"))
	var index := battle.enemies.find(target)
	label.position = Vector2(360.0, 150.0 + float(maxi(0, index)) * 34.0)
	_popups.add_child(label)
	var tween := create_tween()
	tween.tween_property(label, "position:y", label.position.y - 60.0, 0.7)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.7)
	tween.tween_callback(label.queue_free)


func _note(line: String) -> void:
	_lines.append(line)


func _end() -> void:
	var rewards := battle.rewards
	match battle.result:
		"victory":
			# Victory is a track in the reference, not an effect, and the field puts the
			# map's own theme back when the screen closes.
			Sound.play_music("victory", 0.15)
			_banner.text = "Victory"
			_note("Victory. %d exp each, %d gil." % [
				int(rewards.get("exp_each", 0)), int(rewards.get("gold", 0))])
		"defeat":
			Sound.play_music("gameover", 0.6)
			_banner.text = "Defeat"
		_:
			_banner.text = "Escaped"
	print("BATTLE_END result=%s exp=%d gold=%d" % [battle.result,
		int(rewards.get("exp_each", 0)), int(rewards.get("gold", 0))])
	_refresh()
	_tear_down_stage()
	finished.emit(battle.result)
	battle = null
