extends SceneTree
##
## The contract between the deterministic battle model and the interactive presentation.
## Automatic turns must pause in EXECUTING until the view has shown them; only the presenter
## commits their mechanics. Without that boundary, enemies remove HP invisibly.

const Database := preload("res://scripts/data/database.gd")
const PartyModel := preload("res://scripts/game/party.gd")
const BattleModel := preload("res://scripts/battle/battle.gd")


func _initialize() -> void:
	var trouble: Array = []
	var db = Database.new()
	if not db.load_all():
		print(JSON.stringify({"trouble": ["database failed to load"]}))
		quit(1)
		return

	var party = PartyModel.new(db)
	party.new_campaign()
	var fight = BattleModel.new(party, {"enemies": ["fenrat"]}, db,
		RNG.new(731), RNG.new(991))
	var presented: Array = []
	fight.action_presenter = func(action): presented.append(action)
	for combatant in fight.party + fight.enemies:
		combatant.atb = 0.0

	var enemy: Combatant = fight.enemies[0]
	var turns_before := enemy.turn_count
	enemy.atb = BattleModel.ATB_FULL
	fight.update(0.0)
	if presented.size() != 1:
		trouble.append("enemy action did not reach the presenter")
	if fight.phase != BattleModel.Phase.EXECUTING:
		trouble.append("battle clock did not pause for enemy presentation")
	if enemy.turn_count != turns_before:
		trouble.append("enemy mechanics resolved before presentation")

	if not presented.is_empty():
		fight.commit_action(presented[0])
	if enemy.turn_count != turns_before + 1:
		trouble.append("presented enemy action did not resolve when committed")

	# Forced party turns use the same route; otherwise Berserk, Confuse and Charm still land
	# as invisible damage even though normal menu commands animate.
	for combatant in fight.party + fight.enemies:
		combatant.atb = 0.0
	var hero: Combatant = fight.party[0]
	hero.add_status("berserk", 2)
	hero.atb = BattleModel.ATB_FULL
	fight.update(0.0)
	if presented.size() != 2 or presented[-1].get("actor", null) != hero:
		trouble.append("forced party action did not reach the presenter")
	if hero.turn_count != 0:
		trouble.append("forced party mechanics resolved before presentation")

	print(JSON.stringify({"presented": presented.size(), "trouble": trouble}))
	quit(1 if not trouble.is_empty() else 0)
