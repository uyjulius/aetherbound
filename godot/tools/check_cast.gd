extends SceneTree
##
## Every shipped character, proven to be a character rather than a statue.
##
##   godot --headless --path godot --script res://tools/check_cast.gd
##
## `render_character.gd` does this for one asset and then renders a strip of poses, which
## needs a window and a person to look at it. This is the half that can run anywhere: load
## each rigged GLB, play each of the eight clips the game asks for by name, sample a bone at
## two points, and refuse the lot if anything is still.
##
## The failure it exists for is silent by construction. A mesh can carry a skin, twenty
## joints, inverse bind matrices and eight animations and still deform nothing — Blender's
## automatic weighting reports success on a marching-cubes mesh while weighting zero
## vertices — and the export looks correct in every viewer that does not press play.

## The clips `battle.js` and the field ask for by name. A character missing one freezes at the
## moment the game tells them to act.
const CLIPS := ["idle", "walk", "battleIdle", "attack", "cast", "hurt", "dead", "victory"]

## Where the cast lives inside the Godot project. `assets/models` is the *generated* directory —
## raw meshes and one-off spikes — and the shipped cast is synced into `assets/cast` by
## `tools/sync-models.mjs`, which is the copy the game loads.
const MODELS := "res://assets/cast"


func _initialize() -> void:
	var characters: Dictionary = _read("res://data/characters.json")
	var ids: Array = characters.keys()
	ids.sort()
	var report := {}
	var trouble: Array = []

	for id in ids:
		var path := "%s/%s.glb" % [MODELS, id]
		if not FileAccess.file_exists(path):
			trouble.append("%s: no model at %s" % [id, path])
			continue
		var doc := GLTFDocument.new()
		var state := GLTFState.new()
		if doc.append_from_file(path, state) != OK:
			trouble.append("%s: could not be read" % id)
			continue
		var model: Node = doc.generate_scene(state)
		if model == null:
			trouble.append("%s: no scene inside" % id)
			continue
		root.add_child(model)
		var player: AnimationPlayer = _find(model, "AnimationPlayer") as AnimationPlayer
		var skeleton: Skeleton3D = _find(model, "Skeleton3D") as Skeleton3D
		if player == null or skeleton == null:
			trouble.append("%s: not rigged — no AnimationPlayer or Skeleton3D" % id)
			model.queue_free()
			continue

		var probe := skeleton.find_bone("forearm.R")
		if probe < 0:
			probe = mini(3, skeleton.get_bone_count() - 1)
		var missing: Array = []
		var still: Array = []
		var smallest := 1e9
		for clip in CLIPS:
			if not player.has_animation(clip):
				missing.append(clip)
				continue
			var length: float = player.get_animation(clip).length
			player.play(clip)
			player.seek(0.0, true)
			await process_frame
			var before: Transform3D = skeleton.get_bone_global_pose(probe)
			player.seek(length * 0.34, true)
			await process_frame
			var after: Transform3D = skeleton.get_bone_global_pose(probe)
			var moved: float = (before.origin - after.origin).length() \
				+ (before.basis.get_euler() - after.basis.get_euler()).length()
			smallest = minf(smallest, moved)
			if moved < 0.0005:
				still.append(clip)
		if not missing.is_empty():
			trouble.append("%s: missing %s" % [id, ", ".join(missing)])
		if not still.is_empty():
			trouble.append("%s: nothing moves during %s" % [id, ", ".join(still)])
		# And the shape of them. Ten of the first fourteen came off the reconstruction standing on
		# a two-metre slab of studio floor — invisible to every check that only asks whether the
		# rig deforms, and unmissable the moment the party walked into a fight. A person is
		# taller than they are wide, even with both arms out.
		var box := _bounds(model)
		var height := maxf(0.001, box.size.y)
		if box.size.x > height * 1.4 or box.size.z > height * 0.9:
			trouble.append("%s: %.2f x %.2f x %.2f — that is a person on a slab, not a person"
				% [id, box.size.x, height, box.size.z])
		report[id] = {
			"bones": skeleton.get_bone_count(),
			"clips": player.get_animation_list().size(),
			"least_movement": snappedf(smallest, 0.00001),
			"size": [snappedf(box.size.x, 0.01), snappedf(height, 0.01),
				snappedf(box.size.z, 0.01)],
		}
		model.queue_free()

	print(JSON.stringify({"cast": report, "trouble": trouble}))
	quit(1 if not trouble.is_empty() else 0)


func _read(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.open(path, FileAccess.READ).get_as_text())
	return parsed if parsed is Dictionary else {}


## Every mesh under a node, in the node's own space.
func _bounds(node: Node) -> AABB:
	var box := AABB()
	var first := true
	var stack: Array = [node]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		if current is VisualInstance3D:
			var piece: AABB = (current as VisualInstance3D).get_aabb()
			var at: Transform3D = (current as Node3D).global_transform
			var world := at * piece
			box = world if first else box.merge(world)
			first = false
		for child in current.get_children():
			stack.append(child)
	return box


func _find(node: Node, kind: String) -> Node:
	if node.get_class() == kind:
		return node
	for child in node.get_children():
		var hit := _find(child, kind)
		if hit != null:
			return hit
	return null
