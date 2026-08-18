class_name Scheduler
extends RefCounted
##
## Coroutines on *game* time.
##
## Cutscenes, battle animations and UI transitions are written top to bottom and
## pause by awaiting, which is the same readability the reference build gets from
## generators:
##
##     await ctx.move_to(actor, x, z, 0.6)
##     await r.wait(0.2)
##     await ctx.say("Vesna", "It answered me…")
##
## The shape is different from `src/engine/scheduler.js` — GDScript has no
## generators, so `yield wait(0.2)` becomes `await r.wait(0.2)` — and the
## semantics are deliberately not. Every wait resumes from this scheduler's own
## tick, so `time_scale` and `paused` apply to every routine at once. A `Timer`
## node or a bare `Tween` would run on wall clock and keep a paused game
## animating, and a battle that slows down for a limit break would slow the
## damage numbers and not the ATB.
##
## The routine hands itself to its body, and every awaitable hangs off that
## handle rather than off the scheduler, so a routine can only ever suspend
## *itself*.

enum Block { NONE, TICK, TIME, FRAMES, UNTIL }

## Non-blocking yields drained in a single frame before the routine is assumed to
## be spinning. The reference uses the same figure, and the failure it catches is
## a `while true` with a zero-length wait in it, which otherwise hangs the game
## with no output.
const DRAIN_GUARD := 4096

var time_scale := 1.0
var paused := false

var _routines: Array = []


## One running coroutine, and the handle its body suspends on.
class Routine:
	extends RefCounted

	## Emitted by the scheduler to resume the body, carrying the frame's delta.
	signal resumed(dt: float)
	## Emitted once when the body returns, or when the routine is cancelled.
	signal finished()

	var tag := "anon"
	var done := false
	var cancelled := false

	var _block: int = Scheduler.Block.NONE
	var _time := 0.0
	var _frames := 0
	var _predicate := Callable()
	var _pending_body := Callable()

	# --- what a body awaits -------------------------------------------------
	# Each of these returns the delta it was resumed with, so `tween` and `over`
	# can integrate time without asking the scheduler for it.

	## Pause for `seconds` of game time. Zero is legal and resumes in the same
	## frame, matching the reference.
	func wait(seconds: float) -> float:
		_block = Scheduler.Block.TIME
		_time = maxf(0.0, seconds)
		return await resumed

	## Pause for a number of scheduler ticks.
	func frames(count: int) -> float:
		_block = Scheduler.Block.FRAMES
		_frames = maxi(1, count)
		return await resumed

	## Pause until `predicate` returns true. Checked once per tick.
	func until(predicate: Callable) -> float:
		_block = Scheduler.Block.UNTIL
		_predicate = predicate
		return await resumed

	## Resume on the next tick. The building block of everything that animates.
	func tick() -> float:
		_block = Scheduler.Block.TICK
		return await resumed

	## Interpolate a value over time. `apply` receives the eased value and the
	## raw 0..1 progress, because a caller often wants both — the value to set
	## and the progress to fade an outline with.
	func tween(from: float, to: float, seconds: float, apply: Callable,
			ease: Callable = Callable()) -> void:
		var curve := ease if ease.is_valid() else Callable(Ease, "quad_in_out")
		if seconds <= 0.0:
			apply.call(to, 1.0)
			return
		var elapsed := 0.0
		while elapsed < seconds:
			elapsed += await tick()
			var t := minf(1.0, elapsed / seconds)
			apply.call(from + (to - from) * float(curve.call(t)), t)
		# Landed exactly, whatever the frame times did. A tween that stops at
		# 0.998 leaves a panel a pixel short of where it was told to go.
		apply.call(to, 1.0)

	## Run a callback every tick for a duration, with progress, delta and raw t.
	func over(seconds: float, fn: Callable, ease: Callable = Callable()) -> void:
		var curve := ease if ease.is_valid() else Callable(Ease, "linear")
		var elapsed := 0.0
		while elapsed < seconds:
			var dt := await tick()
			elapsed += dt
			var t := minf(1.0, elapsed / seconds)
			fn.call(float(curve.call(t)), dt, t)

	# --- driven by the scheduler -------------------------------------------

	## Advance one scheduler tick. Returns nothing; the routine is resumed by
	## signal, which is what makes `await` inside the body work.
	func _advance(dt: float) -> void:
		if done or cancelled:
			return

		# The body runs on the first tick, not when `run()` was called.
		#
		# This looks like a needless delay and is the opposite: a JavaScript
		# generator does nothing until it is first stepped, so in the reference
		# build the frame that starts a routine only gets as far as its first
		# yield. Calling the body inside `run()` would make every ported cutscene
		# and battle animation land one frame earlier here than there, which is a
		# whole tick of divergence introduced for free and impossible to see.
		var carry := dt
		if _pending_body.is_valid():
			var body := _pending_body
			_pending_body = Callable()
			body.call(self)
			if _block == Scheduler.Block.NONE:
				_finish()
				return
			# Falls through into the drain loop only for a wait that is already
			# satisfied, which is the same rule the loop itself uses: the
			# reference keeps stepping a generator within one frame until it hits
			# something genuinely blocking, so a body that opens with `wait(0)`
			# gets no further behind here than it does there.
			if _block != Scheduler.Block.TIME or _time > 0.0:
				return

		var guard := 0
		while true:
			guard += 1
			if guard > Scheduler.DRAIN_GUARD:
				push_warning("coroutine '%s' yielded %d times without blocking — cancelled"
					% [tag, Scheduler.DRAIN_GUARD])
				cancel()
				return
			match _block:
				Scheduler.Block.TICK:
					_block = Scheduler.Block.NONE
					resumed.emit(carry)
					return
				Scheduler.Block.TIME:
					_time -= carry
					if _time > 0.0:
						return
					# The overshoot is carried into this frame rather than
					# discarded, so a chain of short waits does not drift a frame
					# later on every step.
					carry = -_time
					_time = 0.0
					_block = Scheduler.Block.NONE
					resumed.emit(carry)
				Scheduler.Block.FRAMES:
					_frames -= 1
					if _frames > 0:
						return
					_block = Scheduler.Block.NONE
					resumed.emit(carry)
				Scheduler.Block.UNTIL:
					if not _predicate.is_valid() or not bool(_predicate.call()):
						return
					_predicate = Callable()
					_block = Scheduler.Block.NONE
					resumed.emit(carry)
				_:
					return
			if done or cancelled:
				return
			# The body asked for nothing after being resumed, so it has returned
			# and this routine is finished.
			#
			# This is also what happens if a body awaits something that is not its
			# own handle — a raw signal, another node's coroutine. Such a routine
			# is no longer driven by this scheduler and would never be resumed by
			# it again, so calling it finished is the truthful answer rather than a
			# missed case. Bodies suspend on their handle; that is the contract.
			if _block == Scheduler.Block.NONE:
				_finish()
				return
			# Keep draining only while the body asks for something already
			# satisfied — a zero-length wait. Anything else waits for the next
			# tick, so one visible step happens per frame.
			if _block != Scheduler.Block.TIME or _time > 0.0:
				return

	func _finish() -> void:
		if done or cancelled:
			return
		done = true
		finished.emit()


	## Stop the routine where it stands.
	##
	## GDScript cannot unwind a suspended coroutine the way `gen.return()` does
	## in JavaScript. Disconnecting the signal it is parked on does the
	## equivalent: the awaiting frame is released and never runs again. Leaving it
	## connected instead would park it forever *and* keep a reference cycle —
	## the signal holds the coroutine, the coroutine holds this object — alive
	## for the rest of the session.
	func cancel() -> void:
		if done or cancelled:
			return
		cancelled = true
		for connection in resumed.get_connections():
			resumed.disconnect(connection["callable"])
		finished.emit()


## Start a coroutine.
##
## `body` is called with its `Routine` on the next `update()`, not here — see
## `_advance` for why that matters — so a routine is never `done` the moment it is
## started, even if its body would return without awaiting.
##
## The body's return value is deliberately not captured. Awaiting the call would
## mean this scheduler holds a second suspended frame per routine — one that
## cancellation cannot release, because there is no signal to disconnect — and
## the reference build never reads a routine's result either. What callers
## actually want is "tell me when it is over", which `join` gives them.
func run(body: Callable, tag := "anon") -> Routine:
	var routine := Routine.new()
	routine.tag = tag
	routine._pending_body = body
	_routines.append(routine)
	return routine


## Wait for another routine to end: `await sched.join(other)`.
func join(routine: Routine) -> void:
	if routine.done or routine.cancelled:
		return
	await routine.finished


func cancel_tag(tag: String) -> void:
	for routine in _routines.duplicate():
		if routine.tag == tag:
			routine.cancel()


func cancel_all() -> void:
	for routine in _routines.duplicate():
		routine.cancel()
	_routines.clear()


func is_busy() -> bool:
	for routine in _routines:
		if not routine.done and not routine.cancelled:
			return true
	return false


func count() -> int:
	return _routines.size()


## Advance every routine by one tick of game time.
##
## Pausing sets the delta to zero rather than skipping the pass. That is not a
## detail: with the pass skipped, a routine started while paused never runs its
## first line and an `until` predicate is never evaluated, so unpausing costs an
## extra tick and a gate that opened during the pause is noticed late. The
## reference has no `paused` flag at all — it sets `timeScale` to zero, which
## keeps stepping routines while no time passes — and this is the same statement.
func update(dt: float) -> void:
	var scaled := 0.0 if paused else dt * time_scale
	# Over a snapshot: routines routinely start other routines, and a cutscene
	# that spawns its own follow-up would otherwise be advanced in the same frame
	# it was created, or invalidate the iteration.
	for routine in _routines.duplicate():
		routine._advance(scaled)
	var live: Array = []
	for routine in _routines:
		if not routine.done and not routine.cancelled:
			live.append(routine)
	_routines = live
