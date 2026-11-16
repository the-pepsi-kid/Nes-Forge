"""Source-observed Zelda II horizontal *pilot adapter*, fixed-step at NES rate.

Traced in private Forge emulation of Z2 US in Rauru: signed RAM $70 ramps
by 1 toward +/-24 while held, by 2 when reversing, and by 1 toward zero
when released. Position advances with 1/16-pixel fixed-point movement.
This is NOT proof of original code branch, subpixel carry, wall collision,
room transitions, or an engine-wide verified movement implementation.
Do not accept client-supplied velocity/position through this adapter.
"""
from dataclasses import dataclass

MAX_SPEED = 24
SUBPIXELS = 16
FPS = 60.0988

@dataclass
class Actor:
    position16: int
    velocity: int = 0
    held: int = 0
    walk_frames: int = 0


def frame(actor: Actor, min_px: int, max_px: int) -> bool:
    """Step one deterministic simulation frame; return whether anything changed."""
    if actor.held not in (-1, 0, 1):
        raise ValueError('Invalid server-owned directional input')
    before = (actor.position16, actor.velocity, actor.walk_frames)
    if actor.held:
        accel = 2 if actor.velocity * actor.held < 0 else 1
        actor.velocity = max(-MAX_SPEED, min(MAX_SPEED, actor.velocity + actor.held * accel))
    elif actor.velocity:
        actor.velocity -= 1 if actor.velocity > 0 else -1
    next_pos = actor.position16 + actor.velocity
    clamped = min(max_px * SUBPIXELS, max(min_px * SUBPIXELS, next_pos))
    if clamped != next_pos:
        actor.velocity = 0
    actor.position16 = clamped
    actor.walk_frames = actor.walk_frames + 1 if actor.velocity else 0
    return before != (actor.position16, actor.velocity, actor.walk_frames)


def pose(actor: Actor) -> int:
    if actor.velocity == 0:
        return 3  # Original ROM observed standing pose selector
    # Original sampled Rauru 0/1/2 walk cycle; cadence varies with speed.
    cadence = 4 if abs(actor.velocity) >= 20 else 8
    return (actor.walk_frames // cadence) % 3
