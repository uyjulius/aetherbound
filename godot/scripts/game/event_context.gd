class_name EventContext
extends RefCounted
##
## What a scripted event is allowed to touch.
##
## The 124 events in the reference are generators taking `(game, ctx)` that reach the
## world through a narrow surface: dialogue, a battle, a chest, a flag, a quest, a
## track of music, a shake of the camera. That surface is this class, and having it
## in one place is what makes the events portable *and* checkable — the same event
## script runs against a recording context in `tools/events_probe.gd` and against a
## live one in the game.
##
## The method names deliberately echo the reference's call sites, because 6,511 lines
## of scenes have to be translated by hand and every gratuitous rename is a chance to
## translate one wrongly.
##
## Recording mode writes down what was asked for instead of doing it, and the
## transcript is compared against the reference's own, call for call, under five
## branch policies. A scene that quietly did nothing would otherwise compare equal to
## a scene that was never written.

## Frame length used when a scene is stepped without a scheduler, matching the
## reference's fixed step. It decides how many shake calls a tremor makes, so it is
## part of the comparison rather than an implementation detail.
const STEP := 1.0 / 60.0

## Who the opening party is, for the scenes that ask who came along.
const STARTERS := ["vesna", "corvin", "wick"]

## Every call and wait, in order, when recording.
var log: Array = []
## Which branch to take. "first", "second", "last", "lost" or "flagged".
var policy := "first"
var recording := true

## Live collaborators, when not recording.
##
## A scene never learns which mode it is in. That is the whole point of the split: the
## transcript the harness compares is produced by the same code path the player sees,
## with the effects swapped out rather than the script rewritten.
var party: Party = null
var database = null
## The dialogue box, when there is one.
var dialogue: Dialogue = null
## Called with `(encounter, opts)` and expected to return "victory", "defeat" or
## "flee". The host owns what a battle *is*; a scene only waits for the outcome.
var on_battle: Callable = Callable()
## Called with `(track, opts)`, `(map_id, spawn)` and `(spec)` respectively.
var on_music: Callable = Callable()
var on_goto_map: Callable = Callable()
var on_chest: Callable = Callable()
## The field a scene is running in. A marker while recording, because a transcript
## that described the field would be a description of the harness.
var field: Variant = "<field>"

var _flags := {}


func _init(as_policy := "first", is_recording := true) -> void:
	policy = as_policy
	recording = is_recording


func _record(call: String, args: Array = []) -> void:
	if recording:
		log.append({"call": call, "args": args})


# ---------------------------------------------------------------------------
# Dialogue
# ---------------------------------------------------------------------------

## Several pages in sequence, then close. `lines` may be one string or many.
func say(speaker: Variant, lines: Variant, opts: Dictionary = {}) -> void:
	_record("dialogue.speak", [speaker, lines if lines is Array else [lines], opts])
	if not recording and dialogue != null:
		await dialogue.speak(speaker, lines if lines is Array else [lines], opts)


## The same, from a caller that passes no options at all.
##
## The distinction is not pedantry: the volumes' own `say` helper defaults `opts` to an
## empty dictionary and forwards it, while the boss factory's omits the argument
## entirely, so one records `{}` and the other records nothing. A transcript that
## flattened the two would hide a scene passing the wrong options.
func say_plain(speaker: Variant, lines: Variant) -> void:
	_record("dialogue.speak", [speaker, lines if lines is Array else [lines], null])


## A single page.
func page(speaker: Variant, line: String, opts: Dictionary = {}) -> void:
	_record("dialogue.say", [speaker, line, opts])


## A choice. Returns the index taken — which is what the policy decides.
func ask(question: Variant, choices: Array, opts: Dictionary = {}) -> int:
	if not recording and dialogue != null:
		# The player decides. The policy exists for the harness, where there is nobody
		# to ask.
		return await dialogue.ask(question, choices, opts)
	var picked := 0
	match policy:
		"second":
			picked = mini(1, choices.size() - 1)
		"last":
			picked = choices.size() - 1
	_record("dialogue.ask", [question, choices, opts, picked])
	return picked


func close_dialogue() -> void:
	_record("dialogue.close", [])
	if not recording and dialogue != null:
		dialogue.close()


# ---------------------------------------------------------------------------
# Party, flags and quests
# ---------------------------------------------------------------------------

func has_flag(id: String) -> bool:
	_record("party.hasFlag", [id])
	if not recording and party != null:
		return party.has_flag(id)
	if policy == "flagged":
		return true
	return bool(_flags.get(id, false))


func set_flag(id: String) -> void:
	_record("party.setFlag", [id])
	_flags[id] = true
	if not recording and party != null:
		party.set_flag(id)


func start_quest(id: String) -> void:
	_record("party.startQuest", [id])


## The reference's `startQuest(id, stage)`; several scenes open a quest at a stage.
func start_quest_at(id: String, stage: int) -> void:
	_record("party.startQuest", [id, stage])
	if not recording and party != null:
		party.start_quest(id, stage)


func advance_quest(id: String, stage: Variant = null) -> void:
	_record("party.advanceQuest", [id, stage])
	if not recording and party != null:
		party.advance_quest(id, int(stage) if stage != null else 1)


func complete_quest(id: String) -> void:
	_record("party.completeQuest", [id])
	if not recording and party != null:
		party.complete_quest(id)


func quest_stage(id: String) -> int:
	_record("party.questStage", [id])
	if not recording and party != null:
		return party.quest_stage(id)
	return 99 if policy == "flagged" else 0


func recruit(id: String, level: Variant = null) -> Dictionary:
	_record("party.recruit", [id, level])
	if not recording and party != null:
		var member_ := party.recruit(id, int(level) if level != null else -1)
		if member_ != null:
			return {"id": member_.id, "name": member_.name(), "level": member_.level}
	return _member(id)


## A member of the roster, or an empty dictionary if they have not joined.
##
## Only the opening three answer unless the policy says everything has already
## happened. Scenes branch on who came along, and a context that produced a member
## for every id would only ever take the first branch.
func member(id: String) -> Dictionary:
	_record("party.member", [id])
	if STARTERS.has(id) or policy == "flagged":
		return _member(id)
	return {}


## The ids of whoever is in the active party, in formation order.
func active_ids() -> Array:
	if not recording and party != null:
		return party.active.duplicate()
	if policy == "flagged":
		return ["vesna", "corvin", "wick", "aurelian", "bastian", "idris", "osric",
			"maret", "tam", "ilsabet", "kestrel", "oda", "rusk", "themask"]
	return STARTERS.duplicate()


## The first of `ids` who is in the *active* party, or an empty dictionary. Different
## from `present`, which asks about the whole roster.
func speaking(ids: Array) -> Dictionary:
	var active := active_ids()
	for id in ids:
		if active.has(String(id)):
			return _member(String(id))
	return {}


## Everyone active except these.
func active_except(ids: Array) -> Array:
	var out: Array = []
	for id in active_ids():
		if not ids.has(id):
			out.append(_member(id))
	return out


## How many of these flags are set. Some scenes gate on a count rather than an order.
func count_flags(flags: Array) -> int:
	var n := 0
	for flag in flags:
		if has_flag(String(flag)):
			n += 1
	return n


func count_item(id: String) -> int:
	_record("party.countItem", [id])
	return 3 if policy == "flagged" else 0


func rest_all() -> void:
	_record("party.restAll", [])


func gold() -> int:
	return 500


## A coin toss the policy decides, so a branch is exercised rather than left to a
## stream position that the two engines would have to keep in step for no reason.
func chance(_p: float) -> bool:
	_record("rng.chance", [snappedf(_p, 0.0001)])
	return policy == "first" or policy == "last"


## One of a list, likewise decided by the policy rather than by a draw.
func pick(list: Array) -> Variant:
	_record("rng.pick", [list.size()])
	if list.is_empty():
		return null
	return list[0] if policy != "last" else list[list.size() - 1]


## Everyone in the roster, as members. One scene walks it to take an esper back.
func roster_members() -> Array:
	var out: Array = []
	if not recording and party != null:
		for id in party.roster:
			out.append({"id": id, "name": party.roster[id].name()})
		return out
	for id in active_ids():
		out.append(_member(id))
	return out


func remove_esper(id: String) -> void:
	_record("party.espers.delete", [id])


## Take the magicite off a member, so it can be handed to somebody who asked for it.
func clear_esper(member_id: String) -> void:
	_record("member.clearEsper", [member_id])


## The first of these the party already carries, or an empty string.
func first_esper(candidates: Array) -> String:
	for id in candidates:
		if has_esper(String(id)):
			return String(id)
	return ""


## An esper's display name, for the line a scene says about it.
##
## Read from the exported table rather than restated, so the name in a scene is the
## name on the magicite.
func esper_name(id: String) -> String:
	if database == null:
		return id
	return String(database.espers.get(id, {}).get("name", id))


## The music the current map wants back after a scene has borrowed the score.
func map_music() -> String:
	return ""


func restore_theme(fade: float = 1.6) -> void:
	var track := map_music()
	if not track.is_empty():
		play_music(track, {"fade": fade})


## The display names of a list of members, for a menu of who might sit down.
func names_of(members: Array) -> Array:
	var out: Array = []
	for m in members:
		out.append(String(m.get("name", "?")))
	return out


## The first of these who is in the party, or an empty dictionary. Several scenes give
## a line to whoever happens to be along, in a fixed order of preference.
func present(ids: Array) -> Dictionary:
	for id in ids:
		var found := member(String(id))
		if not found.is_empty():
			return found
	return {}


func add_item(id: String, count: Variant = null) -> void:
	_record("party.addItem", [id, count])
	if not recording and party != null:
		party.add_item(id, int(count) if count != null else 1)


func add_gold(amount: int) -> void:
	_record("party.addGold", [amount])
	if not recording and party != null:
		party.add_gold(amount)


func spend_gold(amount: int) -> bool:
	_record("party.spendGold", [amount])
	if not recording and party != null:
		return party.spend_gold(amount)
	return true


func learn_spell(id: String) -> void:
	_record("party.learnSpell", [id])


func member_learn_spell(member_id: String, spell_id: String) -> void:
	_record("member.learnSpell", [member_id, spell_id])


func full_restore() -> void:
	_record("party.fullRestore", [])


func has_esper(id: String) -> bool:
	_record("party.espers.has", [id])
	if not recording and party != null:
		return party.has_esper(id)
	return policy == "flagged"


func add_esper(id: String) -> void:
	_record("party.espers.add", [id])


func in_roster(id: String) -> bool:
	_record("party.roster.has", [id])
	if not recording and party != null:
		return party.roster.has(id)
	return policy == "flagged"


## How many kinds of creature the party has met — one scene prices a favour on it.
func bestiary_size() -> int:
	return 3 if policy == "flagged" else 0


# ---------------------------------------------------------------------------
# The world
# ---------------------------------------------------------------------------

func play_music(id: String, opts: Dictionary = {}) -> void:
	_record("playMusic", [id, opts])
	if not recording and on_music.is_valid():
		on_music.call(id, opts)


## The reference hands this the chest *spec* — `{kind, id, label}` — and the field to
## place it in, in that order.
func grant_chest(spec: Variant, field: Variant = null) -> void:
	_record("grantChest", [spec, field])
	if not recording and on_chest.is_valid():
		await on_chest.call(spec)


func goto_map(id: String, spawn: Variant = null) -> void:
	_record("gotoMap", [id, spawn])
	if not recording and on_goto_map.is_valid():
		on_goto_map.call(id, spawn)


func celebrate(a: Variant = null, b: Variant = null) -> void:
	_record("celebrate", [a, b] if b != null else ([a] if a != null else []))


func show_ending(a: Variant = null) -> void:
	_record("showEnding", [a] if a != null else [])


func run_event(id: String) -> void:
	_record("runEvent", [id])


func autosave(reason: String) -> void:
	_record("autosave", [reason])


## Start a battle from inside a scene and wait for the outcome.
func battle(encounter: Dictionary, opts: Dictionary = {}) -> String:
	if not recording and on_battle.is_valid():
		return await on_battle.call(encounter, opts)
	var result := "defeat" if policy == "lost" else "victory"
	_record("startBattleScene", [encounter, opts, result])
	return result


# ---------------------------------------------------------------------------
# Presentation
# ---------------------------------------------------------------------------

## Letterbox on or off, with the beat the reference waits either side of it.
func cinematic(on: bool) -> void:
	_record("stage.class", ["cinema", on])
	await wait(0.55)


## Shake and darken — used when something wakes up.
##
## The loop is the reference's `over()`: a fixed step, a shake every step, easing
## from full strength to half. It is written out rather than approximated because the
## *number* of shakes is part of the transcript, and a scene that trembles for
## eighty-four frames is not the same scene as one that trembles for eighty.
func tremor(seconds := 1.6, strength := 0.5) -> void:
	var elapsed := 0.0
	while elapsed < seconds:
		elapsed += STEP
		var t := minf(1.0, elapsed / seconds)
		shake(strength * (1.0 - t * 0.5), 2.0)


func shake(amount: float, frequency: float) -> void:
	_record("rig.shake", [snappedf(amount, 0.0001), snappedf(frequency, 0.0001)])


func flash(colour: Variant, strength: float) -> void:
	_record("postfx.flash", [colour, snappedf(strength, 0.0001)])


func grade(name: String, t: float) -> void:
	_record("postfx.grade", [name, snappedf(t, 0.0001)])


func stage_class(name: String, on: bool) -> void:
	_record("stage.class", [name, on])


## A pause. Recorded, because a beat before a line lands is a decision.
func wait(seconds: float) -> void:
	if recording:
		log.append({"yield": "wait", "seconds": snappedf(seconds, 0.0001)})
		return
	if dialogue != null:
		# Real time, on the scene's own clock. The scheduler owns game time for
		# everything that has to pause with the world; a beat between two lines of
		# dialogue is presentation and belongs on the frame clock.
		await dialogue.get_tree().create_timer(seconds).timeout


## Run a callback every step for a duration, as the reference's `over` does.
func over(seconds: float, fn: Callable) -> void:
	var elapsed := 0.0
	while elapsed < seconds:
		elapsed += STEP
		var t := minf(1.0, elapsed / seconds)
		fn.call(t, STEP)


## Rebuild the follower line after a recruitment, so the new member walks out of the
## scene with everyone else. Deliberately not recorded: the reference calls it on the
## field rather than on the game, and it changes nothing a transcript can see.
func refresh_party() -> void:
	pass


## The world's state — "whole" before the cataclysm, "ruin" after. A plain property,
## because the reference reads and writes it as one and a recorded accessor would put
## a call in the transcript that the reference never makes.
var world_state := "whole"


func _member(id: String) -> Dictionary:
	return {"id": id, "name": id.substr(0, 1).to_upper() + id.substr(1), "level": 6}
