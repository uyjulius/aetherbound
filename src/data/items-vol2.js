/**
 * Items and equipment, volume two: the mid-to-late game.
 *
 * Volume one (`items.js`) carries the party from Harrowmere to roughly the
 * Ferran Outpost and then stops — its ceiling is Aetherglass at 148 attack and
 * Warden Mail at 118 defence, with whole weapon families (claw, thrown,
 * crossbow) holding no entries at all. This file continues that curve upward
 * without breaking it, fills the empty families so every character has a line
 * of their own to follow, and adds the relics that make the back half of the
 * game about *how* a party is built rather than how large its numbers are.
 *
 * Shape is identical to `ITEMS`: id, name, kind, type, slot, price, sell,
 * stats, and the optional behaviour fields below. Consumables use `effect`
 * (singular) and `target`; equipment uses `effects` (plural, an array).
 *
 * ONLY these `effects` strings do anything. Each was traced to the line that
 * reads it; anything else is decoration that lies to the player:
 *
 *   halfMP      spells.js spellCost      — any equipment slot
 *   oneMP       spells.js spellCost      — any equipment slot
 *   autoRevive  battle.js applyDamage    — any equipment slot
 *   stealUp     battle.js doSteal        — any equipment slot
 *   noEncounter party.js hasEncounterWard— any equipment slot
 *   reachBack   battle.js doAttack       — WEAPON SLOT ONLY (`actor.weapon`)
 *   critUp      battle.js resolvePhysical— WEAPON SLOT ONLY (`actor.weapon`)
 *
 * Note the last two: both are read off `actor.weapon` specifically, so they are
 * dead weight on a relic or a shield and appear on weapons only. Volume one's
 * `dualWield`, `doubleCast`, `stealOnHit`, `autoReflect` and `fastField` have
 * no reader anywhere in the tree and are deliberately not continued here.
 *
 * The other three behaviour fields are read straight off the item:
 *
 *   element     a weapon's attack element (doAttack)
 *   immune      statuses the wearer cannot be given (PartyCombatant)
 *   resist      element → 'weak' | 'resist' | 'immune' | 'absorb' (affinity)
 *
 * `resist` is the interesting one, because 'weak' is as legal as 'absorb' — the
 * elemental hearts below buy an absorption with a matching vulnerability, which
 * is a decision rather than a purchase.
 *
 * Pricing follows volume one's observed relationships: weapons ≈ 0.5 × atk²,
 * armour ≈ 0.7 × def², casting gear ≈ 6.25 × mag², and `sell` is always exactly
 * half of `price`. Anything priced 0 is not sold anywhere — treat it as a chest
 * or a boss reward, the way Elixir and Last Light already are.
 *
 * A word on defence: the physical formula divides by (255 − def), so defence
 * saturates. Volume one's best three pieces plus a high-stamina character
 * already brush that ceiling, so the late gear here climbs def only gently and
 * spends its budget on HP, magic defence, evasion and immunities instead.
 */

export const VOL2_ITEMS = {
  // --- consumables: healing ----------------------------------------------
  // Slotting between Hi-Potion (550) and X-Potion (2200), then above it. The
  // HP-per-gil ratio holds at roughly 1.8 throughout, as volume one's does.
  fieldsuture:  { id: 'fieldsuture', name: 'Field Suture', kind: 'consumable', price: 650, sell: 325, target: 'oneAlly', effect: { heal: 1200 }, desc: 'Restores 1200 HP.' },
  marrowdraught:{ id: 'marrowdraught', name: 'Marrow Draught', kind: 'consumable', price: 2400, sell: 1200, target: 'oneAlly', effect: { heal: 4200 }, desc: 'Restores 4200 HP.' },
  greatbalm:    { id: 'greatbalm', name: 'Greater Balm', kind: 'consumable', price: 900, sell: 450, target: 'allAllies', effect: { heal: 600 }, desc: 'Restores 600 HP to all allies.' },
  vigilbalm:    { id: 'vigilbalm', name: 'Vigil Balm', kind: 'consumable', price: 2600, sell: 1300, target: 'allAllies', effect: { heal: 1400 }, desc: 'Restores 1400 HP to all allies.' },
  deeptonic:    { id: 'deeptonic', name: 'Deep Tonic', kind: 'consumable', price: 1500, sell: 750, target: 'oneAlly', effect: { mp: 500 }, desc: 'Restores 500 MP.' },
  deepwellflask:{ id: 'deepwellflask', name: 'Deepwell Flask', kind: 'consumable', price: 3200, sell: 1600, target: 'oneAlly', effect: { fullMP: true }, desc: 'Fully restores MP.' },

  // --- consumables: status ------------------------------------------------
  // Volume one cures poison, blind, silence, stone and the mind-affecting
  // group. These cover the ailments that had no answer short of a Panacea.
  thawwine:     { id: 'thawwine', name: 'Thaw Wine', kind: 'consumable', price: 90, sell: 45, target: 'oneAlly', effect: { cure: ['freeze'] }, desc: 'Thaws the frozen.' },
  nervetonic:   { id: 'nervetonic', name: 'Nerve Tonic', kind: 'consumable', price: 200, sell: 100, target: 'oneAlly', effect: { cure: ['paralysis', 'stop', 'slow'] }, desc: 'Gets a stalled body moving.' },
  steadyingdram:{ id: 'steadyingdram', name: 'Steadying Dram', kind: 'consumable', price: 180, sell: 90, target: 'oneAlly', effect: { cure: ['berserk', 'seizure'] }, desc: 'Steadies a fit or a temper.' },
  gravesalt:    { id: 'gravesalt', name: 'Grave Salt', kind: 'consumable', price: 300, sell: 150, target: 'oneAlly', effect: { cure: ['zombie', 'doom'] }, desc: 'Buys back a promised death.' },
  sovereignpanacea:{ id: 'sovereignpanacea', name: 'Sovereign Panacea', kind: 'consumable', price: 1600, sell: 800, target: 'allAllies', effect: { cureAll: true }, desc: 'Cures all ailments, party-wide.' },
  phoenixember: { id: 'phoenixember', name: 'Phoenix Ember', kind: 'consumable', price: 2000, sell: 1000, target: 'oneAlly', targetsKO: true, effect: { revive: 1.0 }, desc: 'Revives at full HP.' },

  // --- consumables: blessings ---------------------------------------------
  // Bottled versions of buffs the party may not have learned yet. Priced above
  // the spell that duplicates them, because a bottle needs no MP and no caster.
  quickeningdraught:{ id: 'quickeningdraught', name: 'Quickening Draught', kind: 'consumable', price: 2400, sell: 1200, target: 'allAllies', effect: { status: { haste: 100 } }, desc: 'Hastes the whole party.' },
  springwater:  { id: 'springwater', name: 'Spring Water', kind: 'consumable', price: 400, sell: 200, target: 'oneAlly', effect: { status: { regen: 100 } }, desc: 'Grants Regen.' },
  wellspringdew:{ id: 'wellspringdew', name: 'Wellspring Dew', kind: 'consumable', price: 1400, sell: 700, target: 'allAllies', effect: { status: { regen: 100 } }, desc: 'Grants Regen to all allies.' },
  mirrordust:   { id: 'mirrordust', name: 'Mirror Dust', kind: 'consumable', price: 700, sell: 350, target: 'oneAlly', effect: { status: { reflect: 100 } }, desc: 'Grants Reflect.' },
  hawksbreath:  { id: 'hawksbreath', name: "Hawk's Breath", kind: 'consumable', price: 600, sell: 300, target: 'oneAlly', effect: { status: { critUp: 100 } }, desc: 'Sharpens the eye. Critical hits come easier.' },

  // --- consumables: offensive ---------------------------------------------
  // The second rank of flasks, at the same damage-per-gil as the first, plus
  // wind and holy, which volume one left uncovered.
  pyreflask:    { id: 'pyreflask', name: 'Pyre Flask', kind: 'consumable', price: 700, sell: 350, target: 'allEnemies', effect: { damage: 380, element: 'fire' }, desc: 'Heavy fire damage to all foes.' },
  rimeflask:    { id: 'rimeflask', name: 'Rime Flask', kind: 'consumable', price: 700, sell: 350, target: 'allEnemies', effect: { damage: 380, element: 'ice' }, desc: 'Heavy ice damage to all foes.' },
  arcflask:     { id: 'arcflask', name: 'Arc Flask', kind: 'consumable', price: 700, sell: 350, target: 'allEnemies', effect: { damage: 380, element: 'bolt' }, desc: 'Heavy lightning damage to all foes.' },
  galeflask:    { id: 'galeflask', name: 'Gale Flask', kind: 'consumable', price: 700, sell: 350, target: 'allEnemies', effect: { damage: 380, element: 'wind' }, desc: 'Heavy wind damage to all foes.' },
  lanternoil:   { id: 'lanternoil', name: 'Lantern Oil', kind: 'consumable', price: 800, sell: 400, target: 'allEnemies', effect: { damage: 420, element: 'holy' }, desc: 'Holy damage to all foes. Burns the buried.' },
  deadfallcharge:{ id: 'deadfallcharge', name: 'Deadfall Charge', kind: 'consumable', price: 1300, sell: 650, target: 'oneEnemy', effect: { damage: 1100 }, desc: 'Ruinous damage to one foe.' },
  sunderingcharge:{ id: 'sunderingcharge', name: 'Sundering Charge', kind: 'consumable', price: 2600, sell: 1300, target: 'allEnemies', effect: { damage: 700 }, desc: 'Ruinous damage to all foes.' },

  // --- weapons: swords ----------------------------------------------------
  // Six characters take a sword, so this is the widest line and the one that
  // has to stay smooth: 44 → 56 → 66 → 76 → 86 → 104 → 116 → 128 → 140 → 148,
  // with Emberbrand, Tidecleaver and Aetherglass keeping their existing rungs.
  siltroadsabre:{ id: 'siltroadsabre', name: 'Silt Road Sabre', kind: 'weapon', type: 'sword', slot: 'weapon', price: 1600, sell: 800, stats: { atk: 56, lck: 4 }, desc: 'Plain, straight, and sharpened every night.' },
  wardensfalchion:{ id: 'wardensfalchion', name: "Warden's Falchion", kind: 'weapon', type: 'sword', slot: 'weapon', price: 2200, sell: 1100, stats: { atk: 66, sta: 5 }, desc: 'Issued to the gate watch. Rarely returned.' },
  bellringer:   { id: 'bellringer', name: 'Bellringer', kind: 'weapon', type: 'sword', slot: 'weapon', price: 2900, sell: 1450, stats: { atk: 76, vig: 5 }, desc: 'Rings once on the blow, then falls quiet.' },
  saltbitten:   { id: 'saltbitten', name: 'Saltbitten Blade', kind: 'weapon', type: 'sword', slot: 'weapon', price: 3700, sell: 1850, stats: { atk: 86, spd: 3 }, element: 'water', desc: 'Pitted by the Drowned Coast, and keener for it.' },
  cinderbrand:  { id: 'cinderbrand', name: 'Cinderbrand', kind: 'weapon', type: 'sword', slot: 'weapon', price: 5400, sell: 2700, stats: { atk: 104, mag: 8 }, element: 'fire', desc: 'What Emberbrand grows into, given a hotter forge.' },
  brokenstandard:{ id: 'brokenstandard', name: 'The Broken Standard', kind: 'weapon', type: 'sword', slot: 'weapon', price: 6700, sell: 3350, stats: { atk: 116, sta: 8, res: 6 }, desc: 'Half a sword. It has never needed the other half.' },
  vigilblade:   { id: 'vigilblade', name: 'Vigil Blade', kind: 'weapon', type: 'sword', slot: 'weapon', price: 8200, sell: 4100, stats: { atk: 128, res: 10 }, element: 'holy', desc: 'Kept by the door of a lantern that still burns.' },
  enginecut:    { id: 'enginecut', name: 'Enginecut', kind: 'weapon', type: 'sword', slot: 'weapon', price: 9800, sell: 4900, stats: { atk: 140, mag: 10 }, element: 'aether', desc: 'Struck from the same sleeping metal as Aetherglass.' },
  sundersong:   { id: 'sundersong', name: 'Sundersong', kind: 'weapon', type: 'sword', slot: 'weapon', price: 0, sell: 14000, stats: { atk: 168, vig: 10, spd: 4 }, element: 'aether', effects: ['critUp'], desc: 'The last thing the Engine made. It made it quietly.' },

  // --- weapons: daggers ---------------------------------------------------
  // Daggers trade raw attack for speed, luck and pilfering, so they cost a
  // little more per point of attack than a sword does. Quiet Edge (78) sits
  // between Salvager's Dirk and Serpent's Tooth.
  gullkinfang:  { id: 'gullkinfang', name: 'Gullkin Fang', kind: 'weapon', type: 'dagger', slot: 'weapon', price: 1400, sell: 700, stats: { atk: 50, spd: 7, lck: 5 }, desc: 'Taken from a raider who had stopped needing it.' },
  nightknife:   { id: 'nightknife', name: 'Night Market Knife', kind: 'weapon', type: 'dagger', slot: 'weapon', price: 2200, sell: 1100, stats: { atk: 62, spd: 8, lck: 8 }, effects: ['stealUp'], desc: 'Sold quietly, and never with a receipt.' },
  salvagersdirk:{ id: 'salvagersdirk', name: "Salvager's Dirk", kind: 'weapon', type: 'dagger', slot: 'weapon', price: 3000, sell: 1500, stats: { atk: 74, spd: 9, lck: 10 }, desc: 'Prises open more doors than it opens throats.' },
  serpentstooth:{ id: 'serpentstooth', name: "Serpent's Tooth", kind: 'weapon', type: 'dagger', slot: 'weapon', price: 4300, sell: 2150, stats: { atk: 88, spd: 10 }, element: 'poison', desc: 'Envenomed once, a century ago. Still is.' },
  widowsknife:  { id: 'widowsknife', name: "Widow's Knife", kind: 'weapon', type: 'dagger', slot: 'weapon', price: 7600, sell: 3800, stats: { atk: 100, spd: 12, lck: 12 }, effects: ['critUp'], desc: 'Harrowmere keeps three of these and admits to none.' },
  reliquaryknife:{ id: 'reliquaryknife', name: 'Reliquary Knife', kind: 'weapon', type: 'dagger', slot: 'weapon', price: 0, sell: 9000, stats: { atk: 118, spd: 14, lck: 16 }, effects: ['stealUp', 'critUp'], desc: 'Every relic hunter has heard of it. One has held it.' },

  // --- weapons: katana ----------------------------------------------------
  // Idris alone, so the line is short and steep. Ashen Katana (82) is the third
  // rung; everything here is Ashenhall work or a memory of it.
  thirdfold:    { id: 'thirdfold', name: 'The Third Fold', kind: 'weapon', type: 'katana', slot: 'weapon', price: 2300, sell: 1150, stats: { atk: 68, spd: 3 }, desc: 'A practice blade, if you were raised at Ashenhall.' },
  temperedash:  { id: 'temperedash', name: 'Tempered Ash', kind: 'weapon', type: 'katana', slot: 'weapon', price: 4200, sell: 2100, stats: { atk: 94, spd: 4, vig: 4 }, desc: 'Quenched in the ash of the hall that made it.' },
  winterlong:   { id: 'winterlong', name: 'Winter Long', kind: 'weapon', type: 'katana', slot: 'weapon', price: 6000, sell: 3000, stats: { atk: 112, spd: 5 }, element: 'ice', desc: 'Drawn slowly. It is colder than the air around it.' },
  mourningsteel:{ id: 'mourningsteel', name: 'Mourning Steel', kind: 'weapon', type: 'katana', slot: 'weapon', price: 8400, sell: 4200, stats: { atk: 132, spd: 6, res: 8 }, desc: 'Forged for a funeral that was never held.' },
  thelastfold:  { id: 'thelastfold', name: 'The Last Fold', kind: 'weapon', type: 'katana', slot: 'weapon', price: 0, sell: 13000, stats: { atk: 158, spd: 8, vig: 8 }, effects: ['critUp'], desc: 'Four hundred folds, and then one more.' },

  // --- weapons: spears ----------------------------------------------------
  // The whole point of a spear is `reachBack`: full damage from the back row,
  // where the wielder takes half. Every entry keeps it, or it is not a spear.
  ferranpike:   { id: 'ferranpike', name: 'Ferran Pike', kind: 'weapon', type: 'spear', slot: 'weapon', price: 2900, sell: 1450, stats: { atk: 72, sta: 4 }, effects: ['reachBack'], desc: 'Checkpoint issue. Strikes from the back row unpenalised.' },
  boarspear:    { id: 'boarspear', name: 'Boar Spear', kind: 'weapon', type: 'spear', slot: 'weapon', price: 4200, sell: 2100, stats: { atk: 88, vig: 5 }, effects: ['reachBack'], desc: 'The crossbar is there to stop what you stabbed.' },
  tidewardlance:{ id: 'tidewardlance', name: 'Tideward Lance', kind: 'weapon', type: 'spear', slot: 'weapon', price: 6200, sell: 3100, stats: { atk: 106, spd: 4 }, element: 'water', effects: ['reachBack'], desc: 'Coast watch work. Never rusts, never dries.' },
  stormpike:    { id: 'stormpike', name: 'Stormpike', kind: 'weapon', type: 'spear', slot: 'weapon', price: 8600, sell: 4300, stats: { atk: 126, vig: 6 }, element: 'bolt', effects: ['reachBack'], desc: 'Held upright in a storm, on purpose.' },
  wellspringlance:{ id: 'wellspringlance', name: 'Wellspring Lance', kind: 'weapon', type: 'spear', slot: 'weapon', price: 0, sell: 12000, stats: { atk: 150, vig: 10, sta: 8 }, element: 'aether', effects: ['reachBack'], desc: 'The Ninth Well gave it up without argument.' },

  // --- weapons: crossbows -------------------------------------------------
  // Aurelian can equip these and volume one never made one. Ranged by nature,
  // so all of them carry `reachBack`; the good ones are Ferran machining and
  // carry `critUp` besides.
  handcrossbow: { id: 'handcrossbow', name: 'Hand Crossbow', kind: 'weapon', type: 'crossbow', slot: 'weapon', price: 1100, sell: 550, stats: { atk: 46, spd: 2 }, effects: ['reachBack'], desc: 'Slow to load, but it does not care where you stand.' },
  latchbow:     { id: 'latchbow', name: 'Latch Bow', kind: 'weapon', type: 'crossbow', slot: 'weapon', price: 2100, sell: 1050, stats: { atk: 64, lck: 4 }, effects: ['reachBack'], desc: 'A goat-foot lever, and half the winding.' },
  windlassbow:  { id: 'windlassbow', name: 'Windlass Bow', kind: 'weapon', type: 'crossbow', slot: 'weapon', price: 4000, sell: 2000, stats: { atk: 84, sta: 3 }, effects: ['reachBack', 'critUp'], desc: 'Cranked, not drawn. Punches through plate.' },
  quarrelengine:{ id: 'quarrelengine', name: 'Quarrel Engine', kind: 'weapon', type: 'crossbow', slot: 'weapon', price: 6000, sell: 3000, stats: { atk: 108, spd: 3 }, effects: ['reachBack'], desc: 'Feeds itself. The engineers are proud of that.' },
  siegelock:    { id: 'siegelock', name: 'Siege Lock', kind: 'weapon', type: 'crossbow', slot: 'weapon', price: 9500, sell: 4750, stats: { atk: 134, vig: 6 }, effects: ['reachBack', 'critUp'], desc: 'Marchetti Works, and they are still not certain how.' },

  // --- weapons: fists -----------------------------------------------------
  // Bastian, Oda and Rusk share this line, which is why it runs long and why
  // the middle of it splits: wraps for the counter-puncher, breakers for the
  // bruiser. Storm Fists (96) keeps its rung.
  bandedgrips:  { id: 'bandedgrips', name: 'Banded Grips', kind: 'weapon', type: 'fist', slot: 'weapon', price: 1500, sell: 750, stats: { atk: 54, vig: 4 }, desc: 'Iron bands over old leather. Honest enough.' },
  stillwaterwraps:{ id: 'stillwaterwraps', name: 'Still Water Wraps', kind: 'weapon', type: 'fist', slot: 'weapon', price: 2400, sell: 1200, stats: { atk: 68, spd: 4, res: 6 }, desc: 'Bound the way the Grandmaster binds them.' },
  cairnbreakers:{ id: 'cairnbreakers', name: 'Cairn Breakers', kind: 'weapon', type: 'fist', slot: 'weapon', price: 3600, sell: 1800, stats: { atk: 84, vig: 6, sta: 4 }, desc: 'Made for stone. They work on other things.' },
  mountainhands:{ id: 'mountainhands', name: 'Mountain Hands', kind: 'weapon', type: 'fist', slot: 'weapon', price: 6800, sell: 3400, stats: { atk: 116, vig: 8 }, element: 'earth', desc: 'Weighted at the knuckle. The ground helps.' },
  kilnwraps:    { id: 'kilnwraps', name: 'Kiln Wraps', kind: 'weapon', type: 'fist', slot: 'weapon', price: 8600, sell: 4300, stats: { atk: 130, vig: 6 }, element: 'fire', desc: 'Cinderspine cloth. It keeps the heat it was given.' },
  unboundfist:  { id: 'unboundfist', name: 'The Unbound Fist', kind: 'weapon', type: 'fist', slot: 'weapon', price: 0, sell: 12500, stats: { atk: 156, vig: 12, spd: 6 }, effects: ['critUp'], desc: 'Not a weapon. A conclusion.' },

  // --- weapons: claws -----------------------------------------------------
  // Tam's only option, and volume one gave her nothing at all — she was fighting
  // the back half of the game bare-handed at 12 attack. Claws are fast and
  // luck-leaning, sitting a rung under fists for raw power.
  boneclaws:    { id: 'boneclaws', name: 'Bone Claws', kind: 'weapon', type: 'claw', slot: 'weapon', price: 1000, sell: 500, stats: { atk: 44, spd: 5 }, desc: 'Bound to the knuckle with wet cord. It dried tight.' },
  bramblehooks: { id: 'bramblehooks', name: 'Bramble Hooks', kind: 'weapon', type: 'claw', slot: 'weapon', price: 2000, sell: 1000, stats: { atk: 62, spd: 6, lck: 4 }, desc: 'Thorn-shaped, and they came off something that grew them.' },
  roadwolfclaws:{ id: 'roadwolfclaws', name: 'Roadwolf Claws', kind: 'weapon', type: 'claw', slot: 'weapon', price: 3400, sell: 1700, stats: { atk: 80, spd: 8, vig: 4 }, desc: 'She named the wolf first. Then she wore it.' },
  frostmaulclaws:{ id: 'frostmaulclaws', name: 'Frostmaul Claws', kind: 'weapon', type: 'claw', slot: 'weapon', price: 5400, sell: 2700, stats: { atk: 102, spd: 8 }, element: 'ice', desc: 'They frost over between one swipe and the next.' },
  greenmotherclaws:{ id: 'greenmotherclaws', name: "Greenmother's Claws", kind: 'weapon', type: 'claw', slot: 'weapon', price: 0, sell: 11000, stats: { atk: 138, spd: 12, vig: 8 }, element: 'earth', effects: ['critUp'], desc: 'The wood grew them for her. She says it asked first.' },

  // --- weapons: thrown ----------------------------------------------------
  // Osric and Kestrel share this, and like the crossbows it was empty. Thrown
  // weapons are ranged, so `reachBack` throughout; they lean on luck, which is
  // Osric's whole character expressed as a stat.
  throwingirons:{ id: 'throwingirons', name: 'Throwing Irons', kind: 'weapon', type: 'thrown', slot: 'weapon', price: 900, sell: 450, stats: { atk: 40, spd: 4 }, effects: ['reachBack'], desc: 'Weighted flat. They come back if you are lucky.' },
  vagrantdice:  { id: 'vagrantdice', name: 'Vagrant Dice', kind: 'weapon', type: 'thrown', slot: 'weapon', price: 2200, sell: 1100, stats: { atk: 58, lck: 12 }, effects: ['reachBack'], desc: 'They land the way he needs them to. Usually.' },
  vellumdarts:  { id: 'vellumdarts', name: 'Vellum Darts', kind: 'weapon', type: 'thrown', slot: 'weapon', price: 3000, sell: 1500, stats: { atk: 72, mag: 8 }, effects: ['reachBack'], desc: 'Archive tags, sharpened. The Archivist disapproves.' },
  saltchakram:  { id: 'saltchakram', name: 'Salt Chakram', kind: 'weapon', type: 'thrown', slot: 'weapon', price: 5600, sell: 2800, stats: { atk: 96, spd: 6 }, effects: ['reachBack', 'critUp'], desc: 'Coast work. The edge is crusted and all the better.' },
  thevagrantstar:{ id: 'thevagrantstar', name: 'The Vagrant Star', kind: 'weapon', type: 'thrown', slot: 'weapon', price: 0, sell: 10000, stats: { atk: 124, spd: 8, lck: 20 }, effects: ['reachBack', 'critUp'], desc: 'He wagered the house on it once. He won.' },

  // --- weapons: rods, staves, brushes -------------------------------------
  // Casting gear is priced off magic rather than attack (≈ 6.25 × mag²), which
  // is why a rod with 30 magic costs what a sword with 100 attack does. The
  // top of each line carries `halfMP`, matching Aetherglass and Aetherweave.
  siltglassrod: { id: 'siltglassrod', name: 'Siltglass Rod', kind: 'weapon', type: 'rod', slot: 'weapon', price: 1300, sell: 650, stats: { atk: 16, mag: 14, mp: 12 }, desc: 'Cloudy glass, drawn from river silt. It carries well.' },
  chorusrod:    { id: 'chorusrod', name: 'Chorus Rod', kind: 'weapon', type: 'rod', slot: 'weapon', price: 3100, sell: 1550, stats: { atk: 20, mag: 22, res: 6, mp: 20 }, desc: 'Struck once, it answers itself for a while.' },
  stillglass:   { id: 'stillglass', name: 'Stillglass Rod', kind: 'weapon', type: 'rod', slot: 'weapon', price: 5700, sell: 2850, stats: { atk: 24, mag: 30, res: 10, mp: 30 }, desc: 'No bubble in it anywhere. Nobody knows how.' },
  resonancerod: { id: 'resonancerod', name: 'Resonance Rod', kind: 'weapon', type: 'rod', slot: 'weapon', price: 14000, sell: 7000, stats: { atk: 28, mag: 40, res: 12, mp: 45 }, effects: ['halfMP'], desc: 'It is already humming when you pick it up.' },
  pilgrimstaff: { id: 'pilgrimstaff', name: "Pilgrim's Staff", kind: 'weapon', type: 'staff', slot: 'weapon', price: 3600, sell: 1800, stats: { atk: 26, mag: 24, res: 10, mp: 26 }, desc: 'Worn smooth at the grip by a long walk.' },
  ninthlanternstaff:{ id: 'ninthlanternstaff', name: 'Ninth Lantern Staff', kind: 'weapon', type: 'staff', slot: 'weapon', price: 7200, sell: 3600, stats: { atk: 30, mag: 34, res: 16, mp: 40 }, desc: 'Its flame went out years ago. It works anyway.' },
  vesperstaff:  { id: 'vesperstaff', name: 'Vesper Staff', kind: 'weapon', type: 'staff', slot: 'weapon', price: 0, sell: 9000, stats: { atk: 34, mag: 46, res: 20, mp: 60 }, effects: ['halfMP'], desc: 'For the last office of the day, and the last of all.' },
  inkstonebrush:{ id: 'inkstonebrush', name: 'Inkstone Brush', kind: 'weapon', type: 'brush', slot: 'weapon', price: 2500, sell: 1250, stats: { atk: 20, mag: 20, lck: 8, mp: 16 }, desc: 'Grinds its own ink. Paints closer to the truth.' },
  longlookbrush:{ id: 'longlookbrush', name: 'Long Look Brush', kind: 'weapon', type: 'brush', slot: 'weapon', price: 6400, sell: 3200, stats: { atk: 24, mag: 32, lck: 12, mp: 30 }, desc: 'Look long enough at a thing and it holds still.' },
  thelastportrait:{ id: 'thelastportrait', name: 'The Last Portrait', kind: 'weapon', type: 'brush', slot: 'weapon', price: 0, sell: 9500, stats: { atk: 28, mag: 44, lck: 16, mp: 48 }, effects: ['halfMP'], desc: 'The sitter never came back for it.' },

  // --- armour: light bodies -----------------------------------------------
  // Volume one abandons light armour at 32 defence while heavy runs to 118,
  // which strands half the cast. This line closes that gap and pays for its
  // lower defence in evasion, speed and one very good immunity.
  roadcoat:     { id: 'roadcoat', name: 'Road Coat', kind: 'armor', type: 'lightArmor', slot: 'body', price: 500, sell: 250, stats: { def: 24, hp: 60, eva: 3 }, desc: 'Oiled twice a year, whether it needs it or not.' },
  brigandine:   { id: 'brigandine', name: 'Brigandine', kind: 'armor', type: 'lightArmor', slot: 'body', price: 1200, sell: 600, stats: { def: 40, hp: 140, sta: 4 }, desc: 'Plates riveted inside the cloth, where they show as studs.' },
  saltleathers: { id: 'saltleathers', name: 'Salt Leathers', kind: 'armor', type: 'lightArmor', slot: 'body', price: 2400, sell: 1200, stats: { def: 54, hp: 220, eva: 5 }, resist: { water: 'resist' }, desc: 'Cured in the shallows. The sea has stopped minding it.' },
  raidersjack:  { id: 'raidersjack', name: "Raider's Jack", kind: 'armor', type: 'lightArmor', slot: 'body', price: 3600, sell: 1800, stats: { def: 66, hp: 300, spd: 3, eva: 8 }, desc: 'Cut short so it does not catch when you run.' },
  bramblecoat:  { id: 'bramblecoat', name: 'Bramble Coat', kind: 'armor', type: 'lightArmor', slot: 'body', price: 5600, sell: 2800, stats: { def: 78, hp: 380, eva: 10 }, immune: ['poison', 'venom'], desc: 'Thorn-woven. Nothing it lets through is poisonous.' },
  stillwatergi: { id: 'stillwatergi', name: 'Still Water Gi', kind: 'armor', type: 'lightArmor', slot: 'body', price: 7800, sell: 3900, stats: { def: 88, hp: 460, spd: 4, eva: 14, res: 10 }, desc: 'Unarmoured, and yet somehow the hardest to hit.' },

  // --- armour: heavy bodies -----------------------------------------------
  // Continues past Warden Mail. Defence climbs slowly from here because the
  // damage formula saturates near 255 total; the budget goes into HP and magic
  // defence, which do not.
  ferranplate:  { id: 'ferranplate', name: 'Ferran Plate', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 3400, sell: 1700, stats: { def: 70, hp: 300, sta: 7, spd: -2 }, desc: 'Stamped, not fitted. Everyone wears the same one.' },
  ashencuirass: { id: 'ashencuirass', name: 'Ashenhall Cuirass', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 5000, sell: 2500, stats: { def: 84, hp: 400, sta: 8, res: 6, spd: -2 }, desc: 'Lacquered black. The hall burned; this did not.' },
  enginemail:   { id: 'enginemail', name: 'Engine Mail', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 6800, sell: 3400, stats: { def: 96, mdef: 30, hp: 500, sta: 9, spd: -3 }, desc: 'It is warm even in the cold, and nobody likes that.' },
  siegeplate:   { id: 'siegeplate', name: 'Siege Plate', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 9000, sell: 4500, stats: { def: 112, mdef: 40, hp: 640, sta: 12, spd: -4 }, desc: 'Made for standing in a gap for a very long time.' },
  wyrmscaleplate:{ id: 'wyrmscaleplate', name: 'Wyrmscale Plate', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 0, sell: 9500, stats: { def: 126, mdef: 74, hp: 780, sta: 12, spd: -3 }, resist: { fire: 'absorb', ice: 'weak' }, desc: 'Drinks fire. Feels winter twice as keenly.' },
  deepwardplate:{ id: 'deepwardplate', name: 'Deepward Plate', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 0, sell: 15000, stats: { def: 130, mdef: 96, hp: 900, sta: 16, res: 10, spd: -3 }, resist: { aether: 'resist', shadow: 'resist' }, desc: 'Worn down the well, by someone who came back up.' },

  // --- armour: robes ------------------------------------------------------
  // Magic defence saturates the same way physical defence does, so the top of
  // this line stops at 96 and spends the rest on MP, magic and one `halfMP`.
  wayfarerrobe: { id: 'wayfarerrobe', name: "Wayfarer's Robe", kind: 'armor', type: 'robe', slot: 'body', price: 1200, sell: 600, stats: { def: 26, mdef: 34, mp: 26, mag: 4 }, desc: 'Roomy, patched, and pocketed all the way down.' },
  chanterrobe:  { id: 'chanterrobe', name: "Chanter's Robe", kind: 'armor', type: 'robe', slot: 'body', price: 2200, sell: 1100, stats: { def: 34, mdef: 46, mp: 40, mag: 6, res: 4 }, desc: 'Cut so the sleeves move when the voice does.' },
  vellumvestments:{ id: 'vellumvestments', name: 'Vellum Vestments', kind: 'armor', type: 'robe', slot: 'body', price: 3600, sell: 1800, stats: { def: 42, mdef: 58, mp: 60, mag: 8, res: 6 }, desc: 'Archive dress. The margins are annotated.' },
  vigilrobe:    { id: 'vigilrobe', name: 'Vigil Robe', kind: 'armor', type: 'robe', slot: 'body', price: 5600, sell: 2800, stats: { def: 50, mdef: 68, mp: 80, mag: 10, res: 8 }, immune: ['silence'], desc: 'Whoever wears it can always be heard.' },
  deepwellrobe: { id: 'deepwellrobe', name: 'Deepwell Robe', kind: 'armor', type: 'robe', slot: 'body', price: 13000, sell: 6500, stats: { def: 70, mdef: 86, mp: 110, mag: 14, res: 14 }, desc: 'Damp at the hem, always, whatever the weather.' },
  mantleofnine: { id: 'mantleofnine', name: 'Mantle of Nine', kind: 'armor', type: 'robe', slot: 'body', price: 0, sell: 16000, stats: { def: 76, mdef: 96, mp: 140, mag: 18, res: 18 }, effects: ['halfMP'], desc: 'Nine layers, and the ninth is not cloth.' },

  // --- armour: hats -------------------------------------------------------
  // Hats buy evasion, MP and mind-ailment immunities. Scholar's Hood (28 mdef)
  // and Crown of Salt sit inside this run.
  feltedhood:   { id: 'feltedhood', name: 'Felted Hood', kind: 'armor', type: 'hat', slot: 'head', price: 260, sell: 130, stats: { def: 14, hp: 30, res: 2 }, desc: 'Warm, shapeless, and beloved by whoever owns it.' },
  wayfarerhat:  { id: 'wayfarerhat', name: "Wayfarer's Hat", kind: 'armor', type: 'hat', slot: 'head', price: 420, sell: 210, stats: { def: 18, hp: 50, eva: 4 }, desc: 'Broad enough to keep rain off the collar.' },
  cutpursecowl: { id: 'cutpursecowl', name: 'Cutpurse Cowl', kind: 'armor', type: 'hat', slot: 'head', price: 1100, sell: 550, stats: { def: 24, spd: 2, eva: 8, lck: 6 }, desc: 'Nobody ever remembers the face under it.' },
  archivistcap: { id: 'archivistcap', name: "Archivist's Cap", kind: 'armor', type: 'hat', slot: 'head', price: 1800, sell: 900, stats: { def: 16, mdef: 40, mp: 36, mag: 6 }, desc: 'Flat, plain, and worn with enormous seriousness.' },
  greenhood:    { id: 'greenhood', name: "Greenmother's Hood", kind: 'armor', type: 'hat', slot: 'head', price: 2600, sell: 1300, stats: { def: 30, mdef: 34, hp: 120 }, immune: ['sleep'], desc: 'Leaf-sewn. The wood will not let you drowse in it.' },
  chanterscirclet:{ id: 'chanterscirclet', name: "Chanter's Circlet", kind: 'armor', type: 'hat', slot: 'head', price: 4200, sell: 2100, stats: { def: 26, mdef: 52, mp: 60, mag: 10, res: 8 }, desc: 'Thin silver, and it rings faintly when spells land.' },
  longlookveil: { id: 'longlookveil', name: 'Long Look Veil', kind: 'armor', type: 'hat', slot: 'head', price: 7500, sell: 3750, stats: { def: 34, mdef: 62, mp: 80, mag: 14, lck: 10 }, immune: ['blind', 'confuse'], desc: 'You see less through it and understand more.' },

  // --- armour: helms ------------------------------------------------------
  // Helms buy HP, stamina and hard immunities. Iron Helm (22) and Crown of
  // Salt (54) are the volume one rungs this run passes through.
  sallet:       { id: 'sallet', name: 'Sallet', kind: 'armor', type: 'helm', slot: 'head', price: 900, sell: 450, stats: { def: 30, hp: 90, sta: 3 }, desc: 'A long tail at the back, to keep a blade off the neck.' },
  visoredhelm:  { id: 'visoredhelm', name: 'Visored Helm', kind: 'armor', type: 'helm', slot: 'head', price: 1600, sell: 800, stats: { def: 36, hp: 140, sta: 4 }, immune: ['blind'], desc: 'The slit is narrow on purpose. Nothing gets in the eye.' },
  ferranhelm:   { id: 'ferranhelm', name: 'Ferran Helm', kind: 'armor', type: 'helm', slot: 'head', price: 2400, sell: 1200, stats: { def: 42, mdef: 20, hp: 190, sta: 5 }, desc: 'Lined with the same wire as the outpost lamps.' },
  gravehelm:    { id: 'gravehelm', name: 'Grave Helm', kind: 'armor', type: 'helm', slot: 'head', price: 3600, sell: 1800, stats: { def: 48, mdef: 26, hp: 240, sta: 6 }, immune: ['zombie', 'doom'], desc: 'Taken off a cairn. Politely, and with an apology.' },
  enginecrown:  { id: 'enginecrown', name: 'Engine Crown', kind: 'armor', type: 'helm', slot: 'head', price: 5400, sell: 2700, stats: { def: 52, mdef: 44, hp: 280, mag: 6, res: 8 }, desc: 'A circlet of cold brass. It thinks along with you.' },
  wardenshelm:  { id: 'wardenshelm', name: "Warden's Helm", kind: 'armor', type: 'helm', slot: 'head', price: 9000, sell: 4500, stats: { def: 60, mdef: 52, hp: 340, sta: 8 }, immune: ['stone'], desc: 'The pair to the mail, and just as rarely given up.' },
  ninthcrown:   { id: 'ninthcrown', name: 'The Ninth Crown', kind: 'armor', type: 'helm', slot: 'head', price: 0, sell: 12000, stats: { def: 62, mdef: 64, hp: 420, sta: 10, res: 10 }, immune: ['stone', 'doom', 'zombie'], desc: 'Nine bands of salt-iron. It has outlasted nine heads.' },

  // --- shields ------------------------------------------------------------
  // Shields are where elemental affinity lives for the front line, since only
  // seven of the cast can hold one and giving up the offhand should buy
  // something a stat cannot.
  ironbuckler:  { id: 'ironbuckler', name: 'Iron Buckler', kind: 'armor', type: 'shield', slot: 'offhand', price: 500, sell: 250, stats: { def: 22, eva: 8 }, desc: 'Small, quick, and meant for turning a blade aside.' },
  kiteshield:   { id: 'kiteshield', name: 'Kite Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 1000, sell: 500, stats: { def: 32, eva: 8, sta: 3 }, desc: 'Covers the leg as well, which the militia insisted on.' },
  ferranbulwark:{ id: 'ferranbulwark', name: 'Ferran Bulwark', kind: 'armor', type: 'shield', slot: 'offhand', price: 2200, sell: 1100, stats: { def: 46, mdef: 18, eva: 10, sta: 5 }, desc: 'Braced to be planted. It does not like being carried.' },
  tidewardshield:{ id: 'tidewardshield', name: 'Tideward Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 3400, sell: 1700, stats: { def: 52, mdef: 26, eva: 12 }, resist: { water: 'immune', fire: 'resist' }, desc: 'The sea runs off it and takes the heat with it.' },
  vigilshield:  { id: 'vigilshield', name: 'Vigil Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 4600, sell: 2300, stats: { def: 58, mdef: 34, hp: 200, eva: 12 }, desc: 'Lantern-marked. Held all night without lowering.' },
  ashenaegis:   { id: 'ashenaegis', name: 'Ashen Aegis', kind: 'armor', type: 'shield', slot: 'offhand', price: 6800, sell: 3400, stats: { def: 64, mdef: 44, eva: 14, sta: 8 }, resist: { fire: 'resist', shadow: 'resist' }, desc: 'Scorched down one side and stronger for it.' },
  enginewardshield:{ id: 'enginewardshield', name: 'Engine Ward', kind: 'armor', type: 'shield', slot: 'offhand', price: 9500, sell: 4750, stats: { def: 70, mdef: 56, eva: 16, res: 10 }, resist: { bolt: 'resist', aether: 'resist' }, desc: 'A lattice, not a plate. It disagrees with lightning.' },
  reliquaryshield:{ id: 'reliquaryshield', name: 'Reliquary Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 11000, sell: 5500, stats: { def: 66, mdef: 62, eva: 14 }, immune: ['confuse', 'charm', 'muddle', 'sleep'], desc: 'Nailed with a hundred small saints. None of them budge.' },
  theninthgate: { id: 'theninthgate', name: 'The Ninth Gate', kind: 'armor', type: 'shield', slot: 'offhand', price: 0, sell: 15000, stats: { def: 72, mdef: 74, hp: 400, eva: 18 }, resist: { shadow: 'immune', holy: 'resist' }, desc: 'The gate they held. Someone cut a shield out of it.' },

  // --- relics: elemental hearts and wards ---------------------------------
  // The wards are cheap insurance for a known fight. The hearts are the
  // interesting purchase: an absorption bought with a matching weakness, which
  // makes them a plan rather than an upgrade. All slot into `relic1`, matching
  // every relic in volume one.
  emberward:    { id: 'emberward', name: 'Ember Ward', kind: 'relic', slot: 'relic1', price: 1500, sell: 750, stats: { res: 4 }, resist: { fire: 'resist' }, desc: 'Halves fire damage.' },
  frostward:    { id: 'frostward', name: 'Frost Ward', kind: 'relic', slot: 'relic1', price: 1500, sell: 750, stats: { res: 4 }, resist: { ice: 'resist' }, desc: 'Halves ice damage.' },
  stormward:    { id: 'stormward', name: 'Storm Ward', kind: 'relic', slot: 'relic1', price: 1500, sell: 750, stats: { res: 4 }, resist: { bolt: 'resist' }, desc: 'Halves lightning damage.' },
  cinderheart:  { id: 'cinderheart', name: 'Cinder Heart', kind: 'relic', slot: 'relic1', price: 6000, sell: 3000, resist: { fire: 'absorb', ice: 'weak' }, desc: 'Drinks fire. You will feel the cold twice over.' },
  winterheart:  { id: 'winterheart', name: 'Winter Heart', kind: 'relic', slot: 'relic1', price: 6000, sell: 3000, resist: { ice: 'absorb', fire: 'weak' }, desc: 'Drinks ice. Fire finds you very easily.' },
  stormheart:   { id: 'stormheart', name: 'Storm Heart', kind: 'relic', slot: 'relic1', price: 6000, sell: 3000, resist: { bolt: 'absorb', water: 'weak' }, desc: 'Drinks lightning. Keep out of the water.' },
  gravebindings:{ id: 'gravebindings', name: 'Grave Bindings', kind: 'relic', slot: 'relic1', price: 7000, sell: 3500, resist: { shadow: 'absorb', holy: 'weak' }, desc: 'Drinks the dark. Holy light is unkind in return.' },
  lanternheart: { id: 'lanternheart', name: 'Lantern Heart', kind: 'relic', slot: 'relic1', price: 7000, sell: 3500, resist: { holy: 'absorb', shadow: 'weak' }, desc: 'Drinks holy light. The dark comes looking.' },
  ninefoldcharm:{ id: 'ninefoldcharm', name: 'Ninefold Charm', kind: 'relic', slot: 'relic1', price: 0, sell: 12000, resist: { fire: 'resist', ice: 'resist', bolt: 'resist', water: 'resist', wind: 'resist', earth: 'resist' }, desc: 'Halves all six common elements. No weakness bought.' },

  // --- relics: wards against ailment --------------------------------------
  // Warding Cord covers poison, blind and silence. These cover everything it
  // does not, and the Ninth Ward covers the lot — at a price nobody charges.
  quicklimecharm:{ id: 'quicklimecharm', name: 'Quicklime Charm', kind: 'relic', slot: 'relic1', price: 1800, sell: 900, stats: { sta: 4 }, immune: ['stone'], desc: 'You will not be turned to stone while you hold it.' },
  clearwatercharm:{ id: 'clearwatercharm', name: 'Clearwater Charm', kind: 'relic', slot: 'relic1', price: 3800, sell: 1900, stats: { hp: 120 }, immune: ['poison', 'venom', 'seizure', 'blind'], desc: 'Wards poison, venom, seizure and blindness.' },
  steadyband:   { id: 'steadyband', name: 'Steady Band', kind: 'relic', slot: 'relic1', price: 3200, sell: 1600, stats: { lck: 6 }, immune: ['confuse', 'charm', 'muddle', 'berserk'], desc: 'You will keep your own mind, and your own side.' },
  wakefulcharm: { id: 'wakefulcharm', name: 'Wakeful Charm', kind: 'relic', slot: 'relic1', price: 3600, sell: 1800, stats: { spd: 4 }, immune: ['sleep', 'stop', 'paralysis', 'freeze'], desc: 'Nothing will hold your turn away from you.' },
  unbrokenoath: { id: 'unbrokenoath', name: 'Unbroken Oath', kind: 'relic', slot: 'relic1', price: 4200, sell: 2100, stats: { res: 8 }, immune: ['doom', 'zombie'], desc: 'Death may be dealt to you but not promised.' },
  ninthward:    { id: 'ninthward', name: 'The Ninth Ward', kind: 'relic', slot: 'relic1', price: 0, sell: 18000, stats: { res: 10, lck: 10 }, immune: ['stone', 'sleep', 'stop', 'paralysis', 'freeze', 'confuse', 'berserk', 'charm', 'muddle', 'poison', 'venom', 'doom', 'seizure', 'silence', 'blind', 'slow', 'zombie', 'imp'], desc: 'Every ailment there is, and it wards all of them.' },

  // --- relics: casting ----------------------------------------------------
  // `halfMP` already exists on two pieces of volume one gear, so a relic that
  // grants it is a choice about what you give up rather than a new power.
  // `oneMP` is implemented and was never granted by anything — it is here once,
  // at the far end of the game, where a mage has earned it.
  deepwellpendant:{ id: 'deepwellpendant', name: 'Deepwell Pendant', kind: 'relic', slot: 'relic1', price: 4400, sell: 2200, stats: { mp: 90, mag: 8, res: 6 }, desc: 'Cold against the breastbone. Deepens the well.' },
  attuningring: { id: 'attuningring', name: 'Attuning Ring', kind: 'relic', slot: 'relic1', price: 5200, sell: 2600, stats: { mag: 20, mp: 60 }, desc: 'Magic +20.' },
  resonantcharm:{ id: 'resonantcharm', name: 'Resonant Charm', kind: 'relic', slot: 'relic1', price: 8000, sell: 4000, effects: ['halfMP'], desc: 'Spells cost half as much to those who listen.' },
  engineheart:  { id: 'engineheart', name: 'Engine Heart', kind: 'relic', slot: 'relic1', price: 0, sell: 20000, stats: { mp: 100 }, effects: ['oneMP'], desc: 'Every spell costs one point. The Engine pays the rest.' },

  // --- relics: the rest ---------------------------------------------------
  // Utility that changes a routine rather than a number, plus the plain stat
  // relics that give the late game something to buy with its accumulated gil.
  magpiechain:  { id: 'magpiechain', name: 'Magpie Chain', kind: 'relic', slot: 'relic1', price: 5200, sell: 2600, stats: { lck: 12, spd: 4 }, effects: ['stealUp'], desc: 'Doubles the chance to pilfer, and keeps you quick.' },
  wanderersbell:{ id: 'wanderersbell', name: "Wanderer's Bell", kind: 'relic', slot: 'relic1', price: 3600, sell: 1800, stats: { spd: 4 }, effects: ['noEncounter'], desc: 'Rings too softly to hear. Wild things leave anyway.' },
  secondbreath: { id: 'secondbreath', name: 'Second Breath', kind: 'relic', slot: 'relic1', price: 12000, sell: 6000, stats: { hp: 200 }, effects: ['autoRevive'], desc: 'Revives once when felled.' },
  pilgrimsknot: { id: 'pilgrimsknot', name: "Pilgrim's Knot", kind: 'relic', slot: 'relic1', price: 3000, sell: 1500, stats: { hp: 300, sta: 10 }, desc: 'Tied at the start of a long road, untied at the end.' },
  sandglass:    { id: 'sandglass', name: 'Sand Glass', kind: 'relic', slot: 'relic1', price: 2800, sell: 1400, stats: { spd: 20 }, desc: 'Speed +20.' },
  bloodironband:{ id: 'bloodironband', name: 'Blood Iron Band', kind: 'relic', slot: 'relic1', price: 3400, sell: 1700, stats: { vig: 16, hp: 200 }, desc: 'Vigour +16.' },
  keeneyecharm: { id: 'keeneyecharm', name: 'Keen Eye Charm', kind: 'relic', slot: 'relic1', price: 3200, sell: 1600, stats: { lck: 20, eva: 8 }, desc: 'Luck +20, and a little harder to hit.' },
  wardensignet: { id: 'wardensignet', name: "Warden's Signet", kind: 'relic', slot: 'relic1', price: 4800, sell: 2400, stats: { def: 20, mdef: 20, hp: 250 }, desc: 'Armour where a ring has no business being.' },
  oathstone:    { id: 'oathstone', name: 'Oathstone', kind: 'relic', slot: 'relic1', price: 5600, sell: 2800, stats: { sta: 16, res: 12, hp: 400 }, desc: 'Heavy in the hand, and steadying with it.' },
  vagrantcharm: { id: 'vagrantcharm', name: 'Vagrant Charm', kind: 'relic', slot: 'relic1', price: 6400, sell: 3200, stats: { lck: 30, spd: 8 }, desc: 'Luck +30. He would not sell it, so someone copied it.' },
};

export const VOL2_ITEM_LIST = Object.values(VOL2_ITEMS);

/**
 * Shop inventories for the back half of the game, in the shape of `SHOPS`.
 *
 * Each is a place with an opinion. A garrison quartermaster stocks what a
 * garrison needs and nothing a mage would want; the wreckers on the coast sell
 * what washes up, which is thrown weapons and salt-cured leather. Stock lists
 * are ordered cheapest-first within a category so the buy menu reads as a
 * ladder, and every entry is a real id from `ITEMS` or `VOL2_ITEMS`.
 */
export const VOL2_SHOPS = {
  // Ferran, once the party has the run of the outpost. Requisitions handles
  // consumables; this is the rack behind it.
  ferran_armoury: {
    name: 'Marchetti Field Armoury',
    stock: ['siltroadsabre', 'wardensfalchion', 'ferranpike', 'handcrossbow', 'latchbow',
      'bandedgrips', 'brigandine', 'ferranplate', 'sallet', 'visoredhelm', 'ferranhelm',
      'ironbuckler', 'kiteshield', 'ferranbulwark'],
  },

  // The pass camp: cold, high, and stocked entirely against the weather and the
  // things living in it.
  cinderspine_camp: {
    name: 'The Pass Camp',
    stock: ['hipotion', 'fieldsuture', 'hitonic', 'thawwine', 'nervetonic', 'steadyingdram',
      'panacea', 'phoenixtear', 'springwater', 'pyreflask', 'emberward', 'frostward',
      'roadcoat', 'feltedhood', 'wayfarerhat'],
  },

  // Ashenhall's forge, relit. Katana and heavy plate, and nothing else — they
  // would consider a rod an insult.
  ashenhall_forge: {
    name: 'The Ash Forge',
    stock: ['thirdfold', 'temperedash', 'winterlong', 'bellringer', 'saltbitten',
      'boarspear', 'cairnbreakers', 'ashencuirass', 'siegeplate', 'gravehelm',
      'wardenshelm', 'ashenaegis'],
  },

  // The alcoves under the hall, where the relic trade is conducted politely and
  // without receipts.
  ashenhall_relics: {
    name: 'The Ninth Alcove',
    stock: ['sandglass', 'pilgrimsknot', 'keeneyecharm', 'bloodironband', 'quicklimecharm',
      'steadyband', 'wakefulcharm', 'wanderersbell', 'clearwatercharm', 'unbrokenoath',
      'wardensignet', 'deepwellpendant', 'attuningring', 'magpiechain'],
  },

  // Wreckers on the Drowned Coast. Everything here came out of the water, which
  // is why it is all thrown, clawed or salt-cured.
  drownedcoast_wreckers: {
    name: 'The Beachcomber',
    stock: ['throwingirons', 'vagrantdice', 'saltchakram', 'boneclaws', 'bramblehooks',
      'roadwolfclaws', 'gullkinfang', 'salvagersdirk', 'saltleathers', 'raidersjack',
      'cutpursecowl', 'tidewardshield', 'tidewardlance'],
  },

  // A hedge stall in the Weeping Wood. Cures, blessings and the two pieces of
  // gear the wood itself made.
  weepingwood_hedge: {
    name: 'The Hedge Stall',
    stock: ['balm', 'greatbalm', 'antidote', 'eyedrops', 'echoherb', 'clarity', 'softstone',
      'gravesalt', 'springwater', 'wellspringdew', 'mirrordust', 'hawksbreath',
      'greenhood', 'bramblecoat', 'bramblehooks'],
  },

  // Solmere after the Engine House opens its upper floors. The expensive shop,
  // and the only one that sells casting gear worth the name.
  solmere_highworks: {
    name: 'Marchetti Highworks',
    stock: ['xpotion', 'marrowdraught', 'deeptonic', 'deepwellflask', 'sovereignpanacea',
      'siltglassrod', 'chorusrod', 'stillglass', 'pilgrimstaff', 'ninthlanternstaff',
      'inkstonebrush', 'longlookbrush', 'chanterrobe', 'vellumvestments', 'vigilrobe',
      'archivistcap', 'chanterscirclet', 'enginecrown', 'enginemail', 'quarrelengine',
      'enginewardshield', 'resonantcharm'],
  },

  // The Reliquary at the Ninth Well. Endgame stock at endgame prices — most of
  // it is what the party has been walking past in chests all along.
  ninthwell_reliquary: {
    name: 'The Reliquary',
    stock: ['vigilbalm', 'quickeningdraught', 'phoenixember', 'sunderingcharge',
      'brokenstandard', 'vigilblade', 'enginecut', 'mourningsteel', 'stormpike',
      'siegelock', 'widowsknife', 'mountainhands', 'kilnwraps', 'frostmaulclaws',
      'resonancerod', 'stillwatergi', 'deepwellrobe', 'longlookveil', 'reliquaryshield',
      'cinderheart', 'winterheart', 'stormheart', 'gravebindings', 'lanternheart',
      'oathstone', 'vagrantcharm', 'secondbreath'],
  },
};
