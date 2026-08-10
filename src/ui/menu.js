import { el, win, bar, MenuList } from './ui.js';
import { input } from '../engine/input.js';
import { audio } from '../audio/audio.js';
import { ITEMS, isEquippable } from '../data/items.js';
import { SPELLS, spellCost, SCHOOL_COLOR } from '../data/spells.js';
import { STATUSES } from '../battle/formulas.js';
import { CHARACTERS } from '../data/characters.js';
import { ESPERS } from '../data/espers.js';

/**
 * The field menu.
 *
 * A stack of screens, each of which owns a MenuList and a detail pane. Screens
 * push and pop; cancel always goes back exactly one level, which is the
 * contract players expect and the thing that makes a deep menu tree usable.
 */

const SLOT_ORDER = ['weapon', 'offhand', 'head', 'body', 'relic1', 'relic2'];
const SLOT_LABEL = {
  weapon: 'Weapon', offhand: 'Off-hand', head: 'Head',
  body: 'Body', relic1: 'Relic', relic2: 'Relic',
};

export class MenuSystem {
  constructor(game) {
    this.game = game;
    this.root = el('div', { id: 'menu-layer', class: 'hidden' });
    Object.assign(this.root.style, {
      position: 'absolute', inset: '0', zIndex: '50',
      background: 'linear-gradient(180deg, rgba(4,6,15,.55), rgba(4,6,15,.78))',
      backdropFilter: 'blur(calc(3 * var(--u)))',
      display: 'grid',
      gridTemplateColumns: 'minmax(calc(190 * var(--u)), 0.85fr) 2.8fr',
      // The flexible row must be the one holding the sidebar and content; a
      // third 'auto' row here would hand the slack to the footer instead.
      gridTemplateRows: '1fr auto',
      gap: 'calc(12 * var(--u))',
      padding: 'calc(18 * var(--u))',
    });
    game.uiRoot.appendChild(this.root);

    this.sidebar = win({ class: 'menu-sidebar' }, []);
    this.content = win({ class: 'menu-content' }, []);
    this.footer = win({ class: 'menu-footer flat' }, []);
    Object.assign(this.sidebar.style, { alignSelf: 'start' });
    Object.assign(this.content.style, { overflowY: 'auto', alignSelf: 'stretch' });
    Object.assign(this.footer.style, { gridColumn: '1 / -1', alignSelf: 'end', padding: 'calc(7 * var(--u)) calc(12 * var(--u))' });

    this.root.append(this.sidebar, this.content, this.footer);
    this.stack = [];
    this.open = false;
  }

  // --- lifecycle ----------------------------------------------------------

  show() {
    if (this.open) return;
    this.open = true;
    this.root.classList.remove('hidden');
    this.stack = [];
    this._pushRoot();
    this._renderFooter();
  }

  hide() {
    this.open = false;
    this.root.classList.add('hidden');
    this.stack = [];
    this.sidebar.innerHTML = '';
    this.content.innerHTML = '';
  }

  update() {
    if (!this.open) return;
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    top.list?.update();
    if (input.justPressed('menu')) { audio.sfx('cancel'); this.hide(); }
    this._renderFooter();
  }

  _push(screen) {
    this.stack.push(screen);
    this._render();
  }

  _pop() {
    this.stack.pop();
    if (!this.stack.length) { this.hide(); return; }
    this._render();
  }

  _render() {
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    this.sidebar.innerHTML = '';
    if (top.title) this.sidebar.appendChild(el('div', { class: 'win-title', text: top.title }));
    if (top.list) this.sidebar.appendChild(top.list.root);
    this.content.innerHTML = '';
    top.renderContent?.(this.content);
  }

  /** Re-render just the detail pane, e.g. as the cursor moves. */
  _refreshContent() {
    const top = this.stack[this.stack.length - 1];
    this.content.innerHTML = '';
    top?.renderContent?.(this.content);
  }

  // --- root screen --------------------------------------------------------

  _pushRoot() {
    const items = [
      { label: 'Items', act: () => this._pushItems() },
      { label: 'Magic', act: () => this._pushCharacterPick('Magic', (m) => this._pushMagic(m)) },
      { label: 'Equip', act: () => this._pushCharacterPick('Equip', (m) => this._pushEquip(m)) },
      { label: 'Status', act: () => this._pushCharacterPick('Status', (m) => this._pushStatus(m)) },
      { label: 'Espers', act: () => this._pushCharacterPick('Espers', (m) => this._pushEspers(m)) },
      { label: 'Formation', act: () => this._pushFormation() },
      { label: 'Bestiary', act: () => this._pushBestiary() },
      { label: 'Quests', act: () => this._pushQuests() },
      { label: 'Config', act: () => this._pushConfig() },
      { label: 'Save', act: () => this._pushSave() },
      { label: 'Load', act: () => this._pushLoad() },
    ];
    const list = new MenuList({
      items,
      onSelect: (i) => i.act(),
      onCancel: () => this.hide(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: 'Menu', list,
      renderContent: (node) => this._renderPartyOverview(node),
    });
  }

  _renderPartyOverview(node) {
    const party = this.game.party;
    const grid = el('div', { style: { display: 'grid', gap: 'calc(10 * var(--u))' } });
    for (const m of party.activeMembers) {
      grid.appendChild(this._memberCard(m));
    }
    node.appendChild(grid);
  }

  _memberCard(m) {
    const hpPct = m.hp / m.maxHP;
    return el('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 'calc(12 * var(--u))',
        alignItems: 'center',
        padding: 'calc(8 * var(--u))',
        borderRadius: 'calc(3 * var(--u))',
        background: 'rgba(255,255,255,.03)',
        boxShadow: 'inset 0 0 0 1px rgba(143,166,232,.18)',
      },
    }, [
      el('div', {
        style: {
          width: 'calc(46 * var(--u))', height: 'calc(46 * var(--u))',
          borderRadius: 'calc(3 * var(--u))',
          background: `linear-gradient(160deg, ${m.def.portraitTint}, #0b1230)`,
          boxShadow: 'inset 0 0 0 1px rgba(143,166,232,.4)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-display)', fontSize: 'calc(22 * var(--u))',
        },
        text: m.name[0],
      }),
      el('div', {}, [
        el('div', { style: { display: 'flex', gap: 'calc(8 * var(--u))', alignItems: 'baseline' } }, [
          el('span', { style: { fontSize: 'calc(16 * var(--u))' }, text: m.name }),
          el('span', { class: 'dim', style: { fontSize: 'calc(12 * var(--u))' }, text: m.def.title }),
        ]),
        el('div', { class: 'dim', style: { fontSize: 'calc(12 * var(--u))', marginTop: '2px' }, text: `Lv ${m.level}` }),
        el('div', { style: { marginTop: 'calc(4 * var(--u))', display: 'grid', gap: '3px' } }, [
          bar(hpPct <= 0.25 ? 'hp low' : 'hp', m.hp, m.maxHP),
          bar('mp', m.mp, m.maxMP),
        ]),
      ]),
      el('div', { class: 'right num', style: { fontSize: 'calc(13 * var(--u))' } }, [
        el('div', { text: `${m.hp}/${m.maxHP}` }),
        el('div', { class: 'dim', text: `${m.mp}/${m.maxMP}` }),
        el('div', { class: 'dim', style: { marginTop: '3px' }, text: `next ${m.expToNext}` }),
      ]),
    ]);
  }

  _renderFooter() {
    const p = this.game.party;
    const time = p.playTime;
    const hh = String(Math.floor(time / 3600)).padStart(2, '0');
    const mm = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(time % 60)).padStart(2, '0');
    this.footer.innerHTML = '';
    this.footer.appendChild(el('div', {
      style: { display: 'flex', justifyContent: 'space-between', fontSize: 'calc(14 * var(--u))' },
    }, [
      el('span', { class: 'dim', text: this.stack.map((s) => s.title).filter(Boolean).join('  ›  ') }),
      el('span', {}, [
        el('span', { class: 'dim', text: 'Time ' }),
        el('span', { class: 'num', text: `${hh}:${mm}:${ss}` }),
        el('span', { class: 'dim', text: '   Gil ' }),
        el('span', { class: 'num gold', text: p.gold.toLocaleString() }),
      ]),
    ]));
  }

  // --- character picker ---------------------------------------------------

  _pushCharacterPick(title, then) {
    const members = this.game.party.activeMembers;
    const list = new MenuList({
      items: members.map((m) => ({ label: m.name, right: `Lv ${m.level}`, member: m })),
      onSelect: (i) => then(i.member),
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title, list,
      renderContent: (node) => {
        const m = list.current?.member;
        if (m) node.appendChild(this._memberCard(m));
      },
    });
  }

  // --- items --------------------------------------------------------------

  _pushItems() {
    const rebuild = () => [...this.game.party.inventory.entries()]
      .map(([id, count]) => ({ id, count, item: ITEMS[id] }))
      .filter((e) => e.item)
      .sort((a, b) => (a.item.kind === b.item.kind ? a.item.name.localeCompare(b.item.name) : a.item.kind.localeCompare(b.item.kind)))
      .map((e) => ({ label: e.item.name, right: `×${e.count}`, entry: e }));

    const list = new MenuList({
      items: rebuild(),
      pageSize: 14,
      onSelect: (i) => this._useItem(i.entry, () => list.setItems(rebuild(), true)),
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    if (!list.items.length) list.setItems([{ label: '(empty)', disabled: true }]);
    this._push({
      title: 'Items', list,
      renderContent: (node) => {
        const item = list.current?.entry?.item;
        if (!item) return;
        node.appendChild(el('div', { style: { display: 'grid', gap: 'calc(8 * var(--u))' } }, [
          el('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'calc(20 * var(--u))' }, text: item.name }),
          el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' }, text: item.desc || '' }),
          item.stats ? el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' },
            text: Object.entries(item.stats).map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`).join('   ') }) : null,
          item.price ? el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' }, text: `Sells for ${item.sell} gil` }) : null,
        ]));
      },
    });
  }

  _useItem(entry, refresh) {
    const item = entry.item;
    if (item.kind !== 'consumable') { audio.sfx('error'); return; }
    // Field use targets a party member.
    const members = this.game.party.activeMembers;
    const list = new MenuList({
      items: members.map((m) => ({ label: m.name, right: `${m.hp}/${m.maxHP}`, member: m })),
      onSelect: (i) => {
        const m = i.member;
        const e = item.effect || {};
        let did = false;
        if (e.heal && !m.isKO) { did = m.heal(e.heal) > 0; }
        if (e.mp) { did = m.restoreMP(e.mp) > 0 || did; }
        if (e.fullHeal && !m.isKO) { m.hp = m.maxHP; did = true; }
        if (e.fullMP) { m.mp = m.maxMP; did = true; }
        if (e.cure) for (const s of e.cure) if (m.statuses[s]) { delete m.statuses[s]; did = true; }
        if (e.cureAll) { m.statuses = {}; did = true; }
        if (e.revive && m.isKO) { m.hp = Math.floor(m.maxHP * e.revive); did = true; }
        if (!did) { audio.sfx('error'); return; }
        audio.sfx('heal');
        this.game.party.removeItem(item.id, 1);
        refresh();
        this._pop();
      },
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: `Use ${item.name}`, list,
      renderContent: (node) => {
        const m = list.current?.member;
        if (m) node.appendChild(this._memberCard(m));
      },
    });
  }

  // --- magic --------------------------------------------------------------

  _pushMagic(member) {
    const known = Object.entries(member.spells)
      .map(([id, prof]) => ({ spell: SPELLS[id], prof }))
      .filter((e) => e.spell)
      .sort((a, b) => (a.spell.school === b.spell.school ? a.spell.tier - b.spell.tier : a.spell.school.localeCompare(b.spell.school)));

    const list = new MenuList({
      items: known.length ? known.map((e) => ({
        label: e.spell.name,
        right: e.prof >= 100 ? `${spellCost(e.spell, member)} MP` : `${Math.floor(e.prof)}%`,
        disabled: e.prof < 100,
        entry: e,
      })) : [{ label: '(no magic learned)', disabled: true }],
      pageSize: 14,
      onSelect: () => audio.sfx('error'),   // field casting comes later
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: `${member.name} — Magic`, list,
      renderContent: (node) => {
        const e = list.current?.entry;
        if (!e) return;
        const s = e.spell;
        node.appendChild(el('div', { style: { display: 'grid', gap: 'calc(6 * var(--u))' } }, [
          el('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'calc(20 * var(--u))', color: SCHOOL_COLOR[s.school] }, text: s.name }),
          el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' }, text: `${s.school} magic · ${s.target}` }),
          s.power ? el('div', { style: { fontSize: 'calc(14 * var(--u))' }, text: `Power ${s.power}` }) : null,
          s.element ? el('div', { class: `el-${s.element}`, style: { fontSize: 'calc(14 * var(--u))' }, text: `Element: ${s.element}` }) : null,
          el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' }, text: `Cost ${spellCost(s, member)} MP` }),
          e.prof < 100 ? el('div', { class: 'gold', style: { fontSize: 'calc(13 * var(--u))' }, text: `Learning: ${Math.floor(e.prof)}%` }) : null,
        ]));
      },
    });
  }

  // --- espers -------------------------------------------------------------

  _pushEspers(member) {
    const party = this.game.party;
    const owned = [...party.espers].map((id) => ESPERS[id]).filter(Boolean);

    // Who currently carries each esper — an esper can only be in one place.
    const holderOf = (esperId) => {
      for (const m of party.roster.values()) {
        if (m.esper?.id === esperId && m.id !== member.id) return m.name;
      }
      return null;
    };

    const rebuild = () => [{ label: '(none)', esper: null }].concat(
      owned.map((e) => {
        const holder = holderOf(e.id);
        return {
          label: `${member.esper?.id === e.id ? '◆' : ' '} ${e.name}`,
          right: holder ? `— ${holder}` : (member.esper?.id === e.id ? 'equipped' : ''),
          esper: e,
          disabled: !!holder,
        };
      }));

    const list = new MenuList({
      items: owned.length ? rebuild() : [{ label: '(no espers found)', disabled: true }],
      pageSize: 12,
      onSelect: (i) => {
        member.esper = i.esper;
        member.hp = Math.min(member.hp, member.maxHP);
        member.mp = Math.min(member.mp, member.maxMP);
        audio.sfx('confirm');
        list.setItems(rebuild(), true);
        this._refreshContent();
      },
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });

    this._push({
      title: `${member.name} — Esper`, list,
      renderContent: (node) => {
        const e = list.current?.esper;
        if (!e) {
          node.appendChild(el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' },
            text: 'An equipped esper teaches its magic a little after every battle, and shapes what this character becomes on level-up.' }));
          return;
        }
        const spells = Object.entries(e.teaches).map(([id, rate]) => {
          const known = member.knowsSpell(id);
          const prof = Math.floor(member.spells[id] ?? 0);
          return el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 'calc(13 * var(--u))' } }, [
            el('span', { style: { color: known ? 'var(--good)' : 'var(--text)' }, text: SPELLS[id]?.name ?? id }),
            el('span', { class: 'dim num', text: known ? 'learned' : `${prof}%  (+${rate}/battle)` }),
          ]);
        });
        node.appendChild(el('div', { style: { display: 'grid', gap: 'calc(7 * var(--u))' } }, [
          el('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'calc(21 * var(--u))', color: e.color }, text: e.name }),
          el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' }, text: e.title }),
          el('div', { style: { fontStyle: 'italic', fontSize: 'calc(13 * var(--u))', opacity: 0.85 }, text: e.flavour }),
          el('div', { class: 'win-title', style: { marginTop: 'calc(6 * var(--u))' }, text: 'Teaches' }),
          ...spells,
          el('div', { class: 'win-title', style: { marginTop: 'calc(6 * var(--u))' }, text: 'While equipped' }),
          el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' },
            text: Object.entries(e.bonus || {}).map(([k, v]) => `${k.toUpperCase()} +${v}`).join('   ') || '—' }),
          el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' },
            text: `On level-up: ${Object.entries(e.growth || {}).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ') || '—'}` }),
          el('div', { class: 'win-title', style: { marginTop: 'calc(6 * var(--u))' }, text: 'Summon' }),
          el('div', { style: { fontSize: 'calc(14 * var(--u))' } }, [
            el('span', { text: e.summon.name }),
            el('span', { class: 'dim', text: `   ${e.mp} MP   ${e.summon.target}` }),
          ]),
        ]));
      },
    });
  }

  // --- equipment ----------------------------------------------------------

  _pushEquip(member) {
    const list = new MenuList({
      items: SLOT_ORDER.map((slot) => ({
        label: SLOT_LABEL[slot],
        right: member.equipment[slot]?.name ?? '—',
        slot,
      })),
      onSelect: (i) => this._pushEquipChoice(member, i.slot),
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: `${member.name} — Equip`, list,
      renderContent: (node) => this._renderStats(node, member),
    });
  }

  _pushEquipChoice(member, slot) {
    const party = this.game.party;
    const candidates = [...party.inventory.keys()]
      .map((id) => ITEMS[id])
      .filter((item) => item && item.slot === slot && isEquippable(item, member));
    const items = [{ label: '(remove)', item: null }].concat(
      candidates.map((item) => ({ label: item.name, right: `×${party.countItem(item.id)}`, item })));

    const list = new MenuList({
      items,
      pageSize: 12,
      onSelect: (i) => {
        const prev = member.equipment[slot];
        if (prev) party.addItem(prev.id, 1);
        if (i.item) {
          party.removeItem(i.item.id, 1);
          member.equipment[slot] = i.item;
        } else {
          member.equipment[slot] = null;
        }
        member.hp = Math.min(member.hp, member.maxHP);
        member.mp = Math.min(member.mp, member.maxMP);
        audio.sfx('confirm');
        this._pop();
        this._render();
      },
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: SLOT_LABEL[slot], list,
      renderContent: (node) => this._renderStats(node, member, list.current?.item, slot),
    });
  }

  /**
   * Stat block, optionally showing the delta a candidate piece of equipment
   * would cause. Comparison is the entire point of an equip screen.
   */
  _renderStats(node, member, candidate = undefined, slot = null) {
    const stats = ['vig', 'spd', 'sta', 'mag', 'res', 'lck'];
    const current = {};
    for (const s of stats) current[s] = member.stat(s);
    current.hp = member.maxHP;
    current.mp = member.maxMP;

    let after = null;
    if (candidate !== undefined && slot) {
      const saved = member.equipment[slot];
      member.equipment[slot] = candidate;
      after = {};
      for (const s of stats) after[s] = member.stat(s);
      after.hp = member.maxHP;
      after.mp = member.maxMP;
      member.equipment[slot] = saved;
    }

    const row = (label, key) => {
      const a = current[key];
      const b = after?.[key];
      const delta = b === undefined ? 0 : b - a;
      return el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 'calc(14 * var(--u))' } }, [
        el('span', { class: 'dim', text: label }),
        el('span', {}, [
          el('span', { class: 'num', text: String(a) }),
          delta !== 0 ? el('span', {
            class: 'num',
            style: { color: delta > 0 ? 'var(--good)' : 'var(--danger)', marginLeft: 'calc(6 * var(--u))' },
            text: `${delta > 0 ? '▲' : '▼'} ${b}`,
          }) : null,
        ]),
      ]);
    };

    node.appendChild(el('div', { style: { display: 'grid', gap: 'calc(4 * var(--u))', maxWidth: 'calc(300 * var(--u))' } }, [
      el('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'calc(18 * var(--u))', marginBottom: 'calc(4 * var(--u))' }, text: member.name }),
      row('Max HP', 'hp'), row('Max MP', 'mp'),
      row('Vigour', 'vig'), row('Speed', 'spd'), row('Stamina', 'sta'),
      row('Magic', 'mag'), row('Resist', 'res'), row('Luck', 'lck'),
    ]));

    if (candidate) {
      node.appendChild(el('div', { class: 'dim', style: { marginTop: 'calc(10 * var(--u))', fontSize: 'calc(13 * var(--u))' }, text: candidate.desc || '' }));
    }
  }

  // --- status -------------------------------------------------------------

  _pushStatus(member) {
    const list = new MenuList({
      items: [{ label: 'Back' }],
      onSelect: () => this._pop(),
      onCancel: () => this._pop(),
    });
    this._push({
      title: `${member.name} — Status`, list,
      renderContent: (node) => {
        const ailments = Object.keys(member.statuses).map((s) => STATUSES[s]?.name).filter(Boolean);
        node.appendChild(el('div', { style: { display: 'grid', gap: 'calc(10 * var(--u))' } }, [
          this._memberCard(member),
          el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' }, text: member.def.role }),
          el('div', { style: { fontSize: 'calc(14 * var(--u))' }, text: `EXP ${member.exp}  ·  next level in ${member.expToNext}` }),
          el('div', { style: { fontSize: 'calc(14 * var(--u))' } }, [
            el('span', { class: 'dim', text: 'Condition: ' }),
            el('span', { text: ailments.length ? ailments.join(', ') : 'Normal' }),
          ]),
          el('div', { style: { marginTop: 'calc(8 * var(--u))' } }, [
            el('div', { class: 'win-title', text: 'Equipment' }),
            ...SLOT_ORDER.map((slot) => el('div', {
              style: { display: 'flex', justifyContent: 'space-between', fontSize: 'calc(13 * var(--u))' },
            }, [
              el('span', { class: 'dim', text: SLOT_LABEL[slot] }),
              el('span', { text: member.equipment[slot]?.name ?? '—' }),
            ])),
          ]),
        ]));
      },
    });
  }

  // --- formation ----------------------------------------------------------

  _pushFormation() {
    const party = this.game.party;
    const rebuild = () => {
      const all = [...party.roster.keys()];
      return all.map((id) => {
        const m = party.member(id);
        const active = party.active.includes(id);
        return {
          label: `${active ? '●' : '○'} ${m.name}`,
          right: `${party.row.get(id) === 'back' ? 'Back' : 'Front'}  Lv ${m.level}`,
          id, member: m,
        };
      });
    };
    const list = new MenuList({
      items: rebuild(),
      onSelect: (i) => {
        // Confirm toggles active membership; `special` flips the row.
        if (party.active.includes(i.id)) {
          if (party.active.length > 1) party.setActive(party.active.filter((x) => x !== i.id));
          else audio.sfx('error');
        } else if (party.active.length < 4) {
          party.setActive([...party.active, i.id]);
        } else audio.sfx('error');
        list.setItems(rebuild(), true);
        this._refreshContent();
      },
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: 'Formation', list,
      renderContent: (node) => {
        node.appendChild(el('div', { style: { display: 'grid', gap: 'calc(8 * var(--u))' } }, [
          el('div', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' },
            text: 'Confirm adds or removes a member. Back row halves physical damage dealt and taken.' }),
          ...party.activeMembers.map((m) => this._memberCard(m)),
        ]));
      },
    });
    // Row toggle on the "special" action.
    const origUpdate = list.update.bind(list);
    list.update = () => {
      if (input.justPressed('special') && list.current) {
        const id = list.current.id;
        party.row.set(id, party.row.get(id) === 'back' ? 'front' : 'back');
        audio.sfx('confirm');
        list.setItems(rebuild(), true);
        return true;
      }
      return origUpdate();
    };
  }

  // --- bestiary & quests --------------------------------------------------

  _pushBestiary() {
    const entries = [...this.game.party.bestiary.entries()];
    const list = new MenuList({
      items: entries.length
        ? entries.map(([id, count]) => ({ label: id, right: `×${count}` }))
        : [{ label: '(nothing recorded)', disabled: true }],
      pageSize: 14,
      onSelect: () => {},
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({ title: 'Bestiary', list, renderContent: (node) => {
      node.appendChild(el('div', { class: 'dim', text: `${entries.length} species recorded.` }));
    } });
  }

  _pushQuests() {
    const q = [...this.game.party.quests.entries()];
    const list = new MenuList({
      items: q.length ? q.map(([id, st]) => ({ label: id, right: st.done ? 'Complete' : `Stage ${st.stage}` }))
        : [{ label: '(no quests)', disabled: true }],
      onSelect: () => {},
      onCancel: () => this._pop(),
    });
    this._push({ title: 'Quests', list, renderContent: () => {} });
  }

  // --- config -------------------------------------------------------------

  _pushConfig() {
    const cfg = this.game.config;
    const rebuild = () => [
      { label: 'ATB Mode', right: cfg.atbMode === 'active' ? 'Active' : 'Wait', key: 'atbMode' },
      { label: 'Battle Speed', right: String(cfg.battleSpeed), key: 'battleSpeed' },
      { label: 'Text Speed', right: String(cfg.textSpeed), key: 'textSpeed' },
      { label: 'Music Volume', right: `${Math.round(cfg.musicVolume * 100)}%`, key: 'musicVolume' },
      { label: 'Sound Volume', right: `${Math.round(cfg.sfxVolume * 100)}%`, key: 'sfxVolume' },
      { label: 'Graphics', right: cfg.quality, key: 'quality' },
      { label: 'Window Colour', right: cfg.windowColour, key: 'windowColour' },
    ];
    const list = new MenuList({
      items: rebuild(),
      onSelect: () => {},
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    // Left/right adjust the highlighted setting.
    const origUpdate = list.update.bind(list);
    list.update = () => {
      const dir = input.justPressed('right') ? 1 : input.justPressed('left') ? -1 : 0;
      if (dir && list.current) {
        this._adjustConfig(list.current.key, dir);
        list.setItems(rebuild(), true);
        audio.sfx('cursor');
        return true;
      }
      // Suppress the base class's own left/right handling.
      if (input.justPressed('left') || input.justPressed('right')) return true;
      return origUpdate();
    };
    this._push({
      title: 'Config', list,
      renderContent: (node) => {
        node.appendChild(el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' },
          text: 'Left and right adjust the highlighted setting.' }));
      },
    });
  }

  _adjustConfig(key, dir) {
    const cfg = this.game.config;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    switch (key) {
      case 'atbMode': cfg.atbMode = cfg.atbMode === 'active' ? 'wait' : 'active'; break;
      case 'battleSpeed': cfg.battleSpeed = clamp(cfg.battleSpeed + dir, 1, 6); break;
      case 'textSpeed': cfg.textSpeed = clamp(cfg.textSpeed + dir, 1, 6); break;
      case 'musicVolume':
        cfg.musicVolume = clamp(Math.round((cfg.musicVolume + dir * 0.1) * 10) / 10, 0, 1);
        audio.setVolume('music', cfg.musicVolume);
        break;
      case 'sfxVolume':
        cfg.sfxVolume = clamp(Math.round((cfg.sfxVolume + dir * 0.1) * 10) / 10, 0, 1);
        audio.setVolume('sfx', cfg.sfxVolume);
        break;
      case 'quality': {
        const levels = ['low', 'medium', 'high', 'ultra'];
        const i = clamp(levels.indexOf(cfg.quality) + dir, 0, levels.length - 1);
        cfg.quality = levels[i];
        this.game.renderer.setQuality(cfg.quality);
        break;
      }
      case 'windowColour': {
        const themes = Object.keys(WINDOW_THEMES);
        const i = (themes.indexOf(cfg.windowColour) + dir + themes.length) % themes.length;
        cfg.windowColour = themes[i];
        applyWindowTheme(cfg.windowColour);
        break;
      }
    }
    this.game.saveConfig?.();
  }

  // --- save ---------------------------------------------------------------

  /**
   * Load a saved game.
   *
   * There was no way to do this at all: the game wrote saves that nothing
   * could ever read back.
   */
  _pushLoad() {
    const slots = this.game.saves.list();
    const list = new MenuList({
      items: slots.map((s, i) => ({
        label: `Slot ${i + 1}`,
        right: s ? `${s.location} · Lv ${s.level} · ${s.time}` : 'Empty',
        slot: i, disabled: !s,
      })),
      onSelect: (i) => {
        const data = this.game.saves.load(i.slot);
        if (!data) return;
        audio.sfx('confirm');
        this.hide();
        this.game.loadFrom(data);
      },
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: 'Load', list,
      renderContent: (node) => {
        node.appendChild(el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' },
          text: 'Resume from a slot. Anything since that save is lost.' }));
      },
    });
  }

  _pushSave() {
    const slots = this.game.saves.list();
    const list = new MenuList({
      items: slots.map((s, i) => ({
        label: `Slot ${i + 1}`,
        right: s ? `${s.location} · Lv ${s.level} · ${s.time}` : 'Empty',
        slot: i,
      })),
      onSelect: (i) => {
        // `onSelect` hands over the chosen *item*, not its index. Passing it
        // straight to `save` wrote every slot to the key
        // "aetherbound.save.[object Object]", so the three slots stayed empty
        // no matter how often the player saved — and the save screen showed
        // "Empty" against a game they had just written.
        this.game.saves.save(i.slot, this.game);
        audio.sfx('chest');
        this._pop();
      },
      onCancel: () => this._pop(),
      onMove: () => this._refreshContent(),
    });
    this._push({
      title: 'Save', list,
      renderContent: (node) => {
        node.appendChild(el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' },
          text: 'Choose a slot to write to. Existing data will be overwritten.' }));
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Window themes — the classic configurable menu colour.
// ---------------------------------------------------------------------------

export const WINDOW_THEMES = {
  Sapphire: ['#1b2a5e', '#070c22', '#8fa6e8'],
  Ember:    ['#5e1b1b', '#220707', '#e8a68f'],
  Moss:     ['#1b4a33', '#07220f', '#8fe8b4'],
  Violet:   ['#3b1b5e', '#150722', '#c08fe8'],
  Slate:    ['#2a2f38', '#0d0f14', '#a9b4c4'],
  Aether:   ['#0d3f4a', '#03181c', '#6fe8f0'],
};

export function applyWindowTheme(name) {
  const theme = WINDOW_THEMES[name] || WINDOW_THEMES.Sapphire;
  const root = document.documentElement;
  root.style.setProperty('--win-top', theme[0]);
  root.style.setProperty('--win-bottom', theme[1]);
  root.style.setProperty('--win-edge-light', theme[2]);
}
