import { loadGameData } from './core/data.js';
import { Input } from './core/input.js';
import { AudioDirector } from './core/audio.js';
import { hasSave, loadConfig, loadSave, newGame, saveConfig, saveGame } from './core/state.js';
import { GameRenderer } from './render/scene.js';
import { Effects } from './render/effects.js';
import { World } from './world/world.js';
import { BattleController } from './battle/controller.js';
import { Interface } from './ui/interface.js';

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

function fieldHud(map, prompt = '') { ui.fieldStatus(map, state, prompt); }

function showDialogue(speaker, lines) {
  if (!world || !lines?.length) return;
  world.locked = true;
  audio.sfx('text');
  ui.dialogue(speaker, lines, () => {
    world.locked = false;
    fieldHud(world.map, world.interactionLabel(world.nearby));
  });
}

async function beginBattle(enemyIds) {
  if (mode !== 'field' || battle.active) return;
  mode = 'battle';
  world.locked = true;
  audio.play('battle');
  ui.flash();
  await battle.start(enemyIds);
}

async function startGame(nextState) {
  state = nextState;
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
  });
  battle = new BattleController({
    data, state, renderer, input, audio, effects, ui,
    onFinish: () => {
      renderer.setEnvironment(world.map);
      renderer.track(world.player.root.position, true);
      world.locked = false;
      fieldHud(world.map, world.interactionLabel(world.nearby));
      audio.play(world.map.music ?? 'overworld');
      mode = 'field';
    },
  });
  await world.load(state.mapId, state.spawn, state.position);
  ui.showField(true);
  audio.play(world.map.music ?? 'overworld');
  mode = 'field';
  input.flush();
}

function titleScreen() {
  mode = 'title';
  ui.closeMenu();
  renderer.worldRoot.visible = false;
  renderer.battleRoot.visible = false;
  audio.play('prelude');
  ui.showTitle([
    { label: 'New Journey', detail: 'Begin in Harrowmere', action: () => startGame(newGame(data)) },
    { label: 'Continue', detail: hasSave() ? 'Return to your last record' : 'No journey recorded', disabled: !hasSave(), action: () => startGame(loadSave(data) ?? newGame(data)) },
  ]);
}

function openLedger() {
  world.locked = true;
  ui.openMenu(state, data, {
    save: () => saveGame(state),
    title: () => { saveGame(state); titleScreen(); },
    config,
    setting: (key, value) => {
      config[key] = value; saveConfig(config); audio.setVolumes();
    },
  });
}

function closeLedger() {
  ui.closeMenu();
  world.locked = false;
  input.flush();
}

function controls() {
  if (mode === 'title') {
    if (input.take('up')) { ui.moveTitle(-1); audio.sfx('cursor'); }
    if (input.take('down')) { ui.moveTitle(1); audio.sfx('cursor'); }
    if (input.take('confirm')) { audio.sfx('confirm'); ui.chooseTitle(); }
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
  if (input.take('debugBattle')) beginBattle(['fenrat', 'mireslug']);
}

function frame(now) {
  const dt = Math.min(.05, (now - previous) / 1000);
  previous = now;
  if (!fatal) {
    controls();
    if (mode === 'field') world?.update(dt, ui.dialogueActive || ui.menuOpen);
    if (mode === 'battle') battle?.update(dt);
    effects.update(dt);
    renderer.update(dt);
    renderer.render();
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
    fatal = error;
    console.error(error);
    ui.loadingLabel.textContent = `The thread could not be gathered: ${error.message}`;
  }
}

requestAnimationFrame(frame);
boot();
