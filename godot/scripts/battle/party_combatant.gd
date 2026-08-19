class_name PartyCombatant
extends Combatant
##
## A recruited character, in a fight. Every number here is derived from the member
## rather than copied, so equipping something mid-battle would be reflected — and
## HP, MP and the limit gauge are copied in and written back at the end, because
## those are the things a fight is allowed to change permanently.

var member: Party.Member
var limit := 0.0


func _init(from: Party.Member, in_row: String, statuses_table: Dictionary) -> void:
	_statuses_table = statuses_table
	kind = "party"
	member = from
	id = from.id
	name = from.name()
	row = in_row
	hp = from.hp
	max_hp = from.max_hp()
	mp = from.mp
	max_mp = from.max_mp()
	limit = from.limit
	level = from.level
	immune = from.immunities()
	if from.hp <= 0:
		statuses["ko"] = {"turns": 0}


func stat(which: String) -> int:
	return member.stat(which)


func weapon() -> Dictionary:
	return member.weapon()


## Weapon power plus every other slot's attack bonus.
##
## The weapon's own `atk` is the base; the rest of the equipment contributes on
## top, which is why the weapon's contribution is subtracted back out of the sum.
func attack_power() -> int:
	var base := int(weapon().get("stats", {}).get("atk", 12))
	var bonus := 0
	for slot in member.equipment:
		bonus += int(member.equipment[slot].get("stats", {}).get("atk", 0))
	return base + (bonus - int(weapon().get("stats", {}).get("atk", 0)))


func defence() -> int:
	var d := int(floor(float(stat("sta")) * 0.7))
	for slot in member.equipment:
		d += int(member.equipment[slot].get("stats", {}).get("def", 0))
	return d


func magic_defence() -> int:
	var d := int(floor(float(stat("res")) * 0.8))
	for slot in member.equipment:
		d += int(member.equipment[slot].get("stats", {}).get("mdef", 0))
	return d


func evade() -> int:
	var e := int(floor(float(stat("spd")) * 0.22))
	for slot in member.equipment:
		e += int(member.equipment[slot].get("stats", {}).get("eva", 0))
	return e


func affinity() -> Dictionary:
	var out := {}
	for slot in member.equipment:
		for element in member.equipment[slot].get("resist", {}):
			out[element] = member.equipment[slot]["resist"][element]
	return out


func has_effect(effect: String) -> bool:
	return member.has_effect(effect)


## Write what the fight changed back onto the member.
##
## Only ailments flagged `persists` survive; the rest are cleared, which is what
## makes a battle's Silence an inconvenience rather than a trip back to town.
func commit() -> void:
	member.hp = maxi(0, hp)
	member.mp = maxi(0, mp)
	member.limit = limit
	var keep := {}
	for status_id in statuses:
		if bool(_statuses_table.get(status_id, {}).get("persists", false)):
			keep[status_id] = statuses[status_id]
	member.statuses = keep
