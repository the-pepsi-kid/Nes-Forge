# Connected workflow review handoff

The owner requested a thorough review because NES Forge felt fragmented, then
clarified that shared resources must be delineated for intuitive use. Application
implementation remains paused. This checkpoint records findings and a repair
sequence; it does not implement the sequence or authorize a GitHub push.

Read `REVIEW.md` first. The reviewed runtime is the existing alpha.11 from
`e574b5fbfac16eaaea89a038ce3f18c05cd03755`, SHA-256
`9ac2c6750561f3e8c2dd5f542f6c6d9930383771000f1fd3cf751d70feb09d66`.
The standalone HTML, modular runtime inputs, encoders, schemas and user inputs
are unchanged by the audit. New files here are review material and isolated probes.

## Established findings

- The full raw bank containing Don Flamenco is not proof of a wrong Glass Joe
  mapping. Both select bank 29; other first-pose sharing appears at banks 26,
  23, 17 and 11. Tile-level use and source-state coverage still matter.
- Native $C0 has 52 pieces/38 tile IDs, while the Scene OAM list is empty. CHR
  usage derives from that OAM list and does not account for the pose pieces.
- An editable native project is called inspection-only; Area Library/Native
  guidance does not reflect newer bounded writers.
- New native view markers are not fully represented by common provenance,
  write-owner, source-use and resource-preview services.
- Include first 7 invalidates an otherwise no-op native build; Undo restores it.
- Resources can focus a different active Scene than the selected pose; a fresh
  reopen can restore the Scene while selecting the first unrelated pose.
- Exact resource follow, authored reference edges, native protection and the
  Zelda II terrain/edit/build/fresh-reopen path work in the bounded checks.
- Project Health and current title instructions are not connected to the actual
  blocked edit. Old intake/Audio context can remain visible after replacement,
  though identity guards correctly refuse stale operations.

## Repair direction

1. Accurate project/backend capability and action scope; protect native work
   from irrelevant authored-viewer controls.
2. Read-only common context/provenance projections over existing canonical
   owners, with exact active-editor navigation and explicit independent browsing.
3. Used-by-selection views, palette/flip appearances, known shared consumers,
   and source-snapshot/current-output preview roles without mutating references.
4. Fresh reopen, actionable build diagnostics and in-context title lessons.

Preserve ProjectStore/AssetRegistry/build/emulator owners, schema 12 and the
existing native/reader boundaries, the compact Retro Workstation, Zelda II native
routes, original Pepsi archive and independent RE/code/hex/HTML workflows.
Do not introduce a parallel asset store, infer unverified consumers or music/AI
bindings, or re-sign unsupported edits to make the interface look connected.

The repair milestone should prove a complete logical-selection -> used resource
-> correct writer -> save/fresh reopen -> build/reimport -> visible native result
cycle before expanding to more poses or titles. See REVIEW.md for priorities,
source references, the 15-tab matrix and acceptance criteria.

## Evidence scope

There are 18 fresh workflow observations (13 gaps and five working/limited-smoke
observations), a fresh Z2 continuity probe, and read-only shared-bank/tile-use
summaries for both Punch-Out revisions. Canvas/layout/timers are stubbed. The
full local browser could not launch because its executable is absent; only the
submitted screenshot supplies fresh visual-layout evidence. No new complete
fight, listening, controller, hardware or independent-emulator pass is claimed.
Current-hash 104/10 earlier checks remain retained evidence, not fresh audit runs.

No private source ROM, source-bearing project, game frame/audio or emulator
snapshot is included. Reproduction requires the user's supported inputs and
jsdom 30.1.3. The kit contains the exact reviewed application and full source,
not an incremental patch or a new fixed release.
