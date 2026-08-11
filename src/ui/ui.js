import { input } from '../engine/input.js';
import { audio } from '../audio/audio.js';

/**
 * A very small DOM UI toolkit.
 *
 * The interface is DOM rather than in-canvas: text stays crisp at any
 * resolution, it scales for free, and a JRPG lives or dies on the legibility of
 * its menus. Everything is driven by the same action names as the rest of the
 * game, so menus work identically on keyboard and pad.
 */

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

/** A framed window in the house style. */
export function win(props = {}, children = []) {
  const { title, flat, ...rest } = props;
  const cls = `win${flat ? ' flat' : ''}${rest.class ? ` ${rest.class}` : ''}`;
  return el('div', { ...rest, class: cls }, [
    title ? el('div', { class: 'win-title', text: title }) : null,
    ...[].concat(children),
  ]);
}

/** Horizontal bar with a fill. */
export function bar(kind, value, max) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const low = kind === 'hp' && pct <= 0.25;
  const crit = kind === 'hp' && pct <= 0.125;
  return el('div', { class: `bar ${kind}${low ? ' low' : ''}${crit ? ' crit' : ''}` }, [
    el('i', { style: { width: `${pct * 100}%` } }),
  ]);
}

/**
 * A keyboard-driven list.
 *
 * Owns its own selection index and wraps. `columns` > 1 lays the items out in a
 * grid and makes left/right move between columns, which is how equipment and
 * item lists want to behave.
 */
export class MenuList {
  constructor({
    items = [], columns = 1, onSelect = null, onCancel = null, onMove = null,
    wrap = true, pageSize = 0, enabled = true,
  } = {}) {
    this.items = items;
    this.columns = columns;
    this.index = 0;
    this.scroll = 0;
    this.pageSize = pageSize;
    this.onSelect = onSelect;
    this.onCancel = onCancel;
    this.onMove = onMove;
    this.wrap = wrap;
    this.enabled = enabled;
    this.root = el('div', { class: 'menu-list' });
    this.rows = [];
    this.render();
  }

  setItems(items, keepIndex = false) {
    this.items = items;
    if (!keepIndex) this.index = 0;
    this.index = Math.max(0, Math.min(this.index, items.length - 1));
    this.render();
  }

  get current() { return this.items[this.index] ?? null; }

  render() {
    this.root.innerHTML = '';
    this.rows = [];
    const visible = this.pageSize > 0
      ? this.items.slice(this.scroll, this.scroll + this.pageSize)
      : this.items;
    const offset = this.pageSize > 0 ? this.scroll : 0;

    if (this.columns > 1) this.root.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`;
    else this.root.style.gridTemplateColumns = '';

    visible.forEach((item, i) => {
      const realIndex = i + offset;
      const disabled = item.disabled === true;
      // A `header` entry is a section rule, not a choice — it is always
      // disabled, so cursor movement steps straight over it.
      const row = el('div', {
        class: `menu-row${realIndex === this.index ? ' selected' : ''}`
          + `${disabled ? ' disabled' : ''}${item.header ? ' menu-header' : ''}`,
        'data-clickable': true,
        onclick: () => { if (!disabled) { this.index = realIndex; this.render(); this.onSelect?.(item, realIndex); } },
        onmouseenter: () => { if (this.index !== realIndex) { this.index = realIndex; this.render(); this.onMove?.(item, realIndex); } },
      }, item.render ? item.render(item) : [
        el('span', { class: 'grow', text: item.label ?? String(item) }),
        item.right ? el('span', { class: 'num dim', text: item.right }) : null,
      ]);
      this.rows.push(row);
      this.root.appendChild(row);
    });
  }

  _clampScroll() {
    if (this.pageSize <= 0) return;
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.pageSize) this.scroll = this.index - this.pageSize + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, this.items.length - this.pageSize)));
  }

  move(delta) {
    if (!this.items.length) return;
    const n = this.items.length;
    let next = this.index + delta;
    if (this.wrap) next = ((next % n) + n) % n;
    else next = Math.max(0, Math.min(n - 1, next));
    // Skip over disabled entries in the direction of travel.
    let guard = 0;
    while (this.items[next]?.disabled && guard++ < n) {
      next += Math.sign(delta) || 1;
      if (this.wrap) next = ((next % n) + n) % n;
      else if (next < 0 || next >= n) { next = this.index; break; }
    }
    if (next === this.index) return;
    this.index = next;
    this._clampScroll();
    this.render();
    audio.sfx('cursor');
    this.onMove?.(this.current, this.index);
  }

  /** Feed input. Returns true if the list consumed the frame's input. */
  update() {
    if (!this.enabled || !this.items.length) return false;
    let used = false;
    if (this.columns > 1) {
      if (input.justPressed('down')) { this.move(this.columns); used = true; }
      if (input.justPressed('up')) { this.move(-this.columns); used = true; }
      if (input.justPressed('right')) { this.move(1); used = true; }
      if (input.justPressed('left')) { this.move(-1); used = true; }
    } else {
      if (input.justPressed('down')) { this.move(1); used = true; }
      if (input.justPressed('up')) { this.move(-1); used = true; }
    }
    if (this.pageSize > 0) {
      if (input.justPressed('pageRight')) { this.move(this.pageSize); used = true; }
      if (input.justPressed('pageLeft')) { this.move(-this.pageSize); used = true; }
    }
    if (input.justPressed('confirm')) {
      const item = this.current;
      if (item && !item.disabled) {
        audio.sfx('confirm');
        this.onSelect?.(item, this.index);
        used = true;
      } else {
        audio.sfx('error');
      }
    }
    if (input.justPressed('cancel')) { audio.sfx('cancel'); this.onCancel?.(); used = true; }
    return used;
  }
}

/** Layer manager: a stack of DOM overlays owned by game states. */
export class UILayer {
  constructor(root, className) {
    this.root = root;
    this.node = el('div', { class: className });
    this.visible = false;
  }

  mount() {
    if (!this.visible) { this.root.appendChild(this.node); this.visible = true; }
    return this;
  }

  unmount() {
    if (this.visible) { this.node.remove(); this.visible = false; }
    return this;
  }

  clear() { this.node.innerHTML = ''; return this; }
}

/** Show the map name in the corner, FF-style. */
export function showAreaTitle(uiRoot, name, subtitle) {
  const existing = uiRoot.querySelector('.area-title');
  existing?.remove();
  const node = el('div', { class: 'area-title' }, [
    document.createTextNode(name),
    subtitle ? el('span', { class: 'sub', text: subtitle }) : null,
  ]);
  uiRoot.appendChild(node);
  // Force a reflow so the animation restarts even for the same element.
  void node.offsetWidth;
  node.classList.add('show');
  setTimeout(() => node.remove(), 3800);
}
