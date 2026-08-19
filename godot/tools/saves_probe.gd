extends SceneTree
##
## Loads every harvested save file and describes the party each one becomes, as one
## JSON blob for `../../tools/saves-parity.mjs` to hold against the reference's answers.
##
##   godot --headless --path godot --script res://tools/saves_probe.gd
##
## The blobs come from `tools/fixtures/reference-saves.json` — the browser's own store,
## as text. Nothing here consults the answers file: the description is built from the
## live party the port rebuilt, so what is compared is two independent readings of one
## save rather than a save against itself.

const Database := preload("res://scripts/data/database.gd")
const SaveManager := preload("res://scripts/game/saves.gd")

const FIXTURE := "res://../tools/fixtures/reference-saves.json"

const STATS := ["vig", "spd", "sta", "mag", "res", "lck"]


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var fixture_path := ProjectSettings.globalize_path(FIXTURE)
	if not FileAccess.file_exists(fixture_path):
		push_error("no tools/fixtures/reference-saves.json — run `npm run harvest:saves`")
		quit(1)
		return
	var fixture: Variant = JSON.parse_string(
		FileAccess.open(fixture_path, FileAccess.READ).get_as_text())
	if not (fixture is Dictionary):
		push_error("the save fixture is not readable")
		quit(1)
		return

	var parties := {}
	var slots := {}
	var saves: Dictionary = fixture.get("saves", {})
	var names: Array = saves.keys()
	names.sort()
	for name in names:
		var raw := String(saves[name].get("raw", ""))
		var blob: Variant = JSON.parse_string(raw)
		if not (blob is Dictionary):
			push_error("save %s is not readable" % name)
			quit(1)
			return
		var data: Dictionary = blob
		var party := SaveManager.restore_party(data.get("party", {}), db)
		parties[name] = _describe(party)
		# The summary a save/load screen would show, from the same blob. Its own
		# comparison: a slot list that says "Unknown, Lv 1" is a load screen nobody
		# can use even when the load itself is perfect.
		slots[name] = {
			"location": String(data.get("locationName", "")),
			"level": int(data.get("leadLevel", 0)),
			"time": SaveManager.format_time(float(data.get("party", {}).get("playTime", 0.0))),
			"gold": int(data.get("party", {}).get("gold", 0)),
			"names": data.get("partyNames", []),
		}

	# And a round trip through the port's own writer: what it serialises has to be
	# something it can read back, or a save written in Godot is a save that only the
	# JS build can open.
	var rewritten := {}
	for name in names:
		var blob: Dictionary = JSON.parse_string(String(saves[name].get("raw", "")))
		var once := SaveManager.restore_party(blob.get("party", {}), db)
		var text := JSON.stringify(once.serialize())
		var twice := SaveManager.restore_party(JSON.parse_string(text), db)
		rewritten[name] = _describe(twice)

	print(JSON.stringify({"parties": parties, "slots": slots, "rewritten": rewritten}))
	quit()


## The same shape the harvest builds in the page, field for field.
func _describe(party: Party) -> Dictionary:
	var roster: Array = []
	var ids: Array = party.roster.keys()
	ids.sort()
	for id in ids:
		roster.append(_describe_member(party.roster[id]))
	return {
		"gold": party.gold,
		"playTime": party.play_time,
		"steps": party.steps,
		"worldState": party.world_state,
		"airship": "" if party.airship.is_empty() else " ".join(_pairs(party.airship)),
		"active": ",".join(party.active),
		"reserve": ",".join(_sorted(party.reserve)),
		"inventory": _pairs(party.inventory),
		"espers": _sorted(party.espers.keys()),
		"flags": _sorted(party.flags.keys()),
		"quests": _quests(party.quests),
		"bestiary": _pairs(party.bestiary),
		"rows": _pairs(party.rows),
		"openedChests": _sorted(party.opened_chests.keys()),
		"roster": roster,
	}


func _describe_member(member: Party.Member) -> Dictionary:
	var stats: Array = []
	for stat in STATS:
		stats.append(member.stat(stat))
	var worn: Array = []
	for slot in Party.Member.SLOTS:
		var item: Dictionary = member.equipment.get(slot, {})
		worn.append("%s:%s" % [slot, String(item.get("id", "-")) if not item.is_empty() else "-"])
	worn.sort()
	return {
		"id": member.id,
		"level": member.level,
		"exp": member.exp,
		"hp": member.hp,
		"mp": member.mp,
		"maxHP": member.max_hp(),
		"maxMP": member.max_mp(),
		"limit": member.limit,
		"stats": stats,
		"equipment": worn,
		"esper": String(member.esper.get("id", "-")) if not member.esper.is_empty() else "-",
		"spells": _pairs(member.spells),
		"statuses": _sorted(member.statuses.keys()),
		"esperGrowth": _pairs(member.esper_growth),
	}


## `id:value` strings, sorted — the one shape both sides can build without agreeing on
## how a dictionary is ordered.
func _pairs(dict: Dictionary) -> Array:
	var out: Array = []
	for key in dict:
		out.append("%s:%s" % [String(key), _number(dict[key])])
	out.sort()
	return out


func _quests(quests: Dictionary) -> Array:
	var out: Array = []
	for id in quests:
		out.append("%s:%d:%d" % [String(id), int(quests[id].get("stage", 0)),
			1 if bool(quests[id].get("done", false)) else 0])
	out.sort()
	return out


## A number as JavaScript would print it: `40` rather than `40.0`, because both sides
## are building strings and `String(40.0)` differs between the two languages.
func _number(value: Variant) -> String:
	if value is float and value == floor(value) and absf(value) < 1e15:
		return str(int(value))
	return str(value)


func _sorted(values: Array) -> Array:
	var out := values.duplicate()
	out.sort()
	return out
