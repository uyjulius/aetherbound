class_name Formulas
extends RefCounted
##
## Combat mathematics — a line-for-line port of ../../src/battle/formulas.js.
##
## This file is the reason porting is worth more than starting over. Every
## number in it is the result of a balance pass measured against the simulator
## in ../../tools/balance.mjs: the two damage curves are deliberately different,
## defence saturates rather than clamping, the magic stat softens rather than
## capping, and the experience coefficient is fitted to encounter payouts and
## paired with the encounter spacing. None of it is arbitrary and none of it can
## be tidied without re-breaking class viability or the pacing curve.
##
## So it is ported literally, integer truncation included, and
## ../../tools/parity.mjs runs both implementations over the same grid of inputs
## and fails on any disagreement. A port that rounds differently has silently
## rebalanced the game, and no screenshot would show it.
##
## Everything is `static`: this is pure arithmetic with no state, so there is
## nothing to instantiate and nothing to put in the scene tree. The first draft
## took a `Dictionary` of named arguments to mirror the JavaScript call sites;
## that made every call allocate, made every value a Variant the analyser had to
## infer through, and hung Godot's headless script loader outright. Explicit
## typed parameters are faster, catch a misspelled argument at parse time
## instead of silently defaulting it, and load.
##
## Variance is deliberately *not* applied inside the damage functions. In the
## reference it is a seeded RNG roll layered on top, so the two engines can only
## be compared on the deterministic term; callers add it explicitly.

const DEFENCE_SOFT := 200.0

## Kept under the old name because the item and bestiary notes cite it.
const DEFENCE_CAP := DEFENCE_SOFT

const MAGIC_SOFT := 128.0
const MAGIC_SLOPE := 0.35

## How hard a spell hits when a *creature* casts it, relative to its swing.
const MONSTER_SPELL_REFERENCE := 60.0

## What a purse of spoils is actually worth. One rate here rather than two
## hundred edits in the bestiary, so the relative worth of every creature is
## preserved and the economy is a single number somebody can argue with.
const GOLD_RATE := 0.25

## Damage-over-time tick sizes, as a fraction of max HP.
const TICK_POISON := 0.045
const TICK_VENOM := 0.085
const TICK_SEIZURE := 0.06
const TICK_REGEN := 0.055

# ---------------------------------------------------------------------------
# Core damage
# ---------------------------------------------------------------------------

## Where defence stops being worth much, expressed as saturation rather than a
## clamp. A hard clamp discarded every point past the cap, which made the
## fifty-three creatures carrying 201-232 exactly as tough as each other and
## their authored numbers meaningless.
static func effective_defence(defence: float, ignore: float = 0.0) -> float:
	var d: float = maxf(0.0, defence) * (1.0 - ignore)
	return DEFENCE_SOFT * (1.0 - exp(-d / DEFENCE_SOFT))


## What survives a given defence.
static func through_defence(dmg: float, defence: float, ignore: float = 0.0) -> int:
	var survived: float = (dmg * (255.0 - effective_defence(defence, ignore))) / 256.0
	return int(floor(survived)) + 1


## How much of the magic stat counts.
##
## It softens, it does not clamp. A flat cap meant every mage passed it around
## level 33 and from then on cast for identical numbers, so every point of magic
## from a level-up, a rod or a relic bought nothing.
static func effective_magic(magic: float) -> float:
	var m: float = maxf(1.0, magic)
	if m <= MAGIC_SOFT:
		return m
	return MAGIC_SOFT + (m - MAGIC_SOFT) * MAGIC_SLOPE


## Physical damage, for a member of the party.
##
## Attack power is `weapon + vigour * 2` and the level term *multiplies* it.
## An earlier version added the level term to weapon power instead, so weapon
## power was never multiplied by anything: a sword at level 85 hit for 305 while
## a spell hit for 34,000, and every physical character was dead weight.
static func physical_damage(
	attacker_level: int,
	vigour: int,
	weapon_power: int,
	defence: float,
	attacker_row: String = "front",
	target_row: String = "front",
	critical: bool = false,
	multiplier: float = 1.0,
	ignore_defence: float = 0.0,
	reach_back: bool = false
) -> int:
	var vig: float = maxf(1.0, float(vigour))
	var power: float = maxf(1.0, float(weapon_power)) + vig * 2.0
	var lv: float = maxf(1.0, float(attacker_level))

	# Half the attack power as a floor, the rest from the level term. A full
	# `power` floor made early combat far faster than late.
	var dmg: float = floor(power * 0.5 + (lv * lv * power) / 768.0)

	if critical:
		dmg = floor(dmg * 2.0)
	dmg = floor(dmg * multiplier)

	# Back row halves damage dealt — unless the weapon reaches. That is the
	# entire reason to own a bow or a spear, and the row system's real trade.
	if attacker_row == "back" and not reach_back:
		dmg = floor(dmg / 2.0)

	var out: int = through_defence(dmg, defence, ignore_defence)
	if target_row == "back":
		out = int(floor(float(out) / 2.0))
	return maxi(1, out)


## Damage dealt *by* a creature, physical or magical.
##
## Monsters do not share the party's curve and should not: a party member's
## output has to climb from rats to a thing with eighty thousand hit points,
## while a creature's job is to take a predictable bite out of a health bar off
## the `atk` its bestiary entry actually authored.
static func monster_damage(
	level: int,
	power: float,
	defence: float,
	multiplier: float = 1.0,
	target_row: String = "front",
	ignore_defence: float = 0.0
) -> int:
	var base: float = maxf(1.0, power) * (1.0 + maxf(1.0, float(level)) / 50.0)
	var dmg: float = floor(base * multiplier)
	var out: int = through_defence(dmg, defence, ignore_defence)
	if target_row == "back":
		out = int(floor(float(out) / 2.0))
	return maxi(1, out)


## Magic damage. Rows do not apply — magic reaches the back line, which is the
## whole reason rows are an interesting choice.
static func magic_damage(
	caster_level: int,
	magic: float,
	spell_power: float,
	magic_defence: float,
	multiplier: float = 1.0
) -> int:
	var mag: float = effective_magic(magic)
	var base: float = spell_power * 1.5 + floor((float(caster_level) * mag * spell_power) / 257.0)
	var dmg: float = floor(base * multiplier)
	return maxi(1, through_defence(dmg, magic_defence))


## Healing scales off magic but ignores defence entirely, which is why its
## divisor is so much larger than the damage one.
static func heal_amount(
	caster_level: int,
	magic: float,
	spell_power: float,
	multiplier: float = 1.0
) -> int:
	var mag: float = effective_magic(magic)
	var base: float = spell_power * 4.0 + floor((float(caster_level) * mag * spell_power) / 1360.0)
	return maxi(1, int(floor(base * multiplier)))


## The classic +/-12.5% spread. The roll (224..256) is supplied so the caller
## owns the RNG and this stays a pure function.
static func apply_variance(value: int, roll: int) -> int:
	return int(floor(float(value * roll) / 256.0))

# ---------------------------------------------------------------------------
# Hit, evade, elements
# ---------------------------------------------------------------------------

static func hit_chance(
	accuracy: float = 100.0,
	target_evade: float = 0.0,
	blind: bool = false,
	vanish: bool = false,
	always_hits: bool = false
) -> float:
	if always_hits:
		return 1.0
	if vanish:
		return 0.0
	var acc: float = accuracy - target_evade
	if blind:
		acc = floor(acc * 0.45)
	return clampf(acc / 100.0, 0.02, 1.0)


## A plain swing has no element, so it looks up `physical` — which eleven
## creatures across the bestiary declare and which, until it was read, did
## nothing at all.
static func elemental_multiplier(element: String, affinities: Dictionary) -> float:
	var key: String = element
	if key == "":
		key = "physical"
	if not affinities.has(key):
		return 1.0
	var band: String = str(affinities[key])
	match band:
		"weak": return 2.0
		"normal": return 1.0
		"resist": return 0.5
		"immune": return 0.0
		"absorb": return -1.0
	return 1.0

# ---------------------------------------------------------------------------
# ATB and rewards
# ---------------------------------------------------------------------------

## Speed contributes strongly but with diminishing returns, so a fast character
## gets meaningfully more turns without a speed build trivialising the game.
static func atb_rate(
	speed: float,
	haste: bool = false,
	slow: bool = false,
	stop: bool = false,
	battle_speed: float = 3.0
) -> float:
	if stop:
		return 0.0
	var rate: float = (24.0 + maxf(1.0, speed)) / 42.0
	if haste:
		rate *= 1.5
	if slow:
		rate *= 0.55
	# The config slider, 1..6 — the player's own pacing preference.
	rate *= 0.55 + battle_speed * 0.15
	return rate


## Divided by the number of *conscious* members, so a smaller party levels
## faster — the classic incentive to occasionally split up.
static func exp_share(total_exp: int, survivors: int) -> int:
	return maxi(1, int(floor(float(total_exp) / float(maxi(1, survivors)))))


static func gold_share(total_gold: float) -> int:
	return maxi(1, int(round(total_gold * GOLD_RATE)))


## Desperation-gauge gain: rises sharply as HP falls.
static func limit_gain(
	damage_taken: float,
	max_hp: float,
	current_hp: float,
	allies_down: int = 0
) -> float:
	var cap: float = maxf(1.0, max_hp)
	var hp_fraction: float = maxf(0.0, current_hp) / cap
	var danger: float = 1.0
	if hp_fraction < 0.25:
		danger = 2.4
	elif hp_fraction < 0.5:
		danger = 1.5
	var base: float = (damage_taken / cap) * 100.0 * 0.85
	return minf(100.0, base * danger + float(allies_down) * 6.0)
