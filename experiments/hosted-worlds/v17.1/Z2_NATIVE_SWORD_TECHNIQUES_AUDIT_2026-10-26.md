# Zelda II native sword-technique fidelity audit — 2026-10-26

**Classification:** confirmed gap and implementation acceptance contract. **No technique-unlock/runtime fidelity fix is claimed.** GitHub review branch only; not merged to main.

## User-observed discrepancy

The 42-second local video `2026-10-26 20-43-55.mp4` shows the hosted Link player with dedicated **Upward Stab: X** and **Downward Stab: C** controls; the attack/jump/room behaviors are labeled pilot/experimental. This is not the original controller mechanic.

Source game:
- **Downward Thrust:** trained by the swordsman in the church at **Mido Town**. Once acquired, **hold Down on the D-pad while airborne**.
- **Upward/Jump Thrust:** trained by the swordsman reached through the chimney house in **Darunia**. Once acquired, **hold Up on the D-pad while airborne**.
- **A jumps, B swings the normal sword**; standing Down adjusts crouch/low shield. Sword techniques are not available until learned.
- Authoritative documentation: Nintendo NES manual, controls page https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAASE_en.pdf ; corroborating gameplay reference https://strategywiki.org/wiki/Zelda_II:_The_Adventure_of_Link/Spells_and_Skills

## What the existing Forge source actually recovers

- `app/src/ui/hosted-player-poses.js` exports a 30-cell, 15-selector x 2-facing original Link *display* atlas from local ROM source. It **explicitly says selectors are not verified gameplay action bindings**, CHR/palette/timing are provisional.
- `app/src/ui/hosted-animation-trace.js` samples original emulator RAM at pose **$0080**, facing **$009F**, sword **$0400** and jump **$0479**, plus per-frame input, and allows activity marks. It does **not** establish the native learned-up/down technique flag addresses, NPC grant predicates or frame-accurate attack/collision transitions.
- `experiments/hosted-worlds/v17.1/host/client.js`: X and C send direct `side_action.up_stab` and `down_stab`; Space sends `side_jump`. Native **held D-pad Up/Down while jumping** is not mapped to these attacks. The original *emulator* input adapter `app/src/services/emulator-input.js` correctly supplies NES button states to the original emulator, but those held states are not the hosted runtime input protocol.
- `experiments/hosted-worlds/v17.1/host/server.py`: `side_action` trusts a whitelisted action string, requires original-looking pose asset and rate limits; checks airborne **only for down_stab**. Neither action checks learned-technique state. The pilot parabolic jump, static hit zones, 8 HP damage and cooldown are **hosted approximations**, not verified native rules.
- `tests/test_v17_client_stabs.py` and `tests/test_v17_hosted_stabs.py` verify X/C buttons, selectors and pilot hit tests. Passing them **does not** prove original Zelda II ability acquisition or controller mapping.

**Conclusion:** The original Zelda II ROM includes native code when emulated privately, but Forge's *semantic import into Hosted Worlds* **does not yet recover or enforce** the full swordsman NPC unlock, technique flags, correct controller behavior, animation action mapping or native hit/damage rules. Source pose rendering is not equivalent to source gameplay reproduction.

## Required evidence and implementation steps

1. **Recovery traces with legally provided private ROM**: compare three source-game states (before both techniques, after Mido's teacher, after Darunia's teacher); capture deterministic input frames of Jump + Up / Jump + Down, pose/facing/sword/jump RAM snapshots and differential RAM changes. Trace the original CPU branch/state transition controlling sword techniques and the NPC's teach event. Do not infer unknown offsets or teach flags from drawings, save-state deltas alone, or wiki memory maps.
2. **Native-semantic technique adapter**: encode recovered trainer NPC/source location, prerequisite(s), grant event, save persistence, per-character ability flags, input predicates and attack timeline under Zelda II's adapter—not in project-agnostic engine code. Attach exact provenance/region or ROM revision. Reject unverified native claims.
3. **One authoritative input stream**: gamepad/keyboard/touch emit NES-like held directions and Jump/Sword control frames to server, not `stab_up` commands that bypass validation; prohibit client-supplied technique unlocks or damage.
4. **Server checks**: both Up and Down only produce their respective thrust **while airborne and learned**. Before acquisition, directions maintain source-valid ordinary air/standing behavior. Persist learned flags through reconnect and the hosted Game Over policy without contaminating another player's state.
5. **Combat timing**: validate original sword extension, frame windows, collision with scenery/enemies, damage/source stat effects and cancellation when grounded/knocked back. Do not replace with the existing 8-HP and 0.64-second pilot constants and call them native.
6. **UI/UX**: show `Native technique: unverified/locked/learned`, appropriate controller mapping, and diagnostic provenance. Temporary dedicated X/C buttons may remain **only in clearly labeled pilot/debug mode**, not authentic gameplay mode.

## Acceptance tests required (currently not passed / not implemented)

- Native ROM: before learning either skill, holding Up/Down during a jump **does not** execute a sword thrust; normal sword and directional/crouch rules still work.
- Native ROM: Mido event unlocks Down only; Darunia event unlocks Up only, independently and with source-verifiable persisted flags.
- Hosted multiplayer: P1 learns Down, P2 does not; same room, same controls, only P1 may downward thrust; upstream input replay is deterministic and spoofing a client unlock fails.
- Hosted multiplayer: any Up/Down thrust requires airborne; standing Up does not trigger an upward attack. Held direction transitions match the source-defined activation/cancel timing and never generate unlimited duplicate hits.
- Separate authoritative original ROM trace and host behavior are compared frame-by-frame for action selection and hit windows. Missing frame data remains `unverified` and blocks a fidelity claim.
- Regression: original NES input emulator behavior and ROM export untouched; previous protocol 13 room and XP tests remain passing; X/C pilot control retained only behind explicit debug flag until retired.

## Risk and sequencing

Priority is **native technique unlock + input predicate tracing**, then source-based room transitions/physics, then trustworthy multiplayer combat. A town room graphic or pose atlas does not establish its NPC conversation/quest logic; teacher NPC recovery depends on scene/interaction data. Native source ROM bytes, save files, or copyrighted assets must not be committed into the public repository; commit only derived diagnostics and source identities when publishable.

**This file documents a gap, not an implementation or new test pass.**
