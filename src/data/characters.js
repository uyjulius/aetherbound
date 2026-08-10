/**
 * The playable cast.
 *
 * Each entry carries three things: how they look (fed straight to
 * buildCharacter), how they grow (base stats plus per-level gains), and what
 * they can do (their unique command, in the FF6 tradition where every party
 * member plays differently rather than being a stat block with a different hat).
 *
 * Stat meanings:
 *   vig  physical power          spd  ATB fill rate and turn order
 *   sta  physical defence, HP    mag  spell power
 *   res  magical defence         lck  crit, evade, status resistance
 */

export const CHARACTERS = {
  vesna: {
    id: 'vesna', name: 'Vesna',
    title: 'The Resonant',
    command: 'attune',            // temporarily takes on an esper's aspect
    role: 'Mage / Duelist',
    look: {
      id: 'vesna', build: 'slim', height: 1.66, hair: 'long', eyeStyle: 'round',
      colors: {
        skin: '#e7c39c', hair: '#8aa25a', torso: '#b34a41', accent: '#d8ac31',
        legs: '#33477c', boots: '#5e412c', gloves: '#9c6248', cape: '#8b2a2c',
      },
      buckle: true,
    },
    base: { hp: 42, mp: 16, vig: 22, spd: 30, sta: 20, mag: 32, res: 28, lck: 18 },
    growth: { hp: 30, mp: 7.5, vig: 1.6, spd: 1.5, sta: 1.5, mag: 2.6, res: 2.1, lck: 1.1 },
    equip: ['sword', 'rod', 'lightArmor', 'robe', 'shield', 'hat'],
    innateMagic: true,
    portraitTint: '#8aa25a',
  },

  corvin: {
    id: 'corvin', name: 'Corvin',
    title: 'Relic Hunter',
    command: 'pilfer',
    role: 'Rogue / Support',
    look: {
      id: 'corvin', build: 'normal', height: 1.75, hair: 'ponytail', eyeStyle: 'sharp', expression: 'happy',
      colors: {
        skin: '#cf9c72', hair: '#6d4020', torso: '#2c5a45', accent: '#8a6a23',
        legs: '#5e412c', boots: '#4b382d', gloves: '#7c4939',
      },
    },
    base: { hp: 50, mp: 10, vig: 28, spd: 34, sta: 24, mag: 18, res: 20, lck: 32 },
    growth: { hp: 36, mp: 4.5, vig: 2.2, spd: 2.0, sta: 1.8, mag: 1.2, res: 1.4, lck: 2.0 },
    equip: ['dagger', 'sword', 'lightArmor', 'shield', 'hat'],
    portraitTint: '#2c5a45',
  },

  aurelian: {
    id: 'aurelian', name: 'Aurelian',
    title: 'Engineer-King of Solmere',
    command: 'contraption',
    role: 'Machinist / Tank',
    look: {
      id: 'aurelian', build: 'athletic', height: 1.82, hair: 'short', eyeStyle: 'sharp',
      colors: {
        skin: '#dbb28c', hair: '#bd8746', torso: '#4b64a3', accent: '#d8ac31',
        legs: '#2b2933', boots: '#3b3943', gloves: '#5b6674', metal: '#a6b0bc', cape: '#33477c',
      },
      buckle: true,
    },
    base: { hp: 62, mp: 12, vig: 32, spd: 26, sta: 32, mag: 20, res: 24, lck: 20 },
    growth: { hp: 44, mp: 5, vig: 2.4, spd: 1.4, sta: 2.4, mag: 1.4, res: 1.6, lck: 1.2 },
    equip: ['sword', 'spear', 'crossbow', 'heavyArmor', 'shield', 'helm'],
    portraitTint: '#4b64a3',
  },

  bastian: {
    id: 'bastian', name: 'Bastian',
    title: 'The Unbound Fist',
    command: 'blitz',
    role: 'Monk / Bruiser',
    look: {
      id: 'bastian', build: 'hulking', height: 1.94, hair: 'topknot',
      colors: {
        skin: '#c08865', hair: '#342a37', torso: '#95836b', accent: '#8b2a2c',
        legs: '#bda98b', boots: '#4b382d', gloves: '#7c4939',
      },
    },
    base: { hp: 78, mp: 8, vig: 38, spd: 28, sta: 34, mag: 14, res: 18, lck: 22 },
    growth: { hp: 56, mp: 3.5, vig: 3.0, spd: 1.6, sta: 2.6, mag: 0.9, res: 1.3, lck: 1.4 },
    equip: ['fist', 'lightArmor', 'hat'],
    portraitTint: '#95836b',
  },

  idris: {
    id: 'idris', name: 'Idris',
    title: 'Last Blade of Ashenhall',
    command: 'iaido',            // charge-tiered sword techniques
    role: 'Samurai / Striker',
    look: {
      id: 'idris', build: 'heavy', height: 1.86, hair: 'braid', eyeStyle: 'sharp', expression: 'angry',
      colors: {
        skin: '#dbb28c', hair: '#241d26', torso: '#1f4033', accent: '#ab8018',
        legs: '#2b2933', boots: '#3b3943', gloves: '#666c74', metal: '#8b9199',
      },
    },
    base: { hp: 68, mp: 14, vig: 34, spd: 24, sta: 30, mag: 18, res: 26, lck: 16 },
    growth: { hp: 46, mp: 5.5, vig: 2.6, spd: 1.2, sta: 2.2, mag: 1.3, res: 1.9, lck: 1.0 },
    equip: ['katana', 'sword', 'heavyArmor', 'shield', 'helm'],
    portraitTint: '#1f4033',
  },

  maret: {
    id: 'maret', name: 'Maret',
    title: 'General of the Broken Standard',
    command: 'unmake',           // absorb and invert a spell
    role: 'Knight / Mage',
    look: {
      id: 'maret', build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
      colors: {
        skin: '#f0d5b8', hair: '#dedbe0', torso: '#dedbe0', accent: '#4b64a3',
        legs: '#5b6674', boots: '#414954', gloves: '#97929a', metal: '#a6b0bc', cape: '#33477c',
      },
      buckle: true,
    },
    base: { hp: 54, mp: 15, vig: 27, spd: 31, sta: 25, mag: 29, res: 30, lck: 20 },
    growth: { hp: 36, mp: 7, vig: 2.0, spd: 1.7, sta: 1.8, mag: 2.3, res: 2.2, lck: 1.2 },
    equip: ['sword', 'lightArmor', 'robe', 'shield', 'helm', 'hat'],
    innateMagic: true,
    portraitTint: '#dedbe0',
  },

  osric: {
    id: 'osric', name: 'Osric',
    title: 'Owner of the Vagrant Star',
    command: 'wager',            // slot-style gamble
    role: 'Gambler / Wildcard',
    look: {
      id: 'osric', build: 'slim', height: 1.84, hair: 'long', eyeStyle: 'sharp',
      colors: {
        skin: '#ac744c', hair: '#dedbe0', torso: '#4e326c', accent: '#d8ac31',
        legs: '#2b2933', boots: '#3b3943', gloves: '#97929a', cape: '#38224f',
      },
      buckle: true,
    },
    base: { hp: 56, mp: 13, vig: 29, spd: 33, sta: 24, mag: 24, res: 22, lck: 40 },
    growth: { hp: 38, mp: 6, vig: 2.1, spd: 1.9, sta: 1.7, mag: 1.8, res: 1.5, lck: 2.4 },
    equip: ['dagger', 'thrown', 'lightArmor', 'hat'],
    portraitTint: '#4e326c',
  },

  tam: {
    id: 'tam', name: 'Tam',
    title: 'Child of the Bramblewaste',
    command: 'quarry',           // learned beast behaviours
    role: 'Feral / Chaos',
    look: {
      id: 'tam', build: 'child', height: 1.42, hair: 'wild', expression: 'surprised',
      colors: {
        skin: '#9a6147', hair: '#7a4a22', torso: '#6b5d37', accent: '#496035',
        legs: '#4b382d', boots: '#3a2a20', gloves: '#63503f',
      },
    },
    base: { hp: 58, mp: 9, vig: 30, spd: 36, sta: 26, mag: 20, res: 18, lck: 28 },
    growth: { hp: 40, mp: 4, vig: 2.3, spd: 2.2, sta: 1.9, mag: 1.4, res: 1.2, lck: 1.8 },
    equip: ['claw', 'lightArmor', 'hat'],
    portraitTint: '#6b5d37',
  },

  ilsabet: {
    id: 'ilsabet', name: 'Ilsabet',
    title: 'Apprentice of the Long Look',
    command: 'render',           // paint an enemy and borrow its power
    role: 'Mage / Debuffer',
    look: {
      id: 'ilsabet', build: 'child', height: 1.32, hair: 'bob', expression: 'happy',
      colors: {
        skin: '#f0d5b8', hair: '#7a4a22', torso: '#68488c', accent: '#ffd76a',
        legs: '#d5766a', boots: '#5f6572', gloves: '#c39145',
      },
      blush: '#d5766a',
    },
    base: { hp: 38, mp: 20, vig: 16, spd: 29, sta: 17, mag: 36, res: 27, lck: 26 },
    growth: { hp: 26, mp: 8.5, vig: 1.1, spd: 1.6, sta: 1.3, mag: 2.9, res: 2.0, lck: 1.6 },
    equip: ['brush', 'rod', 'robe', 'hat'],
    innateMagic: true,
    portraitTint: '#68488c',
  },

  oda: {
    id: 'oda', name: 'Oda',
    title: 'Grandmaster of the Still Water',
    command: 'stance',
    role: 'Monk / Counter',
    look: {
      id: 'oda', build: 'athletic', height: 1.70, hair: 'bald', eyeStyle: 'closed',
      colors: {
        skin: '#6e4030', hair: '#171319', torso: '#8b2a2c', accent: '#ddccab',
        legs: '#8b2a2c', boots: '#4b382d', gloves: '#7c4939',
      },
    },
    base: { hp: 70, mp: 16, vig: 34, spd: 32, sta: 30, mag: 22, res: 30, lck: 24 },
    growth: { hp: 48, mp: 6, vig: 2.5, spd: 1.9, sta: 2.2, mag: 1.6, res: 2.0, lck: 1.5 },
    equip: ['fist', 'lightArmor', 'hat'],
    portraitTint: '#8b2a2c',
  },

  kestrel: {
    id: 'kestrel', name: 'Kestrel',
    title: 'Vellum Archivist',
    command: 'annotate',         // reveal and exploit enemy weaknesses
    role: 'Scholar / Support',
    look: {
      id: 'kestrel', build: 'child', height: 1.20, hair: 'short', eyeStyle: 'round',
      colors: {
        skin: '#dcae8a', hair: '#5e5163', torso: '#1a8fa5', accent: '#f7d968',
        legs: '#33477c', boots: '#4b382d', gloves: '#3fc6d6', cape: '#12566b',
      },
    },
    base: { hp: 40, mp: 19, vig: 18, spd: 30, sta: 19, mag: 31, res: 32, lck: 30 },
    growth: { hp: 28, mp: 8, vig: 1.2, spd: 1.7, sta: 1.4, mag: 2.5, res: 2.4, lck: 1.9 },
    equip: ['rod', 'thrown', 'robe', 'hat'],
    innateMagic: true,
    portraitTint: '#1a8fa5',
  },

  rusk: {
    id: 'rusk', name: 'Rusk',
    title: 'Salvaged Automaton',
    command: 'overclock',
    role: 'Construct / Tank',
    look: {
      id: 'rusk', build: 'hulking', height: 2.05, hair: 'bald', eyeStyle: 'sharp',
      colors: {
        skin: '#8b9199', hair: '#4a4f57', torso: '#5b6674', accent: '#1a8fa5',
        legs: '#414954', boots: '#22242a', gloves: '#666c74', metal: '#a6b0bc',
      },
    },
    base: { hp: 92, mp: 6, vig: 40, spd: 20, sta: 40, mag: 10, res: 34, lck: 8 },
    growth: { hp: 64, mp: 2, vig: 3.2, spd: 1.0, sta: 3.0, mag: 0.6, res: 2.2, lck: 0.5 },
    equip: ['fist', 'heavyArmor', 'helm'],
    immune: ['poison', 'sleep', 'confuse', 'silence'],
    portraitTint: '#5b6674',
  },

  wick: {
    id: 'wick', name: 'Wick',
    title: 'Hedge-Priest of the Ninth Lantern',
    command: 'litany',           // stacking blessings
    role: 'Healer',
    look: {
      id: 'wick', build: 'normal', height: 1.68, hair: 'short', expression: 'sad',
      colors: {
        skin: '#c08865', hair: '#95836b', torso: '#ddccab', accent: '#ab8018',
        legs: '#95836b', boots: '#5e412c', gloves: '#bda98b', cape: '#ddccab',
      },
    },
    base: { hp: 46, mp: 22, vig: 20, spd: 27, sta: 22, mag: 33, res: 34, lck: 22 },
    growth: { hp: 32, mp: 9, vig: 1.4, spd: 1.4, sta: 1.7, mag: 2.7, res: 2.5, lck: 1.3 },
    equip: ['rod', 'staff', 'robe', 'shield', 'hat'],
    innateMagic: true,
    portraitTint: '#ddccab',
  },

  themask: {
    id: 'themask', name: 'The Mask',
    title: 'Whoever It Needs To Be',
    command: 'mimic',
    role: 'Mimic / Wildcard',
    look: {
      id: 'themask', build: 'normal', height: 1.74, hair: 'bald', eyeStyle: 'closed',
      colors: {
        skin: '#b8b6bd', hair: '#4a4750', torso: '#2c1b4d', accent: '#3fc6d6',
        legs: '#1c1131', boots: '#0f0a1c', gloves: '#41296f', cape: '#2c1b4d',
      },
    },
    base: { hp: 54, mp: 18, vig: 26, spd: 29, sta: 25, mag: 26, res: 26, lck: 26 },
    growth: { hp: 38, mp: 7, vig: 1.9, spd: 1.6, sta: 1.8, mag: 1.9, res: 1.8, lck: 1.6 },
    equip: ['sword', 'dagger', 'rod', 'lightArmor', 'robe', 'shield', 'hat'],
    innateMagic: true,
    portraitTint: '#2c1b4d',
  },
};

export const CAST_ORDER = [
  'vesna', 'corvin', 'aurelian', 'bastian', 'idris', 'maret', 'osric',
  'tam', 'ilsabet', 'oda', 'kestrel', 'rusk', 'wick', 'themask',
];

/** Stat at a given level, from base + growth with a gentle late-game taper. */
export function statAt(charId, stat, level) {
  const c = CHARACTERS[charId];
  if (!c) return 1;
  const base = c.base[stat] ?? 10;
  const growth = c.growth[stat] ?? 1;
  const lv = Math.max(1, level) - 1;
  // Diminishing returns past level 40 keeps the endgame from running away
  // while still rewarding levelling.
  const effective = lv <= 40 ? lv : 40 + (lv - 40) * 0.68;
  const value = base + growth * effective;
  return stat === 'hp' || stat === 'mp' ? Math.round(value) : Math.min(255, Math.round(value));
}

/**
 * Total experience required to reach `level`.
 *
 * The exponent is not a taste decision, it is fitted. What the encounter
 * tables actually pay a party of four grows as roughly `0.045 × level^2.55`
 * across the whole game — five experience a fight in the Silt Road, three
 * thousand out on the Overwind. Integrating that gives `level^3.55`, and the
 * coefficient sets how many fights a level costs: at 0.128 it is about eleven,
 * flat, from the opening village to the last region.
 *
 * The previous curve — `24 × (level-1)^2.42` — was written against nothing in
 * particular and rose far faster than the payouts did. It cost 138 random
 * battles to gain a level in the opening region and 12 by the endgame: the
 * grind was at its worst exactly where a player is still deciding whether to
 * keep going, and eased off once they were committed. Reaching level 20 from
 * the level the game starts you on took 399 fights.
 */
export function expForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(0.128 * Math.pow(level, 3.55));
}

export function levelForExp(exp) {
  let lv = 1;
  while (lv < 99 && exp >= expForLevel(lv + 1)) lv++;
  return lv;
}
