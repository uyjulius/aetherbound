/**
 * Items and equipment, volume three: the airship country.
 *
 * Volume two closed at Sundersong (168 attack), Deepward Plate (130 defence)
 * and the Ninth Ward. This volume equips the six regions of `enemies-vol4.js`
 * — the places that were always on the map and never on the road — and it is
 * written against two facts about the engine that volume two did not have.
 *
 * FIRST, AND IT CHANGES EVERYTHING: `DEFENCE_CAP` is 200.
 *
 * `physicalDamage` and `magicDamage` both clamp the divisor at 200 out of 256
 * before they use it. A party member's defence is `floor(stamina × 0.7)` plus
 * the sum of every worn `def`, and by the sixties stamina alone is most of the
 * way there — Warden Mail and a helm finish the job twice over. Every point of
 * defence past two hundred is therefore worth exactly nothing, and so is every
 * point of magic defence. Volume two already suspected this and slowed its
 * armour down; volume three stops pretending. Nothing here is sold on its
 * defence. The armour in this file buys hit points, evasion, immunities and
 * elemental affinity — the four things that are still honest — and its defence
 * numbers exist to keep the line looking like a line.
 *
 * Evasion in particular is now the real currency: `hitChance` is
 * `accuracy − targetEvade` with a floor of two per cent and no cap above it,
 * so evasion is the only defensive stat in the game that never saturates. It
 * is priced accordingly and handed out in small pieces.
 *
 * SECOND: THE ELEMENT ON A WEAPON IS A LIABILITY YOU CARRY EVERY SWING.
 *
 * `doAttack` reads `actor.weapon.element` on an ordinary attack, not just on a
 * named move, so an elemental weapon applies its element to every blow the
 * character ever throws. Against something that absorbs it, the party's best
 * sword is a healing item. The four strongest weapons in volumes one and two
 * are aether — and the Engine at the end of the world drinks aether. That is
 * the best-authored decision in the existing gear and this file keeps it:
 *
 *   Quenchbrand (fire) is eight attack above Oathcut (none). The Temper drinks
 *   fire. Quench Gauntlets (bolt) sit twelve above Blooding Wraps (none). The
 *   Cold Forge drinks lightning. Withering Claws (shadow) are twelve above
 *   Brood Claws (none), and half of the Kindly Ground drinks shadow.
 *
 * Every weapon line here therefore has two rungs: an elemental top and a plain
 * one a hair below it, and the plain one is the one you can buy. A party that
 * equips on raw attack alone will walk into the Quench and heal it.
 *
 * ---------------------------------------------------------------------------
 *
 * `effects` audit, re-run against the tree rather than inherited from volume
 * two's header, because the tree has moved. Only these strings do anything:
 *
 *   halfMP       spells.js  spellCost            — any equipment slot
 *   oneMP        spells.js  spellCost            — any equipment slot
 *   autoRevive   battle.js  killCombatant        — any equipment slot
 *   stealUp      battle.js  doSteal              — any equipment slot
 *   noEncounter  party.js   hasEncounterWard     — any equipment slot
 *   autoReflect  battle.js  enter                — any equipment slot
 *   dualWield    battle.js  doAttack             — any equipment slot
 *   doubleCast   battle.js  doSpell              — any equipment slot
 *   stealOnHit   battle.js  _stealOnHit          — any equipment slot
 *   reachBack    battle.js  doAttack             — WEAPON SLOT ONLY
 *   critUp       battle.js  resolvePhysical      — WEAPON SLOT ONLY
 *
 * Four of those — `autoReflect`, `dualWield`, `doubleCast` and `stealOnHit` —
 * were declared dead in volume two's header and have since been implemented in
 * `battle.js`. They are alive, they are read off any slot, and this file uses
 * them. `fastField` is still read by nothing at all and is still not continued.
 *
 * `reachBack` and `critUp` are read off `actor.weapon` specifically. On a
 * relic or a shield they would be a lie printed on a price tag, so they appear
 * on weapons only, exactly as in volume two.
 *
 * The other three behaviour fields are read straight off the item: `element`
 * (doAttack), `immune` (PartyCombatant), and `resist` (the affinity getter).
 *
 * ---------------------------------------------------------------------------
 *
 * Pricing continues volume two's observed shape: weapons ≈ 0.5 × atk², with a
 * premium of about a quarter on daggers and thrown weapons because they buy
 * speed and luck as well; casting gear ≈ 6.25 × mag²; armour ≈ 0.7 × def² plus
 * a premium for immunities and affinity. `sell` is exactly half of `price`.
 * Anything priced 0 is not sold anywhere — it is a chest or a boss reward, and
 * its `sell` carries the notional valuation instead, the way Sundersong's and
 * the Ninth Ward's already do. Nothing priced 0 may appear in a shop: the buy
 * menu compares gold against `price`, so a zero-priced entry on a shelf is
 * free.
 */

export const VOL3_ITEMS = {
  // --- consumables --------------------------------------------------------
  // Five, and each one fills a hole rather than adding a rung for its own
  // sake. The healing pair keeps volume two's ratios (about 1.7 HP per gil
  // single-target, about 0.5 party-wide, because a party-wide heal is four
  // heals in one turn and the turn is the expensive part).
  marrowichor:  { id: 'marrowichor', name: 'Marrow Ichor', kind: 'consumable', price: 5200, sell: 2600, target: 'oneAlly', effect: { heal: 9000 }, desc: 'Restores 9000 HP.' },
  kindlybalm:   { id: 'kindlybalm', name: 'Kindly Balm', kind: 'consumable', price: 6000, sell: 3000, target: 'allAllies', effect: { heal: 3000 }, desc: 'Restores 3000 HP to all allies.' },
  // Protect, Shell and Regen in one bottle, for the character who cannot
  // afford three turns of setting up and is going to be hit for all three.
  stillwaterdram:{ id: 'stillwaterdram', name: 'Still Water Dram', kind: 'consumable', price: 3000, sell: 1500, target: 'oneAlly', effect: { status: { protect: 100, shell: 100, regen: 100 } }, desc: 'Guards body, mind and blood at once.' },
  // Haste and a sharpened eye together: the Overwind's answer in a bottle for
  // a party that never learned Quicken All.
  overwinddraught:{ id: 'overwinddraught', name: 'Overwind Draught', kind: 'consumable', price: 4200, sell: 2100, target: 'allAllies', effect: { status: { haste: 100, critUp: 100 } }, desc: 'Hastes and sharpens the whole party.' },
  // The only wide charge in the game with no element on it, which is the whole
  // point: the Quench absorbs everything else.
  quenchcharge: { id: 'quenchcharge', name: 'Quench Charge', kind: 'consumable', price: 5600, sell: 2800, target: 'allEnemies', effect: { damage: 1600 }, desc: 'Ruinous damage to all foes. Nothing drinks it.' },

  // --- weapons: swords ----------------------------------------------------
  // Six of the cast take a sword, so this is where the elemental argument has
  // to be clearest. Oathcut is the plain rung and the one on a shelf;
  // Quenchbrand is twelve attack better and will heal three of the six things
  // it was bought to kill.
  oathcut:      { id: 'oathcut', name: 'Oathcut', kind: 'weapon', type: 'sword', slot: 'weapon', price: 17600, sell: 8800, stats: { atk: 188, vig: 8, sta: 6 }, effects: ['critUp'], desc: 'No element, no temper, no argument. It simply cuts.' },
  quenchbrand:  { id: 'quenchbrand', name: 'Quenchbrand', kind: 'weapon', type: 'sword', slot: 'weapon', price: 0, sell: 20000, stats: { atk: 200, vig: 8, mag: 10 }, element: 'fire', desc: 'Drawn out of the pit still orange. It never went cold.' },

  // --- weapons: daggers ---------------------------------------------------
  // Gainsay Knife brings `stealOnHit` back: volume two buried the effect as
  // unimplemented and battle.js has since grown a reader for it, so a knife
  // that pickpockets on a connecting blow works again.
  gainsayknife: { id: 'gainsayknife', name: 'Gainsay Knife', kind: 'weapon', type: 'dagger', slot: 'weapon', price: 11400, sell: 5700, stats: { atk: 132, spd: 14, lck: 18 }, effects: ['stealOnHit'], desc: 'Argues with a pocket and generally wins.' },
  broodfang:    { id: 'broodfang', name: 'Brood Fang', kind: 'weapon', type: 'dagger', slot: 'weapon', price: 0, sell: 13500, stats: { atk: 144, spd: 16, lck: 12 }, element: 'poison', effects: ['critUp'], desc: 'Pulled from an acre widow. It is still wet.' },

  // --- weapons: katana ----------------------------------------------------
  harrowfold:   { id: 'harrowfold', name: 'The Harrow Fold', kind: 'weapon', type: 'katana', slot: 'weapon', price: 14800, sell: 7400, stats: { atk: 172, spd: 8, vig: 6 }, desc: 'Folded over a field instead of a forge. It took.' },
  stillfold:    { id: 'stillfold', name: 'The Still Fold', kind: 'weapon', type: 'katana', slot: 'weapon', price: 0, sell: 17000, stats: { atk: 184, spd: 8 }, element: 'ice', effects: ['critUp'], desc: 'Cold enough that the scabbard sweats in summer.' },

  // --- weapons: spears ----------------------------------------------------
  // `reachBack` throughout, or it is not a spear.
  overwindlance:{ id: 'overwindlance', name: 'Overwind Lance', kind: 'weapon', type: 'spear', slot: 'weapon', price: 13400, sell: 6700, stats: { atk: 164, spd: 8, sta: 6 }, effects: ['reachBack'], desc: 'Light in the hand and quick out of it. Reaches from the back row.' },
  quenchlance:  { id: 'quenchlance', name: 'Quench Lance', kind: 'weapon', type: 'spear', slot: 'weapon', price: 0, sell: 15500, stats: { atk: 176, vig: 8 }, element: 'water', effects: ['reachBack'], desc: 'Tempered in the slaking pit and never quite dried.' },

  // --- weapons: crossbows -------------------------------------------------
  ironhail:     { id: 'ironhail', name: 'Ironhail', kind: 'weapon', type: 'crossbow', slot: 'weapon', price: 11600, sell: 5800, stats: { atk: 152, sta: 6, lck: 6 }, effects: ['reachBack', 'critUp'], desc: 'Six bolts in the box and a crank that never jams.' },

  // --- weapons: fists -----------------------------------------------------
  bloodingwraps:{ id: 'bloodingwraps', name: 'Blooding Wraps', kind: 'weapon', type: 'fist', slot: 'weapon', price: 14200, sell: 7100, stats: { atk: 168, vig: 12 }, effects: ['critUp'], desc: 'Bound in the yards, by someone who had stopped counting.' },
  quenchgauntlets:{ id: 'quenchgauntlets', name: 'Quench Gauntlets', kind: 'weapon', type: 'fist', slot: 'weapon', price: 0, sell: 16200, stats: { atk: 180, vig: 10, spd: 4 }, element: 'bolt', desc: 'The knuckles arc when you make a fist. They cannot help it.' },

  // --- weapons: claws -----------------------------------------------------
  broodclaws:   { id: 'broodclaws', name: 'Brood Claws', kind: 'weapon', type: 'claw', slot: 'weapon', price: 11300, sell: 5650, stats: { atk: 150, spd: 12, lck: 8 }, effects: ['critUp'], desc: 'Eight of them came off one thing. She kept the best four.' },
  witheringclaws:{ id: 'witheringclaws', name: 'Withering Claws', kind: 'weapon', type: 'claw', slot: 'weapon', price: 0, sell: 14000, stats: { atk: 162, spd: 14 }, element: 'shadow', desc: 'What they open does not close. The Kindly Ground drinks it.' },

  // --- weapons: thrown ----------------------------------------------------
  wagerstones:  { id: 'wagerstones', name: 'Wager Stones', kind: 'weapon', type: 'thrown', slot: 'weapon', price: 11900, sell: 5950, stats: { atk: 138, spd: 8, lck: 26 }, effects: ['reachBack'], desc: 'Nine of them, and he will tell you which is which.' },
  overwindchakram:{ id: 'overwindchakram', name: 'Overwind Chakram', kind: 'weapon', type: 'thrown', slot: 'weapon', price: 0, sell: 14000, stats: { atk: 150, spd: 14, lck: 10 }, element: 'wind', effects: ['reachBack', 'critUp'], desc: 'It comes back before you have finished throwing it.' },

  // --- weapons: rods, staves, brushes -------------------------------------
  // Casting gear is priced off magic, so a rod at 48 costs what a sword at 170
  // does. The top of each line carries `halfMP`, matching Aetherglass,
  // Aetherweave and the Resonance Rod.
  hollowglass:  { id: 'hollowglass', name: 'Hollowglass Rod', kind: 'weapon', type: 'rod', slot: 'weapon', price: 14400, sell: 7200, stats: { atk: 30, mag: 48, res: 14, mp: 50 }, desc: 'Blown around nothing at all, very carefully.' },
  overwindrod:  { id: 'overwindrod', name: 'Overwind Rod', kind: 'weapon', type: 'rod', slot: 'weapon', price: 0, sell: 19600, stats: { atk: 32, mag: 56, res: 16, mp: 60, spd: 6 }, effects: ['halfMP'], desc: 'The spell is out before the word is finished.' },
  kindlystaff:  { id: 'kindlystaff', name: 'The Kindly Staff', kind: 'weapon', type: 'staff', slot: 'weapon', price: 18200, sell: 9100, stats: { atk: 36, mag: 54, res: 24, mp: 70 }, effects: ['halfMP'], desc: 'Carried at the head of a great many small funerals.' },
  thelongargument:{ id: 'thelongargument', name: 'The Long Argument', kind: 'weapon', type: 'brush', slot: 'weapon', price: 16900, sell: 8450, stats: { atk: 32, mag: 52, lck: 20, mp: 56 }, effects: ['halfMP'], desc: 'Two hundred pages of it, and she has read them all.' },

  // --- armour: light bodies -----------------------------------------------
  // Defence here is decoration and the file says so. What these actually sell
  // is evasion, hit points and one immunity apiece.
  broodleathers:{ id: 'broodleathers', name: 'Brood Leathers', kind: 'armor', type: 'lightArmor', slot: 'body', price: 8200, sell: 4100, stats: { def: 96, hp: 620, eva: 16, spd: 4 }, immune: ['venom', 'seizure'], desc: 'Chitin, boiled and lapped. Nothing it lets through festers.' },
  overwindcoat: { id: 'overwindcoat', name: 'Overwind Coat', kind: 'armor', type: 'lightArmor', slot: 'body', price: 7400, sell: 3700, stats: { def: 92, hp: 560, eva: 22, spd: 8 }, desc: 'Cut so short it barely is one. You will not be caught in it.' },

  // --- armour: heavy bodies -----------------------------------------------
  bloodingplate:{ id: 'bloodingplate', name: 'Blooding Plate', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 0, sell: 15000, stats: { def: 138, mdef: 60, hp: 1100, sta: 14, spd: -3 }, immune: ['berserk', 'confuse'], desc: 'Worn by a man who could not be goaded, and was, once.' },
  quenchmail:   { id: 'quenchmail', name: 'Quench Mail', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 14000, sell: 7000, stats: { def: 134, mdef: 80, hp: 950, sta: 12, spd: -2 }, resist: { fire: 'resist', water: 'resist' }, desc: 'Taken in and out of the pit until it stopped minding either.' },

  // --- armour: robes ------------------------------------------------------
  answeringrobe:{ id: 'answeringrobe', name: 'Answering Robe', kind: 'armor', type: 'robe', slot: 'body', price: 15000, sell: 7500, stats: { def: 78, mdef: 98, mp: 140, mag: 18, res: 16 }, resist: { shadow: 'resist', aether: 'resist' }, desc: 'Whatever is said to it, it has already said back.' },
  kindlyvestment:{ id: 'kindlyvestment', name: 'Kindly Vestment', kind: 'armor', type: 'robe', slot: 'body', price: 0, sell: 18000, stats: { def: 80, mdef: 106, mp: 160, mag: 20, res: 20 }, immune: ['zombie', 'doom'], desc: 'The ground cannot tell you are alive. This tells it.' },

  // --- armour: hats -------------------------------------------------------
  broodveil:    { id: 'broodveil', name: 'Brood Veil', kind: 'armor', type: 'hat', slot: 'head', price: 8600, sell: 4300, stats: { def: 38, mdef: 70, mp: 90, mag: 16, lck: 12 }, immune: ['poison', 'venom', 'blind'], desc: 'Fine mesh, doubled. Nothing lands on you and nothing lands in your eye.' },
  overwindcowl: { id: 'overwindcowl', name: 'Overwind Cowl', kind: 'armor', type: 'hat', slot: 'head', price: 6400, sell: 3200, stats: { def: 36, mdef: 58, spd: 8, eva: 16, lck: 14 }, desc: 'Weighted at the hem so it does not go over your eyes.' },

  // --- armour: helms ------------------------------------------------------
  bloodinghelm: { id: 'bloodinghelm', name: 'Blooding Helm', kind: 'armor', type: 'helm', slot: 'head', price: 10000, sell: 5000, stats: { def: 66, mdef: 56, hp: 480, sta: 10 }, immune: ['berserk', 'charm', 'muddle'], desc: 'Blinkered like a plough horse, and for the same reason.' },
  quenchcrown:  { id: 'quenchcrown', name: 'Quench Crown', kind: 'armor', type: 'helm', slot: 'head', price: 0, sell: 13000, stats: { def: 64, mdef: 70, hp: 440, res: 12 }, resist: { fire: 'resist', ice: 'resist', bolt: 'resist' }, desc: 'A band of three metals that disagree about temperature.' },

  // --- shields ------------------------------------------------------------
  // The Answering Shield is the second piece in the game to carry
  // `autoReflect`, and the effect cuts both ways as it always has: your own
  // healer's spells bounce off you too.
  answeringshield:{ id: 'answeringshield', name: 'Answering Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 0, sell: 16000, stats: { def: 74, mdef: 66, hp: 300, eva: 20 }, effects: ['autoReflect'], desc: 'Everything said to it comes back the way it came.' },
  quenchward:   { id: 'quenchward', name: 'Quench Ward', kind: 'armor', type: 'shield', slot: 'offhand', price: 12000, sell: 6000, stats: { def: 70, mdef: 78, eva: 16, res: 12 }, resist: { water: 'absorb', bolt: 'weak' }, desc: 'Drinks the sea. Do not hold it up in a storm.' },

  // --- relics: the effects volume two thought were dead --------------------
  // All four have readers in battle.js now. Twin Fang and Earnest Charm keep
  // their rungs; these are the later, dearer versions with a stat attached.
  bothhands:    { id: 'bothhands', name: 'Both Hands', kind: 'relic', slot: 'relic1', price: 0, sell: 12000, stats: { vig: 10 }, effects: ['dualWield'], desc: 'A weapon in each. The second swing lands softer.' },
  echostone:    { id: 'echostone', name: 'Echo Stone', kind: 'relic', slot: 'relic1', price: 0, sell: 13000, stats: { mag: 12, mp: 60 }, effects: ['doubleCast'], desc: 'Says everything twice, and means it both times.' },
  ledgerofsmalldebts:{ id: 'ledgerofsmalldebts', name: 'Ledger of Small Debts', kind: 'relic', slot: 'relic1', price: 7000, sell: 3500, stats: { lck: 16 }, effects: ['stealOnHit', 'stealUp'], desc: 'Every blow is entered against them, and collected.' },
  answeringmirror:{ id: 'answeringmirror', name: 'Answering Mirror', kind: 'relic', slot: 'relic1', price: 0, sell: 14000, stats: { res: 10 }, effects: ['autoReflect'], desc: 'You stand in a Reflect you did not cast, all fight, always.' },

  // --- relics: elemental hearts, completed ---------------------------------
  // Volume two bought fire, ice, lightning, shadow and holy. These are the
  // three pairings it left: an absorption for a matching weakness, still the
  // most interesting purchase in the game because it is a plan, not an upgrade.
  tideheart:    { id: 'tideheart', name: 'Tide Heart', kind: 'relic', slot: 'relic1', price: 6000, sell: 3000, resist: { water: 'absorb', bolt: 'weak' }, desc: 'Drinks the sea. Lightning goes looking for you in it.' },
  stoneheart:   { id: 'stoneheart', name: 'Stone Heart', kind: 'relic', slot: 'relic1', price: 6000, sell: 3000, resist: { earth: 'absorb', wind: 'weak' }, desc: 'Drinks the ground. The open air is unkind after that.' },
  wellheart:    { id: 'wellheart', name: 'Well Heart', kind: 'relic', slot: 'relic1', price: 0, sell: 9000, resist: { aether: 'absorb', holy: 'weak' }, desc: 'Drinks what the Well gives off. Lantern light burns twice.' },

  // --- relics: the rest ---------------------------------------------------
  // Instant death is the one thing nothing in the game wards, which makes
  // Severance a coin-flip nobody can plan around. The Knot fixes that.
  gravewardknot:{ id: 'gravewardknot', name: 'Graveward Knot', kind: 'relic', slot: 'relic1', price: 8800, sell: 4400, stats: { hp: 300, res: 8 }, immune: ['ko', 'zombie', 'doom'], desc: 'Death may still be dealt to you. It may not be declared.' },
  overwindband: { id: 'overwindband', name: 'Overwind Band', kind: 'relic', slot: 'relic1', price: 5200, sell: 2600, stats: { spd: 34 }, desc: 'Speed +34. Wound past the stop, and left there.' },
};

export const VOL3_ITEM_LIST = Object.values(VOL3_ITEMS);

/**
 * Shops, in the shape of `SHOPS`.
 *
 * Six, one to a region, and each is a place with an opinion about what the
 * country outside its door does to people. The sutler in the yards sells
 * nothing a mage would want and everything a man who has stopped being able to
 * choose his own target needs; the almoner sells grave goods and the two
 * things that keep a body from forgetting it is alive; the yard at the Quench
 * sells wards and hearts and not one elemental weapon.
 *
 * Stock is ordered cheapest-first within a category so the buy menu reads as a
 * ladder, every entry is a real id from `ITEMS`, `VOL2_ITEMS` or above, and no
 * entry is priced 0 — the buy menu tests gold against `price`, so a chest
 * reward on a shelf would be free.
 */
export const VOL3_SHOPS = {
  // The Blooding Yards. A sutler's wagon parked where the pens used to end,
  // stocked entirely against losing your temper and your turn with it.
  bloodingyards_sutler: {
    name: "The Sutler's Wagon",
    stock: ['steadyingdram', 'nervetonic', 'hipotion', 'panacea', 'fieldsuture', 'stillwaterdram',
      'bloodingwraps', 'oathcut', 'ferranplate', 'bloodinghelm',
      'pilgrimsknot', 'steadyband', 'bloodironband'],
  },

  // The Kindly Ground. The almoner keeps the burial fund and, since the ground
  // started giving things back, a shelf of things that argue with it.
  kindlyground_almoner: {
    name: 'The Almoner',
    stock: ['gravesalt', 'phoenixtear', 'greatbalm', 'sovereignpanacea', 'phoenixember', 'kindlybalm',
      'gravehelm', 'vigilrobe', 'answeringrobe',
      'unbrokenoath', 'gravewardknot'],
  },

  // The Gainsay. A pawnbroker who will argue with you about the price of a
  // thing you are trying to give him, and win. Knives, cowls and light fingers.
  gainsay_exchange: {
    name: 'The Gainsay Exchange',
    stock: ['eyedrops', 'echoherb', 'clarity', 'hitonic',
      'gainsayknife', 'wagerstones', 'hollowglass',
      'cutpursecowl', 'raidersjack', 'overwindcowl',
      'keeneyecharm', 'magpiechain', 'vagrantcharm', 'ledgerofsmalldebts'],
  },

  // The Brood Acre. A hedge apiary that gave up on bees. Everything on the
  // counter hits more than one thing, because everything outside comes in fours.
  broodacre_apiary: {
    name: 'The Apiary',
    stock: ['emberflask', 'frostflask', 'stormflask', 'galeflask', 'pyreflask', 'sunderingcharge',
      'quenchcharge', 'kindlybalm',
      'broodclaws', 'bramblecoat', 'broodleathers', 'broodveil', 'clearwatercharm'],
  },

  // The Quench. A cooling yard the Engines left running. It sells wards,
  // hearts and plain steel, and it will not stock an elemental weapon at any
  // price, on the grounds that the last party through here fed the pit.
  quench_yard: {
    name: 'The Quench Yard',
    stock: ['lanternoil', 'ironhail', 'harrowfold', 'thelongargument',
      'ashenaegis', 'enginewardshield', 'quenchward', 'quenchmail',
      'emberward', 'frostward', 'stormward',
      'cinderheart', 'winterheart', 'stormheart', 'tideheart', 'stoneheart'],
  },

  // The Overwind. A relay post on the only road that is still faster than the
  // things beside it. Everything here is about getting a turn.
  overwind_relay: {
    name: 'The Overwind Relay',
    stock: ['xpotion', 'deeptonic', 'quickeningdraught', 'deepwellflask', 'overwinddraught', 'marrowichor',
      'overwindlance', 'kindlystaff',
      'longlookveil', 'overwindcoat', 'stillwatergi',
      'sandglass', 'wakefulcharm', 'overwindband', 'oathstone'],
  },
};
