import * as THREE from 'three';
import {
  instanceMonster, modelForLook, ONCE_CLIPS,
} from './monstermodels.js';

/**
 * Monsters.
 *
 * There is deliberately no geometry in this file.
 *
 * Every earlier version of it computed the creature: nine "body plans" built
 * out of spheres, boxes, cones and cylinders, with limbs parented into little
 * joint hierarchies, and the whole bestiary animated by sine waves driving
 * those joints — breathing, wing flapping, a lunge, a collapse. It was seven
 * hundred lines of arithmetic pretending to be a menagerie, and it looked
 * like it. The party's models were replaced with artists' work for exactly
 * this reason; the things the party fights were left behind.
 *
 * So the meshes are made by people and so is the motion. This module's whole
 * job is to hand one to the battle view and drive its clips. `buildMonster`
 * keeps its old signature, so nothing downstream had to change; what comes
 * back is a glTF instance rather than a pile of computed vertices.
 */

/**
 * How tall a creature of `scale` 1 stands, in metres.
 *
 * The bestiary's scales were authored against the old computed bodies and run
 * from 0.55 (a rat) to 1.9 (the Bogfather), so they are read as a multiplier
 * on a roughly human height and the model is normalised to match. That keeps
 * every creature's size meaning what the data always said it meant.
 */
const BASE_HEIGHT = 1.75;

/**
 * How high a flier sits above the ground.
 *
 * Exported because the battle view has to stage fliers at this height rather
 * than letting the animator lift them afterwards: the camera frames the
 * formation once, at build time, and a creature that rises after that framing
 * rises straight out of the shot. Six of the game's larger fliers were being
 * cropped by exactly this.
 */
export const HOVER_HEIGHT = 0.9;

export function buildMonster(look = {}) {
  const modelId = modelForLook(look);
  const height = BASE_HEIGHT * (look.scale ?? 1);
  const inst = modelId ? instanceMonster(modelId, { height }) : null;

  if (!inst) {
    // A missing model must not take down a whole battle.
    const root = new THREE.Group();
    return { root, scene: null, clips: new Map(), resolved: {}, look, flying: false };
  }

  inst.root.name = `monster:${inst.title}`;
  return {
    root: inst.root,
    scene: inst.scene,
    clips: inst.clips,
    resolved: inst.resolved,
    look,
    // Floaters and fliers hover rather than stand, which is a property of the
    // creature rather than of its model.
    flying: look.plan === 'floater' || look.plan === 'avian',
    height,
  };
}

/**
 * Drives a monster's clips.
 *
 * A thin wrapper over `THREE.AnimationMixer`, matching `CharacterAnimator` on
 * the party's side. `actionT` is kept because the battle view writes to it
 * directly to time a lunge, and hovering is added on top for anything that
 * flies — the packs animate a flap but not a bob, and a creature that flies
 * perfectly level reads as a cardboard cut-out.
 */
export class MonsterAnimator {
  constructor(built) {
    this.m = built;
    this.clip = 'idle';
    this.actionT = 0;
    this.flying = built.flying || false;
    this.phase = Math.random() * Math.PI * 2;
    this.time = Math.random() * 10;
    // Whatever height the view staged this creature at; the bob rides on it.
    this.baseY = built.flying ? (built.root.position.y || HOVER_HEIGHT) : 0;
    this.mixer = built.scene ? new THREE.AnimationMixer(built.scene) : null;
    this.actions = new Map();
    this.current = null;
    if (this.mixer) this.play('idle', 0);
  }

  _action(name) {
    if (this.actions.has(name)) return this.actions.get(name);
    const authored = this.m.resolved?.[name] ?? this.m.resolved?.idle;
    const clip = (authored && this.m.clips.get(authored)) ?? this.m.clips.values().next().value;
    if (!clip) return null;

    const action = this.mixer.clipAction(clip);
    if (ONCE_CLIPS.has(name)) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    this.actions.set(name, action);
    return action;
  }

  play(clip, fade = 0.16) {
    this.actionT = 0;
    if (clip === this.clip && this.current?.isRunning() && !ONCE_CLIPS.has(clip)) return;
    if (!this.mixer) { this.clip = clip; return; }

    const next = this._action(clip);
    if (!next) return;

    this.clip = clip;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    // A one-shot replayed from the same state has to be rewound, or a second
    // attack in a row plays nothing.
    if (ONCE_CLIPS.has(clip)) next.time = 0;

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
    this.time += dt;
    if (this.mixer) this.mixer.update(dt);

    // Hover. Applied to the wrapper rather than the animated scene, so it
    // rides on top of the artist's motion instead of fighting it.
    if (this.flying && this.m.scene) {
      const bob = Math.sin(this.time * 1.5 + this.phase) * 0.16;
      this.m.root.position.y = (this.baseY ?? HOVER_HEIGHT) + bob;
      this.m.root.rotation.z = Math.sin(this.time * 0.9 + this.phase) * 0.05;
    }
  }
}

export { ONCE_CLIPS };
