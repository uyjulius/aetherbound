import { roleFor } from '../core/classes.js';
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

  openMenu(state, data, actions) {
    this.menuOpen = true;
    this.menuSelected = 0;
    this.menuOptions = [
      { label: 'Party', detail: 'Condition and calling', view: () => this.partyView(state) },
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

  partyView(state) {
    element('menu-content').innerHTML = `<p class="eyebrow">Active company</p>${state.roster.map((member) => `
      <article class="roster-card"><div><h3>${member.name}</h3><p class="role">${member.title} · ${member.role}</p></div>
      <div><b>Lv ${member.level}</b><br><small>HP ${member.hp}/${member.maxHp} · MP ${member.mp}/${member.maxMp}</small></div></article>`).join('')}`;
  }

  inventoryView(state, data) {
    const rows = Object.entries(state.inventory).filter(([, count]) => count > 0);
    element('menu-content').innerHTML = `<p class="eyebrow">${state.gold} gil</p><h3>Supplies</h3>${rows.length ? rows.map(([id, count]) => {
      const item = data.items[id] ?? { name: id, desc: '' };
      return `<div class="inventory-row"><div><b>${item.name}</b><small>${item.desc ?? ''}</small></div><span>× ${count}</span></div>`;
    }).join('') : '<p>The pack is empty.</p>'}`;
  }

  journalView(state) {
    const text = state.quest?.stage === 0
      ? 'Elder Sabbath asked to speak beneath the lanterns of Harrowmere.'
      : 'The earth under the northern ridge is warm. Ferran surveyors are searching for an Engine beneath Fen Barrow.';
    element('menu-content').innerHTML = `<p class="eyebrow">Current thread</p><h3>${state.quest?.text}</h3><p>${text}</p><p class="role">Steps ${state.steps} · Victories ${state.victories}</p>`;
  }

  saveView(state, save) {
    const content = element('menu-content');
    content.innerHTML = `<p class="eyebrow">Aether record</p><h3>Record your journey</h3><p>Save in ${state.mapId.replaceAll('_', ' ')} with ${state.gold} gil.</p><button class="action-button">Save now</button>`;
    content.querySelector('button').addEventListener('click', () => { save(); this.toast('Journey saved.'); });
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
    content.innerHTML = '<p class="eyebrow">End session</p><h3>Return to the title screen?</h3><p>Save first if you want to keep your progress.</p><button class="action-button">Return to title</button>';
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
