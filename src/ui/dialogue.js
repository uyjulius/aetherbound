import { analytics, EV } from '../engine/analytics.js';
import { el, win, MenuList } from './ui.js';
import { input } from '../engine/input.js';
import { audio } from '../audio/audio.js';
import { wait, until } from '../engine/scheduler.js';

/**
 * Dialogue.
 *
 * Written as coroutines so a conversation reads in source the way it plays:
 *
 *   yield* dialogue.say('Vesna', 'The Engine still turns beneath us.');
 *   const choice = yield* dialogue.ask('Will you come?', ['Yes', 'Not yet']);
 *
 * Text reveals character by character with punctuation pauses, and the whole
 * reveal can be skipped with the confirm button — the standard contract every
 * JRPG player already knows.
 */

const PUNCTUATION_PAUSE = { '.': 7, '!': 7, '?': 7, ',': 3, ';': 4, ':': 4, '—': 5, '…': 10 };

export class DialogueBox {
  constructor(uiRoot) {
    this.uiRoot = uiRoot;
    this.layer = el('div', { id: 'dialogue-layer', class: 'hidden' });
    this.portrait = el('div', { class: 'dialogue-portrait hidden' });
    this.nameEl = el('div', { class: 'dialogue-name' });
    this.textEl = el('div', { class: 'dialogue-text' });
    this.moreEl = el('div', { class: 'dialogue-more hidden' });
    this.box = win({ class: 'dialogue-box' }, [
      this.portrait,
      el('div', { class: 'dialogue-body' }, [this.nameEl, this.textEl]),
      this.moreEl,
    ]);
    this.layer.appendChild(this.box);
    uiRoot.appendChild(this.layer);
    this.active = false;
    this.charsPerTick = 1;
    this.speed = 1.6;   // characters per frame at speed 1
    // A short blip every few glyphs is the classic text-crawl voice. Every
    // glyph is grating; every few reads as speech.
    this.onSound = () => audio.sfx('text');
    this.choiceList = null;
  }

  get isOpen() { return this.active; }

  _open(speaker, portrait) {
    this.layer.classList.remove('hidden');
    this.active = true;
    if (speaker) {
      this.nameEl.textContent = speaker;
      this.nameEl.style.display = '';
    } else {
      this.nameEl.style.display = 'none';
    }
    if (portrait) {
      this.portrait.classList.remove('hidden');
      this.portrait.style.backgroundImage = `url(${portrait})`;
    } else {
      this.portrait.classList.add('hidden');
    }
  }

  close() {
    this.layer.classList.add('hidden');
    this.active = false;
    this.moreEl.classList.add('hidden');
    this._clearChoices();
  }

  _clearChoices() {
    this.choiceNode?.remove();
    this.choiceNode = null;
    this.choiceList = null;
  }

  /**
   * Show one page of text and wait for confirm.
   * `opts.speaker`, `opts.portrait`, `opts.instant`.
   */
  *say(speaker, text, opts = {}) {
    this._open(speaker, opts.portrait);
    this.textEl.textContent = '';
    this.moreEl.classList.add('hidden');

    const chars = [...text];
    let shown = 0;
    let holdFrames = 0;
    let skipped = opts.instant === true;

    while (shown < chars.length) {
      if (skipped) { shown = chars.length; break; }
      const dt = yield { kind: 'tick' };
      if (input.justPressed('confirm') || input.justPressed('cancel')) {
        skipped = true;
        // Once per session. Whether people read the writing or hammer through
        // it is worth knowing; a line-by-line stream is not.
        analytics.once('dialogue-skip', EV.DIALOGUE_SKIPPED, { text_speed: opts.textSpeed ?? null });
        continue;
      }
      if (holdFrames > 0) { holdFrames--; continue; }
      const step = Math.max(1, Math.round(this.speed * (input.isDown('confirm') ? 3 : 1)));
      for (let i = 0; i < step && shown < chars.length; i++) {
        const ch = chars[shown++];
        holdFrames = PUNCTUATION_PAUSE[ch] ?? 0;
        if (holdFrames) break;
      }
      this.textEl.textContent = chars.slice(0, shown).join('');
      if (shown % 3 === 0) this.onSound?.();
    }
    this.textEl.textContent = text;

    if (opts.noWait) return;
    this.moreEl.classList.remove('hidden');
    // Require a fresh press so the same keystroke doesn't skip the next page.
    yield until(() => !input.isDown('confirm'));
    yield until(() => input.justPressed('confirm'));
    this.moreEl.classList.add('hidden');
  }

  /** Several pages in sequence, then close. */
  *speak(speaker, lines, opts = {}) {
    for (const line of [].concat(lines)) {
      yield* this.say(speaker, line, opts);
    }
    if (!opts.keepOpen) this.close();
  }

  /**
   * A choice prompt. Returns the index chosen, or -1 if cancelled and
   * `opts.cancelable` is set.
   */
  *ask(question, choices, opts = {}) {
    if (question) yield* this.say(opts.speaker ?? null, question, { ...opts, noWait: true });
    this._clearChoices();

    let result = null;
    const list = new MenuList({
      items: choices.map((c, i) => (typeof c === 'string' ? { label: c, value: i } : { ...c, value: c.value ?? i })),
      onSelect: (item) => { result = item.value; },
      onCancel: () => { if (opts.cancelable) result = -1; },
    });
    this.choiceList = list;
    this.choiceNode = win({ class: 'dialogue-choices' }, [list.root]);
    this.box.appendChild(this.choiceNode);

    yield until(() => !input.isDown('confirm'));
    while (result === null) {
      yield { kind: 'tick' };
      list.update();
    }
    this._clearChoices();
    if (!opts.keepOpen) this.close();
    return result;
  }
}
