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

## The menu, innermost last, and where the cursor is in it.
var _menus: Array = []
var _command_index := 0
## `{side, then}` while a target is being chosen, `{}` otherwise.
var _targeting: Dictionary = {}
var _target_index := 0
## Movement presses, counted rather than polled — see `_input`.
var _moves: Dictionary = {}
## Whose menu is open, so a new turn starts at the top rather than wherever the last one
## left the cursor.
var _menu_actor: Combatant
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




func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process_input(true)
	_build()


func _input(event: InputEvent) -> void:
	# Only while the fight is on screen. Without this the counters tick through everything
	# that came before — the six confirms that turned the pages of a conversation were still
	# banked when the first gauge filled, so the first menu chose its top row and the one
	# after it chose a target, and no arrow key could get a word in. The dialogue box and the
	# list screens learned the same lesson; this is the third.
	if not visible or event.is_echo():
		return
	if event.is_action_pressed("confirm"):
		_confirms += 1
	if event.is_action_pressed("cancel"):
		_cancels += 1
	# Movement counted from events too, for the third time in this project and the same
	# reason: `Input.is_action_just_pressed` is defined against the frame the press was
	# processed in, and this screen's `_process` runs after the battle engine has had its turn
	# — a press that arrives while the engine is resolving an action is simply not there any
	# more when the menu looks. Confirm was already counted; the cursor was not, so arrows
	# moved nothing at all and every turn was whatever the first row happened to be.
	for action in ["up", "down", "left", "right"]:
		if event.is_action_pressed(action):
			_moves[action] = int(_moves.get(action, 0)) + 1


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
	# Nothing banked from whatever was on screen a moment ago.
	_confirms = 0
	_cancels = 0
	_moves.clear()
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
		if _menu_actor != battle.active_actor:
			_menu_actor = battle.active_actor
			_menus.clear()
			_targeting = {}
			_command_index = 0
			_moves.clear()
		_drive_menu()
	elif _menu_actor != null:
		_menu_actor = null
		_menus.clear()
		_targeting = {}
	_refresh()

	if battle.phase == BattleModel.Phase.ENDING:
		_end()


## The command list, and then the target. Two steps, because a target chosen before a
## command is a target chosen for the wrong reason.
## How many times an action was pressed since this was last asked, and reset.
func _take(action: String) -> int:
	var count := int(_moves.get(action, 0))
	_moves[action] = 0
	return count


## The command menu, as a stack.
##
## A port of `_openCommandMenu` and `_chooseCommand` in `src/battle/battle.js`, and the
## reason it is here rather than described: without it a player can pick Attack, Defend and
## whatever spell happens to be first, which is four of this game's systems out of ten. The
## fourteen unique commands, the spell list with its elements, the bag, summoning, the row
## and the desperation gauge are all decisions the fight is *made* of.
##
## Dispatch is by the command's own `kind` — `choice`, `target`, `fixed`, `roll`, `attune`,
## `stance`, `cost`, `steal`, `scan`, `mimic` — which is the reference's own classification,
## carried in `commands.json`. Fourteen cases would drift; ten kinds do not.
func _drive_menu() -> void:
	if _menus.is_empty():
		_open_root(battle.active_actor)

	if not _targeting.is_empty():
		_drive_targeting()
		return

	var screen: Dictionary = _menus[_menus.size() - 1]
	var rows: Array = screen["rows"]
	var moved := _take("down") - _take("up")
	# Left and right are read too, so a player who reaches for them is not ignored.
	moved += _take("right") - _take("left")
	if moved != 0:
		_command_index = posmod(_command_index + moved, maxi(1, rows.size()))
		Sound.sfx("cursor")
	if _cancels > 0:
		_cancels = 0
		# Never off the root: a fight is not something to back out of, and the reference's
		# root menu ignores cancel for exactly that reason.
		if _menus.size() > 1:
			_menus.pop_back()
			_command_index = 0
			Sound.sfx("cancel")
	if _confirms > 0:
		_confirms = 0
		if rows.is_empty():
			return
		var row: Dictionary = rows[mini(_command_index, rows.size() - 1)]
		if bool(row.get("disabled", false)):
			Sound.sfx("error")
			return
		Sound.sfx("confirm")
		var act: Callable = row.get("act", Callable())
		if act.is_valid():
			act.call()


## The root menu, in the reference's order — and with the desperation gauge appended rather
## than inserted, which it learned the hard way: put first, it silently displaced Attack on
## the exact turn the gauge filled, and a player confirming out of habit spent a
## once-a-fight resource on whatever the default target happened to be.
func _open_root(actor: Combatant) -> void:
	_menus.clear()
	_command_index = 0
	var rows: Array = []
	rows.append({"label": "Attack", "act": func(): _target_then(actor, "oneEnemy",
		func(targets): _commit(actor, {"kind": "attack", "targets": targets}))})

	var command := String(actor.member.def.get("command", ""))
	if not command.is_empty():
		rows.append({"label": Commands.label(command),
			"act": func(): _open_command(actor, command)})

	# One summon per fight, in the tradition: an esper is a resource you spend, not a spell
	# you spam.
	var esper: Dictionary = actor.member.esper
	if not esper.is_empty():
		var cost := int(esper.get("mp", 0))
		rows.append({
			"label": "Summon: %s" % String(esper.get("name", "?")),
			"right": "%d MP" % cost,
			"disabled": actor.summoned or actor.mp < cost,
			"act": func(): _summon(actor, esper),
		})

	var spells := _spells_for(actor)
	rows.append({
		"label": "Magic",
		"disabled": spells.is_empty() or actor.has_status("silence") or actor.has_status("imp"),
		"act": func(): _open_magic(actor, spells),
	})
	rows.append({"label": "Item", "act": func(): _open_items(actor)})
	rows.append({"label": "Defend", "act": func(): _commit(actor,
		{"kind": "defend", "targets": [actor]})})
	rows.append({
		"label": "Row: Front" if actor.row == "front" else "Row: Back",
		"act": func(): _commit(actor, {"kind": "row", "targets": [actor]}),
	})
	if actor.limit >= 100.0:
		rows.append({"label": "★ Desperation", "act": func(): _commit(actor,
			{"kind": "limit", "targets": _living(battle.enemies)})})
	_menus.append({"title": actor.name, "rows": rows})
	# The menu, out loud. What a character can do on a turn depends on who they are, what
	# they are carrying and how badly they are hurt, so a check that wants to cast a spell has
	# to find out which row that is rather than assume.
	var labels: Array = []
	for row in rows:
		# A `!` marks a row that cannot be chosen — no spells learned, not enough MP, the esper
		# already spent. Which rows those are depends on the character and the state of the
		# fight, and anything reading this line needs to know before it presses confirm.
		labels.append(String(row.get("label", ""))
			+ ("!" if bool(row.get("disabled", false)) else ""))
	print("TURN %s menu=%s" % [actor.id, "|".join(labels)])


## One character's own command, by what kind of thing it is.
func _open_command(actor: Combatant, command: String) -> void:
	var kind := Commands.kind(command)
	var spec := Commands.spec(command)
	match kind:
		"steal":
			_target_then(actor, "oneEnemy", func(targets): _commit(actor,
				{"kind": "steal", "targets": targets}))
		"scan":
			_target_then(actor, "oneEnemy", func(targets): _commit(actor,
				{"kind": "scan", "targets": targets}))
		"target":
			var move: Dictionary = spec.get("move", {})
			_target_then(actor, "oneEnemy", func(targets): _commit(actor,
				{"kind": "special", "move": move, "targets": targets}))
		"fixed":
			var move: Dictionary = spec.get("move", {})
			var side := String(spec.get("side", "enemies"))
			_commit(actor, {"kind": "special", "move": move,
				"targets": _living(battle.party if side == "party" else battle.enemies)})
		"roll":
			# Osric's gamble. Rolled on the *battle* stream, which is what the harness compares,
			# so a wager in the port is the same wager.
			var outcome := Commands.roll_outcome(command, RngStreams.battle)
			var targets: Array = _living(battle.enemies) if String(
				outcome.get("target", "")) == "all" else _one_enemy()
			_commit(actor, {"kind": "special", "move": outcome, "targets": targets})
		"choice":
			_push_moves(actor, command, spec)
		"attune":
			_push_attune(actor, spec)
		"stance":
			_push_stances(actor, spec)
		"cost":
			_push_tiers(actor)
		"mimic":
			_mimic(actor)
		_:
			# A command whose kind this screen does not know is said out loud rather than
			# swallowed: the engine would take the turn and nothing would explain it.
			_note("%s cannot do that yet." % actor.name)
			_commit(actor, {"kind": "defend", "targets": [actor]})


## A submenu of moves, gated by level where the command gates them.
func _push_moves(actor: Combatant, command: String, spec: Dictionary) -> void:
	var rows: Array = []
	for move in Commands.moves_for(command, actor.level):
		var entry: Dictionary = move
		rows.append({
			"label": String(entry.get("label", "?")),
			"right": String(entry.get("desc", "")),
			"act": func():
				# A device that helps the party, a strike that hits everything, or one that
				# needs a target: the move says which, as it does in the reference.
				if bool(entry.get("self", false)):
					_commit(actor, {"kind": "special", "move": entry,
						"targets": _living(battle.party)})
				elif String(entry.get("target", "")) == "all":
					_commit(actor, {"kind": "special", "move": entry,
						"targets": _living(battle.enemies)})
				else:
					_target_then(actor, "oneEnemy", func(targets): _commit(actor,
						{"kind": "special", "move": entry, "targets": targets})),
		})
	if rows.is_empty():
		rows.append({"label": "(nothing yet)", "disabled": true})
	_push(String(spec.get("label", command)), rows)


## Vesna's Attune: re-element her weapon for the rest of the fight.
##
## The whole game's affinity table is the puzzle and this is the tool for solving it, so it
## is a menu rather than a toggle. Committed through a `special` carrying `attune`, which is
## how the engine already reads it.
func _push_attune(actor: Combatant, spec: Dictionary) -> void:
	var rows: Array = []
	for element in spec.get("elements", []):
		var name := String(element)
		rows.append({
			"label": name.capitalize(),
			"right": "attuned" if actor.attuned_element == name else "",
			"act": func(): _commit(actor, {"kind": "special", "targets": [actor],
				"move": {"label": "Attuned: %s" % name.capitalize(), "attune": name}}),
		})
	rows.append({"label": "Plain steel", "act": func(): _commit(actor,
		{"kind": "special", "targets": [actor], "move": {"label": "Unattuned", "attune": ""}})})
	_push(String(spec.get("label", "Attune")), rows)


## Bastian's Stance. The statuses are set here, as in the reference, and the turn is spent
## on a `special` that carries only a label.
func _push_stances(actor: Combatant, spec: Dictionary) -> void:
	var rows: Array = []
	for stance in spec.get("stances", []):
		var entry: Dictionary = stance
		var id := String(entry.get("id", ""))
		rows.append({
			"label": String(entry.get("label", "?")),
			"right": String(entry.get("desc", "")),
			"act": func():
				for held in ["protect", "haste", "critUp"]:
					actor.remove_status(held)
				actor.remove_status("slow")
				if not id.is_empty():
					actor.add_status(id)
					# Protect is bought with speed, which is the whole shape of the decision.
					if id == "protect":
						actor.add_status("slow")
				_commit(actor, {"kind": "special", "targets": [actor],
					"move": {"label": String(entry.get("label", ""))}}),
		})
	_push(String(spec.get("label", "Stance")), rows)


## Rusk's Overclock: his own health for damage, priced off max HP.
func _push_tiers(actor: Combatant) -> void:
	var rows: Array = []
	for tier in Commands.overclock_tiers(actor.max_hp):
		var entry: Dictionary = tier
		rows.append({
			"label": String(entry.get("label", "?")),
			"right": "%d HP" % int(entry.get("hp", 0)),
			"disabled": actor.hp <= int(entry.get("hp", 0)),
			"act": func(): _target_then(actor, "oneEnemy", func(targets): _commit(actor,
				{"kind": "special", "targets": targets, "move": {
					"label": String(entry.get("label", "")),
					"power": float(entry.get("power", 1.0)),
					"overclock": float(entry.get("cost", 0.0)),
				}})),
		})
	_push("Overclock", rows)


## The Mask's Mimic: whatever the party did last, again.
func _mimic(actor: Combatant) -> void:
	var last: Dictionary = battle.last_party_action
	if last.is_empty():
		_note("There is nothing to copy yet.")
		_commit(actor, {"kind": "defend", "targets": [actor]})
		return
	var targets: Array = []
	for target in last.get("targets", []):
		if target != null and not target.is_ko():
			targets.append(target)
	if targets.is_empty():
		targets = _one_enemy()
	var copy := last.duplicate()
	copy["actor"] = actor
	copy["targets"] = targets
	# Copied spells cost the Mask nothing: it is not casting, it is doing the same thing
	# again.
	copy["mimicked"] = true
	_commit(actor, copy)


func _open_magic(actor: Combatant, spells: Array) -> void:
	var rows: Array = []
	for spell in spells:
		var entry: Dictionary = spell
		var cost: int = actor.member.spell_cost(entry)
		var element := String(entry.get("element", ""))
		rows.append({
			# The element goes on the row. This is the one screen where the choice of element
			# decides the fight, and the reference's own note says it was the one screen that
			# hid it — a player had to have memorised which of forty names is the ice one.
			"label": String(entry.get("name", "?")) if element.is_empty()
				else "%s · %s" % [String(entry.get("name", "?")), element],
			"right": "%d MP" % cost,
			"disabled": actor.mp < cost,
			"act": func(): _target_then(actor, String(entry.get("target", "oneEnemy")),
				func(targets): _commit(actor, {"kind": "spell", "spell": entry,
					"targets": targets})),
		})
	if rows.is_empty():
		rows.append({"label": "(nothing learned)", "disabled": true})
	_push("Magic", rows)


func _open_items(actor: Combatant) -> void:
	var rows: Array = []
	var party := battle.party_ref()
	var ids: Array = party.inventory.keys()
	ids.sort()
	for id in ids:
		var item: Dictionary = battle._db.items.get(String(id), {})
		if item.is_empty() or String(item.get("kind", "")) != "consumable":
			continue
		var entry: Dictionary = item
		rows.append({
			"label": String(entry.get("name", id)),
			"right": "x%d" % party.count_item(String(id)),
			"act": func(): _target_then(actor, String(entry.get("target", "oneAlly")),
				func(targets): _commit(actor, {"kind": "item", "item": entry,
					"targets": targets})),
		})
	if rows.is_empty():
		rows.append({"label": "(no items)", "disabled": true})
	_push("Item", rows)


func _summon(actor: Combatant, esper: Dictionary) -> void:
	var summon: Dictionary = esper.get("summon", {})
	var target := String(summon.get("target", "allEnemies"))
	var targets: Array = _living(battle.party) if target == "allAllies" \
		else (_one_enemy() if target == "oneEnemy" else _living(battle.enemies))
	_commit(actor, {"kind": "summon", "esper": esper, "targets": targets})


func _push(title: String, rows: Array) -> void:
	_menus.append({"title": title, "rows": rows})
	_command_index = 0
	var labels: Array = []
	for row in rows:
		labels.append(String(row.get("label", ""))
			+ ("!" if bool(row.get("disabled", false)) else ""))
	print("SUBMENU %s=%s" % [title, "|".join(labels)])


func _commit(actor: Combatant, action: Dictionary) -> void:
	var full := action.duplicate()
	full["actor"] = actor
	_menus.clear()
	_targeting = {}
	_command_index = 0
	var kind := String(full.get("kind", ""))
	if kind == "spell":
		Sound.sfx("magic")
	elif kind == "item":
		Sound.sfx("heal")
	var targets: Array = full.get("targets", [])
	var watched: Combatant = targets[0] if not targets.is_empty() else null
	var before := watched.hp if watched != null else 0
	print("ACTION %s %s" % [actor.id, kind])
	battle.commit_action(full)
	_after_action(actor, kind, watched, before)


## What just happened, said and shown.
func _after_action(actor: Combatant, kind: String, target: Combatant, before: int) -> void:
	if target == null:
		return
	var dealt := before - target.hp
	if kind == "attack":
		_note("%s hits %s for %d." % [actor.name, target.name, dealt] if dealt > 0
			else "%s misses %s." % [actor.name, target.name])
	if dealt > 0:
		_popup(target, dealt)
		Sound.sfx("hit")
		_clips[actor.id] = ""
		_play_clip(actor, "attack")
		_clips[target.id] = ""
		_play_clip(target, "hurt")
	elif kind == "attack":
		Sound.sfx("cancel")
		_popup(target, 0)


# ---------------------------------------------------------------------------
# Targeting
# ---------------------------------------------------------------------------

## Ask for a target, then do the thing. `kind` is the move's own target word.
func _target_then(actor: Combatant, kind: String, then: Callable) -> void:
	match kind:
		"self":
			then.call([actor])
		"allEnemies":
			then.call(_living(battle.enemies))
		"allAllies":
			then.call(_living(battle.party))
		"oneAlly":
			_targeting = {"side": "party", "then": then}
			_target_index = 0
		_:
			_targeting = {"side": "enemies", "then": then}
			_target_index = 0


func _drive_targeting() -> void:
	var candidates: Array = _living(battle.enemies if String(_targeting["side"]) == "enemies"
		else battle.party)
	if candidates.is_empty():
		_targeting = {}
		return
	var moved := _take("down") + _take("right") - _take("up") - _take("left")
	if moved != 0:
		_target_index = posmod(_target_index + moved, candidates.size())
		Sound.sfx("cursor")
	if _cancels > 0:
		_cancels = 0
		_targeting = {}
		Sound.sfx("cancel")
		return
	if _confirms > 0:
		_confirms = 0
		var then: Callable = _targeting["then"]
		var picked: Combatant = candidates[mini(_target_index, candidates.size() - 1)]
		_targeting = {}
		then.call([picked])


func _spells_for(actor: Combatant) -> Array:
	var out: Array = []
	if actor.member == null:
		return out
	var ids: Array = actor.member.spells.keys()
	ids.sort()
	for id in ids:
		if float(actor.member.spells[id]) < 100.0:
			continue
		var spell: Dictionary = battle._db.spells.get(String(id), {})
		if not spell.is_empty():
			out.append(spell)
	return out


func _living(who: Array) -> Array:
	var out: Array = []
	for c in who:
		if not c.is_ko():
			out.append(c)
	return out


func _one_enemy() -> Array:
	var living := _living(battle.enemies)
	return [living[0]] if not living.is_empty() else []





func _refresh() -> void:
	_sync_rows(_party_rows, battle.party, true)
	_sync_rows(_enemy_rows, battle.enemies, false)
	_sync_commands()
	_log.text = "\n".join(_lines.slice(maxi(0, _lines.size() - 4)))


## The cursor, on whichever side is being chosen from.
func _pointer_for(c: Combatant) -> String:
	if _targeting.is_empty() or battle.phase != BattleModel.Phase.MENU:
		return ""
	var candidates := _living(battle.enemies if String(_targeting["side"]) == "enemies"
		else battle.party)
	if candidates.is_empty():
		return ""
	return "> " if candidates[mini(_target_index, candidates.size() - 1)] == c else "  "


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
			row.text = "%s%-10s %5d/%-5d HP  %4d MP  [%s]%s" % [
				_pointer_for(c), c.name, c.hp, c.max_hp, c.mp, marks,
				"" if c.statuses.is_empty() else "  " + ",".join(c.statuses.keys())]
		else:
			row.text = "%s%-16s %5d/%-5d" % [_pointer_for(c), c.name, c.hp, c.max_hp]
		var dim := c.is_ko()
		row.add_theme_color_override("font_color", Palette.ui_color("textDisabled") if dim
			else (Palette.ui_color("select") if c == battle.active_actor else Palette.ui_color("text")))


## The menu as it stands: a title, then whatever the innermost screen is offering.
const MENU_ROWS := 12


func _sync_commands() -> void:
	var showing := battle.phase == BattleModel.Phase.MENU and battle.active_actor != null
	while _commands.get_child_count() < MENU_ROWS + 1:
		var row := Label.new()
		row.add_theme_font_size_override("font_size", 26)
		_commands.add_child(row)
	var header: Label = _commands.get_child(0)
	header.add_theme_color_override("font_color", Palette.ui_color("select"))
	var rows: Array = []
	var title := ""
	if showing and not _menus.is_empty():
		var screen: Dictionary = _menus[_menus.size() - 1]
		rows = screen["rows"]
		title = String(screen.get("title", ""))
	if not _targeting.is_empty():
		header.text = "%s — choose a target" % battle.active_actor.name
	else:
		header.text = title if showing else ""
	for i in MENU_ROWS:
		var row: Label = _commands.get_child(i + 1)
		var visible := showing and i < rows.size() and _targeting.is_empty()
		row.visible = visible
		if not visible:
			continue
		var entry: Dictionary = rows[i]
		row.text = "%s %-22s %s" % [">" if i == _command_index else " ",
			String(entry.get("label", "")), String(entry.get("right", ""))]
		var colour := Palette.ui_color("text")
		if bool(entry.get("disabled", false)):
			colour = Palette.ui_color("textDisabled")
		elif i == _command_index:
			colour = Palette.ui_color("select")
		row.add_theme_color_override("font_color", colour)


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
