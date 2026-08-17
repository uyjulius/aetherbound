extends SceneTree
##
## Walks every creature in the bestiary through a grid of fight states and
## prints the move it chooses in each. `../../tools/ai-parity.mjs` runs the same
## grid through the JavaScript and fails on any disagreement.
##
##   godot --headless --path godot --script res://tools/ai_probe.gd
##
## The grid sweeps HP downward, because that is the axis phases live on and the
## order matters: a creature's phase is carried forward from state to state
## exactly as it is in a real fight, so this measures the *sequence* a boss
## produces rather than a set of isolated lookups. A phase bug is invisible to
## the latter and obvious in the former.

const Database := preload("res://scripts/data/database.gd")
const AI := preload("res://scripts/battle/enemy_ai.gd")

# Fixed rolls rather than random ones: `random` rules must be exercised from
# both sides of their threshold, and a shared seeded stream across two
# languages is not worth building for a check this shape.
const ROLLS := [0.05, 0.5, 0.95]

const HP_STEPS := [1.0, 0.9, 0.8, 0.7, 0.66, 0.6, 0.55, 0.5, 0.45, 0.4,
	0.35, 0.3, 0.25, 0.2, 0.18, 0.15, 0.12, 0.1, 0.07, 0.05]

const TURNS := 14


func _initialize() -> void:
	var db = Database.new()
	if not db.load_all():
		push_error("database failed to load")
		quit(1)
		return

	var ids: Array = db.enemies.keys()
	ids.sort()

	var out: Array = []
	for id in ids:
		var row: Dictionary = db.enemies[id]
		var rules: Array = row.get("ai", [])
		for roll in ROLLS:
			for ally_down in [false, true]:
				# Phase carries forward down the HP sweep, as in a real fight.
				var phase := 0
				var turn := 0
				for hp in HP_STEPS:
					turn += 1
					if turn > TURNS:
						turn = 1
					var decision: Dictionary = AI.choose_action(
						rules, float(hp), turn, phase, float(roll), ally_down)
					phase = int(decision["phase"])
					out.append(AI.signature(decision["action"])
						+ ("!" if bool(decision["entered"]) else ""))

	print(JSON.stringify({"count": out.size(), "sig": out}))
	quit()
