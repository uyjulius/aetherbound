class_name Scenery
extends Node3D
##
## The world, built out of hand-made models placed at authored coordinates.
##
## The reference *computes* its scenery: a lamppost is a lathe and a cylinder, a house is a
## box extruded from `w`, `d` and `h` with a roof solved from `rise`, and the ground is a
## quad the size of the map. None of that crosses. Nothing in this game may be
## procedurally generated, and moving the same arithmetic into a modelling package would be
## the same mistake with an extra step — so every mesh here was made by a person, obtained
## from poly.pizza, and is credited in `assets/props/CREDITS.md`.
##
## What the port keeps is the *placement*, which is the part that was authored: a chest at
## `[16.5, 8.5]`, a house six units by four facing south, a cobbled street where the terrain
## says cobble. `tools/plan-scenery.mjs` works out what scale each model has to be placed at
## by dividing the collider it must fill — the same colliders `tools/field-parity.mjs`
## already checks placement for placement — by the model's own size. So a wrong number here
## can only look wrong; it cannot change where a body can walk.
##
## Ground and blocked tiles are drawn with `MultiMeshInstance3D`, one per material: the
## overworld has 2,816 tiles and 45 triggers, and 2,816 nodes would be 2,816 nodes.
##
## What is lost, and worth naming rather than hiding: the reference's per-building variation
## — storeys, timbering, chimneys, awnings, balconies — was arithmetic over those same
## fields, and six house models cannot reproduce it. A plaster town still does not look like
## a marble one.

const PLAN := "res://assets/props/placement.json"
const TEXTURES := "res://assets/textures/"

var plan: Dictionary = {}
## Loaded scenes, by file name.
var _scenes: Dictionary = {}
var _materials: Dictionary = {}
var _missing: Dictionary = {}
## Counted for the check in `tools/web-smoke.mjs`: a world that builds no scenery looks
## exactly like a world whose camera is pointing the wrong way.
var placed := 0
var tiles := 0
var _glyphs: Dictionary = {}


func _init() -> void:
	if not FileAccess.file_exists(PLAN):
		push_warning("no scenery plan — run `npm run scenery`")
		return
	var parsed: Variant = JSON.parse_string(
		FileAccess.open(PLAN, FileAccess.READ).get_as_text())
	plan = parsed if parsed is Dictionary else {}


## Build one map's scenery.
##
## `built` is what `MapBuild.build` returned — the width, height and grid — and `glyphs` is
## the legend's glyph table, which is what says whether a `~` is water and a `#` is a wall.
func build(map_def: Dictionary, built, glyphs: Dictionary) -> void:
	_glyphs = glyphs
	for child in get_children():
		child.queue_free()
	placed = 0
	tiles = 0
	if plan.is_empty():
		return
	_pave(map_def, built)
	_place_props(map_def)
	_place_glyph_props(map_def, built)
	print("SCENERY map=%s props=%d tiles=%d" % [
		String(map_def.get("id", "?")), placed, tiles])


# ---------------------------------------------------------------------------
# The ground
# ---------------------------------------------------------------------------

## Pave every tile, and raise a block on the blocked ones.
##
## Grouped by material rather than by tile: a town uses two or three grounds out of the
## twelve, so this ends up as a handful of draw calls whatever the size of the map.
func _pave(map_def: Dictionary, built) -> void:
	var tile: float = float(plan.get("tile", 2))
	var piece: Dictionary = plan.get("pieces", {}).get("floor", {})
	if piece.is_empty():
		return
	var found := _mesh_of(String(piece.get("file", "")))
	if found.is_empty():
		return
	var mesh: Mesh = found["mesh"]
	# The mesh's own place inside its model. A glTF's root node often carries a scale — the
	# ground block's mesh is two *centimetres* across and its node multiplies it by a
	# hundred — so the node's transform has to be folded into every instance. Ignoring it
	# paved every map in pieces a hundred times too small, which looked exactly like no
	# ground at all.
	var inner: Transform3D = found["transform"]
	var model: Array = piece.get("model", [1, 1, 1])

	# Where each material's instances go. `ground` and `wall` are separate because a
	# blocked tile is a different surface from the floor beside it.
	var floors := {}
	var walls := {}
	var rows: Array = map_def.get("terrain", [])
	var base_ground := String(map_def.get("base", "grass"))
	var wall_height := float(map_def.get("wallHeight", 3.0))

	for z in built.height:
		var row: String = String(rows[z]) if z < rows.size() else ""
		for x in built.width:
			var glyph := row.substr(x, 1) if x < row.length() else ""
			var spec: Dictionary = _glyphs.get(glyph, {})
			var ground := String(spec.get("g", base_ground)) if not spec.is_empty() \
				else base_ground
			if bool(spec.get("void", false)):
				continue
			tiles += 1
			var at := Vector3((float(x) + 0.5) * tile, 0.0, (float(z) + 0.5) * tile)
			if bool(spec.get("wall", false)) or bool(spec.get("cliff", false)):
				# A block the height of the map's walls, sitting on the floor.
				var scale := Vector3(tile / float(model[0]), wall_height / float(model[1]),
					tile / float(model[2]))
				var transform := Transform3D(Basis().scaled(scale),
					at + Vector3(0, wall_height * 0.5, 0)) * inner
				var surface := String(plan.get("walls", {}).get(ground, {}).get("texture", ""))
				if surface.is_empty():
					surface = "stone_wall.png"
				walls[surface] = walls.get(surface, []) + [transform]
			else:
				# The floor: a thin slab, its top at zero. Water sits lower so the shallows
				# read as water rather than as a blue floor.
				var thickness := 0.4
				var drop := 0.0
				if bool(spec.get("water", false)):
					drop = -0.35 if bool(spec.get("shallow", false)) else -0.7
				var scale := Vector3(tile / float(model[0]), thickness / float(model[1]),
					tile / float(model[2]))
				var transform := Transform3D(Basis().scaled(scale),
					at + Vector3(0, drop - thickness * 0.5, 0)) * inner
				var texture := String(plan.get("ground", {}).get(ground, {}).get("texture", ""))
				if bool(spec.get("water", false)):
					texture = "water"
				if texture.is_empty():
					texture = "grass.png"
				floors[texture] = floors.get(texture, []) + [transform]

	for texture in floors:
		_add_multimesh(mesh, floors[texture], texture, tile)
	for texture in walls:
		_add_multimesh(mesh, walls[texture], texture, tile)


func _add_multimesh(mesh: Mesh, transforms: Array, texture: String, tile: float) -> void:
	var multi := MultiMesh.new()
	multi.transform_format = MultiMesh.TRANSFORM_3D
	multi.mesh = mesh
	multi.instance_count = transforms.size()
	var bounds := AABB(transforms[0].origin, Vector3.ZERO)
	for i in transforms.size():
		multi.set_instance_transform(i, transforms[i])
		bounds = bounds.expand(transforms[i].origin)
	var node := MultiMeshInstance3D.new()
	node.multimesh = multi
	node.material_override = _material(texture, tile)
	# Given explicitly, and this is not an optimisation. A MultiMesh does not grow its own
	# bounding box as instances are written into it, so the whole floor of every map was
	# being culled as a zero-sized volume at the origin: the props drew, the ground did not,
	# and the world looked like a village floating in the sky. Grown by a tile in every
	# direction because the box measured here is of instance *origins*, not of their meshes.
	node.custom_aabb = bounds.grow(tile * 2.0)
	add_child(node)


## A material for a texture plate, made once and shared.
##
## The plates are the reference's own — the same twenty-one images its ground and walls are
## surfaced with — so the two builds are made of the same stuff rather than of two sets of
## materials that merely resemble each other.
func _material(texture: String, tile: float) -> StandardMaterial3D:
	if _materials.has(texture):
		return _materials[texture]
	var material := StandardMaterial3D.new()
	if texture == "water":
		# The one surface with no plate: the reference tints and animates it, and a still
		# blue is a better placeholder than a stone floor under the sea.
		material.albedo_color = Palette.ramp_at("water", 0.55)
		material.metallic = 0.2
		material.roughness = 0.15
	else:
		var path := TEXTURES + texture
		if ResourceLoader.exists(path):
			material.albedo_texture = load(path)
			# Triplanar, and not for the usual reason. These models are flat-shaded: their
			# UVs point at single pixels of a small colour strip rather than covering a
			# surface, so a plate mapped through them samples one pixel and the whole floor
			# comes out a flat average of the texture — which is precisely what the first
			# paved map looked like. Triplanar mapping takes its coordinates from world
			# position instead, so the plate tiles across the ground the way it does in the
			# reference and the seams between tiles disappear.
			material.uv1_triplanar = true
			material.uv1_scale = Vector3.ONE * (1.0 / tile)
		else:
			if not _missing.has(texture):
				_missing[texture] = true
				push_warning("no texture plate %s" % texture)
			material.albedo_color = Palette.ramp_at("stone", 0.5)
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	_materials[texture] = material
	return material


# ---------------------------------------------------------------------------
# The props
# ---------------------------------------------------------------------------

func _place_props(map_def: Dictionary) -> void:
	var tile: float = float(plan.get("tile", 2))
	for prop in map_def.get("props", []):
		var kit := String(prop.get("kit", ""))
		var at: Array = prop.get("at", [0, 0])
		var world := Vector3(float(at[0]) * tile, float(prop.get("y", 0.0)),
			float(at[1]) * tile)
		var yaw := float(prop.get("rot", 0.0))
		var node: Node3D = null

		if kit == "building":
			node = _building(prop)
		else:
			var spec: Dictionary = plan.get("kits", {}).get(kit, {})
			if spec.is_empty():
				if not _missing.has(kit):
					_missing[kit] = true
					push_warning("no model for kit %s" % kit)
				continue
			node = _instance(String(spec["file"]))
			if node == null:
				continue
			var scale := float(spec.get("scale", 1.0)) * float(prop.get("scale", 1.0))
			node.scale = Vector3(scale, scale, scale)
			world.y += float(spec.get("y", 0.0))
			yaw += float(spec.get("yaw", 0.0))
		if node == null:
			continue
		node.position = world
		node.rotation.y = yaw
		add_child(node)
		placed += 1


## A house, scaled to the box the map declares for it.
##
## `w`, `d` and `h` are authored per placement and the reference builds to fit, so the model
## is stretched to the same box rather than placed at one size. A house squashed to its
## declared footprint is closer to the authored world than a house that ignores it.
func _building(prop: Dictionary) -> Node3D:
	var style := String(prop.get("style", "plaster"))
	var spec: Dictionary = plan.get("buildings", {}).get(style, {})
	if spec.is_empty():
		spec = plan.get("buildings", {}).get("plaster", {})
	if spec.is_empty():
		return null
	var node := _instance(String(spec["file"]))
	if node == null:
		return null
	var model: Array = spec.get("model", [1, 1, 1])
	var height := float(prop.get("h", 4.0)) + float(prop.get("rise", 0.0))
	node.scale = Vector3(
		float(prop.get("w", 6.0)) / maxf(0.001, float(model[0])),
		height / maxf(0.001, float(model[1])),
		float(prop.get("d", 4.0)) / maxf(0.001, float(model[2])))
	node.position.y = -float(spec.get("base", 0.0)) * node.scale.y
	return node


## The props the terrain itself places: a `t` is a tree, an `f` is dense wood.
func _place_glyph_props(map_def: Dictionary, built) -> void:
	var tile: float = float(plan.get("tile", 2))
	var rows: Array = map_def.get("terrain", [])
	for z in built.height:
		var row: String = String(rows[z]) if z < rows.size() else ""
		for x in built.width:
			var glyph := row.substr(x, 1) if x < row.length() else ""
			var spec: Dictionary = _glyphs.get(glyph, {})
			var name := String(spec.get("prop", ""))
			if name.is_empty():
				continue
			var plan_spec: Dictionary = plan.get("glyphs", {}).get(name, {})
			if plan_spec.is_empty():
				continue
			var node := _instance(String(plan_spec["file"]))
			if node == null:
				continue
			var scale := float(plan_spec.get("scale", 1.0))
			node.scale = Vector3(scale, scale, scale)
			node.position = Vector3((float(x) + 0.5) * tile,
				float(plan_spec.get("y", 0.0)), (float(z) + 0.5) * tile)
			# Turned by the tile it stands on rather than at random: a forest of trees all
			# facing the same way reads as wallpaper, and `randf()` would make two runs of
			# the same map different worlds.
			node.rotation.y = float((x * 7 + z * 13) % 12) * PI / 6.0
			add_child(node)
			placed += 1


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------

func _instance(file: String) -> Node3D:
	var scene := _scene_of(file)
	return scene.instantiate() if scene != null else null


func _scene_of(file: String) -> PackedScene:
	if _scenes.has(file):
		return _scenes[file]
	var path := "res://assets/props/%s" % file
	if not ResourceLoader.exists(path):
		if not _missing.has(file):
			_missing[file] = true
			push_warning("no model at %s" % path)
		return null
	var scene: PackedScene = load(path)
	_scenes[file] = scene
	return scene


## The first mesh inside a model, and where it sits inside it.
##
## A MultiMesh draws one mesh many times, so the ground piece has to be a mesh rather than a
## scene — and a mesh on its own is not enough, because its node may carry a transform that
## is the difference between two units and two centimetres. Returns `{mesh, transform}`, or
## `{}` when the model has no mesh in it.
##
## Taking the *first* mesh is right for the twelve-triangle block the ground is paved with
## and would be wrong for a model made of several parts, which is why the ground piece is
## chosen to be a single mesh.
func _mesh_of(file: String) -> Dictionary:
	var key := "mesh:%s" % file
	if _scenes.has(key):
		return _scenes[key]
	var scene := _scene_of(file)
	if scene == null:
		return {}
	var root := scene.instantiate()
	var found: Dictionary = {}
	var stack: Array = [[root, Transform3D.IDENTITY]]
	while not stack.is_empty():
		var entry: Array = stack.pop_back()
		var node: Node = entry[0]
		var world: Transform3D = entry[1]
		if node is Node3D:
			world = world * (node as Node3D).transform
		if node is MeshInstance3D and (node as MeshInstance3D).mesh != null:
			found = {"mesh": (node as MeshInstance3D).mesh, "transform": world}
			break
		for child in node.get_children():
			stack.append([child, world])
	root.queue_free()
	_scenes[key] = found
	return found
