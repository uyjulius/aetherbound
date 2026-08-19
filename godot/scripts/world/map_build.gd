class_name MapBuild
extends RefCounted
##
## Turn a map definition into a collision grid.
##
## The reference builds collision as a side effect of building scenery — the walk
## grid while laying ground, colliders while placing props. This builds only the
## collision, because the scenery there is geometry computed in code and this
## project does not ship that as an asset. What comes out is compared against the
## reference's own grids, cell for cell, by `tools/field-parity.mjs`.
##
## One layer is read rather than derived. An authored prop's collider is measured
## from the bounding box of the built kit geometry that stands at body height, so
## it exists only after the reference has built the prop; `godot/data/footprints.json`
## carries those, harvested by `tools/harvest-reference.mjs`. Everything else here
## — walkability, glyph-props, exits, doorways, scripted zones — is derived from
## the map and the legend.

## Ragged terrain rows are padded with this, which is void and not walkable.
const PAD := " "
## An unrecognised glyph falls back to this rather than to void, matching the
## reference: a typo in a map file leaves walkable ground rather than a hole.
const UNKNOWN := "."


class Built:
	extends RefCounted
	var id := ""
	var width := 0
	var height := 0
	var grid: CollisionGrid
	var spawns := {}
	## Tiles carrying a glyph-prop, by prop name — what an asset pass will need.
	var glyph_props := {}


## Resolve a map against the world state.
##
## The second half of the game reuses the same geography under a different sky. A map may
## carry a `ruin` block whose keys are merged over the base — atmosphere, music,
## encounters, and lists of props and people to add or take away by id — so the two
## worlds are genuinely the same *place*, which is the whole emotional point of the
## device: a player should recognise a street and find it wrong.
##
## A port of `resolveMap` in `src/world/map.js`, and not optional: twenty-six of the
## ninety-five maps carry one of these blocks, and a port that ignored them would render
## the wrong half of the game for the whole of the second act.
static func resolve(map_def: Dictionary, world_state := "whole") -> Dictionary:
	if world_state != "ruin" or not map_def.has("ruin"):
		return map_def
	var override: Dictionary = map_def["ruin"]
	if override.is_empty():
		return map_def

	var merged := map_def.duplicate()
	for key in override:
		merged[key] = override[key]

	# `removeProps` and `removeNpcs` take ids; `props` and `npcs` in the override are
	# additive rather than replacing, since most of a town survives.
	var drop_props := {}
	for id in override.get("removeProps", []):
		drop_props[String(id)] = true
	var drop_npcs := {}
	for id in override.get("removeNpcs", []):
		drop_npcs[String(id)] = true

	var props: Array = []
	for prop in map_def.get("props", []):
		if not drop_props.has(String(prop.get("id", ""))):
			props.append(prop)
	for prop in override.get("props", []):
		props.append(prop)
	merged["props"] = props

	var npcs: Array = []
	for npc in map_def.get("npcs", []):
		if not drop_npcs.has(String(npc.get("id", ""))):
			npcs.append(npc)
	for npc in override.get("npcs", []):
		npcs.append(npc)
	merged["npcs"] = npcs

	if override.has("terrain"):
		merged["terrain"] = override["terrain"]
	# Triggers and exits replace wholesale when given, since routes change.
	merged["triggers"] = override.get("triggers", map_def.get("triggers", []))
	merged["exits"] = override.get("exits", map_def.get("exits", []))
	merged.erase("ruin")
	merged.erase("removeProps")
	merged.erase("removeNpcs")
	# Which footprints to measure against. The ruined world adds fifty-seven props and
	# takes thirty-one away, and two of the new ones stand exactly where an old one did —
	# so the two worlds cannot share one position-keyed table without over-blocking those
	# two spots in whichever world they do not belong to.
	merged["footprintKey"] = "%s#ruin" % String(map_def.get("id", ""))
	return merged


static func build(map_def: Dictionary, legend: Dictionary,
		footprints: Dictionary = {}) -> Built:
	var rows: Array = map_def.get("terrain", [])
	var glyphs: Dictionary = legend.get("glyphs", {})
	var radii: Dictionary = legend.get("glyph_radii", {})
	var tile := float(legend.get("tile", 2))

	var height := rows.size()
	var width := 0
	for row in rows:
		width = maxi(width, String(row).length())

	var out := Built.new()
	out.id = String(map_def.get("id", ""))
	out.width = width
	out.height = height
	out.spawns = map_def.get("spawns", {})
	var grid := CollisionGrid.new(width, height, tile)
	out.grid = grid

	# --- walkability ---------------------------------------------------------
	for z in height:
		var row := String(rows[z])
		for x in width:
			var ch := row.substr(x, 1) if x < row.length() else PAD
			var cell: Dictionary = glyphs.get(ch, glyphs.get(UNKNOWN, {}))
			grid.set_walk(x, z, bool(cell.get("walk", false)))

	# --- glyph-props ---------------------------------------------------------
	# One instance per authored tile, centred, with a collider only where the kit
	# has a radius — a forest tile blocks through its terrain glyph, a scattered
	# tree through a circle.
	for z in height:
		var row := String(rows[z])
		for x in width:
			# The reference's glyph lookup differs from its walkability lookup on
			# a ragged row: there, a missing character falls back to grass rather
			# than void. Grass carries no prop, so nothing is placed either way —
			# but the two rules are kept distinct rather than tidied into one.
			var ch := row.substr(x, 1) if x < row.length() else UNKNOWN
			var cell: Dictionary = glyphs.get(ch, glyphs.get(UNKNOWN, {}))
			var prop := String(cell.get("prop", ""))
			if prop.is_empty():
				continue
			if not out.glyph_props.has(prop):
				out.glyph_props[prop] = []
			out.glyph_props[prop].append(Vector2i(x, z))
			var radius := float(radii.get(prop, 0.0))
			if radius > 0.0:
				grid.add_circle(x * tile + tile / 2.0, z * tile + tile / 2.0, radius, prop)

	# --- authored props ------------------------------------------------------
	var map_footprints: Dictionary = footprints.get(
		String(map_def.get("footprintKey", out.id)), {})
	# How many colliders have been taken from each position, because two props can
	# stand on the same spot and each is entitled to one collider. Without this,
	# both props read the whole list and the position ends up with twice the
	# geometry — which is invisible until a doorway is a tile narrower than it
	# looks.
	var taken := {}
	for p in map_def.get("props", []):
		var at: Array = p.get("at", [])
		if at.size() < 2:
			continue
		# `at` is not necessarily integral: half-tile placements are common, and
		# truncating one to a tile index moves the prop a metre. The footprint
		# table is keyed by the collider's world position for the same reason.
		var wx := float(at[0]) * tile
		var wz := float(at[1]) * tile
		var tag := String(p.get("id", p.get("kit", "prop")))
		var key := "%.2f,%.2f" % [wx, wz]
		var here: Array = map_footprints.get(key, [])
		var index := int(taken.get(key, 0))
		if index < here.size():
			taken[key] = index + 1
			var shape: Dictionary = here[index]
			if shape["kind"] == "circle":
				grid.add_circle(wx, wz, float(shape["r"]), tag)
			else:
				grid.add_rect(wx, wz, float(shape["w"]), float(shape["d"]),
					float(shape.get("rot", 0.0)), tag)

		# A building with `enter` gets a doorway on the outside of whichever face
		# carries its door, so walking into the door works instead of needing a
		# prompt. Derived, not harvested: it is arithmetic on authored numbers.
		if p.has("enter") and String(p.get("kit", "")) == "building":
			var face := String(p.get("door", "south"))
			var half_w := float(p.get("w", 6)) / 2.0
			var half_d := float(p.get("d", 5)) / 2.0
			var offsets := {
				"south": Vector2(0, half_d + 0.6), "north": Vector2(0, -half_d - 0.6),
				"east": Vector2(half_w + 0.6, 0), "west": Vector2(-half_w - 0.6, 0),
			}
			var offset: Vector2 = offsets.get(face, offsets["south"])
			var rot := float(p.get("rot", 0.0))
			var c := cos(rot)
			var s := sin(rot)
			grid.triggers.append({
				"x": wx + offset.x * c - offset.y * s - tile / 2.0,
				"z": wz + offset.x * s + offset.y * c - tile / 2.0,
				"w": tile, "d": tile, "kind": "exit",
				"data": {
					"to": p.get("enter"), "spawn": p.get("enterSpawn", "default"),
					"prompt": p.get("enterPrompt", "Enter"),
				},
			})

	# --- exits and scripted zones -------------------------------------------
	for e in map_def.get("exits", []):
		grid.triggers.append(_zone(e, "exit", tile))
	for t in map_def.get("triggers", []):
		grid.triggers.append(_zone(t, String(t.get("kind", "event")), tile))

	return out


static func _zone(spec: Dictionary, kind: String, tile: float) -> Dictionary:
	var at: Array = spec.get("at", [0, 0])
	var size: Array = spec.get("size", [1, 1])
	return {
		"x": float(at[0]) * tile, "z": float(at[1]) * tile,
		"w": float(size[0]) * tile, "d": float(size[1]) * tile,
		"kind": kind, "data": spec,
	}
