class_name RNG
extends RefCounted
##
## Deterministic RNG — xoshiro128** seeded through splitmix32.
##
## A bit-exact port of `src/engine/rng.js`, and it has to be bit-exact rather
## than merely equivalent: every random decision in the game routes through a
## named stream so battles, encounters and drops replay identically from a save,
## and a port that diverges on the tenth draw produces fights that are plausible,
## different, and invisible to every audit the project owns. `tools/rng-parity.mjs`
## compares the two implementations value by value.
##
## Nothing in the *world* is randomly generated. This is combat variance, chest
## drops and flavour only.
##
## ## Why the arithmetic looks like this
##
## The reference is 32-bit unsigned throughout, expressed in JavaScript with
## `Math.imul` and `>>>`. GDScript has neither, and its `int` is 64-bit *signed*,
## so the three obvious transcriptions are all wrong:
##
## - **Multiplication overflows.** A 32×32-bit product needs 64 unsigned bits and
##   wraps negative in a signed one, so `_imul` splits both operands into 16-bit
##   halves and reassembles the low 32 bits.
## - **`>>` is arithmetic**, not logical: on a negative value it copies the sign
##   bit downward. Every value here is masked to 32 bits *before* it is shifted,
##   which is what makes the shift equivalent to `>>>`.
## - **Rotation needs both halves masked**, or the high bits of the left shift
##   survive into the result.
##
## Method names differ from the reference where JavaScript's would collide with
## GDScript built-ins: `int`, `float` and `range` are functions here, so the draws
## are `int_below`, `float_range` and `int_range`.

const MASK := 0xFFFFFFFF

var s0 := 0
var s1 := 0
var s2 := 0
var s3 := 0

## How many raw draws this stream has served. Not part of the algorithm — it is
## what lets a parity harness tell "used a number wrongly" apart from "read a
## different part of the stream".
var draws := 0
## The first few values drawn, for the same reason: a count says the streams
## diverged, and the sequence says which number one side failed to take.
var draw_log: Array = []


func _init(initial_seed: int = 0x2f6e2b1) -> void:
	reseed(initial_seed)


## 32-bit multiply — JavaScript's `Math.imul`.
##
## Split into 16-bit halves because the full product of two 32-bit values does
## not fit in a signed 64-bit int. The cross terms are at most 0xFFFF² each, so
## nothing here overflows.
static func _imul(a: int, b: int) -> int:
	var a_lo := a & 0xFFFF
	var b_lo := b & 0xFFFF
	var a_hi := (a >> 16) & 0xFFFF
	var b_hi := (b >> 16) & 0xFFFF
	return ((((a_hi * b_lo + a_lo * b_hi) & 0xFFFF) << 16) + a_lo * b_lo) & MASK


## Rotate a 32-bit value left. Both halves masked; see the class notes.
static func _rotl(x: int, k: int) -> int:
	return (((x << k) & MASK) | ((x & MASK) >> (32 - k))) & MASK


## Expand one integer into 128 bits of state with splitmix32.
##
## A seed of zero would leave xoshiro in its one fixed point, where it produces
## zeros forever, so the all-zero state is nudged — the same guard the reference
## has.
func reseed(n: int) -> RNG:
	var x := n & MASK
	var parts: Array[int] = []
	for _i in 4:
		x = (x + 0x9e3779b9) & MASK
		var z := x
		z = _imul(z ^ (z >> 16), 0x21f0aaad)
		z = _imul(z ^ (z >> 15), 0x735a2d97)
		parts.append((z ^ (z >> 15)) & MASK)
	s0 = parts[0]
	s1 = parts[1]
	s2 = parts[2]
	s3 = parts[3]
	if (s0 | s1 | s2 | s3) == 0:
		s0 = 1
	return self


## Raw 32-bit unsigned draw.
func u32() -> int:
	draws += 1
	var result := _imul(_rotl(_imul(s1, 5), 7), 9)
	var t := (s1 << 9) & MASK
	s2 ^= s0
	s3 ^= s1
	s1 ^= s2
	s0 ^= s3
	s2 ^= t
	s3 = _rotl(s3, 11)
	if draw_log.size() < 40:
		draw_log.append(result)
	return result


## Float in [0, 1). Exactly recoverable from `u32`, which is why the parity
## harness can compare the integer draws and know the floats agree too.
func next() -> float:
	return float(u32()) / 4294967296.0


## Integer in [0, n).
func int_below(n: int) -> int:
	return 0 if n <= 0 else u32() % n


## Integer in [lo, hi], inclusive.
func int_range(lo: int, hi: int) -> int:
	return lo + int_below(hi - lo + 1)


## Float in [lo, hi).
func float_range(lo: float, hi: float) -> float:
	return lo + next() * (hi - lo)


## True with probability p (0..1).
func chance(p: float) -> bool:
	return next() < p


## True with probability n/256 — the classic SNES-style roll.
func chance256(n: int) -> bool:
	return int_below(256) < n


func pick(arr: Array) -> Variant:
	return arr[int_below(arr.size())]


## Weighted pick. `entries` is an array of `[weight, value]` pairs or of
## dictionaries carrying a `weight` key, matching the reference's two shapes.
##
## The float accumulation is deliberately not tidied into something neater: the
## running subtraction and the `<= 0` boundary decide which entry a given draw
## lands on, and rearranging the arithmetic moves that boundary.
func weighted(entries: Array) -> Variant:
	var total := 0.0
	for e in entries:
		total += float(e[0]) if e is Array else float(e["weight"])
	var roll := next() * total
	for e in entries:
		var w := float(e[0]) if e is Array else float(e["weight"])
		roll -= w
		if roll <= 0.0:
			return e[1] if e is Array else e
	var last: Variant = entries[entries.size() - 1]
	return last[1] if last is Array else last


## In-place Fisher-Yates.
func shuffle(arr: Array) -> Array:
	var i := arr.size() - 1
	while i > 0:
		var j := int_below(i + 1)
		var swap: Variant = arr[i]
		arr[i] = arr[j]
		arr[j] = swap
		i -= 1
	return arr


func get_state() -> Array:
	return [s0, s1, s2, s3]


## Restore a saved state.
##
## Masked on the way in, because a save written by the reference build carries
## *signed* words: JavaScript's bitwise operators return int32, so three quarters
## of the xoshiro state comes back out of `getState()` negative. The 128 bits are
## the same either way and both forms produce the same stream — but storing the
## negative form here would make `get_state()` disagree with itself depending on
## where the save came from.
func set_state(state: Array) -> RNG:
	s0 = int(state[0]) & MASK
	s1 = int(state[1]) & MASK
	s2 = int(state[2]) & MASK
	s3 = int(state[3]) & MASK
	return self
