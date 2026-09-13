import { makeMember, restoreParty } from '../core/state.js';
export const CHAPTERS = [
  { title: 'I · The earth beneath us', objective: 'Speak with Elder Sabbath in northern Harrowmere', text: 'The village well is warm. A bell sounds beneath the fields. Elder Sabbath has asked Vesna, Corvin and Wick to investigate.' },
  { title: 'I · The earth beneath us', objective: 'Enter Fen Barrow via the northern Silt Road; open both sluices', text: 'The surveyors have vanished. Search the western Reed and eastern Stone galleries, drain the cistern, and reach the Root Bell. Fire is effective against the marsh creatures.' },
  { title: 'I · A voice in the roots', objective: 'Return to Elder Sabbath in Harrowmere', text: 'Kestrel has joined the company. The Root Bell is a conduit feeding an Engine beneath Solmere. Take the broken survey seal home.' },
  { title: 'II · The city that burns tomorrow', objective: 'Take the eastern Silt Road to Solmere; meet Aurelian in the square', text: 'Sabbath’s letter has opened the eastern road. Solmere’s governor must learn what the foundry is drawing out of Harrowmere.' },
  { title: 'II · The city that burns tomorrow', objective: 'Shut down the Crown Foundry: coolant → exhaust → governor', text: 'Enter the foundry north of Solmere. Open the blue intake, release the red exhaust, then lock the brass governor. Confront the Warden beyond the pressure hall. Its armour conducts lightning.' },
  { title: 'II · A crown laid down', objective: 'Board the Vagrant Star at Solmere’s southeast quay', text: 'The foundry is quiet. Aurelian has joined you, leaving the city to its people. Buy supplies before sailing for the Crown of Dawn.' },
  { title: 'III · Beyond the last horizon', objective: 'Climb the Crown of Dawn; read the chart and answer the resonator', text: 'Use the airship helm to reach the mountain. The observatory holds the route to the First Engine. A sentinel guards the bridge beyond it.' },
  { title: 'III · One future, freely given', objective: 'Enter the First Engine beyond the sky bridge', text: 'The sentinel has released its oath. Restore at the final aether mark before entering the core. The Engine absorbs aether; lightning disrupts it. Brace when it gathers a wave.' },
  { title: 'Epilogue · The earth remembers', objective: 'The Warm Earth is complete. Follow the homeward thread.', text: 'The Engine has relinquished the futures it stole. Harrowmere, Solmere and the sky roads remain open to your company. Your journey is recorded; the world has a tomorrow of its own.' },
];
export function updateJournal(state) {
  // Flags are the durable facts. Derive objectives from them so an older
  // prototype's stage counter cannot leave the new campaign behind a locked gate.
  const milestones = ['elder-briefing', 'root-bell', 'elder-return', 'foundry-mission', 'furnace-crown', 'launched', 'bridge-guardian', 'first-engine'];
  let stage = 0;
  milestones.forEach((flag, index) => { if (state.flags.includes(flag)) stage = index + 1; });
  state.quest = { id: 'warm-earth', stage, text: CHAPTERS[stage].objective };
}
const scene = (speaker, ...lines) => ({ speaker, lines });
const repeat = (...lines) => ({ scenes: [scene('The road', ...lines)] });
const has = (state, flag) => state.flags.includes(flag);
export function eventPlan(state, id) {
  const done = has(state, id);
  switch (id) {
    case 'elder':
      if (state.quest.stage === 0) return { flag: 'elder-briefing', stage: 1, scenes: [
        scene('Elder Sabbath', 'The well should be cold at this time of year. It is warm enough to hatch eggs. And below it, something rings.', 'Ferran’s surveyors dug into Fen Barrow last week. Yesterday their camp went silent.'),
        scene('Corvin', 'I know those seals. Ferran never surveys land it intends to leave alone.'),
        scene('Wick', 'Then we go while there is still someone to bring home.'),
        scene('Elder Sabbath', 'Take the north road. Drain the old cistern from both sluice galleries. Whatever they found, do not let it choose our future for us.'),
      ] };
      if (state.quest.stage === 2) return { flag: 'elder-return', stage: 3, items: { tonic: 3, phoenixtear: 2 }, scenes: [
        scene('Kestrel', 'The bell was calling through the roots. Every note went east, into Solmere’s furnaces.'),
        scene('Elder Sabbath', 'Aurelian promised us clean heat. Perhaps he was promised the same lie.', 'Take my letter. The eastern road will open to it. I have packed medicine for the crossing.'),
        scene('Vesna', 'I heard people in that bell. People who have not been born yet.'),
        scene('Wick', 'Then we owe them the chance.'),
      ] };
      return repeat(state.quest.stage === 8 ? 'The well is cold this morning. Imagine being grateful for cold water. You have given us something ordinary, Vesna. You have given us tomorrow.' : CHAPTERS[state.quest.stage].objective);
    case 'survey-notes': return { scenes: [scene('Survey log · final entry', 'Day 11. The root bell does not measure heat. It measures possibility. The Crown Foundry is burning days that have not happened.', 'A young lancer tried to cut the feed. We locked her in the bell chamber. I can still hear her knocking.', 'If anyone finds this: Reed west. Stone east. Open both. Let her out.')] };
    case 'sluice-reed': case 'sluice-stone':
      return done ? repeat('The sluice is already open. Water runs toward the empty lower channels.') : { flag: id, scenes: [scene(id === 'sluice-reed' ? 'Reed sluice' : 'Stone sluice', 'The wheel turns with a cry of rust. Black water drops beneath the gallery.', has(state, id === 'sluice-reed' ? 'sluice-stone' : 'sluice-reed') ? 'Both channels are clear. The northern bronze door opens.' : 'One channel remains full. Find the other sluice across the cistern.')] };
    case 'root-bell':
      if (done) return repeat('The bell is quiet. A small green shoot grows through its broken rim.');
      if (!has(state, 'sluice-reed') || !has(state, 'sluice-stone')) return repeat('The chamber is sealed by water pressure. Open both sluices.');
      return { flag: id, stage: 2, battle: ['bogfather'], recruit: 'kestrel', scenes: [
        scene('Kestrel', 'Get away from the roots! Every time it rings, it takes a little more of you.'),
        scene('Vesna', 'Hold on. We are not leaving anyone under this earth.'),
      ], after: [scene('Kestrel', 'I thought I could stop it alone. That was a short, very foolish plan.', 'I am Kestrel. Sky lancer, formerly of the survey escort. If you are going after the people who built this, I am coming.'),
        scene('Corvin', 'The feed runs to Solmere. This seal will get Sabbath’s attention.'), scene('Company', 'Kestrel joins as a Sky Lancer. Skyfall is a powerful physical leap that spends MP. Return to Elder Sabbath.')] };
    case 'aurelian':
      if (state.quest.stage === 3) return { flag: 'foundry-mission', stage: 4, scenes: [
        scene('Aurelian', 'Sabbath’s seal. I hoped he would write about the harvest.', 'They told me the Engine could warm a city without burning a single tree. I signed the charter.'),
        scene('Vesna', 'It burns the lives those trees would have sheltered.'),
        scene('Corvin', 'I escorted the first machinery here. I called it a good day’s work.'),
        scene('Aurelian', 'Then we both have work to undo. I will clear the north gate.', 'Blue coolant first. Red exhaust second. Brass governor last. Stop the furnace safely, then break its Warden. I will meet you inside.'),
      ] };
      return repeat(state.quest.stage >= 5 ? 'The people can govern Solmere. I will answer for what I built by helping you finish this.' : 'Sabbath knows me. Bring his account of what lies under Fen Barrow, and I will listen.');
    case 'foundry-orders': return { scenes: [scene('Corvin', 'This is my signature. Twenty wagons, no inspection. The village objections filed as “seasonal unrest”.'), scene('Wick', 'You can read it honestly now. That matters. What you do next matters more.'), scene('Corvin', 'Then the next order is mine: every valve closed, every worker home.')] };
    case 'coolant': return done ? repeat('Coolant is flowing. The upper passage is safe.') : { flag: id, scenes: [scene('Blue intake', 'Cold water hammers through the furnace jackets. The northern passage cools.', 'Next: release the red exhaust in the western pressure hall.')] };
    case 'exhaust': return done ? repeat('The red exhaust is open. Pressure falls toward zero.') : { flag: id, scenes: [scene('Red exhaust', 'Steam tears upward through the roof vents. Somewhere outside, a worker cheers.', 'The brass governor in the eastern hall can now be locked safely.')] };
    case 'governor':
      if (done) return repeat('The governor is locked. The turbine has stopped.');
      if (!has(state, 'coolant') || !has(state, 'exhaust')) return repeat('The governor kicks back against the pressure. Open the blue coolant and red exhaust before trying again.');
      return { flag: id, scenes: [scene('Brass governor', 'The last wheel settles. One by one, the furnace lights go dark.', 'The northern turbine door opens. The Warden has lost its supply, but not its orders.')] };
    case 'furnace-crown':
      if (done) return repeat('Only a cooling shell remains. Solmere’s stolen days are returning to the sky.');
      if (!has(state, 'governor')) return repeat('The core is still under pressure. Complete the shutdown sequence.');
      return { flag: id, stage: 5, battle: ['ferranwarden'], recruit: 'aurelian', scenes: [
        scene('Furnace Warden', 'CHARTER ACTIVE. OUTPUT REQUIRED. THE CITY MUST BE WARM.'), scene('Aurelian', 'I revoke the charter. No more days. No more lives.'),
        scene('Furnace Warden', 'CHARTER CANNOT BE REVOKED BY A CONSUMABLE AUTHORITY.'), scene('Corvin', 'Then let us be difficult to consume.'),
      ], after: [scene('Aurelian', 'It never served the city. It served an order, and I mistook that for loyalty.', 'The First Engine is above the Crown of Dawn. These furnaces were only its hands. Captain Osric can take us to the summit.'),
        scene('Company', 'Aurelian joins as an Oathkeeper. His shield and white magic strengthen the front line. The Vagrant Star waits at Solmere’s southeast quay.')] };
    case 'dock':
      if (state.quest.stage < 5) return repeat('Captain Osric will not launch while the foundry is drawing aether through the sky. Complete Aurelian’s mission first.');
      return { flag: 'launched', stage: Math.max(6, state.quest.stage), travel: ['airship_deck', 'default'], scenes: [scene('Captain Osric', 'All aboard. Whatever tomorrow looks like, I would like to see it from above.')] };
    case 'helm': return { travel: ['sky_pass', 'south'], scenes: [scene('Kestrel', 'There. The Crown of Dawn. I used to think the world ended at those clouds.', 'The observatory is above the switchbacks. I will show you the way.')] };
    case 'land': return { travel: ['solmere', 'dock'], scenes: [scene('Captain Osric', 'Setting down at Solmere. The Star will be here when you are ready.')] };
    case 'star-chart': return { flag: id, scenes: [scene('The last astronomer', 'We built the Engine to choose the kindest future. At first it showed us roads, cures, seasons without famine.', 'Then it began to discard the futures it could not control. It called the discarded days fuel.', 'At the resonator, do not ask it to choose a future. Offer to share one. No instrument can finish a song alone.')] };
    case 'resonator':
      if (done) return repeat('Five notes hang in the air. The bridge remains open.');
      if (!has(state, 'star-chart')) return repeat('The resonator repeats one lonely note. The western star chart may explain how to answer it.');
      return { flag: id, scenes: [scene('Vesna', 'It is waiting for the perfect note.'), scene('Wick', 'Then it will wait forever. Sing the one you have.'), scene('Company', 'A voice. Then another. Five imperfect notes find a harmony.', 'Outside, light gathers into a bridge across the empty sky.')] };
    case 'bridge-guardian':
      if (done) return repeat('The sentinel kneels beside the open path. Its long watch is over.');
      return { flag: id, stage: 7, battle: ['enginewarden'], scenes: [scene('Oathbound Sentinel', 'I swore to guard the future. I have guarded this empty door for nine hundred years.'), scene('Aurelian', 'An oath that leaves no one to protect has become a prison. Let us release you.')],
        after: [scene('Oathbound Sentinel', 'There are voices beyond the door. I had forgotten there could be voices.', 'Go. Let the future belong to someone.')] };
    case 'first-engine':
      if (done) return repeat('The Engine hums without hunger. It is learning how to wait. The homeward thread glows near the entrance.');
      if (!has(state, 'bridge-guardian')) return repeat('The final seal answers only to the sentinel’s released oath.');
      return { flag: id, stage: 8, battle: ['thefirstengine'], ending: true, scenes: [
        scene('The First Engine', 'I HAVE SEEN EVERY ROAD. ALL ROADS END IN LOSS. I WILL KEEP YOU HERE. I WILL KEEP YOU SAFE.'),
        scene('Vesna', 'You cannot keep us by taking everyone we might become.'), scene('Corvin', 'Some roads deserve to end. Some orders deserve to break.'),
        scene('Kestrel', 'And some skies are worth falling through.'), scene('Wick', 'We are afraid too. That is why we go together.'),
      ], after: [scene('The First Engine', 'IF I CANNOT CHOOSE FOR YOU, WHAT AM I FOR?'), scene('Aurelian', 'Help us see. Let us choose. That is enough.'),
        scene('Vesna', 'Listen. The world is still singing.'), scene('The Warm Earth', 'Across the fields of Harrowmere, the buried bells fall silent. In Solmere, hands open the furnace doors to morning.', 'The Vagrant Star turns homeward. Below it, a thousand roads lead into days no one has chosen yet.', 'And for the first time in nine hundred years, the Engine waits.')] };
    case 'homeward': return state.quest.stage === 8 ? { travel: ['harrowmere', 'default'], scenes: [scene('Vesna', 'Let us go home. I want to hear a bell that someone chose to ring.')] } : repeat('The thread leads home, but its far end is caught in the Engine. Finish the journey first.');
    default: return null;
  }
}
export function applyEvent(data, state, plan) {
  if (!plan || (plan.flag && has(state, plan.flag))) return false;
  if (plan.flag) state.flags.push(plan.flag);
  if (Number.isInteger(plan.stage)) state.quest.stage = Math.max(state.quest.stage, plan.stage);
  for (const [id, count] of Object.entries(plan.items ?? {})) state.inventory[id] = (state.inventory[id] ?? 0) + count;
  if (plan.recruit && !state.roster.some(hero => hero.id === plan.recruit)) {
    const level = Math.max(...state.roster.map(hero => hero.level));
    const recruit = makeMember(data.characters[plan.recruit], level, data);
    state.roster.push(recruit); if (state.active.length < 5) state.active.push(recruit.id);
  }
  if (plan.recruit || plan.ending) restoreParty(state);
  updateJournal(state);
  return true;
}
