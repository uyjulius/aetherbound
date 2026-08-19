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


func _fight(db, party_description: Dictionary, scenario: Dictionary) -> Dictionary:
	var party = _build_party(db, party_description)
	var seed_value := int(scenario.get("seed", 0))
	var battle_rng := RNG.new(seed_value)
	var loot_rng := RNG.new(seed_value ^ LOOT_SEED_MIX)

	var battle = BattleModel.new(party, {"enemies": scenario.get("enemies", [])},
		db, battle_rng, loot_rng)
	battle.can_flee = false
	battle.command_policy = func(fight, actor):
		var target = fight.first_living_enemy()
		return {"actor": actor, "kind": "attack",
			"targets": [target] if target != null else []}

	var frames := 0
	while battle.phase != BattleModel.Phase.ENDING and frames < FRAME_CAP:
		battle.update(DT)
		frames += 1

	var levels := {}
	for member_id in party.roster:
		levels[member_id] = party.roster[member_id].level
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
		"inventory": party.inventory,
		"rewards": battle.rewards,
		"unsupported": battle.unsupported,
		"draw_log": battle_rng.draw_log,
	}
