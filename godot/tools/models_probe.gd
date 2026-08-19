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

	# And what the clips resolve to inside the models themselves. One character model and one
	# creature per body plan is enough to prove the tables reach real keyframes without loading
	# thirty-six meshes.
	var resolved := {}
	var sample_character: Dictionary = db.characters.get("vesna", {}).get("look", {}).duplicate()
	sample_character["id"] = "vesna"
	var body := cast.character(sample_character, 1.7)
	if body != null:
		get_root().add_child(body)
		for clip in db.char_models.get("clips", {}):
			resolved["vesna/%s" % clip] = cast.play_character_clip(body, String(clip))
		body.queue_free()
	for plan in db.monster_models.get("plans", {}):
		var creature := cast.monster({"plan": plan}, 1.7)
		if creature == null:
			continue
		get_root().add_child(creature)
		for clip in ["idle", "attack", "hurt", "dead"]:
			resolved["%s/%s" % [plan, clip]] = cast.play_monster_clip(creature, clip)
		creature.queue_free()

	print(JSON.stringify({
		"characters": characters,
		"npcs": npcs,
		"enemies": enemies,
		"char_clips": db.char_models.get("clips", {}),
		"resolved": resolved,
	}))
	quit()
