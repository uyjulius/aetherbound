extends SceneTree
##
## Every shipped creature, proven to be a creature rather than a statue or a paving stone.
##
##   godot --headless --path godot --script res://tools/check_bestiary.gd
##
## The bestiary half of `check_cast.gd`, and it exists for the same silent failures — a mesh
## that carries a skin and animates nothing, and a reconstruction that turned the studio floor
## into geometry. What is different here is that a creature has no fixed shape to check
## against. A wolf is twice as long as it is tall and that is correct; a wolf that is twice as
## *wide* as it is tall is standing on a slab. So the silhouette test is per body plan, and the
## numbers below are what each plan can honestly be.
##
## Clip resolution goes through `CastModels` rather than being repeated here. The game finds a
## creature's animations by pattern and falls back along its own chain — `cast` to `attack`,
## `run` to `walk` — and a check that resolved clips its own way would prove the files are fine
## while the game still played the wrong one.
##
## Both defects are measured directly rather than inferred from proportions, which is the
## lesson from writing this one against the roster it replaces. A first draft asked whether a
## creature was wider than its body plan allows; a real spider is three times as wide as it is
## tall and a real dragon nearly so, and the only way to admit them was to open the limits far
## enough to admit a paving stone as well. So: a statue is a mesh whose skin weights are zero,
## which is a number the file carries, and a slab is a dense sheet of vertices in one
## horizontal plane, which is a number the vertices carry.
##
## There is deliberately no proportion test left. One was written, tuned per body plan, and
## thrown away: a stock manta ray measures nine times as long as it is tall and a stock spider
## three times as wide, so any limit loose enough to admit them admits a paving stone too. The
## floor-share number separates the same models cleanly, and it separates them because it is
## measuring the defect instead of a symptom of it.

## What the game asks a creature to do, by name.
const CLIPS := ["idle", "walk", "run", "attack", "cast", "hurt", "dead"]

## The clips these models are authored with. Everything else in `CLIPS` reaches one of them
## through the fallback chain, so these are the ones that have to exist.
const AUTHORED := ["idle", "walk", "attack", "hurt", "dead"]

const MODELS := "res://assets/monsters"

## How much of a creature may sit in the thin slice of space just above its lowest point.
##
## The reconstruction turns the concept view's floor into a sheet, and a sheet is dense: the
## slab under the first characters carried thousands of vertices in one plane, where a pair of
## feet carries a few dozen. A quarter of the mesh is far past anything a foot, a paw or a
## slime's flat underside accounts for.
## Where the line is, from measurement rather than taste. Corvin was rebuilt with the backdrop
## cutter switched off and came back on his slab at **0.476**; cut properly he is **0.018**, the
## wolf is **0.034**, and the worst of the thirty-six bought models this roster replaces — a
## creature that sits flat on the ground by design — is **0.199**. Anything above three tenths
## is floor.
const FLOOR_SHARE := 0.30

## The slice, as a fraction of the creature's height. Thin enough that a stumpy leg is not
## mistaken for a floor.
const FLOOR_SLICE := 0.03


## Just enough of the database for `CastModels` to resolve a clip name.
class Tables extends RefCounted:
	var monster_models: Dictionary
	var char_models: Dictionary = {}

	func _init(models: Dictionary) -> void:
		monster_models = models


func _initialize() -> void:
	var table: Dictionary = _read("res://data/monster_models.json")
	var models := CastModels.new(Tables.new(table))
	var report := {}
	var trouble: Array = []
	var plans: Dictionary = table.get("plans", {})
	var plan_names: Array = plans.keys()
	plan_names.sort()

	for plan in plan_names:
		for entry in plans[plan]:
			var id := String(entry.get("id", ""))
			var path := "%s/%s.glb" % [MODELS, id]
			if not FileAccess.file_exists(path):
				trouble.append("%s (%s): no model at %s" % [id, plan, path])
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

			var carried := models.clips_of(model)
			var missing: Array = []
			for clip in AUTHORED:
				if not carried.has(clip):
					missing.append(clip)
			if not missing.is_empty():
				trouble.append("%s: missing %s" % [id, ", ".join(missing)])

			var still: Array = []
			var unresolved: Array = []
			var smallest := 1e9
			for clip in CLIPS:
				# Back to the bound pose first: a bone with no track in this clip keeps whatever
				# the last one left it at, and without this the check depends on clip order.
				skeleton.reset_bone_poses()
				var played := models.play_monster_clip(model as Node3D, clip)
				if played.is_empty():
					unresolved.append(clip)
					continue
				var length: float = player.get_animation(played).length
				player.seek(0.0, true)
				await process_frame
				var before := _pose(skeleton)
				player.seek(length * 0.34, true)
				await process_frame
				var after := _pose(skeleton)
				# Every bone, taking the largest. Naming one bone to watch was the first attempt
				# and it decides the verdict by luck: these rigs come from four skeletons and the
				# packs they replace from eight, `head` is not in all of them, and the fallback
				# landed on whichever bone happened to be third — sometimes the hips, which a walk
				# cycle barely moves. What is under test is whether the clip moves anything.
				var moved := 0.0
				for i in before.size():
					moved = maxf(moved, (before[i].origin - after[i].origin).length()
						+ (before[i].basis.get_euler() - after[i].basis.get_euler()).length())
				smallest = minf(smallest, moved)
				if moved < 0.0005:
					still.append("%s (%s)" % [clip, played])
			if not unresolved.is_empty():
				trouble.append("%s: the game asks for %s and this file answers nothing"
					% [id, ", ".join(unresolved)])
			if not still.is_empty():
				trouble.append("%s: nothing moves during %s" % [id, ", ".join(still)])

			var box := _bounds(model)
			var height := maxf(0.001, box.size.y)
			var floor_share := _floor_share(model, box)
			if floor_share > FLOOR_SHARE:
				trouble.append("%s: %d%% of the mesh lies in the bottom %d%% of its height — "
					% [id, roundi(floor_share * 100.0), roundi(FLOOR_SLICE * 100.0)]
					+ "that is a creature standing on a sheet of reconstructed floor")
			var weighted := _weighted_share(model)
			if weighted < 0.5:
				trouble.append("%s: only %d%% of its vertices carry any bone weight — the skin "
					% [id, roundi(weighted * 100.0)]
					+ "is bound to nothing and the mesh will not move whatever plays")
			report[id] = {
				"plan": plan,
				"bones": skeleton.get_bone_count(),
				"clips": carried.size(),
				"least_movement": snappedf(smallest, 0.00001),
				"floor_share": snappedf(floor_share, 0.001),
				"weighted": snappedf(weighted, 0.001),
				"size": [snappedf(box.size.x, 0.01), snappedf(height, 0.01),
					snappedf(box.size.z, 0.01)],
			}
			model.queue_free()

	print(JSON.stringify({"bestiary": report, "trouble": trouble}))
	quit(1 if not trouble.is_empty() else 0)


## Every bone's global pose, for comparing one instant against another.
func _pose(skeleton: Skeleton3D) -> Array:
	var out: Array = []
	for i in skeleton.get_bone_count():
		out.append(skeleton.get_bone_global_pose(i))
	return out


## What share of the mesh sits in the thin slice above the model's lowest point.
func _floor_share(node: Node, box: AABB) -> float:
	var slice := box.position.y + box.size.y * FLOOR_SLICE
	var low := 0
	var total := 0
	for mesh in _meshes(node):
		for surface in mesh.mesh.get_surface_count():
			var arrays: Array = mesh.mesh.surface_get_arrays(surface)
			var points: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
			for point in points:
				total += 1
				if (mesh.global_transform * point).y <= slice:
					low += 1
	return 0.0 if total == 0 else float(low) / float(total)


## What share of the mesh's vertices carry any bone weight at all.
##
## The number that says statue. Blender's automatic weighting reports success on a
## marching-cubes mesh while binding nothing, and the export that follows carries a skeleton,
## inverse bind matrices and every clip — all of it driving no vertices.
func _weighted_share(node: Node) -> float:
	var carried := 0
	var total := 0
	for mesh in _meshes(node):
		for surface in mesh.mesh.get_surface_count():
			var arrays: Array = mesh.mesh.surface_get_arrays(surface)
			# Absent rather than empty: a surface with no skin has `null` in the weights slot,
			# and every one of its vertices is a vertex bound to nothing.
			if arrays[Mesh.ARRAY_WEIGHTS] == null:
				total += (arrays[Mesh.ARRAY_VERTEX] as PackedVector3Array).size()
				continue
			var weights: PackedFloat32Array = arrays[Mesh.ARRAY_WEIGHTS]
			var format: int = mesh.mesh.surface_get_format(surface)
			var per := 8 if format & Mesh.ARRAY_FLAG_USE_8_BONE_WEIGHTS else 4
			var i := 0
			while i + per <= weights.size():
				total += 1
				for k in per:
					if weights[i + k] > 0.0:
						carried += 1
						break
				i += per
	return 0.0 if total == 0 else float(carried) / float(total)


func _meshes(node: Node) -> Array:
	var out: Array = []
	var stack: Array = [node]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		if current is MeshInstance3D and (current as MeshInstance3D).mesh != null:
			out.append(current)
		for child in current.get_children():
			stack.append(child)
	return out


func _read(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.open(path, FileAccess.READ).get_as_text())
	return parsed if parsed is Dictionary else {}


func _bounds(node: Node) -> AABB:
	var box := AABB()
	var first := true
	var stack: Array = [node]
	while not stack.is_empty():
		var current: Node = stack.pop_back()
		if current is VisualInstance3D:
			var piece: AABB = (current as VisualInstance3D).get_aabb()
			var at: Transform3D = (current as Node3D).global_transform
			box = (at * piece) if first else box.merge(at * piece)
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
