class_name Growth
extends RefCounted
##
## Stat curves and the experience table.
##
## A port of `statAt`, `expForLevel` and `levelForExp` from
## `src/data/characters.js`. These sit in the data module rather than in
## `formulas.js`, which is why they were the only combat numbers the port had not
## compared — `tools/growth-parity.mjs` now walks all fourteen characters, eight
## stats and ninety-nine levels.
##
## The character table itself is exported data; only the curves are code.

## Level past which growth is damped, and by how much.
##
## Diminishing returns past 40 keep the endgame from running away while still
## rewarding levelling: a level costs the same and buys less.
const SOFT_LEVEL := 40.0
const SOFT_SLOPE := 0.68

## Everything except HP and MP is capped here, as tradition demands.
const STAT_CAP := 255

## The experience curve: `coefficient × level ^ exponent`.
##
## The exponent is fitted, not chosen. What the encounter tables pay a party of
## four grows as roughly `0.045 × level^2.55` across the game — five experience a
## fight in the Silt Road, three thousand out on the Overwind — and integrating
## that gives `level^3.55`.
##
## The coefficient and `Field.ENCOUNTER_SPACING` are one decision, not two:
## encounters are 2.6× further apart and a level costs 2.6× less, so a level still
## takes the same amount of *walking* and only the number of interruptions
## changed. Moving either alone under-levels the party by a third before the
## mandatory bosses, which is the defect `criticalPath` in `tools/balance.mjs`
## exists to catch.
const EXP_COEFFICIENT := 0.049
const EXP_EXPONENT := 3.55

const MAX_LEVEL := 99


## A character's base stat at a level, before equipment or magicite.
static func stat_at(character: Dictionary, stat: String, level: int) -> int:
	if character.is_empty():
		return 1
	var base := float(character.get("base", {}).get(stat, 10))
	var growth := float(character.get("growth", {}).get(stat, 1))
	var levels := float(maxi(1, level) - 1)
	var effective := levels if levels <= SOFT_LEVEL \
		else SOFT_LEVEL + (levels - SOFT_LEVEL) * SOFT_SLOPE
	var value := base + growth * effective
	if stat == "hp" or stat == "mp":
		return int(round(value))
	return mini(STAT_CAP, int(round(value)))


## Total experience required to reach a level.
static func exp_for_level(level: int) -> int:
	if level <= 1:
		return 0
	return int(round(EXP_COEFFICIENT * pow(float(level), EXP_EXPONENT)))


## The level a given total experience buys.
static func level_for_exp(total: int) -> int:
	var level := 1
	while level < MAX_LEVEL and total >= exp_for_level(level + 1):
		level += 1
	return level
