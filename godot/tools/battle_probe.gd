extends SceneTree
##
## Fights the same fights the reference fought, and prints what happened.
##
##   godot --headless --path godot --script res://tools/battle_probe.gd
##
## Reads `tools/fixtures/battle-setup.json` for the party and the seeds — inputs,
## because a fight between different characters at different levels under a
## different stream is not a comparison. It does **not** read
## `reference-battles.json`; that is the answer, and `tools/battle-parity.mjs` holds
## it.
##
## The command policy is the reference's: every player turn attacks the first living
## enemy. Stepped at a fixed sixtieth, which is the same fixed step the reference's
## own loop runs, so the gauges fill in the same order.

const Database := preload("res://scripts/data/database.gd")
const PartyModel := preload("res://scripts/game/party.gd")
const BattleModel := preload("res://scripts/battle/battle.gd")

const DT := 1.0 / 60.0
const FRAME_CAP := 60 * 240
## The reference's loot seed is derived from the battle seed the same way.
const LOOT_SEED_MIX := 0x5bf03635


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var setup := _read_setup()
	if setup.is_empty():
		push_error("no tools/fixtures/battle-setup.json — run `npm run harvest:battles`")
		quit(1)
		return

	var out := {}
	for scenario in setup.get("scenarios", []):
		out[String(scenario["name"])] = _fight(db, setup["party"], scenario)
	print(JSON.stringify({"scenarios": out}))
	quit()


func _read_setup() -> Dictionary:
	var file := ProjectSettings.globalize_path("res://../tools/fixtures/battle-setup.json")
	if not FileAccess.file_exists(file):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.open(file, FileAccess.READ).get_as_text())
	return parsed if parsed is Dictionary else {}


## Rebuild the harvested party exactly: levels, equipment, magicite, spells, and
## whatever HP and MP they walked in with.
func _build_party(db, description: Dictionary):
	var party = PartyModel.new(db)
	party.gold = int(description.get("gold", 0))
	for item_id in description.get("inventory", {}):
		party.inventory[String(item_id)] = int(description["inventory"][item_id])
	var active: Array = []
	for entry in description.get("members", []):
		var id := String(entry["id"])
		var member = party.recruit(id, int(entry.get("level", 1)))
		if member == null:
			continue
		member.exp = int(entry.get("exp", 0))
		member.limit = float(entry.get("limit", 0))
		for slot in entry.get("equipment", {}):
			var item_id: Variant = entry["equipment"][slot]
			if item_id != null:
				member.equipment[slot] = db.items.get(String(item_id), {})
		var esper_id: Variant = entry.get("esper", null)
		if esper_id != null:
			member.esper = db.espers.get(String(esper_id), {})
		for spell_id in entry.get("spells", {}):
			member.spells[String(spell_id)] = float(entry["spells"][spell_id])
		# After equipment, because HP is clamped against a maximum that equipment
		# moves — set first and a member walks in missing the health their armour
		# was giving them.
		member.hp = int(entry.get("hp", member.max_hp()))
		member.mp = int(entry.get("mp", member.max_mp()))
		party.rows[id] = String(entry.get("row", "front"))
		if bool(entry.get("active", false)):
			active.append(id)
	if not active.is_empty():
		party.active = active
	return party


## The scripted decision for a player turn.
##
## The same four policies the harvest implements, and deliberately mechanical: no
## best target, no cleverness, nothing either side has to interpret. A policy that
## differs by one turn compares two different fights.
func _policy(db, name: String, scenario: Dictionary) -> Callable:
	var move: Dictionary = scenario.get("move", {})
	var side := String(scenario.get("side", "enemies"))
	match name:
		"magic":
			return func(fight, actor):
				var target = fight.first_living_enemy()
				var known: Array = []
				for spell_id in actor.member.spells:
					if float(actor.member.spells[spell_id]) < 100.0:
						continue
					var spell: Dictionary = db.spells.get(String(spell_id), {})
					if String(spell.get("kind", "")) == "attack":
						known.append(spell)
				known.sort_custom(func(a, b): return String(a["id"]) < String(b["id"]))
				if not known.is_empty() and target != null \
						and actor.mp >= int(known[0].get("mp", 0)):
					return {"actor": actor, "kind": "spell", "spell": known[0],
						"targets": [target]}
				return {"actor": actor, "kind": "attack",
					"targets": [target] if target != null else []}
		"heal":
			return func(fight, actor):
				var target = fight.first_living_enemy()
				if float(actor.hp) < float(actor.max_hp) * 0.6 \
						and fight.party_ref().count_item("potion") > 0:
					return {"actor": actor, "kind": "item",
						"item": db.items.get("potion", {}), "targets": [actor]}
				return {"actor": actor, "kind": "attack",
					"targets": [target] if target != null else []}
		"special":
			return func(fight, actor):
				var pool: Array = fight.party if side == "party" else fight.enemies
				var living: Array = []
				for c in pool:
					if not c.is_ko():
						living.append(c)
				var targets: Array = living
				if String(move.get("target", "")) != "all" and side != "party":
					targets = living.slice(0, 1)
				if not targets.is_empty():
					return {"actor": actor, "kind": "special", "move": move,
						"targets": targets}
				return _swing(fight, actor)
		"steal":
			return func(fight, actor):
				var target = fight.first_living_enemy()
				if actor.turn_count == 0 and target != null:
					return {"actor": actor, "kind": "steal", "targets": [target]}
				return _swing(fight, actor)
		"summon":
			return func(fight, actor):
				var esper: Dictionary = actor.member.esper if actor.kind == "party" else {}
				var summon: Dictionary = esper.get("summon", {})
				var helps := summon.has("heal") or ["buffParty", "healParty", "hasteParty"] \
					.has(String(summon.get("effect", "")))
				var pool: Array = fight.party if helps else fight.enemies
				var targets: Array = []
				for c in pool:
					if not c.is_ko():
						targets.append(c)
				if not esper.is_empty() and not actor.summoned \
						and actor.mp >= int(esper.get("mp", 0)) and not targets.is_empty():
					return {"actor": actor, "kind": "summon", "esper": esper,
						"targets": targets}
				return _swing(fight, actor)
		"limit":
			return func(fight, actor):
				var target = fight.first_living_enemy()
				if actor.limit >= 100.0 and target != null:
					return {"actor": actor, "kind": "limit", "targets": [target]}
				return _swing(fight, actor)
		"defend-first":
			return func(fight, actor):
				if actor.turn_count == 0:
					return {"actor": actor, "kind": "defend", "targets": []}
				var target = fight.first_living_enemy()
				return {"actor": actor, "kind": "attack",
					"targets": [target] if target != null else []}
	return func(fight, actor):
		return _swing(fight, actor)


## The fallback every policy shares: swing at the first living enemy.
func _swing(fight, actor) -> Dictionary:
	var target = fight.first_living_enemy()
	return {"actor": actor, "kind": "attack",
		"targets": [target] if target != null else []}


func _fight(db, party_description: Dictionary, scenario: Dictionary) -> Dictionary:
	var party = _build_party(db, party_description)
	var seed_value := int(scenario.get("seed", 0))
	var battle_rng := RNG.new(seed_value)
	var loot_rng := RNG.new(seed_value ^ LOOT_SEED_MIX)

	var battle = BattleModel.new(party, {"enemies": scenario.get("enemies", [])},
		db, battle_rng, loot_rng)
	battle.can_flee = false
	battle.command_policy = _policy(db, String(scenario.get("policy", "attack")), scenario)

	var frames := 0
	while battle.phase != BattleModel.Phase.ENDING and frames < FRAME_CAP:
		battle.update(DT)
		frames += 1

	var levels := {}
	var spoils := {}
	for member_id in party.roster:
		var m: Party.Member = party.roster[member_id]
		levels[member_id] = m.level
		# What the fight left behind: the level, the experience, and every spell's proficiency.
		# The transcript ends at the last turn, so without this the port could fight a fight
		# identically and hand out nothing at the end of it.
		spoils[member_id] = {"level": m.level, "exp": m.exp, "spells": m.spells.duplicate()}
	var turns: Array = []
	for entry in battle.transcript:
		if String(entry.get("event", "")) == "turn":
			turns.append(entry)

	return {
		"result": battle.result,
		"frames": frames,
		"turns": turns,
		"final": battle.snapshot(),
		"gold": party.gold,
		"levels": levels,
		"spoils": spoils,
		"inventory": party.inventory,
		"rewards": battle.rewards,
		"unsupported": battle.unsupported,
		"draw_log": battle_rng.draw_log,
	}
