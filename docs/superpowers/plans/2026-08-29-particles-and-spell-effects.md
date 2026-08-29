# Particles and Spell Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Godot port the twelve spell effects it does not have, so that Fire, Blizzard, Bolt, Holy and Shadow stop being the same coloured light with a different hue.

**Architecture:** A pooled CPU particle integrator ported line-for-line from the reference (`ParticleField`), drawn as one `MultiMeshInstance3D` of billboarded quads; five mesh-effect builders; twelve effect coroutines on the port's already-proven `scheduler.gd`. Checked two ways — an emission transcript compared against the reference's *own* code running headless in Node, and a behavioural probe run against a live field inside Godot.

**Tech Stack:** GDScript (Godot 4.7), `.gdshader`, Node ESM harnesses, Three.js (reference side only, as the oracle).

**Spec:** `docs/superpowers/specs/2026-08-28-fx-layer-design.md`

## Global Constraints

- **Never draw from `RNGStreams`.** The fx layer uses Godot's own unseeded `randf()`. The battle port is verified by comparing draw sequences; a particle taking a draw from the `battle` stream desynchronises every fight and fails far from the cause. `scenery.gd:320` avoids `randf()` for the opposite reason — that comment is about world determinism, not this.
- **`_initialize`, never `_init`,** on a `SceneTree` script. `_init` runs before the tree exists and `quit()` there hangs headless Godot with no output.
- **`godot --script` on a non-`SceneTree` script hangs** instead of erroring. To syntax-check a plain class, run `godot --headless --path godot --import`.
- **A parse error in a `preload`ed script hangs headless Godot with no output.** If a probe hangs, run the script directly to get the message.
- **Never use a Dictionary of named arguments as a parameter style** — it hangs the script loader outright. Use explicit typed parameters.
- **`Callable.call()` returns Variant.** `var x := cb.call(...)` compiles in the editor and fails only at *export*. Always annotate: `var x: float = cb.call(...)`.
- **Compare floats as integer millionths ±1** in harnesses. `toFixed` and `snappedf` round exact halves opposite ways.
- **Never compare formatted numbers**: Godot prints `4.0` where JS prints `4`.
- Godot is invoked as `godot --headless --path godot --script res://tools/<probe>.gd`, with the binary overridable by the `GODOT` environment variable — follow `tools/cast-parity.mjs:33`.
- Particle pool ceiling is `MAX_PARTICLES = 3000`, the reference's figure.

---

## File Structure

| File | Responsibility |
|---|---|
| `godot/scripts/fx/particles.gd` (create) | `ParticleField`: pool, integrator, five emitters, MultiMesh drawing |
| `godot/shaders/particle.gdshader` (create) | Billboarded additive disc, size/alpha from `INSTANCE_CUSTOM` |
| `godot/scripts/fx/effects.gd` (create) | Five mesh builders + `dispose_effect` |
| `godot/scripts/fx/spellfx.gd` (create) | Twelve effect coroutines + `play(ctx, element, pos)` |
| `godot/tools/fx_probe.gd` (create) | Behavioural assertions against a live field; transcript dump |
| `tools/fx-parity.mjs` (create) | Reference oracle vs port transcript |
| `godot/scripts/ui/battle_view.gd` (modify) | Owns a `Scheduler` + `ParticleField`; damage lands after the visual |
| `package.json` (modify) | `fx-parity` joins `npm run port` |
| `tools/web-smoke.mjs` (modify) | One check: a cast spell emitted particles |

---

### Task 1: The particle pool and its integrator

**Files:**
- Create: `godot/scripts/fx/particles.gd`
- Create: `godot/tools/fx_probe.gd`

**Interfaces:**
- Consumes: nothing.
- Produces: `ParticleField.new()` with `spawn(x, y, z, vx, vy, vz, life, size, color: Color, end_color: Color, gravity, drag, turbulence) -> bool`, `update(dt: float) -> void`, `clear() -> void`, `count: int`, and read-only access to `positions: PackedFloat32Array`, `sizes`, `alphas`, `colors` for the probe.

- [ ] **Step 1: Write the failing probe**

Create `godot/tools/fx_probe.gd`:

```gdscript
extends SceneTree
##
## The effects layer, proven to be effects rather than a table of intentions.
##
##   godot --headless --path godot --script res://tools/fx_probe.gd
##
## `fx-parity.mjs` compares what each effect *asks for* against the reference's own code.
## This is the other half, and it is the half that matters: on 20 August a transcript harness
## passed all 124 scenes while a dozen handlers did nothing at all. So this runs the real
## integrator and asks whether the particles moved.

const ParticleField := preload("res://scripts/fx/particles.gd")

var _failures: Array = []
var _checked := 0

func _check(name: String, ok: bool, detail := "") -> void:
	_checked += 1
	if not ok:
		_failures.append("%s — %s" % [name, detail])


func _initialize() -> void:
	_integrator()

	if _failures.is_empty():
		print("FX_OK %d checks" % _checked)
		quit(0)
	else:
		for line in _failures:
			print("FX_FAIL %s" % line)
		quit(1)


## The pool itself: a particle that is spawned exists, moves the way the reference integrates
## it, and is gone the tick after its life runs out.
func _integrator() -> void:
	var field = ParticleField.new()

	field.spawn(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.5,
		Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0, 0.0)
	_check("a spawned particle is in the pool", field.count == 1, "count %d" % field.count)

	# No drag, no gravity: after a quarter second at one unit per second it is a quarter of a
	# unit along x, and nowhere else.
	field.update(0.25)
	_check("it integrates velocity",
		absf(field.positions[0] - 0.25) < 0.0001, "x %f" % field.positions[0])
	_check("and moves on no other axis",
		absf(field.positions[1]) < 0.0001 and absf(field.positions[2]) < 0.0001,
		"y %f z %f" % [field.positions[1], field.positions[2]])

	# Drag is exponential in the reference: v *= exp(-drag * dt).
	var dragged = ParticleField.new()
	dragged.spawn(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 10.0, 1.0,
		Color(1, 1, 1), Color(1, 1, 1), 0.0, 2.0, 0.0)
	dragged.update(0.5)
	var expected := exp(-2.0 * 0.5)
	_check("drag decays velocity exponentially",
		absf(dragged.velocity_x(0) - expected) < 0.0001,
		"vx %f expected %f" % [dragged.velocity_x(0), expected])

	# Colour is lerped from start to end across the lifetime. Half way through a one-second
	# life, white-to-black is grey.
	var faded = ParticleField.new()
	faded.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0,
		Color(1, 1, 1), Color(0, 0, 0), 0.0, 0.0, 0.0)
	faded.update(0.5)
	_check("colour lerps over life",
		absf(faded.colors[0] - 0.5) < 0.01, "r %f" % faded.colors[0])

	# And the pool drains. A field that never frees a slot fills up and every later effect
	# silently draws nothing.
	var dying = ParticleField.new()
	dying.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 1.0,
		Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0, 0.0)
	dying.update(0.2)
	_check("a dead particle leaves the pool", dying.count == 0, "count %d" % dying.count)

	# Swap-remove has to keep the live range contiguous. Kill the middle one of three and the
	# survivors must both still be there.
	var three = ParticleField.new()
	for i in 3:
		three.spawn(float(i), 0.0, 0.0, 0.0, 0.0, 0.0,
			0.1 if i == 1 else 5.0, 1.0, Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0, 0.0)
	three.update(0.2)
	_check("swap-remove keeps survivors", three.count == 2, "count %d" % three.count)
	var xs: Array = [three.positions[0], three.positions[3]]
	xs.sort()
	_check("and keeps the right ones", xs[0] == 0.0 and xs[1] == 2.0, str(xs))
```

- [ ] **Step 2: Run the probe to verify it fails**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: FAIL — the preload of `res://scripts/fx/particles.gd` cannot resolve, so the script does not load. (If it hangs with no output instead, that is the documented `preload` parse-error behaviour — the file genuinely does not exist yet, which is the failure being demonstrated.)

- [ ] **Step 3: Write the pool and integrator**

Create `godot/scripts/fx/particles.gd`. Ported from `src/fx/particles.js` — the parallel-array layout, the swap-remove, and the integration order are all the reference's and are kept:

```gdscript
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
```

- [ ] **Step 4: Run the probe to verify it passes**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: `FX_OK 7 checks`, exit 0.

- [ ] **Step 5: Break it once, on purpose**

Change `var k := exp(-_drag[i] * dt)` to `var k := 1.0 - _drag[i] * dt` (linear drag — the plausible wrong version). Re-run.
Expected: `FX_FAIL drag decays velocity exponentially — vx 0.000000 expected 0.367879`, exit 1.

Restore the line. A check that has never failed is not yet a check — this is the project's rule and every harness in it was made to fail before it was trusted.

- [ ] **Step 6: Commit**

```bash
git add godot/scripts/fx/particles.gd godot/tools/fx_probe.gd
git commit -m "A particle pool, and a probe that watched it drain"
```

---

### Task 2: The five emitters

**Files:**
- Modify: `godot/scripts/fx/particles.gd`
- Modify: `godot/tools/fx_probe.gd`

**Interfaces:**
- Consumes: `ParticleField.spawn(...)` from Task 1.
- Produces: `burst(pos: Vector3, count, speed, spread, life, size, color: Color, end_color: Color, gravity, drag, up, turbulence)`, `ring(pos, count, radius, speed, life, size, color, end_color, gravity, drag, up)`, `column(pos, count, radius, speed, life, size, color, end_color, drag, turbulence)`, `implode(pos, count, radius, life, size, color, end_color)`, `streak(from: Vector3, to: Vector3, count, life, size, color, end_color, jitter, drag)`. All parameters carry the reference's own defaults.

- [ ] **Step 1: Write the failing checks**

Add to `godot/tools/fx_probe.gd` — call `_emitters()` from `_initialize()` after `_integrator()`:

```gdscript
## The emitters, checked by what they *do* rather than by what they spawn.
##
## A burst and an implode both fill the pool with the right number of particles and both look
## perfectly correct in a count. The difference between them is the direction of travel, and
## that is the only thing worth asserting: the reference's implode aims every particle to
## arrive at the centre as it dies, and a sign error there is a fire spell that sucks inward.
func _emitters() -> void:
	var origin := Vector3(0.0, 1.0, 0.0)

	var out = ParticleField.new()
	out.burst(origin, 60, 6.0, 1.0, 1.0, 0.5,
		Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0, 0.0, 0.0)
	_check("a burst fills the pool", out.count == 60, "count %d" % out.count)
	var before_out := _mean_radius(out, origin)
	out.update(0.2)
	var after_out := _mean_radius(out, origin)
	_check("a burst travels outward", after_out > before_out + 0.1,
		"%f -> %f" % [before_out, after_out])

	var inward = ParticleField.new()
	inward.implode(origin, 60, 3.2, 1.0, 0.42, Color(1, 1, 1), Color(1, 1, 1))
	var before_in := _mean_radius(inward, origin)
	inward.update(0.2)
	var after_in := _mean_radius(inward, origin)
	_check("an implode converges", after_in < before_in - 0.1,
		"%f -> %f" % [before_in, after_in])

	# A ring is laid flat: it opens outward on x/z and stays put on y until `up` lifts it.
	var flat = ParticleField.new()
	flat.ring(origin, 48, 0.4, 6.0, 1.0, 0.45,
		Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0, 0.0)
	var lift := 0.0
	for i in flat.count:
		lift += absf(flat.positions[i * 3 + 1] - origin.y)
	_check("a ring is laid flat", lift < 0.001, "total lift %f" % lift)

	# A column rises. It is the one emitter whose whole character is vertical.
	var up = ParticleField.new()
	up.column(origin, 50, 0.7, 5.0, 1.0, 0.5, Color(1, 1, 1), Color(1, 1, 1), 0.4, 0.0)
	var y_before := _mean_y(up)
	up.update(0.2)
	_check("a column rises", _mean_y(up) > y_before + 0.1,
		"%f -> %f" % [y_before, _mean_y(up)])

	# A streak lies along the line it was given, not scattered around either end.
	var trail = ParticleField.new()
	trail.streak(Vector3.ZERO, Vector3(10.0, 0.0, 0.0), 26, 1.0, 0.4,
		Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0)
	var off_axis := 0.0
	for i in trail.count:
		off_axis = maxf(off_axis, absf(trail.positions[i * 3 + 2]))
	_check("a streak follows its line", off_axis < 0.001, "max |z| %f" % off_axis)

	# And the pool refuses to overflow rather than growing without bound.
	var flooded = ParticleField.new()
	for i in 100:
		flooded.burst(origin, 60, 6.0, 1.0, 1.0, 0.5,
			Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0, 0.0, 0.0)
	_check("the pool has a ceiling", flooded.count == ParticleField.MAX_PARTICLES,
		"count %d" % flooded.count)


func _mean_radius(field, origin: Vector3) -> float:
	if field.count == 0:
		return 0.0
	var total := 0.0
	for i in field.count:
		total += Vector3(field.positions[i * 3], field.positions[i * 3 + 1],
			field.positions[i * 3 + 2]).distance_to(origin)
	return total / float(field.count)


func _mean_y(field) -> float:
	if field.count == 0:
		return 0.0
	var total := 0.0
	for i in field.count:
		total += field.positions[i * 3 + 1]
	return total / float(field.count)
```

- [ ] **Step 2: Run to verify it fails**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: FAIL — `burst` is not a method of `ParticleField`. In Godot this is a runtime error naming the missing method.

- [ ] **Step 3: Write the emitters**

Append to `godot/scripts/fx/particles.gd`. Every default is the reference's:

```gdscript
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: `FX_OK 14 checks`, exit 0.

- [ ] **Step 5: Break it once, on purpose**

In `implode`, flip the aim: `(px - pos.x) / l` instead of `(pos.x - px) / l` on all three axes. Re-run.
Expected: `FX_FAIL an implode converges — 2.5… -> 3.5…`, exit 1. Restore.

- [ ] **Step 6: Commit**

```bash
git add godot/scripts/fx/particles.gd godot/tools/fx_probe.gd
git commit -m "Five emitters, and a check that knows outward from inward"
```

---

### Task 3: Drawing the field

**Files:**
- Create: `godot/shaders/particle.gdshader`
- Modify: `godot/scripts/fx/particles.gd`

**Interfaces:**
- Consumes: the pool arrays from Task 1.
- Produces: `ParticleField.attach(parent: Node3D) -> void` and `detach() -> void`; `update(dt)` also uploads the live range to the MultiMesh.

- [ ] **Step 1: Write the shader**

Create `godot/shaders/particle.gdshader`. Three.js draws these as `THREE.Points` sized by `gl_PointSize`; Godot 3D has no point sprites, so a unit quad is billboarded in the vertex shader and the disc is generated in the fragment shader — same result, no sprite texture, one draw call:

```glsl
shader_type spatial;
render_mode blend_add, unshaded, cull_disabled, depth_draw_never, shadows_disabled;

// Size and alpha ride in INSTANCE_CUSTOM; the lerped colour rides in per-instance COLOR.
// The reference clamps the on-screen size so a particle drifting toward the camera cannot
// become a screen-filling blob — the same clamp is applied here in view space.

void vertex() {
    float size = clamp(INSTANCE_CUSTOM.x, 0.0, 6.0);
    // Billboard: strip the rotation out of the model-view matrix and re-apply scale.
    MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
        vec4(size, 0.0, 0.0, 0.0),
        vec4(0.0, size, 0.0, 0.0),
        vec4(0.0, 0.0, size, 0.0),
        MODEL_MATRIX[3]);
}

void fragment() {
    // Soft radial falloff with a hot core — the reference's own two-term curve. A hard-edged
    // sprite is the single most common way stylised VFX end up looking cheap.
    vec2 d = UV - vec2(0.5);
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float edge = 1.0 - smoothstep(0.35, 1.0, r);
    float core = 1.0 - smoothstep(0.0, 0.45, r);
    ALBEDO = COLOR.rgb * (1.0 + core * 1.35);
    ALPHA = edge * INSTANCE_CUSTOM.y * COLOR.a;
}
```

- [ ] **Step 2: Write the failing check**

Add to `godot/tools/fx_probe.gd`, called from `_initialize()` after `_emitters()`:

```gdscript
## Drawing. The pool can be perfect and draw nothing — an instance count left at zero, a
## visible-instance range never updated, a MultiMesh never given a mesh. All three look
## exactly like a working effect from inside the integrator.
func _drawing() -> void:
	var field = ParticleField.new()
	var host := Node3D.new()
	get_root().add_child(host)
	field.attach(host)

	field.burst(Vector3(0.0, 1.0, 0.0), 40, 6.0, 1.0, 1.0, 0.5,
		Color(1, 0.5, 0.2), Color(1, 0, 0), 0.0, 0.0, 0.0, 0.0)
	field.update(0.05)

	var mm := field.multimesh
	_check("the field has a multimesh", mm != null, "null multimesh")
	if mm == null:
		return
	_check("it has a mesh to instance", mm.mesh != null, "null mesh")
	_check("it draws the live range", mm.visible_instance_count == field.count,
		"visible %d live %d" % [mm.visible_instance_count, field.count])

	# The transform of instance 0 must actually be where particle 0 is. A MultiMesh whose
	# transforms are never written draws forty particles in a heap at the origin.
	var xf := mm.get_instance_transform(0)
	var p := Vector3(field.positions[0], field.positions[1], field.positions[2])
	_check("instance transforms follow the particles",
		xf.origin.distance_to(p) < 0.0001, "%s vs %s" % [xf.origin, p])

	# And the colour is the lerped one, not the spawn colour.
	var c := mm.get_instance_color(0)
	_check("instance colour is uploaded", c.r > 0.5, "r %f" % c.r)

	field.detach()
	host.queue_free()
```

- [ ] **Step 3: Run to verify it fails**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: FAIL — `attach` is not a method of `ParticleField`.

- [ ] **Step 4: Add the drawing**

Add to `godot/scripts/fx/particles.gd` — a `multimesh` property, an `attach`/`detach` pair, and an upload at the end of `update`:

```gdscript
const SHADER := preload("res://shaders/particle.gdshader")

var multimesh: MultiMesh
var _instance: MultiMeshInstance3D


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
```

Then add `_upload()` as the last line of `update(dt)`, after `count = n`.

- [ ] **Step 5: Run to verify it passes**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: `FX_OK 19 checks`, exit 0.

- [ ] **Step 6: Break it once, on purpose**

Comment out the `multimesh.visible_instance_count = count` line in `_upload`. Re-run.
Expected: `FX_FAIL it draws the live range — visible 0 live 40`, exit 1. Restore.

This is the exact failure the check exists for: a pool that simulates perfectly and draws nothing.

- [ ] **Step 7: Commit**

```bash
git add godot/shaders/particle.gdshader godot/scripts/fx/particles.gd godot/tools/fx_probe.gd
git commit -m "Draw the pool, and prove the instances moved"
```

---

### Task 4: The mesh effects

**Files:**
- Create: `godot/scripts/fx/effects.gd`
- Modify: `godot/tools/fx_probe.gd`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Effects.magic_circle(parent: Node3D, pos: Vector3, color: Color, radius: float) -> Node3D`, `Effects.shockwave(parent, pos, color) -> MeshInstance3D`, `Effects.light_pillar(parent, pos, color, radius, height) -> MeshInstance3D`, `Effects.slash_arc(parent, pos, color, radius) -> MeshInstance3D`, `Effects.lightning_bolt(parent, from: Vector3, to: Vector3, color: Color, segments: int, jitter: float) -> Node3D`, `Effects.dispose_effect(node: Node) -> void`, `Effects.set_opacity(node: Node, alpha: float) -> void`. All are static.

- [ ] **Step 1: Write the failing checks**

Add to `godot/tools/fx_probe.gd`, called from `_initialize()` after `_drawing()`:

```gdscript
const Effects := preload("res://scripts/fx/effects.gd")

## The mesh effects. Each is checked for the one property that makes it that effect and not a
## coloured blob: a circle lies flat, a pillar is tall, a bolt spans the gap it was given.
func _mesh_effects() -> void:
	var host := Node3D.new()
	get_root().add_child(host)

	var circle := Effects.magic_circle(host, Vector3(0.0, 1.0, 0.0), Color(0.2, 0.8, 0.9), 1.6)
	_check("a magic circle is built", circle != null and circle.get_child_count() > 0,
		"children %d" % (circle.get_child_count() if circle != null else -1))
	# Laid flat on the ground. Upright, it is a coloured hoop standing in front of the caster.
	_check("and lies flat",
		absf(circle.rotation.x + PI / 2.0) < 0.001, "rotation.x %f" % circle.rotation.x)

	var pillar := Effects.light_pillar(host, Vector3.ZERO, Color(1, 0.95, 0.7), 0.9, 9.0)
	var box := pillar.get_aabb() * pillar.scale.y
	_check("a light pillar is tall", pillar.scale.y > pillar.scale.x * 4.0,
		"scale %s" % pillar.scale)

	# A bolt is a chain of segments spanning from A to B. One segment, or a chain that stops
	# short, is the failure — and both draw something.
	var from := Vector3(0.0, 14.0, 0.0)
	var to := Vector3(0.0, 1.0, 0.0)
	var bolt := Effects.lightning_bolt(host, from, to, Color(1, 0.9, 0.4), 9, 0.7)
	_check("a bolt is a chain", bolt.get_child_count() == 9,
		"segments %d" % bolt.get_child_count())
	var lowest := 1e9
	var highest := -1e9
	for child in bolt.get_children():
		lowest = minf(lowest, (child as Node3D).position.y)
		highest = maxf(highest, (child as Node3D).position.y)
	_check("and spans the gap it was given",
		lowest < to.y + 2.0 and highest > from.y - 2.0,
		"y %f..%f for %f..%f" % [lowest, highest, to.y, from.y])

	# Opacity is driven by every effect that fades. A setter that silently does nothing is a
	# spell whose circle never fades out.
	Effects.set_opacity(circle, 0.25)
	var first := circle.get_child(0) as MeshInstance3D
	var mat := first.get_surface_override_material(0) as StandardMaterial3D
	_check("opacity reaches the material",
		mat != null and absf(mat.albedo_color.a - 0.25) < 0.001,
		"alpha %f" % (mat.albedo_color.a if mat != null else -1.0))

	Effects.dispose_effect(circle)
	Effects.dispose_effect(bolt)
	host.queue_free()
```

- [ ] **Step 2: Run to verify it fails**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: FAIL — the preload of `res://scripts/fx/effects.gd` cannot resolve.

- [ ] **Step 3: Write the builders**

Create `godot/scripts/fx/effects.gd`:

```gdscript
class_name Effects
extends RefCounted
##
## Mesh-based effects, ported from the second half of `src/fx/particles.js`.
##
## Five shapes that particles cannot make: a spinning magic circle, an expanding shockwave, a
## beam of light, a crescent slash, and a jagged bolt. All additive, all unshaded, all built
## from primitives so there is nothing to load.
##
## Every builder takes the parent it should live under rather than adding itself to a scene:
## a battle stage is freed when the fight ends, and an effect parented anywhere else outlives
## the fight it belongs to.


## Additive, unshaded, double-sided — the reference's `additiveMaterial`.
static func _additive(color: Color, opacity := 1.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(color.r, color.g, color.b, opacity)
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.no_depth_test = false
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return mat


static func _ring_mesh(inner: float, outer: float, segments: int,
		arc := TAU) -> ArrayMesh:
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	for i in segments:
		var a0 := arc * float(i) / float(segments)
		var a1 := arc * float(i + 1) / float(segments)
		var i0 := Vector3(cos(a0) * inner, sin(a0) * inner, 0.0)
		var i1 := Vector3(cos(a1) * inner, sin(a1) * inner, 0.0)
		var o0 := Vector3(cos(a0) * outer, sin(a0) * outer, 0.0)
		var o1 := Vector3(cos(a1) * outer, sin(a1) * outer, 0.0)
		verts.append_array([i0, o0, o1, i0, o1, i1])
		uvs.append_array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1),
			Vector2(0, 0), Vector2(1, 1), Vector2(0, 1)])
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


static func _plate(mesh: Mesh, color: Color, opacity: float) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.set_surface_override_material(0, _additive(color, opacity))
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return node


## Concentric rings with tick marks, laid flat and spinning. The single most recognisable
## "a spell is being cast here" signal in the genre, and it costs three meshes.
static func magic_circle(parent: Node3D, pos: Vector3, color := Color(0.25, 0.78, 0.84),
		radius := 1.6) -> Node3D:
	var group := Node3D.new()
	group.position = pos + Vector3(0.0, 0.05, 0.0)
	group.rotation.x = -PI / 2.0

	group.add_child(_plate(_ring_mesh(0.92, 1.0, 64), color, 0.9))
	group.add_child(_plate(_ring_mesh(0.52, 0.58, 48), color, 0.7))

	var ticks := Node3D.new()
	for i in 12:
		var a := (float(i) / 12.0) * TAU
		var quad := QuadMesh.new()
		quad.size = Vector2(0.06, 0.22)
		var tick := _plate(quad, color, 0.85)
		tick.position = Vector3(cos(a) * 0.76, sin(a) * 0.76, 0.0)
		tick.rotation.z = a
		ticks.add_child(tick)
	group.add_child(ticks)

	group.scale = Vector3.ONE * radius
	parent.add_child(group)
	return group


## An expanding ring, flat to the ground. The band is deliberately thin: a wide ring scaled up
## reads as an opaque coloured disc lying on the floor rather than a wave travelling outward.
static func shockwave(parent: Node3D, pos: Vector3, color := Color(1, 1, 1)) -> MeshInstance3D:
	var node := _plate(_ring_mesh(0.88, 1.0, 64), color, 0.85)
	node.position = pos + Vector3(0.0, 0.08, 0.0)
	node.rotation.x = -PI / 2.0
	node.scale = Vector3.ONE * 0.2
	parent.add_child(node)
	return node


## A vertical beam of light.
static func light_pillar(parent: Node3D, pos: Vector3, color := Color(1, 0.95, 0.72),
		radius := 0.9, height := 9.0) -> MeshInstance3D:
	var cyl := CylinderMesh.new()
	cyl.top_radius = 1.0
	cyl.bottom_radius = 1.0
	cyl.height = 1.0
	cyl.radial_segments = 20
	cyl.cap_top = false
	cyl.cap_bottom = false
	var node := _plate(cyl, color, 0.75)
	# The reference translates its cylinder so the beam grows up from its base rather than
	# sinking half its height into the floor.
	node.position = pos + Vector3(0.0, height * 0.5, 0.0)
	node.scale = Vector3(radius, height, radius)
	parent.add_child(node)
	return node


## A crescent slash plane, swept through an arc.
static func slash_arc(parent: Node3D, pos: Vector3, color := Color(1, 1, 1),
		radius := 1.8) -> MeshInstance3D:
	var node := _plate(_ring_mesh(0.55, 1.0, 32, PI * 0.7), color, 1.0)
	node.position = pos
	node.scale = Vector3.ONE * radius
	parent.add_child(node)
	return node


## Jagged lightning between two points, built as a chain of thin quads.
static func lightning_bolt(parent: Node3D, from: Vector3, to: Vector3,
		color := Color(1, 0.89, 0.37), segments := 9, jitter := 0.7) -> Node3D:
	var group := Node3D.new()
	var dir := to - from
	var axis := dir.normalized()
	var side := Vector3.UP.cross(axis).normalized()
	if side.length_squared() < 0.0001:
		side = Vector3.RIGHT
	var up := axis.cross(side).normalized()

	var prev := from
	for i in range(1, segments + 1):
		var t := float(i) / float(segments)
		var point := from + dir * t
		if i < segments:
			# Deviation peaks in the middle of the run — a bolt is pinned at both ends.
			var wobble := sin(t * PI) * jitter
			point += side * ((randf() - 0.5) * wobble * 2.0)
			point += up * ((randf() - 0.5) * wobble * 2.0)
		var quad := QuadMesh.new()
		quad.size = Vector2(prev.distance_to(point), 0.12 + randf() * 0.1)
		var seg := _plate(quad, color, 1.0)
		seg.position = (prev + point) * 0.5
		# A quad faces +Z and the segment runs along its own length, so look down the run and
		# then turn a quarter turn to put the face broadside to the camera.
		if not seg.position.is_equal_approx(point):
			seg.look_at_from_position(seg.position, point, Vector3.UP)
			seg.rotate_object_local(Vector3.UP, PI / 2.0)
		group.add_child(seg)
		prev = point
	parent.add_child(group)
	return group


## Fade anything this file built. Walks the node and its children, because a magic circle is
## three meshes and a bolt is nine.
static func set_opacity(node: Node, alpha: float) -> void:
	if node is MeshInstance3D:
		var mesh_node := node as MeshInstance3D
		var mat := mesh_node.get_surface_override_material(0) as StandardMaterial3D
		if mat != null:
			mat.albedo_color.a = alpha
	for child in node.get_children():
		set_opacity(child, alpha)


static func dispose_effect(node: Node) -> void:
	if node != null and is_instance_valid(node):
		node.queue_free()
```

- [ ] **Step 4: Run to verify it passes**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: `FX_OK 25 checks`, exit 0.

- [ ] **Step 5: Break it once, on purpose**

In `set_opacity`, remove the recursive `for child in node.get_children()` loop. Re-run.
Expected: `FX_FAIL opacity reaches the material — alpha 0.900000`, exit 1. Restore.

- [ ] **Step 6: Commit**

```bash
git add godot/scripts/fx/effects.gd godot/tools/fx_probe.gd
git commit -m "Circles, pillars and bolts, built rather than described"
```

---

### Task 5: What three thousand particles cost

**Files:**
- Modify: `godot/tools/fx_probe.gd`
- Modify: `godot/project.godot` (only if the measurement demands it)

**Interfaces:**
- Consumes: `ParticleField` from Tasks 1–3.
- Produces: a `FX_COST` line in the probe's output, and a decision recorded in the commit message.

This task exists because the spec put it there rather than leaving it to be discovered in phase 4. GDScript is far slower than JS at exactly this loop, the web build is single-threaded, and CI has no GPU.

- [ ] **Step 1: Add the measurement**

Add to `godot/tools/fx_probe.gd`, called last from `_initialize()`:

```gdscript
## What a full pool costs to integrate. Not a pass/fail — a number, printed, so the decision
## about the web pool size is made against a measurement rather than a worry.
func _cost() -> void:
	var field = ParticleField.new()
	var host := Node3D.new()
	get_root().add_child(host)
	field.attach(host)
	# Fill it: twelve bursts of 250 is the pool, and a heavy spell is several emitters at once.
	for i in 12:
		field.burst(Vector3(0.0, 1.0, 0.0), 250, 6.0, 1.0, 60.0, 0.5,
			Color(1, 0.6, 0.2), Color(0.4, 0.1, 0.0), 0.0, 1.2, 0.0, 1.5)

	var frames := 120
	var started := Time.get_ticks_usec()
	for i in frames:
		field.update(1.0 / 60.0)
	var elapsed := Time.get_ticks_usec() - started

	var per_frame := float(elapsed) / float(frames) / 1000.0
	print("FX_COST particles=%d ms_per_frame=%.3f budget_pct=%.1f" % [
		field.count, per_frame, per_frame / 16.667 * 100.0])
	field.detach()
	host.queue_free()
```

- [ ] **Step 2: Measure on this machine**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Record the `FX_COST` line.

- [ ] **Step 3: Measure on the build that ships**

The desktop number is not the answer — the web build is single-threaded Compatibility on a software rasteriser in CI, and that is what players run.

Make the exported build print the same measurement. In `battle_view.gd`'s `_ready()`, behind the same `--record`-style guard the project already uses for diagnostics, run one `_cost()`-equivalent pass and `print("FX_COST …")`. Then:

```bash
npm run export:web && npm run smoke:web
```

Read the `FX_COST` line out of the smoke run's captured console output — `web-smoke.mjs` already collects every console line, so add a temporary `console.log` of any line matching `/^FX_COST/` rather than opening a browser by hand.

- [ ] **Step 4: Decide, and record the decision**

The budget is one 16.7ms frame. `budget_pct` in the printed line is the integrator's share of it.

- **`budget_pct` under 15:** change nothing. Quote the measured `ms_per_frame` and `budget_pct` in the commit message so the next person does not have to re-derive them.
- **`budget_pct` 15 or over:** add a web override to `godot/project.godot` under `[rendering]`, in the style the project already uses for `lights_and_shadows/directional_shadow/size.web`, and read it in `ParticleField._init` via `ProjectSettings.get_setting("fx/particles/pool_size", 3000)`. Set the web value to the largest multiple of 250 whose measured `budget_pct` is under 15 — re-run the probe with `MAX_PARTICLES` temporarily set to each candidate to find it.

```ini
; Three thousand CPU-simulated particles is a desktop figure. The web build is single-threaded
; Compatibility and the integrator is GDScript rather than JS — measured at (fill in the
; ms_per_frame you saw) with a full pool, which is (fill in budget_pct) of one frame.
fx/particles/pool_size=3000
fx/particles/pool_size.web=(the chosen ceiling)
```

Do **not** change the integrator to chase the number. The CPU port is what makes the behaviour faithful and checkable; the pool size is the lever, and the spec says so.

- [ ] **Step 5: Commit**

```bash
git add godot/tools/fx_probe.gd godot/project.godot
git commit -m "Measure what a full pool costs before spending it"
```

---

### Task 6: The twelve effects

**Files:**
- Create: `godot/scripts/fx/spellfx.gd`
- Modify: `godot/tools/fx_probe.gd`

**Interfaces:**
- Consumes: `ParticleField` (Tasks 1–3), `Effects` (Task 4), `Scheduler.Routine` (`godot/scripts/engine/scheduler.gd`), `Ease` (`godot/scripts/engine/ease.gd`), `Palette.element_color` (`godot/scripts/engine/palette.gd`).
- Produces: `SpellFX.play(r: Routine, ctx: FXContext, element: String, pos: Vector3) -> void` (a coroutine, awaited by the caller), and `class FXContext` with fields `stage: Node3D`, `particles: ParticleField`, `on_shake: Callable`, `on_flash: Callable`, `recording: bool`, `log: Array`.

The reference's twelve are in `src/fx/spellfx.js` and each one's *shape* is the point: fire billows, ice gathers and shatters after a held pause, bolt has no wind-up, earth erupts from below with no circle, heal rises gently, physical is a swept arc. Port the parameters exactly — they are authored numbers, not defaults.

- [ ] **Step 1: Write the failing checks**

Add to `godot/tools/fx_probe.gd`, called from `_initialize()` before `_cost()`:

```gdscript
const SpellFX := preload("res://scripts/fx/spellfx.gd")
const Scheduler := preload("res://scripts/engine/scheduler.gd")

## Every effect, run for real against a live field.
##
## The signature is the guard that matters. Twelve effects that differ only in colour would
## pass a count check, a duration check and a "did anything spawn" check — and they are
## exactly what the port has today.
func _spells() -> void:
	var elements := ["fire", "ice", "bolt", "water", "wind", "earth",
		"poison", "holy", "shadow", "aether", "heal", "physical"]
	var signatures := {}

	for element in elements:
		var host := Node3D.new()
		get_root().add_child(host)
		var field = ParticleField.new()
		var ctx = SpellFX.FXContext.new()
		ctx.stage = host
		ctx.particles = field

		var sched = Scheduler.new()
		var peak := 0
		var ticks := 0
		var routine = sched.run(func(r): await SpellFX.play(r, ctx, element,
			Vector3(0.0, 1.0, 0.0)), element)
		while sched.is_busy() and ticks < 600:
			sched.update(1.0 / 60.0)
			field.update(1.0 / 60.0)
			peak = maxi(peak, field.count)
			ticks += 1

		_check("%s finishes" % element, not sched.is_busy(), "still running after %d ticks" % ticks)
		_check("%s puts particles on screen" % element, peak > 0, "peak %d" % peak)

		# Run the field out and confirm it drains. A leak here fills the pool and every later
		# spell in the fight draws nothing.
		for i in 300:
			field.update(1.0 / 60.0)
		_check("%s drains" % element, field.count == 0, "%d left" % field.count)

		signatures[element] = "%d/%d" % [peak, ticks]
		host.queue_free()

	# No two effects may share a signature. This is the check that says fire is not blue ice.
	var seen := {}
	for element in signatures:
		var sig: String = signatures[element]
		if seen.has(sig):
			_check("%s differs from %s" % [element, seen[sig]], false,
				"identical signature %s" % sig)
		else:
			seen[sig] = element
	_check("twelve effects have twelve shapes", seen.size() == elements.size(),
		"%d distinct of %d" % [seen.size(), elements.size()])
```

- [ ] **Step 2: Run to verify it fails**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: FAIL — the preload of `res://scripts/fx/spellfx.gd` cannot resolve.

- [ ] **Step 3: Write the effects**

Create `godot/scripts/fx/spellfx.gd`. Ported from `src/fx/spellfx.js`; every number below is the reference's:

```gdscript
extends RefCounted
##
## Spell effects, ported from `src/fx/spellfx.js`.
##
## Each element gets a *distinct silhouette of motion*, not just a recoloured puff — fire
## rises and billows, ice converges then shatters outward, lightning strikes downward in one
## frame, earth erupts from below. The reference's reason is worth repeating because it is the
## whole specification: in a turn-based game the player watches these thousands of times, so
## the read has to be instant and the shape has to carry the information.
##
## Every effect is a coroutine, so the battle can wait for the visual to land before applying
## damage — the hit should look like it caused the number.

const Effects := preload("res://scripts/fx/effects.gd")
# `Ease` is a global `class_name` and is used unqualified, the way `scheduler.gd` uses it.


## What an effect is allowed to touch. Narrow on purpose: a stage to hang meshes on, a field
## to emit into, and two callbacks for the things that belong to the screen rather than to the
## effect. `recording` makes the whole set inert and logs instead, which is what `fx-parity`
## compares against the reference.
class FXContext:
	extends RefCounted

	var stage: Node3D
	var particles
	var on_shake := Callable()
	var on_flash := Callable()
	var recording := false
	var log: Array = []

	func _emit(kind: String, args: Array) -> void:
		if recording:
			log.append([kind] + args)

	func burst(pos: Vector3, count_n: int, speed: float, spread: float, life: float,
			size: float, color: String, end_color: String, gravity: float,
			drag: float, up: float, turbulence: float) -> void:
		_emit("burst", [count_n, speed, spread, life, size, color, end_color,
			gravity, drag, up, turbulence])
		if not recording:
			particles.burst(pos, count_n, speed, spread, life, size,
				Color(color), Color(end_color), gravity, drag, up, turbulence)

	func ring(pos: Vector3, count_n: int, radius: float, speed: float, life: float,
			size: float, color: String, end_color: String, gravity: float,
			drag: float, up: float) -> void:
		_emit("ring", [count_n, radius, speed, life, size, color, end_color,
			gravity, drag, up])
		if not recording:
			particles.ring(pos, count_n, radius, speed, life, size,
				Color(color), Color(end_color), gravity, drag, up)

	func column(pos: Vector3, count_n: int, radius: float, speed: float, life: float,
			size: float, color: String, end_color: String, drag: float,
			turbulence: float) -> void:
		_emit("column", [count_n, radius, speed, life, size, color, end_color,
			drag, turbulence])
		if not recording:
			particles.column(pos, count_n, radius, speed, life, size,
				Color(color), Color(end_color), drag, turbulence)

	func implode(pos: Vector3, count_n: int, radius: float, life: float, size: float,
			color: String, end_color: String) -> void:
		_emit("implode", [count_n, radius, life, size, color, end_color])
		if not recording:
			particles.implode(pos, count_n, radius, life, size,
				Color(color), Color(end_color))

	func shake(amount: float, frequency := 2.0) -> void:
		_emit("shake", [amount, frequency])
		if not recording and on_shake.is_valid():
			on_shake.call(amount, frequency)

	func flash(color: String, strength: float) -> void:
		_emit("flash", [color, strength])
		if not recording and on_flash.is_valid():
			on_flash.call(Color(color), strength)

	## Mesh effects are logged by name and colour and *not* by position. `bolt` picks its sky
	## point at random, so a position in the transcript would differ between two runs of the
	## same build, never mind between two builds.
	func mesh(kind: String, color: String) -> void:
		_emit("mesh", [kind, color])


# ---------------------------------------------------------------------------
# Shared openings
# ---------------------------------------------------------------------------

## Spin and fade a magic circle in. Returns the node, or null when recording.
static func _circle_in(r, ctx: FXContext, pos: Vector3, color: String,
		seconds := 0.5, radius := 1.7):
	ctx.mesh("circle", color)
	if ctx.recording:
		await r.wait(seconds)
		return null
	var circle := Effects.magic_circle(ctx.stage, pos, Color(color), radius)
	Effects.set_opacity(circle, 0.0)
	await r.over(seconds, func(t: float, dt: float, raw: float):
		circle.rotation.z += 0.05
		circle.scale = Vector3.ONE * (radius * (0.5 + t * 0.5))
		Effects.set_opacity(circle, t * 0.9),
		Callable(Ease, "quad_out"))
	return circle


static func _circle_out(r, ctx: FXContext, circle, seconds := 0.3) -> void:
	if ctx.recording:
		await r.wait(seconds)
		return
	if circle == null:
		return
	await r.over(seconds, func(t: float, dt: float, raw: float):
		circle.rotation.z += 0.08
		Effects.set_opacity(circle, 0.9 * (1.0 - t)))
	Effects.dispose_effect(circle)


## An expanding shockwave ring.
static func _wave(r, ctx: FXContext, pos: Vector3, color: String,
		seconds := 0.4, scale := 5.0) -> void:
	ctx.mesh("shockwave", color)
	if ctx.recording:
		await r.wait(seconds)
		return
	var wave := Effects.shockwave(ctx.stage, pos, Color(color))
	await r.over(seconds, func(t: float, dt: float, raw: float):
		wave.scale = Vector3.ONE * (0.2 + t * scale)
		Effects.set_opacity(wave, 0.85 * (1.0 - t)),
		Callable(Ease, "quad_out"))
	Effects.dispose_effect(wave)


# ---------------------------------------------------------------------------
# Per-element casts
# ---------------------------------------------------------------------------

static func play(r, ctx: FXContext, element: String, pos: Vector3) -> void:
	match element:
		"fire": await _fire(r, ctx, pos)
		"ice": await _ice(r, ctx, pos)
		"bolt": await _bolt(r, ctx, pos)
		"water": await _water(r, ctx, pos)
		"wind": await _wind(r, ctx, pos)
		"earth": await _earth(r, ctx, pos)
		"poison": await _poison(r, ctx, pos)
		"holy": await _holy(r, ctx, pos)
		"shadow": await _shadow(r, ctx, pos)
		"aether": await _aether(r, ctx, pos)
		"heal": await _heal(r, ctx, pos)
		_: await _physical(r, ctx, pos)


static func _fire(r, ctx: FXContext, pos: Vector3) -> void:
	var circle = await _circle_in(r, ctx, pos, "#ff7a2f", 0.28, 1.5)
	ctx.implode(pos, 34, 2.6, 0.4, 0.5, "#ffd76a", "#ff7a2f")
	await r.wait(0.30)
	# Detonation: hot core, billowing outward, embers rising and cooling.
	ctx.burst(pos, 70, 7.0, 1.0, 0.75, 0.85, "#fff3b8", "#a8410e", 1.2, 1.6, 1.5, 0.0)
	ctx.column(pos, 44, 0.8, 6.5, 1.0, 0.7, "#ff7a2f", "#3d1206", 0.4, 2.2)
	ctx.shake(0.45)
	await _wave(r, ctx, pos, "#ff7a2f", 0.4, 5.0)
	await _circle_out(r, ctx, circle, 0.2)


static func _ice(r, ctx: FXContext, pos: Vector3) -> void:
	var circle = await _circle_in(r, ctx, pos, "#7fdcf0", 0.30, 1.5)
	# Shards gather, hang, then shatter outward — the pause is the whole effect.
	ctx.implode(pos, 52, 3.4, 0.5, 0.45, "#e8edf5", "#7fdcf0")
	await r.wait(0.52)
	ctx.burst(pos, 64, 9.0, 1.0, 0.55, 0.5, "#ffffff", "#4d8493", -3.5, 2.4, 0.0, 0.0)
	ctx.shake(0.35)
	await _wave(r, ctx, pos, "#9ccdd4", 0.35, 4.0)
	await _circle_out(r, ctx, circle, 0.18)


static func _bolt(r, ctx: FXContext, pos: Vector3) -> void:
	# No wind-up: lightning's character is that it has already happened.
	ctx.flash("#ffe45e", 0.55)
	ctx.mesh("bolt", "#ffffff")
	ctx.mesh("bolt", "#ffe45e")
	var bolt = null
	var bolt2 = null
	if not ctx.recording:
		var sky := Vector3(pos.x + (randf() - 0.5) * 1.2, pos.y + 14.0,
			pos.z + (randf() - 0.5) * 1.2)
		bolt = Effects.lightning_bolt(ctx.stage, sky, pos, Color("#ffffff"), 9, 0.7)
		bolt2 = Effects.lightning_bolt(ctx.stage, sky, pos, Color("#ffe45e"), 9, 1.1)
	ctx.burst(pos, 46, 8.0, 1.0, 0.4, 0.5, "#ffffff", "#ffe45e", -1.0, 2.6, 0.0, 0.0)
	ctx.shake(0.6)
	await r.over(0.16, func(t: float, dt: float, raw: float):
		if bolt != null:
			Effects.set_opacity(bolt, 1.0 - t)
			Effects.set_opacity(bolt2, (1.0 - t) * 0.8))
	Effects.dispose_effect(bolt)
	Effects.dispose_effect(bolt2)
	await _wave(r, ctx, pos, "#ffe45e", 0.3, 4.5)


static func _water(r, ctx: FXContext, pos: Vector3) -> void:
	var circle = await _circle_in(r, ctx, pos, "#3ea8d6", 0.26, 1.6)
	ctx.column(pos, 60, 0.55, 9.0, 0.85, 0.65, "#9ccdd4", "#1a3c48", 0.4, 0.6)
	await r.wait(0.30)
	ctx.ring(pos, 46, 0.5, 7.0, 0.6, 0.5, "#57a6b1", "#12262f", -6.0, 2.2, 2.2)
	ctx.shake(0.3)
	await _wave(r, ctx, pos, "#3ea8d6", 0.42, 5.0)
	await _circle_out(r, ctx, circle, 0.2)


static func _wind(r, ctx: FXContext, pos: Vector3) -> void:
	# A vortex: successive rings launched upward at a rising radius.
	for i in 4:
		ctx.ring(pos, 26, 0.4 + float(i) * 0.35, 3.5 + float(i), 0.55, 0.4,
			"#9fe3a8", "#5f815c", 0.6, 0.9, 5.0 + float(i) * 1.5)
		await r.wait(0.07)
	ctx.burst(pos, 34, 6.0, 1.0, 0.5, 0.42, "#e8f0ff", "#9fe3a8", 0.4, 1.0, 0.0, 3.0)
	ctx.shake(0.25)
	await _wave(r, ctx, pos, "#9fe3a8", 0.35, 5.5)


static func _earth(r, ctx: FXContext, pos: Vector3) -> void:
	ctx.shake(0.8, 2.2)
	# Erupts from below: heavy, high-gravity debris with no wind-up.
	ctx.burst(pos, 60, 6.0, 0.5, 0.9, 0.75, "#c08a4a", "#2a1f19", -14.0, 0.5, 7.0, 0.0)
	ctx.ring(pos, 40, 0.3, 8.0, 0.5, 0.6, "#93785d", "#2a1f19", -9.0, 2.2, 1.5)
	await _wave(r, ctx, pos, "#c08a4a", 0.5, 6.5)


static func _poison(r, ctx: FXContext, pos: Vector3) -> void:
	var circle = await _circle_in(r, ctx, pos, "#94bf55", 0.24, 1.4)
	# Slow, buoyant, lingering — poison should feel unhurried.
	for i in 3:
		ctx.column(pos, 26, 0.9, 2.2, 1.4, 0.75, "#94bf55", "#1b2d12", 0.9, 1.6)
		await r.wait(0.13)
	await _circle_out(r, ctx, circle, 0.3)


static func _holy(r, ctx: FXContext, pos: Vector3) -> void:
	var circle = await _circle_in(r, ctx, pos, "#fff3b8", 0.34, 2.0)
	ctx.mesh("pillar", "#fff3b8")
	var pillar = null
	if not ctx.recording:
		pillar = Effects.light_pillar(ctx.stage, pos - Vector3(0.0, 0.5, 0.0),
			Color("#fff3b8"), 0.2, 12.0)
	ctx.flash("#fff3b8", 0.4)
	# The pillar widens as it lands, then motes drift up out of it.
	await r.over(0.35, func(t: float, dt: float, raw: float):
		if pillar != null:
			pillar.scale = Vector3(0.2 + t * 1.5, 12.0, 0.2 + t * 1.5)
			Effects.set_opacity(pillar, 0.85 * (t * 2.0 if t < 0.5 else 1.0)),
		Callable(Ease, "quad_out"))
	ctx.column(pos, 54, 1.0, 4.5, 1.2, 0.55, "#ffffff", "#ab9f52", 0.8, 0.8)
	ctx.ring(pos, 40, 0.6, 5.0, 0.7, 0.5, "#fff3b8", "#7a6f37", 0.0, 2.2, 1.2)
	await r.over(0.4, func(t: float, dt: float, raw: float):
		if pillar != null:
			Effects.set_opacity(pillar, 0.85 * (1.0 - t)))
	Effects.dispose_effect(pillar)
	await _circle_out(r, ctx, circle, 0.22)


static func _shadow(r, ctx: FXContext, pos: Vector3) -> void:
	var circle = await _circle_in(r, ctx, pos, "#8a5ce0", 0.34, 1.8)
	# Collapses inward and *stays* dark — the inverse of a fire burst.
	ctx.implode(pos, 64, 4.2, 0.62, 0.6, "#8a5ce0", "#0f0a1c")
	await r.wait(0.62)
	ctx.flash("#2c1b4d", 0.45)
	ctx.burst(pos, 50, 5.5, 1.0, 0.85, 0.7, "#5c3f95", "#0f0a1c", 0.8, 1.1, 0.0, 1.8)
	ctx.shake(0.5)
	await _wave(r, ctx, pos, "#8a5ce0", 0.45, 5.0)
	await _circle_out(r, ctx, circle, 0.25)


static func _aether(r, ctx: FXContext, pos: Vector3) -> void:
	var circle = await _circle_in(r, ctx, pos, "#3fc6d6", 0.32, 2.1)
	ctx.implode(pos, 46, 3.0, 0.45, 0.5, "#96f0f5", "#3fc6d6")
	await r.wait(0.44)
	ctx.flash("#3fc6d6", 0.5)
	ctx.mesh("pillar", "#3fc6d6")
	var pillar = null
	if not ctx.recording:
		pillar = Effects.light_pillar(ctx.stage, pos - Vector3(0.0, 0.5, 0.0),
			Color("#3fc6d6"), 1.0, 10.0)
	ctx.burst(pos, 62, 7.5, 1.0, 0.8, 0.6, "#96f0f5", "#12566b", 0.5, 1.4, 0.0, 1.2)
	ctx.shake(0.55)
	await r.over(0.45, func(t: float, dt: float, raw: float):
		if pillar != null:
			var w := 1.0 * (1.0 - t * 0.6)
			pillar.scale = Vector3(w, 10.0, w)
			Effects.set_opacity(pillar, 0.8 * (1.0 - t)))
	Effects.dispose_effect(pillar)
	await _circle_out(r, ctx, circle, 0.22)


static func _heal(r, ctx: FXContext, pos: Vector3) -> void:
	# Rises rather than bursts — the only effect in the set that goes *up* gently, which is
	# what makes it read as restoration at a glance.
	ctx.ring(pos, 36, 1.1, -1.6, 1.0, 0.45, "#8ce07a", "#ffffff", 0.6, 0.5, 3.2)
	ctx.column(pos, 40, 0.7, 3.4, 1.1, 0.5, "#ffffff", "#6fd08c", 0.7, 0.5)
	await _wave(r, ctx, pos, "#8ce07a", 0.5, 3.0)


static func _physical(r, ctx: FXContext, pos: Vector3) -> void:
	ctx.mesh("slash", "#ffffff")
	var arc = null
	if not ctx.recording:
		arc = Effects.slash_arc(ctx.stage, pos, Color("#ffffff"), 1.4)
		arc.rotation = Vector3(PI / 2.0, 0.0, randf() * PI)
	await r.over(0.18, func(t: float, dt: float, raw: float):
		if arc != null:
			arc.rotation.z += 0.22
			arc.scale = Vector3.ONE * (1.4 + t * 1.1)
			Effects.set_opacity(arc, 1.0 - t))
	Effects.dispose_effect(arc)
	ctx.burst(pos, 22, 6.0, 1.0, 0.32, 0.32, "#ffffff", "#d8d3c6", -6.0, 2.0, 0.0, 0.0)
```

- [ ] **Step 4: Run to verify it passes**

Run: `godot --headless --path godot --script res://tools/fx_probe.gd`
Expected: `FX_OK 62 checks`, exit 0.

- [ ] **Step 5: Break it once, on purpose**

Make `_ice` call `_fire`'s body — i.e. change `"ice": await _ice(...)` to `"ice": await _fire(...)` in `play`. Re-run.
Expected: a `FX_FAIL ice differs from fire — identical signature …` line, exit 1. Restore.

This is the check that would have caught eleven recoloured puffs.

- [ ] **Step 6: Commit**

```bash
git add godot/scripts/fx/spellfx.gd godot/tools/fx_probe.gd
git commit -m "Twelve effects, and twelve different shapes"
```

---

### Task 7: Parity against the reference's own code

**Files:**
- Create: `tools/fx-parity.mjs`
- Modify: `godot/tools/fx_probe.gd`
- Modify: `package.json`

**Interfaces:**
- Consumes: `SpellFX.FXContext` with `recording = true` (Task 6); the reference's `SPELL_FX` from `src/fx/spellfx.js`.
- Produces: `npm run port` gains `fx-parity`.

The oracle is the reference's own code, not a transcription. This was confirmed before the plan was written: all twelve of the reference's effects step to completion in Node with no GL context, because Three.js geometry construction is pure typed arrays. Do not reimplement them in the harness.

- [ ] **Step 1: Teach the probe to record**

Add to `godot/tools/fx_probe.gd`. It runs when `--record` is passed, and prints the transcript instead of the check summary:

```gdscript
## Every effect's emission transcript, for `fx-parity.mjs` to hold against the reference's own.
##
## Driven at a fixed 1/60 so the tick count is a comparable number rather than a function of
## how fast the machine happened to be.
func _record_transcripts() -> void:
	var elements := ["fire", "ice", "bolt", "water", "wind", "earth",
		"poison", "holy", "shadow", "aether", "heal", "physical"]
	var out := {}
	for element in elements:
		var ctx = SpellFX.FXContext.new()
		ctx.recording = true
		var sched = Scheduler.new()
		var ticks := 0
		sched.run(func(r): await SpellFX.play(r, ctx, element, Vector3(0.0, 1.0, 0.0)), element)
		while sched.is_busy() and ticks < 600:
			sched.update(1.0 / 60.0)
			ticks += 1
		out[element] = {"calls": ctx.log, "ticks": ticks}
	print(JSON.stringify(out))
	quit(0)
```

And at the top of `_initialize()`:

```gdscript
	if "--record" in OS.get_cmdline_user_args():
		_record_transcripts()
		return
```

- [ ] **Step 2: Write the harness**

Create `tools/fx-parity.mjs`:

```javascript
/**
 * Effects parity: the port asks for the same effect the reference asks for.
 *
 *   node tools/fx-parity.mjs
 *
 * The oracle is the reference's own `SPELL_FX`, run here. It steps to completion in Node with
 * no GL context — Three.js geometry is typed arrays, and nothing in these coroutines touches a
 * canvas — so there is no transcription to drift out of date.
 *
 * What is compared is the *emission transcript*: every burst, ring, column and implode with
 * all of its parameters, every shake and flash, every mesh effect by kind and colour, in
 * order, plus the number of ticks the whole thing takes at a fixed 1/60. Those numbers are the
 * authored shape of the spell — 52 shards gathering for 0.52s and then 64 shattering outward
 * at speed 9 with negative gravity is what "ice" means, and one wrong figure is a different
 * spell that still looks like a spell.
 *
 * What is *not* compared is where any individual particle went. The emitters randomise, and
 * they must: a bolt should jag differently every cast. `fx_probe.gd` is the half that checks
 * the particles actually moved; this half checks they were asked for correctly. Neither is
 * sufficient alone — on 20 August a transcript harness passed 124 scenes while a dozen
 * handlers did nothing at all.
 *
 * Mesh effects are logged by kind and colour without positions, because `bolt` picks its sky
 * point at random and a position would differ between two runs of the same build.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { SPELL_FX } from '../src/fx/spellfx.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const GODOT = process.env.GODOT ?? 'godot';
const DT = 1 / 60;
const ELEMENTS = ['fire', 'ice', 'bolt', 'water', 'wind', 'earth',
  'poison', 'holy', 'shadow', 'aether', 'heal', 'physical'];

const say = (s = '') => console.log(s);
const failures = [];
let compared = 0;
const fail = (line) => { if (failures.length < 20) failures.push(line); };

/** Millionths, so two builds that print a float differently still agree. */
const q = (n) => Math.round(Number(n) * 1e6);

/**
 * Record what the reference asks for, by handing its coroutines a context that only listens.
 *
 * The reference's effects call `ctx.particles.<emitter>(pos, options)` with an options object,
 * `ctx.shake?.()` / `ctx.flash?.()` optionally, and build meshes through the imported
 * builders. The mesh calls cannot be intercepted through the context — they are direct
 * imports — so they are counted from the scene graph instead: every object the effect adds is
 * one mesh effect, identified by what it is made of.
 */
function recordReference(element) {
  const calls = [];
  const scene = new THREE.Scene();
  const emitter = (kind, keys) => (pos, opts = {}) =>
    calls.push([kind, ...keys.map((k) => opts[k] ?? null)]);

  const particles = {
    burst: emitter('burst', ['count', 'speed', 'spread', 'life', 'size',
      'color', 'endColor', 'gravity', 'drag', 'up', 'turbulence']),
    ring: emitter('ring', ['count', 'radius', 'speed', 'life', 'size',
      'color', 'endColor', 'gravity', 'drag', 'up']),
    column: emitter('column', ['count', 'radius', 'speed', 'life', 'size',
      'color', 'endColor', 'drag', 'turbulence']),
    implode: emitter('implode', ['count', 'radius', 'life', 'size', 'color', 'endColor']),
    streak: emitter('streak', ['count', 'life', 'size', 'color', 'endColor', 'jitter', 'drag']),
  };
  const ctx = {
    scene, particles,
    shake: (amount, frequency = 2.0) => calls.push(['shake', amount, frequency]),
    flash: (color, strength) => calls.push(['flash', color, strength]),
  };

  const gen = SPELL_FX[element](ctx, new THREE.Vector3(0, 1, 0));
  let ticks = 0;
  let r = gen.next();
  while (!r.done && ticks < 600) { r = gen.next(DT); ticks++; }
  return { calls, ticks, done: r.done };
}

/**
 * The reference's defaults, applied where a spell omits an option.
 *
 * The port's `FXContext` takes every parameter explicitly, so a `null` from the reference has
 * to be filled in with the same default the reference's own emitter would have used, or the
 * two sides disagree on numbers neither of them chose. Quoted from `src/fx/particles.js`.
 */
const DEFAULTS = {
  burst: { count: 40, speed: 4, spread: 1, life: 0.8, size: 0.5, color: '#ffffff',
    endColor: null, gravity: -2, drag: 1.2, up: 0, turbulence: 0 },
  ring: { count: 48, radius: 0.4, speed: 6, life: 0.6, size: 0.45, color: '#ffffff',
    endColor: null, gravity: 0, drag: 2.2, up: 0.6 },
  column: { count: 50, radius: 0.7, speed: 5, life: 1.0, size: 0.5, color: '#ffffff',
    endColor: null, drag: 0.4, turbulence: 1.2 },
  implode: { count: 44, radius: 3.2, life: 0.55, size: 0.42, color: '#ffffff', endColor: null },
  streak: { count: 26, life: 0.45, size: 0.4, color: '#ffffff', endColor: null,
    jitter: 0.25, drag: 1.4 },
};

/** One call, as a comparable string. Colours lowercased; numbers in millionths. */
function normalise(call) {
  const [kind, ...args] = call;
  if (kind === 'mesh') return `mesh(${args[0]},${String(args[1]).toLowerCase()})`;
  if (kind === 'shake') return `shake(${q(args[0])},${q(args[1])})`;
  if (kind === 'flash') return `flash(${String(args[0]).toLowerCase()},${q(args[1])})`;
  const keys = Object.keys(DEFAULTS[kind]);
  const parts = keys.map((key, i) => {
    let v = args[i];
    if (v === null || v === undefined) v = DEFAULTS[kind][key];
    // `endColor` defaults to the start colour in the reference's `spawn`.
    if (v === null && key === 'endColor') v = args[keys.indexOf('color')] ?? '#ffffff';
    return typeof v === 'string' ? v.toLowerCase() : q(v);
  });
  return `${kind}(${parts.join(',')})`;
}

say('\x1b[1mEffects parity — the port asks for what the reference asks for\x1b[0m');

const raw = execFileSync(GODOT, [
  '--headless', '--path', path.join(root, 'godot'),
  '--script', 'res://tools/fx_probe.gd', '--', '--record',
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const line = raw.trim().split('\n').filter((l) => l.trim().startsWith('{')).pop();
if (!line) {
  say('\x1b[31mthe probe printed no transcript\x1b[0m');
  say(raw.slice(-2000));
  process.exit(1);
}
const port = JSON.parse(line);

for (const element of ELEMENTS) {
  const expected = recordReference(element);
  if (!expected.done) { fail(`${element}: the reference never finished`); continue; }
  const actual = port[element];
  if (!actual) { fail(`${element}: the port recorded nothing`); continue; }

  // Mesh calls are the port's own record; the reference does not route them through its
  // context, so they are compared by count and colour against what the port claims.
  const refCalls = expected.calls.map(normalise);
  const portCalls = actual.calls.map(normalise).filter((c) => !c.startsWith('mesh('));

  compared += refCalls.length + 1;
  if (refCalls.length !== portCalls.length) {
    fail(`${element}: ${portCalls.length} emissions, reference has ${refCalls.length}`);
  }
  for (let i = 0; i < Math.max(refCalls.length, portCalls.length); i++) {
    if (refCalls[i] !== portCalls[i]) {
      fail(`${element} #${i}:\n    reference ${refCalls[i] ?? '(none)'}\n    port      ${portCalls[i] ?? '(none)'}`);
      break;
    }
  }
  // Duration, in ticks at a fixed 1/60. Ice holds for half a second before it shatters and
  // that pause is the effect; a port that skipped it would emit every identical call.
  if (Math.abs(expected.ticks - actual.ticks) > 1) {
    fail(`${element}: ${actual.ticks} ticks, reference takes ${expected.ticks}`);
  }
}

say();
if (failures.length) {
  for (const line of failures) say(`\x1b[31m✗\x1b[0m ${line}`);
  say(`\n\x1b[31m${failures.length} disagreements\x1b[0m over ${compared} comparisons`);
  process.exit(1);
}
say(`\x1b[32m✓\x1b[0m ${ELEMENTS.length} effects agree, ${compared} comparisons`);
```

- [ ] **Step 3: Run it and expect real disagreements**

Run: `node tools/fx-parity.mjs`

This is the step where transcription errors surface. Every mismatch it reports is a number typed wrong in Task 6 — fix `spellfx.gd`, not the harness, unless the harness's default-filling is provably wrong. Re-run until it passes.

- [ ] **Step 4: Break it once, on purpose**

In `godot/scripts/fx/spellfx.gd`, change `_ice`'s hold from `await r.wait(0.52)` to `await r.wait(0.2)`. Re-run.
Expected: `✗ ice: N ticks, reference takes M`, exit 1. Restore.

Then change fire's burst count from 70 to 71. Re-run.
Expected: `✗ fire #1: reference burst(70,…) / port burst(71,…)`, exit 1. Restore.

- [ ] **Step 5: Wire it into the port run**

In `package.json`, add `node tools/fx-parity.mjs` to the end of the `port` script chain, after `cast-parity.mjs`.

- [ ] **Step 6: Run the whole port check**

Run: `npm run port`
Expected: every harness passes, `fx-parity` included.

- [ ] **Step 7: Commit**

```bash
git add tools/fx-parity.mjs godot/tools/fx_probe.gd package.json
git commit -m "Hold the twelve effects against the reference's own code"
```

---

### Task 8: The hit causes the number

**Files:**
- Modify: `godot/scripts/ui/battle_view.gd`

**Interfaces:**
- Consumes: `SpellFX.play`, `SpellFX.FXContext`, `ParticleField` (Tasks 1–6); `Scheduler` (`godot/scripts/engine/scheduler.gd`).
- Produces: no new public surface — `_commit` becomes a coroutine.

The reference awaits the effect and *then* applies damage: "the hit should look like it caused the number." The port applies damage and flashes together.

The gate is the subtle part. `_process` at `battle_view.gd:359` calls `battle.update(delta)` unconditionally, so without a hold the ATB keeps running and the next actor can take a turn while the effect is still playing. The fx scheduler must tick *while the battle is held*, or the effect never finishes and the fight deadlocks.

- [ ] **Step 1: Add the field, the scheduler and the gate**

In `godot/scripts/ui/battle_view.gd`, add near the other members (around line 60):

```gdscript
const ParticleField := preload("res://scripts/fx/particles.gd")
const SpellFX := preload("res://scripts/fx/spellfx.gd")
const Scheduler := preload("res://scripts/engine/scheduler.gd")

var _fx_field
var _fx_sched
var _fx_ctx
## Held while an effect plays. The battle clock stops; the effect's own scheduler does not.
var _fx_busy := false
```

In `_ready()`, after `_stage` is built, attach the field:

```gdscript
	_fx_field = ParticleField.new()
	_fx_field.attach(_stage)
	_fx_sched = Scheduler.new()
	_fx_ctx = SpellFX.FXContext.new()
	_fx_ctx.stage = _stage
	_fx_ctx.particles = _fx_field
	_fx_ctx.on_flash = func(colour: Color, strength: float): _screen_flash(colour, strength)
```

Replace the opening of `_process` (line 353) so the effect clock runs even while the fight is held:

```gdscript
func _process(delta: float) -> void:
	if battle == null:
		return
	if battle.phase == BattleModel.Phase.ENDING:
		return

	# The effect's own clock, which runs whether or not the fight is held. Ticking these
	# inside the hold would deadlock: the effect would wait for a frame that never advances it.
	if _fx_sched != null:
		_fx_sched.update(delta)
	if _fx_field != null:
		_fx_field.update(delta)

	# A spell in flight stops the ATB. Without this the next actor's gauge fills while the
	# first one's fire is still burning, and two turns overlap on screen.
	if _fx_busy:
		return

	battle.update(delta)
```

Leave the rest of `_process` unchanged.

- [ ] **Step 2: Put the effect before the damage**

Replace the tail of `_commit` (`battle_view.gd:739-740`) so the visual lands first:

```gdscript
	# The effect, then the damage. The reference's rule and its reason: the hit should look
	# like it caused the number, which it cannot do if both arrive in the same frame.
	await _play_effect(_element_of(full), actor)
	battle.commit_action(full)
	_after_action(actor, kind, before, _element_of(full))


## Play an action's effect on the stage and wait for it. Returns immediately when there is
## nowhere to play it — a headless probe has no stage, and a fight must not deadlock there.
func _play_effect(element: String, actor: Combatant) -> void:
	if _fx_sched == null or _stage == null:
		return
	var body: Node3D = _bodies.get(actor.id, null)
	var at := Vector3(0.0, 1.0, 0.0) if body == null else body.position + Vector3(0.0, 1.1, 0.0)
	_fx_busy = true
	var routine = _fx_sched.run(func(r): await SpellFX.play(r, _fx_ctx, element, at), "spellfx")
	await _fx_sched.join(routine)
	_fx_busy = false
```

- [ ] **Step 3: Add the screen flash the context calls**

`_fx_ctx.on_flash` needs a target. Add near `_flash`:

```gdscript
## A whole-screen flash, for the effects that ask for one. The post chain that owns this in
## the reference is not ported yet, so this is a coloured overlay faded out on the fx clock —
## the same statement at a lower resolution, and the seam the post chain replaces later.
func _screen_flash(colour: Color, strength: float) -> void:
	var rect := ColorRect.new()
	rect.color = Color(colour.r, colour.g, colour.b, clampf(strength, 0.0, 1.0))
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(rect)
	rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var fade := create_tween().bind_node(rect)
	fade.tween_property(rect, "color:a", 0.0, 0.25)
	fade.tween_callback(func(): if is_instance_valid(rect): rect.queue_free())
```

`set_anchors_and_offsets_preset`, not `set_anchors_preset` — the latter leaves the offsets at zero, so the overlay has a (0,0) rect, draws nothing, and every log line still looks perfect.

- [ ] **Step 4: Check the fight still runs**

Run: `npm run port`
Expected: all harnesses pass. `battle-parity` is the one that matters here — it steps the battle model, and a view change must not have moved a single number.

- [ ] **Step 5: Check it in a browser**

Run: `npm run export:web && npm run smoke:web`
Expected: all checks pass, including `a fight starts`, `a spell can be chosen and cast` and `the fight resolves`. The fight-resolves check presses up to 80 buttons; effects add roughly a second per action, so if it times out, that is the budget to look at first — not a reason to remove the await.

- [ ] **Step 6: Commit**

```bash
git add godot/scripts/ui/battle_view.gd
git commit -m "The hit lands before the number it caused"
```

---

### Task 9: Prove it in the browser

**Files:**
- Modify: `godot/scripts/ui/battle_view.gd`
- Modify: `tools/web-smoke.mjs`

**Interfaces:**
- Consumes: everything above.
- Produces: a `FX` line in the build's console output, and one more browser check.

Every other system in this port reports itself to the browser check. The exported build is where Compatibility, the single-threaded main loop and the software rasteriser all apply at once, and a spell that draws nothing there would pass every check written so far.

- [ ] **Step 1: Make the build say what it drew**

In `_play_effect`, after the join:

```gdscript
	_fx_busy = false
	# Reported because the exported build is the only place Compatibility, one thread and a
	# software rasteriser all apply at once, and an effect that draws nothing there passes
	# every check that runs anywhere else.
	print("FX %s peak=%d" % [element, _fx_peak])
```

And track the peak inside `_process`, next to the field update:

```gdscript
	if _fx_field != null:
		_fx_field.update(delta)
		if _fx_busy:
			_fx_peak = maxi(_fx_peak, _fx_field.count)
```

with `var _fx_peak := 0` beside the other members, reset to `0` in `_play_effect` before the routine starts.

- [ ] **Step 2: Write the failing check**

In `tools/web-smoke.mjs`, add to the console collector beside the other prefixes (near line 265):

```javascript
  if (/^FX /.test(text.trim())) fx.push(text.trim());
```

with `const fx = [];` beside the other collectors, and add the check immediately after the existing `'a spell can be chosen and cast'` check:

```javascript
    // A spell that plays no effect is the state this whole subsystem was built to leave, and
    // it is invisible from everywhere except here: the transcript harness passes, the probe
    // passes, and the exported build shows a coloured light.
    const drew = fx.find((line) => Number(line.split('peak=')[1] ?? 0) > 0);
    check('a cast spell puts particles on screen', Boolean(drew),
      fx.length ? fx.join(' | ') : 'no FX line in the build output');
```

- [ ] **Step 3: Run it and watch it fail first**

Temporarily comment out the `ctx.implode(...)`/`ctx.burst(...)` line in `spellfx.gd`'s `_fire`, then:

```bash
npm run export:web && npm run smoke:web
```

Expected: `✗ a cast spell puts particles on screen`. Restore the line.

- [ ] **Step 4: Run it for real**

Run: `npm run export:web && npm run smoke:web`
Expected: every check passes, the new one included.

- [ ] **Step 5: Run everything**

```bash
npm run port && npm run export:web && npm run smoke:web
```

Expected: all green. This is the full gate the project holds itself to.

- [ ] **Step 6: Commit**

```bash
git add godot/scripts/ui/battle_view.gd tools/web-smoke.mjs
git commit -m "Make the browser prove the spell drew something"
```

---

### Task 10: Look at them

**Files:**
- Create: `godot/tools/render_spells.gd`

**Interfaces:**
- Consumes: `ParticleField`, `Effects`, `SpellFX`, `Scheduler`.
- Produces: twelve PNG strips in `.renders/`, and a refusal if any two are the same image.

Everything so far can pass while the effects are invisible on screen — wrong blend mode, a material culled the wrong way, particles behind the stage. The probe checks the simulation and the parity harness checks the request; neither has looked at a pixel.

This one needs a real window: `godot --headless` cannot render at all. It is a local tool like `render_character.gd`, not a CI check.

- [ ] **Step 1: Write it**

Create `godot/tools/render_spells.gd`:

```gdscript
extends SceneTree
##
## Renders a strip of frames from every spell effect, and refuses a set that is all one image.
##
##   godot --path godot --script res://tools/render_spells.gd
##
## Note the missing `--headless`: it cannot render, and this needs pixels. `fx_probe.gd` is
## the half that runs anywhere.
##
## Drawn into a SubViewport this script owns, for the reason `render_character.gd` records:
## `Window.get_texture()` is not a screenshot. It returns the last frame the compositor
## presented, at the size the *project* declares, so on a window that has not presented yet
## every capture is the same stale frame — which once wrote four identical PNGs and a cheerful
## success line over a rig that was working.
##
## The difference assertion is the point. An image tool that cannot prove its output changed
## is indistinguishable from the statue it is meant to catch.

const ParticleField := preload("res://scripts/fx/particles.gd")
const SpellFX := preload("res://scripts/fx/spellfx.gd")
const Scheduler := preload("res://scripts/engine/scheduler.gd")

const SIZE := Vector2i(480, 480)
const ELEMENTS := ["fire", "ice", "bolt", "water", "wind", "earth",
	"poison", "holy", "shadow", "aether", "heal", "physical"]
## Where in each effect to sample. Early enough to catch a wind-up, late enough to catch the
## detonation that follows it.
const SAMPLES := [0.15, 0.35, 0.6]


func _initialize() -> void:
	var out_dir := ProjectSettings.globalize_path("res://../.renders")
	DirAccess.make_dir_recursive_absolute(out_dir)

	var frame := SubViewport.new()
	frame.size = SIZE
	frame.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	frame.transparent_bg = false
	get_root().add_child(frame)

	var camera := Camera3D.new()
	frame.add_child(camera)
	camera.position = Vector3(0.0, 2.2, 7.0)
	# In-tree before `look_at`, which otherwise leaves the camera at its default heading and
	# says nothing about it.
	camera.look_at(Vector3(0.0, 1.0, 0.0), Vector3.UP)

	var hashes := {}
	var failures: Array = []

	for element in ELEMENTS:
		var stage := Node3D.new()
		frame.add_child(stage)
		var field = ParticleField.new()
		field.attach(stage)
		var ctx = SpellFX.FXContext.new()
		ctx.stage = stage
		ctx.particles = field
		var sched = Scheduler.new()
		sched.run(func(r): await SpellFX.play(r, ctx, element, Vector3(0.0, 1.0, 0.0)), element)

		var elapsed := 0.0
		var shot := 0
		for tick in 240:
			sched.update(1.0 / 60.0)
			field.update(1.0 / 60.0)
			elapsed += 1.0 / 60.0
			if shot < SAMPLES.size() and elapsed >= float(SAMPLES[shot]):
				await RenderingServer.frame_post_draw
				var image := frame.get_texture().get_image()
				var file := "%s/spell_%s_%d.png" % [out_dir, element, shot]
				image.save_png(file)
				# A capture of an empty stage and a capture of a detonation must not hash the
				# same. Identical hashes across the whole set is the stale-frame failure.
				var key := image.get_data().hash()
				if hashes.has(key):
					failures.append("%s frame %d is identical to %s"
						% [element, shot, hashes[key]])
				hashes[key] = "%s frame %d" % [element, shot]
				shot += 1
		field.detach()
		stage.queue_free()
		print("RENDERED %s" % element)

	if failures.is_empty():
		print("RENDER_OK %d frames, all different" % hashes.size())
		quit(0)
	for line in failures:
		print("RENDER_FAIL %s" % line)
	quit(1)
```

- [ ] **Step 2: Run it**

Run: `godot --path godot --script res://tools/render_spells.gd`
Expected: `RENDERED fire` … through all twelve, then `RENDER_OK 36 frames, all different`.

- [ ] **Step 3: Actually look at them**

Open `.renders/spell_*.png`. This is the step that no assertion replaces. Check that fire billows upward, ice has shards converging in frame 0 and scattered in frame 2, bolt is a vertical streak, earth throws debris up from the floor, heal drifts gently. If two elements look alike to you, the signature check passed and the art did not.

- [ ] **Step 4: Break it once, on purpose**

In `godot/shaders/particle.gdshader`, change `render_mode blend_add` to `blend_mix` and set `ALPHA = 0.0`. Re-run.
Expected: `RENDER_FAIL` naming identical frames — every capture is now the same empty stage.

Restore both.

- [ ] **Step 5: Commit**

```bash
git add godot/tools/render_spells.gd
git commit -m "Render the twelve, and refuse a set that is all one picture"
```

---

## What this plan does not do

Phases 3 and 4 of the spec — the toon material chain and the post-processing composite —
are separate plans, because they touch different files and depend on nothing here. Two
consequences are deliberately left standing until then:

- `_screen_flash` is a `ColorRect` overlay rather than the composite's flash uniform. The
  post chain replaces it, and the seam is marked in the code.
- `event_context.gd`'s `grade()` and `stage_class()` are still dead, and
  `project.godot:9` and `atmosphere.gd:13` still record dropping the chain. Those are the
  postfx plan's to fix, and the spec says so.
