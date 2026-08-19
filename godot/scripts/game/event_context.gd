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

## Every call and wait, in order, when recording.
var log: Array = []
## Which branch to take. "first", "second", "last", "lost" or "flagged".
var policy := "first"
var recording := true

## Live collaborators, when not recording.
var party: Party = null
var database = null
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


## A single page.
func page(speaker: Variant, line: String, opts: Dictionary = {}) -> void:
	_record("dialogue.say", [speaker, line, opts])


## A choice. Returns the index taken — which is what the policy decides.
func ask(question: Variant, choices: Array, opts: Dictionary = {}) -> int:
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


# ---------------------------------------------------------------------------
# Party, flags and quests
# ---------------------------------------------------------------------------

func has_flag(id: String) -> bool:
	_record("party.hasFlag", [id])
	if policy == "flagged":
		return true
	return bool(_flags.get(id, false))


func set_flag(id: String) -> void:
	_record("party.setFlag", [id])
	_flags[id] = true


func start_quest(id: String) -> void:
	_record("party.startQuest", [id])


## The reference's `startQuest(id, stage)`; several scenes open a quest at a stage.
func start_quest_at(id: String, stage: int) -> void:
	_record("party.startQuest", [id, stage])


func advance_quest(id: String, stage: Variant = null) -> void:
	_record("party.advanceQuest", [id, stage])


func complete_quest(id: String) -> void:
	_record("party.completeQuest", [id])


func quest_stage(id: String) -> int:
	_record("party.questStage", [id])
	return 99 if policy == "flagged" else 0


func recruit(id: String, level: Variant = null) -> Dictionary:
	_record("party.recruit", [id, level])
	return _member(id)


func member(id: String) -> Dictionary:
	_record("party.member", [id])
	return _member(id)


func add_item(id: String, count: Variant = null) -> void:
	_record("party.addItem", [id, count])


func add_gold(amount: int) -> void:
	_record("party.addGold", [amount])


func spend_gold(amount: int) -> bool:
	_record("party.spendGold", [amount])
	return true


func learn_spell(id: String) -> void:
	_record("party.learnSpell", [id])


func member_learn_spell(member_id: String, spell_id: String) -> void:
	_record("member.learnSpell", [member_id, spell_id])


func full_restore() -> void:
	_record("party.fullRestore", [])


func has_esper(id: String) -> bool:
	_record("party.espers.has", [id])
	return policy == "flagged"


func add_esper(id: String) -> void:
	_record("party.espers.add", [id])


func in_roster(id: String) -> bool:
	_record("party.roster.has", [id])
	return policy == "flagged"


## How many kinds of creature the party has met — one scene prices a favour on it.
func bestiary_size() -> int:
	return 3 if policy == "flagged" else 0


# ---------------------------------------------------------------------------
# The world
# ---------------------------------------------------------------------------

func play_music(id: String, opts: Dictionary = {}) -> void:
	_record("playMusic", [id, opts])


## The reference hands this the chest *spec* — `{kind, id, label}` — and the field to
## place it in, in that order.
func grant_chest(spec: Variant, field: Variant = null) -> void:
	_record("grantChest", [spec, field])


func goto_map(id: String, spawn: Variant = null) -> void:
	_record("gotoMap", [id, spawn])


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
