# RE bridge runtime evidence

The `re-bridge-runtime.json` report records **9/9 passing cases** against the
candidate HTML identified by its SHA-256. The test executes the original native
6502 ROM and Forge's independently generated replacement using the bundled
CPU/PPU/APU. The DOM harness does not substitute JavaScript physics or fabricated
frame pixels.

The original ROM has no embedded Forge project. Expectations are independently
stated from the authored native fixture: 960 collision cells; 256 background and
256 sprite tiles; all 32 palette bytes; 16 pulse notes; a player at X=40 with feet
at Y=208; a wall beginning at X=192; an 8-pixel body.

Observed outcomes:

- The original and rebuilt completed frames match exactly, including the player.
- Holding Right stops both programs at X=188. Holding Left for 20 frames then
  places both at X=148. Rebuilt floor contact preserves feet Y=208.
- The ordinary Collision tab command changes wall tile 2 to Empty. The rebuilt
  player then reaches X=240 across the still-visible wall, with the floor intact.
- A canonical CHR edit changes the top-left pixel of source tile 2 from color 1
  to color 3. The emitted pattern bytes and rendered pixel at (192,128) change.
  All uses of that same CHR tile change, as expected.
- Original and rebuilt programs play the same 16-note sequence at 12 frames per
  row. The pulse control byte is 188 in both, preserving duty and volume. Native
  and Forge startup phases differ by one frame in this observation; sweep and
  length-register bits also differ. This is not cycle-exact sound-driver recovery.
- Changing the first canonical tracker note from C4 to C5 changes the actual
  pulse timer from 427 to 213.
- A ProjectStore JSON save/reload preserves canonical data and rebuilds identical
  bytes. The original ROM remains byte-identical in the input, file, and retained
  project payload.

`RE_Bridge_Runtime_Comparison.png` lays out the actual captured framebuffers with
captions. `render_comparison.py` reproduces the layout from the four small PNGs.
`Bridge_Room_Recovered.nesforge.json` is an editable project, distinct from an RE
inspection report. `Bridge_Room_Rebuilt.nes` is its compiled ROM.

Reproduce from the candidate source directory:

```sh
FORGE_RE_EVIDENCE_DIR=/absolute/output/directory \
FORGE_TEST_REPORT=/absolute/output/directory/re-bridge-runtime.json \
node tests/re-bridge-runtime.cjs mainline/NES_Forge_1.9.0_Gameplay_Core.html
```

Keep the output directory outside source inputs during the full clean-extraction
gate. Normal suite execution writes only its requested JSON report.

This verifies one recognized native engine. The rebuilt program uses Forge's
sideview runtime, adding jump and attack states; the original engine only moves
horizontally. No arbitrary-ROM recovery, SFX recovery, whole-engine equivalence,
real-browser interaction, audible-output quality, mobile performance, external
emulator acceptance, or physical hardware result is claimed by these tests.
