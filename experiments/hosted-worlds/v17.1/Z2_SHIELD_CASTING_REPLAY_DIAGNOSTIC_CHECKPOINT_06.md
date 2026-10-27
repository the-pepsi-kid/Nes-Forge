# Zelda II Shield casting and replay reliability — Checkpoint 06

**2026-10-26 | Audit only — no Shield casting or native-defense parity claim.**

## Source-game state

The preceding [Shield-grant checkpoint](Z2_NATIVE_SHIELD_GRANT_CHECKPOINT_05.md) directly observed the original Zelda II NES ROM change `$077B` from `0` to `1` near the Rauru Wise Man, area 44 / basement scene 36, without RAM writes. That verifies the spell *acquisition event*, not native spell menu navigation, MP cost, damage reduction or hosted combat parity.

From Nintendo's original NES manual, the **documented** control path is Start → highlight spell on sub-screen → Start to return → Select to cast. The documented Magic-level-1 Shield cost is **32**; the original-ROM replay has **not independently measured** it yet. Manual: https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAASE_en.pdf

## New local diagnostic

A checkpoint-aware, source-neutral Playwright replay runner was developed as a **local diagnostic candidate**, not yet accepted into Git. It uses Forge's existing local session-owned EmulatorTimeline checkpoints and replays all steps after a restored checkpoint. No ROM/RAM writes, native spell bypasses, exported save states or changes to the live gameplay engine.

- Pure rollback-policy checks: **8/8 PASS**.
- Five-step original ROM smoke: **5/5 PASS**, using the normal emulator.
- The same five-step smoke **5/5 PASS** with a local experimental CPU-inner-loop 200-ms safety guard added to the existing outer frame guard. This is *not* proof that the patch fixes hangs; it is not pushed or merged.
- Extended checkpoint-aware replay reached **38 completed steps**, through the NES **B** button at Rauru's daughter. During the following `Wait for native invitation dialogue` step, browser-side frame execution failed to return before the runner's external deadline. The independent instrumented original playthrough has previously observed both the invitation and the complete Shield grant. **This cold replay is NOT green.**
- The extra inner-loop time check did **not** fix the stalled dialogue replay. Do not generalize its short smoke PASS into a validated emulator safety fix.
- Session-local checkpoints cannot recover an unresponsive browser renderer; they only help when the emulator yields an error and the session remains valid. The 50-step grant replay is still pending reliable independent reproduction.

A private no-ROM diagnostic ZIP with current scripts, test results, and the experimental HTML was provided for further local research. Do not include this source in a release, replace the Git editor, or claim a new production feature based on this checkpoint.

## Next acceptance gate

1. Reproduce the dialogue frame stall with bounded independent watchdog instrumentation that identifies which emulator sub-loop stopped responding while preserving the 200-ms safety contract.
2. Confirm a reliable, repeated full original-ROM Shield grant scenario using only original controller inputs.
3. From a verified, locally resumed post-Wise-Man source state: close original dialogue; show **Shield selected in the Start menu**; press Select; record before/after MP, cast-state flags and visible effect; measure actual enemy damage with and without Shield.
4. Only then add the source-verified NPC/spell interaction to the Zelda II game adapter and two-player authoritative hosted simulation. Base-game NPC access must remain possible independently for both players. No client-supplied unlock or damage.
5. Keep all original ROM data, game screenshots and save states private. Maintain `main` as the accepted 2.0 baseline.

**Current decision:** no mutation of the shared emulator code; replay reliability is a development gate, not a gameplay mechanic that may be fabricated.
