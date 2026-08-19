class_name EventsBosses
extends RefCounted
##
## The optional bosses.
##
## Twenty-two were written for the later regions and none of them could be fought,
## because nothing in the world named them. This is the scaffolding that puts each one
## behind a door — and it is deliberately thin. A story boss earns a scene: the
## Bogfather gets a page of dialogue because the party's understanding of the world
## changes when it dies. These do not. They are things that live at the end of a
## corridor.
##
## Sixteen scenes differing only in their nouns is a table rather than sixteen scenes,
## so the specs cross as data (`godot/data/boss_events.json`) and this is the one
## factory that runs them. Six of the twenty-two are missing on purpose: they are the
## targets of proper sidequests in volume three, with their own build-up, and a
## creature reachable from two unrelated doors is worth less than one reachable from
## the right door.

## Party ids to display names, for the line a member says about what they are looking
## at. Kept here rather than read from the cast table because it is the *speaking*
## name — "The Mask", not "themask" — and the scene needs it before anyone is recruited.
const NAMES := {
	"vesna": "Vesna", "corvin": "Corvin", "wick": "Wick", "aurelian": "Aurelian",
	"bastian": "Bastian", "idris": "Idris", "osric": "Osric", "maret": "Maret",
	"tam": "Tam", "ilsabet": "Ilsabet", "kestrel": "Kestrel", "oda": "Oda",
	"rusk": "Rusk", "themask": "The Mask",
}


## Who speaks. The first of the preferred ids who is actually along, else whoever is.
static func voice(ctx: EventContext, preferred: Variant) -> String:
	var wanted: Array = preferred if preferred is Array else [preferred]
	var active := ctx.active_ids()
	for id in wanted:
		if active.has(String(id)):
			return String(id)
	return active[0] if not active.is_empty() else "vesna"


## Run one optional boss from its spec.
static func run_spec(spec: Dictionary, ctx: EventContext) -> void:
	var id := String(spec.get("id", ""))
	if ctx.has_flag("%s_slain" % id):
		await ctx.say_plain(null, [String(spec.get("cleared", "Nothing moves here now."))])
		return

	await ctx.say_plain(null, _lines(spec.get("sight", "")))
	if spec.has("line"):
		var who := voice(ctx, spec.get("speaker", "vesna"))
		await ctx.say_plain(NAMES.get(who, null), _lines(spec["line"]))

	var result := await ctx.battle({"enemies": _lines(spec.get("enemy", ""))},
		{"boss": true, "terrain": String(spec.get("terrain", "cobble")),
		"scenery": String(spec.get("scenery", "cave")), "canFlee": false})
	if result != "victory":
		return

	ctx.set_flag("%s_slain" % id)
	await ctx.wait(0.4)
	if spec.has("after"):
		await ctx.say_plain(null, _lines(spec["after"]))
	if spec.has("reward"):
		await ctx.grant_chest(spec["reward"], ctx.field)


## One string or several, as the reference's `[].concat(x)` does.
static func _lines(value: Variant) -> Array:
	return value if value is Array else [value]
