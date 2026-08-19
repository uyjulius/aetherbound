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

	## One member, as a save file holds them. Equipment and magicite cross as ids and are
	## looked up fresh on load, so a content update never corrupts an existing save.
	func serialize() -> Dictionary:
		var worn: Dictionary = {}
		for slot in SLOTS:
			var item: Dictionary = equipment.get(slot, {})
			worn[slot] = null if item.is_empty() else String(item.get("id", ""))
		return {
			"id": id, "exp": exp, "hp": hp, "mp": mp, "limit": limit,
			"equipment": worn, "spells": spells.duplicate(),
			"esper": null if esper.is_empty() else String(esper.get("id", "")),
			"statuses": statuses.duplicate(), "esperGrowth": esper_growth.duplicate(),
		}

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
		var learned: bool = float(spells[spell_id]) >= 100.0 and before < 100.0
		# The moment it lands, not every point of proficiency towards it: an esper teaching a
		# spell over eight fights would otherwise send eight events for one thing happening.
		if learned:
			Telemetry.track(Telemetry.SPELL_LEARNED, {
				"member": id, "spell": spell_id, "level": level})
		return learned

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

	## Can this character wear it?
	##
	## A relic fits anybody — that is what makes relics the interesting slot. Everything
	## else is gated on the character's own list of weapon and armour types, which is how
	## a mage ends up unable to hold the greatsword the mercenary just found.
	func is_equippable(item: Dictionary) -> bool:
		if item.is_empty() or not item.has("slot"):
			return false
		if String(item.get("kind", "")) == "relic":
			return true
		var allowed: Array = def.get("equip", [])
		return allowed.has(String(item.get("type", "")))


	## Fit something, or take it off with an empty dictionary.
	##
	## HP and MP are clamped afterwards: equipment moves the ceiling, and taking off the
	## breastplate that was carrying forty points of it should not leave a character
	## standing at more health than they can hold.
	func equip(slot: String, item: Dictionary) -> void:
		equipment[slot] = item
		hp = mini(hp, max_hp())
		mp = mini(mp, max_mp())


	## What a spell costs this caster. A relic can halve it or flatten it to one.
	func spell_cost(spell: Dictionary) -> int:
		var cost := int(spell.get("mp", 0))
		for slot in equipment:
			var effects: Array = equipment[slot].get("effects", [])
			if effects.has("halfMP"):
				cost = int(ceil(float(cost) / 2.0))
			if effects.has("oneMP"):
				cost = 1
		return maxi(0, cost)


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
## Story flags. A set, spelled as a dictionary because GDScript has no set type.
var flags: Dictionary = {}
## Quest id → `{stage, done}`, the reference's own shape.
##
## Two fields rather than a sentinel stage: the reference keeps them apart, a completed
## quest remembers which stage it finished on, and a save written by either build has to
## load in the other.
var quests: Dictionary = {}
## Magicite the party has been given, whether or not anyone is carrying it.
var espers: Dictionary = {}
## Creature id → how many have been fought, for the bestiary.
var bestiary: Dictionary = {}
## Chests already looted, as `mapId:chestId`.
##
## On the party, which is to say in the save file. The reference learned this the hard
## way: it used to be an `opened` flag mutated on the shared map definition, which no
## save ever recorded, so all 383 chests in the game reopened on reload.
var opened_chests: Dictionary = {}
## Seconds played, and ground covered. Both are shown on a save slot.
var play_time := 0.0
var steps := 0
## Where the airship was parked, so it is still there on a reload. `{}` until it is won.
var airship: Dictionary = {}

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
	Telemetry.track(Telemetry.CHARACTER_RECRUITED, {
		"member": character_id, "level": at, "roster": roster.size()})
	if active.size() < MAX_ACTIVE:
		active.append(character_id)
	else:
		reserve.append(character_id)
	return member


## The party a new campaign starts with.
##
## The same three at the same level with the same kit, spells, bag and magicite as the
## reference's New Game — because a diagnostic fighting with an unequipped party is
## measuring a different game. Kept here rather than in a screen so every entry point
## starts the same way.
func new_campaign() -> void:
	var vesna := recruit("vesna", 6)
	_equip(vesna, ["ironsword", "travelvest", "leathercap"])
	for spell in ["ember", "rime", "spark", "mend", "dimming"]:
		vesna.learn_spell(spell)

	var corvin := recruit("corvin", 6)
	_equip(corvin, ["boltdirk", "travelvest", "leathercap", "woodshield"])

	var wick := recruit("wick", 6)
	_equip(wick, ["ashrod", "silkrobe", "leathercap"])
	for spell in ["mend", "cleanse", "renewal", "wardflesh", "scan"]:
		wick.learn_spell(spell)

	add_item("potion", 5)
	add_item("antidote", 2)
	add_item("tonic", 2)
	# One esper from the outset, so the progression system is legible before anybody
	# explains it.
	add_esper("emberwake")
	vesna.esper = _db.espers.get("emberwake", {})
	vesna.full_restore()


## Put a kit on, then top the member up: equipment moves the ceiling, and a member who
## walks in at the health they had before it was fitted is quietly wounded.
func _equip(member: Member, ids: Array) -> void:
	for id in ids:
		var item: Dictionary = _db.items.get(String(id), {})
		if item.is_empty():
			continue
		member.equipment[String(item.get("slot", "weapon"))] = item
	member.full_restore()


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


func set_row(character_id: String, row: String) -> void:
	rows[character_id] = row


## Set who fights. Everyone else is the bench, which still earns half.
func set_active(ids: Array) -> void:
	active = ids.slice(0, MAX_ACTIVE)
	reserve = []
	for id in roster:
		if not active.has(id):
			reserve.append(id)


## Who is carrying a piece of magicite, other than `except`. An esper can only be in one
## place, and saying whose pocket it is in beats greying out a row for no stated reason.
func esper_holder(esper_id: String, except_id := "") -> String:
	for id in roster:
		if id == except_id:
			continue
		var member_: Member = roster[id]
		if String(member_.esper.get("id", "")) == esper_id:
			return member_.name()
	return ""


# --- flags, quests and magicite ---------------------------------------------

func has_flag(id: String) -> bool:
	return bool(flags.get(id, false))


func set_flag(id: String) -> void:
	# Only the first time: a flag set twice is the same fact, and the reference counts facts.
	if not flags.has(id):
		Telemetry.track(Telemetry.STORY_FLAG_SET, {"flag": id, "play_seconds": play_time})
	flags[id] = true


## Open a quest at a stage.
##
## Unconditional, as in the reference. Every scene that offers a quest a second time
## guards the call with `quest_stage(id) < 0` itself, so nothing in the game restarts an
## open quest — and a port that guarded here as well would be answering a question the
## content has already answered, differently.
func start_quest(id: String, stage := 0) -> void:
	quests[id] = {"stage": stage, "done": false}
	Telemetry.track(Telemetry.QUEST_STARTED, {"quest": id, "stage": stage})


## Move a quest on. Nothing happens to a quest that was never started, which is the
## reference's rule: a stage without a quest is a typo in a scene, not a new quest.
func advance_quest(id: String, stage: int) -> void:
	if not quests.has(id):
		return
	var quest: Dictionary = quests[id]
	if int(quest.get("stage", 0)) == stage:
		return
	quest["stage"] = stage
	Telemetry.track(Telemetry.QUEST_ADVANCED, {"quest": id, "stage": stage})


## Finish a quest. The stage it finished on is kept — a journal that forgets where a
## quest ended cannot describe how it ended.
func complete_quest(id: String) -> void:
	var quest: Dictionary = quests.get(id, {"stage": 0, "done": false})
	quest["done"] = true
	quests[id] = quest
	Telemetry.track(Telemetry.QUEST_COMPLETED, {
		"quest": id, "stage": int(quest.get("stage", 0)), "play_seconds": play_time})


## The stage a quest is on, or -1 if it has never been started — which is what the
## scenes compare against, and why this is not simply zero.
func quest_stage(id: String) -> int:
	if not quests.has(id):
		return -1
	return int(quests[id].get("stage", 0))


func quest_done(id: String) -> bool:
	return quests.has(id) and bool(quests[id].get("done", false))


func has_esper(id: String) -> bool:
	return bool(espers.get(id, false))


func add_esper(id: String) -> void:
	if not espers.has(id):
		Telemetry.track(Telemetry.ESPER_ACQUIRED, {"esper": id, "espers": espers.size() + 1})
	espers[id] = true


func remove_esper(id: String) -> void:
	espers.erase(id)


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


## A night's sleep. Everybody, not just the active three — the reference rests the whole
## Relic effects the field asks about.
##
## Both are advertised on items in the shops — "no random encounters" and "move faster in the
## field" — and both did nothing in the port: `Field.update` takes a `sprinting` flag that
## nothing passed, and its encounter accumulator never asked about a ward at all. The reference
## had the same bug with the Sprinter and says so in a comment above the line that fixed it.
func has_encounter_ward() -> bool:
	return _active_has("noEncounter")


func has_fast_field() -> bool:
	return _active_has("fastField")


## Whoever is *out* — the bench's relics do nothing, on either side of the port.
func _active_has(effect: String) -> bool:
	for id in active:
		if roster.has(id) and roster[id].has_effect(effect):
			return true
	return false


## roster, and a bench member who woke up on 1 HP would be a nasty surprise in the fight
## after the next formation change.
func rest_all() -> void:
	for id in roster:
		roster[id].full_restore()


static func chest_key(map_id: String, chest_id: String) -> String:
	return "%s:%s" % [map_id, chest_id]


func chest_opened(map_id: String, chest_id: String) -> bool:
	return opened_chests.has(chest_key(map_id, chest_id))


func open_chest(map_id: String, chest_id: String) -> void:
	opened_chests[chest_key(map_id, chest_id)] = true


func note_kill(enemy_id: String) -> void:
	bestiary[enemy_id] = int(bestiary.get(enemy_id, 0)) + 1


# --- saving -----------------------------------------------------------------

## The party as a save file holds it: ids, counts and numbers, no object references.
##
## The shape is the reference's exactly — pairs for its `Map`s, plain arrays for its
## `Set`s — because a save written by either build has to load in the other. A player
## whose browser holds a save from the JS game should press Continue and find their party
## where they left it, not a fresh one.
func serialize() -> Dictionary:
	var members: Array = []
	for id in roster:
		members.append(roster[id].serialize())
	var bag: Array = []
	for id in inventory:
		bag.append([id, int(inventory[id])])
	var quest_pairs: Array = []
	for id in quests:
		quest_pairs.append([id, quests[id]])

	var seen: Array = []
	for id in bestiary:
		seen.append([id, int(bestiary[id])])
	var row_pairs: Array = []
	for id in rows:
		row_pairs.append([id, String(rows[id])])
	return {
		"roster": members,
		"active": active.duplicate(),
		"gold": gold,
		"inventory": bag,
		"espers": espers.keys(),
		"flags": flags.keys(),
		"quests": quest_pairs,
		"bestiary": seen,
		"row": row_pairs,
		"openedChests": opened_chests.keys(),
		"playTime": play_time,
		"steps": steps,
		"worldState": world_state,
		"airship": null if airship.is_empty() else airship,
	}


func add_gold(amount: int) -> void:
	gold = clampi(gold + amount, 0, MAX_GOLD)


func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	return true
