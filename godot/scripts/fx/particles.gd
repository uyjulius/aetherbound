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

var count := 0

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


func clear() -> void:
	count = 0
