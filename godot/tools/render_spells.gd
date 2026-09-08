extends SceneTree
##
## Renders three meaningful moments from every spell into one strip per element.
##
##   godot --path godot --script res://tools/render_spells.gd
##
## This deliberately needs a real display driver. The simulation probe can run headless, but
## it cannot prove that the MultiMesh data, shader, blend mode and camera produce pixels.

const ParticleField := preload("res://scripts/fx/particles.gd")
const SpellFX := preload("res://scripts/fx/spellfx.gd")
const Scheduler := preload("res://scripts/engine/scheduler.gd")

const SIZE := Vector2i(480, 480)
const STEP := 1.0 / 60.0
const ELEMENTS := ["fire", "ice", "bolt", "water", "wind", "earth",
	"poison", "holy", "shadow", "aether", "heal", "physical"]

# Samples follow each spell's authored beats rather than using the same three times for all.
# In particular, ice's implode does not begin until its circle has opened, and shadow's burst
# does not happen until its long collapse has finished.
const SAMPLES := {
	"fire": [0.36, 0.66, 0.96],
	"ice": [0.36, 0.86, 1.06],
	"bolt": [0.03, 0.14, 0.34],
	"water": [0.30, 0.62, 0.96],
	"wind": [0.08, 0.25, 0.55],
	"earth": [0.03, 0.20, 0.48],
	"poison": [0.28, 0.56, 0.86],
	"holy": [0.38, 0.58, 0.92],
	"shadow": [0.38, 0.72, 1.12],
	"aether": [0.36, 0.76, 1.12],
	"heal": [0.05, 0.25, 0.48],
	"physical": [0.03, 0.12, 0.25],
}

var _failures: Array[String] = []


func _initialize() -> void:
	if DisplayServer.get_name() == "headless":
		push_error("render_spells.gd needs a real display driver; omit --headless")
		quit(1)
		return

	var out_dir := ProjectSettings.globalize_path("res://../.renders")
	DirAccess.make_dir_recursive_absolute(out_dir)

	var viewport := SubViewport.new()
	viewport.size = SIZE
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport.transparent_bg = false
	get_root().add_child(viewport)

	var world := Node3D.new()
	viewport.add_child(world)
	_build_stage(world)
	for ignored in 3:
		await process_frame
	await RenderingServer.frame_post_draw
	var empty := viewport.get_texture().get_image()

	var strip_hashes := {}
	var mutation_empty := "--mutation-empty" in OS.get_cmdline_user_args()
	for element in ELEMENTS:
		seed(element.hash())
		var stage := Node3D.new()
		world.add_child(stage)
		var field = ParticleField.new()
		field.attach(stage)
		var ctx = SpellFX.FXContext.new()
		ctx.stage = stage
		ctx.particles = field
		# A built-in deliberate break exercises the pixel assertions without transiently editing
		# the shared particle shader. It has the same observable result as ALPHA = 0.0.
		ctx.recording = mutation_empty
		var scheduler = Scheduler.new()
		scheduler.run(func(r):
			await SpellFX.play(r, ctx, element, Vector3(0.0, 1.0, 0.0)), element)

		var samples: Array = SAMPLES[element]
		var images: Array[Image] = []
		var changed := 0
		var elapsed := 0.0
		var shot := 0
		var upload_checked := false
		while shot < samples.size() and elapsed < 3.0:
			scheduler.update(STEP)
			field.update(STEP)
			elapsed += STEP
			if not upload_checked and field.count > 0 and not mutation_empty:
				_check_multimesh_upload(element, field)
				upload_checked = true
			if elapsed + 0.0001 >= float(samples[shot]):
				await process_frame
				await RenderingServer.frame_post_draw
				var image := viewport.get_texture().get_image()
				images.append(image)
				shot += 1

		if images.size() != samples.size():
			_failures.append("%s produced only %d samples" % [element, images.size()])
		else:
			for image in images:
				if _different_pixels(empty, image) >= 24:
					changed += 1
			if changed == 0:
				_failures.append("%s is identical to the empty stage at every sample" % element)
			var strip := _make_strip(images)
			var file := "%s/spell_%s.png" % [out_dir, element]
			var error := strip.save_png(file)
			if error != OK:
				_failures.append("%s could not be saved (%s)" % [element, error_string(error)])
			var key := hash(strip.get_data())
			if strip_hashes.has(key):
				_failures.append("%s strip is identical to %s" % [element, strip_hashes[key]])
			strip_hashes[key] = element

		# Finish the effect after its last capture so suspended frames release their resources.
		while scheduler.is_busy() and elapsed < 5.0:
			scheduler.update(STEP)
			field.update(STEP)
			elapsed += STEP
		if scheduler.is_busy():
			_failures.append("%s did not finish within five seconds" % element)
			scheduler.cancel_all()
		field.detach()
		stage.queue_free()
		await process_frame
		print("RENDERED %s changed=%d/3" % [element, changed])

	if _failures.is_empty():
		print("RENDER_OK 12 distinct strips; every spell changes the empty stage")
		quit(0)
	else:
		for line in _failures:
			print("RENDER_FAIL %s" % line)
		quit(1)


func _build_stage(world: Node3D) -> void:
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("101522")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("78839a")
	environment.ambient_light_energy = 0.45
	var world_environment := WorldEnvironment.new()
	world_environment.environment = environment
	world.add_child(world_environment)

	var floor_mesh := PlaneMesh.new()
	floor_mesh.size = Vector2(18.0, 18.0)
	var floor_material := StandardMaterial3D.new()
	floor_material.albedo_color = Color("202838")
	floor_material.roughness = 1.0
	floor_mesh.material = floor_material
	var floor_node := MeshInstance3D.new()
	floor_node.mesh = floor_mesh
	world.add_child(floor_node)

	var camera := Camera3D.new()
	camera.fov = 42.0
	world.add_child(camera)
	camera.look_at_from_position(Vector3(6.2, 4.3, 8.4), Vector3(0.0, 1.4, 0.0), Vector3.UP)
	camera.current = true


# These two assertions are intentionally here rather than in the headless probe: Godot's
# headless display driver accepts per-instance writes but reads back zeroes. A real renderer
# must preserve both the transform and INSTANCE_CUSTOM payload that the particle shader reads.
func _check_multimesh_upload(element: String, field) -> void:
	var transform: Transform3D = field.multimesh.get_instance_transform(0)
	var expected := Vector3(field.positions[0], field.positions[1], field.positions[2])
	if not transform.origin.is_equal_approx(expected):
		_failures.append("%s particle transform did not reach the MultiMesh" % element)
	var custom: Color = field.multimesh.get_instance_custom_data(0)
	if absf(custom.r - field.sizes[0]) > 0.0001 or absf(custom.g - field.alphas[0]) > 0.0001:
		_failures.append("%s particle size/alpha did not reach INSTANCE_CUSTOM" % element)


func _different_pixels(a: Image, b: Image) -> int:
	var changed := 0
	# Sample a regular grid. Twenty-four changed points is enough to reject compression-sized
	# noise while still catching the narrow lightning bolt and physical slash.
	for y in range(0, SIZE.y, 4):
		for x in range(0, SIZE.x, 4):
			var ca := a.get_pixel(x, y)
			var cb := b.get_pixel(x, y)
			if absf(ca.r - cb.r) + absf(ca.g - cb.g) + absf(ca.b - cb.b) > 0.025:
				changed += 1
	return changed


func _make_strip(images: Array[Image]) -> Image:
	var strip := Image.create(SIZE.x * images.size(), SIZE.y, false, Image.FORMAT_RGBA8)
	for i in images.size():
		var source: Image = images[i]
		if source.get_format() != Image.FORMAT_RGBA8:
			source.convert(Image.FORMAT_RGBA8)
		strip.blit_rect(source, Rect2i(Vector2i.ZERO, SIZE), Vector2i(i * SIZE.x, 0))
	return strip
