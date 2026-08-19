class_name Atmosphere
extends RefCounted
##
## The sky, the sun and the fog a map declares.
##
## Every map in this world carries an `sky` block — a zenith, a horizon, a ground colour, the
## sun's colour and where it is in the sky — and a `fog` of colour, near and far. The
## reference feeds them to its own renderer through `applyAtmosphere`; this feeds the same
## numbers to Godot's. They are authored colours, not computed ones: the difference between
## Harrowmere at noon and the Overwind under cloud is in that table and nowhere else, and a
## port that lit every map the same way would lose the one thing that tells you where you are.
##
## What is *not* carried across is the reference's grade and tilt-shift — a post-processing
## chain built for its own geometry, which this port replaced deliberately.

## Sun direction in the tables is a vector *towards* the sun, as the reference's lights read
## it.
static func apply(environment: Environment, sun: DirectionalLight3D, map_def: Dictionary) -> void:
	var sky_def: Dictionary = map_def.get("sky", {})
	if sky_def.is_empty():
		return

	var material := ProceduralSkyMaterial.new()
	material.sky_top_color = Color(String(sky_def.get("zenith", "#2f6494")))
	material.sky_horizon_color = Color(String(sky_def.get("horizon", "#a6bcb8")))
	material.ground_bottom_color = Color(String(sky_def.get("ground", "#565448")))
	material.ground_horizon_color = material.sky_horizon_color
	# Cloud cover thickens the horizon rather than drawing clouds: Godot's procedural sky has
	# no cloud layer, and a flat grey band at the horizon is what an overcast day looks like
	# from inside a village anyway.
	var cloud := float(sky_def.get("cloud", 0.0))
	material.sky_curve = lerpf(0.15, 0.5, clampf(cloud, 0.0, 1.0))
	material.sun_angle_max = 12.0
	material.sun_curve = 0.12

	var sky := Sky.new()
	sky.sky_material = material
	environment.background_mode = Environment.BG_SKY
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.ambient_light_energy = 1.0
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_SKY

	var fog: Array = map_def.get("fog", [])
	if fog.size() >= 3:
		environment.fog_enabled = true
		environment.fog_light_color = Color(String(fog[0]))
		# The table gives a near and a far in world units; Godot's fog is a density. Matched at
		# the far distance rather than fitted, which is close enough for a haze and keeps the
		# two numbers meaning what they say.
		environment.fog_density = 1.0 / maxf(40.0, float(fog[2]))
		environment.fog_sky_affect = 0.35
	else:
		environment.fog_enabled = false

	if sun != null:
		var direction: Array = sky_def.get("sunDir", [0.5, 0.55, 0.4])
		var towards := Vector3(float(direction[0]), float(direction[1]),
			float(direction[2])).normalized()
		if towards.length_squared() > 0.0:
			# A light points *along* its -Z, so it looks from the sun's position towards the
			# ground rather than the other way about.
			sun.look_at_from_position(towards * 100.0, Vector3.ZERO, Vector3.UP)
		sun.light_color = Color(String(sky_def.get("sunColor", "#ffdda0")))
		# Overcast days are dimmer and their shadows are softer, which is the only thing
		# `cloud` can honestly buy here.
		sun.light_energy = lerpf(1.5, 0.75, clampf(cloud, 0.0, 1.0))
		sun.shadow_blur = lerpf(1.0, 2.5, clampf(cloud, 0.0, 1.0))
