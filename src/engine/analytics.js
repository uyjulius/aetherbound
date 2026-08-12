/**
 * Mixpanel instrumentation.
 *
 * No SDK and no CDN script. The game is a single bundle served as static
 * files, and pulling in `mixpanel-browser` would add ~60KB and a third-party
 * script tag to a page whose whole point is that it loads and runs. Mixpanel's
 * ingestion API is a documented HTTP endpoint; this talks to it directly.
 *
 * Three rules this module holds to:
 *
 *   1. It can never break the game. Every send is fire-and-forget, every
 *      failure is swallowed, and `track` on a broken transport is a no-op.
 *   2. It never sends anything about the person playing. Events carry game
 *      state — which map, which boss, what level — and a random id generated
 *      on this device. No names, no addresses, no free text the player typed.
 *   3. It stays out of the test suite. Playwright sets `navigator.webdriver`,
 *      and a hundred and twenty smoke checks would otherwise write a hundred
 *      and twenty sessions of garbage into the project.
 *
 * Turn it off with `?noanalytics` on the URL, or
 * `localStorage['aetherbound.analytics'] = 'off'`.
 */

const TOKEN = '446fdce30255f1caaa9f0d782fa307af';

/** The CORS-enabled ingestion host. `api.mixpanel.com` is server-side only. */
const ENDPOINT = 'https://api-js.mixpanel.com/track/';

/** Send when the queue reaches this, or when the timer fires — whichever first. */
const BATCH_SIZE = 20;
const BATCH_MS = 10000;

/** Mixpanel rejects batches over 50 events; stay well under. */
const MAX_BATCH = 40;

/** If the queue ever runs away — a bug, or a very long offline session. */
const MAX_QUEUE = 500;

const ID_KEY = 'aetherbound.mixpanel.id';
const OPT_KEY = 'aetherbound.analytics';

/**
 * Do Not Track is deliberately not consulted.
 *
 * Stated rather than merely absent, so nobody reads the missing check as an
 * oversight and "fixes" it. The header was discontinued by the W3C, removed
 * from Safari, and never carried legal force; Mixpanel's own SDK exposes
 * `ignore_dnt` for exactly this case. The opt-out that does work is the
 * explicit one — `localStorage['aetherbound.analytics'] = 'off'`, or
 * `?noanalytics` on the URL — and it is checked in `init` below.
 */
const IGNORE_DNT = true;

// ---------------------------------------------------------------------------
// The event taxonomy
// ---------------------------------------------------------------------------

/**
 * Every event the game sends, in one place.
 *
 * Named as `Object Verbed`, past tense, because that is the convention
 * Mixpanel's own reporting reads best and because a mixed taxonomy is
 * unusable six months later. Anything added should be added here first — a
 * string literal at a call site is how event names quietly fork into
 * `Battle Started`, `battle_start` and `BattleBegin`.
 */
export const EV = {
  // --- session and lifecycle ---------------------------------------------
  APP_LOADED: 'App Loaded',                     // bundle parsed, first frame ready
  ASSETS_LOADED: 'Assets Loaded',               // models and textures in
  SESSION_STARTED: 'Session Started',
  SESSION_ENDED: 'Session Ended',               // sent on pagehide, via beacon
  TITLE_VIEWED: 'Title Viewed',                 // reached the front door
  GAME_STARTED: 'Game Started',                 // new campaign from the title
  GAME_LOADED: 'Game Loaded',                   // continued from a slot
  GAME_SAVED: 'Game Saved',
  GAME_COMPLETED: 'Game Completed',             // the ending

  // --- the world ----------------------------------------------------------
  MAP_ENTERED: 'Map Entered',
  MAP_FIRST_SEEN: 'Map First Seen',             // fires once per campaign, per map
  DOOR_WARNING_SHOWN: 'Door Warning Shown',     // the signpost said "do not"
  DOOR_WARNING_IGNORED: 'Door Warning Ignored', // …and they went in anyway
  NPC_TALKED: 'NPC Talked',
  PROP_INSPECTED: 'Prop Inspected',             // signposts, wells, notices
  CHEST_OPENED: 'Chest Opened',
  SAVE_POINT_USED: 'Save Point Used',
  INN_RESTED: 'Inn Rested',
  AIRSHIP_BOARDED: 'Airship Boarded',
  AIRSHIP_LANDED: 'Airship Landed',
  CROSSING_USED: 'Crossing Used',               // the flight to the Meridian Reach
  STEPS_WALKED: 'Steps Walked',                 // periodic, for pacing analysis

  // --- battle -------------------------------------------------------------
  BATTLE_STARTED: 'Battle Started',
  BATTLE_ENDED: 'Battle Ended',                 // victory | defeat | flee
  BATTLE_FLED: 'Battle Fled',
  PARTY_WIPED: 'Party Wiped',
  COMMAND_USED: 'Command Used',                 // attack, magic, item, unique
  SPELL_CAST: 'Spell Cast',
  SUMMON_USED: 'Summon Used',
  LIMIT_USED: 'Limit Used',
  ITEM_USED: 'Item Used',
  STEAL_ATTEMPTED: 'Steal Attempted',
  WEAKNESS_HIT: 'Weakness Hit',                 // did the player find the answer?
  ATTACK_ABSORBED: 'Attack Absorbed',           // …or the wrong one
  ENEMY_KILLED: 'Enemy Killed',
  BOSS_DEFEATED: 'Boss Defeated',
  CHARACTER_KO: 'Character KO',
  ENEMY_SCANNED: 'Enemy Scanned',

  // --- progression --------------------------------------------------------
  LEVEL_GAINED: 'Level Gained',
  CHARACTER_RECRUITED: 'Character Recruited',
  ESPER_ACQUIRED: 'Esper Acquired',
  ESPER_EQUIPPED: 'Esper Equipped',
  SPELL_LEARNED: 'Spell Learned',
  QUEST_STARTED: 'Quest Started',
  QUEST_ADVANCED: 'Quest Advanced',
  QUEST_COMPLETED: 'Quest Completed',
  STORY_FLAG_SET: 'Story Flag Set',
  WORLD_STATE_CHANGED: 'World State Changed',   // the cataclysm

  // --- economy and gear ---------------------------------------------------
  SHOP_OPENED: 'Shop Opened',
  ITEM_BOUGHT: 'Item Bought',
  ITEM_SOLD: 'Item Sold',
  EQUIPMENT_CHANGED: 'Equipment Changed',
  ROW_CHANGED: 'Row Changed',

  // --- interface ----------------------------------------------------------
  MENU_OPENED: 'Menu Opened',
  MENU_SCREEN_VIEWED: 'Menu Screen Viewed',
  CONFIG_CHANGED: 'Config Changed',
  CONTROL_USED: 'Control Used',                 // the on-screen buttons
  GAME_PAUSED: 'Game Paused',
  DIALOGUE_SKIPPED: 'Dialogue Skipped',

  // --- health -------------------------------------------------------------
  ERROR_THROWN: 'Error Thrown',
  ASSET_FAILED: 'Asset Failed',
  PERFORMANCE_SAMPLED: 'Performance Sampled',   // periodic fps / draw calls
};

// ---------------------------------------------------------------------------

function uuid() {
  // `crypto.randomUUID` is not in every browser this might run in.
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  (globalThis.crypto ?? { getRandomValues: (a) => a.forEach((_, i) => { a[i] = Math.random() * 256; }) })
    .getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
    return value;
  } catch {
    return null;                    // private browsing, or storage disabled
  }
}

class Analytics {
  constructor() {
    this.enabled = false;
    this.token = TOKEN;
    this.distinctId = null;
    this.sessionId = null;
    this.queue = [];
    this.superProps = {};
    this.timer = null;
    this.started = 0;
    this.counts = new Map();        // event → how many this session
    this.debug = false;
    this.sent = 0;
    this.failed = 0;
  }

  /**
   * @param {object} opts
   *   version   build identifier, for splitting metrics by release
   *   debug     log every event to the console instead of staying quiet
   */
  init({ version = 'dev', debug = false } = {}) {
    this.debug = debug || /[?&]analytics=debug/.test(globalThis.location?.search ?? '');

    // Never in the test harness, never when told not to, never without fetch.
    const dnt = !IGNORE_DNT && (globalThis.navigator?.doNotTrack === '1'
      || globalThis.doNotTrack === '1' || globalThis.navigator?.msDoNotTrack === '1');
    const optedOut = dnt
      || store(OPT_KEY) === 'off'
      || /[?&]noanalytics\b/.test(globalThis.location?.search ?? '');
    const automated = globalThis.navigator?.webdriver === true;
    if (optedOut || automated || typeof fetch !== 'function') {
      this.enabled = false;
      this.reason = optedOut ? 'opted out' : automated ? 'automated browser' : 'no fetch';
      return this;
    }

    this.enabled = true;
    this.distinctId = store(ID_KEY) ?? store(ID_KEY, uuid());
    this.sessionId = uuid();
    this.started = Date.now();

    const nav = globalThis.navigator ?? {};
    const scr = globalThis.screen ?? {};
    this.register({
      $insert_id: undefined,
      build: version,
      session_id: this.sessionId,
      // Mixpanel parses `$browser` etc. from the UA it is given; sending the
      // raw string lets it do that rather than guessing here.
      $screen_width: scr.width ?? null,
      $screen_height: scr.height ?? null,
      viewport_width: globalThis.innerWidth ?? null,
      viewport_height: globalThis.innerHeight ?? null,
      device_pixel_ratio: globalThis.devicePixelRatio ?? 1,
      language: nav.language ?? null,
      touch: (nav.maxTouchPoints ?? 0) > 0,
      hardware_threads: nav.hardwareConcurrency ?? null,
      device_memory: nav.deviceMemory ?? null,
      referrer: globalThis.document?.referrer || null,
    });

    // Flush on the way out. `pagehide` fires where `unload` does not on
    // mobile Safari, and `sendBeacon` survives the page going away.
    const leave = () => {
      this.track(EV.SESSION_ENDED, {
        session_seconds: Math.round((Date.now() - this.started) / 1000),
        events_this_session: [...this.counts.values()].reduce((n, c) => n + c, 0),
      });
      this.flush(true);
    };
    globalThis.addEventListener?.('pagehide', leave);
    globalThis.addEventListener?.('visibilitychange', () => {
      if (globalThis.document?.visibilityState === 'hidden') this.flush(true);
    });

    this.track(EV.SESSION_STARTED, { returning: store(ID_KEY) !== this.distinctId });
    return this;
  }

  /** Properties attached to every subsequent event. */
  register(props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined) delete this.superProps[k];
      else this.superProps[k] = v;
    }
    return this;
  }

  /**
   * Record an event.
   *
   * Safe to call before `init`, after a failure, and with anything in `props`
   * — values that will not serialise are dropped rather than thrown.
   */
  track(event, props = {}) {
    if (!this.enabled || !event) return;
    this.counts.set(event, (this.counts.get(event) ?? 0) + 1);

    const properties = {
      token: this.token,
      distinct_id: this.distinctId,
      time: Date.now() / 1000,
      $insert_id: uuid(),           // Mixpanel dedupes on this
      ...this.superProps,
      ...clean(props),
    };
    this.queue.push({ event, properties });
    if (this.debug) console.info('[mixpanel]', event, props);

    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    if (this.queue.length >= BATCH_SIZE) this.flush();
    else if (!this.timer) {
      this.timer = setTimeout(() => { this.timer = null; this.flush(); }, BATCH_MS);
    }
  }

  /**
   * Track something that should only ever be recorded once per session —
   * "first battle won", "first time this map was seen".
   */
  once(key, event, props = {}) {
    this._seen ??= new Set();
    if (this._seen.has(key)) return;
    this._seen.add(key);
    this.track(event, props);
  }

  /** Send whatever is queued. `beacon` for the page-is-closing case. */
  flush(beacon = false) {
    if (!this.enabled || !this.queue.length) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }

    const batch = this.queue.splice(0, MAX_BATCH);
    const body = `data=${encodeURIComponent(JSON.stringify(batch))}&verbose=0`;

    try {
      if (beacon && globalThis.navigator?.sendBeacon) {
        const blob = new Blob([body], { type: 'application/x-www-form-urlencoded' });
        globalThis.navigator.sendBeacon(ENDPOINT, blob);
        this.sent += batch.length;
        return;
      }
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        keepalive: true,
        mode: 'cors',
      }).then(() => { this.sent += batch.length; })
        .catch(() => { this.failed += batch.length; });
    } catch {
      this.failed += batch.length;
    }
    // Anything left over goes on the next tick rather than in one huge POST.
    if (this.queue.length) setTimeout(() => this.flush(beacon), 50);
  }

  /** For the console, and for anyone checking the instrumentation is alive. */
  summary() {
    return {
      enabled: this.enabled, reason: this.reason ?? null,
      distinctId: this.distinctId, sessionId: this.sessionId,
      queued: this.queue.length, sent: this.sent, failed: this.failed,
      byEvent: Object.fromEntries([...this.counts].sort((a, b) => b[1] - a[1])),
    };
  }

  optOut() { store(OPT_KEY, 'off'); this.enabled = false; this.queue.length = 0; }
  optIn() { store(OPT_KEY, 'on'); }
}

/**
 * Strip anything Mixpanel will not accept, and anything that would bloat a
 * payload. Numbers are rounded — nobody is going to segment on a float with
 * fourteen decimal places, and it doubles the size of every event.
 */
function clean(props) {
  const out = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'number') out[k] = Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
    else if (typeof v === 'boolean' || typeof v === 'string') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 20).map((x) => (typeof x === 'object' ? String(x) : x));
    else out[k] = String(v);
  }
  return out;
}

export const analytics = new Analytics();
