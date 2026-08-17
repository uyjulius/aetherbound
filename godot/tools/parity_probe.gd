extends SceneTree
##
## Runs the ported formulas over a fixed grid of inputs and prints one JSON blob
## on stdout. `../../tools/parity.mjs` runs the same grid through the JavaScript
## reference and fails on any disagreement.
##
## The grid is generated rather than hand-written so it covers the awkward
## regions the balance pass actually cared about: defence either side of the
## saturation point, magic either side of the softening point, the back row with
## and without a reaching weapon, criticals, and defence-ignoring hits. A parity
## check that only samples comfortable inputs proves nothing about the places
## the maths is subtle.
##
##   godot --headless --path godot --script res://tools/parity_probe.gd
##
## `_initialize`, not `_init`: the latter is the Object constructor and runs
## before the tree exists, so `quit()` there is ignored and headless Godot hangs
## with no output.

const F := preload("res://scripts/battle/formulas.gd")


func _initialize() -> void:
	var physical: Array = []
	var monster: Array = []
	var magic: Array = []
	var heal: Array = []
	var defence_curve: Array = []
	var misc: Array = []

	for level in [1, 6, 12, 24, 40, 60, 85]:
		for vigour in [8, 34, 90]:
			for weapon in [12, 26, 148]:
				for defence in [0, 60, 150, 200, 232, 437]:
					for row in ["front", "back"]:
						for crit in [false, true]:
							physical.append(F.physical_damage(
								level, vigour, weapon, float(defence), row, "front", crit))

	# A weapon that reaches takes no back-row penalty; one that does not, does.
	for weapon in [26, 148]:
		for reach in [false, true]:
			physical.append(F.physical_damage(
				40, 34, weapon, 150.0, "back", "front", false, 1.0, 0.0, reach))

	for level in [1, 12, 32, 58, 85]:
		for power in [40, 91, 260, 661]:
			for defence in [0, 97, 200, 437]:
				for mult in [1.0, 1.7, 2.8, 3.4]:
					for row in ["front", "back"]:
						monster.append(F.monster_damage(
							level, float(power), float(defence), mult, row))

	for level in [1, 18, 33, 55, 85]:
		for magic_stat in [10, 60, 128, 129, 200, 400]:
			for spell in [21, 60, 108, 141, 165, 185]:
				for mdef in [0, 88, 200, 230]:
					magic.append(F.magic_damage(
						level, float(magic_stat), float(spell), float(mdef)))
					heal.append(F.heal_amount(level, float(magic_stat), float(spell)))

	for defence in [0, 1, 50, 128, 199, 200, 201, 232, 300, 437, 1000]:
		for ignore in [0.0, 0.25, 0.5, 1.0]:
			defence_curve.append(snappedf(F.effective_defence(float(defence), ignore), 0.000001))

	for magic_stat in [1, 64, 128, 129, 256, 512]:
		misc.append(snappedf(F.effective_magic(float(magic_stat)), 0.000001))
	for speed in [1, 22, 40, 65, 120]:
		for haste in [false, true]:
			for slow in [false, true]:
				for bs in [1, 3, 6]:
					misc.append(snappedf(
						F.atb_rate(float(speed), haste, slow, false, float(bs)), 0.000001))
	for total in [5, 620, 4200, 36000]:
		for survivors in [1, 2, 3, 4]:
			misc.append(F.exp_share(total, survivors))
	for gold in [6, 900, 15000, 46000]:
		misc.append(F.gold_share(float(gold)))
	for dmg in [10, 500, 4000]:
		for hp in [100, 1000, 8000]:
			for cur in [0, 200, 900]:
				for down in [0, 2]:
					misc.append(snappedf(
						F.limit_gain(float(dmg), float(hp), float(cur), down), 0.000001))
	for acc in [100, 106, 130]:
		for evade in [0, 22, 60, 140]:
			for blind in [false, true]:
				misc.append(snappedf(F.hit_chance(float(acc), float(evade), blind), 0.000001))

	print(JSON.stringify({
		"physical": physical,
		"monster": monster,
		"magic": magic,
		"heal": heal,
		"defence": defence_curve,
		"misc": misc,
	}))
	quit()
