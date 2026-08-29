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
	_emitters()

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
