class_name Battle
extends RefCounted
##
## A fight: gauges, turn order, attack, defend, statuses, knockouts and the end.
##
## The spine of `src/battle/battle.js`. The fourteen per-character special
## commands, summons, limit breaks and Scan are not here — they are self-contained
## resolutions on top of this and get their own sub-project, so nothing in this
## file is code that has never been compared against the reference.
##
## Two things are deliberately different from the reference, and neither changes
## the sequence of states a fight goes through:
##
## - **Resolution is immediate.** The reference resolves an action as a coroutine
##   that awaits animations, spending forty frames on a sword swing. Gauges are
##   frozen for all of them — `_tick_atb` only runs in the active phase — so the
##   frames cost time and change nothing. The port resolves in one call and the
##   state sequence is identical; the animation timing belongs with the view.
## - **There is no menu.** A `command_policy` decides what a character does, so a
##   fight can be scripted exactly. Interactive play sets it to null and calls
##   `commit_action` from a UI instead.
##
## Every roll comes from a stream passed in, never from a global, because a fight
## has to replay identically from a save and *which* stream a roll comes from — and
## in what order — is part of the rules.

enum Phase { INTRO, ACTIVE, MENU, EXECUTING, ENDING }

## ATB fill per second is `rate × 16`, matching the reference's
## `rate * dt * 100 * 0.16`.
const ATB_FILL := 16.0
const ATB_FULL := 100.0
const LIMIT_MAX := 100.0

## Held escape time that gets the party out.
const ESCAPE_HOLD := 0.9

var phase: int = Phase.INTRO
## In wait mode the gauges stop while a command menu is open, which is the
## difference between a turn-based fight and a hurried one.
var wait_mode := true
var battle_speed := 3.0
var can_flee := true
var is_boss := false
var result := ""

var party: Array[Combatant] = []
var enemies: Array[Combatant] = []
var active_actor: Combatant = null

## Called with (battle, actor) when a party member's gauge fills; returns an action
## dictionary. Null means "open a menu and wait for `commit_action`".
var command_policy: Callable = Callable()

## One entry per completed turn, and one for the ending: what the port is compared
## against. See `tools/battle-parity.mjs`.
var transcript: Array = []
## Rewards, filled in on victory.
var rewards: Dictionary = {}
## Anything the spine met and could not resolve honestly, as `"actor: kind"`. A
## non-empty list means a transcript from this fight is not comparable.
var unsupported: Array = []

var _party_ref: Party
var _db
var _statuses: Dictionary = {}
var _tick_rates: Dictionary = {}
var _battle_rng: RNG
var _loot_rng: RNG
var _escape_hold := 0.0
var _turn_index := 0


func _init(party_ref: Party, encounter: Dictionary, database,
		battle_stream: RNG = null, loot_stream: RNG = null) -> void:
	_party_ref = party_ref
	_db = database
	_statuses = database.statuses.get("statuses", {})
	_tick_rates = database.statuses.get("tick_rates", {})
	_battle_rng = battle_stream if battle_stream != null else RngStreams.battle
	_loot_rng = loot_stream if loot_stream != null else RngStreams.loot
	is_boss = bool(encounter.get("boss", false))
	can_flee = not is_boss

	for m in party_ref.active_members():
		party.append(PartyCombatant.new(m, party_ref.row_of(m.id), _statuses))

	# Enemies arrive in the order the encounter lists them, and copies of one
	# creature are lettered rather than numbered.
	var ids: Array = encounter.get("enemies", [])
	var counts := {}
	for enemy_id in ids:
		counts[enemy_id] = int(counts.get(enemy_id, 0)) + 1
	var seen := {}
	for enemy_id in ids:
		var row: Dictionary = database.enemies.get(String(enemy_id), {})
		if row.is_empty():
			push_error("unknown enemy: %s" % enemy_id)
			continue
		var index := int(seen.get(enemy_id, 0))
		seen[enemy_id] = index + 1
		enemies.append(EnemyCombatant.new(row, index, int(counts[enemy_id]), _statuses))

	# A boss opens with its gauge part-filled. It has just been given a banner with
	# its name on it, and going down before it takes a single turn makes all of that
	# a joke — half the bosses were dying inside one round to a party that brought
	# the right element, which is correct play being rewarded, but the fight should
	# still start.
	for e in enemies:
		if bool(e.def.get("boss", false)):
			e.atb = 55.0

	# Pre-emptive and back-attack rolls, the classic openers. One draw, always, and
	# the port went without it: every fight after the opening swing was reading the
	# stream one number out of step, which is invisible in a screenshot and changes
	# every roll of the fight.
	var opener := _battle_rng.next()
	if opener < 0.06:
		for c in party:
			c.atb = ATB_FULL
	elif opener > 0.97 and not is_boss:
		for e in enemies:
			e.atb = ATB_FULL

	phase = Phase.ACTIVE


func combatants() -> Array[Combatant]:
	var out: Array[Combatant] = []
	out.append_array(party)
	out.append_array(enemies)
	return out


## Advance the fight.
func update(dt: float) -> void:
	if phase == Phase.ENDING:
		return
	if phase == Phase.ACTIVE or (phase == Phase.MENU and not wait_mode):
		_tick_atb(dt)
	if phase == Phase.ACTIVE:
		_maybe_start_turn()


func _tick_atb(dt: float) -> void:
	for c in combatants():
		if c.is_ko():
			continue
		if not c.can_act():
			_serve_sentence(c, dt)
			continue
		var rate := Formulas.atb_rate(float(c.stat("spd")),
			c.has_status("haste"), c.has_status("slow"), c.has_status("stop"), battle_speed)
		c.atb = minf(ATB_FULL, c.atb + rate * dt * ATB_FILL)


## Count down a turn-blocking status on somebody who cannot take turns.
##
## Durations are counted in the victim's own turns and decremented when it acts.
## Stop, Paralysis and Freeze all block turns, so the victim never acted, so the
## counter never moved: every one of them was permanent for the rest of the fight,
## which made the Ferran Warden's Grapnel a 40% roll to remove a party member from
## the game. A blocked combatant now serves its sentence on the clock it would have
## acted on — the gauge fills and buys a tick of the status instead of a turn.
func _serve_sentence(c: Combatant, dt: float) -> void:
	var rate := Formulas.atb_rate(float(c.stat("spd")), false, false, false, battle_speed)
	c.blocked_fill += rate * dt * ATB_FILL
	if c.blocked_fill < ATB_FULL:
		return
	c.blocked_fill = 0.0
	for status_id in c.statuses.keys():
		var def: Dictionary = _statuses.get(status_id, {})
		if not bool(def.get("blocksTurn", false)):
			continue
		var state: Dictionary = c.statuses[status_id]
		if int(state.get("turns", 0)) <= 0:
			continue
		state["turns"] = int(state["turns"]) - 1
		if int(state["turns"]) <= 0:
			c.remove_status(status_id)


## Enemies act the moment they are ready; a party member's turn opens a decision.
func _maybe_start_turn() -> void:
	if active_actor != null:
		return
	for e in enemies:
		if not e.is_ko() and e.can_act() and e.atb >= ATB_FULL:
			_begin_enemy_turn(e)
			return
	for p in party:
		if not p.is_ko() and p.can_act() and p.atb >= ATB_FULL:
			_begin_player_turn(p)
			return


func _begin_player_turn(actor: Combatant) -> void:
	active_actor = actor
	phase = Phase.MENU
	# A guard raised last turn lasts until this one — that is the whole trade
	# Defend offers, and it is spent now that the character is acting again.
	if actor.defending:
		actor.defending = false
		actor.remove_status("protect")

	if actor.has_status("berserk"):
		commit_action({"actor": actor, "kind": "attack", "targets": [_random_enemy()]})
		return
	if actor.has_status("confuse"):
		var pool: Array = party if _battle_rng.next() < 0.5 else enemies
		var living := _living_except(pool, null)
		if living.is_empty():
			commit_action({"actor": actor, "kind": "defend"})
			return
		commit_action({"actor": actor, "kind": "attack", "targets": [_battle_rng.pick(living)]})
		return
	# Charm always hits your own side, which is what makes it worth the extra MP;
	# confuse hits either at random.
	if actor.has_status("charm"):
		var own := _living_except(party, actor)
		if not own.is_empty():
			commit_action({"actor": actor, "kind": "attack",
				"targets": [_battle_rng.pick(own)]})
			return

	if command_policy.is_valid():
		var action: Dictionary = command_policy.call(self, actor)
		if not action.is_empty():
			commit_action(action)


func _begin_enemy_turn(actor: Combatant) -> void:
	active_actor = actor
	# Incremented before the walk reads it, so a creature's first decision sees
	# turn 1 — `turnEvery: 3` fires on its third turn and not its fourth.
	actor.ai_turn += 1

	# A charmed creature fights its own side; a confused one swings at random.
	# Without these the player's Beguile and Addle were decoration on anything not
	# immune to them, which is most of the bestiary.
	if actor.has_status("charm"):
		var own := _living_except(enemies, actor)
		if not own.is_empty():
			commit_action({"actor": actor, "kind": "attack",
				"targets": [_battle_rng.pick(own)]})
			return
	if actor.has_status("confuse"):
		var pool: Array = enemies if _battle_rng.next() < 0.5 else party
		var live := _living_except(pool, actor)
		if not live.is_empty():
			commit_action({"actor": actor, "kind": "attack",
				"targets": [_battle_rng.pick(live)]})
			return

	commit_action(_evaluate_ai(actor))


## Which move this creature reaches for.
##
## The rule walk itself is `enemy_ai.gd`, shared with the reference and the
## simulator and checked over 24,000 decisions. What lives here is everything that
## needs the live fight: reading the creature's state, rolling the die *lazily*,
## advancing its phase, and turning the chosen rule into a targeted action.
func _evaluate_ai(actor: Combatant) -> Dictionary:
	var ally_down := false
	for e in enemies:
		if e.is_ko():
			ally_down = true
			break
	var own_statuses: Array = actor.statuses.keys()
	var party_statuses: Array = []
	for p in party:
		if p.is_ko():
			continue
		for status_id in p.statuses:
			if not party_statuses.has(status_id):
				party_statuses.append(status_id)

	var decision: Dictionary = EnemyAI.choose_action(
		actor.def.get("ai", []),
		float(actor.hp) / float(maxi(1, actor.max_hp)),
		actor.ai_turn,
		actor.phase,
		func(): return _battle_rng.next(),
		ally_down,
		own_statuses,
		party_statuses)
	if bool(decision.get("entered", false)):
		actor.phase = int(decision["phase"])
	return _build_enemy_action(actor, decision.get("action", {}))


## Turn a chosen rule into an action with targets.
##
## Spells are not in the spine. A creature whose rules reach for one is recorded
## rather than approximated — `unsupported` is what `tools/battle-parity.mjs` reads
## to refuse a fight it cannot honestly compare, instead of quietly swinging a
## sword where the reference cast a spell.
func _build_enemy_action(actor: Combatant, spec: Dictionary) -> Dictionary:
	if String(spec.get("kind", "attack")) != "attack":
		unsupported.append("%s: %s" % [actor.id, String(spec.get("kind", "?"))])
		return {"actor": actor, "kind": "attack",
			"targets": _living_except(party, null), "move": {}}
	var targets: Array = []
	if String(spec.get("target", "")) == "all":
		targets = _living_except(party, null)
	else:
		var one := _random_ally()
		if one != null:
			targets.append(one)
	return {"actor": actor, "kind": "attack", "targets": targets, "move": spec}


## Resolve an action now, then end the turn.
func commit_action(action: Dictionary) -> void:
	if phase == Phase.ENDING:
		return
	var actor: Combatant = action["actor"]
	phase = Phase.EXECUTING

	var kind := String(action.get("kind", "attack"))
	match kind:
		"attack":
			_do_attack(actor, action.get("targets", []), action.get("move", {}))
		"defend":
			_do_defend(actor)
		"spell":
			_do_spell(actor, action.get("targets", []), action.get("spell", {}))
		"item":
			_do_item(actor, action.get("targets", []), action.get("item", {}))
		"scan":
			_do_scan(action.get("targets", []))
		"special":
			_do_special(actor, action.get("targets", []), action.get("move", {}))
		"steal":
			_do_steal(actor, action.get("targets", []))
		"summon":
			_do_summon(actor, action.get("targets", []), action.get("esper", {}))
		"limit":
			_do_limit(actor, action.get("targets", []))
		"row":
			# Swapping rows costs the turn, which is the whole cost of the decision.
			actor.row = "back" if actor.row == "front" else "front"
		_:
			unsupported.append("%s: %s" % [actor.id, kind])

	actor.atb = 0.0
	actor.turn_count += 1
	active_actor = null
	_end_of_turn(actor)
	_record_turn(actor, kind)
	if not _check_end():
		phase = Phase.ACTIVE


# --- actions ----------------------------------------------------------------

func _do_attack(actor: Combatant, targets: Array, move: Dictionary) -> void:
	var living: Array = []
	for t in targets:
		if t != null and not t.is_ko():
			living.append(t)
	if living.is_empty():
		var fallback := _random_enemy() if actor.kind == "party" else _random_ally()
		if fallback == null:
			return
		living = [fallback]

	# A second weapon means a second swing at reduced power, so the relic is an
	# upgrade rather than a flat doubling — and only on a plain attack, because
	# letting it multiply a scripted enemy move would be chaos.
	var passes: Array = [1.0]
	if actor.kind == "party" and move.is_empty() and actor.has_effect("dualWield"):
		passes = [1.0, 0.62]

	for pass_power in passes:
		for target in living:
			if target.is_ko():
				continue
			# A move's element wins, then Attune, then whatever the weapon is.
			var element := String(move.get("element", ""))
			if element.is_empty():
				element = actor.attuned_element
			if element.is_empty() and actor.kind == "party":
				element = String(actor.weapon().get("element", ""))
			_resolve_physical(actor, target, float(move.get("power", 1.0)) * pass_power,
				element, move.get("status", {}))


## Defend: brace for the round, and take the guard into the next turn.
##
## Two turns of Protect, not the status table's default of "until removed".
## `_end_of_turn` runs in the same wrap-up as this action, so a guard raised for one
## turn went up and came down before a single enemy could swing — the most-pressed
## non-attack button in the game bought nothing at all. The `defending` stamp is
## what lets the teardown tell "the turn I defended" from "the turn after".
func _do_defend(actor: Combatant) -> void:
	actor.add_status("protect", 2)
	actor.defending = true


## The MP a spell costs this caster. Relics can halve it or flatten it to one; a creature
## pays what the bestiary says.
func _spell_cost(actor: Combatant, spell: Dictionary) -> int:
	if actor.kind != "party":
		return int(spell.get("mp", 0))
	return actor.member.spell_cost(spell)


func _do_spell(actor: Combatant, targets: Array, spell: Dictionary) -> void:
	if spell.is_empty():
		return
	var cost := _spell_cost(actor, spell)
	if actor.kind == "party":
		if actor.mp < cost:
			return
		actor.mp -= cost

	# `doubleCast` resolves the spell twice for one payment, and the second pass
	# re-checks the target list so a wide spell that already killed everything does
	# not swing at corpses.
	var passes := 1
	if actor.kind == "party" and actor.has_effect("doubleCast"):
		passes = 2

	for pass_index in passes:
		var live: Array = targets
		if pass_index > 0:
			live = []
			for t in targets:
				if not t.is_ko() or bool(spell.get("targetsKO", false)):
					live.append(t)
		if live.is_empty():
			break
		for target in live:
			# Reflect bounces the spell back at the caster's own side. Grey magic
			# and buffs pass through, which is what makes Reflect a defence rather
			# than a wall.
			if target.has_status("reflect") and String(spell.get("school", "")) != "grey" \
					and String(spell.get("kind", "")) != "buff":
				var pool: Array = party if actor.kind == "party" else enemies
				var bounce := _living_except(pool, null)
				if not bounce.is_empty():
					_apply_spell(actor, _battle_rng.pick(bounce), spell)
				continue
			_apply_spell(actor, target, spell)


func _apply_spell(actor: Combatant, target: Combatant, spell: Dictionary) -> void:
	var caster_magic := float(actor.stat("mag"))
	var kind := String(spell.get("kind", ""))

	if kind == "attack":
		var mdef := float(target.magic_defence())
		if target.has_status("shell"):
			mdef = floor(mdef * 1.6)
		# Same split as a swing: the party's spells climb, a creature's spell is
		# worth a multiple of its own magic.
		var dmg := 0
		if actor.kind == "party":
			dmg = Formulas.magic_damage(actor.level, caster_magic,
				float(spell.get("power", 0)), mdef)
		else:
			dmg = Formulas.monster_damage(actor.level, caster_magic, mdef,
				float(spell.get("power", 0)) / Formulas.MONSTER_SPELL_REFERENCE, target.row)
		dmg = Formulas.apply_variance(dmg, 224 + _battle_rng.int_below(33))

		var mult := Formulas.elemental_multiplier(String(spell.get("element", "")),
			target.affinity())
		if String(spell.get("element", "")) == "earth" and target.has_status("float") \
				and String(spell.get("ignores", "")) != "float":
			mult = 0.0
		dmg = int(round(float(dmg) * absf(mult)))
		if mult < 0.0:
			target.hp = mini(target.max_hp, target.hp + dmg)
		elif mult != 0.0:
			_apply_damage(target, dmg)
		_roll_statuses(actor, target, spell.get("status", {}), false)
	elif kind == "heal":
		if String(spell.get("effect", "")) == "fullHeal":
			target.hp = target.max_hp
		else:
			var amount := Formulas.heal_amount(actor.level, caster_magic,
				float(spell.get("power", 0)))
			# Undead take healing as damage — an old trick, still a good one. Only a
			# creature can be authored undead; a party member gets there through
			# Zombie.
			var undead := target.has_status("zombie")
			if target is EnemyCombatant and bool((target as EnemyCombatant).def.get("undead", false)):
				undead = true
			if undead:
				_apply_damage(target, amount)
			else:
				target.hp = mini(target.max_hp, target.hp + amount)
	elif kind == "status" or kind == "buff":
		_roll_statuses(actor, target, spell.get("status", {}), kind == "buff")
	elif kind == "special":
		_apply_special_spell(actor, target, spell)


## Statuses from a move or a spell. A buff lands without a roll; everything else
## is contested by the target's resistance, immunities and level.
func _roll_statuses(actor: Combatant, target: Combatant, statuses: Dictionary,
		guaranteed: bool) -> void:
	for status_id in statuses:
		var lands := guaranteed
		if not lands:
			lands = Formulas.roll_status(_battle_rng, float(statuses[status_id]),
				float(target.magic_defence()), target.immune, String(status_id),
				actor.level, target.level)
		if not lands:
			continue
		if String(status_id) == "ko":
			_apply_damage(target, target.hp)
		else:
			target.add_status(String(status_id))


func _apply_special_spell(actor: Combatant, target: Combatant, spell: Dictionary) -> void:
	match String(spell.get("effect", "")):
		"revive":
			if not target.is_ko():
				return
			target.remove_status("ko")
			target.hp = maxi(1, int(floor(float(target.max_hp) * float(spell.get("ratio", 0.25)))))
		"cureStatus":
			for status_id in spell.get("cures", []):
				target.remove_status(String(status_id))
		"drainHP":
			var dmg := 0
			if actor.kind == "party":
				dmg = Formulas.magic_damage(actor.level, float(actor.stat("mag")),
					float(spell.get("power", 0)), float(target.magic_defence()))
			else:
				dmg = Formulas.monster_damage(actor.level, float(actor.stat("mag")),
					float(target.magic_defence()),
					float(spell.get("power", 0)) / Formulas.MONSTER_SPELL_REFERENCE, target.row)
			dmg = Formulas.apply_variance(dmg, 224 + _battle_rng.int_below(33))
			_apply_damage(target, dmg)
			actor.hp = mini(actor.max_hp, actor.hp + dmg)
		"drainMP":
			var amount := mini(target.mp, int(floor(float(spell.get("power", 0)) * 0.6)))
			target.mp -= amount
			actor.mp = mini(actor.max_mp, actor.mp + amount)
		"fractionHP":
			_apply_damage(target, maxi(1, int(floor(float(target.hp)
				* float(spell.get("fraction", 0.5))))))
		"stripBuffs":
			for status_id in target.statuses.keys():
				if String(_statuses.get(status_id, {}).get("kind", "")) == "good":
					target.remove_status(String(status_id))
		"scan":
			target.scanned = true
		"flee":
			_finish("flee")
		"levelMultiple":
			# The classic level-N roulette: it lands only where the level divides
			# evenly, which is why it reads the bestiary's levels rather than a
			# damage curve.
			if target.level % int(spell.get("of", 1)) != 0:
				return
			var dmg := 0
			if actor.kind == "party":
				dmg = Formulas.magic_damage(actor.level, float(actor.stat("mag")), 90.0,
					float(target.magic_defence()))
			else:
				dmg = Formulas.monster_damage(actor.level, float(actor.stat("mag")),
					float(target.magic_defence()),
					90.0 / Formulas.MONSTER_SPELL_REFERENCE, target.row)
			dmg = Formulas.apply_variance(dmg, 224 + _battle_rng.int_below(33))
			_apply_damage(target, dmg)
		"extraTurn":
			# The gauge refilled rather than a turn granted directly: the ATB is the
			# only clock in the fight, so a full bar says the same thing in the
			# system's own terms and cannot double-book the actor.
			target.atb = ATB_FULL
		"swapHPMP":
			# Both clamped, because the pools are not the same size and this should
			# never be a free full heal or a way to mint MP.
			var hp := mini(target.hp, target.max_mp)
			var mp := mini(target.mp, target.max_hp)
			target.hp = maxi(1, mp)
			target.mp = hp


func _do_item(actor: Combatant, targets: Array, item: Dictionary) -> void:
	if item.is_empty():
		return
	if not _party_ref.remove_item(String(item.get("id", "")), 1):
		return
	var effect: Dictionary = item.get("effect", {})
	for target in targets:
		if effect.has("heal"):
			target.hp = mini(target.max_hp, target.hp + int(effect["heal"]))
		if effect.has("mp"):
			target.mp = mini(target.max_mp, target.mp + int(effect["mp"]))
		if bool(effect.get("fullHeal", false)):
			target.hp = target.max_hp
		if bool(effect.get("fullMP", false)):
			target.mp = target.max_mp
		for status_id in effect.get("cure", []):
			target.remove_status(String(status_id))
		if bool(effect.get("cureAll", false)):
			target.clear_bad_statuses()
		if effect.has("revive") and target.is_ko():
			target.remove_status("ko")
			target.hp = int(floor(float(target.max_hp) * float(effect["revive"])))
		for status_id in effect.get("status", {}):
			target.add_status(String(status_id))
		if effect.has("damage"):
			var mult := Formulas.elemental_multiplier(String(effect.get("element", "")),
				target.affinity())
			var dmg := int(round(float(effect["damage"]) * absf(mult)))
			_apply_damage(target, maxi(1, dmg) if mult != 0.0 else 0)


## A per-character special command.
##
## Data-driven on purpose: every one of the fourteen commands builds a `move` and
## this resolves it, so the fifteenth needs a table entry rather than a branch.
##
## Statuses ride the blow and roll like any other. They used to be applied here as
## well, unconditionally, before the swing got a look at them — so each landed twice
## and the first was a certainty. The bestiary writes *chances*: a `{berserk: 70}` is
## meant to be seven turns in ten, and arrived as ten, on the whole party, skipping
## the immunity list and the level term on the way past.
func _do_special(actor: Combatant, targets: Array, move: Dictionary) -> void:
	# Overclock pays first, so the cost lands even if the blow misses.
	if move.has("overclock"):
		var spent := maxi(1, int(floor(float(actor.max_hp) * float(move["overclock"]))))
		actor.hp = maxi(1, actor.hp - spent)

	for target in targets:
		if bool(move.get("unmake", false)):
			# Strip every good status, then blank the affinity table for the rest of
			# the fight: an absorb becomes a plain hit and a resistance stops
			# mattering. This is the counter to a boss built around one element.
			for status_id in target.statuses.keys():
				if String(_statuses.get(status_id, {}).get("kind", "")) == "good":
					target.remove_status(String(status_id))
			if target is EnemyCombatant:
				(target as EnemyCombatant).unmade = true

		if bool(move.get("quarry", false)):
			target.quarry = true

		if bool(move.get("render", false)):
			_render_spell(actor, target)

		if move.has("heal"):
			var amount := int(floor(float(target.max_hp) * float(move["heal"])))
			target.hp = mini(target.max_hp, target.hp + amount)

		if move.has("power") and float(move["power"]) > 0.0:
			_resolve_physical(actor, target, float(move["power"]),
				String(move.get("element", "")), move.get("status", {}))
		elif move.has("status"):
			# A pure status move has no blow to ride, so it rolls on its own.
			_roll_statuses(actor, target, move["status"], false)

	if move.has("attune"):
		actor.attuned_element = String(move["attune"])


## Render: learn one spell the target knows and the caster does not.
func _render_spell(actor: Combatant, target: Combatant) -> void:
	if actor.kind != "party" or not (target is EnemyCombatant):
		return
	var theirs: Array = []
	for rule in (target as EnemyCombatant).def.get("ai", []):
		var spell_id := String(rule.get("do", {}).get("spell", ""))
		if spell_id.is_empty() or not _db.spells.has(spell_id):
			continue
		if float(actor.member.spells.get(spell_id, 0)) >= 100.0:
			continue
		theirs.append(spell_id)
	if theirs.is_empty():
		return
	actor.member.spells[String(_battle_rng.pick(theirs))] = 100.0


## Pilfer. Rolled on the loot stream, like every other acquisition, so a fight
## replays identically from a seed whatever the party is wearing.
func _do_steal(actor: Combatant, targets: Array) -> void:
	if targets.is_empty() or not (targets[0] is EnemyCombatant):
		return
	var target: EnemyCombatant = targets[0]
	var bonus := 2.0 if actor.kind == "party" and actor.has_effect("stealUp") else 1.0
	for entry in target.def.get("steal", []):
		if _loot_rng.next() < float(entry.get("chance", 0)) * bonus:
			var item_id := String(entry.get("id", ""))
			if _db.items.has(item_id):
				_party_ref.add_item(item_id, 1)
			return


## Summon. One per battle, and the most expensive button in the game.
func _do_summon(actor: Combatant, targets: Array, esper: Dictionary) -> void:
	if esper.is_empty():
		return
	actor.mp -= int(esper.get("mp", 0))
	actor.summoned = true
	var summon: Dictionary = esper.get("summon", {})
	var effect := String(summon.get("effect", ""))

	for target in targets:
		if summon.has("heal"):
			target.hp = mini(target.max_hp,
				target.hp + int(floor(float(target.max_hp) * float(summon["heal"]))))
		elif effect == "buffParty":
			target.add_status("protect")
			target.add_status("shell")
			target.add_status("haste")
		elif effect == "healParty":
			target.hp = mini(target.max_hp, target.hp
				+ Formulas.heal_amount(actor.level, float(actor.stat("mag")), 90.0))
		elif effect == "hasteParty":
			target.add_status("haste")
		elif effect == "silenceAll":
			if not target.immune.has("silence"):
				target.add_status("silence")
		elif effect == "fractionHP":
			# Proportional damage. Bosses are immune, or this trivialises every long
			# fight in the game.
			if not (target is EnemyCombatant and (target as EnemyCombatant).is_boss()):
				_apply_damage(target, maxi(1, int(floor(float(target.hp)
					* float(summon.get("fraction", 0.5))))))
		else:
			var mdef := float(target.magic_defence())
			if target.has_status("shell"):
				mdef = floor(mdef * 1.6)
			var dmg := Formulas.magic_damage(actor.level, float(actor.stat("mag")),
				float(summon.get("power", 0)), mdef)
			var mult := Formulas.elemental_multiplier(String(summon.get("element", "")),
				target.affinity())
			if mult < 0.0:
				target.hp = mini(target.max_hp, target.hp + dmg)
			elif mult > 0.0:
				_apply_damage(target, int(round(float(dmg) * mult)))


## Desperation. Spends the gauge for one blow that half-ignores defence.
func _do_limit(actor: Combatant, targets: Array) -> void:
	actor.limit = 0.0
	for target in targets:
		_resolve_physical(actor, target, 3.2, actor.attuned_element, {}, 0.5)


func _do_scan(targets: Array) -> void:
	for target in targets:
		target.scanned = true


func _resolve_physical(actor: Combatant, target: Combatant, power: float,
		element: String, status: Dictionary, ignore_defence := 0.0) -> int:
	var accuracy := 100.0 + (float(actor.stat("lck")) * 0.2 if actor.kind == "party" else 6.0)
	if not Formulas.roll_hit(_battle_rng, accuracy, float(target.evade()),
			actor.has_status("blind"), target.has_status("vanish")):
		return 0

	var crit_luck := float(actor.stat("lck")) if actor.kind == "party" else 8.0
	var crit_bonus := 0.25 if actor.has_status("critUp") else 0.0
	if actor.kind == "party" and actor.weapon().get("effects", []).has("critUp"):
		crit_bonus += 0.08
	var crit := Formulas.roll_critical(_battle_rng, crit_luck, crit_bonus)

	var defence := float(target.defence())
	if target.has_status("protect"):
		defence = floor(defence * 1.6)
	# An imp can barely hit and can barely take one, which is the whole joke.
	if target.has_status("imp"):
		defence = floor(defence * 0.35)

	var multiplier := power
	if actor.has_status("berserk"):
		multiplier *= 1.25
	if actor.has_status("imp"):
		multiplier *= 0.25
	# Quarry marks a target for the whole party, not just for the character who
	# marked it — which is what makes it worth a turn.
	if target.quarry:
		multiplier *= 1.25

	var dmg := 0
	if actor.kind == "party":
		dmg = Formulas.physical_damage(actor.level, float(actor.stat("vig")),
			float(actor.attack_power()), defence, actor.row, target.row, crit,
			multiplier, ignore_defence,
			actor.weapon().get("effects", []).has("reachBack"))
	else:
		dmg = Formulas.monster_damage(actor.level, float(actor.attack_power()), defence,
			multiplier * (1.5 if crit else 1.0), target.row, ignore_defence)

	# Variance, drawn here rather than inside the damage function.
	#
	# The reference applies it *inside* `physicalDamage`, which is why the formula
	# parity harness passes `variance: false` on both sides — a roll cannot be
	# compared against a grid. The band is 224..256 out of 256, so a swing lands
	# between 87% and 100% of its nominal damage, and the draw has to happen here,
	# after the hit and critical rolls and before the elemental multiplier, or every
	# later roll in the fight comes out of a different place in the stream.
	dmg = Formulas.apply_variance(dmg, 224 + _battle_rng.int_below(33))

	var mult := Formulas.elemental_multiplier(element, target.affinity())
	if element == "earth" and target.has_status("float"):
		mult = 0.0
	dmg = int(round(float(dmg) * absf(mult)))

	if mult < 0.0:
		# Absorbed: the element heals what it was meant to hurt.
		target.hp = mini(target.max_hp, target.hp + dmg)
	elif mult == 0.0:
		dmg = 0
	else:
		_apply_damage(target, dmg, crit)

	if not status.is_empty() and not target.is_ko():
		_roll_statuses(actor, target, status, false)
	return dmg


func _apply_damage(target: Combatant, amount: int, crit := false) -> int:
	var before := target.hp
	target.hp = maxi(0, target.hp - amount)
	var dealt := before - target.hp

	# Sleep and freeze break on damage.
	for status_id in target.statuses.keys():
		if bool(_statuses.get(status_id, {}).get("wakesOnHit", false)):
			target.remove_status(status_id)

	if target.kind == "party":
		var down := 0
		for p in party:
			if p.is_ko():
				down += 1
		target.limit = minf(LIMIT_MAX, target.limit + Formulas.limit_gain(
			float(dealt), float(target.max_hp), float(target.hp), down))

	if target.hp <= 0:
		_kill(target)
	return dealt


func _kill(target: Combatant) -> void:
	target.add_status("ko")
	target.atb = 0.0


## Damage and healing over time, then status countdowns.
func _end_of_turn(actor: Combatant) -> void:
	if actor.is_ko():
		return
	for status_id in actor.statuses.keys():
		var def: Dictionary = _statuses.get(status_id, {})
		if def.is_empty():
			continue
		var tick := String(def.get("tick", ""))
		if not tick.is_empty():
			var rate := float(_tick_rates.get(tick, 0.05))
			var amount := maxi(1, int(floor(float(actor.max_hp) * rate)))
			if tick == "regen":
				actor.hp = mini(actor.max_hp, actor.hp + amount)
			else:
				_apply_damage(actor, amount)
		if not actor.statuses.has(status_id):
			continue
		var state: Dictionary = actor.statuses[status_id]
		if int(state.get("turns", 0)) > 0:
			state["turns"] = int(state["turns"]) - 1
			if int(state["turns"]) <= 0:
				if String(def.get("onExpire", "")) == "kill" and not actor.is_ko():
					_apply_damage(actor, actor.hp)
				actor.remove_status(status_id)


# --- ending -----------------------------------------------------------------

func _check_end() -> bool:
	if phase == Phase.ENDING:
		return true
	var enemies_down := true
	for e in enemies:
		if not e.is_ko():
			enemies_down = false
			break
	var party_down := true
	for p in party:
		if not p.is_ko():
			party_down = false
			break
	if enemies_down:
		_finish("victory")
		return true
	if party_down:
		_finish("defeat")
		return true
	return false


## Hold both shoulder buttons to run.
##
## Works with a menu open, and has to: in wait mode a command menu is up almost
## every frame, so gating this on the active phase meant the hold never
## accumulated and no battle could be fled at all.
func hold_escape(dt: float, holding: bool) -> void:
	if not can_flee or phase == Phase.ENDING:
		return
	if holding:
		_escape_hold += dt
		if _escape_hold > ESCAPE_HOLD:
			_finish("flee")
	else:
		_escape_hold = maxf(0.0, _escape_hold - dt * 2.0)


func _finish(outcome: String) -> void:
	phase = Phase.ENDING
	result = outcome
	if outcome == "victory":
		_award()
	for p in party:
		p.commit()
	transcript.append({"event": "end", "result": outcome, "rewards": rewards.duplicate(),
		"state": snapshot()})


## Experience, gold and drops, and the bench learns too.
##
## The order is the reference's order and that matters: drops are rolled inside the
## same walk over the enemies that accumulates experience and gold, so the loot
## stream advances once per drop entry per creature, in bestiary order. Rolling
## them afterwards would produce different loot from the same seed.
##
## The bench gains half. Fourteen playable characters and four slots, and a benched
## member used to gain nothing at all — so the moment somebody was swapped out they
## froze at that level for the rest of the game and swapping them back in was a
## punishment. Half, not full, so who actually fights still matters.
func _award() -> void:
	var total_exp := 0
	var total_gold := 0.0
	var drops: Array = []
	for e in enemies:
		total_exp += int(e.def.get("exp", 0))
		total_gold += float(e.def.get("gold", 0))
		for drop in e.def.get("drops", []):
			if _loot_rng.next() < float(drop.get("chance", 0)):
				drops.append(String(drop.get("id", "")))

	var survivors := 0
	for p in party:
		if not p.is_ko():
			survivors += 1
	var each := Formulas.exp_share(total_exp, survivors)
	var gold := Formulas.gold_share(total_gold)
	_party_ref.add_gold(gold)
	for id in drops:
		_party_ref.add_item(id, 1)

	var fighting := {}
	for p in party:
		fighting[p.id] = true
	var bench_each := maxi(1, int(floor(float(each) * 0.5)))
	for member_id in _party_ref.roster:
		var m: Party.Member = _party_ref.roster[member_id]
		if fighting.has(member_id) or m.is_ko():
			continue
		m.gain_exp(bench_each)

	var levels := {}
	for p in party:
		if p.is_ko():
			continue
		# Annotated because `p` is a Combatant and `p.member` is only typed inside
		# the subclass — the export treats an inferred Variant as an error.
		var gained: int = p.member.gain_exp(each)
		# A level-up mid-fight raises the ceiling the bar is drawn against.
		p.max_hp = p.member.max_hp()
		p.max_mp = p.member.max_mp()
		if gained > 0:
			levels[p.id] = gained
	rewards = {"exp_each": each, "gold": gold, "levels": levels, "drops": drops}


# --- transcript -------------------------------------------------------------

## The state of every combatant, for comparison against the reference.
##
## ATB is deliberately absent. The reference spends frames on animations that the
## port resolves instantly, so the two agree on the *order* gauges fill in and not
## on their value at any given moment. Order is what a fight is made of; the
## number on the bar between turns is not.
func snapshot() -> Array:
	var out: Array = []
	for c in combatants():
		var status_ids: Array = c.statuses.keys()
		status_ids.sort()
		var statuses_out: Array = []
		for status_id in status_ids:
			statuses_out.append("%s:%d" % [status_id, int(c.statuses[status_id].get("turns", 0))])
		out.append({
			"id": c.id, "kind": c.kind, "hp": c.hp, "mp": c.mp,
			"turns": c.turn_count, "ko": c.is_ko(), "statuses": statuses_out,
		})
	return out


func _record_turn(actor: Combatant, kind: String) -> void:
	_turn_index += 1
	transcript.append({
		"event": "turn", "index": _turn_index, "actor": actor.id, "kind": kind,
		"state": snapshot(),
		# The stream, so a divergence can be told apart from a desynchronisation:
		# matching draw counts with different numbers means a number is being used
		# wrongly, and differing counts mean the two engines are reading different
		# parts of the stream and everything after is noise.
		"draws": _battle_rng.draws, "rng": _battle_rng.get_state(),
	})


# --- helpers ----------------------------------------------------------------

func _random_enemy() -> Combatant:
	return _random_living(enemies)


func _random_ally() -> Combatant:
	return _random_living(party)


## Everyone in a pool still standing, optionally excluding one of them.
func _living_except(pool: Array, exclude: Combatant) -> Array:
	var out: Array = []
	for c in pool:
		if not c.is_ko() and c != exclude:
			out.append(c)
	return out


func _random_living(pool: Array) -> Combatant:
	var living: Array = []
	for c in pool:
		if not c.is_ko():
			living.append(c)
	if living.is_empty():
		return null
	return _battle_rng.pick(living)


## The party this fight is being fought by — the roster, the purse and the bag. A
## command policy needs it to know whether there is a Potion to use.
func party_ref() -> Party:
	return _party_ref


## The first living enemy, which is what a scripted policy attacks.
func first_living_enemy() -> Combatant:
	for e in enemies:
		if not e.is_ko():
			return e
	return null
