class_name Sound
extends Node
##
## The music and the sound effects.
##
## One node, parented to the tree root rather than to a scene, because music is the one
## thing in this game that has to survive a scene change: the title's theme should carry
## into the field rather than stop dead at the front door.
##
## Reached through static functions like everything else global in this port — `Palette`,
## `Actions`, `RngStreams`. An autoload would do the same job, but a singleton registered
## at startup is invisible to `godot --check-only`, and every script that touched it would
## stop being checkable; a `class_name` is in the parser's class cache and stays checked.
##
## The reference *performs* its score — a Web Audio graph, thirty-six tracks of note data,
## instruments modelled from oscillator stacks. None of that can cross to GDScript, and a
## second synthesiser here would be a different set of instruments wearing the same
## names. So `tools/render-music.mjs` renders the score through the reference's own engine
## at build time and this plays the files. Two things are genuinely lost and are worth
## naming rather than hiding: a track can no longer add a counter-melody when somebody is
## near death, and a town cannot drop to solo harp indoors. What is kept is everything the
## player hears most — the writing, the instruments, the seamless loop, and the crossfade
## between one place and the next.
##
## The loop is seamless because of how the files are made rather than because of anything
## here: each is the *second* pass of a double-length render, so the reverb tail that
## would be ringing at the moment a live loop wraps is already in the audio.

## Where the rendered score lives, and what is in it.
const MANIFEST := "res://audio/manifest.json"

## Volumes, matching the reference's defaults. `master` is applied to both buses.
const DEFAULT_VOLUMES := {"master": 0.8, "music": 0.65, "sfx": 0.8}

## How many effects can overlap. A menu cursor is not worth cutting a hit sound off for.
const SFX_VOICES := 8

var manifest: Dictionary = {}
var volumes: Dictionary = DEFAULT_VOLUMES.duplicate()
## The track playing, or "" for silence.
var playing := ""

## Two players, so one can fade out while the other fades in.
var _decks: Array[AudioStreamPlayer] = []
var _deck := 0
var _sfx: Array[AudioStreamPlayer] = []
var _next_voice := 0
var _fades: Array[Tween] = [null, null]
var _streams: Dictionary = {}
var _missing: Dictionary = {}
## Asked for before the node was in the tree. `AudioStreamPlayer.play` needs a tree, and
## the first request arrives from a `_ready` — which is exactly when a node cannot be
## added — so it is deferred and replayed here.
var _pending := {}

static var _me: Sound


# ---------------------------------------------------------------------------
# The static face
# ---------------------------------------------------------------------------

static func _instance() -> Sound:
	if _me != null and is_instance_valid(_me):
		return _me
	_me = Sound.new()
	_me.name = "Sound"
	# Deferred: a caller in its own `_ready` cannot add a sibling to the root, and every
	# first request comes from exactly there.
	Engine.get_main_loop().root.add_child.call_deferred(_me)
	return _me


static func play_music(id: String, fade := 1.2) -> void:
	_instance()._play_music(id, fade)


static func stop_music(fade := 1.0) -> void:
	_instance()._stop_music(fade)


static func cue(id: String) -> void:
	_instance()._cue(id)


static func sfx(name: String) -> void:
	_instance()._sfx_play(name)


static func now_playing() -> String:
	return _instance().playing


static func set_volume(kind: String, value: float) -> void:
	_instance()._apply_volume(kind, value)


# ---------------------------------------------------------------------------
# The node
# ---------------------------------------------------------------------------

func _ready() -> void:
	# Never paused with the game: a pause menu with the music cut is a pause menu that
	# feels like a crash.
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load_manifest()
	for i in 2:
		var deck := AudioStreamPlayer.new()
		deck.bus = "Master"
		deck.volume_db = -80.0
		add_child(deck)
		_decks.append(deck)
	for i in SFX_VOICES:
		var voice := AudioStreamPlayer.new()
		voice.bus = "Master"
		add_child(voice)
		_sfx.append(voice)
	print("AUDIO_READY music=%d sfx=%d" % [
		Dictionary(manifest.get("music", {})).size(),
		Dictionary(manifest.get("sfx", {})).size()])
	if not _pending.is_empty():
		var wanted := _pending
		_pending = {}
		_play_music(String(wanted["id"]), float(wanted["fade"]))


func _load_manifest() -> void:
	if not FileAccess.file_exists(MANIFEST):
		push_warning("no audio manifest — run `npm run render:music`")
		return
	var parsed: Variant = JSON.parse_string(
		FileAccess.open(MANIFEST, FileAccess.READ).get_as_text())
	manifest = parsed if parsed is Dictionary else {}


# ---------------------------------------------------------------------------
# Music
# ---------------------------------------------------------------------------

## Start a track, crossfading from whatever is playing.
##
## Asking for the track already playing does nothing, which is what makes it safe for
## every map arrival to call this: walking between two maps that share a theme should not
## restart it.
func _play_music(id: String, fade := 1.2) -> void:
	if id == playing:
		return
	if not is_inside_tree():
		# Remembered, not dropped, and only the latest: whatever the game asked for last
		# is what it wants when the audio node arrives a frame later.
		_pending = {"id": id, "fade": fade}
		return
	var stream := _music_stream(id)
	if stream == null:
		# Said once per missing track rather than every time a door opens.
		if not _missing.has(id):
			_missing[id] = true
			push_warning("no rendered audio for track %s" % id)
		return

	var from := _deck
	var to := 1 - _deck
	_deck = to
	playing = id

	var deck := _decks[to]
	deck.stream = stream
	deck.volume_db = -80.0
	deck.play()
	_fade(to, _music_db(), fade)
	if _decks[from].playing:
		_fade(from, -80.0, fade, true)
	print("MUSIC %s fade=%.2f" % [id, fade])


func _stop_music(fade := 1.0) -> void:
	_pending = {}
	if playing.is_empty():
		return
	playing = ""
	_fade(_deck, -80.0, fade, true)
	print("MUSIC_STOP")


## A one-shot cue over whatever is playing — a fanfare, a chest.
##
## The reference plays these through the music path and lets them stop rather than loop,
## then whatever the caller queues next takes over. Here they are effects: they do not
## displace the town's theme, so nothing has to remember to put it back.
func _cue(id: String) -> void:
	if not is_inside_tree():
		return
	var stream := _music_stream(id)
	if stream == null:
		return
	var voice := _sfx[_next_voice]
	_next_voice = (_next_voice + 1) % SFX_VOICES
	voice.stream = stream
	voice.volume_db = _db(volumes["master"] * volumes["music"])
	voice.play()


func _music_stream(id: String) -> AudioStream:
	var music: Dictionary = manifest.get("music", {})
	if not music.has(id):
		return null
	if _streams.has(id):
		return _streams[id]
	var path := "res://audio/%s" % String(music[id].get("file", ""))
	if not ResourceLoader.exists(path):
		return null
	var stream: AudioStream = load(path)
	if stream is AudioStreamOggVorbis:
		# Set here rather than in an import file: the loop is a property of the *score*,
		# and the manifest is what knows whether a track is a loop or a one-shot cue.
		stream.loop = bool(music[id].get("loop", true))
	_streams[id] = stream
	return stream


# ---------------------------------------------------------------------------
# Effects
# ---------------------------------------------------------------------------

func _sfx_play(name: String) -> void:
	if not is_inside_tree():
		return
	var bank: Dictionary = manifest.get("sfx", {})
	if not bank.has(name):
		return
	var key := "sfx:%s" % name
	var stream: AudioStream
	if _streams.has(key):
		stream = _streams[key]
	else:
		var path := "res://audio/%s" % String(bank[name].get("file", ""))
		if not ResourceLoader.exists(path):
			return
		stream = load(path)
		if stream is AudioStreamOggVorbis:
			stream.loop = false
		_streams[key] = stream
	# Round-robin rather than one player: a cursor moving quickly must not cut off the
	# hit sound from the swing that is still landing.
	var voice := _sfx[_next_voice]
	_next_voice = (_next_voice + 1) % SFX_VOICES
	voice.stream = stream
	voice.volume_db = _db(volumes["master"] * volumes["sfx"])
	voice.play()


# ---------------------------------------------------------------------------
# Mix
# ---------------------------------------------------------------------------

func _apply_volume(kind: String, value: float) -> void:
	volumes[kind] = clampf(value, 0.0, 1.0)
	if not playing.is_empty():
		_decks[_deck].volume_db = _music_db()


func _music_db() -> float:
	return _db(volumes["master"] * volumes["music"])


## Linear amplitude to decibels, with silence as a floor rather than negative infinity.
func _db(amplitude: float) -> float:
	return -80.0 if amplitude <= 0.0001 else linear_to_db(amplitude)


func _fade(which: int, to_db: float, seconds: float, stop_after := false) -> void:
	if _fades[which] != null and _fades[which].is_valid():
		_fades[which].kill()
	var deck := _decks[which]
	if seconds <= 0.0:
		deck.volume_db = to_db
		if stop_after:
			deck.stop()
		return
	var tween := create_tween()
	tween.tween_property(deck, "volume_db", to_db, seconds)
	if stop_after:
		tween.tween_callback(deck.stop)
	_fades[which] = tween
