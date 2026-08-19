class_name Telemetry
extends Node
##
## Mixpanel instrumentation, ported.
##
## The JS build has sent this since it went up, and when the Godot port took the site's root
## the game stopped reporting anything at all — not because anybody decided to stop measuring
## it, but because the thing being measured moved. So this is the same instrumentation, to the
## same project, under the same three rules the reference states:
##
##   1. It can never break the game. Every send is fire-and-forget, every failure is
##      swallowed, and `track` before `init` or after a failure is a no-op.
##   2. It never sends anything about the person playing. Events carry game state — which map,
##      which boss, what level — and a random id generated on this device.
##   3. It stays out of the test suite. Playwright sets `navigator.webdriver`, and sixty
##      browser checks would otherwise write sixty sessions of rubbish into the project.
##
## Do Not Track is deliberately not consulted, and that is stated rather than merely absent so
## nobody reads the missing check as an oversight: the header was discontinued by the W3C,
## removed from Safari, and never carried legal force. The opt-out that works is the explicit
## one — `?noanalytics` on the URL, or `localStorage['aetherbound.analytics'] = 'off'` — and
## both are honoured below, exactly as the reference honours them.
##
## The device id is read from the same `localStorage` key the JS build uses, so somebody who
## has been playing at this domain stays one person across the port rather than becoming a new
## visitor. Saves already cross that way; a player should not be counted twice for it.
##
## Outside a browser this does nothing at all. A desktop or editor run is a developer, and a
## developer's afternoon is not a play session.

## The project, the endpoint and the taxonomy arrive from `Database.analytics`, which
## `tools/to-godot.mjs` writes from the reference's own `EV` table. Nothing here re-types an
## event name: `tools/analytics-parity.mjs` holds the constants below against that file.

const ID_KEY := "aetherbound.mixpanel.id"
const OPT_KEY := "aetherbound.analytics"

## Send when the queue reaches this, or when the timer runs out — whichever comes first.
## Smaller and sooner than the reference's 20/10s: a browser tab can be closed without any
## warning a Godot build can hear, so the tail of a session is worth more here than the
## saving from a bigger batch.
const BATCH_SIZE := 8
const BATCH_SECONDS := 6.0
const MAX_BATCH := 40
const MAX_QUEUE := 500

## How often a frame-rate sample goes out. A minute: often enough to see a session get worse,
## rare enough that it is a rounding error in the event count.
const SAMPLE_SECONDS := 60.0

# --- the events this port sends ---------------------------------------------
#
# Constants rather than lookups into the taxonomy, so a mistyped event is a parse error the
# type-checker catches rather than a silently missing event nobody notices for a month. What
# they are *worth* is that `tools/analytics-parity.mjs` proves every one of these strings is
# in the reference's table, and reports which of the reference's events this port does not
# send yet rather than letting the gap go unmentioned.
const APP_LOADED := "App Loaded"
const SESSION_STARTED := "Session Started"
const SESSION_ENDED := "Session Ended"
const TITLE_VIEWED := "Title Viewed"
const GAME_STARTED := "Game Started"
const GAME_LOADED := "Game Loaded"
const GAME_SAVED := "Game Saved"
const MAP_ENTERED := "Map Entered"
const MAP_FIRST_SEEN := "Map First Seen"
const DOOR_WARNING_SHOWN := "Door Warning Shown"
const DOOR_WARNING_IGNORED := "Door Warning Ignored"
const NPC_TALKED := "NPC Talked"
const PROP_INSPECTED := "Prop Inspected"
const CHEST_OPENED := "Chest Opened"
const SAVE_POINT_USED := "Save Point Used"
const INN_RESTED := "Inn Rested"
const AIRSHIP_BOARDED := "Airship Boarded"
const AIRSHIP_LANDED := "Airship Landed"
const CROSSING_USED := "Crossing Used"
const BATTLE_STARTED := "Battle Started"
const BATTLE_ENDED := "Battle Ended"
const PARTY_WIPED := "Party Wiped"
const COMMAND_USED := "Command Used"
const SPELL_CAST := "Spell Cast"
const ITEM_USED := "Item Used"
const BOSS_DEFEATED := "Boss Defeated"
const SHOP_OPENED := "Shop Opened"
const ITEM_BOUGHT := "Item Bought"
const ITEM_SOLD := "Item Sold"
const EQUIPMENT_CHANGED := "Equipment Changed"
const MENU_OPENED := "Menu Opened"
const CONFIG_CHANGED := "Config Changed"
const CONTROL_USED := "Control Used"
const ASSETS_LOADED := "Assets Loaded"
const PLAYER_STUCK := "Player Stuck"
const PLAYER_UNSTUCK := "Player Unstuck"
const STEPS_WALKED := "Steps Walked"
const GAME_COMPLETED := "Game Completed"
const SUMMON_USED := "Summon Used"
const LIMIT_USED := "Limit Used"
const ROW_CHANGED := "Row Changed"
const ENEMY_SCANNED := "Enemy Scanned"
const STEAL_ATTEMPTED := "Steal Attempted"
const ENEMY_KILLED := "Enemy Killed"
const CHARACTER_KO := "Character KO"
const BATTLE_FLED := "Battle Fled"
const LEVEL_GAINED := "Level Gained"
const ESPER_EQUIPPED := "Esper Equipped"
const ESPER_ACQUIRED := "Esper Acquired"
const CHARACTER_RECRUITED := "Character Recruited"
const SPELL_LEARNED := "Spell Learned"
const QUEST_STARTED := "Quest Started"
const QUEST_ADVANCED := "Quest Advanced"
const QUEST_COMPLETED := "Quest Completed"
const STORY_FLAG_SET := "Story Flag Set"
const WORLD_STATE_CHANGED := "World State Changed"
const MENU_SCREEN_VIEWED := "Menu Screen Viewed"
const DIALOGUE_SKIPPED := "Dialogue Skipped"
const PERFORMANCE_SAMPLED := "Performance Sampled"
const WEAKNESS_HIT := "Weakness Hit"
const ATTACK_ABSORBED := "Attack Absorbed"

var enabled := false
## Why not, when not — the browser check reads this and insists on "automated browser".
var reason := "not started"
var sent := 0
var failed := 0

var _config: Dictionary = {}
var _queue: Array = []
var _super: Dictionary = {}
var _counts: Dictionary = {}
var _seen: Dictionary = {}
var _distinct := ""
var _session := ""
var _started := 0.0
var _since_flush := 0.0
var _since_sample := 0.0
var _uptime := 0.0
## Held so the browser does not collect the callback while the listener still points at it.
var _leave_callback: JavaScriptObject
var _left := false

static var _me: Telemetry


# ---------------------------------------------------------------------------
# The static face
# ---------------------------------------------------------------------------

static func _instance() -> Telemetry:
	if _me != null and is_instance_valid(_me):
		return _me
	_me = Telemetry.new()
	_me.name = "Telemetry"
	Engine.get_main_loop().root.add_child.call_deferred(_me)
	return _me


## Called once, from the title screen, with the build's version and the exported taxonomy.
static func start(version: String, config: Dictionary) -> void:
	_instance()._start(version, config)


## Everything below `start` asks `_live` first, so nothing is ever built by a call to `track`.
## That matters outside the game as much as inside it: fifteen parity harnesses run this
## project headless, and a module that spawned a node the first time any of them touched the
## party would be instrumenting the test suite.
static func _live() -> Telemetry:
	if _me != null and is_instance_valid(_me) and _me.enabled:
		return _me
	return null


static func register(props: Dictionary) -> void:
	var me := _live()
	if me != null:
		me._register(props)


static func track(event: String, props: Dictionary = {}) -> void:
	var me := _live()
	if me != null:
		me._track(event, props)


## For anything that should be recorded once a session — the first time a map is seen, the
## first warning about a particular door.
static func once(key: String, event: String, props: Dictionary = {}) -> void:
	var me := _live()
	if me != null:
		me._once(key, event, props)


static func flush() -> void:
	var me := _live()
	if me != null:
		me._flush()


## For the console and for `tools/web-smoke.mjs`: is this instrumentation alive, and if not,
## why not.
static func summary() -> Dictionary:
	if _me == null or not is_instance_valid(_me):
		return {"enabled": false, "reason": "not started", "queued": 0, "sent": 0,
			"failed": 0, "events": {}}
	return {
		"enabled": _me.enabled, "reason": _me.reason, "queued": _me._queue.size(),
		"sent": _me.sent, "failed": _me.failed, "events": _me._counts.duplicate(),
	}


# ---------------------------------------------------------------------------
# The node
# ---------------------------------------------------------------------------

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func _start(version: String, config: Dictionary) -> void:
	_config = config
	if String(_config.get("token", "")) == "":
		reason = "no token"
		return

	# A developer at a desk is not a session. This ships to one place — a browser — and
	# anywhere else it stays silent rather than inventing a player.
	if not OS.has_feature("web"):
		reason = "not a browser"
		return
	# Asked as a number rather than a boolean: `JavaScriptBridge.eval` hands a JS `true` back as
	# 1, and `1 == true` is not what GDScript's Variant comparison makes of it — which is how
	# this check silently passed under Playwright and started instrumenting the test suite.
	if int(_js("navigator.webdriver === true ? 1 : 0")) == 1:
		reason = "automated browser"
		return
	var query := String(_js("location.search") if _js("location.search") != null else "")
	if query.contains("noanalytics"):
		reason = "opted out"
		return
	if _storage_get(OPT_KEY) == "off":
		reason = "opted out"
		return

	_distinct = _storage_get(ID_KEY)
	if _distinct == "":
		_distinct = _uuid()
		_storage_set(ID_KEY, _distinct)
	_session = _uuid()
	_started = Time.get_unix_time_from_system()
	enabled = true
	reason = "on"

	_register({
		"build": version,
		"session_id": _session,
		"engine": "godot %s" % Engine.get_version_info().get("string", ""),
		"renderer": String(ProjectSettings.get_setting(
			"rendering/renderer/rendering_method.web", "")),
		"viewport_width": DisplayServer.window_get_size().x,
		"viewport_height": DisplayServer.window_get_size().y,
		"language": OS.get_locale_language(),
		"hardware_threads": OS.get_processor_count(),
		"touch": DisplayServer.is_touchscreen_available(),
	})
	_install_leave_hook()
	_track(SESSION_STARTED, {})


func _register(props: Dictionary) -> void:
	for key in props:
		var value: Variant = props[key]
		if value == null:
			_super.erase(key)
		else:
			_super[key] = value


func _track(event: String, props: Dictionary) -> void:
	if not enabled or event == "":
		return
	_counts[event] = int(_counts.get(event, 0)) + 1
	var properties := {
		"token": String(_config.get("token", "")),
		"distinct_id": _distinct,
		"time": Time.get_unix_time_from_system(),
		# Mixpanel dedupes on this, which is what makes a retry safe.
		"$insert_id": _uuid(),
	}
	properties.merge(_super, true)
	properties.merge(_clean(props), true)
	_queue.append({"event": event, "properties": properties})
	if _queue.size() > MAX_QUEUE:
		_queue = _queue.slice(_queue.size() - MAX_QUEUE)
	if _queue.size() >= BATCH_SIZE:
		_flush()


func _once(key: String, event: String, props: Dictionary) -> void:
	if _seen.has(key):
		return
	_seen[key] = true
	_track(event, props)


func _process(delta: float) -> void:
	if not enabled:
		return
	# How the port actually runs on other people's machines, which is the one thing this
	# instrumentation can answer that no amount of local testing can: 37 MB of wasm under a
	# software rasteriser is a different game on a five-year-old laptop. Sampled once a minute
	# from the running average rather than the instantaneous frame, and never in the first ten
	# seconds, when the frame times belong to loading rather than to playing.
	_uptime += delta
	_since_sample += delta
	if _since_sample >= SAMPLE_SECONDS and _uptime > 10.0:
		_since_sample = 0.0
		_track(PERFORMANCE_SAMPLED, {
			"fps": Engine.get_frames_per_second(),
			"uptime_seconds": _uptime,
			"video_memory_mb": float(Performance.get_monitor(
				Performance.RENDER_VIDEO_MEM_USED)) / 1048576.0,
			"objects": Performance.get_monitor(Performance.OBJECT_COUNT),
		})
	if _queue.is_empty():
		return
	_since_flush += delta
	if _since_flush >= BATCH_SECONDS:
		_flush()


func _flush() -> void:
	_since_flush = 0.0
	if not enabled or _queue.is_empty():
		return
	var batch := _queue.slice(0, MAX_BATCH)
	_queue = _queue.slice(batch.size())
	var body := "data=%s&verbose=0" % JSON.stringify(batch).uri_encode()
	# `keepalive` so a send already in flight survives the page going away, and a swallowed
	# rejection so a blocked request is never an error in the console.
	var code := ("fetch(%s,{method:'POST',headers:"
		+ "{'Content-Type':'application/x-www-form-urlencoded'},body:%s,keepalive:true,"
		+ "mode:'cors'}).catch(function(){})") % [
			JSON.stringify(String(_config.get("endpoint", ""))), JSON.stringify(body)]
	if _js_run(code):
		sent += batch.size()
	else:
		failed += batch.size()


## The last thing a session says.
##
## A browser tab closes without telling a Godot build, so this rides a JS `pagehide`
## listener — the one event mobile Safari does deliver — and sends through `sendBeacon`,
## which survives the page being torn down where a `fetch` does not. If the callback bridge
## is unavailable the loss is one event per session, not a broken build, which is why the
## batches here are small and frequent in the first place.
func _install_leave_hook() -> void:
	if not enabled:
		return
	_leave_callback = JavaScriptBridge.create_callback(_on_leave)
	var window := JavaScriptBridge.get_interface("window")
	if window == null or _leave_callback == null:
		return
	window.addEventListener("pagehide", _leave_callback)


func _on_leave(_args: Array) -> void:
	if _left:
		return
	_left = true
	_track(SESSION_ENDED, {
		"session_seconds": Time.get_unix_time_from_system() - _started,
		"events_this_session": _total_events(),
	})
	# By beacon, not by fetch: the page is going away.
	var batch := _queue.slice(0, MAX_BATCH)
	_queue = _queue.slice(batch.size())
	if batch.is_empty():
		return
	var body := "data=%s&verbose=0" % JSON.stringify(batch).uri_encode()
	var code := ("navigator.sendBeacon(%s, new Blob([%s], "
		+ "{type:'application/x-www-form-urlencoded'}))") % [
			JSON.stringify(String(_config.get("endpoint", ""))), JSON.stringify(body)]
	if _js_run(code):
		sent += batch.size()
	else:
		failed += batch.size()


func _total_events() -> int:
	var total := 0
	for key in _counts:
		total += int(_counts[key])
	return total


# ---------------------------------------------------------------------------
# The browser, at arm's length
# ---------------------------------------------------------------------------

## Anything Mixpanel will not accept, and anything that would bloat a payload, does not go.
## Floats are rounded to two places — nobody segments on fourteen decimals, and it doubles
## the size of every event.
func _clean(props: Dictionary) -> Dictionary:
	var out := {}
	for key in props:
		var value: Variant = props[key]
		if value == null:
			continue
		if value is float:
			out[key] = snappedf(float(value), 0.01)
		elif value is int or value is bool or value is String:
			out[key] = value
		elif value is Array:
			out[key] = Array(value).slice(0, 20)
		else:
			out[key] = str(value)
	return out


func _js(expression: String) -> Variant:
	if not OS.has_feature("web"):
		return null
	return JavaScriptBridge.eval(expression, true)


func _js_run(code: String) -> bool:
	if not OS.has_feature("web"):
		return false
	JavaScriptBridge.eval(code, true)
	return true


## `localStorage`, through the same guarded path the save system uses: the key is passed as a
## JSON string so a key with a quote in it cannot become code, and private browsing returns
## null rather than throwing.
func _storage_get(key: String) -> String:
	var value: Variant = _js("(function(){try{return localStorage.getItem(%s)}catch(e){return null}})()"
		% JSON.stringify(key))
	return String(value) if value != null else ""


func _storage_set(key: String, value: String) -> void:
	_js("(function(){try{localStorage.setItem(%s,%s)}catch(e){}})()"
		% [JSON.stringify(key), JSON.stringify(value)])


## A version 4 id, in the shape the reference writes so the same storage key holds the same
## kind of value whichever build wrote it.
##
## From the engine's own generator rather than from `Crypto`: this is a name for a browser, not
## a secret, and a build whose template ships without the crypto module would take the whole
## `start` down with it — silently, because an aborted `_start` looks exactly like a `start`
## that was never called.
func _uuid() -> String:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var bytes := PackedByteArray()
	bytes.resize(16)
	for i in 16:
		bytes[i] = rng.randi() & 0xff
	bytes[6] = (bytes[6] & 0x0f) | 0x40
	bytes[8] = (bytes[8] & 0x3f) | 0x80
	var hex := bytes.hex_encode()
	return "%s-%s-%s-%s-%s" % [hex.substr(0, 8), hex.substr(8, 4), hex.substr(12, 4),
		hex.substr(16, 4), hex.substr(20)]
