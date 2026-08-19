/**
 * Translate the scripted scenes from JavaScript to GDScript.
 *
 *   node tools/translate-events.mjs src/data/events-vol2.js EventsVol2 VOL2_EVENTS \
 *     > godot/scripts/data/events/vol2.gd
 *
 * 6,511 lines of scenes have to cross, and they are almost entirely prose: dialogue in
 * arrays, a flag, a quest stage, a battle. Retyping that by hand is a typing test with
 * a hundred chances to change somebody's line by one character — the first
 * hand-translated volume proved it, with a double space inside a sentence.
 *
 * So the strings are *copied*, never retyped, and only the shape around them is
 * rewritten. The output is committed source rather than a build artefact: it is meant
 * to be read and edited afterwards, so the reference's comments come across too.
 *
 * This is not a JavaScript parser and does not pretend to be. It knows the dozen
 * shapes these files actually use. Anything else is emitted as a loud `#!!` marker
 * with the original beside it, which fails the GDScript parser rather than shipping —
 * and `tools/events-parity.mjs` compares every translated scene against the
 * reference's own transcript, so a scene with a hole in it cannot pass either.
 */

import fs from 'node:fs';

const [source, className, exportName] = process.argv.slice(2);
if (!source || !className) {
  console.error('usage: node tools/translate-events.mjs <events.js> <ClassName> [exportName]');
  process.exit(1);
}

const text = fs.readFileSync(source, 'utf8');
const lines = text.split('\n');

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

/** A JS string literal becomes a GDScript one with its contents untouched. */
function str(literal) {
  const t = literal.trim();
  const quote = t[0];
  // A template literal with an interpolation becomes a format string: GDScript has no
  // interpolation, and `%` is how it says the same thing.
  if (quote === '`' && t.indexOf('${') >= 0) {
    const parts = [];
    const body = t.slice(1, -1).replace(/\$\{([^}]*)\}/g, (_match, inner) => {
      parts.push(expr(inner));
      return '%s';
    });
    return `"${body.replace(/"/g, '\\"')}" % [${parts.join(', ')}]`;
  }
  if (quote !== "'" && quote !== '"' && quote !== '`') return t;
  let body = t.slice(1, -1);
  if (quote === "'") body = body.replace(/\\'/g, "'");
  body = body.replace(/(?<!\\)"/g, '\\"');
  return `"${body}"`;
}

/** Split on a separator at bracket depth zero, respecting string literals. */
function splitTop(input, separator) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === separator && depth === 0) { out.push(input.slice(start, i)); start = i + 1; }
  }
  out.push(input.slice(start));
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Index of a token at bracket depth zero, or -1. */
function indexAtTop(input, token) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && input.startsWith(token, i)) return i;
  }
  return -1;
}

/** Object keys get quoted; values go back through `expr`. */
function objectLiteral(input) {
  const inner = input.trim().slice(1, -1).trim();
  if (!inner) return '{}';
  return `{${splitTop(inner, ',').map((part) => {
    const at = indexAtTop(part, ':');
    // Shorthand: `{ kind: 'esper', id, label }` means the local of that name.
    if (at < 0 && /^[a-zA-Z_]\w*$/.test(part.trim())) {
      return `"${part.trim()}": ${part.trim()}`;
    }
    if (at < 0) return `#!!${part}`;
    const key = part.slice(0, at).trim().replace(/^['"]|['"]$/g, '');
    return `"${key}": ${expr(part.slice(at + 1))}`;
  }).join(', ')}}`;
}

/** Reads of party and world state, longest prefix first. */
const READS = [
  [/^(?:game\.party|p)\.hasFlag\((.*)\)$/, (a) => `ctx.has_flag(${expr(a)})`],
  [/^(?:game\.party|p)\.questStage\((.*)\)$/, (a) => `ctx.quest_stage(${expr(a)})`],
  [/^(?:game\.party|p)\.roster\.has\((.*)\)$/, (a) => `ctx.in_roster(${expr(a)})`],
  [/^(?:game\.party|p)\.espers\.has\((.*)\)$/, (a) => `ctx.has_esper(${expr(a)})`],
  [/^(?:game\.party|p)\.spendGold\((.*)\)$/, (a) => `ctx.spend_gold(${expr(a)})`],
  [/^(?:game\.party|p)\.member\((.*)\)$/, (a) => `ctx.member(${expr(a)})`],
  [/^present\((?:p|game\.party),\s*(\[[\s\S]*\])\)$/, (a) => `ctx.present(${expr(a)})`],
  [/^(?:game\.party|p)\.bestiary\.size$/, () => 'ctx.bestiary_size()'],
  [/^(?:game\.party|p)\.worldState$/, () => 'ctx.world_state'],
  [/^(?:game\.party|p)\.gold$/, () => 'ctx.gold()'],
  [/^(?:game\.party|p)\.recruit\((.*)\)$/, (a) => `ctx.recruit(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^speaking\((?:p|game\.party),\s*(\[[\s\S]*\])\)$/, (a) => `ctx.speaking(${expr(a)})`],
  [/^countFlags\((?:p|game\.party),\s*([\w.]+)\)$/, (a) => `ctx.count_flags(${a})`],
  [/^(?:game\.party|p)\.countItem\((.*)\)$/, (a) => `ctx.count_item(${expr(a)})`],
  [/^rng\.\w+\.chance\((.*)\)$/, (a) => `ctx.chance(${expr(a)})`],
  [/^ctx\.field\?\.mapDef\?\.music$/, () => 'ctx.map_music()'],
  [/^ctx\?\.field\?\.mapDef\?\.music$/, () => 'ctx.map_music()'],
  [/^(?:game\.party|p)\.activeMembers\.find\(\(\w+\)\s*=>\s*\w+\.id\s*===\s*(['"][\w]+['"])\)$/,
    (a) => `ctx.speaking([${str(a)}])`],
  [/^(?:game\.party|p)\.activeMembers\.filter\(\(\w+\)\s*=>\s*([\s\S]*)\)$/, (a) => {
    // `m.id !== 'x' && m.id !== 'y'` is the only shape these use, and it means
    // "everyone except".
    const ids = [...a.matchAll(/!==\s*(['"][\w]+['"])/g)].map((m) => str(m[1]));
    return `ctx.active_except([${ids.join(', ')}])`;
  }],
  [/^speaking\((?:p|game\.party),\s*Object\.keys\((\w+)\)\)$/, (a) => `ctx.speaking(${a}.keys())`],
  [/^rng\.\w+\.pick\((.*)\)$/, (a) => `ctx.pick(${expr(a)})`],
  [/^Math\.min\((.*)\)$/, (a) => `mini(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^Math\.max\((.*)\)$/, (a) => `maxi(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^Math\.floor\((.*)\)$/, (a) => `int(floor(${expr(a)}))`],
  [/^Math\.round\((.*)\)$/, (a) => `int(round(${expr(a)}))`],
  [/^ctx\??\.field\??\.mapDef\??\.music$/, () => 'ctx.map_music()'],
  // The esper table, which the scenes reach into for a display name.
  [/^ESPERS\[([\w.]+)\]\.name$/, (a) => `ctx.esper_name(${expr(a)})`],
  [/^ESPERS\[([\w.'"]+)\]\.name$/, (a) => `ctx.esper_name(${expr(a)})`],
  [/^ctx\?\.field$/, () => 'ctx.field'],
  [/^ctx\.field$/, () => 'ctx.field'],
  // `[...someList.map((m) => m.name), 'Nobody sits']` — a menu of who might sit down.
  [/^\[\s*\.\.\.\s*(\w+)\.map\(\([^)]*\)\s*=>\s*[^)]*\)\s*,\s*(['"][^'"]*['"])\s*,?\s*\]$/,
    (list, tail) => `ctx.names_of(${list}) + [${str(tail)}]`],
  [/^(\w+)\.find\(\(\w+\)\s*=>\s*(?:game\.party|p)\.espers\.has\(\w+\)\)\s*\?\?\s*null$/,
    (list) => `ctx.first_esper(${list})`],
  [/^field$/, () => 'ctx.field'],
];

const COMPARISONS = [['===', '=='], ['!==', '!='], ['&&', 'and'], ['||', 'or'],
  ['>=', '>='], ['<=', '<='], ['>', '>'], ['<', '<']];

/** One expression. */
function expr(input) {
  const t = input.trim().replace(/;$/, '');
  if (!t) return '';
  if (/^['"`]/.test(t) && splitTop(t, ' ').length === 1 && indexAtTop(t, '+') < 0) return str(t);
  if (t === 'null' || t === 'undefined') return 'null';
  if (t === 'true' || t === 'false') return t;
  if (/^-?\d+(\.\d+)?$/.test(t)) return t;
  if (t.startsWith('[') && t.endsWith(']')) {
    // A spread of names, then a fixed last option: the one menu in these files that is
    // built from whoever is standing there. Checked before the general array, which
    // would otherwise translate the spread as an element and fail on it.
    // Greedy up to the last `)` before the comma: the callback has brackets of its
    // own, so a lazy match stops inside `(m) => m.name`.
    const spread = t.match(/^\[\s*\.\.\.\s*(\w+)\.map\((.*)\)\s*,\s*(['"][^'"]*['"])\s*,?\s*\]$/);
    if (spread) return `ctx.names_of(${spread[1]}) + [${str(spread[3])}]`;
    return `[${splitTop(t.slice(1, -1), ',').map(expr).join(', ')}]`;
  }
  if (t.startsWith('{') && t.endsWith('}')) return objectLiteral(t);
  if (/^\(.*\)$/.test(t) && indexAtTop(t.slice(1, -1), ')') < 0) return `(${expr(t.slice(1, -1))})`;

  // A list's length, before any rule that would read `length` as a field.
  const length = t.match(/^([a-zA-Z_]\w*(?:\[[^\]]+\])*)\.length$/);
  if (length) return `${expr(length[1])}.size()`;

  const question = indexAtTop(t, '?');
  if (question > 0) {
    const rest = t.slice(question + 1);
    const colon = indexAtTop(rest, ':');
    if (colon > 0) {
      // GDScript puts the condition in the middle, which reads oddly next to the
      // original and is the only correct spelling.
      return `${expr(rest.slice(0, colon))} if ${expr(t.slice(0, question))}`
        + ` else ${expr(rest.slice(colon + 1))}`;
    }
  }
  for (const [js, gd] of COMPARISONS) {
    const at = indexAtTop(t, js);
    if (at > 0) return `${expr(t.slice(0, at))} ${gd} ${expr(t.slice(at + js.length))}`;
  }
  for (const [pattern, build] of READS) {
    const m = t.match(pattern);
    if (m) return build(m[1]);
  }
  const not = t.match(/^!([^=].*)$/);
  if (not) return `not ${expr(not[1])}`;
  for (const op of ['+', '-', '*', '/']) {
    const at = indexAtTop(t, op);
    if (at > 0) return `${expr(t.slice(0, at))} ${op} ${expr(t.slice(at + 1))}`;
  }
  if (/^[a-zA-Z_][\w]*$/.test(t)) return t;
  // A member's fields. GDScript dictionaries are indexed, not dotted, and these locals
  // are always members handed back by the context.
  // A field on one of these locals. They are all dictionaries the context handed back
  // or table rows, and GDScript indexes rather than dots.
  const field = t.match(/^([a-zA-Z_]\w*)\.([a-z]\w*)$/);
  if (field) return `${field[1]}["${field[2]}"]`;
  const nested = t.match(/^([a-zA-Z_]\w*)\.([a-z]\w*)\.([a-z]\w*)$/);
  if (nested) return `${nested[1]}["${nested[2]}"]["${nested[3]}"]`;
  // `lines[officer.id][0]` and friends.
  const indexed = t.match(/^([a-zA-Z_]\w*)\[([^\]]+)\](.*)$/);
  if (indexed) return `${indexed[1]}[${expr(indexed[2])}]${indexed[3]}`;
  return `#!!${t}`;
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

/** Every statement shape these scenes use, in the order a longer one must win. */
const STATEMENTS = [
  // A ternary choosing between two sets of lines. Extremely common — a scene says one
  // thing before an event and another after — and it has to become a branch, because
  // GDScript's conditional expression cannot carry two multi-line arrays readably.
  [/^yield\*\s*say\(game,\s*([\s\S]*)\)$/, (a) => {
    const parts = splitTop(a, ',');
    const rest = parts.slice(1).join(',').trim();
    const q = indexAtTop(rest, '?');
    const colon = q < 0 ? -1 : indexAtTop(rest.slice(q + 1), ':');
    if (q > 0 && colon > 0) {
      const condition = expr(rest.slice(0, q));
      const yes = expr(rest.slice(q + 1, q + 1 + colon));
      const no = expr(rest.slice(q + colon + 2));
      return ['@@if', condition, `await ctx.say(${expr(parts[0])}, ${yes})`,
        `await ctx.say(${expr(parts[0])}, ${no})`];
    }
    // Not a ternary after all. A distinct sentinel rather than `null`, because null
    // means "a statement a transcript cannot see" and dropping a line of dialogue
    // silently is the one failure this whole tool exists to avoid — it cost an
    // afternoon's confusion when the two were the same value.
    return '@@skip';
  }],
  // Dialogue, the workhorse.
  [/^yield\*\s*say\(game,\s*([\s\S]*)\)$/, (a) => {
    const parts = splitTop(a, ',');
    const speaker = expr(parts[0]);
    const lines = parts.length > 1 ? expr(parts.slice(1).join(',')) : '[]';
    return `await ctx.say(${speaker}, ${lines})`;
  }],
  [/^yield\*\s*game\.dialogue\.speak\(([\s\S]*)\)$/, (a) => {
    const parts = splitTop(a, ',');
    return `await ctx.say(${expr(parts[0])}, ${expr(parts.slice(1).join(','))})`;
  }],
  [/^game\.dialogue\.close\(\)$/, () => 'ctx.close_dialogue()'],
  [/^yield\*\s*cinematic\(game,\s*([\s\S]*)\)$/, (a) => `await ctx.cinematic(${expr(a)})`],
  [/^yield\*\s*tremor\(game(?:,\s*([\s\S]*))?\)$/, (a) => (a
    ? `await ctx.tremor(${splitTop(a, ',').map(expr).join(', ')})`
    : 'await ctx.tremor()')],
  [/^yield\s+wait\(([\s\S]*)\)$/, (a) => `await ctx.wait(${expr(a)})`],
  [/^yield\*\s*game\.startBattleScene\(([\s\S]*)\)$/, (a) => {
    const parts = splitTop(a, ',');
    const opts = parts.length > 1 ? expr(parts.slice(1).join(',')) : '{}';
    return `await ctx.battle(${expr(parts[0])}, ${opts})`;
  }],
  [/^yield\*\s*game\.grantChest\(([\s\S]*)\)$/, (a) => {
    const parts = splitTop(a, ',');
    const field = parts.length > 1 ? expr(parts.slice(1).join(',')) : 'ctx.field';
    return `await ctx.grant_chest(${expr(parts[0])}, ${field})`;
  }],
  [/^yield\*\s*over\(([^,]+),\s*\((\w+)\)\s*=>\s*\{([\s\S]*)\}\s*\)$/,
    (seconds, param, body) => {
      const inner = splitTop(body, ';').map((part) => statement(part)).filter(Boolean);
      return ['@@lambda', `await ctx.over(${expr(seconds)}, func(${param}: float, _dt: float):`,
        inner.length ? inner : ['pass']];
    }],
  [/^yield\*\s*game\.showEnding\(\)$/, () => 'await ctx.show_ending()'],
  [/^yield\*\s*game\.celebrate\(([\s\S]*)\)$/, (a) => `await ctx.celebrate(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^yield\*\s*game\.runEvent\(([\s\S]*)\)$/, (a) => `ctx.run_event(${expr(splitTop(a, ',')[0])})`],
  [/^game\.gotoMap\(([\s\S]*)\)$/, (a) => `ctx.goto_map(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^game\.playMusic\(([\s\S]*)\)$/, (a) => `ctx.play_music(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^(?:game\.party|p)\.setFlag\(([\s\S]*)\)$/, (a) => `ctx.set_flag(${expr(a)})`],
  [/^(?:game\.party|p)\.startQuest\(([\s\S]*)\)$/, (a) => {
    const parts = splitTop(a, ',');
    return parts.length > 1
      ? `ctx.start_quest_at(${expr(parts[0])}, ${expr(parts[1])})`
      : `ctx.start_quest(${expr(parts[0])})`;
  }],
  [/^(?:game\.party|p)\.advanceQuest\(([\s\S]*)\)$/, (a) => `ctx.advance_quest(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^(?:game\.party|p)\.completeQuest\(([\s\S]*)\)$/, (a) => `ctx.complete_quest(${expr(a)})`],
  [/^(?:game\.party|p)\.addItem\(([\s\S]*)\)$/, (a) => `ctx.add_item(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^(?:game\.party|p)\.addGold\(([\s\S]*)\)$/, (a) => `ctx.add_gold(${expr(a)})`],
  [/^(?:game\.party|p)\.recruit\(([\s\S]*)\)$/, (a) => `ctx.recruit(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^(?:game\.party|p)\.espers\.add\(([\s\S]*)\)$/, (a) => `ctx.add_esper(${expr(a)})`],
  [/^(?:game\.party|p)\.learnSpell\(([\s\S]*)\)$/, (a) => `ctx.learn_spell(${expr(a)})`],
  [/^(?:game\.party|p)\.fullRestore\(\)$/, () => 'ctx.full_restore()'],
  [/^(?:game\.party|p)\.restAll\(\)$/, () => 'ctx.rest_all()'],
  [/^(?:game\.party|p)\.spendGold\((.*)\)$/, (a) => `ctx.spend_gold(${expr(a)})`],
  [/^(\w+)\.learnSpell\((.*)\)$/, (who, spell) => `ctx.member_learn_spell(${who}["id"], ${expr(spell)})`],
  [/^yield\*\s*grantEsper\(game,\s*([\s\S]*)\)$/, (a) => `await grant_esper(ctx, ${splitTop(a, ',').map(expr).join(', ')})`],
  [/^yield\*\s*grantShard\(game,\s*([\s\S]*)\)$/, (a) => `await grant_shard(ctx, ${splitTop(a, ',').map(expr).join(', ')})`],
  [/^yield\*\s*elevenLogged\(game,\s*ctx\)$/, () => 'await eleven_logged(ctx)'],
  [/^restoreTheme\(game,\s*ctx(?:,\s*(.*))?\)$/, (a) => `ctx.restore_theme(${a ? expr(a) : '1.6'})`],
  [/^(?:game\.party|p)\.advanceQuest\(([\s\S]*)\)$/, (a) => `ctx.advance_quest(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^(?:game\.party|p)\.worldState\s*=\s*([\s\S]*)$/, (a) => `ctx.world_state = ${expr(a)}`],
  [/^game\.renderer\.rig\.shake\(([\s\S]*)\)$/, (a) => `ctx.shake(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^game\.renderer\.postfx\.flash\(([\s\S]*)\)$/, (a) => `ctx.flash(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^game\.renderer\.postfx\.setGrade\(([\s\S]*)\)$/, (a) => `ctx.grade(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^game\.stage\.classList\.toggle\(([\s\S]*)\)$/, (a) => `ctx.stage_class(${splitTop(a, ',').map(expr).join(', ')})`],
  [/^ctx\.field\?\.refreshParty\(\)$/, () => 'ctx.refresh_party()'],
  [/^ctx\.field\?\.walkTo\([\s\S]*\)$/, () => 'ctx.refresh_party()  # walkTo: presentation only'],
  // Things a transcript cannot see, and which the live context handles instead.
  [/^game\.renderer\.postfx\.flashStrength\s*=\s*[\s\S]*$/, () => null],
  [/^game\.renderer\.postfx\.desaturate\s*=\s*[\s\S]*$/, () => null],
  [/^analytics\.track\([\s\S]*$/, () => null],
  // State on a member or on the field: real in the game, invisible to a transcript,
  // and handled by the live context rather than by a scene.
  [/^[a-zA-Z_]\w*\.equipment\.[\w.]+\s*=\s*[\s\S]*$/, () => null],
  [/^ctx\.field\.paused\s*=\s*[\s\S]*$/, () => null],
  [/^const\s+p\s*=\s*game\.party$/, () => null],
  [/^const\s+field\s*=\s*ctx\.field$/, () => null],
  // Locals.
  [/^const\s+([a-zA-Z_]\w*)\s*=\s*yield\*\s*game\.dialogue\.ask\(([\s\S]*)\)$/, (name, a) => {
    const parts = splitTop(a, ',');
    const opts = parts.length > 2 ? expr(parts.slice(2).join(',')) : '{}';
    return `var ${name} := await ctx.ask(${expr(parts[0])}, ${expr(parts[1])}, ${opts})`;
  }],
  [/^const\s+([a-zA-Z_]\w*)\s*=\s*yield\*\s*game\.startBattleScene\(([\s\S]*)\)$/, (name, a) => {
    const parts = splitTop(a, ',');
    const opts = parts.length > 1 ? expr(parts.slice(1).join(',')) : '{}';
    return `var ${name} := await ctx.battle(${expr(parts[0])}, ${opts})`;
  }],
  [/^(?:const|let)\s+([a-zA-Z_]\w*)\s*=\s*([\s\S]*)$/, (name, value) => {
    const translated = expr(value);
    return translated.startsWith('#!!')
      ? `#!! var ${name} = ${value}`
      : `var ${name} = ${translated}`;
  }],
  [/^([a-zA-Z_]\w*)\s*=\s*([\s\S]*)$/, (name, value) => `${name} = ${expr(value)}`],
  [/^return$/, () => 'return'],
  [/^break$/, () => 'break'],
  [/^continue$/, () => 'continue'],
  [/^let\s+([a-zA-Z_]\w*)$/, (name) => `var ${name} = null`],
  [/^([a-zA-Z_]\w*)\+\+$/, (name) => `${name} += 1`],
  [/^([a-zA-Z_]\w*)\.esper\s*=\s*null$/, (name) => `ctx.clear_esper(${name}["id"])`],
  [/^(?:game\.party|p)\.espers\.delete\((.*)\)$/, (a) => `ctx.remove_esper(${expr(a)})`],
];

/** One statement, or null when it is something a transcript cannot see. */
function statement(input) {
  const t = input.trim().replace(/;$/, '');
  for (const [pattern, build] of STATEMENTS) {
    const m = t.match(pattern);
    if (!m) continue;
    const built = build(...m.slice(1));
    if (built === '@@skip') continue;
    return built;
  }
  return `#!! ${t}`;
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

const out = [];
const ids = [];
let i = 0;
const header = [];

const constants = [];

// Top-level constants: a list of flags to count, a table of lines by speaker. They are
// content, and they belong in the translated file rather than being inlined.
for (let k = 0; k < lines.length; k++) {
  const start = lines[k].match(/^const\s+([A-Z][A-Z0-9_]*)\s*=\s*([\s\S]*)$/);
  if (!start) continue;
  let buffer = start[2];
  let line = k;
  while (!balancedText(buffer) && line + 1 < lines.length) {
    line++;
    buffer += ` ${lines[line].trim()}`;
  }
  constants.push(`const ${start[1]} := ${expr(buffer.replace(/;$/, ''))}`);
}

function balancedText(input) {
  const c = (ch) => input.split('').filter((x) => x === ch).length;
  return c('(') === c(')') && c('[') === c(']') && c('{') === c('}');
}

// The module's own comment block, carried across so the file still explains itself.
while (i < lines.length && !/^export const/.test(lines[i])) {
  const line = lines[i];
  if (/^\s*\/\*\*?$/.test(line) || /^\s*\*/.test(line) || /^\s*\*\/$/.test(line)) {
    const body = line.replace(/^\s*\/?\*+\/?/, '').replace(/\s*\*\/$/, '').trim();
    header.push(body ? `## ${body}` : '##');
  }
  i++;
}

/** Collect a whole scene body, then translate it line by line. */
function scene(startLine) {
  const signature = lines[startLine].match(/^\s*\*([a-zA-Z_]\w*)\s*\(/);
  const name = signature[1];
  ids.push(name);
  const body = [];
  let depth = 0;
  let line = startLine;
  do {
    depth += count(lines[line], '{') - count(lines[line], '}');
    if (line > startLine) body.push(lines[line]);
    line++;
  } while (line < lines.length && depth > 0);
  body.pop();   // the scene's closing brace
  return { name, body, next: line };
}

const count = (s, c) => s.split('').filter((x) => x === c).length;

/**
 * Split `if (...) rest` on the bracket that actually closes the condition.
 *
 * A greedy regex takes the last `)` on the line, which for
 * `if (stage('engine') < 0) startQuest('engine', 0);` is the wrong one — and the
 * mistake is quiet, because what comes out still looks like a condition.
 */
function controlParts(text) {
  const keyword = text.startsWith('else if') ? 'else if' : text.startsWith('if') ? 'if' : 'else';
  if (keyword === 'else' && !text.startsWith('else if')) return ['else', '', ''];
  const open = text.indexOf('(');
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) {
        return [keyword, text.slice(open + 1, i), text.slice(i + 1).trim()];
      }
    }
  }
  return null;
}

/** Translate a body, tracking indentation and turning braces into blocks. */
function translate(body) {
  const result = [];
  let indent = 2;
  let buffer = '';
  let comment = [];

  const flush = () => {
    if (!buffer.trim()) return;
    let text = buffer.trim();
    // `if (...) {` and friends, and the single-statement forms these files use.
    const control = text.match(/^(if|else if|else)\b/) && text.endsWith('{')
      ? controlParts(text) : null;
    if (control) {
      const [keyword, condition] = control;
      const prefix = keyword === 'else' ? 'else' : `${keyword === 'if' ? 'if' : 'elif'} ${expr(condition)}`;
      result.push({ indent, text: `${prefix}:` });
      indent++;
      buffer = '';
      return;
    }
    const inlineElse = text.match(/^else\s+(?!if\b)(.+)$/);
    if (inlineElse && !inlineElse[1].startsWith('{')) {
      result.push({ indent, text: 'else:' });
      for (const part of splitTop(inlineElse[1], ';')) {
        const inner = statement(part);
        if (inner) result.push({ indent: indent + 1, text: inner });
      }
      buffer = '';
      return;
    }

    const inlineIf = text.startsWith('if') && !text.endsWith('{') ? controlParts(text) : null;
    if (inlineIf) {
      const inner = inlineIf[2].replace(/^\{\s*/, '').replace(/\s*\}$/, '');
      result.push({ indent, text: `if ${expr(inlineIf[1])}:` });
      for (const part of splitTop(inner, ';')) {
        const s = statement(part);
        if (s) result.push({ indent: indent + 1, text: s });
      }
      buffer = '';
      return;
    }
    const s = statement(text);
    if (Array.isArray(s) && s[0] === '@@lambda') {
      result.push({ indent, text: s[1] });
      for (const inner of s[2]) result.push({ indent: indent + 1, text: inner });
      result.push({ indent, text: ')' });
    } else if (Array.isArray(s) && s[0] === '@@if') {
      result.push({ indent, text: `if ${s[1]}:` });
      result.push({ indent: indent + 1, text: s[2] });
      result.push({ indent, text: 'else:' });
      result.push({ indent: indent + 1, text: s[3] });
    } else if (s) {
      result.push({ indent, text: s });
    }
    buffer = '';
  };

  for (const raw of body) {
    const line = raw.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!trimmed) { flush(); result.push({ indent, text: '' }); continue; }

    // Comments come across as they are.
    if (/^\/\//.test(trimmed)) { flush(); comment.push(`# ${trimmed.slice(2).trim()}`); continue; }
    if (/^\/\*\*?$/.test(trimmed)) { flush(); continue; }
    if (/^\*\/$/.test(trimmed)) { continue; }
    if (/^\*/.test(trimmed) && !/^\*[a-zA-Z_]/.test(trimmed)) {
      flush();
      comment.push(`# ${trimmed.replace(/^\*\s?/, '')}`.trimEnd());
      continue;
    }
    if (comment.length) {
      for (const c of comment) result.push({ indent, text: c });
      comment = [];
    }

    const forOf = trimmed.match(/^for\s*\(const\s+(\w+)\s+of\s+([\s\S]*?)\)\s*\{$/);
    if (forOf) {
      flush();
      const list = forOf[2].replace(/^(?:game\.party|p)\.roster\.values\(\)$/, 'ctx.roster_members()');
      result.push({ indent, text: `for ${forOf[1]} in ${list.includes('ctx.') ? list : expr(list)}:` });
      indent++;
      continue;
    }
    if (/^for\s*\(;;\)\s*\{$/.test(trimmed)) {
      flush();
      result.push({ indent, text: 'while true:' });
      indent++;
      continue;
    }
    if (trimmed === '}') { flush(); indent = Math.max(2, indent - 1); continue; }
    if (trimmed === '} else {') { flush(); indent = Math.max(2, indent - 1); result.push({ indent, text: 'else:' }); indent++; continue; }
    const elseIf = trimmed.match(/^\}\s*else if\s*\((.*)\)\s*\{$/);
    if (elseIf) { flush(); indent = Math.max(2, indent - 1); result.push({ indent, text: `elif ${expr(elseIf[1])}:` }); indent++; continue; }

    buffer = buffer ? `${buffer} ${trimmed}` : trimmed;
    // A statement is complete when its brackets balance and it ends a line the way
    // JavaScript ends one — or when it opens a block.
    // Braces are deliberately not counted: a line ending in `{` opens a block and is
    // complete, and counting it as unbalanced merged whole `if` bodies into their
    // own condition.
    const balanced = count(buffer, '(') === count(buffer, ')')
      && count(buffer, '[') === count(buffer, ']');
    const opensBlock = trimmed.endsWith('{') && /^(if|else|for|while|switch|try)\b/.test(buffer);
    if (balanced && (trimmed.endsWith(';') || opensBlock || /^(return|break)$/.test(trimmed))) flush();
    else if (balanced && trimmed.endsWith('}') && /^(if|else)\b/.test(buffer)
      && count(buffer, '{') === count(buffer, '}')) flush();
    else if (balanced && trimmed.endsWith(')') && !buffer.startsWith('if')) flush();
  }
  flush();
  return result;
}

const snake = (name) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// The file-level generator helpers, translated as ordinary functions.
const helpers = [];
for (let k = 0; k < lines.length; k++) {
  const start = lines[k].match(/^function\*\s+(\w+)\(game(?:,\s*([^)]*))?\)\s*\{$/);
  if (!start) continue;
  // The ones the context already provides. Translating them would put a second,
  // divergent copy of `say` in every file.
  if (['say', 'cinematic', 'tremor', 'present', 'speaking', 'voice', 'boss',
    'countFlags', 'restoreTheme'].includes(start[1])) continue;
  const params = (start[2] ?? '').split(',').map((x) => x.trim()).filter(Boolean)
    .filter((x) => x !== 'ctx');
  const body = [];
  let depth = 1;
  let line = k;
  while (depth > 0 && line + 1 < lines.length) {
    line++;
    depth += count(lines[line], '{') - count(lines[line], '}');
    if (depth > 0) body.push(lines[line]);
  }
  helpers.push({ name: snake(start[1]), params, statements: translate(body) });
}

while (i < lines.length) {
  if (/^\s*\*[a-zA-Z_]\w*\s*\(/.test(lines[i])) {
    const { name, body, next } = scene(i);
    const doc = [];
    // The comment block immediately above the scene.
    let back = i - 1;
    const collected = [];
    while (back >= 0 && /^\s*(\*|\/\*\*|\*\/|\/\/)/.test(lines[back])) {
      const line = lines[back].trim();
      if (line !== '/**' && line !== '*/') {
        collected.unshift(`## ${line.replace(/^\*\s?/, '').replace(/^\/\/\s?/, '')}`.trimEnd());
      }
      back--;
    }
    doc.push(...collected);
    out.push({ name, doc, statements: translate(body) });
    i = next;
    continue;
  }
  i++;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const lines_out = [];
lines_out.push(`class_name ${className}`);
lines_out.push('extends RefCounted');
lines_out.push('##');
for (const line of header) lines_out.push(line);
lines_out.push('##');
lines_out.push(`## Translated from \`${source}\` by \`tools/translate-events.mjs\`, which copies the`);
lines_out.push('## dialogue rather than retyping it and rewrites only the shape around it. Every scene');
lines_out.push('## here is compared against the reference\'s own transcript by');
lines_out.push('## `tools/events-parity.mjs`, under five branch policies.');
lines_out.push('');
for (const constant of constants) {
  lines_out.push(constant);
  lines_out.push('');
}
lines_out.push('const IDS := [');
for (const chunk of chunkIds(ids, 4)) lines_out.push(`\t${chunk}`);
lines_out.push(']');
lines_out.push('');
lines_out.push('');
lines_out.push('static func run(id: String, ctx: EventContext) -> void:');
lines_out.push('\tmatch id:');
for (const { name } of out) lines_out.push(`\t\t"${name}": await ${name}(ctx)`);
lines_out.push('');

for (const { name, params, statements } of helpers) {
  lines_out.push('');
  lines_out.push('## A step several scenes share, translated from the module helper of the');
  lines_out.push('## same name.');
  const signature = ['ctx: EventContext', ...params.map((x) => `${x}: Variant = null`)];
  lines_out.push(`static func ${name}(${signature.join(', ')}) -> void:`);
  let wroteHelper = false;
  for (const { indent, text } of statements) {
    if (!text) { lines_out.push(''); continue; }
    lines_out.push('\t'.repeat(Math.max(1, indent - 1)) + text);
    wroteHelper = true;
  }
  if (!wroteHelper) lines_out.push('\tpass');
  lines_out.push('');
}

for (const { name, doc, statements } of out) {
  lines_out.push('');
  for (const line of doc) lines_out.push(line);
  lines_out.push(`static func ${name}(ctx: EventContext) -> void:`);
  let wrote = false;
  for (const { indent, text } of statements) {
    if (!text) { lines_out.push(''); continue; }
    lines_out.push('\t'.repeat(Math.max(1, indent - 1)) + text);
    wrote = true;
  }
  if (!wrote) lines_out.push('\tpass');
  lines_out.push('');
}

function chunkIds(list, per) {
  const rows = [];
  for (let k = 0; k < list.length; k += per) {
    rows.push(list.slice(k, k + per).map((n) => `"${n}",`).join(' '));
  }
  return rows;
}

process.stdout.write(`${lines_out.join('\n')}\n`);
process.stderr.write(`${className}: ${ids.length} scenes, `
  + `${lines_out.filter((l) => l.includes('#!!')).length} unrecognised line(s)\n`);
if (exportName) process.stderr.write(`(from ${exportName})\n`);
