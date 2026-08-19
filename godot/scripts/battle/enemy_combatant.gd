class_name EnemyCombatant
extends Combatant
##
## A creature from the bestiary, in a fight.
##
## Its numbers are authored rather than derived, and its stat names differ from the
## party's — `vig` here is `atk` there — so `stat` maps between them rather than
## making the bestiary speak the party's vocabulary.

## The row from `enemies.json`.
var def: Dictionary = {}
var ai_turn := 0
## Maret's Unmake blanks the affinity table for the rest of the fight, turning an
## absorb into a plain hit. Derived rather than assigned, hence a flag.
var unmade := false

const STAT_NAMES := {
	"vig": "atk", "spd": "spd", "sta": "def", "mag": "mag", "res": "mdef", "lck": "lck",
}


func _init(from: Dictionary, index: int, total: int, statuses_table: Dictionary) -> void:
	_statuses_table = statuses_table
	kind = "enemy"
	def = from
	id = "%s#%d" % [String(from.get("id", "?")), index]
	# Multiple copies get A/B/C suffixes, as tradition demands.
	name = String(from.get("name", "?"))
	if total > 1:
		name = "%s %s" % [name, char(65 + index)]
	level = int(from.get("level", 1))
	max_hp = int(from.get("stats", {}).get("hp", 1))
	hp = max_hp
	max_mp = int(from.get("stats", {}).get("mp", 0))
	mp = max_mp
	row = "front"
	for value in from.get("immune", []):
		immune.append(String(value))


func stat(which: String) -> int:
	var key := String(STAT_NAMES.get(which, which))
	return int(def.get("stats", {}).get(key, 10))


func attack_power() -> int:
	return int(def.get("stats", {}).get("atk", 10))


func defence() -> int:
	return int(def.get("stats", {}).get("def", 0))


func magic_defence() -> int:
	return int(def.get("stats", {}).get("mdef", 0))


func evade() -> int:
	return int(def.get("stats", {}).get("eva", 0))


func affinity() -> Dictionary:
	return {} if unmade else def.get("affinity", {})


func is_boss() -> bool:
	return bool(def.get("boss", false))
