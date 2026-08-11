import { analytics, EV } from '../engine/analytics.js';
import { el, win, MenuList } from './ui.js';
import { input } from '../engine/input.js';
import { audio } from '../audio/audio.js';
import { until } from '../engine/scheduler.js';
import { ITEMS, SHOPS, isEquippable } from '../data/items.js';

/**
 * Shops.
 *
 * Buying shows, for every party member, what the item would do to their stats
 * if equipped — the comparison is the decision, and making the player leave the
 * shop to find out is the single most annoying thing a JRPG store can do.
 */

const SLOT_LABEL = { weapon: 'Wpn', offhand: 'Off', head: 'Head', body: 'Body', relic1: 'Relic', relic2: 'Relic' };

export class ShopScreen {
  constructor(game) {
    this.game = game;
    this.root = el('div', { id: 'shop-layer' });
    Object.assign(this.root.style, {
      position: 'absolute', inset: '0', zIndex: '55',
      background: 'linear-gradient(180deg, rgba(4,6,15,.5), rgba(4,6,15,.76))',
      backdropFilter: 'blur(calc(3 * var(--u)))',
      display: 'grid',
      gridTemplateColumns: 'minmax(calc(240 * var(--u)), 1fr) 1.5fr',
      gridTemplateRows: 'auto 1fr auto',
      gap: 'calc(12 * var(--u))',
      padding: 'calc(20 * var(--u))',
    });
    this.header = win({ flat: true }, []);
    this.list = win({}, []);
    this.detail = win({}, []);
    this.footer = win({ flat: true }, []);
    this.header.style.gridColumn = '1 / -1';
    this.footer.style.gridColumn = '1 / -1';
    Object.assign(this.list.style, { alignSelf: 'start' });
    Object.assign(this.detail.style, { overflowY: 'auto' });
    this.root.append(this.header, this.list, this.detail, this.footer);
    this.done = false;
  }

  /** Run the shop. Use inside a coroutine: `yield* shop.run('harrowmere_items')`. */
  *run(shopId) {
    const shop = SHOPS[shopId];
    if (!shop) return;
    this.game.uiRoot.appendChild(this.root);
    this.done = false;
    this.mode = 'menu';
    audio.sfx('confirm');

    this._renderHeader(shop.name);
    this._openMainMenu(shop);

    while (!this.done) {
      yield { kind: 'tick' };
      this.current?.update();
      this._renderFooter();
    }
    this.root.remove();
  }

  _renderHeader(name) {
    this.header.innerHTML = '';
    this.header.appendChild(el('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
    }, [
      el('span', { style: { fontFamily: 'var(--font-display)', fontSize: 'calc(22 * var(--u))', letterSpacing: '.08em' }, text: name }),
      el('span', { class: 'dim', style: { fontSize: 'calc(13 * var(--u))' }, text: 'Confirm to buy · Cancel to go back' }),
    ]));
  }

  _renderFooter() {
    this.footer.innerHTML = '';
    this.footer.appendChild(el('div', {
      style: { display: 'flex', justifyContent: 'flex-end', fontSize: 'calc(15 * var(--u))' },
    }, [
      el('span', { class: 'dim', text: 'Gil  ' }),
      el('span', { class: 'num gold', text: this.game.party.gold.toLocaleString() }),
    ]));
  }

  _setList(menu) {
    this.current = menu;
    this.list.innerHTML = '';
    if (menu.title) this.list.appendChild(el('div', { class: 'win-title', text: menu.title }));
    this.list.appendChild(menu.root);
  }

  _openMainMenu(shop) {
    const menu = new MenuList({
      items: [{ label: 'Buy' }, { label: 'Sell' }, { label: 'Leave' }],
      onSelect: (i) => {
        if (i.label === 'Buy') this._openBuy(shop);
        else if (i.label === 'Sell') this._openSell(shop);
        else { audio.sfx('cancel'); this.done = true; }
      },
      onCancel: () => { this.done = true; },
    });
    menu.title = shop.name;
    this._setList(menu);
    this._renderDetail(null);
  }

  _openBuy(shop) {
    const party = this.game.party;
    const items = shop.stock.map((id) => ITEMS[id]).filter(Boolean).map((item) => ({
      label: item.name,
      right: `${item.price}`,
      item,
      disabled: party.gold < item.price,
    }));
    const menu = new MenuList({
      items,
      pageSize: 12,
      onSelect: (i) => {
        if (party.spendGold(i.item.price)) {
          analytics.track(EV.ITEM_BOUGHT, {
            item: i.item.id, item_name: i.item.name, kind: i.item.kind,
            price: i.item.price, gold_after: party.gold,
            party_level: Math.round(party.averageLevel()),
          });
          party.addItem(i.item.id, 1);
          audio.sfx('chest');
          // Refresh affordability as gil drops.
          menu.setItems(shop.stock.map((id) => ITEMS[id]).filter(Boolean).map((item) => ({
            label: item.name, right: `${item.price}`, item, disabled: party.gold < item.price,
          })), true);
          this._renderDetail(menu.current?.item);
        } else audio.sfx('error');
      },
      onCancel: () => this._openMainMenu(shop),
      onMove: (i) => this._renderDetail(i?.item),
    });
    menu.title = 'Buy';
    this._setList(menu);
    this._renderDetail(menu.current?.item);
  }

  _openSell(shop) {
    const party = this.game.party;
    const build = () => [...party.inventory.entries()]
      .map(([id, count]) => ({ item: ITEMS[id], count }))
      .filter((e) => e.item && e.item.kind !== 'key')
      .map((e) => ({ label: e.item.name, right: `×${e.count}  ${e.item.sell}`, item: e.item }));

    const items = build();
    const menu = new MenuList({
      items: items.length ? items : [{ label: '(nothing to sell)', disabled: true }],
      pageSize: 12,
      onSelect: (i) => {
        if (!i.item) return;
        party.removeItem(i.item.id, 1);
        analytics.track(EV.ITEM_SOLD, {
          item: i.item.id, item_name: i.item.name, price: i.item.sell, gold_after: party.gold + i.item.sell,
        });
        party.addGold(i.item.sell);
        audio.sfx('confirm');
        const next = build();
        menu.setItems(next.length ? next : [{ label: '(nothing to sell)', disabled: true }], true);
        this._renderDetail(menu.current?.item);
      },
      onCancel: () => this._openMainMenu(shop),
      onMove: (i) => this._renderDetail(i?.item),
    });
    menu.title = 'Sell';
    this._setList(menu);
    this._renderDetail(menu.current?.item);
  }

  /**
   * Item detail, with a per-character equip preview. Green means an upgrade for
   * that character, red a downgrade, and a dash means they can't use it at all.
   */
  _renderDetail(item) {
    this.detail.innerHTML = '';
    if (!item) {
      this.detail.appendChild(el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' },
        text: 'Choose Buy or Sell.' }));
      return;
    }

    const rows = [];
    if (item.slot) {
      for (const m of this.game.party.activeMembers) {
        if (!isEquippable(item, m)) {
          rows.push(el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 'calc(13 * var(--u))' } }, [
            el('span', { class: 'dim', text: m.name }),
            el('span', { class: 'dim', text: 'cannot equip' }),
          ]));
          continue;
        }
        const slot = item.slot;
        const before = { atk: m.equipment[slot]?.stats?.atk ?? 0, def: m.equipment[slot]?.stats?.def ?? 0 };
        const after = { atk: item.stats?.atk ?? 0, def: item.stats?.def ?? 0 };
        const dAtk = after.atk - before.atk;
        const dDef = after.def - before.def;
        const chip = (label, d) => el('span', {
          style: {
            marginLeft: 'calc(8 * var(--u))',
            color: d > 0 ? 'var(--good)' : d < 0 ? 'var(--danger)' : 'var(--text-disabled)',
          },
          text: `${label} ${d > 0 ? '+' : ''}${d}`,
        });
        rows.push(el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 'calc(13 * var(--u))' } }, [
          el('span', { text: m.name }),
          el('span', {}, [
            el('span', { class: 'dim', text: m.equipment[slot]?.name ?? '—' }),
            dAtk ? chip('ATK', dAtk) : null,
            dDef ? chip('DEF', dDef) : null,
          ]),
        ]));
      }
    }

    this.detail.appendChild(el('div', { style: { display: 'grid', gap: 'calc(7 * var(--u))' } }, [
      el('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'calc(20 * var(--u))' }, text: item.name }),
      el('div', { class: 'dim', style: { fontSize: 'calc(14 * var(--u))' }, text: item.desc || '' }),
      item.stats ? el('div', { style: { fontSize: 'calc(13 * var(--u))' },
        text: Object.entries(item.stats).map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`).join('   ') }) : null,
      el('div', { style: { display: 'flex', gap: 'calc(14 * var(--u))', fontSize: 'calc(13 * var(--u))' } }, [
        el('span', { class: 'dim' }, [el('span', { text: 'Buy ' }), el('span', { class: 'num gold', text: String(item.price ?? 0) })]),
        el('span', { class: 'dim' }, [el('span', { text: 'Sell ' }), el('span', { class: 'num', text: String(item.sell ?? 0) })]),
        el('span', { class: 'dim' }, [el('span', { text: 'Held ' }), el('span', { class: 'num', text: String(this.game.party.countItem(item.id)) })]),
      ]),
      rows.length ? el('div', { class: 'win-title', style: { marginTop: 'calc(6 * var(--u))' }, text: 'If equipped' }) : null,
      ...rows,
    ]));
  }
}
