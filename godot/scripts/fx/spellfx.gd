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
#
# `_circle_in`, `_circle_out` and `_wave` must await the *same* awaitable whether or not
# `ctx.recording` is set — only the node they touch differs. Branching the await itself (e.g.
# `await r.wait(seconds)` in one branch and `await r.over(seconds, ...)` in the other) would
# make recording and live runs consume a different number of scheduler ticks, and the parity
# harness compares tick counts to within +/-1. So the node is built only when not recording,
# and the per-tick callback checks for null before touching it; the `await r.over(...)` call
# itself is unconditional.

## Spin and fade a magic circle in. Returns the node, or null when recording.
static func _circle_in(r, ctx: FXContext, pos: Vector3, color: String,
		seconds := 0.5, radius := 1.7):
	ctx.mesh("circle", color)
	var circle = null
	if not ctx.recording:
		circle = Effects.magic_circle(ctx.stage, pos, Color(color), radius)
		Effects.set_opacity(circle, 0.0)
	var step := func(t: float, dt: float, raw: float) -> void:
		if circle != null:
			circle.rotation.z += 0.05
			circle.scale = Vector3.ONE * (radius * (0.5 + t * 0.5))
			Effects.set_opacity(circle, t * 0.9)
	await r.over(seconds, step, Callable(Ease, "quad_out"))
	return circle


static func _circle_out(r, ctx: FXContext, circle, seconds := 0.3) -> void:
	var step := func(t: float, dt: float, raw: float) -> void:
		if circle != null:
			circle.rotation.z += 0.08
			Effects.set_opacity(circle, 0.9 * (1.0 - t))
	await r.over(seconds, step)
	Effects.dispose_effect(circle)


## An expanding shockwave ring. Fades faster than it expands — `pow(1 - t, 1.6)` on the
## opacity, not a linear fade — so the wave visibly thins out as it travels.
static func _wave(r, ctx: FXContext, pos: Vector3, color: String,
		seconds := 0.4, scale := 5.0) -> void:
	ctx.mesh("shockwave", color)
	var wave = null
	if not ctx.recording:
		wave = Effects.shockwave(ctx.stage, pos, Color(color))
	var step := func(t: float, dt: float, raw: float) -> void:
		if wave != null:
			wave.scale = Vector3.ONE * (0.2 + t * scale)
			Effects.set_opacity(wave, 0.85 * pow(1.0 - t, 1.6))
	await r.over(seconds, step, Callable(Ease, "quad_out"))
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
	var step := func(t: float, dt: float, raw: float) -> void:
		if bolt != null:
			Effects.set_opacity(bolt, 1.0 - t)
			Effects.set_opacity(bolt2, (1.0 - t) * 0.8)
	await r.over(0.16, step)
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
	var grow := func(t: float, dt: float, raw: float) -> void:
		if pillar != null:
			pillar.scale = Vector3(0.2 + t * 1.5, 12.0, 0.2 + t * 1.5)
			Effects.set_opacity(pillar, 0.85 * (t * 2.0 if t < 0.5 else 1.0))
	await r.over(0.35, grow, Callable(Ease, "quad_out"))
	ctx.column(pos, 54, 1.0, 4.5, 1.2, 0.55, "#ffffff", "#ab9f52", 0.8, 0.8)
	ctx.ring(pos, 40, 0.6, 5.0, 0.7, 0.5, "#fff3b8", "#7a6f37", 0.0, 2.2, 1.2)
	var fade := func(t: float, dt: float, raw: float) -> void:
		if pillar != null:
			Effects.set_opacity(pillar, 0.85 * (1.0 - t))
	await r.over(0.4, fade)
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
	var step := func(t: float, dt: float, raw: float) -> void:
		if pillar != null:
			var w := 1.0 * (1.0 - t * 0.6)
			pillar.scale = Vector3(w, 10.0, w)
			Effects.set_opacity(pillar, 0.8 * (1.0 - t))
	await r.over(0.45, step)
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
	var step := func(t: float, dt: float, raw: float) -> void:
		if arc != null:
			arc.rotation.z += 0.22
			arc.scale = Vector3.ONE * (1.4 + t * 1.1)
			Effects.set_opacity(arc, 1.0 - t)
	await r.over(0.18, step)
	Effects.dispose_effect(arc)
	ctx.burst(pos, 22, 6.0, 1.0, 0.32, 0.32, "#ffffff", "#d8d3c6", -6.0, 2.0, 0.0, 0.0)
