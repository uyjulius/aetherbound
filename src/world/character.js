import * as THREE from 'three';
import {
  instanceModel, modelFor, CLIP_MAP, ONCE_CLIPS,
} from './charmodels.js';

/**
 * Characters.
 *
 * There is deliberately no geometry in this file.
 *
 * Every earlier version of it computed the character: a skeleton laid out
 * from a table of head-unit landmarks, limbs swept as tapered tubes, a torso
 * lofted through superellipse rings, hair assembled from ribbons, and the
 * whole thing animated by sine waves driving bone rotations. It was a
 * thousand lines of arithmetic pretending to be a person, and it looked like
 * it — you cannot tune your way from "shapes an equation can describe" to
 * "something an artist drew".
 *
 * So the models are made by artists, and so are the animations. This module's
 * whole job is to hand one to the game and drive its clips. `buildCharacter`
 * keeps its old signature so nothing downstream had to change; what comes
 * back is a glTF instance rather than a pile of computed vertices.
 */

// ---------------------------------------------------------------------------

/**
 * Build a character.
 *
 * Synchronous, because maps build their NPCs during construction — the models
 * are preloaded at boot (see `loadCharacterModels`). If a model is missing the
 * result is an empty group rather than a throw, so one bad asset cannot take
 * down a whole map.
 */
export function buildCharacter(def = {}) {
  const height = def.height ?? 1.72;
  const modelId = modelFor(def);
  const inst = modelId ? instanceModel(modelId, { height }) : null;

  if (!inst) {
    const root = new THREE.Group();
    root.name = def.id || 'character';
    return { root, model: null, clips: new Map(), height, def, modelId: null };
  }

  inst.root.name = def.id || 'character';
  return {
    root: inst.root,
    model: inst.scene,
    clips: inst.clips,
    height,
    def,
    modelId,
  };
}

/**
 * Drives a character's clips.
 *
 * A thin wrapper over `THREE.AnimationMixer`. The interesting part is the
 * transitions: cutting straight to a new clip makes a character teleport
 * between poses, so everything cross-fades, and the one-shot clips (a punch, a
 * death) hold their last frame instead of snapping back to the first.
 */
export class CharacterAnimator {
  constructor(character) {
    this.c = character;
    this.clip = 'idle';
    this.moveSpeed = 0;
    this.speed = 1;
    this.mixer = character.model ? new THREE.AnimationMixer(character.model) : null;
    this.actions = new Map();
    this.current = null;
    // Desynchronise the cast, or a line of villagers breathes in unison.
    this.phase = Math.random() * Math.PI * 2;
    if (this.mixer) this.play('idle', 0);
  }

  _action(name) {
    if (this.actions.has(name)) return this.actions.get(name);
    const clipName = CLIP_MAP[name] ?? CLIP_MAP.idle;
    const clip = this.c.clips.get(clipName)
      ?? this.c.clips.get(CLIP_MAP.idle)
      ?? this.c.clips.values().next().value;
    if (!clip) return null;

    const action = this.mixer.clipAction(clip);
    if (ONCE_CLIPS.has(name)) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    this.actions.set(name, action);
    return action;
  }

  play(name, fade = 0.18) {
    if (name === this.clip && this.current?.isRunning()) return;
    if (!this.mixer) { this.clip = name; return; }

    const next = this._action(name);
    if (!next) return;

    this.clip = name;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    // A one-shot replayed from the same state has to be told to start again;
    // without this a second attack in a row plays nothing.
    if (ONCE_CLIPS.has(name)) next.time = 0;

    if (this.current && this.current !== next && fade > 0) {
      this.current.crossFadeTo(next, fade, false);
      next.play();
    } else {
      this.current?.stop();
      next.play();
    }
    this.current = next;
  }

  update(dt) {
    if (!this.mixer) return;
    // Walk and run are authored at a fixed stride, so the playback rate
    // follows the actor's real speed. Without this the feet skate.
    const locomotive = this.clip === 'walk' || this.clip === 'run';
    const rate = locomotive
      ? Math.max(0.55, Math.min(1.85, 0.55 + this.moveSpeed * 1.15))
      : 1;
    this.mixer.timeScale = rate * this.speed;
    this.mixer.update(dt);
  }

  /** Kept for callers that used to reset the computed rest pose. */
  captureRest() {}
}

export { CLIP_MAP, ONCE_CLIPS };
