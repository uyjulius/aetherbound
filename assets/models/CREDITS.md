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

## The crowd: by Quaternius, CC0

Every NPC in the world is drawn as one of nine models by **Quaternius**,
released **CC0** (public domain) and obtained through
[poly.pizza](https://poly.pizza). The party is deliberately not in that pool: a
villager who is Vesna in a different coat is worse than a villager who is one of
nine.

CC0 imposes no attribution requirement. This section exists because using
somebody's work without saying so is a poor way to behave, not because a licence
compels it.

| Character model | Source |
|---|---|
| Cube Guy Character | https://poly.pizza/m/K1IczhnvQ5 |
| Cube Woman Character | https://poly.pizza/m/75ikp7NEDx |
| Panda | https://poly.pizza/m/q1uJ28Hs8T |
| Mako | https://poly.pizza/m/2urczqZ9Xf |
| Rabbit | https://poly.pizza/m/mKev485XTR |
| Rabbit Blond | https://poly.pizza/m/cMsI6FDhNx |
| Rabbit Cyan Hair | https://poly.pizza/m/RPZ9gxcFL3 |
| Rabbit With pigtails | https://poly.pizza/m/SwKX8OIlw8 |
| Rabbit Grey | https://poly.pizza/m/KRnXIKJbqp |

The clips inside the crowd's files are the artist's own — Idle, Walk, Run,
Punch, HitReact, Death, Wave, Duck and the rest — and the game maps its own clip
names onto them in `src/world/charmodels.js`. It does not generate motion for
either family.
