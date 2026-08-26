# Character models

Two kinds of model live here, and they are not the same claim.

## The party: generated for this game

The fourteen playable characters were made here, from their own entries in the
character table — build, height, hair and every garment colour. A concept view
from **FLUX.1-schnell**, reconstructed by **Hunyuan3D-2.1**, then cleaned,
rigged and animated by the scripts in `tools/`: `genconcept.mjs`, `isolate.mjs`,
`genmesh.mjs` and `blender/rig_character.py`. The eight clips each one carries —
idle, walk, battleIdle, attack, cast, hurt, dead, victory — are authored in
`tools/blender/clips.py`, not generated and not borrowed.

Nobody needs crediting for these. They are listed because a file that cannot say
where it came from is a file nobody can check.

| Character | Model | Concept view |
|---|---|---|
| Vesna | `vesna.glb` | assets/concepts/vesna-front.png |
| Corvin | `corvin.glb` | assets/concepts/corvin-front.png |
| Aurelian | `aurelian.glb` | assets/concepts/aurelian-front.png |
| Bastian | `bastian.glb` | assets/concepts/bastian-front.png |
| Idris | `idris.glb` | assets/concepts/idris-front.png |
| Maret | `maret.glb` | assets/concepts/maret-front.png |
| Osric | `osric.glb` | assets/concepts/osric-front.png |
| Tam | `tam.glb` | assets/concepts/tam-front.png |
| Ilsabet | `ilsabet.glb` | assets/concepts/ilsabet-front.png |
| Oda | `oda.glb` | assets/concepts/oda-front.png |
| Kestrel | `kestrel.glb` | assets/concepts/kestrel-front.png |
| Rusk | `rusk.glb` | assets/concepts/rusk-front.png |
| Wick | `wick.glb` | assets/concepts/wick-front.png |
| The Mask | `themask.glb` | assets/concepts/themask-front.png |

## The crowd: generated for this game

Every townsperson who is not one of the fourteen is drawn as one of these nine.
They are described as *types* rather than as people — a miller, a fisherwoman, a
child — with no crest, no armour and no weapon, because a villager who reads as
a hero is worse than one who reads as a villager. They come off the same rigger
as the party and share its skeleton, with two clips the party has no use for: a
townsperson also sits and works, and the maps ask for one of those in 222 of
their 324 NPC placements.

Which one a person gets is a hash of their own appearance, so the same villager
is always the same villager, and the party is deliberately not in the pool.

| Villager | Model | Concept view |
|---|---|---|
| Baker | `villager_baker.glb` | assets/concepts/villager_baker-front.png |
| Carter | `villager_carter.glb` | assets/concepts/villager_carter-front.png |
| Child | `villager_child.glb` | assets/concepts/villager_child-front.png |
| Elder | `villager_elder.glb` | assets/concepts/villager_elder-front.png |
| Farmhand | `villager_farmhand.glb` | assets/concepts/villager_farmhand-front.png |
| Fisherwoman | `villager_fisherwoman.glb` | assets/concepts/villager_fisherwoman-front.png |
| Miller | `villager_miller.glb` | assets/concepts/villager_miller-front.png |
| Smith | `villager_smith.glb` | assets/concepts/villager_smith-front.png |
| Weaver | `villager_weaver.glb` | assets/concepts/villager_weaver-front.png |
