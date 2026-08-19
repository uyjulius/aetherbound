class_name Saves
extends RefCounted
##
## Save data: three numbered slots, an autosave beside them, and a config blob.
##
## A port of `src/game/saves.js`, and deliberately a port of its *format* rather than
## only of its behaviour. The keys, the shape and the version are the reference's, and
## on the web the store is the same `localStorage` the reference writes to — so a player
## who has been playing the JS build at this address presses Continue and finds their
## party where they left it. A port that started everybody again from the village would
## be a different game wearing the same name.
##
## Saves hold *ids*, never definitions: items, magicite and characters are looked up
## fresh on load, so a content update never corrupts a save that already exists.

const PREFIX := "aetherbound.save."
const CONFIG_KEY := "aetherbound.config"
const SLOTS := 3
## The autosave, kept beside the three manual slots rather than inside one, so it can
## never overwrite a slot the player was curating.
const AUTOSAVE_SLOT := "auto"
const VERSION := 1

## The save a scene has chosen to load, handed to the next scene.
##
## A static rather than an autoload: the title and the field are separate scenes and
## `change_scene_to_file` tears the first one down, so the choice has to live somewhere
## that outlives both. Cleared by whoever consumes it.
static var pending: Dictionary = {}
## True when `pending` is a rollback after a defeat, in which case whoever loads it stands
## the party up — the reference rests them, because arriving from a game over with a member
## still at zero would send the player straight back into the fight that killed them.
static var pending_after_defeat := false

const DEFAULT_CONFIG := {
	"atbMode": "wait", "battleSpeed": 3, "textSpeed": 4,
	"musicVolume": 0.65, "sfxVolume": 0.8, "quality": "high",
	"windowColour": "Sapphire",
}


# ---------------------------------------------------------------------------
# The store
# ---------------------------------------------------------------------------

## True when this build can reach the browser's `localStorage`.
##
## Everything below goes through here rather than assuming: the same code runs in the
## headless probe that checks it, where there is no browser at all.
static func in_browser() -> bool:
	return OS.has_feature("web")


static func _path_for(key: String) -> String:
	return "user://%s.json" % key.replace(".", "_")


static func _read(key: String) -> String:
	if in_browser():
		# `JSON.stringify` of a String is a valid JavaScript string literal, which is the
		# only safe way to put a key into a line of JavaScript.
		var got: Variant = JavaScriptBridge.eval(
			"localStorage.getItem(%s)" % JSON.stringify(key), true)
		return "" if got == null else String(got)
	var file := FileAccess.open(_path_for(key), FileAccess.READ)
	return "" if file == null else file.get_as_text()


static func _write(key: String, text: String) -> bool:
	if in_browser():
		JavaScriptBridge.eval("localStorage.setItem(%s, %s)" % [
			JSON.stringify(key), JSON.stringify(text)], true)
		return true
	var file := FileAccess.open(_path_for(key), FileAccess.WRITE)
	if file == null:
		push_warning("could not write %s" % _path_for(key))
		return false
	file.store_string(text)
	return true


static func _erase(key: String) -> void:
	if in_browser():
		JavaScriptBridge.eval("localStorage.removeItem(%s)" % JSON.stringify(key), true)
		return
	DirAccess.remove_absolute(ProjectSettings.globalize_path(_path_for(key)))


static func _key(slot: Variant) -> String:
	return "%s%s" % [PREFIX, str(slot)]


# ---------------------------------------------------------------------------
# Slots
# ---------------------------------------------------------------------------

## Read a slot. `{}` for an empty or unreadable one, and for a save from a version this
## build does not know — a half-understood save is worse than none.
static func load_slot(slot: Variant) -> Dictionary:
	var raw := _read(_key(slot))
	if raw.is_empty():
		return {}
	var parsed: Variant = JSON.parse_string(raw)
	if not (parsed is Dictionary):
		push_warning("save in slot %s is not readable" % str(slot))
		return {}
	var data: Dictionary = parsed
	if int(data.get("version", 0)) != VERSION:
		push_warning("save in slot %s is version %s, not %d" % [
			str(slot), str(data.get("version", "?")), VERSION])
		return {}
	return data


## A summary for the save and load screens. `{}` for an empty slot.
static func peek(slot: Variant) -> Dictionary:
	var data := load_slot(slot)
	if data.is_empty():
		return {}
	var party: Dictionary = data.get("party", {})
	return {
		"slot": slot,
		"location": String(data.get("locationName", "Unknown")),
		"level": int(data.get("leadLevel", 1)),
		"time": format_time(float(party.get("playTime", 0.0))),
		"gold": int(party.get("gold", 0)),
		"saved": float(data.get("savedAt", 0.0)),
		"names": data.get("partyNames", []),
	}


static func list() -> Array:
	var out: Array = []
	for slot in SLOTS:
		out.append(peek(slot))
	return out


## The most recently written slot, autosave included — which usually wins, since that is
## the whole point of it. `{}` if the player has never saved.
static func latest() -> Dictionary:
	var best: Dictionary = {}
	var slots: Array = range(SLOTS)
	slots.append(AUTOSAVE_SLOT)
	for slot in slots:
		var data := load_slot(slot)
		if data.is_empty():
			continue
		if best.is_empty() or float(data.get("savedAt", 0.0)) > float(best.get("savedAt", 0.0)):
			best = data
	return best


## Write a slot. `where` carries the map and the position, which is the difference
## between reloading in the middle of a dungeon and reloading at its entrance.
static func save(slot: Variant, party: Party, where: Dictionary,
		config: Dictionary = {}) -> bool:
	var lead: Party.Member = party.active_members()[0] if not party.active_members().is_empty() \
		else null
	var names: Array = []
	for member in party.active_members():
		names.append(member.name())
	var data := {
		"version": VERSION,
		# Milliseconds, as `Date.now()` gives them, so a save written here sorts against
		# one written by the JS build.
		"savedAt": int(Time.get_unix_time_from_system() * 1000.0),
		"mapId": String(where.get("map_id", "harrowmere")),
		"spawn": where.get("spawn", null),
		"position": where.get("position", null),
		"locationName": String(where.get("location_name", "the road")),
		"leadLevel": lead.level if lead != null else 1,
		"partyNames": names,
		"party": party.serialize(),
		"rng": RngStreams.serialize(),
		"config": config if not config.is_empty() else DEFAULT_CONFIG.duplicate(),
	}
	var ok := _write(_key(slot), JSON.stringify(data))
	if ok:
		print("SAVED slot=%s map=%s lv=%d gold=%d" % [str(slot),
			String(data["mapId"]), int(data["leadLevel"]), party.gold])
	return ok


static func erase(slot: Variant) -> void:
	_erase(_key(slot))


# ---------------------------------------------------------------------------
# Restoring
# ---------------------------------------------------------------------------

## Rebuild a live party from the `party` block of a save.
##
## The level is recomputed from experience rather than stored, as in the reference — and
## with the reference's real curve. The copy that used to live in its save code was of an
## older one and never moved: every save loaded at level 1 on a third of its health, and
## the round-trip check passed because it compared gold and names. `Growth` owns the
## curve here and nothing else is allowed to know it.
static func restore_party(data: Dictionary, db) -> Party:
	var party := Party.new(db)
	party.gold = int(data.get("gold", 500))
	party.play_time = float(data.get("playTime", 0.0))
	party.steps = int(data.get("steps", 0))
	party.world_state = String(data.get("worldState", "whole"))
	var airship: Variant = data.get("airship", null)
	party.airship = airship if airship is Dictionary else {}

	party.inventory = _pairs_to_int_dict(data.get("inventory", []))
	# Quests come back as `{stage, done}` objects, exactly as the reference writes them.
	party.quests = {}
	var quest_rows := _pairs_to_dict(data.get("quests", []))
	for id in quest_rows:
		var quest: Variant = quest_rows[id]
		if quest is Dictionary:
			party.quests[id] = {
				"stage": int(quest.get("stage", 0)),
				"done": bool(quest.get("done", false)),
			}
		else:
			party.quests[id] = {"stage": int(quest), "done": false}
	party.bestiary = _pairs_to_int_dict(data.get("bestiary", []))
	party.rows = _pairs_to_dict(data.get("row", []))
	party.espers = _list_to_set(data.get("espers", []))
	party.flags = _list_to_set(data.get("flags", []))
	party.opened_chests = _list_to_set(data.get("openedChests", []))

	for row in data.get("roster", []):
		var member := _restore_member(row, db)
		if member == null:
			continue
		party.roster[member.id] = member
		if not party.rows.has(member.id):
			party.rows[member.id] = "front"

	party.active = []
	for id in data.get("active", []):
		if party.roster.has(String(id)):
			party.active.append(String(id))
	if party.active.is_empty():
		party.active = party.roster.keys().slice(0, Party.MAX_ACTIVE)
	party.reserve = []
	for id in party.roster:
		if not party.active.has(id):
			party.reserve.append(id)

	RngStreams.deserialize(data.get("rng", {}))
	return party


static func _restore_member(row: Dictionary, db) -> Party.Member:
	var id := String(row.get("id", ""))
	var character: Dictionary = db.characters.get(id, {})
	if character.is_empty():
		push_warning("save names a character this build does not have: %s" % id)
		return null
	var member := Party.Member.new(character, 1)
	member.exp = int(row.get("exp", 0))
	member.level = maxi(1, Growth.level_for_exp(member.exp))
	member.spells = row.get("spells", {})
	member.statuses = row.get("statuses", {})
	member.limit = float(row.get("limit", 0.0))
	member.esper_growth = row.get("esperGrowth", {})
	var worn: Dictionary = row.get("equipment", {})
	for slot in Party.Member.SLOTS:
		var item_id: Variant = worn.get(slot, null)
		member.equipment[slot] = {} if item_id == null \
			else db.items.get(String(item_id), {})
	var esper_id: Variant = row.get("esper", null)
	member.esper = {} if esper_id == null else db.espers.get(String(esper_id), {})
	# Clamped after the kit is on, and only downwards: a save written with a piece of
	# equipment this build no longer has must not hand back a character standing at more
	# health than they can hold.
	member.hp = mini(int(row.get("hp", member.max_hp())), member.max_hp())
	member.mp = mini(int(row.get("mp", member.max_mp())), member.max_mp())
	return member


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

static func load_config() -> Dictionary:
	var raw := _read(CONFIG_KEY)
	if raw.is_empty():
		return DEFAULT_CONFIG.duplicate()
	var parsed: Variant = JSON.parse_string(raw)
	if not (parsed is Dictionary):
		return DEFAULT_CONFIG.duplicate()
	return DEFAULT_CONFIG.merged(parsed, true)


static func save_config(config: Dictionary) -> void:
	_write(CONFIG_KEY, JSON.stringify(config))


# ---------------------------------------------------------------------------
# Odds and ends
# ---------------------------------------------------------------------------

static func format_time(seconds: float) -> String:
	var hours := int(seconds / 3600.0)
	var minutes := int(fmod(seconds, 3600.0) / 60.0)
	return "%d:%02d" % [hours, minutes]


static func _pairs_to_dict(pairs: Variant) -> Dictionary:
	var out: Dictionary = {}
	if not (pairs is Array):
		return out
	for pair in pairs:
		if pair is Array and pair.size() >= 2:
			out[String(pair[0])] = pair[1]
	return out


static func _pairs_to_int_dict(pairs: Variant) -> Dictionary:
	var out: Dictionary = {}
	var raw := _pairs_to_dict(pairs)
	for id in raw:
		out[id] = int(raw[id])
	return out


static func _list_to_set(ids: Variant) -> Dictionary:
	var out: Dictionary = {}
	if not (ids is Array):
		return out
	for id in ids:
		out[String(id)] = true
	return out
