extends SceneTree
##
## Which mesh the port would put on screen for every character, villager and species, and
## which authored clip each game clip resolves to.
##
##   godot --headless --path godot --script res://tools/models_probe.gd
##
## `../../tools/models-parity.mjs` holds the assignments against the reference's own. The clip
## resolution is done against the *real models* — loaded, their animation lists read — because
## a pattern table that matches nothing is a bestiary that stands still.

const Database := preload("res://scripts/data/database.gd")
const Cast := preload("res://scripts/world/cast_models.gd")


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return
	var cast = Cast.new(db)

	var characters := {}
	for id in db.characters:
		var look: Dictionary = Dictionary(db.characters[id]).get("look", {}).duplicate()
		look["id"] = id
		characters[id] = cast.model_for_character(look)

	# Everybody else in the world, keyed by map and world state as well as by id: the same
	# villager id appears in a town and in its ruined form with a different look, and keying on
	# the id alone would silently compare one against the other.
	var npcs := {}
	for map_id in db.maps:
		var def: Dictionary = db.maps[map_id]
		for state in ["whole", "ruin"]:
			var block: Variant = def if state == "whole" else def.get("ruin", null)
			if not (block is Dictionary):
				continue
			for npc in Dictionary(block).get("npcs", []):
				var look: Variant = npc.get("look", null)
				if not (look is Dictionary):
					continue
				var with_id: Dictionary = Dictionary(look).duplicate()
				with_id["id"] = npc.get("id", "")
				var key := "%s/%s/%s" % [map_id, state, String(npc.get("id", ""))]
				npcs[key] = cast.model_for_character(with_id)

	var enemies := {}
	for id in db.enemies:
		enemies[id] = cast.model_for_look(Dictionary(db.enemies[id]).get("look", {}))

	# And what the clips resolve to inside the models themselves. One creature per body plan is
	# enough for the bestiary — thirty-six meshes to prove a pattern list — but the *cast* is
	# checked in full: the fourteen party models are this game's own, one file each, and a clip
	# that failed to resolve on one of them would be one character freezing at the moment the
	# game told them to act.
	var resolved := {}
	var grounded := {}
	var animated := {}
	for id in db.characters:
		var look: Dictionary = Dictionary(db.characters[id]).get("look", {}).duplicate()
		look["id"] = id
		var body := cast.character(look, 1.7)
		if body == null:
			continue
		get_root().add_child(body)
		# Placement code assigns this neutral root to y=0 after fitting. The visible model
		# underneath it must keep its feet at zero and its requested height.
		body.position = Vector3(3.0, 0.0, -2.0)
		var box := cast.bounds(body)
		grounded[id] = [box.position.y, box.size.y]
		for clip in db.char_models.get("clips", {}):
			resolved["%s/%s" % [id, clip]] = cast.play_character_clip(body, String(clip))
		var walk := cast.play_character_clip(body, "walk")
		animated[id] = await _movement(body, walk)
		body.queue_free()
	for plan in db.monster_models.get("plans", {}):
		var creature := cast.monster({"plan": plan}, 1.7)
		if creature == null:
			continue
		get_root().add_child(creature)
		creature.position = Vector3(-3.0, 0.0, 2.0)
		var creature_box := cast.bounds(creature)
		grounded["monster:%s" % plan] = [creature_box.position.y, creature_box.size.y]
		for clip in ["idle", "attack", "hurt", "dead"]:
			resolved["%s/%s" % [plan, clip]] = cast.play_monster_clip(creature, clip)
		var attack := cast.play_monster_clip(creature, "attack")
		animated["monster:%s" % plan] = await _movement(creature, attack)
		creature.queue_free()

	print(JSON.stringify({
		"characters": characters,
		"npcs": npcs,
		"enemies": enemies,
		"char_clips": db.char_models.get("clips", {}),
		"resolved": resolved,
		"grounded": grounded,
		"animated": animated,
	}))
	quit()


## Largest bone change between two points in the authored clip, through the same wrapped
## instance the field and battle use. Resolving a clip name is not enough if its tracks no
## longer reach the skeleton after the imported scene is placed under another root.
func _movement(node: Node, clip: String) -> float:
	var player := _find(node, "AnimationPlayer") as AnimationPlayer
	var skeleton := _find(node, "Skeleton3D") as Skeleton3D
	if player == null or skeleton == null or clip.is_empty() or not player.has_animation(clip):
		return 0.0
	player.play(clip)
	player.seek(0.0, true)
	await process_frame
	var before: Array = []
	for bone in skeleton.get_bone_count():
		before.append(skeleton.get_bone_global_pose(bone))
	player.seek(player.get_animation(clip).length * 0.34, true)
	await process_frame
	var largest := 0.0
	for bone in skeleton.get_bone_count():
		var first: Transform3D = before[bone]
		var after := skeleton.get_bone_global_pose(bone)
		largest = maxf(largest, (first.origin - after.origin).length()
			+ (first.basis.get_euler() - after.basis.get_euler()).length())
	return largest


func _find(node: Node, kind: String) -> Node:
	if node.get_class() == kind:
		return node
	for child in node.get_children():
		var hit := _find(child, kind)
		if hit != null:
			return hit
	return null
