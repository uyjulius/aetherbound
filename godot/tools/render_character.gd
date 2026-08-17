extends SceneTree
##
## Loads a rigged character, proves the skin actually deforms, and renders a
## strip of poses from one clip.
##
##   godot --path godot --script res://tools/render_character.gd -- \
##       /abs/path/to/character.glb attack
##
## Loaded at runtime through GLTFDocument rather than imported into the project,
## so a throwaway fixture never has to become a committed asset just to be
## tested.
##
## The deformation assertion is the point. A character can carry a skin, twenty
## joints, inverse bind matrices and eight animations and still render as a
## statue — Blender's heat weighting produces exactly that, weights present and
## all of them zero. Playback "working" proves nothing on its own, so this
## samples a bone's pose at two times in the clip and fails if nothing moved.

const SIZE := Vector2i(900, 1200)
const SETTLE_FRAMES := 6


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		push_error("usage: -- <path-to.glb> [clip]")
		quit(1)
		return
	var path: String = args[0]
	var clip: String = args[1] if args.size() > 1 else "attack"

	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	if doc.append_from_file(path, state) != OK:
		push_error("could not read %s" % path)
		quit(1)
		return
	var model: Node = doc.generate_scene(state)
	if model == null:
		push_error("no scene in %s" % path)
		quit(1)
		return

	var window := root
	window.size = SIZE

	var world := Node3D.new()
	window.add_child(world)
	_light(world)
	world.add_child(model)

	var player: AnimationPlayer = _find(model, "AnimationPlayer") as AnimationPlayer
	var skeleton: Skeleton3D = _find(model, "Skeleton3D") as Skeleton3D
	if player == null or skeleton == null:
		push_error("missing AnimationPlayer or Skeleton3D — the export is not rigged")
		quit(1)
		return

	var names := player.get_animation_list()
	print("CLIPS ", ", ".join(names))
	if not names.has(clip):
		push_error("no clip %s" % clip)
		quit(1)
		return

	var anim: Animation = player.get_animation(clip)
	var length: float = anim.length

	# --- does anything actually move? ---------------------------------------
	# Sample the same bone at the start of the clip and a third of the way in.
	# A rig that is bound but unweighted, or a clip that keyed nothing, leaves
	# these identical.
	var probe := skeleton.find_bone("forearm.R")
	if probe < 0:
		probe = mini(3, skeleton.get_bone_count() - 1)
	player.play(clip)
	player.seek(0.0, true)
	await process_frame
	var pose_a: Transform3D = skeleton.get_bone_global_pose(probe)
	player.seek(length * 0.34, true)
	await process_frame
	var pose_b: Transform3D = skeleton.get_bone_global_pose(probe)
	var moved: float = (pose_a.origin - pose_b.origin).length() \
		+ (pose_a.basis.get_euler() - pose_b.basis.get_euler()).length()
	print("DEFORM bone=%s delta=%.5f" % [skeleton.get_bone_name(probe), moved])
	if moved < 0.0005:
		push_error("the skeleton does not move during '%s' — this would ship as a statue" % clip)
		quit(1)
		return

	# --- frame and shoot -----------------------------------------------------
	var bounds := _aabb_of(model)
	var focus := bounds.position + bounds.size * 0.5
	var radius: float = bounds.size.length() * 0.5
	var camera := Camera3D.new()
	camera.fov = 34.0
	world.add_child(camera)
	var dist: float = (radius / tan(deg_to_rad(camera.fov) * 0.5)) * 1.12
	camera.look_at_from_position(
		focus + Vector3(dist * 0.42, dist * 0.16, dist * 0.9), focus, Vector3.UP)

	var out_dir := ProjectSettings.globalize_path("res://../.renders")
	DirAccess.make_dir_recursive_absolute(out_dir)
	var shots: Array = []
	for i in 4:
		var t: float = length * (float(i) / 4.0)
		player.seek(t, true)
		for f in SETTLE_FRAMES:
			await process_frame
		var image := window.get_texture().get_image()
		var file := "%s/pose-%s-%d.png" % [out_dir, clip, i]
		image.save_png(file)
		shots.append(file.get_file())

	print("RENDER_OK clip=%s length=%.2fs frames=%s" % [clip, length, ", ".join(shots)])
	quit()


func _light(world: Node3D) -> void:
	var env := Environment.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.36, 0.45, 0.60)
	sky_material.sky_horizon_color = Color(0.60, 0.63, 0.67)
	sky_material.ground_bottom_color = Color(0.16, 0.15, 0.14)
	sky_material.ground_horizon_color = Color(0.40, 0.38, 0.36)
	var sky := Sky.new()
	sky.sky_material = sky_material
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_sky_contribution = 1.0
	env.ssao_enabled = true
	env.ssao_intensity = 1.4
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_white = 6.0
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	world.add_child(world_env)

	var key := DirectionalLight3D.new()
	key.light_energy = 2.4
	key.light_color = Color(1.0, 0.96, 0.90)
	key.shadow_enabled = true
	key.rotation_degrees = Vector3(-34, -132, 0)
	world.add_child(key)

	var fill := DirectionalLight3D.new()
	fill.light_energy = 0.5
	fill.light_color = Color(0.70, 0.79, 1.0)
	fill.rotation_degrees = Vector3(-10, 62, 0)
	world.add_child(fill)

	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(40, 40)
	ground.mesh = plane
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.18, 0.17, 0.16)
	mat.roughness = 0.94
	ground.material_override = mat
	world.add_child(ground)


func _find(node: Node, cls: String) -> Node:
	if node.get_class() == cls:
		return node
	for child in node.get_children():
		var hit := _find(child, cls)
		if hit != null:
			return hit
	return null


func _aabb_of(node: Node) -> AABB:
	var out := AABB()
	var seeded := false
	for child in _all(node):
		if child is VisualInstance3D:
			var box: AABB = child.get_aabb()
			box = child.global_transform * box
			if not seeded:
				out = box
				seeded = true
			else:
				out = out.merge(box)
	return out


func _all(node: Node) -> Array:
	var out: Array = [node]
	for child in node.get_children():
		out.append_array(_all(child))
	return out
