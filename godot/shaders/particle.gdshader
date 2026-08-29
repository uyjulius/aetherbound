shader_type spatial;
render_mode blend_add, unshaded, cull_disabled, depth_draw_never, shadows_disabled;

// Size and alpha ride in INSTANCE_CUSTOM; the lerped colour rides in per-instance COLOR.
// The reference clamps the on-screen size so a particle drifting toward the camera cannot
// become a screen-filling blob — the same clamp is applied here in view space.
//
// INSTANCE_CUSTOM is a vertex-only built-in in Godot's shader language (unlike COLOR, which
// is readable in both stages) — reading it from fragment() is a compile error under both the
// Compatibility renderer and Forward+. The alpha component crosses the vertex/fragment
// boundary through this varying instead.
varying float v_alpha;

void vertex() {
	float size = clamp(INSTANCE_CUSTOM.x, 0.0, 6.0);
	v_alpha = INSTANCE_CUSTOM.y;
	// Billboard: strip the rotation out of the model-view matrix and re-apply scale.
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
		vec4(size, 0.0, 0.0, 0.0),
		vec4(0.0, size, 0.0, 0.0),
		vec4(0.0, 0.0, size, 0.0),
		MODEL_MATRIX[3]);
}

void fragment() {
	// Soft radial falloff with a hot core — the reference's own two-term curve. A hard-edged
	// sprite is the single most common way stylised VFX end up looking cheap.
	vec2 d = UV - vec2(0.5);
	float r = length(d) * 2.0;
	if (r > 1.0) discard;
	float edge = 1.0 - smoothstep(0.35, 1.0, r);
	float core = 1.0 - smoothstep(0.0, 0.45, r);
	ALBEDO = COLOR.rgb * (1.0 + core * 1.35);
	ALPHA = edge * v_alpha * COLOR.a;
}
