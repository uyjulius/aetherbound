import { roleFor } from '../core/classes.js';
import { SLOTS, canEquip, equipItem } from '../core/equipment.js';
import { fieldTargets, useFieldItem } from '../core/commerce.js';
import { CHAPTERS } from '../campaign/story.js';
const element = (id) => document.getElementById(id);
const pct = (value, maximum) => `${Math.max(0, Math.min(100, maximum ? value / maximum * 100 : 0))}%`;

function buttonMarkup(option, index, selected) {
  return `<button class="menu-button${index === selected ? ' selected' : ''}" data-index="${index}" ${option.disabled ? 'disabled' : ''}>
    ${option.label}${option.detail ? `<small>${option.detail}</small>` : ''}
  </button>`;
}

export class Interface {
  constructor(renderer) {
    this.renderer = renderer;
    this.loading = element('loading');
    this.loadingBar = element('load-bar');
    this.loadingLabel = element('loading-label');
    this.title = element('title');
    this.titleMenu = element('title-menu');
    this.field = element('field-ui');
    this.dialogueBox = element('dialogue');
    this.gameMenu = element('game-menu');
    this.battle = element('battle-ui');
    this.titleOptions = [];
    this.titleSelected = 0;
    this.dialogueLines = [];
    this.dialogueDone = null;
    this.menuSelected = 0;
    this.menuOptions = [];
    this.menuOpen = false;
    this.toastTimer = 0;
    this.choiceBox = document.createElement('section');
    this.choiceBox.className = 'overlay hidden';
    this.choiceBox.id = 'field-choice';
    this.choiceBox.setAttribute('role', 'dialog');
    this.choiceBox.setAttribute('aria-modal', 'true');
    document.getElementById('app').append(this.choiceBox);
    this.choiceOptions = [];
    this.choiceSelected = 0;
    this.dialogueBox.addEventListener('click', () => this.advanceDialogue());
  }

  loadProgress(progress, label) {
    this.loadingBar.style.width = `${Math.round(progress * 100)}%`;
    this.loadingLabel.textContent = label ? `Reading ${label.replaceAll('_', ' ')}…` : 'Gathering the aether…';
  }

  ready() { this.loading.classList.add('hidden'); }

  showTitle(options) {
    this.field.classList.add('hidden');
    this.gameMenu.classList.add('hidden');
    this.title.classList.remove('hidden');
    this.titleOptions = options;
    this.titleSelected = Math.min(this.titleSelected, options.length - 1);
    this.renderTitle();
  }

  renderTitle() {
    this.titleMenu.innerHTML = this.titleOptions.map((option, index) => buttonMarkup(option, index, this.titleSelected)).join('');
    this.titleMenu.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => this.chooseTitle(Number(button.dataset.index))));
  }

  moveTitle(direction) {
    if (this.title.classList.contains('hidden')) return;
    let next = this.titleSelected;
    do next = (next + direction + this.titleOptions.length) % this.titleOptions.length;
    while (this.titleOptions[next]?.disabled && next !== this.titleSelected);
    this.titleSelected = next;
    this.renderTitle();
  }

  chooseTitle(index = this.titleSelected) {
    const option = this.titleOptions[index];
    if (!option || option.disabled) return false;
    option.action?.();
    return true;
  }

  showField(visible) {
    this.title.classList.toggle('hidden', visible);
    this.field.classList.toggle('hidden', !visible);
  }

  fieldStatus(map, state, prompt = '') {
    element('map-kind').textContent = map.kind ?? 'Road';
    element('map-name').textContent = map.name;
    element('map-subtitle').textContent = map.subtitle ?? '';
    element('quest-text').textContent = state.quest?.text ?? 'Follow the road';
    element('party-hud').innerHTML = state.active.map((id) => state.roster.find((member) => member.id === id)).filter(Boolean).map((member) => `
      <div class="hero-row">
        <div class="hero-head"><b>${member.name}</b><span>Lv ${member.level} · ${member.hp}/${member.maxHp}</span></div>
        <div class="meter"><i style="--value:${pct(member.hp, member.maxHp)}"></i></div>
        <div class="meter mp"><i style="--value:${pct(member.mp, member.maxMp)}"></i></div>
      </div>`).join('');
    const interaction = element('interaction');
    interaction.classList.toggle('hidden', !prompt);
    interaction.querySelector('span').textContent = prompt;
  }

  dialogue(speaker, lines, done) {
    this.dialogueLines = [...lines];
    this.dialogueDone = done;
    element('dialogue-speaker').textContent = speaker;
    this.dialogueBox.classList.remove('hidden');
    this.advanceDialogue();
  }

  advanceDialogue() {
    if (this.dialogueBox.classList.contains('hidden')) return false;
    const line = this.dialogueLines.shift();
    if (line != null) {
      element('dialogue-text').textContent = line;
      return true;
    }
    this.dialogueBox.classList.add('hidden');
    const done = this.dialogueDone;
    this.dialogueDone = null;
    done?.();
    return true;
  }

  get dialogueActive() { return !this.dialogueBox.classList.contains('hidden'); }

  get choiceActive() { return !this.choiceBox.classList.contains('hidden'); }

  atlas(world) {
    const map = world.map, scale = 10, width = world.width * scale, height = world.height * scale;
    const result = this.choose(map.name, 'North is at the top. Gold: your company · Cyan: aether marks · Violet: mechanisms · Pink: people · Green: open routes · Grey: locked routes.', [{ label: 'Return to the road', value: null }]);
    const panel = this.choiceBox.querySelector('.choice-panel');
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `-12 -24 ${width + 24} ${height + 36}`); svg.setAttribute('class', 'atlas-map'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Area map of ${map.name}, with current party position, people and exits`);
    const add = (tag, attributes, text) => { const node = document.createElementNS(ns, tag); for (const [key,value] of Object.entries(attributes)) node.setAttribute(key, value); if (text) node.textContent = text; svg.append(node); return node; };
    add('rect', { x:0,y:0,width,height,fill:'#102332',rx:3 });
    for (let z = 0; z < world.height; z++) for (let x = 0; x < world.width; x++) {
      const glyph = map.terrain[z][x], def = world.data.legend.glyphs[glyph]; if (!def || def.void) continue;
      add('rect', { x:x * scale,y:z * scale,width:scale,height:scale,fill:def.water ? '#315d76' : def.walk ? '#839080' : '#384852' });
    }
    for (const prop of map.props) {
      if (prop.kit === 'building') add('rect', { x:prop.at[0] * scale - (prop.w ?? 5) * 2.5, y:prop.at[1] * scale - (prop.d ?? 4) * 2.5, width:(prop.w ?? 5) * 5,height:(prop.d ?? 4) * 5,fill:'#34424c',stroke:'#b0aaa0','stroke-width':.7 });
      else if (prop.event || prop.interact?.save || prop.contains) {
        const circle = add('circle', { cx:prop.at[0] * scale,cy:prop.at[1] * scale,r:3.1,fill:prop.interact?.save ? '#72e3e2' : prop.contains ? '#d7b570' : '#ce8fe0',stroke:'#16212c','stroke-width':1 });
        const title = document.createElementNS(ns, 'title'); title.textContent = prop.interact?.prompt ?? 'Treasure chest'; circle.append(title);
      }
    }
    for (const npc of world.npcs) { const at = world.toTile(npc.actor.root.position); add('circle', { cx:at.x * scale,cy:at.z * scale,r:3,fill:'#f29db1' }); }
    for (const exit of map.exits) {
      const locked = exit.requires?.some(flag => !world.state.flags.includes(flag));
      add('rect', { x:exit.at[0] * scale,y:exit.at[1] * scale,width:exit.size[0] * scale,height:exit.size[1] * scale,fill:locked ? '#61717e' : '#85dda6' });
    }
    const at = world.toTile(world.player.root.position);
    add('circle', { cx:at.x * scale,cy:at.z * scale,r:4.5,fill:'#ffdd7f',stroke:'#192737','stroke-width':1.5 });
    add('text', { x:width / 2,y:-10,fill:'#ffe0a0','text-anchor':'middle','font-size':10 }, 'N ↑');
    panel.insertBefore(svg, panel.querySelector('nav')); return result;
  }

  choose(title, description, options) {
    this.choiceOptions = options;
    this.choiceSelected = Math.max(0, options.findIndex(option => !option.disabled));
    this.choiceBox.classList.remove('hidden');
    this.choiceBox.innerHTML = `<div class="choice-panel glass"><p class="eyebrow">Aetherbound</p><h2 id="choice-title">${title}</h2><p>${description}</p><nav class="menu-stack" aria-label="Choices"></nav><small>↑ ↓ Choose · Enter Confirm · Esc Leave</small></div>`;
    this.choiceBox.setAttribute('aria-labelledby', 'choice-title');
    this.renderChoice();
    return new Promise(resolve => { this.choiceDone = resolve; });
  }

  renderChoice() {
    const nav = this.choiceBox.querySelector('nav');
    nav.innerHTML = this.choiceOptions.map((option, index) => buttonMarkup(option, index, this.choiceSelected)).join('');
    nav.querySelectorAll('button').forEach(button => button.addEventListener('click', () => this.acceptChoice(Number(button.dataset.index))));
    nav.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
  }

  moveChoice(direction) {
    let next = this.choiceSelected;
    do next = (next + direction + this.choiceOptions.length) % this.choiceOptions.length;
    while (this.choiceOptions[next].disabled && next !== this.choiceSelected);
    this.choiceSelected = next; this.renderChoice();
  }

  acceptChoice(index = this.choiceSelected) {
    if (index != null && this.choiceOptions[index]?.disabled) return;
    const value = index == null ? null : this.choiceOptions[index]?.value;
    this.choiceBox.classList.add('hidden');
    const done = this.choiceDone; this.choiceDone = null; done?.(value);
  }

  openMenu(state, data, actions) {
    element('close-ledger').onclick = actions.close;
    this.menuOpen = true;
    this.menuSelected = 0;
    this.menuOptions = [
      { label: 'Party', detail: 'Equipment and formation', view: () => this.partyView(state, data) },
      { label: 'Inventory', detail: 'Road supplies', view: () => this.inventoryView(state, data) },
      { label: 'Journal', detail: 'The Warm Earth', view: () => this.journalView(state) },
      { label: 'Save', detail: 'Record this journey', view: () => this.saveView(state, actions.save) },
      { label: 'Settings', detail: 'Sound and display', view: () => this.settingsView(actions) },
      { label: 'Title Screen', detail: 'End this session', view: () => this.titleView(actions.title) },
    ];
    this.gameMenu.classList.remove('hidden');
    this.renderMenu();
  }

  renderMenu() {
    const nav = element('game-menu-nav');
    nav.innerHTML = this.menuOptions.map((option, index) => buttonMarkup(option, index, this.menuSelected)).join('');
    nav.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
      this.menuSelected = Number(button.dataset.index); this.renderMenu();
    }));
    this.menuOptions[this.menuSelected]?.view();
  }

  moveMenu(direction) {
    this.menuSelected = (this.menuSelected + direction + this.menuOptions.length) % this.menuOptions.length;
    this.renderMenu();
  }

  activateMenu() {
    const action = element('menu-content').querySelector('.action-button');
    if (action) action.click();
  }

  closeMenu() { this.menuOpen = false; this.gameMenu.classList.add('hidden'); }

  partyView(state, data) {
    element('menu-content').innerHTML = `<p class="eyebrow">Active company</p>${state.roster.map((member) => `
      <article class="roster-card"><div><h3>${member.name}</h3><p class="role">${member.title} · ${member.role}</p></div>
      <div><b>Lv ${member.level}</b><br><small>HP ${member.hp}/${member.maxHp} · MP ${member.mp}/${member.maxMp}</small></div>
      <div class="equipment-list"><p class="role">Strength ${member.vig} · Magic ${member.mag} · Defence ${member.sta} · Resistance ${member.res} · Speed ${member.spd}</p>
      <button class="action-button row-toggle" data-member="${member.id}">${member.row === 'front' ? 'Front' : 'Back'} row · change</button>
      ${Object.entries(SLOTS).map(([slot, label]) => `<label>${label}<select data-member="${member.id}" data-slot="${slot}"><option value="">Unequipped</option>${Object.values(data.items).filter(item => canEquip(data, member, item, slot) && (state.inventory[item.id] > 0 || member.equipment?.[slot] === item.id)).map(item => `<option value="${item.id}" ${member.equipment?.[slot] === item.id ? 'selected' : ''}>${item.name} · ${Object.entries(item.stats ?? {}).map(([key, value]) => `${key.toUpperCase()} ${value > 0 ? '+' : ''}${value}`).join(' / ')}</option>`).join('')}</select></label>`).join('')}
      </div></article>`).join('')}`;
    element('menu-content').querySelectorAll('select').forEach(select => select.addEventListener('change', () => {
      this.toast(equipItem(data, state, select.dataset.member, select.dataset.slot, select.value).message);
      this.partyView(state, data);
    }));
    element('menu-content').querySelectorAll('.row-toggle').forEach(button => button.addEventListener('click', () => {
      const member = state.roster.find(hero => hero.id === button.dataset.member);
      member.row = member.row === 'front' ? 'back' : 'front'; this.partyView(state, data);
    }));
  }

  inventoryView(state, data) {
    const rows = Object.entries(state.inventory).filter(([, count]) => count > 0);
    element('menu-content').innerHTML = `<p class="eyebrow">${state.gold} gil</p><h3>Supplies</h3>${rows.length ? rows.map(([id, count]) => {
      const item = data.items[id] ?? { name: id, desc: '' };
      return `<div class="inventory-row"><div><b>${item.name}</b><small>${item.desc ?? ''}</small></div><span>× ${count}</span>${fieldTargets(data, state, id).length ? `<button class="action-button" data-item="${id}">Use</button>` : ''}</div>`;
    }).join('') : '<p>The pack is empty.</p>'}`;
    element('menu-content').querySelectorAll('[data-item]').forEach(button => button.addEventListener('click', async () => {
      const id = button.dataset.item, item = data.items[id];
      const options = item.target === 'allAllies' ? [{ label: 'Entire party', value: 'all' }] : fieldTargets(data, state, id).map(hero => ({ label: hero.name, detail: `${hero.hp}/${hero.maxHp} HP · ${hero.mp}/${hero.maxMp} MP`, value: hero.id }));
      const target = await this.choose(item.name, item.desc, [...options, { label: 'Cancel', value: null }]);
      if (target) this.toast(useFieldItem(data, state, id, target).message);
      this.inventoryView(state, data);
    }));
  }

  journalView(state) {
    const chapter = CHAPTERS[state.quest?.stage ?? 0];
    element('menu-content').innerHTML = `<p class="eyebrow">${chapter.title}</p><h3>${chapter.objective}</h3><p>${chapter.text}</p><p class="role">Steps ${state.steps} · Victories ${state.victories}</p><h3>Road notes</h3><p>Move with WASD or the arrow keys. Hold Shift to run. Press Enter near people, chests, doors and mechanisms. North is the top of the world; roads at map edges lead onward.</p><p>Aether marks restore everyone and record your defeat return point. Save from the ledger to record your current position. The pack can be used outside battle; equipment and rows are changed under Party.</p><h3>In battle</h3><p>Choose an action, then a target. Escape cancels a selection. Front rows deal and receive more physical damage. Back rows suit spellcasters. Cover intercepts physical attacks; Prayer restores standing allies without MP. Phoenix Tears and Reprise revive fallen allies. Defend when a boss gathers a wave.</p>`;
  }

  saveView(state, save) {
    const content = element('menu-content');
    content.innerHTML = `<p class="eyebrow">Aether record</p><h3>Record your journey</h3><p>Save in ${state.mapId.replaceAll('_', ' ')} with ${state.gold} gil.</p><button class="action-button">Save now</button>`;
    content.querySelector('button').addEventListener('click', () => { if (save() !== false) this.toast('Journey saved.'); });
  }

  settingsView(actions) {
    const { config } = actions;
    const content = element('menu-content');
    content.innerHTML = `<p class="eyebrow">Settings</p><h3>Sound</h3>
      <label class="setting">Music <input data-key="music" type="range" min="0" max="1" step=".05" value="${config.music}"></label>
      <label class="setting">Effects <input data-key="sound" type="range" min="0" max="1" step=".05" value="${config.sound}"></label>
      <h3>Battle clock</h3><label class="setting">Mode <select id="battle-mode"><option value="wait" ${config.battleMode === 'wait' ? 'selected' : ''}>Wait</option><option value="active" ${config.battleMode === 'active' ? 'selected' : ''}>Active</option></select></label>
      <p>Wait pauses gauges while you choose. Active lets enemies act during command selection. Action animations always finish before the next impact.</p>`;
    content.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => actions.setting(input.dataset.key, Number(input.value))));
    content.querySelector('select').addEventListener('change', event => actions.setting('battleMode', event.target.value));
  }

  titleView(goTitle) {
    const content = element('menu-content');
    content.innerHTML = '<p class="eyebrow">End session</p><h3>Return to the title screen?</h3><p>Your current journey will be saved before you leave.</p><button class="action-button">Save and return to title</button>';
    content.querySelector('button').addEventListener('click', goTitle);
  }

  toast(message) {
    const toast = element('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
  }

  flash() { const flash = element('flash'); flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }

  showBattle(visible) {
    this.field.classList.toggle('hidden', visible);
    this.battle.classList.toggle('hidden', !visible);
    if (!visible) element('battle-banner').classList.remove('show');
  }

  banner(text) {
    const banner = element('battle-banner');
    banner.textContent = text;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 1600);
  }

  battleLog(lines) { element('battle-log').innerHTML = lines.map((line) => `<div>${line}</div>`).join(''); }

  battleStatus(model) {
    element('enemy-hud').innerHTML = model.enemies.map(enemy => `<div class="enemy-chip${enemy.hp <= 0 ? ' fallen' : ''}">
      <b>${enemy.name}</b><div class="meter"><i style="--value:${pct(enemy.hp, enemy.maxHp)}"></i></div>
      <small>${enemy.hp <= 0 ? 'Defeated' : model.enemyIntent(enemy)}</small></div>`).join('');
    element('battle-party').innerHTML = `<p class="eyebrow battle-clock">${model.battleMode === 'wait' && model.awaiting ? 'WAIT · Choose your action' : 'ACTIVE TIME BATTLE'}</p>` + model.party.map(hero => `<div class="hero-row${hero.hp <= 0 ? ' fallen' : ''}${model.awaiting === hero ? ' current-turn' : ''}" data-hero="${hero.id}">
      <div class="hero-head"><b>${hero.name}</b><span>${hero.hp} / ${hero.maxHp} HP</span></div>
      <div class="hero-detail"><span>${roleFor(hero.id).name} · ${hero.row}</span><span>${hero.mp} / ${hero.maxMp} MP</span></div>
      <div class="meter"><i style="--value:${pct(hero.hp, hero.maxHp)}"></i></div>
      <div class="meter mp"><i style="--value:${pct(hero.mp, hero.maxMp)}"></i></div>
      <div class="meter atb"><i style="--value:${pct(hero.atb, 100)}"></i></div>
      <small class="status-label">${hero.hp <= 0 ? 'Fallen · use Reprise or a Phoenix Tear' : Object.keys(hero.statuses).join(' · ') || (hero.defending ? 'Guarding' : hero.cover ? 'Covering an ally' : hero.atb >= 100 ? 'Ready' : 'Charging')}</small></div>`).join('');
  }

  commands(name, commands, selected = 0, choose, back, canBack = false) {
    const panel = element('command-panel');
    if (!commands) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    element('turn-name').textContent = name;
    const nav = element('battle-commands');
    nav.innerHTML = commands.map((command, index) => buttonMarkup(command, index, selected)).join('');
    nav.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      button.blur(); choose(Number(button.dataset.index));
    }));
    const cancel = element('battle-back');
    cancel.classList.toggle('hidden', !canBack);
    cancel.onclick = () => { cancel.blur(); back?.(); };
    nav.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
  }

  battleResult(result, rewards, leave) {
    const panel = element('battle-result');
    if (!result) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    panel.innerHTML = `<p class="eyebrow">${result === 'victory' ? 'The company prevails' : result === 'escape' ? 'A path to safety' : 'The company falls'}</p>
      <h2>${result === 'victory' ? 'Victory' : result === 'escape' ? 'Escaped' : 'The thread holds'}</h2>
      ${rewards ? `<div class="reward-grid"><p><strong>${rewards.exp}</strong> EXP each</p><p><strong>${rewards.gold}</strong> gil</p></div>
        ${rewards.items.length ? `<p>Found ${rewards.items.join(', ')}</p>` : ''}${rewards.levels.length ? `<p>${rewards.levels.join(', ')} gained a level.</p>` : ''}`
        : `<p>${result === 'defeat' ? 'Return to the last aether mark with your party restored. Your supplies and completed quests are kept.' : 'You leave without rewards.'}</p>`}
      <button class="action-button">${result === 'defeat' ? 'Return to checkpoint' : 'Continue journey'}</button><small>Enter to continue</small>`;
    panel.querySelector('button').addEventListener('click', leave);
  }

  damage(worldPosition, amount, healing = false, emphasis = false) {
    const screen = this.renderer.project(worldPosition);
    const label = document.createElement('div');
    label.className = `damage${healing ? ' heal' : ''}`;
    label.style.left = `${screen.x}px`; label.style.top = `${screen.y}px`;
    if (emphasis) label.style.fontSize = '2.8rem';
    label.textContent = `${healing ? '+' : ''}${amount}`;
    element('app').append(label);
    setTimeout(() => label.remove(), 1050);
  }
}
