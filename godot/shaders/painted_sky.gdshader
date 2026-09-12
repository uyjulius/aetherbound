shader_type sky;

// A generated panorama supplies real cloud forms. The authored sky colours in
// each map still decide the place and time of day; the image contributes only
// the detail that a flat procedural gradient cannot carry.
uniform sampler2D sky_panorama : source_color, filter_linear_mipmap, repeat_enable;
uniform vec3 zenith_color : source_color = vec3(0.18, 0.39, 0.58);
uniform vec3 horizon_color : source_color = vec3(0.65, 0.74, 0.72);
uniform vec3 ground_color : source_color = vec3(0.34, 0.33, 0.28);
uniform float painted_strength : hint_range(0.0, 1.0) = 0.7;

void sky() {
	vec3 direction = normalize(EYEDIR);
	float longitude = atan(direction.x, -direction.z) / TAU + 0.5;
	float latitude = asin(clamp(direction.y, -1.0, 1.0)) / PI + 0.5;
	vec3 painted = texture(sky_panorama, vec2(fract(longitude), latitude)).rgb;

	float height = abs(direction.y);
	vec3 tint = direction.y >= 0.0
		? mix(horizon_color, zenith_color, smoothstep(0.0, 0.92, height))
		: mix(horizon_color, ground_color, smoothstep(0.0, 0.82, height));

	// Retain the panorama's value structure and a trace of its warm/cool colour
	// separation while bringing every sky back under its map's authored palette.
	float value = dot(painted, vec3(0.299, 0.587, 0.114));
	float shaped = smoothstep(0.08, 0.94, value);
	vec3 coloured_detail = tint * mix(0.46, 1.20, shaped);
	coloured_detail += (painted - vec3(value)) * 0.16;
	COLOR = mix(tint, max(coloured_detail, vec3(0.0)), painted_strength);
}
