class_name EnemyAI
extends RefCounted
##
## Which move a creature reaches for — a port of ../../../src/battle/ai.js.
##
## The bestiary keeps its choreography in these rules: every boss's escalation
## is `phase` numbers on `hpBelow` entries, and the whole difference between a
## fight that builds and one that peters out is how they are read. The reference
## implementation got that wrong for the life of the project in a way nothing
## could see — a phase rule fired once and then locked itself out, so bosses got
## *weaker* as their health fell — which is exactly the kind of defect a port
## re-introduces by accident.
##
## So it is ported literally and `../../../tools/ai-parity.mjs` walks every
## creature in the bestiary through a grid of fight states, comparing the chosen
## move against the JavaScript on every one.

## How often a creature repeats the signature move of the phase it is in.
const PHASE_REPEAT := 3

const DEFAULT_ACTION := {"kind": "attack"}


## Returns `{action, phase, entered}`. `entered` is true only on the turn the
## phase changes, which is when the banner should play.
##
## `roll` is passed in rather than drawn here. In the reference it is taken
## lazily from the seeded battle stream — only when a `random` rule is actually
## reached — because drawing on every decision advances the stream on turns that
## did not need it and silently reshuffles the rest of the fight.
static func choose_action(
	rules: Array,
	hp_fraction: float,
	ai_turn: int,
	phase: int,
	roll: float = 1.0,
	ally_down: bool = false,
	own_statuses: Array = [],
	party_statuses: Array = []
) -> Dictionary:
	var list: Array = rules
	if list.is_empty():
		list = [{"if": "always", "do": DEFAULT_ACTION}]

	for rule in list:
		var kind: String = str(rule.get("if", ""))
		var match_found := false
		match kind:
			"always":
				match_found = true
			"hpBelow", "selfHpBelow":
				match_found = hp_fraction < float(rule.get("v", 0.0))
			"turnEvery":
				var n: int = int(rule.get("n", 1))
				match_found = n != 0 and ai_turn % n == 0
			"turnIs":
				match_found = ai_turn == int(rule.get("n", -1))
			"random":
				match_found = roll < float(rule.get("p", 0.0))
			"allyDown":
				match_found = ally_down
			"hasStatus":
				match_found = own_statuses.has(str(rule.get("status", "")))
			"partyHasStatus":
				match_found = party_statuses.has(str(rule.get("status", "")))
			_:
				match_found = false
		if not match_found:
			continue

		# A phase is a state the creature enters, not a move it spends: a higher
		# phase supersedes a lower one, entering announces itself once, and the
		# signature then recurs on a beat rather than every turn.
		if rule.has("phase") and int(rule["phase"]) != 0:
			var want: int = int(rule["phase"])
			if phase > want:
				continue
			if phase < want:
				return {"action": rule.get("do", DEFAULT_ACTION), "phase": want, "entered": true}
			if ai_turn % PHASE_REPEAT != 0:
				continue
		return {"action": rule.get("do", DEFAULT_ACTION), "phase": phase, "entered": false}

	return {"action": DEFAULT_ACTION, "phase": phase, "entered": false}


## A stable one-line identity for an action, for comparing across engines.
static func signature(action: Dictionary) -> String:
	var kind: String = str(action.get("kind", "attack"))
	var name: String = str(action.get("name", ""))
	var spell: String = str(action.get("spell", ""))
	var power: float = float(action.get("power", 1.0))
	var target: String = str(action.get("target", "one"))
	var element: String = str(action.get("element", ""))
	# "%.4f" rather than String.num(power, 4): the latter trims trailing zeros,
	# so a power of 1.2 prints "1.2" here and "1.2000" from JavaScript's
	# toFixed, and every single comparison fails for a reason that has nothing
	# to do with the game.
	return "%s|%s|%s|%.4f|%s|%s" % [kind, name, spell, power, target, element]
