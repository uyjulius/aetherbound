class_name Effects
extends RefCounted
##
## Mesh-based effects, ported from the second half of `src/fx/particles.js`.
##
## Five shapes that particles cannot make: a spinning magic circle, an expanding shockwave, a
## beam of light, a crescent slash, and a jagged bolt. All additive, all unshaded, all built
## from primitives so there is nothing to load.
##
## Every builder takes the parent it should live under rather than adding itself to a scene:
## a battle stage is freed when the fight ends, and an effect parented anywhere else outlives
## the fight it belongs to.


## Additive, unshaded, double-sided — the reference's `additiveMaterial`.
static func _additive(color: Color, opacity := 1.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(color.r, color.g, color.b, opacity)
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.no_depth_test = false
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return mat


static func _ring_mesh(inner: float, outer: float, segments: int,
		arc := TAU) -> ArrayMesh:
	var verts := PackedVector3Array()
	var uvs := PackedVector2Array()
	for i in segments:
		var a0 := arc * float(i) / float(segments)
		var a1 := arc * float(i + 1) / float(segments)
		var i0 := Vector3(cos(a0) * inner, sin(a0) * inner, 0.0)
		var i1 := Vector3(cos(a1) * inner, sin(a1) * inner, 0.0)
		var o0 := Vector3(cos(a0) * outer, sin(a0) * outer, 0.0)
		var o1 := Vector3(cos(a1) * outer, sin(a1) * outer, 0.0)
		verts.append_array([i0, o0, o1, i0, o1, i1])
		uvs.append_array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1),
			Vector2(0, 0), Vector2(1, 1), Vector2(0, 1)])
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


static func _plate(mesh: Mesh, color: Color, opacity: float) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.set_surface_override_material(0, _additive(color, opacity))
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return node


## Concentric rings with tick marks, laid flat and spinning. The single most recognisable
## "a spell is being cast here" signal in the genre, and it costs three meshes.
static func magic_circle(parent: Node3D, pos: Vector3, color := Color(0.25, 0.78, 0.84),
		radius := 1.6) -> Node3D:
	var group := Node3D.new()
	group.position = pos + Vector3(0.0, 0.05, 0.0)
	group.rotation.x = -PI / 2.0

	group.add_child(_plate(_ring_mesh(0.92, 1.0, 64), color, 0.9))
	group.add_child(_plate(_ring_mesh(0.52, 0.58, 48), color, 0.7))

	var ticks := Node3D.new()
	for i in 12:
		var a := (float(i) / 12.0) * TAU
		var quad := QuadMesh.new()
		quad.size = Vector2(0.06, 0.22)
		var tick := _plate(quad, color, 0.85)
		tick.position = Vector3(cos(a) * 0.76, sin(a) * 0.76, 0.0)
		tick.rotation.z = a
		ticks.add_child(tick)
	group.add_child(ticks)

	group.scale = Vector3.ONE * radius
	parent.add_child(group)
	return group


## An expanding ring, flat to the ground. The band is deliberately thin: a wide ring scaled up
## reads as an opaque coloured disc lying on the floor rather than a wave travelling outward.
static func shockwave(parent: Node3D, pos: Vector3, color := Color(1, 1, 1)) -> MeshInstance3D:
	var node := _plate(_ring_mesh(0.88, 1.0, 64), color, 0.85)
	node.position = pos + Vector3(0.0, 0.08, 0.0)
	node.rotation.x = -PI / 2.0
	node.scale = Vector3.ONE * 0.2
	parent.add_child(node)
	return node


## A vertical beam of light.
static func light_pillar(parent: Node3D, pos: Vector3, color := Color(1, 0.95, 0.72),
		radius := 0.9, height := 9.0) -> MeshInstance3D:
	var cyl := CylinderMesh.new()
	cyl.top_radius = 1.0
	cyl.bottom_radius = 1.0
	cyl.height = 1.0
	cyl.radial_segments = 20
	cyl.cap_top = false
	cyl.cap_bottom = false
	var node := _plate(cyl, color, 0.75)
	# The reference translates its cylinder so the beam grows up from its base rather than
	# sinking half its height into the floor.
	node.position = pos + Vector3(0.0, height * 0.5, 0.0)
	node.scale = Vector3(radius, height, radius)
	parent.add_child(node)
	return node


## A crescent slash plane, swept through an arc.
static func slash_arc(parent: Node3D, pos: Vector3, color := Color(1, 1, 1),
		radius := 1.8) -> MeshInstance3D:
	var node := _plate(_ring_mesh(0.55, 1.0, 32, PI * 0.7), color, 1.0)
	node.position = pos
	node.scale = Vector3.ONE * radius
	parent.add_child(node)
	return node


## Jagged lightning between two points, built as a chain of thin quads.
static func lightning_bolt(parent: Node3D, from: Vector3, to: Vector3,
		color := Color(1, 0.89, 0.37), segments := 9, jitter := 0.7) -> Node3D:
	var group := Node3D.new()
	var dir := to - from
	var axis := dir.normalized()
	var side := Vector3.UP.cross(axis).normalized()
	if side.length_squared() < 0.0001:
		side = Vector3.RIGHT
	var up := axis.cross(side).normalized()

	var prev := from
	for i in range(1, segments + 1):
		var t := float(i) / float(segments)
		var point := from + dir * t
		if i < segments:
			# Deviation peaks in the middle of the run — a bolt is pinned at both ends.
			var wobble := sin(t * PI) * jitter
			point += side * ((randf() - 0.5) * wobble * 2.0)
			point += up * ((randf() - 0.5) * wobble * 2.0)
		var quad := QuadMesh.new()
		quad.size = Vector2(prev.distance_to(point), 0.12 + randf() * 0.1)
		var seg := _plate(quad, color, 1.0)
		seg.position = (prev + point) * 0.5
		# A quad faces +Z and the segment runs along its own length, so look down the run and
		# then turn a quarter turn to put the face broadside to the camera.
		if not seg.position.is_equal_approx(point):
			seg.look_at_from_position(seg.position, point, Vector3.UP)
			seg.rotate_object_local(Vector3.UP, PI / 2.0)
		group.add_child(seg)
		prev = point
	parent.add_child(group)
	return group


## Fade anything this file built. Walks the node and its children, because a magic circle is
## three meshes and a bolt is nine.
static func set_opacity(node: Node, alpha: float) -> void:
	if node is MeshInstance3D:
		var mesh_node := node as MeshInstance3D
		var mat := mesh_node.get_surface_override_material(0) as StandardMaterial3D
		if mat != null:
			mat.albedo_color.a = alpha
	for child in node.get_children():
		set_opacity(child, alpha)


static func dispose_effect(node: Node) -> void:
	if node != null and is_instance_valid(node):
		node.queue_free()
