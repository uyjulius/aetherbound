class_name Database
extends RefCounted
##
## The game's data tables, exported from the reference build.
##
## Everything here comes from `../../data/*.json`, written by
## `tools/to-godot.mjs` out of the same modules the web build runs on. It is not
## re-authored and must not be hand-edited: the numbers carry the balance work
## the audits measured, and a value tweaked here would disagree with
## `tools/balance.mjs` while still looking perfectly reasonable in a diff.
##
## Loaded eagerly at startup — a megabyte of JSON parses in a few milliseconds,
## and the alternative is a lazy path that fails halfway through a battle
## because the bestiary was never read.

const DATA_DIR := "res://data"

## Every table the exporter writes, and the list the manifest is checked against.
## Kept here rather than in each reader so adding a table is one edit — the
## readiness line the title screen prints counts this, and a table that stops
## being loaded stops being counted.
const TABLES := [
	"enemies", "encounters", "items", "shops", "spells", "espers", "quests",
	"tracks", "characters", "maps", "cast_order", "palette", "input", "legend",
	"footprints", "statuses", "commands", "boss_events",
]

var enemies: Dictionary = {}
var encounters: Dictionary = {}
var items: Dictionary = {}
var shops: Dictionary = {}
var spells: Dictionary = {}
var espers: Dictionary = {}
var quests: Dictionary = {}
var tracks: Dictionary = {}
var characters: Dictionary = {}
var maps: Dictionary = {}
var cast_order: Array = []
## Ramps, UI and element colours. Read by `scripts/engine/palette.gd`.
var palette: Dictionary = {}
## Terrain legend: glyph walkability, wall exposure, glyph-prop radii.
var legend: Dictionary = {}
## Status effects and their per-turn tick rates.
var statuses: Dictionary = {}
## The fourteen per-character commands and the options each offers.
var commands: Dictionary = {}
## The optional bosses, as specs the one factory in `events/bosses.gd` runs.
var boss_events: Dictionary = {}
## Authored prop colliders, harvested from the reference because they are measured
## from built geometry and cannot be derived. See `tools/harvest-reference.mjs`.
var footprints: Dictionary = {}
## Action names and their keyboard and gamepad bindings. Read by
## `scripts/engine/actions.gd`, which builds Godot's InputMap from it.
var input: Dictionary = {}

var _loaded := false


## Read every table, and fail loudly if the manifest and reality disagree.
##
## The manifest exists because a missing or truncated table is otherwise
## invisible: the game boots, the field loads, and the first random encounter
## rolls against an empty bestiary. Counting rows against what the exporter said
## it wrote turns that into a startup error.
func load_all() -> bool:
	if _loaded:
		return true

	var manifest: Dictionary = _read("manifest")
	if manifest.is_empty():
		push_error("data/manifest.json missing — run `node tools/to-godot.mjs`")
		return false

	enemies = _read("enemies")
	encounters = _read("encounters")
	items = _read("items")
	shops = _read("shops")
	spells = _read("spells")
	espers = _read("espers")
	quests = _read("quests")
	tracks = _read("tracks")
	characters = _read("characters")
	maps = _read("maps")
	var order_raw: Variant = _read_variant("cast_order")
	cast_order = order_raw if order_raw is Array else []
	palette = _read("palette")
	input = _read("input")
	legend = _read("legend")
	footprints = _read("footprints")
	statuses = _read("statuses")
	commands = _read("commands")
	boss_events = _read("boss_events")

	var actual := {}
	for name in TABLES:
		var table: Variant = get(name)
		actual[name] = table.size() if table != null else 0
	var wrong: Array = []
	for key in manifest:
		if not actual.has(key):
			wrong.append("%s: not loaded at all" % key)
		elif int(manifest[key]) != int(actual[key]):
			wrong.append("%s: manifest says %d, loaded %d" % [key, int(manifest[key]), int(actual[key])])
	if not wrong.is_empty():
		push_error("data tables do not match the manifest — " + "; ".join(wrong))
		return false

	_loaded = true
	return true


func _read(name: String) -> Dictionary:
	var value: Variant = _read_variant(name)
	return value if value is Dictionary else {}


func _read_variant(name: String) -> Variant:
	var path := "%s/%s.json" % [DATA_DIR, name]
	if not FileAccess.file_exists(path):
		push_error("missing data table: %s" % path)
		return null
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if parsed == null:
		push_error("could not parse %s" % path)
	return parsed

# ---------------------------------------------------------------------------
# Typed lookups
# ---------------------------------------------------------------------------
# Deliberately returning empty rather than null on a miss. Every call site here
# reads fields off the result immediately, and a null would surface as a crash
# three frames later in the renderer rather than at the bad id.

func enemy(id: String) -> Dictionary:
	return enemies.get(id, {})


func item(id: String) -> Dictionary:
	return items.get(id, {})


func spell(id: String) -> Dictionary:
	return spells.get(id, {})


func esper(id: String) -> Dictionary:
	return espers.get(id, {})


func character(id: String) -> Dictionary:
	return characters.get(id, {})


func map(id: String) -> Dictionary:
	return maps.get(id, {})


func quest(id: String) -> Dictionary:
	return quests.get(id, {})


## Every boss in the bestiary, ordered by level — the ladder the audits check.
func bosses() -> Array:
	var out: Array = []
	for id in enemies:
		var row: Dictionary = enemies[id]
		if bool(row.get("boss", false)):
			out.append(row)
	out.sort_custom(func(a, b): return int(a.get("level", 0)) < int(b.get("level", 0)))
	return out


## A creature's stat, reading the same nested shape the bestiary authored.
func enemy_stat(id: String, stat: String, fallback: float = 0.0) -> float:
	var row: Dictionary = enemy(id)
	var stats: Dictionary = row.get("stats", {})
	return float(stats.get(stat, fallback))
