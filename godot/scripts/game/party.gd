class_name Party
extends RefCounted
##
## The roster, the active four, the purse and the bag.
##
## A port of `src/game/party.js` — the part battle needs. A `Member` is a
## recruited character's live state: level, experience, current HP and MP,
## equipment, learned spells, the magicite it carries and the growth that magicite
## has banked. Everything a combatant brings into a fight comes from here, which is
## why `tools/growth-parity.mjs` checks the curves underneath it across all
## fourteen characters and ninety-nine levels before any of this runs.

const MAX_ACTIVE := 4
const MAX_ITEM_STACK := 99
const MAX_GOLD := 9999999


class Member:
	extends RefCounted

	## Where equipment goes. Declared here rather than on `Party`, because an inner
	## class reaching for its outer class by global name is a cyclic resolution and
	## GDScript's loader answers that by hanging with no message at all.
	const SLOTS := ["weapon", "offhand", "head", "body", "relic1", "relic2"]

	var id := ""
	## The row from `characters.json`.
	var def: Dictionary = {}
	var level := 1
	var exp := 0
	## Slot → the row from `items.json`, or `{}` for an empty slot.
	var equipment: Dictionary = {}
	## Spell id → proficiency 0..100. Known at 100.
	var spells: Dictionary = {}
	## The equipped magicite, as a row from `espers.json`.
	var esper: Dictionary = {}
	## Permanent stat gains banked from levelling with magicite equipped.
	##
	## Every esper declares a `growth` and the Espers screen has always printed it
	## — "On level-up: MAG +2" — and until the reference grew this accumulator
	## nothing read it, so which magicite you carried while levelling meant
	## nothing and two playthroughs produced identical characters.
	var esper_growth: Dictionary = {}
	## Statuses that survive a battle.
	var statuses: Dictionary = {}
	var hp := 0
	var mp := 0
	## The desperation gauge, 0..100.
	var limit := 0.0
	var commands: Array = []

	func _init(character: Dictionary, start_level := 1) -> void:
		def = character
		id = String(character.get("id", ""))
		level = maxi(1, start_level)
		exp = Growth.exp_for_level(level)
		for slot in SLOTS:
			equipment[slot] = {}
		commands = ["attack", String(character.get("command", "attack")), "magic", "item"]
		hp = max_hp()
		mp = max_mp()

	func name() -> String:
		return String(def.get("name", id))

	## The stat before equipment, including anything magicite has banked.
	func base_stat(stat: String) -> int:
		return Growth.stat_at(def, stat, level) + int(esper_growth.get(stat, 0))

	## The stat as it goes into a fight.
	func stat(stat: String) -> int:
		var value := float(base_stat(stat))
		for slot in equipment:
			var item: Dictionary = equipment[slot]
			value += float(item.get("stats", {}).get(stat, 0))
		value += float(esper.get("bonus", {}).get(stat, 0))
		return maxi(1, int(round(value)))

	func max_hp() -> int:
		return maxi(1, _pool("hp"))

	func max_mp() -> int:
		return maxi(0, _pool("mp"))

	func _pool(stat: String) -> int:
		var value := float(base_stat(stat))
		for slot in equipment:
			value += float(equipment[slot].get("stats", {}).get(stat, 0))
		value += float(esper.get("bonus", {}).get(stat, 0))
		return int(round(value))

	func is_ko() -> bool:
		return hp <= 0

	func heal(amount: int) -> int:
		var before := hp
		hp = mini(max_hp(), hp + amount)
		return hp - before

	func restore_mp(amount: int) -> int:
		var before := mp
		mp = mini(max_mp(), mp + amount)
		return mp - before

	func full_restore() -> void:
		hp = max_hp()
		mp = max_mp()
		statuses = {}

	## Award experience, and return the number of levels gained.
	##
	## A level-up tops up the *gained* HP and MP rather than healing fully, which
	## would make levelling a free rest.
	func gain_exp(amount: int) -> int:
		if is_ko():
			return 0
		var before := level
		exp += amount
		level = Growth.level_for_exp(exp)
		var gained := level - before
		if gained <= 0:
			return 0
		for stat in esper.get("growth", {}):
			var per_level := float(esper["growth"][stat])
			esper_growth[stat] = float(esper_growth.get(stat, 0)) + per_level * float(gained)
		hp = mini(max_hp(), hp + Growth.stat_at(def, "hp", level) - Growth.stat_at(def, "hp", before))
		mp = mini(max_mp(), mp + Growth.stat_at(def, "mp", level) - Growth.stat_at(def, "mp", before))
		return gained

	func exp_to_next() -> int:
		return maxi(0, Growth.exp_for_level(level + 1) - exp)

	func knows_spell(spell_id: String) -> bool:
		return float(spells.get(spell_id, 0)) >= 100.0

	func learn_spell(spell_id: String, amount := 100.0) -> bool:
		var before := float(spells.get(spell_id, 0))
		spells[spell_id] = minf(100.0, before + amount)
		return float(spells[spell_id]) >= 100.0 and before < 100.0

	## Every effect string on everything equipped. Relics are sold on these, and
	## the reference had several that nothing read.
	func effects() -> Array:
		var out: Array = []
		for slot in equipment:
			for effect in equipment[slot].get("effects", []):
				out.append(String(effect))
		return out

	func has_effect(effect: String) -> bool:
		return effects().has(effect)

	func weapon() -> Dictionary:
		return equipment.get("weapon", {})

	## Immunities from the character and everything worn.
	func immunities() -> Array:
		var out: Array = []
		for value in def.get("immune", []):
			out.append(String(value))
		for slot in equipment:
			for value in equipment[slot].get("immune", []):
				out.append(String(value))
		return out


## Character id → Member.
var roster: Dictionary = {}
## Up to four ids, in formation order.
var active: Array = []
var reserve: Array = []
var gold := 500
## Item id → count.
var inventory: Dictionary = {}
## Character id → "front" or "back".
var rows: Dictionary = {}
var world_state := "whole"

var _db


func _init(database) -> void:
	_db = database


## Recruit a character, near the party's current power rather than at level 1 —
## otherwise every late arrival is unusable dead weight.
func recruit(character_id: String, level := -1) -> Member:
	if roster.has(character_id):
		return roster[character_id]
	var character: Dictionary = _db.characters.get(character_id, {})
	if character.is_empty():
		push_error("unknown character: %s" % character_id)
		return null
	var at := level if level > 0 else maxi(1, int(round(average_level())))
	var member := Member.new(character, at)
	roster[character_id] = member
	rows[character_id] = "front"
	if active.size() < MAX_ACTIVE:
		active.append(character_id)
	else:
		reserve.append(character_id)
	return member


func average_level() -> float:
	if roster.is_empty():
		return 1.0
	var total := 0
	for id in roster:
		total += roster[id].level
	return float(total) / float(roster.size())


func member(character_id: String) -> Member:
	return roster.get(character_id, null)


func active_members() -> Array:
	var out: Array = []
	for id in active:
		if roster.has(id):
			out.append(roster[id])
	return out


func is_wiped() -> bool:
	for m in active_members():
		if not m.is_ko():
			return false
	return not active_members().is_empty()


func row_of(character_id: String) -> String:
	return String(rows.get(character_id, "front"))


# --- inventory --------------------------------------------------------------

func add_item(item_id: String, count := 1) -> int:
	inventory[item_id] = mini(MAX_ITEM_STACK, int(inventory.get(item_id, 0)) + count)
	return inventory[item_id]


func remove_item(item_id: String, count := 1) -> bool:
	var have := int(inventory.get(item_id, 0))
	if have < count:
		return false
	if have == count:
		inventory.erase(item_id)
	else:
		inventory[item_id] = have - count
	return true


func count_item(item_id: String) -> int:
	return int(inventory.get(item_id, 0))


func add_gold(amount: int) -> void:
	gold = clampi(gold + amount, 0, MAX_GOLD)


func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	return true
