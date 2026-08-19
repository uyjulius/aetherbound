class_name Combatant
extends RefCounted
##
## One side of one exchange: a party member or a creature, with the numbers a
## fight reads off it.
##
## The two kinds share this base because almost everything about a fight treats
## them alike — gauges fill, statuses tick, damage lands — and differ in where
## their numbers come from. A party member's come from a level, a growth curve and
## six equipment slots; a creature's are authored in the bestiary. That difference
## is the reason the two also use different damage curves: a party member's output
## has to climb from rats to a boss with eighty thousand hit points, while a
## creature's job is to take a predictable bite out of a health bar.

## "party" or "enemy".
var kind := "enemy"
var id := ""
var name := ""
var level := 1
var hp := 0
var max_hp := 0
var mp := 0
var max_mp := 0
var row := "front"
## Status id → `{turns: int}`.
var statuses: Dictionary = {}
var immune: Array = []
var atb := 0.0
var turn_count := 0
## Boss phase, which the AI walk reads and advances.
var phase := 1
var scanned := false
## Set by Defend and spent when the character next acts.
var defending := false
## Fill accumulated while unable to act, which buys status ticks instead of turns.
var blocked_fill := 0.0
## Marked by Quarry: everything the party throws at this target hits harder, not
## just the character who marked it.
var quarry := false
## Vesna's Attune replaces her weapon's element for the rest of the fight.
var attuned_element := ""
## One summon per battle. An esper is a resource you spend, not a spell you spam.
var summoned := false

var _statuses_table: Dictionary = {}


func is_ko() -> bool:
	return hp <= 0


## Can this combatant take a turn at all?
func can_act() -> bool:
	if is_ko():
		return false
	for id_ in statuses:
		if bool(_statuses_table.get(id_, {}).get("blocksTurn", false)):
			return false
	return true


func has_status(status_id: String) -> bool:
	return statuses.has(status_id)


## Apply a status, respecting immunity and opposites.
##
## A good status cancels its opposite rather than stacking, so Haste does not sit
## alongside Slow quietly cancelling out in the rate calculation.
func add_status(status_id: String, turns := 0) -> bool:
	var def: Dictionary = _statuses_table.get(status_id, {})
	if def.is_empty():
		return false
	if immune.has(status_id):
		return false
	var opposites := {"haste": "slow", "slow": "haste"}
	var opposite := String(opposites.get(status_id, ""))
	if not opposite.is_empty() and statuses.has(opposite):
		statuses.erase(opposite)
	var duration := turns if turns > 0 else int(def.get("duration", 0))
	statuses[status_id] = {"turns": duration}
	if status_id == "ko":
		hp = 0
	return true


func remove_status(status_id: String) -> void:
	statuses.erase(status_id)


func clear_bad_statuses() -> void:
	for status_id in statuses.keys():
		var def: Dictionary = _statuses_table.get(status_id, {})
		if String(def.get("kind", "")) == "bad" and status_id != "ko":
			statuses.erase(status_id)


## A stat by the party's names — the enemy subclass maps them onto the bestiary's.
func stat(_which: String) -> int:
	return 10


func attack_power() -> int:
	return 12


func defence() -> int:
	return 0


func magic_defence() -> int:
	return 0


func evade() -> int:
	return 0


## Element → "weak" / "resist" / "immune" / "absorb", as the bestiary spells it.
func affinity() -> Dictionary:
	return {}
