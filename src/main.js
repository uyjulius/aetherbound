import { loadGameData } from './core/data.js';
import { Input } from './core/input.js';
import { AudioDirector } from './core/audio.js';
import { hasSave, loadConfig, loadSave, newGame, saveConfig, saveGame, restoreParty } from './core/state.js';
import { GameRenderer } from './render/scene.js';
import { Effects } from './render/effects.js';
import { World } from './world/world.js';
import { BattleController } from './battle/controller.js';
import { Interface } from './ui/interface.js';
import { trade, restAtInn } from './core/commerce.js';
import { eventPlan, applyEvent, updateJournal } from './campaign/story.js';

const renderer = new GameRenderer(document.getElementById('game'));
const input = new Input();
const ui = new Interface(renderer);
const config = loadConfig();
const audio = new AudioDirector(config);
const effects = new Effects(renderer.fxRoot);
let data;
let state;
let world;
let battle;
let mode = 'loading';
let previous = performance.now();
let fatal = null;
let battleDone = null;
let eventRunning = false;

function fieldHud(map, prompt = world?.interactionLabel(world?.nearby) ?? '') {
  ui.fieldStatus(map, state, prompt);
  if (mode !== 'battle') audio.play(map.music ?? 'overworld');
}

function showDialogue(speaker, lines) {
  if (!world || !lines?.length) return Promise.resolve();
  world.locked = true;
  audio.sfx('text');
  return new Promise(resolve => ui.dialogue(speaker, lines, () => {
    world.locked = false;
    fieldHud(world.map, world.interactionLabel(world.nearby));
    resolve();
  }));
}

async function beginBattle(enemyIds, options = {}) {
  if (mode !== 'field' || battle.active) return null;
  mode = 'battle';
  world.locked = true;
  audio.play(enemyIds.includes('thefirstengine') ? 'boss_final' : enemyIds.some(id => data.enemies[id]?.boss) ? 'boss' : 'battle');
  ui.flash();
  const finished = new Promise(resolve => { battleDone = resolve; });
  try { await battle.start(enemyIds, { battleMode: config.battleMode, environment: world.map, ...options }); }
  catch (error) {
    battle.cleanup(); mode = 'field'; world.locked = false;
    const done = battleDone; battleDone = null; done?.('error');
    await recoverRoad(error);
  }
  return finished;
}

async function recoverRoad(error) {
  console.warn('Aetherbound load recovery:', error.message);
  mode = 'error'; if (world) world.locked = true;
  const choice = await ui.choose('The road could not load', 'A game asset could not be downloaded. You can reload the game or return to the title screen and continue your last record.', [
    { label: 'Reload game', value: 'reload' }, ...(data ? [{ label: 'Return to title', value: 'title' }] : []),
  ]);
  if (choice === 'reload' || !data) location.reload(); else titleScreen();
}

function recordJourney(message) {
  try { saveGame(state); if (message) ui.toast(message); return true; }
  catch { ui.toast('This browser could not store the save. Allow site storage to keep your journey.'); return false; }
}

async function scenes(entries = []) {
  for (const entry of entries) await showDialogue(entry.speaker, entry.lines);
}

async function campaignEvent(id) {
  if (eventRunning) return;
  const plan = eventPlan(state, id);
  if (!plan) return;
  eventRunning = true; world.locked = true;
  try {
    await scenes(plan.scenes);
    if (plan.battle && await beginBattle(plan.battle, { canFlee: false }) !== 'victory') return;
    const changed = applyEvent(data, state, plan);
    if (plan.recruit && changed) await world.load(state.mapId, state.spawn, state.position);
    await scenes(plan.after);
    if (plan.travel) {
      state.position = null;
      await world.load(...plan.travel, null);
    }
    fieldHud(world.map);
    const recorded = plan.flag || plan.travel || plan.stage != null ? recordJourney() : false;
    if (plan.ending) {
      audio.play('hope');
      await ui.choose('The Warm Earth · Complete', `Five travellers gave the world back its tomorrow. ${state.victories} victories · ${Math.floor(state.playTime / 60)} minutes travelled. ${recorded ? 'Your completed journey has been recorded.' : 'Browser storage is unavailable, so this journey is held in this session only.'}`, [{ label: 'Return to Harrowmere', detail: 'Continue exploring the world you saved', value: 'home' }]);
      await world.load('harrowmere', 'default', null); recordJourney();
    }
  } catch (error) { await recoverRoad(error); }
  finally { eventRunning = false; world.locked = false; input.flush(); if (mode === 'field') fieldHud(world.map); }
}

async function visitShop(shopId) {
  world.locked = true;
  let operation = 'buy';
  while (true) {
    const shop = data.shops[shopId];
    const stock = operation === 'buy' ? shop.stock : Object.keys(state.inventory).filter(id => state.inventory[id] > 0 && data.items[id]?.sell > 0);
    const choice = await ui.choose(shop.name, `${state.gold} gil · ${operation === 'buy' ? 'Buy supplies and equipment. Equip purchases through Party in the ledger.' : 'Sell items from your pack. Equipped items stay with their owner.'}`, [
      ...stock.map(id => { const item = data.items[id]; return { label: `${operation === 'buy' ? 'Buy' : 'Sell'} ${item.name} · ${operation === 'buy' ? item.price : item.sell} gil`, detail: `${item.desc || ''} · Pack ×${state.inventory[id] ?? 0}`, value: id,
        disabled: operation === 'buy' && (item.price > state.gold || (state.inventory[id] ?? 0) >= 99) }; }),
      { label: operation === 'buy' ? 'Sell from pack' : 'Browse goods', value: 'switch' }, { label: 'Leave', value: null },
    ]);
    if (!choice) break;
    if (choice === 'switch') { operation = operation === 'buy' ? 'sell' : 'buy'; continue; }
    const result = trade(data, state, shopId, choice, operation); ui.toast(result.message);
  }
  world.locked = false; input.flush(); fieldHud(world.map);
}

async function visitInn(inn) {
  world.locked = true;
  const choice = await ui.choose(inn.name, `A room for the whole company costs ${inn.price} gil. Rest restores everyone’s HP and MP and clears ailments. You have ${state.gold} gil.`, [
    { label: `Rest · ${inn.price} gil`, value: 'rest', disabled: state.gold < inn.price }, { label: 'Leave', value: null },
  ]);
  if (choice === 'rest') { const result = restAtInn(state, inn.price); audio.sfx('confirm'); ui.toast(result.message); }
  world.locked = false; input.flush(); fieldHud(world.map);
}

async function startGame(nextState) {
  world?.dispose();
  state = nextState;
  updateJournal(state);
  mode = 'loading-field';
  renderer.showBattle(false);
  ui.showField(true);
  ui.toast('The road remembers your footsteps.');
  world = new World({
    data, state, renderer, input,
    onDialogue: showDialogue,
    onEncounter: beginBattle,
    onToast: (message) => ui.toast(message),
    onHud: fieldHud,
    onEvent: campaignEvent, onShop: visitShop, onInn: visitInn, onSave: recordJourney,
    onError: recoverRoad,
  });
  battle = new BattleController({
    data, state, renderer, input, audio, effects, ui,
    onFinish: async (result) => {
      try {
        mode = 'loading-field';
        if (result === 'defeat') {
          restoreParty(state);
          const checkpoint = state.checkpoint;
          state.position = checkpoint.position;
          await world.load(checkpoint.mapId, checkpoint.spawn, checkpoint.position);
        }
        renderer.setEnvironment(world.map);
        renderer.track(world.player.root.position, true);
        world.locked = false;
        fieldHud(world.map, world.interactionLabel(world.nearby));
        audio.play(world.map.music ?? 'overworld');
        mode = 'field';
        const done = battleDone; battleDone = null; done?.(result);
      } catch (error) {
        const done = battleDone; battleDone = null; done?.('error'); await recoverRoad(error);
      }
    },
  });
  await world.load(state.mapId, state.spawn, state.position);
  ui.showField(true);
  audio.play(world.map.music ?? 'overworld');
  mode = 'field';
  input.flush();
  if (!state.flags.includes('opening')) {
    await scenes([
      { speaker: 'Harrowmere · Before the thaw', lines: ['At dawn, the village bell rang from somewhere beneath the earth. No one had touched the rope.'] },
      { speaker: 'Vesna', lines: ['I heard it in my sleep. A note that kept asking for another note.'] },
      { speaker: 'Corvin', lines: ['Sabbath is waiting in the northern square. Let us ask him before we start talking back to the ground.'] },
      { speaker: 'The road ahead', lines: ['Move with WASD, the arrow keys or the direction pad. Enter or Act speaks, opens chests and works mechanisms. C or Ledger opens your supplies, equipment and journal. M or Map shows nearby people, mechanisms and routes.', 'The glowing aether mark beside you restores the party and records a safe return point. Begin there, then follow the stone road north.'] },
    ]);
    state.flags.push('opening');
  }
}

function titleScreen() {
  mode = 'title';
  ui.closeMenu();
  renderer.worldRoot.visible = false;
  renderer.battleRoot.visible = false;
  audio.play('prelude');
  ui.showTitle([
    { label: 'New Journey', detail: 'Begin in Harrowmere', action: () => startGame(newGame(data)).catch(recoverRoad) },
    { label: 'Continue', detail: hasSave() ? 'Return to your last record' : 'No journey recorded', disabled: !hasSave(), action: () => startGame(loadSave(data) ?? newGame(data)).catch(recoverRoad) },
  ]);
}

function openLedger() {
  world.locked = true;
  ui.openMenu(state, data, {
    close: closeLedger,
    save: () => recordJourney(),
    title: () => { if (recordJourney()) titleScreen(); },
    config,
    setting: (key, value) => {
      config[key] = value; audio.setVolumes();
      try { saveConfig(config); } catch { ui.toast('Settings apply for this session. Browser storage is unavailable.'); }
    },
  });
}

document.getElementById('field-menu-button').addEventListener('click', () => {
  if (mode === 'field' && !world.locked && !ui.menuOpen && !ui.choiceActive && !ui.dialogueActive) openLedger();
});

async function openAtlas() {
  if (mode !== 'field' || world.locked || ui.menuOpen || ui.choiceActive || ui.dialogueActive) return;
  world.locked = true;
  await ui.atlas(world);
  world.locked = false; input.flush();
}
document.getElementById('field-map-button').addEventListener('click', openAtlas);

function closeLedger() {
  ui.closeMenu();
  world.locked = false;
  fieldHud(world.map, world.interactionLabel(world.nearby));
  input.flush();
}

function controls() {
  if (mode === 'title') {
    if (input.take('up')) { ui.moveTitle(-1); audio.sfx('cursor'); }
    if (input.take('down')) { ui.moveTitle(1); audio.sfx('cursor'); }
    if (input.take('confirm')) { audio.sfx('confirm'); ui.chooseTitle(); }
    return;
  }
  if (mode !== 'field' && mode !== 'error') return;
  if (ui.choiceActive) {
    if (input.take('up')) ui.moveChoice(-1);
    if (input.take('down')) ui.moveChoice(1);
    if (input.take('confirm')) ui.acceptChoice();
    if (input.take('cancel')) ui.acceptChoice(null);
    return;
  }
  if (mode !== 'field') return;
  if (ui.dialogueActive) {
    if (input.take('confirm') || input.take('cancel')) { audio.sfx('text'); ui.advanceDialogue(); }
    return;
  }
  if (ui.menuOpen) {
    if (input.take('up')) { ui.moveMenu(-1); audio.sfx('cursor'); }
    if (input.take('down')) { ui.moveMenu(1); audio.sfx('cursor'); }
    if (input.take('confirm')) { ui.activateMenu(); audio.sfx('confirm'); }
    if (input.take('cancel') || input.take('menu')) { audio.sfx('cancel'); closeLedger(); }
    return;
  }
  if (input.take('menu')) { audio.sfx('confirm'); openLedger(); return; }
  if (input.take('map')) { openAtlas(); return; }
  if (input.take('debugBattle') && new URLSearchParams(location.search).has('test')) beginBattle(['fenrat', 'mireslug']);
}

function frame(now) {
  const dt = Math.min(.05, (now - previous) / 1000);
  previous = now;
  if (!fatal) {
    if (document.hidden) { input.flush(); requestAnimationFrame(frame); return; }
    if (state && ['field', 'battle'].includes(mode)) state.playTime += dt;
    controls();
    if (mode === 'field') world?.update(dt, ui.dialogueActive || ui.menuOpen || ui.choiceActive || eventRunning);
    if (mode === 'battle') battle?.update(dt);
    effects.update(dt);
    renderer.update(dt);
    renderer.render();
    input.flush();
  }
  requestAnimationFrame(frame);
}

async function boot() {
  try {
    data = await loadGameData((progress, label) => ui.loadProgress(progress * .92, label));
    ui.loadProgress(1, 'ready');
    ui.ready();
    titleScreen();
    window.__AETHERBOUND__ = {
      get mode() { return mode; },
      get state() { return state; },
      get world() { return world; },
      get battle() { return battle; },
      startBattle: (ids = ['fenrat']) => beginBattle(ids),
      save: () => state && saveGame(state),
    };
    console.info(`AETHERBOUND_READY maps=${Object.keys(data.maps).length} enemies=${Object.keys(data.enemies).length}`);
  } catch (error) {
    ui.ready(); await recoverRoad(error);
  }
}

requestAnimationFrame(frame);
boot();
