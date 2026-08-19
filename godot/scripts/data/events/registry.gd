class_name Events
extends RefCounted
##
## Every scripted scene, by the id the world names it with.
##
## Map triggers and NPCs refer to scenes by id — `event: "harrowmere_intro"` — so
## something has to turn that string into a coroutine. Five translated volumes plus one
## factory over the exported boss specs, and an unknown id is a warning rather than a
## crash: a map that names a scene nobody has written yet should be walkable.

const Vol1 := preload("res://scripts/data/events/vol1.gd")
const Vol2 := preload("res://scripts/data/events/vol2.gd")
const Vol3 := preload("res://scripts/data/events/vol3.gd")
const Vol4 := preload("res://scripts/data/events/vol4.gd")
const Vol5 := preload("res://scripts/data/events/vol5.gd")
const Bosses := preload("res://scripts/data/events/bosses.gd")


## Every id that can be run, including the bosses from the exported table.
static func ids(database) -> Array:
	var out: Array = []
	for volume in [Vol1, Vol2, Vol3, Vol4, Vol5]:
		for id in volume.IDS:
			out.append(String(id))
	if database != null:
		for id in database.boss_events:
			out.append(String(id))
	return out


static func has(id: String, database) -> bool:
	return ids(database).has(id)


## Run one scene. Returns false if nothing answers to that id.
static func run(id: String, ctx: EventContext) -> bool:
	for volume in [Vol1, Vol2, Vol3, Vol4, Vol5]:
		if volume.IDS.has(id):
			await volume.run(id, ctx)
			return true
	if ctx.database != null and ctx.database.boss_events.has(id):
		await Bosses.run_spec(ctx.database.boss_events[id], ctx)
		return true
	push_warning("no such event: %s" % id)
	return false
