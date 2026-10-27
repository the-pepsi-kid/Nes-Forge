# Zelda II native discovery checkpoint 04 — Shield teacher house entrance

**Status:** original-game evidence from private local ROM run; not a hosted runtime feature. Recorded 2026-10-26.

## Executed, observed, and distinguished

- The **39/39-step** original-ROM replay for Rauru teacher-daughter invitation remains complete and passing. It reaches Rauru area 44 / west scene 1 and observes the original dialogue starting **“TALK WITH MY”** after NES sword/talk B.
- A follow-up direct Playwright emulator run (no ROM/RAM modifications) continued from that precise state: **B** dismisses the invitation, wait **120** frames, **Left** for 18 frames aligns with the doorway, **Up** for 12 frames triggers actual source transition to **scene 48** and transient gameMode **8**; wait 90 frames yields **scene 48**, gameMode **11**, a red-brick house interior. Area remains 44.
- Native execution log and user-owned original-game screenshots are included in the owner's **Checkpoint 04 evidence ZIP**, deliberately excluded from public Git.
- New scenario \`tests/native_scenarios/z2_rauru_house_entry_candidate.json\` extends the 39-step input script with these native observations. The JSON is schema-valid; **full 44/44 reproducibility has NOT passed a separate complete replay gate** due to intermittent exploratory emulator stalls. Do not label it green until independently reproduced. The first 39 steps were verified end-to-end; the doorway was directly observed in the separate test.
- The learned Shield spell itself has **NOT** been obtained: we have yet to traverse the house, reach the basement, speak to the Wise Man, identify the grant predicate, or verify spell selection/casting/MP/defense. The native memory byte sampled near the invitation is only diagnostic dialogue state, not learned magic.

## Forge import and multiplayer implications

This is the first **NPC invitation -> unlocked door -> source-backed interior entrance** chain observed in a single Zelda II playthrough. It demonstrates why source World area (44), outdoor scene (1), and interior scene (48) require distinct scene identities and entry conditions. Interactions are actor/location conditioned; our hosted pilot currently cannot legitimately equate source-room record publication with full NPC interaction or source-derived exits.

Next engineering work:
1. Make native replay checkpoint/resume less expensive using the pre-existing local-only, session-bound \`Forge.services.EmulatorTimeline.saveCheckpoint/restoreCheckpoint\` API; keep save states out of public Git.
2. Verify the candidate 44-step replay independently, then add door identity and NPC trigger to the Zelda II-specific \`SourceAreaAdapter\` with evidence markers; don't hardcode Zelda II behavior into all Forge games.
3. Play to basement Wise Man and recover the original Shield grant and cast semantics before connecting server-owned per-player ability unlocks.
4. Preserve native ROM build parity; public Git contains no ROM bytes, gameplay images, or private save data.

**Acceptance status:** invitation 39/39 passed; doorway verified in direct emulator execution; house-entry 44-step replay candidate unpassed; Wise Man/Shield not yet verified; multiplayer adaptation not implemented.
