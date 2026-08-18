class_name Ease
extends RefCounted
##
## The easing curves, ported one for one from `src/engine/scheduler.js`.
##
## They are part of how the game feels rather than a maths detail: `snap`
## overshoots and settles, which is what makes the menu cursor and the damage
## pop-ups read as physical, and `back_out` is the reason a panel arriving looks
## like it was placed rather than teleported. Godot's own `Tween` transitions are
## close cousins but not the same functions, so they are written out — a curve
## that is nearly right makes the whole interface feel slightly wrong in a way
## nobody can point at.

static func linear(t: float) -> float: return t
static func quad_in(t: float) -> float: return t * t
static func quad_out(t: float) -> float: return t * (2.0 - t)
static func quad_in_out(t: float) -> float:
	return 2.0 * t * t if t < 0.5 else -1.0 + (4.0 - 2.0 * t) * t
static func cubic_in(t: float) -> float: return t * t * t
static func cubic_out(t: float) -> float:
	var u := t - 1.0
	return u * u * u + 1.0
static func cubic_in_out(t: float) -> float:
	if t < 0.5:
		return 4.0 * t * t * t
	return (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0
static func expo_out(t: float) -> float:
	return 1.0 if is_equal_approx(t, 1.0) else 1.0 - pow(2.0, -10.0 * t)
static func expo_in(t: float) -> float:
	return 0.0 if t == 0.0 else pow(2.0, 10.0 * t - 10.0)
static func back_out(t: float) -> float:
	return 1.0 + 2.70158 * pow(t - 1.0, 3.0) + 1.70158 * pow(t - 1.0, 2.0)
static func back_in(t: float) -> float:
	return 2.70158 * t * t * t - 1.70158 * t * t
static func elastic_out(t: float) -> float:
	if t == 0.0 or is_equal_approx(t, 1.0):
		return t
	# TAU / 3, i.e. the reference's `(2 * Math.PI) / 3`. Halving this looks like a
	# plausible elastic curve and is a different one: it undershoots at 0.25 where
	# the real curve is still overshooting.
	return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * (TAU / 3.0)) + 1.0
static func bounce_out(t: float) -> float:
	var n1 := 7.5625
	var d1 := 2.75
	var u := t
	if u < 1.0 / d1:
		return n1 * u * u
	if u < 2.0 / d1:
		u -= 1.5 / d1
		return n1 * u * u + 0.75
	if u < 2.5 / d1:
		u -= 2.25 / d1
		return n1 * u * u + 0.9375
	u -= 2.625 / d1
	return n1 * u * u + 0.984375
## Overshoot then settle — the menu cursor and damage pop-ups.
static func snap(t: float) -> float:
	return 1.0 - pow(1.0 - t, 4.0) * cos(t * PI * 1.2)

## Curves by the name the reference uses, so ported code and the parity harness
## can both ask for `"quadInOut"` and mean the same function.
static var BY_NAME: Dictionary = {
	"linear": Callable(Ease, "linear"),
	"quadIn": Callable(Ease, "quad_in"),
	"quadOut": Callable(Ease, "quad_out"),
	"quadInOut": Callable(Ease, "quad_in_out"),
	"cubicIn": Callable(Ease, "cubic_in"),
	"cubicOut": Callable(Ease, "cubic_out"),
	"cubicInOut": Callable(Ease, "cubic_in_out"),
	"expoOut": Callable(Ease, "expo_out"),
	"expoIn": Callable(Ease, "expo_in"),
	"backOut": Callable(Ease, "back_out"),
	"backIn": Callable(Ease, "back_in"),
	"elasticOut": Callable(Ease, "elastic_out"),
	"bounceOut": Callable(Ease, "bounce_out"),
	"snap": Callable(Ease, "snap"),
}
