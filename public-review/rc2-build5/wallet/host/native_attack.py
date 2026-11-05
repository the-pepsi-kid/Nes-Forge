"""Ground sword pose timing observed executing the original Zelda II (US) ROM.

Standing B held from idle in Rauru: OAM pose 4 for 7 frames, 5 for 6,
then 3. Down+B: first frame standing 3, pose 7 for 7 frames, then
crouching 6. These are presentation observations, not authentic sword
hitboxes, cooldowns, damage, or the combat routine's disassembly.
No ROM assets or private screenshots appear in this module.
"""
FPS=60.0988
STANDING_SWORD=(4,)*7+(5,)*6
CROUCH_SWORD=(7,)*7

def ground_sword_pose(action,frame):
    if frame<0:return None
    if action=='forward_stab':
        return STANDING_SWORD[frame] if frame<len(STANDING_SWORD) else None
    if action=='crouch_stab':
        return CROUCH_SWORD[frame] if frame<len(CROUCH_SWORD) else None
    return None

def ground_sword_frames(action):
    return len(CROUCH_SWORD if action=='crouch_stab' else STANDING_SWORD)
