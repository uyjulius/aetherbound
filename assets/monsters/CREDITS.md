# Creature models

The bestiary is generated for this game, one model per entry in
`src/battle/monstermodels.js`. A concept view from **FLUX.1-schnell**,
reconstructed by **Hunyuan3D-2.1**, then cleaned, rigged and animated by the
scripts in `tools/`: `genconcept.mjs`, `isolate.mjs`, `genmesh.mjs` and
`blender/rig_creature.py`.

Four skeletons cover nine body plans — a biped, a quadruped, a winged shape and
a stalk — and the clips each one carries are authored in
`tools/blender/creature_clips.py`. Nothing here is procedural: the geometry is
reconstructed from a drawn view and the motion is keyframed by hand.

Nobody needs crediting for these. They are listed because a file that cannot say
where it came from is a file nobody can check.

| Plan | Creature | Model | Concept view |
|---|---|---|---|
| quadruped | Wolf | `quadruped_wolf.glb` | assets/concepts/quadruped_wolf-front.png |
| quadruped | Fox | `quadruped_fox.glb` | assets/concepts/quadruped_fox-front.png |
| quadruped | Bull | `quadruped_bull.glb` | assets/concepts/quadruped_bull-front.png |
| quadruped | Husky | `quadruped_husky.glb` | assets/concepts/quadruped_husky-front.png |
| humanoid | Goblin | `humanoid_goblin.glb` | assets/concepts/humanoid_goblin-front.png |
| humanoid | Zombie | `humanoid_zombie.glb` | assets/concepts/humanoid_zombie-front.png |
| humanoid | Big Arm | `humanoid_bigarm.glb` | assets/concepts/humanoid_bigarm-front.png |
| humanoid | Wizard | `humanoid_wizard.glb` | assets/concepts/humanoid_wizard-front.png |
| undead | Zombie | `undead_zombie.glb` | assets/concepts/undead_zombie-front.png |
| undead | Skeleton | `undead_skeleton.glb` | assets/concepts/undead_skeleton-front.png |
| undead | Skeleton | `undead_skeleton2.glb` | assets/concepts/undead_skeleton2-front.png |
| undead | Skeleton | `undead_skeleton3.glb` | assets/concepts/undead_skeleton3-front.png |
| insect | Spider | `insect_spider.glb` | assets/concepts/insect_spider-front.png |
| insect | Crab | `insect_crab.glb` | assets/concepts/insect_crab-front.png |
| insect | Armabee | `insect_armabee.glb` | assets/concepts/insect_armabee-front.png |
| insect | Armabee Evolved | `insect_armabeeevolved.glb` | assets/concepts/insect_armabeeevolved-front.png |
| avian | Dragon | `avian_dragon.glb` | assets/concepts/avian_dragon-front.png |
| avian | Dragon | `avian_dragon2.glb` | assets/concepts/avian_dragon2-front.png |
| avian | Bat | `avian_bat.glb` | assets/concepts/avian_bat-front.png |
| avian | Glub | `avian_glub.glb` | assets/concepts/avian_glub-front.png |
| construct | Mech | `construct_mech.glb` | assets/concepts/construct_mech-front.png |
| construct | Robot | `construct_robot.glb` | assets/concepts/construct_robot-front.png |
| construct | Robot Enemy | `construct_robotenemy.glb` | assets/concepts/construct_robotenemy-front.png |
| construct | Robot Enemy Large | `construct_robotenemylarge.glb` | assets/concepts/construct_robotenemylarge-front.png |
| plant | Mushroom King | `plant_mushroomking.glb` | assets/concepts/plant_mushroomking-front.png |
| plant | Cactoro | `plant_cactoro.glb` | assets/concepts/plant_cactoro-front.png |
| plant | Cactoro | `plant_cactoro2.glb` | assets/concepts/plant_cactoro2-front.png |
| plant | Carnivore Plant | `plant_carnivoreplant.glb` | assets/concepts/plant_carnivoreplant-front.png |
| blob | Slime | `blob_slime.glb` | assets/concepts/blob_slime-front.png |
| blob | Slime | `blob_slime2.glb` | assets/concepts/blob_slime2-front.png |
| blob | Pink Slime | `blob_pinkslime.glb` | assets/concepts/blob_pinkslime-front.png |
| blob | Slime Enemy | `blob_slimeenemy.glb` | assets/concepts/blob_slimeenemy-front.png |
| floater | Tentacle | `floater_tentacle.glb` | assets/concepts/floater_tentacle-front.png |
| floater | Manta Ray | `floater_mantaray.glb` | assets/concepts/floater_mantaray-front.png |
| floater | Flying Enemy | `floater_flyingenemy.glb` | assets/concepts/floater_flyingenemy-front.png |
| floater | Blobfish | `floater_blobfish.glb` | assets/concepts/floater_blobfish-front.png |

Two hundred species share these thirty-six models: which one a species gets is a
hash of its own look, and it is told apart from its neighbours by size and tint.
