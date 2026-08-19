class_name CastModels
extends RefCounted
##
## Who is on screen: which mesh plays a character, which plays a creature, and which
## animation is which.
##
## A port of `src/world/charmodels.js` and `src/battle/monstermodels.js`, and the tables
## themselves cross as data rather than being retyped — `char_models.json` and
## `monster_models.json`, checked by `tools/data-parity.mjs` like every other table. What is
## ported here is the two *decisions*: a hand-written cast list for the fourteen party
## members, and a hash for everybody else.
##
## The hash matters more than it looks. Two hundred species share thirty-six models, and
## which one a species gets is `FNV-1a` over its own look. Get that wrong and the port shows
## a different creature from the reference for the same enemy — not a crash, not a warning,
## just a wolf where there should have been a slime, in a game with two hundred of them.
## `tools/models-parity.mjs` compares all 214 assignments.
##
## Clip names are the other half. The cast shares one skeleton so its clips are a fixed map;
## the bestiary comes from eight packs that agree on nothing, so each game clip carries an
## ordered list of patterns and takes the first authored clip that matches. Both are the
## reference's own lists, and neither falls back to a computed pose.

const CAST_DIR := "res://assets/cast/"
const MONSTER_DIR := "res://assets/monsters/"

var _db
var _scenes: Dictionary = {}
var _clip_cache: Dictionary = {}
var _missing: Dictionary = {}


func _init(database) -> void:
	_db = database


# ---------------------------------------------------------------------------
# Which model
# ---------------------------------------------------------------------------

## FNV-1a over a string, 32-bit — the reference's own hash.
##
## Written out with an explicit mask because GDScript's `int` is 64-bit signed: the
## multiplication in `Math.imul(h, 16777619) >>> 0` wraps at 32 bits and nothing here does
## unless it is told to.
static func fnv1a(text: String) -> int:
	var h := 2166136261
	for i in text.length():
		h ^= text.unicode_at(i)
		h = (h * 16777619) & 0xffffffff
	return h


## The model for a character. The cast list first, then a hash of their appearance — which is
## how three hundred villagers each get a consistent face without anybody authoring a table.
func model_for_character(def: Dictionary) -> String:
	var models: Dictionary = _db.char_models.get("models", {})
	var cast: Dictionary = _db.char_models.get("cast", {})
	var id := String(def.get("id", ""))
	if cast.has(id):
		return String(cast[id])
	var keys: Array = models.keys()
	if keys.is_empty():
		return ""
	# The seed is the reference's: `JSON.stringify([def.id, def.build, def.hair, def.colors])`.
	# Built by hand rather than by `JSON.stringify`, because Godot's serialiser sorts keys and
	# JavaScript's keeps insertion order, and this is a hash — one different byte is a
	# different villager.
	var seed := "[%s,%s,%s,%s]" % [
		_json_or_null(def.get("id", null)),
		_json_or_null(def.get("build", null)),
		_json_or_null(def.get("hair", null)),
		_colors_json(def.get("colors", null)),
	]
	return String(keys[fnv1a(seed) % keys.size()])


## The model for a creature, by body plan and a hash of its look.
func model_for_look(look: Dictionary) -> String:
	var plans: Dictionary = _db.monster_models.get("plans", {})
	var plan := String(look.get("plan", "humanoid"))
	if not plans.has(plan):
		plan = "humanoid"
	var list: Array = plans.get(plan, [])
	if list.is_empty():
		return ""
	var override := String(look.get("model", ""))
	if not override.is_empty():
		for entry in list:
			if String(entry.get("id", "")) == override:
				return override
		# The reference checks whether the named model *loaded*, not whether it is in this
		# plan's list, so an override naming a model from another plan is honoured.
		if ResourceLoader.exists(MONSTER_DIR + override + ".glb"):
			return override
	var seed := "[%s,%s,%s,%s,%s]" % [
		_json_or_null(look.get("plan", null)),
		_json_or_null(look.get("color", null)),
		_json_or_null(look.get("accent", null)),
		_json_or_null(look.get("eyeColor", null)),
		_number_or_null(look.get("scale", null)),
	]
	return String(list[fnv1a(seed) % list.size()].get("id", ""))


## A value as `JSON.stringify` writes it, for the two kinds this hash ever sees.
static func _json_or_null(value: Variant) -> String:
	if value == null:
		return "null"
	return "\"%s\"" % String(value)


## A number as JavaScript prints it: `0.85`, and `1` rather than `1.0`.
static func _number_or_null(value: Variant) -> String:
	if value == null:
		return "null"
	var f := float(value)
	if f == floor(f) and absf(f) < 1e15:
		return str(int(f))
	return String.num(f, 10).trim_suffix("0")


## A colour table as `JSON.stringify` writes it: insertion order, no spaces.
static func _colors_json(colors: Variant) -> String:
	if colors == null:
		return "null"
	var parts: Array = []
	for key in colors:
		parts.append("\"%s\":\"%s\"" % [String(key), String(colors[key])])
	return "{%s}" % ",".join(parts)


# ---------------------------------------------------------------------------
# Instancing
# ---------------------------------------------------------------------------

## One character, at a height, with its clips resolved. `{}` when the model is missing.
func character(def: Dictionary, height := 0.0) -> Node3D:
	var key := model_for_character(def)
	var models: Dictionary = _db.char_models.get("models", {})
	if not models.has(key):
		return null
	var node := _instance(CAST_DIR + String(models[key].get("file", "")))
	if node == null:
		return null
	if height > 0.0:
		_fit_height(node, height)
	return node


## One creature, at a height.
func monster(look: Dictionary, height := 1.7) -> Node3D:
	var id := model_for_look(look)
	if id.is_empty():
		return null
	var node := _instance(MONSTER_DIR + id + ".glb")
	if node == null:
		return null
	_fit_height(node, height)
	return node


## Scale a model so it stands the given height, and put its feet on the ground.
##
## Measured from the model rather than assumed: the roster comes from many packs and a
## character is anywhere from half a unit to sixty. The reference does the same thing with its
## own `nativeHeight` and `footOffset`.
func _fit_height(node: Node3D, height: float) -> void:
	var box := _bounds(node)
	if box.size.y <= 0.0001:
		return
	var scale := height / box.size.y
	node.scale = Vector3(scale, scale, scale)
	node.position.y -= box.position.y * scale


## The bounds of every mesh under a node, in the node's own space.
##
## Public because more than one caller needs it: fitting a character to a height, and scaling
## a floor slab to a battle stage. Recursive, because a glTF's meshes are never children of
## its root — they are two or three nodes down, and a loop over `get_children()` finds
## nothing at all.
func bounds(node: Node3D) -> AABB:
	return _bounds(node)


func _bounds(node: Node3D) -> AABB:
	var box := AABB()
	var first := true
	var stack: Array = [node]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		if current is VisualInstance3D:
			var mesh_box: AABB = (current as VisualInstance3D).get_aabb()
			var world := (current as Node3D).transform
			var parent := current.get_parent()
			while parent != null and parent != node.get_parent():
				if parent is Node3D:
					world = (parent as Node3D).transform * world
				parent = parent.get_parent()
			var here := world * mesh_box
			if first:
				box = here
				first = false
			else:
				box = box.merge(here)
		for child in current.get_children():
			stack.append(child)
	return box


## The animation player inside a model, and the clip names it actually carries.
##
## glTF clip names arrive as `CharacterArmature|CharacterArmature|…|Idle`, sometimes several
## deep and sometimes with a `.001` suffix from an exporter that found duplicates. Only the
## tail carries meaning, which is the reference's finding too.
func clips_of(node: Node3D) -> Dictionary:
	var player := _player_in(node)
	if player == null:
		return {}
	var out := {}
	for name in player.get_animation_list():
		var tail := String(name).split("|")[-1]
		var stripped := tail
		var dot := tail.rfind(".")
		if dot > 0 and tail.substr(dot + 1).is_valid_int():
			stripped = tail.substr(0, dot)
		out[stripped] = name
	return out


func _player_in(node: Node) -> AnimationPlayer:
	var stack: Array = [node]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		if current is AnimationPlayer:
			return current
		for child in current.get_children():
			stack.append(child)
	return null


## Play a game clip on a character model — `idle`, `walk`, `battleIdle`.
##
## The cast's clip names are a fixed map because the whole pack shares one skeleton. Returns
## the authored clip name that was played, or "" when the model has nothing for it.
func play_character_clip(node: Node3D, clip: String) -> String:
	var wanted := String(_db.char_models.get("clips", {}).get(clip, clip))
	# Through the model's own list, because the name the artist gave a clip and the name the
	# file carries are not the same string: glTF arrives as
	# `CharacterArmature|CharacterArmature|Idle`, and asking an AnimationPlayer for "Idle"
	# gets nothing at all.
	var available := clips_of(node)
	if not available.has(wanted):
		return ""
	return _play(node, String(available[wanted]), _db.char_models.get("once", []).has(clip))


## Play a game clip on a creature.
##
## The bestiary's clips are matched by pattern, in order, because no two packs in the roster
## call an attack the same thing. The fallback chain — cast to attack, run to walk, walk to
## idle — is the reference's.
func play_monster_clip(node: Node3D, clip: String) -> String:
	var resolved := _resolve_monster_clip(node, clip)
	if resolved.is_empty():
		return ""
	return _play(node, resolved, _db.monster_models.get("once", []).has(clip))


func _resolve_monster_clip(node: Node3D, clip: String) -> String:
	var available := clips_of(node)
	if available.is_empty():
		return ""
	var patterns: Dictionary = _db.monster_models.get("clips", {})
	var fallback: Dictionary = _db.monster_models.get("fallback", {})
	var wanted := clip
	var hops := 0
	while hops < 5:
		for source in patterns.get(wanted, []):
			var regex := _regex(String(source))
			if regex == null:
				continue
			for name in available:
				if regex.search(String(name)) != null:
					# The authored name, not the stripped one the pattern matched.
					return String(available[name])
		if not fallback.has(wanted):
			break
		wanted = String(fallback[wanted])
		hops += 1
	# Something rather than nothing: a creature with no matching clip still needs to move.
	return String(available[available.keys()[0]])


func _regex(source: String) -> RegEx:
	if _clip_cache.has(source):
		return _clip_cache[source]
	var regex := RegEx.new()
	# The reference's patterns are all case-insensitive; Godot's `RegEx` has no flag for it, so
	# the inline form goes on the front.
	if regex.compile("(?i)" + source) != OK:
		push_warning("could not compile clip pattern %s" % source)
		_clip_cache[source] = null
		return null
	_clip_cache[source] = regex
	return regex


func _play(node: Node3D, clip_name: String, once: bool) -> String:
	var player := _player_in(node)
	if player == null or not player.has_animation(clip_name):
		return ""
	var animation := player.get_animation(clip_name)
	animation.loop_mode = Animation.LOOP_NONE if once else Animation.LOOP_LINEAR
	player.play(clip_name)
	return clip_name


func _instance(path: String) -> Node3D:
	if not ResourceLoader.exists(path):
		if not _missing.has(path):
			_missing[path] = true
			push_warning("no model at %s" % path)
		return null
	if not _scenes.has(path):
		_scenes[path] = load(path)
	var scene: PackedScene = _scenes[path]
	return scene.instantiate()
