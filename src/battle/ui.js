import { el, win, bar, MenuList } from '../ui/ui.js';
import { input } from '../engine/input.js';
import { ELEMENT_COLOR } from '../engine/palette.js';
import { STATUSES } from './formulas.js';

/**
 * Battle interface.
 *
 * Two persistent panels (party status on the right, the active character's
 * command list on the left) plus transient layers for target selection and
 * floating numbers. Everything is DOM so the text stays sharp and the layout
 * survives any resolution.
 */

export class BattleUI {
  constructor(uiRoot) {
    this.root = uiRoot;
    this.layer = el('div', { id: 'battle-layer' });
    uiRoot.appendChild(this.layer);

    this.partyPanel = win({ class: 'party-panel' }, []);
    this.commandPanel = win({ class: 'command-panel hidden' }, []);
    this.banner = el('div', { class: 'battle-banner' });
    this.tagLayer = el('div', { style: { position: 'absolute', inset: '0' } });
    this.dmgLayer = el('div', { style: { position: 'absolute', inset: '0' } });

    this.layer.append(this.tagLayer, this.dmgLayer, this.partyPanel, this.commandPanel, this.banner);
    this.rows = new Map();
    this.tags = new Map();
    this.menuStack = [];
  }

  destroy() { this.layer.remove(); }

  // --- party panel --------------------------------------------------------

  buildPartyPanel(members) {
    this.partyPanel.innerHTML = '';
    this.rows.clear();
    for (const c of members) {
      const name = el('span', { class: 'pname', text: c.name });
      const hp = el('span', { class: 'num' });
      const mp = el('span', { class: 'num dim' });
      const atbBar = bar('atb', 0, 100);
      const hpBar = bar('hp', c.hp, c.maxHP);
      // The Desperation gauge. It has always filled — from damage taken and
      // from allies going down — persisted between battles, and unlocked a
      // command at 100, and it has never been drawn anywhere in the game.
      // A resource the player cannot see is a resource they cannot plan
      // around, and the risk/reward loop it is built on ("take a beating, get
      // your best move") is unreadable without it.
      const limitBar = bar('limit', c.limit ?? 0, 100);
      const row = el('div', { class: 'party-row' }, [
        el('div', {}, [name, el('div', { style: { marginTop: '3px' } }, [hpBar, limitBar])]),
        el('div', { class: 'pnums', style: { textAlign: 'right' } }, [
          hp, el('span', { class: 'slash', text: '/' }), el('span', { class: 'dim', text: String(c.maxHP) }),
          el('div', { class: 'dim', style: { fontSize: '0.82em' } }, [mp]),
        ]),
        el('div', { class: 'patb' }, [atbBar]),
      ]);
      this.partyPanel.appendChild(row);
      this.rows.set(c.id, { row, name, hp, mp, atbBar, hpBar, limitBar });
    }
  }

  updatePartyPanel(members, activeId) {
    for (const c of members) {
      const r = this.rows.get(c.id);
      if (!r) continue;
      r.hp.textContent = String(Math.max(0, c.hp));
      r.mp.textContent = `MP ${c.mp}/${c.maxMP}`;
      const pct = Math.max(0, Math.min(1, c.hp / c.maxHP));
      r.hpBar.className = `bar hp${pct <= 0.125 ? ' crit' : pct <= 0.25 ? ' low' : ''}`;
      r.hpBar.firstChild.style.width = `${pct * 100}%`;
      const atb = Math.max(0, Math.min(1, c.atb / 100));
      r.atbBar.firstChild.style.width = `${atb * 100}%`;
      r.atbBar.className = `bar atb${atb >= 1 ? ' full' : ''}`;
      const limit = Math.max(0, Math.min(1, (c.limit ?? 0) / 100));
      r.limitBar.firstChild.style.width = `${limit * 100}%`;
      r.limitBar.className = `bar limit${limit >= 1 ? ' full' : ''}`;
      r.row.className = `party-row${c.isKO ? ' dead' : ''}${c.id === activeId ? ' acting' : ''}`;
      // Status glyphs after the name keep ailments visible without a tooltip.
      const badges = Object.keys(c.statuses || {}).filter((s) => STATUSES[s]).slice(0, 4);
      r.name.textContent = c.name + (badges.length ? '  ' + badges.map((s) => STATUS_GLYPH[s] || '•').join('') : '');
    }
  }

  // --- enemy name tags ----------------------------------------------------

  syncEnemyTags(enemies, view, targetedIds = []) {
    // Placed first, then de-collided: six creatures in a line put six labels
    // along the same diagonal, and they used to sit on top of one another —
    // which defeats the point of being able to tell the creatures apart.
    const placed = [];

    for (const e of enemies) {
      let tag = this.tags.get(e.id);
      if (!tag) {
        tag = el('div', { class: 'enemy-name-tag' });
        this.tagLayer.appendChild(tag);
        this.tags.set(e.id, tag);
      }
      if (e.isKO) { tag.style.display = 'none'; continue; }
      tag.style.display = '';
      const targeted = targetedIds.includes(e.id);
      tag.className = `enemy-name-tag${targeted ? ' targeted' : ''}`;
      tag.textContent = e.scanned
        ? `${e.name}  ${e.hp}/${e.maxHP}`
        : e.name;

      const p = view.project(view.anchor(e.id, (e.def.look.scale ?? 1) * 2.1 + 0.5));
      placed.push({ tag, x: p.x, y: p.y, w: tag.offsetWidth || 90, targeted });
    }

    // Lift any label that would sit on one already placed. Left to right, so
    // the stack grows in reading order; the targeted label wins ties by being
    // placed last and therefore lowest, nearest its own creature.
    const LINE = 17;
    placed.sort((a, b) => (a.targeted === b.targeted ? a.x - b.x : (a.targeted ? 1 : -1)));
    const taken = [];
    for (const t of placed) {
      let y = t.y;
      for (let guard = 0; guard < placed.length + 1; guard++) {
        const clash = taken.some((o) => Math.abs(o.y - y) < LINE
          && Math.abs(o.x - t.x) < (o.w + t.w) / 2);
        if (!clash) break;
        y -= LINE;
      }
      taken.push({ x: t.x, y, w: t.w });
      t.tag.style.left = `${t.x}px`;
      t.tag.style.top = `${y}px`;
    }
  }

  clearTags() {
    for (const t of this.tags.values()) t.remove();
    this.tags.clear();
  }

  // --- command menus ------------------------------------------------------

  showCommands(items, { onSelect, onCancel, title = null } = {}) {
    this.commandPanel.classList.remove('hidden');
    this.commandPanel.innerHTML = '';
    if (title) this.commandPanel.appendChild(el('div', { class: 'win-title', text: title }));
    const list = new MenuList({ items, onSelect, onCancel, pageSize: items.length > 9 ? 9 : 0 });
    this.commandPanel.appendChild(list.root);
    this.menuStack.push(list);
    return list;
  }

  popMenu() {
    this.menuStack.pop();
    this.commandPanel.innerHTML = '';
    if (this.menuStack.length) {
      const top = this.menuStack[this.menuStack.length - 1];
      this.commandPanel.appendChild(top.root);
      top.render();
    } else {
      this.commandPanel.classList.add('hidden');
    }
  }

  clearMenus() {
    this.menuStack.length = 0;
    this.commandPanel.innerHTML = '';
    this.commandPanel.classList.add('hidden');
  }

  get activeMenu() { return this.menuStack[this.menuStack.length - 1] || null; }

  // --- floating numbers ---------------------------------------------------

  /**
   * A damage popup. Numbers arc up and outward, scale in with an overshoot and
   * fade — the readability of a hit is most of the feedback in a turn-based
   * fight, so this gets real easing rather than a linear fade.
   */
  popup(screenPos, text, kind = 'damage') {
    const node = el('div', { class: `dmg ${kind}`, text: String(text) });
    node.style.left = `${screenPos.x}px`;
    node.style.top = `${screenPos.y}px`;
    this.dmgLayer.appendChild(node);

    const driftX = (Math.random() - 0.5) * 46;
    const rise = 62 + Math.random() * 18;
    const total = 1050;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / total);
      // Pop in, hang, then drop away.
      const scale = t < 0.16 ? 0.4 + (t / 0.16) * 0.85 : t < 0.26 ? 1.25 - ((t - 0.16) / 0.10) * 0.25 : 1;
      const y = t < 0.45
        ? -rise * (1 - Math.pow(1 - t / 0.45, 2))
        : -rise + (t - 0.45) / 0.55 * (rise * 0.55);
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      node.style.transform = `translate(-50%,-50%) translate(${driftX * t}px, ${y}px) scale(${scale})`;
      node.style.opacity = String(alpha);
      if (t < 1) requestAnimationFrame(step);
      else node.remove();
    };
    requestAnimationFrame(step);
  }

  /** Big centred text: "VICTORY", boss names, phase changes. */
  showBanner(text, seconds = 1.8, color = null) {
    this.banner.textContent = text;
    if (color) this.banner.style.color = color;
    this.banner.style.opacity = '0';
    this.banner.animate([
      { opacity: 0, letterSpacing: '0.7em', transform: 'translate(-50%,-50%) scale(1.1)' },
      { opacity: 1, letterSpacing: '0.28em', transform: 'translate(-50%,-50%) scale(1)', offset: 0.22 },
      { opacity: 1, offset: 0.78 },
      { opacity: 0, letterSpacing: '0.42em' },
    ], { duration: seconds * 1000, easing: 'cubic-bezier(.2,.9,.3,1)' });
  }

  /** A one-line notice above the command panel (spell names, misses, etc). */
  showAction(text) {
    let node = this.layer.querySelector('.action-banner');
    if (!node) {
      node = el('div', { class: 'action-banner' });
      Object.assign(node.style, {
        position: 'absolute', left: '50%', top: '13%', transform: 'translateX(-50%)',
        fontSize: 'calc(19 * var(--u))', letterSpacing: '.14em',
        padding: 'calc(5 * var(--u)) calc(16 * var(--u))',
        background: 'rgba(8,12,32,.78)', borderRadius: 'calc(3 * var(--u))',
        boxShadow: 'inset 0 0 0 calc(1 * var(--u)) rgba(143,166,232,.5)',
        fontFamily: 'var(--font-display)',
      });
      this.layer.appendChild(node);
    }
    node.textContent = text;
    node.style.opacity = '1';
    clearTimeout(this._actionTimer);
    this._actionTimer = setTimeout(() => { node.style.transition = 'opacity .35s'; node.style.opacity = '0'; }, 900);
  }
}

const STATUS_GLYPH = {
  poison: '☠', venom: '☠', blind: '◐', silence: '♪', sleep: 'z', confuse: '?',
  slow: '▼', haste: '▲', protect: '⛊', shell: '⌂', reflect: '◇', regen: '✚',
  stop: '⊘', doom: '⌛', berserk: '‼', stone: '▣', imp: '☺', float: '⇡', vanish: '◌',
  zombie: '☣', charm: '♥', critUp: '✦', safe: '⛨', freeze: '❄', paralysis: '⚡', seizure: '≈',
};
