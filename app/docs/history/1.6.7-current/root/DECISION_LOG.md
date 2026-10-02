# Decision log

## D001 — Freeze 1.6.6; deliver convergence only

**Status: approved.** 1.6.6 Visual Workspace is the behavioral oracle. 1.6.7 may remove production examples, start blank, correct lifecycle/data-preservation defects, consolidate active ownership and update documentation. No new gameplay or later-roadmap functionality is authorized. Stop after the tested/packageable candidate and handoff.

## D002 — Project schema 9 for unresolved-reference preservation

**Status: decided before implementation.** The audit initially proposed v8 subject to a schema decision. The user's clarification requires explicit safety against the actual 1.6.6 loader. That loader accepts a v8 project but normalizes unresolved world cells to empty; therefore retaining v8 would falsely imply safe round trips.

Use schema **9** for 1.6.7 saves. The frozen 1.6.6 application rejects version 9 without mutation. Keep that rejection and the v8 data-loss characterization as permanent tests against the actual baseline, not a recreated validator. Existing supported legacy/v8 projects migrate into the current model; unresolved values that still exist in the input are preserved for repair. Newer/unsupported/malformed schemas reject atomically. Explicit downgrade to v8 is unsupported; do not silently strip data or lower a version number. Data already erased by an earlier save cannot be reconstructed by this decision.

The release/foundation value changes to 1.6.7; it is not a schema capability check. Project schema 9 does not change Forge ROM layout v3, NFEX payload v1, MT16 v1, WR16 v3, MS16 v2 or GP16 v1.

## D003 — Authoritative modules; standalone distribution

**Status: approved.** Development source files and ordered bundling replace the growing HTML-as-patch-substrate workflow. First reassemble the frozen 1.6.6 bytes exactly, then make the candidate changes. The distributed application remains one standalone HTML with no runtime module server, CDN or fetched example requirement. Keep source inputs and deterministic bundling tools in the release.

## D004 — Required service tranche and protected adapters

**Status: approved.** Converge ProjectStore lifecycle/serialization, BuildGraph/RuntimeCompiler dispatch, and ReleaseInfo/current docs. AssetRegistry is lookup/validation only. EmulatorBridge delegates to verified APIs. LiveLink remains inactive and side-effect-free. Convergence means authoritative active routing and exactly-once effects, not textual function counts. Protected historical code can remain inert; do not rewrite emulator/capture/Save As/CHR/undo/rendering/append import merely for cleaner source.

## D005 — External examples and explicit blank factories

**Status: approved.** Remove Scout literal/API creation from the production dependency graph; keep the exact fixture in tests and ordinary editable examples. Cold startup uses a genuinely blank viewer scene. New Project retains its established blank single-room configuration. Recovery remains an existing Restore/Dismiss banner, not a wizard. Do not reintroduce a guided popup/template flow as the main authoring environment.

## D006 — Preserve codec/backend output and load intents

**Status: approved.** Use five whole-ROM golden cases covering packed viewer, packed custom ASM, unpacked custom ASM, reordered world/assets and single-room proof of concept. Preserve dependency order, metadata reservations and final bytes. Full-project opening clears history; New Project/Open Forge ROM remain undoable replacements. Append import and runtime capture keep their existing reconstruction path.

## D007 — Staged evidence and honest acceptance status

**Status: approved.** Extraction, ProjectStore convergence and build convergence each have a gate; fix failures before continuing. The final clean-extraction runner measures the candidate total independently. 479/479 is only the measured frozen baseline unless the candidate itself happens to measure that total.

The approved real-browser attempt to open the standalone file was rejected by cloud security policy. No workaround was used. Browser acceptance remains unverified for blank startup, recovery banner, Save/Save As, project opening, Build & Run, Run Original and runtime capture until genuinely exercised in a permitted browser environment. Harness/source checks do not replace that evidence.

## Future decisions

Record new decisions with rationale, evidence, compatibility effects and authorization. This log does not authorize later milestones. **No agent or developer may autonomously begin 1.7 or expand 1.6.7 scope.**
