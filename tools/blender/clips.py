"""Aetherbound's animation clips, authored as pose keyframes.

The battle system asks for a fixed vocabulary by name — `battleIdle`, `attack`,
`cast`, `hurt`, `dead`, `victory` in `src/battle/battle.js`, and `idle`/`walk`
on the field — so these names are not decorative. A clip missing from here is a
character that freezes at the moment the game asks it to act.

Kingdom Hearts' rigger supplies the machinery (`build_humanoid_rig`,
`assign_proximity_weights`, `author_animations`) and its own clip set for a
platformer: run, jump, fall, guard. A turn-based RPG wants a different verb
list, and `author_animations` already takes `clips=`, so this is a data file
rather than a fork.

Format, matching that rigger: `name: (loops, [(frame, pose), ...])` where a
pose maps bone name to Euler degrees. Every clip starts from `_base`, which is
the arms-down rest pose — the mesh is bound in a T-pose, so a clip that forgets
to bring the arms down animates a character standing like a scarecrow.
"""

from __future__ import annotations

# How far the upper arms drop from the bound T-pose to hang at the sides.
ARM_DOWN = -72.0


def base(extra: dict | None = None) -> dict:
    """Arms down, slight natural bend. Everything is authored on top of this."""
    pose = {
        "upper_arm.L": (ARM_DOWN, 0, 6),
        "upper_arm.R": (ARM_DOWN, 0, -6),
        "forearm.L": (-8, 0, 14),
        "forearm.R": (-8, 0, -14),
    }
    if extra:
        pose.update(extra)
    return pose


def arms(l_x, l_z, r_x, r_z, fl=-8, fr=-8) -> dict:
    return {
        "upper_arm.L": (l_x, 0, l_z), "upper_arm.R": (r_x, 0, r_z),
        "forearm.L": (fl, 0, 14), "forearm.R": (fr, 0, -14),
    }


def legs(lt, ls, rt, rs) -> dict:
    return {
        "thigh.L": (lt, 0, 0), "shin.L": (ls, 0, 0),
        "thigh.R": (rt, 0, 0), "shin.R": (rs, 0, 0),
    }


CLIPS = {
    # --- field ---------------------------------------------------------------
    # A slow breath. The shoulders carry it rather than the head, because a
    # nodding head at idle reads as impatience.
    "idle": (True, [
        (0, base({"chest": (-2, 0, 0), "head": (1, 0, 0)})),
        (44, base({"chest": (-5, 0, 0), "head": (-1, 0, 0),
                   "upper_arm.L": (ARM_DOWN + 3, 0, 6),
                   "upper_arm.R": (ARM_DOWN + 3, 0, -6)})),
        (88, base({"chest": (-2, 0, 0), "head": (1, 0, 0)})),
    ]),
    # Four-key walk: contact, passing, opposite contact, passing. Shallower
    # than a run — the field speed is 4.4 units a second, not a sprint.
    "walk": (True, [
        (0, base(legs(22, -10, -16, -28) | arms(ARM_DOWN, -18, ARM_DOWN, -18)
                 | {"spine": (-4, 0, 0)})),
        (10, base(legs(4, -26, 2, -22) | arms(ARM_DOWN, -4, ARM_DOWN, -4)
                  | {"spine": (-5, 0, 0)})),
        (20, base(legs(-16, -28, 22, -10) | arms(ARM_DOWN, 18, ARM_DOWN, 18)
                  | {"spine": (-4, 0, 0)})),
        (30, base(legs(2, -22, 4, -26) | arms(ARM_DOWN, 4, ARM_DOWN, 4)
                  | {"spine": (-5, 0, 0)})),
        (40, base(legs(22, -10, -16, -28) | arms(ARM_DOWN, -18, ARM_DOWN, -18)
                  | {"spine": (-4, 0, 0)})),
    ]),

    # --- battle --------------------------------------------------------------
    # Weight forward, guard up, feet apart. This is the pose the player looks at
    # for most of a fight, so it is a stance rather than a rest.
    "battleIdle": (True, [
        (0, base(legs(10, -14, -8, -12) | {
            "upper_arm.L": (ARM_DOWN + 14, 0, 18), "forearm.L": (-40, 0, 20),
            "upper_arm.R": (ARM_DOWN + 10, 0, -14), "forearm.R": (-30, 0, -18),
            "spine": (-6, 0, 0), "chest": (-3, 0, 4), "head": (2, 0, -3)})),
        (30, base(legs(10, -14, -8, -12) | {
            "upper_arm.L": (ARM_DOWN + 18, 0, 18), "forearm.L": (-46, 0, 20),
            "upper_arm.R": (ARM_DOWN + 14, 0, -14), "forearm.R": (-34, 0, -18),
            "spine": (-9, 0, 0), "chest": (-5, 0, 4), "head": (0, 0, -3)})),
        (60, base(legs(10, -14, -8, -12) | {
            "upper_arm.L": (ARM_DOWN + 14, 0, 18), "forearm.L": (-40, 0, 20),
            "upper_arm.R": (ARM_DOWN + 10, 0, -14), "forearm.R": (-30, 0, -18),
            "spine": (-6, 0, 0), "chest": (-3, 0, 4), "head": (2, 0, -3)})),
    ]),
    # Wind up away from the target, then drive through it. The hold on the last
    # key matters: the battle code plays this while the damage number lands, and
    # a swing that has already recovered makes the hit look unconnected.
    "attack": (False, [
        (0, base(legs(8, -12, -6, -10) | {
            "upper_arm.R": (ARM_DOWN + 20, 0, -40), "forearm.R": (-52, 0, -20),
            "spine": (-4, 0, -14), "chest": (0, 0, -10)})),
        (7, base(legs(14, -10, -10, -14) | {
            "upper_arm.R": (ARM_DOWN + 40, 0, -74), "forearm.R": (-72, 0, -24),
            "spine": (-8, 0, -26), "chest": (-4, 0, -18), "head": (0, 0, -8)})),
        (14, base(legs(26, -8, -18, -20) | {
            "upper_arm.R": (ARM_DOWN + 26, 0, 44), "forearm.R": (-14, 0, 8),
            "spine": (-2, 0, 30), "chest": (2, 0, 20), "head": (0, 0, 10)})),
        (26, base(legs(20, -10, -14, -16) | {
            "upper_arm.R": (ARM_DOWN + 16, 0, 26), "forearm.R": (-22, 0, 4),
            "spine": (-4, 0, 18), "chest": (0, 0, 12)})),
        (40, base(legs(10, -14, -8, -12) | {
            "upper_arm.L": (ARM_DOWN + 14, 0, 18), "forearm.L": (-40, 0, 20),
            "upper_arm.R": (ARM_DOWN + 10, 0, -14), "forearm.R": (-30, 0, -18),
            "spine": (-6, 0, 0), "chest": (-3, 0, 4)})),
    ]),
    # Both hands rise and open. Vesna is a mage and this plays constantly, so it
    # is deliberately upright and readable rather than flashy.
    "cast": (False, [
        (0, base({"spine": (-4, 0, 0), "chest": (-2, 0, 0)})),
        (12, base({
            "upper_arm.L": (ARM_DOWN + 46, 0, 26), "forearm.L": (-56, 0, 18),
            "upper_arm.R": (ARM_DOWN + 46, 0, -26), "forearm.R": (-56, 0, -18),
            "spine": (6, 0, 0), "chest": (8, 0, 0), "head": (-8, 0, 0)})),
        (30, base({
            "upper_arm.L": (ARM_DOWN + 58, 0, 30), "forearm.L": (-40, 0, 14),
            "upper_arm.R": (ARM_DOWN + 58, 0, -30), "forearm.R": (-40, 0, -14),
            "spine": (10, 0, 0), "chest": (12, 0, 0), "head": (-12, 0, 0)})),
        (46, base({"spine": (-4, 0, 0), "chest": (-2, 0, 0)})),
    ]),
    # A flinch, not a stagger — it has to resolve fast enough to sit under a
    # damage popup without delaying the next turn.
    "hurt": (False, [
        (0, base({"spine": (-6, 0, 0)})),
        (5, base(legs(-6, -6, 4, -8) | {
            "spine": (-24, 0, 8), "chest": (-14, 0, 6), "head": (-16, 0, 4),
            "upper_arm.L": (ARM_DOWN - 12, 0, 22), "upper_arm.R": (ARM_DOWN - 12, 0, -18)})),
        (16, base({"spine": (-10, 0, 2), "chest": (-6, 0, 0), "head": (-4, 0, 0)})),
        (26, base({"spine": (-6, 0, 0)})),
    ]),
    # Falls and stays down. Non-looping, and the last key is the pose the
    # character holds for the rest of the battle, so it has to read as dead
    # from the battle camera rather than as mid-fall.
    "dead": (False, [
        (0, base({"spine": (-6, 0, 0)})),
        (10, base(legs(-14, -30, -10, -26) | {
            "spine": (-34, 0, 0), "chest": (-18, 0, 0), "head": (-20, 0, 0),
            "upper_arm.L": (ARM_DOWN - 24, 0, 30), "upper_arm.R": (ARM_DOWN - 24, 0, -30)})),
        (30, base(legs(-70, -74, -66, -70) | {
            "hips": (-84, 0, 0), "spine": (-16, 0, 6), "chest": (-8, 0, 4),
            "head": (-14, 0, 8),
            "upper_arm.L": (ARM_DOWN - 40, 0, 52), "forearm.L": (-20, 0, 10),
            "upper_arm.R": (ARM_DOWN - 40, 0, -52), "forearm.R": (-20, 0, -10)})),
    ]),
    # One fist up. Plays on the Victory banner, so it holds at the top.
    "victory": (False, [
        (0, base({"spine": (-4, 0, 0)})),
        (12, base({
            "upper_arm.R": (ARM_DOWN + 96, 0, -18), "forearm.R": (-30, 0, -12),
            "upper_arm.L": (ARM_DOWN + 8, 0, 14), "forearm.L": (-34, 0, 16),
            "spine": (8, 0, 0), "chest": (10, 0, 0), "head": (-10, 0, 0)})),
        (34, base({
            "upper_arm.R": (ARM_DOWN + 104, 0, -14), "forearm.R": (-22, 0, -10),
            "upper_arm.L": (ARM_DOWN + 8, 0, 14), "forearm.L": (-34, 0, 16),
            "spine": (10, 0, 0), "chest": (12, 0, 0), "head": (-12, 0, 0)})),
        (60, base({
            "upper_arm.R": (ARM_DOWN + 100, 0, -16), "forearm.R": (-26, 0, -10),
            "upper_arm.L": (ARM_DOWN + 8, 0, 14), "forearm.L": (-34, 0, 16),
            "spine": (9, 0, 0), "chest": (11, 0, 0), "head": (-11, 0, 0)})),
    ]),
}
