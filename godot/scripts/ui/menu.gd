class_name Menu
extends ListScreen
##
## The field menu: items, magic, equipment, status, magicite and the formation.
##
## A port of `src/ui/menu.js`, and like the dialogue box it is a reimplementation rather
## than a translation — the reference draws with HTML and CSS. What crosses is the shape
## of the thing, which `ListScreen` holds: a stack of screens, a list on the left, and a
## panel on the right that explains whatever the cursor is on. Comparison is the entire
## point of an equip screen, so the panel shows what a piece of equipment would *change*,
## with the deltas signed.
##
## Screens that are genuinely elsewhere say so rather than pretending: the bestiary, the
## journal, the config and saving are their own pieces, and a menu entry that opens an
## empty screen is worse than one that admits what it is.

const SLOT_ORDER := ["weapon", "offhand", "head", "body", "relic1", "relic2"]
const SLOT_LABEL := {
	"weapon": "Weapon", "offhand": "Off-hand", "head": "Head", "body": "Body",
	"relic1": "Relic", "relic2": "Relic",
}
const STATS := ["vig", "spd", "sta", "mag", "res", "lck"]


func _tag() -> String:
	return "MENU"


## Open on the root screen.
func open(for_party: Party, db) -> void:
	_begin(for_party, db)


# ---------------------------------------------------------------------------
# Screens
# ---------------------------------------------------------------------------

func _root() -> Dictionary:
	var rows: Array = [
		{"label": "Items", "go": "items"},
		{"label": "Magic", "go": "pick_magic"},
		{"label": "Equip", "go": "pick_equip"},
		{"label": "Status", "go": "pick_status"},
		{"label": "Espers", "go": "pick_espers"},
		{"label": "Formation", "go": "formation"},
		# Named, and honest about it. A menu entry that opens an empty screen is worse
		# than one that says where the work is.
		{"label": "Bestiary", "right": "not built", "disabled": true},
		{"label": "Quests", "right": "not built", "disabled": true},
		{"label": "Config", "right": "not built", "disabled": true},
		{"label": "Save", "right": "not built", "disabled": true},
	]
	return {
		"title": "Menu", "rows": rows,
		"on_select": func(row): _open_named(String(row.get("go", ""))),
		"detail": func(_row): return _party_overview(),
	}


func _open_named(name: String) -> void:
	match name:
		"items": _push(_items())
		"pick_magic": _push(_character_pick("Magic", func(m): _push(_magic(m))))
		"pick_equip": _push(_character_pick("Equip", func(m): _push(_equip(m))))
		"pick_status": _push(_character_pick("Status", func(m): _push(_status(m))))
		"pick_espers": _push(_character_pick("Espers", func(m): _push(_espers(m))))
		"formation": _push(_formation())


func _character_pick(title: String, then: Callable) -> Dictionary:
	var rows: Array = []
	for m in party.active_members():
		rows.append({"label": m.name(), "right": "%d/%d HP" % [m.hp, m.max_hp()], "member": m})
	return {
		"title": title, "rows": rows,
		"on_select": func(row): then.call(row["member"]),
		"detail": func(row): return _member_card(row["member"]),
	}


func _items() -> Dictionary:
	var build := func() -> Array:
		var rows: Array = []
		var ids: Array = party.inventory.keys()
		ids.sort()
		for id in ids:
			var item: Dictionary = database.items.get(String(id), {})
			if item.is_empty():
				continue
			rows.append({"label": String(item.get("name", id)),
				"right": "x%d" % party.count_item(String(id)), "item": item})
		if rows.is_empty():
			rows.append({"label": "(empty)", "disabled": true})
		return rows
	var on_select := func(row):
		if row.has("item"):
			_push(_use_item(row["item"]))
	return {
		"title": "Items", "rows": build.call(), "rebuild": build,
		"on_select": on_select,
		"detail": func(row): return _item_card(row.get("item", {})),
	}


## Using something on somebody. The effects are the reference's, in its order, because a
## Hi-Potion that also cures poison should do both and in the same order it always has.
func _use_item(item: Dictionary) -> Dictionary:
	var rows: Array = []
	for m in party.active_members():
		rows.append({"label": m.name(), "right": "%d/%d" % [m.hp, m.max_hp()], "member": m})
	var on_select := func(row):
		if _apply_item(item, row["member"]):
			party.remove_item(String(item.get("id", "")), 1)
			print("ITEM_USED %s on %s" % [String(item.get("id", "")), row["member"].id])
			_pop()
	return {
		"title": "Use %s" % String(item.get("name", "?")), "rows": rows,
		"on_select": on_select,
		"detail": func(row): return _member_card(row["member"]),
	}


func _apply_item(item: Dictionary, member: Party.Member) -> bool:
	if String(item.get("kind", "")) != "consumable":
		return false
	var effect: Dictionary = item.get("effect", {})
	var did := false
	if effect.has("heal") and not member.is_ko():
		did = member.heal(int(effect["heal"])) > 0
	if effect.has("mp"):
		did = member.restore_mp(int(effect["mp"])) > 0 or did
	if bool(effect.get("fullHeal", false)) and not member.is_ko():
		member.hp = member.max_hp()
		did = true
	if bool(effect.get("fullMP", false)):
		member.mp = member.max_mp()
		did = true
	for status_id in effect.get("cure", []):
		if member.statuses.has(String(status_id)):
			member.statuses.erase(String(status_id))
			did = true
	if bool(effect.get("cureAll", false)):
		member.statuses = {}
		did = true
	if effect.has("revive") and member.is_ko():
		member.hp = int(floor(float(member.max_hp()) * float(effect["revive"])))
		did = true
	return did


## The spell list. Reading only, as in the reference — casting in the field is a piece of
## its own and pretending otherwise would spend the MP for nothing.
func _magic(member: Party.Member) -> Dictionary:
	var rows: Array = []
	var ids: Array = member.spells.keys()
	ids.sort()
	for id in ids:
		var spell: Dictionary = database.spells.get(String(id), {})
		if spell.is_empty():
			continue
		var proficiency := float(member.spells[id])
		rows.append({
			"label": String(spell.get("name", id)),
			"right": ("%d MP" % member.spell_cost(spell)) if proficiency >= 100.0
				else "%d%%" % int(floor(proficiency)),
			"disabled": proficiency < 100.0,
			"spell": spell, "proficiency": proficiency,
		})
	if rows.is_empty():
		rows.append({"label": "(no magic learned)", "disabled": true})
	return {
		"title": "%s — Magic" % member.name(), "rows": rows,
		"footer": "reading only · field casting is not built",
		"detail": func(row): return _spell_card(row, member),
	}


func _equip(member: Party.Member) -> Dictionary:
	var build := func() -> Array:
		var rows: Array = []
		for slot in SLOT_ORDER:
			var worn: Dictionary = member.equipment.get(slot, {})
			rows.append({"label": String(SLOT_LABEL[slot]),
				"right": String(worn.get("name", "-")), "slot": slot})
		return rows
	return {
		"title": "%s — Equip" % member.name(), "rows": build.call(), "rebuild": build,
		"on_select": func(row): _push(_equip_choice(member, String(row["slot"]))),
		"detail": func(_row): return _stat_block(member, {}, ""),
	}


func _equip_choice(member: Party.Member, slot: String) -> Dictionary:
	var build := func() -> Array:
		var rows: Array = [{"label": "(remove)", "item": {}}]
		var ids: Array = party.inventory.keys()
		ids.sort()
		for id in ids:
			var item: Dictionary = database.items.get(String(id), {})
			if item.is_empty() or String(item.get("slot", "")) != slot:
				continue
			if not member.is_equippable(item):
				continue
			rows.append({"label": String(item.get("name", id)),
				"right": "x%d" % party.count_item(String(id)), "item": item})
		return rows
	var on_select := func(row):
		var chosen: Dictionary = row.get("item", {})
		var worn: Dictionary = member.equipment.get(slot, {})
		# What comes off goes back in the bag, and what goes on comes out of it. An
		# equip screen that quietly consumed the old piece would be a shop.
		if not worn.is_empty():
			party.add_item(String(worn.get("id", "")), 1)
		if not chosen.is_empty():
			party.remove_item(String(chosen.get("id", "")), 1)
		member.equip(slot, chosen)
		print("EQUIPPED %s %s=%s" % [member.id, slot, String(chosen.get("id", "-"))])
		_pop()
	return {
		"title": String(SLOT_LABEL.get(slot, slot)), "rows": build.call(), "rebuild": build,
		"on_select": on_select,
		"detail": func(row): return _stat_block(member, row.get("item", {}), slot),
	}


func _status(member: Party.Member) -> Dictionary:
	var rows: Array = [
		{"label": "Level", "right": str(member.level)},
		{"label": "Experience", "right": str(member.exp)},
		{"label": "To next level", "right": str(member.exp_to_next())},
		{"label": "HP", "right": "%d / %d" % [member.hp, member.max_hp()]},
		{"label": "MP", "right": "%d / %d" % [member.mp, member.max_mp()]},
		{"label": "Limit", "right": "%d%%" % int(member.limit)},
		{"label": "Row", "right": party.row_of(member.id).capitalize()},
	]
	for stat in STATS:
		rows.append({"label": stat.to_upper(), "right": str(member.stat(stat))})
	return {
		"title": "%s — Status" % member.name(), "rows": rows,
		"detail": func(_row): return _member_card(member),
	}


func _espers(member: Party.Member) -> Dictionary:
	var build := func() -> Array:
		var rows: Array = [{"label": "(none)", "esper": {}}]
		var ids: Array = party.espers.keys()
		ids.sort()
		for id in ids:
			var esper: Dictionary = database.espers.get(String(id), {})
			if esper.is_empty():
				continue
			var holder := party.esper_holder(String(id), member.id)
			var carried := String(member.esper.get("id", "")) == String(id)
			rows.append({
				"label": "%s %s" % ["*" if carried else " ", String(esper.get("name", id))],
				"right": ("- %s" % holder) if not holder.is_empty()
					else ("equipped" if carried else ""),
				"disabled": not holder.is_empty(),
				"esper": esper,
			})
		if rows.size() == 1:
			rows.append({"label": "(no espers found)", "disabled": true})
		return rows
	var on_select := func(row):
		member.esper = row.get("esper", {})
		print("ESPER_EQUIPPED %s=%s" % [member.id, String(member.esper.get("id", "-"))])
	return {
		"title": "%s — Esper" % member.name(), "rows": build.call(), "rebuild": build,
		"on_select": on_select,
		"detail": func(row): return _esper_card(row.get("esper", {}), member),
	}


func _formation() -> Dictionary:
	var build := func() -> Array:
		var rows: Array = []
		for id in party.roster:
			var m: Party.Member = party.roster[id]
			var active := party.active.has(id)
			rows.append({
				"label": "%s %s" % ["o" if active else ".", m.name()],
				"right": "%s  Lv %d" % [party.row_of(id).capitalize(), m.level],
				"id": id, "member": m,
			})
		return rows
	var on_select := func(row):
		var id := String(row["id"])
		if party.active.has(id):
			# Never empty the party. One member is a party; none is a crash three frames
			# into the next fight.
			if party.active.size() > 1:
				var kept: Array = party.active.duplicate()
				kept.erase(id)
				party.set_active(kept)
		elif party.active.size() < Party.MAX_ACTIVE:
			party.set_active(party.active + [id])
	var on_special := func(row):
		var id := String(row["id"])
		party.set_row(id, "front" if party.row_of(id) == "back" else "back")
	var note := "\n\nThe back row halves physical damage dealt and taken.\nA weapon that reaches ignores the penalty."
	return {
		"title": "Formation", "rows": build.call(), "rebuild": build,
		"footer": "confirm in or out · special flips the row",
		"on_select": on_select,
		"on_special": on_special,
		"detail": func(_row): return _party_overview() + note,
	}


# ---------------------------------------------------------------------------
# Panels
# ---------------------------------------------------------------------------

func _party_overview() -> String:
	var lines: Array = []
	for m in party.active_members():
		lines.append("%-10s Lv %-3d %5d/%-5d HP  %4d/%-4d MP  %s" % [
			m.name(), m.level, m.hp, m.max_hp(), m.mp, m.max_mp(),
			party.row_of(m.id)])
	lines.append("")
	lines.append("%d in the roster, %d fighting" % [party.roster.size(), party.active.size()])
	return "\n".join(lines)


func _member_card(member: Party.Member) -> String:
	var worn: Array = []
	for slot in SLOT_ORDER:
		var item: Dictionary = member.equipment.get(slot, {})
		if not item.is_empty():
			worn.append("%s: %s" % [String(SLOT_LABEL[slot]), String(item.get("name", "?"))])
	return "%s — %s\nLevel %d   %d/%d HP   %d/%d MP\n\n%s\n\n%s" % [
		member.name(), String(member.def.get("title", "")), member.level,
		member.hp, member.max_hp(), member.mp, member.max_mp(),
		"\n".join(worn) if not worn.is_empty() else "(nothing equipped)",
		String(member.def.get("role", ""))]


func _item_card(item: Dictionary) -> String:
	if item.is_empty():
		return ""
	var lines: Array = [String(item.get("name", "?")), String(item.get("desc", ""))]
	var stats: Dictionary = item.get("stats", {})
	if not stats.is_empty():
		var parts: Array = []
		for key in stats:
			parts.append("%s %s%d" % [String(key).to_upper(),
				"+" if int(stats[key]) > 0 else "", int(stats[key])])
		lines.append(" ".join(parts))
	if item.has("sell"):
		lines.append("Sells for %d gil" % int(item["sell"]))
	return "\n".join(lines)


func _spell_card(row: Dictionary, member: Party.Member) -> String:
	var spell: Dictionary = row.get("spell", {})
	if spell.is_empty():
		return ""
	var lines: Array = [
		String(spell.get("name", "?")),
		"%s magic - %s" % [String(spell.get("school", "?")), String(spell.get("target", "?"))],
	]
	if spell.has("power"):
		lines.append("Power %d" % int(spell["power"]))
	if spell.has("element"):
		lines.append("Element: %s" % String(spell["element"]))
	lines.append("Cost %d MP" % member.spell_cost(spell))
	if float(row.get("proficiency", 100.0)) < 100.0:
		lines.append("Learning: %d%%" % int(floor(float(row["proficiency"]))))
	return "\n".join(lines)


func _esper_card(esper: Dictionary, member: Party.Member) -> String:
	if esper.is_empty():
		return "No magicite carried.\n\nMagicite teaches spells as it is carried, and banks\na permanent stat gain on every level gained with it."
	var lines: Array = [String(esper.get("name", "?")), String(esper.get("desc", ""))]
	var growth: Dictionary = esper.get("growth", {})
	if not growth.is_empty():
		var parts: Array = []
		for key in growth:
			parts.append("%s +%d" % [String(key).to_upper(), int(growth[key])])
		lines.append("On level-up: %s" % " ".join(parts))
	var teaches: Dictionary = esper.get("teaches", {})
	if not teaches.is_empty():
		var parts: Array = []
		for spell_id in teaches:
			var spell: Dictionary = database.spells.get(String(spell_id), {})
			parts.append("%s x%s" % [String(spell.get("name", spell_id)), str(teaches[spell_id])])
		lines.append("Teaches: %s" % ", ".join(parts))
	if esper.has("summon"):
		lines.append("Summon costs %d MP" % int(esper.get("mp", 0)))
	lines.append("")
	lines.append("Carried by %s" % member.name() if String(member.esper.get("id", ""))
		== String(esper.get("id", "")) else "Not carried")
	return "\n".join(lines)


## The stat block, and what a candidate piece would change.
##
## Comparison is the entire point of an equip screen: a number on its own says nothing
## about whether the sword in the bag is better than the one in hand.
func _stat_block(member: Party.Member, candidate: Dictionary, slot: String) -> String:
	var before := {"hp": member.max_hp(), "mp": member.max_mp()}
	for stat in STATS:
		before[stat] = member.stat(stat)

	var after := {}
	if not slot.is_empty():
		# Measured by fitting it, reading, and putting things back — the only way to get
		# the real number, because a stat is a growth curve plus every other slot.
		var worn: Dictionary = member.equipment.get(slot, {})
		member.equipment[slot] = candidate
		after = {"hp": member.max_hp(), "mp": member.max_mp()}
		for stat in STATS:
			after[stat] = member.stat(stat)
		member.equipment[slot] = worn

	var lines: Array = ["%s — Level %d" % [member.name(), member.level], ""]
	for key in ["hp", "mp"] + STATS:
		var line := "%-4s %6d" % [String(key).to_upper(), int(before[key])]
		if not after.is_empty():
			var delta := int(after[key]) - int(before[key])
			if delta != 0:
				line += "   %s%d" % ["+" if delta > 0 else "", delta]
		lines.append(line)
	return "\n".join(lines)
