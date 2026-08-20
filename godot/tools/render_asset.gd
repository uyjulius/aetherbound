extends SceneTree
##
## Renders one generated asset to a PNG so the photoreal target can be judged
## from a picture instead of an intention.
##
##   godot --path godot --script res://tools/render_asset.gd -- well
##
## Deliberately *not* `--headless`: the headless driver is a dummy renderer and
## captures a blank image, which looks exactly like a failed asset import. A
## window opens for a second or two and closes itself.
##
## The lighting rig is the point as much as the mesh is. A generated asset shown
## under a default light reads as a lump; the same asset under a key/fill/rim
## setup with occlusion and a tonemap reads as a game object. That gap is most
## of what people mean by "AAA", and it belongs to the renderer, not to the
## generator.

const SIZE := Vector2i(1280, 1280)
const FRAMES_BEFORE_CAPTURE := 12


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var subject: String = args[0] if args.size() > 0 else "well"
	# A bare name means `assets/models`, where the generated spikes land. Anything with a slash
	# is taken as written, so a shipped prop or creature can be looked at where it actually
	# lives — which is the only way to judge the thing the game loads rather than its ancestor.
	var glb_path := subject if subject.contains("/") else "res://assets/models/%s.glb" % subject
	if subject.contains("/"):
		subject = glb_path.get_file().get_basename()

	if not ResourceLoader.exists(glb_path):
		push_error("no such asset: %s" % glb_path)
		quit(1)
		return

	# Drawn into a SubViewport, not into the window: the window's texture comes
	# back at the project's size rather than SIZE, and it holds whatever was
	# last presented rather than what is in the scene now. Both matter to a tool
	# whose entire output is a picture.
	var frame := SubViewport.new()
	frame.size = SIZE
	frame.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	frame.transparent_bg = false
	root.add_child(frame)

	var world := Node3D.new()
	frame.add_child(world)

	# --- environment ---------------------------------------------------------
	# A physical sky gives sane ambient and a horizon gradient for free, which
	# matters more than it sounds: most of a photoreal object's read comes from
	# what it reflects, and a flat grey ambient makes every material look chalky.
	var env := Environment.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.38, 0.48, 0.62)
	sky_material.sky_horizon_color = Color(0.62, 0.65, 0.68)
	sky_material.ground_bottom_color = Color(0.18, 0.16, 0.14)
	sky_material.ground_horizon_color = Color(0.42, 0.40, 0.37)
	sky_material.sun_angle_max = 12.0
	var sky := Sky.new()
	sky.sky_material = sky_material
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_sky_contribution = 1.0
	env.ssao_enabled = true
	env.ssao_intensity = 1.6
	env.ssil_enabled = true
	env.sdfgi_enabled = false          # one object; the sky ambient is enough
	env.glow_enabled = true
	env.glow_intensity = 0.5
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_white = 6.0

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	world.add_child(world_env)

	# --- lights --------------------------------------------------------------
	# Key, fill and rim. The rim is what separates a subject from its background
	# and is the single cheapest thing that makes a render look deliberate.
	var key := DirectionalLight3D.new()
	key.light_energy = 2.2
	key.light_color = Color(1.0, 0.96, 0.90)
	key.shadow_enabled = true
	key.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	key.directional_shadow_blend_splits = true
	key.rotation_degrees = Vector3(-38, -125, 0)
	world.add_child(key)

	var fill := DirectionalLight3D.new()
	fill.light_energy = 0.45
	fill.light_color = Color(0.72, 0.80, 1.0)
	fill.shadow_enabled = false
	fill.rotation_degrees = Vector3(-14, 55, 0)
	world.add_child(fill)

	var rim := DirectionalLight3D.new()
	rim.light_energy = 1.5
	rim.light_color = Color(1.0, 0.88, 0.72)
	rim.shadow_enabled = false
	rim.rotation_degrees = Vector3(-8, 40, 0)
	world.add_child(rim)

	# --- the asset -----------------------------------------------------------
	var scene: PackedScene = load(glb_path)
	var model: Node3D = scene.instantiate()
	world.add_child(model)

	var bounds := _aabb_of(model)
	if bounds.size == Vector3.ZERO:
		push_error("asset has no visible geometry: %s" % glb_path)
		quit(1)
		return

	# Sit it on the origin so the shadow has somewhere to land, and scale it to
	# a known height — generated meshes arrive at arbitrary scale, which is one
	# of the real costs of this pipeline and has to be normalised somewhere.
	# Generated meshes arrive at arbitrary scale and arbitrary origin, so both
	# are normalised here: two metres tall, base sitting on y=0. Normalising is
	# not cosmetic — it is the difference between an asset library you can drop
	# into a scene and a pile of models each needing hand-placement.
	var target_height := 2.0
	var scale_factor: float = target_height / maxf(bounds.size.y, 0.0001)
	model.scale = Vector3.ONE * scale_factor
	model.position = -bounds.position * scale_factor

	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(60, 60)
	ground.mesh = plane
	var ground_mat := StandardMaterial3D.new()
	ground_mat.albedo_color = Color(0.19, 0.18, 0.17)
	ground_mat.roughness = 0.92
	ground.material_override = ground_mat
	world.add_child(ground)

	# --- camera --------------------------------------------------------------
	# Framed from the *placed* bounds rather than the raw ones: the model has
	# been scaled and shifted since they were measured, and framing from stale
	# numbers is how the first render came out as a photograph of the horizon.
	var placed := AABB(Vector3.ZERO, bounds.size * scale_factor)
	var focus := placed.position + placed.size * 0.5
	var radius: float = placed.size.length() * 0.5
	var camera := Camera3D.new()
	camera.fov = 40.0
	var dist: float = (radius / tan(deg_to_rad(camera.fov) * 0.5)) * 1.28
	world.add_child(camera)

	var angles := {"": 38.0, "-side": 118.0, "-rear": 205.0}
	var out_dir := ProjectSettings.globalize_path("res://../.renders")
	DirAccess.make_dir_recursive_absolute(out_dir)
	var written: Array = []
	var digests: Array[int] = []

	for suffix in angles:
		var yaw: float = deg_to_rad(angles[suffix])
		var eye := focus + Vector3(sin(yaw) * dist * 0.86, dist * 0.42, cos(yaw) * dist * 0.86)
		# `look_at_from_position`, because `look_at` requires the node to be
		# inside the tree already and otherwise silently leaves the camera
		# facing its default direction.
		camera.look_at_from_position(eye, focus, Vector3.UP)

		for i in FRAMES_BEFORE_CAPTURE:
			await process_frame

		# Wait for a completed draw before reading. Idle frames are not draws,
		# and a capture taken without this can be the previous angle.
		await RenderingServer.frame_post_draw
		var image := frame.get_texture().get_image()
		var path := "%s/%s%s.png" % [out_dir, subject, suffix]
		image.save_png(path)
		written.append(path.get_file())
		digests.append(_digest(image))

	# Three different yaws around one object cannot produce one image. If they
	# do, the capture is not following the camera and the renders are worthless
	# even though they exist.
	if digests.min() == digests.max():
		push_error("every angle of %s is the same image — the capture is not following the camera" % subject)
		quit(1)
		return

	var tris := _triangle_count(model)
	print("RENDER_OK subject=%s tris=%d aabb=%s scale=%.4f -> %s"
		% [subject, tris, str(bounds.size), scale_factor, ", ".join(written)])
	quit()


## A cheap fingerprint: every 997th byte folded together, enough to tell two
## captures apart without walking the whole buffer for each one.
func _digest(image: Image) -> int:
	var data := image.get_data()
	var value := 0
	for i in range(0, data.size(), 997):
		value = (value * 31 + data[i]) & 0x3FFFFFFF
	return value


## Combined world-space bounds of every mesh under a node.
func _aabb_of(node: Node) -> AABB:
	var out := AABB()
	var seeded := false
	for child in _all_descendants(node):
		if child is MeshInstance3D and child.mesh != null:
			var box: AABB = child.get_aabb()
			box = child.transform * box
			if not seeded:
				out = box
				seeded = true
			else:
				out = out.merge(box)
	return out


func _triangle_count(node: Node) -> int:
	var total := 0
	for child in _all_descendants(node):
		if child is MeshInstance3D and child.mesh != null:
			var mesh: Mesh = child.mesh
			for surface in mesh.get_surface_count():
				var arrays: Array = mesh.surface_get_arrays(surface)
				var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
				if indices.size() > 0:
					total += indices.size() / 3
				else:
					var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
					total += verts.size() / 3
	return total


func _all_descendants(node: Node) -> Array:
	var out: Array = [node]
	for child in node.get_children():
		out.append_array(_all_descendants(child))
	return out
