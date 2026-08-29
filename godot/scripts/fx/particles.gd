class_name ParticleField
extends RefCounted
##
## Particles, CPU-simulated, ported from `src/fx/particles.js`.
##
## The reference chose CPU simulation over a fire-and-forget GPU system for a stated reason:
## per-particle turbulence, drag, gravity flips and colour-over-life are awkward to express in
## a process material, and `implode` — which aims every particle so it arrives at the centre
## exactly as it dies — is the case that settles it. That argument holds in Godot, so this is
## a port of the integrator rather than a reach for `GPUParticles3D`.
##
## Parallel `PackedFloat32Array`s rather than an array of objects: no per-particle allocation,
## and nothing here allocates during a battle.
##
## **This file must never draw from `RNGStreams`.** The reference's emitters call
## `Math.random()`, and per-cast variation is correct — a bolt should jag differently every
## time. But the battle port is verified by comparing *draw sequences*, so a particle taking a
## number from the `battle` stream would desynchronise every fight and fail somewhere else
## entirely. Godot's own unseeded `randf()` is the right source here, and the only place in
## the port where it is.

const MAX_PARTICLES := 3000
const SHADER := preload("res://shaders/particle.gdshader")

var count := 0

## Total particles ever spawned by this field, monotonic across `update()` calls and reset
## only by `clear()`. Peak *concurrent* count depends on unseeded `randf()` lifetime jitter
## landing either side of a tick boundary, which makes it a poor fingerprint for "did this
## effect do what it always does" — the emitter counts in `spellfx.gd` are fixed constants,
## so this total is the same every run and is what the probe's per-element signature uses.
var spawned_total := 0

var multimesh: MultiMesh
var _instance: MultiMeshInstance3D

var positions := PackedFloat32Array()
var colors := PackedFloat32Array()
var sizes := PackedFloat32Array()
var alphas := PackedFloat32Array()

var _vx := PackedFloat32Array()
var _vy := PackedFloat32Array()
var _vz := PackedFloat32Array()
var _life := PackedFloat32Array()
var _max_life := PackedFloat32Array()
var _gravity := PackedFloat32Array()
var _drag := PackedFloat32Array()
var _base_size := PackedFloat32Array()
var _turbulence := PackedFloat32Array()
var _r0 := PackedFloat32Array()
var _g0 := PackedFloat32Array()
var _b0 := PackedFloat32Array()
var _r1 := PackedFloat32Array()
var _g1 := PackedFloat32Array()
var _b1 := PackedFloat32Array()

var _time := 0.0


func _init() -> void:
	positions.resize(MAX_PARTICLES * 3)
	colors.resize(MAX_PARTICLES * 3)
	sizes.resize(MAX_PARTICLES)
	alphas.resize(MAX_PARTICLES)
	for arr in [_vx, _vy, _vz, _life, _max_life, _gravity, _drag, _base_size,
			_turbulence, _r0, _g0, _b0, _r1, _g1, _b1]:
		arr.resize(MAX_PARTICLES)


## Read access for the probe: velocity is private state, and a checker that cannot see it
## cannot tell exponential drag from linear.
func velocity_x(i: int) -> float:
	return _vx[i]


## Put the field in the tree under `parent`. One `MultiMeshInstance3D` for the whole pool:
## three thousand particles is one draw call, and a Node3D each would be three thousand.
func attach(parent: Node3D) -> void:
	if _instance != null:
		detach()
	var quad := QuadMesh.new()
	quad.size = Vector2.ONE

	multimesh = MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_3D
	multimesh.use_colors = true
	multimesh.use_custom_data = true
	multimesh.mesh = quad
	multimesh.instance_count = MAX_PARTICLES
	multimesh.visible_instance_count = 0

	var material := ShaderMaterial.new()
	material.shader = SHADER
	quad.surface_set_material(0, material)

	_instance = MultiMeshInstance3D.new()
	_instance.multimesh = multimesh
	# Nothing here is worth culling against: the field is one node covering the whole stage,
	# and a bounding box computed from an empty pool culls every effect on the first frame.
	_instance.custom_aabb = AABB(Vector3(-500, -500, -500), Vector3(1000, 1000, 1000))
	_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(_instance)


func detach() -> void:
	if _instance != null and is_instance_valid(_instance):
		_instance.queue_free()
	_instance = null
	multimesh = null


## Spawn one particle. Returns false when the pool is full, exactly as the reference does —
## a full pool drops particles rather than growing, so a runaway effect cannot stall a frame.
##
## Explicit typed parameters rather than a options Dictionary: a Dictionary-of-named-arguments
## parameter style hangs the GDScript loader outright.
func spawn(x: float, y: float, z: float, vx: float, vy: float, vz: float,
		life: float, size: float, color: Color, end_color: Color,
		gravity: float, drag: float, turbulence: float) -> bool:
	if count >= MAX_PARTICLES:
		return false
	var i := count
	count += 1
	spawned_total += 1
	positions[i * 3] = x
	positions[i * 3 + 1] = y
	positions[i * 3 + 2] = z
	_vx[i] = vx
	_vy[i] = vy
	_vz[i] = vz
	_life[i] = life
	_max_life[i] = life
	_gravity[i] = gravity
	_drag[i] = drag
	_turbulence[i] = turbulence
	_base_size[i] = size
	_r0[i] = color.r
	_g0[i] = color.g
	_b0[i] = color.b
	_r1[i] = end_color.r
	_g1[i] = end_color.g
	_b1[i] = end_color.b
	return true


func update(dt: float) -> void:
	_time += dt
	var n := count
	var i := 0
	while i < n:
		_life[i] -= dt
		if _life[i] <= 0.0:
			# Swap-remove: keeps the live range contiguous with no gaps, so the draw range is
			# always 0..count and there are no holes to skip.
			var last := n - 1
			if i != last:
				_copy(last, i)
			n -= 1
			continue
		var t := 1.0 - _life[i] / _max_life[i]

		if _turbulence[i] > 0.0:
			var s := _time * 3.0 + float(i)
			_vx[i] += sin(s * 1.7) * _turbulence[i] * dt
			_vy[i] += cos(s * 2.3) * _turbulence[i] * dt * 0.6
			_vz[i] += sin(s * 1.1 + 2.0) * _turbulence[i] * dt
		_vy[i] += _gravity[i] * dt
		var k := exp(-_drag[i] * dt)
		_vx[i] *= k
		_vy[i] *= k
		_vz[i] *= k

		positions[i * 3] += _vx[i] * dt
		positions[i * 3 + 1] += _vy[i] * dt
		positions[i * 3 + 2] += _vz[i] * dt

		# Grow in fast, shrink out slow — reads as energy dissipating.
		var grow := t / 0.15 if t < 0.15 else 1.0 - (t - 0.15) / 0.85
		sizes[i] = _base_size[i] * (0.35 + grow * 0.85)
		alphas[i] = t / 0.1 if t < 0.1 else pow(1.0 - (t - 0.1) / 0.9, 1.4)

		colors[i * 3] = _r0[i] + (_r1[i] - _r0[i]) * t
		colors[i * 3 + 1] = _g0[i] + (_g1[i] - _g0[i]) * t
		colors[i * 3 + 2] = _b0[i] + (_b1[i] - _b0[i]) * t
		i += 1
	count = n
	_upload()


func _copy(from: int, to: int) -> void:
	positions[to * 3] = positions[from * 3]
	positions[to * 3 + 1] = positions[from * 3 + 1]
	positions[to * 3 + 2] = positions[from * 3 + 2]
	colors[to * 3] = colors[from * 3]
	colors[to * 3 + 1] = colors[from * 3 + 1]
	colors[to * 3 + 2] = colors[from * 3 + 2]
	for arr in [_vx, _vy, _vz, _life, _max_life, _gravity, _drag, _base_size,
			_turbulence, _r0, _g0, _b0, _r1, _g1, _b1, sizes, alphas]:
		arr[to] = arr[from]


## Push the live range into the MultiMesh. Called at the end of `update`.
func _upload() -> void:
	if multimesh == null:
		return
	multimesh.visible_instance_count = count
	for i in count:
		var origin := Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
		multimesh.set_instance_transform(i, Transform3D(Basis.IDENTITY, origin))
		multimesh.set_instance_color(i, Color(colors[i * 3], colors[i * 3 + 1],
			colors[i * 3 + 2], 1.0))
		# x is size, y is alpha — read by the shader out of INSTANCE_CUSTOM.
		multimesh.set_instance_custom_data(i, Color(sizes[i], alphas[i], 0.0, 0.0))


func clear() -> void:
	count = 0
	spawned_total = 0


# ---------------------------------------------------------------------------
# Emitter shapes
#
# Each is a direct port of `src/fx/particles.js`. The randomisation is Godot's own unseeded
# `randf()` — see the note at the top of this file for why it must not be a game stream.
# ---------------------------------------------------------------------------

## Outward burst from a point.
func burst(pos: Vector3, count_n := 40, speed := 4.0, spread := 1.0, life := 0.8,
		size := 0.5, color := Color(1, 1, 1), end_color := Color(1, 1, 1),
		gravity := -2.0, drag := 1.2, up := 0.0, turbulence := 0.0) -> void:
	for i in count_n:
		var theta := randf() * TAU
		var phi := acos(1.0 - 2.0 * randf() * spread)
		var s := speed * (0.5 + randf() * 0.8)
		spawn(
			pos.x + (randf() - 0.5) * 0.2,
			pos.y + (randf() - 0.5) * 0.2,
			pos.z + (randf() - 0.5) * 0.2,
			sin(phi) * cos(theta) * s,
			cos(phi) * s + up,
			sin(phi) * sin(theta) * s,
			life * (0.7 + randf() * 0.6),
			size * (0.6 + randf() * 0.8),
			color, end_color, gravity, drag, turbulence)


## A ring of particles racing outward along the ground.
func ring(pos: Vector3, count_n := 48, radius := 0.4, speed := 6.0, life := 0.6,
		size := 0.45, color := Color(1, 1, 1), end_color := Color(1, 1, 1),
		gravity := 0.0, drag := 2.2, up := 0.6) -> void:
	for i in count_n:
		var a := (float(i) / float(count_n)) * TAU + randf() * 0.1
		spawn(
			pos.x + cos(a) * radius,
			pos.y,
			pos.z + sin(a) * radius,
			cos(a) * speed,
			up * (0.5 + randf()),
			sin(a) * speed,
			life * (0.8 + randf() * 0.4),
			size * (0.7 + randf() * 0.6),
			color, end_color, gravity, drag, 0.0)


## A rising column, for holy light and flame pillars.
func column(pos: Vector3, count_n := 50, radius := 0.7, speed := 5.0, life := 1.0,
		size := 0.5, color := Color(1, 1, 1), end_color := Color(1, 1, 1),
		drag := 0.4, turbulence := 1.2) -> void:
	for i in count_n:
		var a := randf() * TAU
		var r := sqrt(randf()) * radius
		spawn(
			pos.x + cos(a) * r,
			pos.y + randf() * 0.4,
			pos.z + sin(a) * r,
			cos(a) * 0.4,
			speed * (0.6 + randf() * 0.8),
			sin(a) * 0.4,
			life * (0.6 + randf() * 0.8),
			size * (0.5 + randf() * 0.9),
			color, end_color, 0.4, drag, turbulence)


## Particles converging inward onto a point — a charge-up.
func implode(pos: Vector3, count_n := 44, radius := 3.2, life := 0.55, size := 0.42,
		color := Color(1, 1, 1), end_color := Color(1, 1, 1)) -> void:
	for i in count_n:
		var theta := randf() * TAU
		var phi := acos(1.0 - 2.0 * randf())
		var r := radius * (0.6 + randf() * 0.6)
		var px := pos.x + sin(phi) * cos(theta) * r
		var py := pos.y + cos(phi) * r * 0.6
		var pz := pos.z + sin(phi) * sin(theta) * r
		var l := life * (0.75 + randf() * 0.5)
		# Aim each particle so it arrives at the centre as it dies. No drag and no gravity,
		# because either would leave it short and the convergence is the whole effect.
		spawn(px, py, pz,
			(pos.x - px) / l, (pos.y - py) / l, (pos.z - pz) / l,
			l, size * (0.7 + randf() * 0.6),
			color, end_color, 0.0, 0.0, 0.0)


## A trail from A to B, used for projectiles and slashes.
func streak(from: Vector3, to: Vector3, count_n := 26, life := 0.45, size := 0.4,
		color := Color(1, 1, 1), end_color := Color(1, 1, 1),
		jitter := 0.25, drag := 1.4) -> void:
	for i in count_n:
		var t := float(i) / float(count_n)
		spawn(
			from.x + (to.x - from.x) * t + (randf() - 0.5) * jitter,
			from.y + (to.y - from.y) * t + (randf() - 0.5) * jitter,
			from.z + (to.z - from.z) * t + (randf() - 0.5) * jitter,
			(randf() - 0.5) * 1.5,
			(randf() - 0.5) * 1.5 + 0.6,
			(randf() - 0.5) * 1.5,
			life * (0.6 + randf() * 0.7),
			size * (0.6 + randf() * 0.8),
			color, end_color, -0.5, drag, 0.0)
