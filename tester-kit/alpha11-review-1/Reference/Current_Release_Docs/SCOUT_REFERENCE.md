# Scout asset reference — retained single-room example

This is the external legacy single-room Player/Target example, not a World Runtime walkthrough. Keep World Runtime disabled to reproduce its original behavior.

These are the authored values used by the example. All are editable in the existing tabs. Open the supplied Scout project to inspect the pixel art in CHR SHEET; this is a reference sheet, not an in-app setup flow.

| Existing panel | Value |
| --- | --- |
| SCENE | Sideview; no scrolling; camera 0,0 at 256×240; no follow entity. |
| CHR SHEET | BG tiles 0–4; sprite tiles 10–27 and 32–33. |
| COLLISION | Tiles 1, 2 and 3 Solid; other tiles Empty. |
| METASPRITES | Four poses; 8×8 hardware pieces; origin 8,24. Body uses six pieces at X=0/8 and Y=0/8/16. Attack adds blade pieces at X=16/24, Y=8. |
| ENTITY STUDIO | Player feet at 48,208, facing right; target feet at 208,208, facing left. |
| SCENE → Gameplay | Single-room platformer; speed 2, jump 9, gravity 1, maximum fall 6, body 12×22. |

## Animation data

| Animation | Durations (ticks) | Loop |
| --- | --- | --- |
| Scout idle | 30 | Yes |
| Scout walk | 8, 5, 8, 5 | Yes |
| Scout attack | 6, 6, 8 | No |
| Scout hurt | 12, 8 | No |

A tick is 1/60 second. Bind idle/walk/attack to the player and idle/hurt to the target. The target default state is idle.

The player and target body hurtbox is X=-6, Y=-22, W=12, H=22 relative to the feet. Attack contact areas are edited on the active attack frame in ANIM:

- Frame 2: Blade — X=8, Y=-15, W=16, H=7.

Use Build & Run to inspect the result. The example replay checks running to X=64, jumping to the platform at X=96/Y=176, moving to X=186 and striking the target.
