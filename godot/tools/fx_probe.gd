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
const Effects := preload("res://scripts/fx/effects.gd")

var _failures: Array = []
var _skips: Array = []
var _checked := 0

func _check(name: String, ok: bool, detail := "") -> void:
	_checked += 1
	if not ok:
		_failures.append("%s — %s" % [name, detail])


## A check that cannot run in this process, as opposed to one that ran and failed. Recorded
## separately from `_failures` so a skip never reads as a pass (silent) or a bug (FX_FAIL) —
## see `_drawing()` for the one place this fires.
func _skip(name: String, reason: String) -> void:
	_skips.append("%s — %s" % [name, reason])


func _initialize() -> void:
	_integrator()
	_emitters()
	_drawing()
	_mesh_effects()
	_cost()

	# Printed unconditionally, before the pass/fail branch below, so a skip is visible whether
	# or not anything else failed — a skip line missing from green output is as bad as one
	# missing from red output.
	for line in _skips:
		print("FX_SKIP %s" % line)

	if _failures.is_empty():
		if _skips.is_empty():
			print("FX_OK %d checks" % _checked)
		else:
			print("FX_OK %d checks, %d skipped (headless)" % [_checked, _skips.size()])
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

	# A streak lies along the line it was given, not scattered around it or clustered at one
	# end. The line runs diagonally so no axis is trivially zero at both endpoints — a line
	# from (0,0,0) to (10,0,0) shares z == 0 with every point on it, so "|z| < 0.001" would
	# pass even for particles bunched at t=0 or a broken t computation. Two things are worth
	# asserting, and they are independent: nearness (particles sit close to the line) and
	# spread (particles are distributed along its length, not clumped).
	var streak_from := Vector3.ZERO
	var streak_to := Vector3(6.0, 3.0, 9.0)
	var trail = ParticleField.new()
	trail.streak(streak_from, streak_to)
	var seg := streak_to - streak_from
	var seg_len := seg.length()
	var dir := seg / seg_len
	var max_dist := 0.0
	var min_t := INF
	var max_t := -INF
	for i in trail.count:
		var p := Vector3(trail.positions[i * 3], trail.positions[i * 3 + 1],
			trail.positions[i * 3 + 2])
		var proj := (p - streak_from).dot(dir)
		max_dist = maxf(max_dist, p.distance_to(streak_from + dir * proj))
		var t := proj / seg_len
		min_t = minf(min_t, t)
		max_t = maxf(max_t, t)
	# Nearness: the default jitter is 0.25, applied independently on x/y/z, so the worst-case
	# offset from the line is at most 0.125 per axis — magnitude sqrt(3 * 0.125^2) ~= 0.2165.
	# 0.3 leaves headroom without hiding a real bug.
	_check("a streak stays near its line", max_dist < 0.3, "max distance %f" % max_dist)
	# Spread: the emitter lays particles at t = i / count for i in 0..count-1, so with the
	# default count of 26 the projections should span from 0 to 25/26 of the segment. 0.15 of
	# slack at each end allows for jitter without letting a clustered or broken t pass.
	var expected_max_t := float(trail.count - 1) / float(trail.count)
	_check("a streak spreads along its line",
		min_t < 0.15 and max_t > expected_max_t - 0.15,
		"t range %f -> %f (expected up to %f)" % [min_t, max_t, expected_max_t])

	# And the pool refuses to overflow rather than growing without bound.
	var flooded = ParticleField.new()
	for i in 100:
		flooded.burst(origin, 60, 6.0, 1.0, 1.0, 0.5,
			Color(1, 1, 1), Color(1, 1, 1), 0.0, 0.0, 0.0, 0.0)
	_check("the pool has a ceiling", flooded.count == ParticleField.MAX_PARTICLES,
		"count %d" % flooded.count)


## Drawing. The pool can be perfect and draw nothing — an instance count left at zero, a
## visible-instance range never updated, a MultiMesh never given a mesh. All three look
## exactly like a working effect from inside the integrator.
func _drawing() -> void:
	# `set_instance_transform`/`set_instance_color`/`get_instance_*` round-trip through the
	# RenderingServer's per-instance MultiMesh buffer, and Godot's "headless" display driver
	# backs that with a dummy storage implementation that is a genuine no-op: writes land
	# nowhere, so every read comes back zeroed regardless of what this script asked for.
	# Confirmed with a standalone MultiMesh with no particle code involved — not a bug here.
	# `visible_instance_count`, `mesh` and existence are plain resource fields, not routed
	# through that stub, so they read back correctly under headless and stay real checks below.
	#
	# The two checks that need the buffer readback only run under a real rendering driver —
	# locally, or in Task 10's render_spells.gd — and neither runs in CI. That leaves one gap
	# in CI: `_upload` running but writing nothing into the per-instance buffers. "it draws the
	# live range" below still catches `_upload` never running at all, and the browser smoke
	# check catches particles failing to appear on screen.
	var headless := DisplayServer.get_name() == "headless"
	var skip_reason := ("only runs under a real rendering driver, e.g. " +
		"godot --path godot --display-driver macos --rendering-driver opengl3")

	# Typed explicitly: an untyped `field` makes `field.multimesh` a Variant, and `var mm :=
	# field.multimesh` below can't infer a static type from that — same trap as
	# `Callable.call()` returning Variant, just triggered here instead of at export time.
	var field: ParticleField = ParticleField.new()
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
	if headless:
		_skip("instance transforms follow the particles", skip_reason)
	else:
		var xf := mm.get_instance_transform(0)
		var p := Vector3(field.positions[0], field.positions[1], field.positions[2])
		_check("instance transforms follow the particles",
			xf.origin.distance_to(p) < 0.0001, "%s vs %s" % [xf.origin, p])

	# And the colour is the lerped one, not the spawn colour.
	if headless:
		_skip("instance colour is uploaded", skip_reason)
	else:
		var c := mm.get_instance_color(0)
		_check("instance colour is uploaded", c.r > 0.5, "r %f" % c.r)

	field.detach()
	host.queue_free()


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
