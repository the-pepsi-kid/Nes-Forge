"""Original Zelda II Rauru observed variable-height jump profiles.

Private US ROM was executed through NES Forge's original 6502 emulator.
Each curve records ground-relative NES pixels for distinct A-button hold lengths.
The original game changes its arc with jump hold duration, so one fixed 28-frame
curve is insufficient. Sparse holds interpolate between direct observations;
this is a bounded measured-data adapter, NOT recovered general physics/geometry.
No original ROM, code or graphics are embedded here.
"""
from bisect import bisect_left
FPS=60.0988
# Values below are vertical rises, never arbitrary Y-screen coordinates.
NATIVE_RISE_BY_HOLD={
 2: (0, 4, 7, 10, 13, 16, 18, 20, 22, 23, 24, 25, 26, 26, 26, 26, 25, 24, 23, 22, 20, 18, 16, 13, 10, 7, 4, 0),
 4: (0, 4, 7, 10, 13, 16, 19, 21, 23, 25, 26, 27, 28, 29, 29, 29, 29, 28, 27, 26, 25, 23, 21, 19, 16, 13, 10, 7, 3, 0),
 8: (0, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 28, 29, 30, 31, 31, 31, 31, 31, 30, 29, 28, 26, 24, 22, 20, 17, 14, 11, 7, 3, 0),
 12: (0, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 30, 31, 32, 33, 33, 33, 33, 33, 32, 31, 30, 28, 26, 24, 22, 19, 16, 13, 10, 6, 2, 0),
 20: (0, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 30, 31, 32, 33, 34, 35, 35, 35, 35, 35, 34, 33, 32, 30, 28, 26, 24, 21, 18, 15, 11, 7, 3, 0),
}
MAX_HOLD_FRAMES=max(NATIVE_RISE_BY_HOLD)
MAX_FLIGHT_FRAMES=max(len(z) for z in NATIVE_RISE_BY_HOLD.values())

def _at(seq,frame):
    return seq[frame] if 0<=frame<len(seq) else 0

def rise(frame,release_frame=None):
    """Server-trusted airborne rise. release_frame is computed from host time.

    Holding jump uses the source-observed longest held arc. A release selects
    shorter source-observed profile and nearby holds interpolate. A player
    never chooses a height, pose, or release timestamp in the wire protocol.
    """
    if frame<0:return 0
    if release_frame is None or release_frame>=MAX_HOLD_FRAMES:
        return _at(NATIVE_RISE_BY_HOLD[MAX_HOLD_FRAMES],frame)
    hold=max(2,release_frame)
    keys=sorted(NATIVE_RISE_BY_HOLD)
    hi=bisect_left(keys,hold)
    if hi==0:return _at(NATIVE_RISE_BY_HOLD[keys[0]],frame)
    if hi==len(keys):return _at(NATIVE_RISE_BY_HOLD[keys[-1]],frame)
    high=keys[hi]
    if high==hold:return _at(NATIVE_RISE_BY_HOLD[high],frame)
    low=keys[hi-1]
    fraction=(hold-low)/(high-low)
    return round(_at(NATIVE_RISE_BY_HOLD[low],frame)*(1-fraction)+_at(NATIVE_RISE_BY_HOLD[high],frame)*fraction)

def airborne(frame,release_frame=None):
    # At initial press the jump setup is pending for one NES frame.
    return frame in (0,1) or rise(frame,release_frame)>0

def pose(frame,release_frame=None):
    # Source-observed ascent pose 6, descent pose 2; the original uses more
    # state than this adapter models. Use actual selected profile apex.
    if not airborne(frame,release_frame):return 3
    curve=[rise(i,release_frame) for i in range(MAX_FLIGHT_FRAMES)]
    apex=max(range(len(curve)),key=lambda i:curve[i])
    return 6 if frame<=apex else 2
