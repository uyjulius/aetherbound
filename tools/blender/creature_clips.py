"""What a creature does, authored per body shape.

The bestiary asks for `idle`, `attack`, `cast`, `hurt`, `dead`, `walk` and `run`, and falls
back along a chain — cast to attack, run to walk, walk to idle, and everything to idle. So a
creature needs four clips to be complete and gets six here where six make sense.

Two things are deliberate.

**Whole-body motion, not limb detail.** These are seen from eight metres away across a battle
stage, in fights that last three turns. A wolf's gait matters less than whether the wolf
*lunges* when it bites, and a slime has no gait at all.

**Authored, not computed.** Every number below was chosen; nothing here derives a pose from a
sine wave at runtime. That is the same line the cast's `clips.py` holds, and it is the line
this project draws between animation and procedural generation.
"""

from __future__ import annotations


def _keys(frames):
    return list(frames)


# --- four legs ---------------------------------------------------------------
#
# A walk swings the diagonal pairs: front-left with back-right. The spine counter-rotates a
# little, which is what stops a four-legged walk reading as a table sliding forward.
QUADRUPED = {
    "idle": (True, [
        (0, {"chest": (2, 0, 0), "head": (-2, 0, 0)}),
        (40, {"chest": (-2, 0, 0), "head": (2, 0, 0), "tail": (0, 0, 6)}),
        (80, {"chest": (2, 0, 0), "head": (-2, 0, 0)}),
    ]),
    "walk": (True, [
        (0, {"leg_front.L": (24, 0, 0), "leg_back.R": (22, 0, 0),
             "leg_front.R": (-20, 0, 0), "leg_back.L": (-18, 0, 0),
             "spine": (0, 0, 3), "head": (-3, 0, 0)}),
        (12, {"leg_front.L": (0, 0, 0), "leg_back.R": (0, 0, 0),
              "leg_front.R": (0, 0, 0), "leg_back.L": (0, 0, 0), "chest": (-2, 0, 0)}),
        (24, {"leg_front.L": (-20, 0, 0), "leg_back.R": (-18, 0, 0),
              "leg_front.R": (24, 0, 0), "leg_back.L": (22, 0, 0),
              "spine": (0, 0, -3), "head": (3, 0, 0)}),
        (36, {"leg_front.L": (0, 0, 0), "leg_back.R": (0, 0, 0),
              "leg_front.R": (0, 0, 0), "leg_back.L": (0, 0, 0), "chest": (-2, 0, 0)}),
        (48, {"leg_front.L": (24, 0, 0), "leg_back.R": (22, 0, 0),
              "leg_front.R": (-20, 0, 0), "leg_back.L": (-18, 0, 0),
              "spine": (0, 0, 3), "head": (-3, 0, 0)}),
    ]),
    "attack": (False, [
        (0, {"chest": (-6, 0, 0), "head": (8, 0, 0), "leg_front.L": (-14, 0, 0),
             "leg_front.R": (-14, 0, 0)}),
        (8, {"chest": (18, 0, 0), "head": (-24, 0, 0), "leg_front.L": (34, 0, 0),
             "leg_front.R": (34, 0, 0), "hips": (-8, 0, 0)}),
        (26, {"chest": (0, 0, 0), "head": (0, 0, 0)}),
    ]),
    "hurt": (False, [
        (0, {"chest": (0, 0, 0), "head": (0, 0, 0)}),
        (6, {"chest": (-16, 0, 0), "head": (18, 0, 0), "hips": (10, 0, 0),
             "leg_front.L": (-24, 0, 0), "leg_front.R": (-24, 0, 0)}),
        (24, {"chest": (0, 0, 0), "head": (0, 0, 0)}),
    ]),
    "dead": (False, [
        (0, {"root": (0, 0, 0)}),
        # Z, not Y. Y is a yaw: the first version of this clip turned a dying wolf on the spot,
        # eighty degrees, still standing on all four legs, and the movement check was perfectly
        # happy because something had moved. Rendered against X and Z, X pitches it onto its
        # nose and stands it on its head. Z lays it on its side, which is what dying looks like.
        (18, {"root": (0, 0, 74), "chest": (-20, 0, 0), "head": (-24, 0, 0),
              "leg_front.L": (-40, 0, 0), "leg_front.R": (-40, 0, 0),
              "leg_back.L": (36, 0, 0), "leg_back.R": (36, 0, 0)}),
        (40, {"root": (0, 0, 82), "chest": (-20, 0, 0), "head": (-30, 0, 0),
              "leg_front.L": (-40, 0, 0), "leg_front.R": (-40, 0, 0),
              "leg_back.L": (36, 0, 0), "leg_back.R": (36, 0, 0)}),
    ]),
}

# --- wings -------------------------------------------------------------------
WINGED = {
    "idle": (True, [
        (0, {"wing.L": (0, 0, 12), "wing.R": (0, 0, -12), "wingtip.L": (0, 0, 8),
             "wingtip.R": (0, 0, -8), "spine": (2, 0, 0)}),
        (14, {"wing.L": (0, 0, -22), "wing.R": (0, 0, 22), "wingtip.L": (0, 0, -16),
              "wingtip.R": (0, 0, 16), "spine": (-2, 0, 0)}),
        (28, {"wing.L": (0, 0, 12), "wing.R": (0, 0, -12), "wingtip.L": (0, 0, 8),
              "wingtip.R": (0, 0, -8), "spine": (2, 0, 0)}),
    ]),
    "walk": (True, [
        (0, {"wing.L": (0, 0, 26), "wing.R": (0, 0, -26), "wingtip.L": (0, 0, 18),
             "wingtip.R": (0, 0, -18), "head": (-4, 0, 0)}),
        (9, {"wing.L": (0, 0, -34), "wing.R": (0, 0, 34), "wingtip.L": (0, 0, -24),
             "wingtip.R": (0, 0, 24), "head": (4, 0, 0)}),
        (18, {"wing.L": (0, 0, 26), "wing.R": (0, 0, -26), "wingtip.L": (0, 0, 18),
              "wingtip.R": (0, 0, -18), "head": (-4, 0, 0)}),
    ]),
    "attack": (False, [
        (0, {"spine": (-10, 0, 0), "wing.L": (0, 0, 30), "wing.R": (0, 0, -30)}),
        (8, {"spine": (26, 0, 0), "head": (-18, 0, 0), "wing.L": (0, 0, -30),
             "wing.R": (0, 0, 30)}),
        (26, {"spine": (0, 0, 0), "head": (0, 0, 0)}),
    ]),
    "hurt": (False, [
        (0, {"spine": (0, 0, 0)}),
        (6, {"spine": (-22, 0, 0), "head": (16, 0, 0), "wing.L": (0, 0, -26),
             "wing.R": (0, 0, 26)}),
        (24, {"spine": (0, 0, 0), "head": (0, 0, 0)}),
    ]),
    # Down and over, not back. The first version rotated the root about X, which on this rig
    # rears the creature *upright* — rendered, it sits up and lifts its head, which is the
    # opposite of dying. Z is the axis that lays a body on its side, the same as the quadruped,
    # and the wings fold in on the way down rather than staying spread.
    "dead": (False, [
        (0, {"root": (0, 0, 0)}),
        (20, {"root": (0, 0, 52), "spine": (-16, 0, 0), "head": (-14, 0, 0),
              "wing.L": (0, 0, -30), "wing.R": (0, 0, 30),
              "wingtip.L": (0, 0, -40), "wingtip.R": (0, 0, 40)}),
        (40, {"root": (0, 0, 84), "spine": (-22, 0, 0), "head": (-24, 0, 0),
              "wing.L": (0, 0, -18), "wing.R": (0, 0, 18),
              "wingtip.L": (0, 0, -52), "wingtip.R": (0, 0, 52)}),
    ]),
}

# --- a body and nothing else -------------------------------------------------
#
# Squash and stretch along the chain. A slime that only translates reads as a rock being
# pushed; a slime that changes shape reads as a slime.
STALK = {
    "idle": (True, [
        (0, {"hips": (0, 0, 0), "spine": (0, 0, 0), "chest": (0, 0, 0)}),
        (30, {"hips": (4, 0, 0), "spine": (-6, 0, 0), "chest": (4, 0, 0), "head": (-4, 0, 0)}),
        (60, {"hips": (0, 0, 0), "spine": (0, 0, 0), "chest": (0, 0, 0)}),
    ]),
    "walk": (True, [
        (0, {"hips": (6, 0, 0), "spine": (-10, 0, 0), "chest": (8, 0, 0)}),
        (16, {"hips": (-6, 0, 0), "spine": (10, 0, 0), "chest": (-8, 0, 0)}),
        (32, {"hips": (6, 0, 0), "spine": (-10, 0, 0), "chest": (8, 0, 0)}),
    ]),
    "attack": (False, [
        (0, {"hips": (-8, 0, 0), "spine": (-10, 0, 0), "chest": (-8, 0, 0)}),
        (7, {"hips": (16, 0, 0), "spine": (24, 0, 0), "chest": (20, 0, 0), "head": (14, 0, 0)}),
        (24, {"hips": (0, 0, 0), "spine": (0, 0, 0), "chest": (0, 0, 0), "head": (0, 0, 0)}),
    ]),
    "hurt": (False, [
        (0, {"spine": (0, 0, 0)}),
        (6, {"hips": (-14, 0, 0), "spine": (-20, 0, 0), "chest": (-16, 0, 0),
             "head": (-10, 0, 0)}),
        (24, {"hips": (0, 0, 0), "spine": (0, 0, 0), "chest": (0, 0, 0), "head": (0, 0, 0)}),
    ]),
    "dead": (False, [
        (0, {"root": (0, 0, 0)}),
        (20, {"root": (0, 0, 0), "hips": (-40, 0, 0), "spine": (-46, 0, 0),
              "chest": (-40, 0, 0), "head": (-30, 0, 0)}),
        (40, {"root": (0, 0, 0), "hips": (-48, 0, 0), "spine": (-52, 0, 0),
              "chest": (-46, 0, 0), "head": (-36, 0, 0)}),
    ]),
}

BY_SHAPE = {"quadruped": QUADRUPED, "winged": WINGED, "stalk": STALK}
