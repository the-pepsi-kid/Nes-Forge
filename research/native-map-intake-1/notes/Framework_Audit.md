# A2 framework audit — native maps and collision

Read-only audit of the native-background candidate at Git `6cde192eee757e677376c319045944e17c3395fa` on 2026-10-11. No application files were changed. Candidate input NovaSquirrel/DABG at `5ecc60b6` is being assessed separately; this note does not claim that input has been decoded or reproduced.

## Conclusion

Schema 12, the existing metatile model, REMethods v2, ProjectStore.appendScene and the ordinary compilers already provide the boundaries A2 needs. A2 should add a proven native-format adapter, exact collision materialization, and a map-specific conversion report. It should reuse the existing scene preview/import mechanism. It does not justify another registry, project schema, collision runtime, live-project mutation interface, or prerequisite general debugger.

The smallest useful scope depends on the independent input. Establish that input's graphics, map and collision records before coding the import. An intake checkpoint is more defensible than stretching a graphics-only profile to treat unproven data as collision.

## Existing acceptance requirements

`app/docs/NES_Forge_2.0_ALPHA_PLAN.md`, A2 and per-slice acceptance:

- Actual native records and original program behavior must agree.
- Editing a wall or traversable area must change expected rebuilt behavior.
- Formats, source offsets, decoding steps, unsupported semantics and conversion differences remain explicit.
- Preview is detached; import is explicit and undoable; failed recovery preserves the active project.
- Useful edits survive canonical save/reopen and rebuild.
- Valid native data changes must remain supported; filename/whole-ROM hash recognition cannot replace format validation.
- Bridge Room is a purpose-built control. Pepsi/HonkeyPong A1 graphics do not establish collision support.
- Retain schema 12, five templates, actor/persistence limits, Door Option B and protected runtime/capture/save/undo behavior.

## What can already be reused

| Existing owner | Current behavior | A2 implication |
| --- | --- | --- |
| `src/re/re-methods.js` | One registry; graphics/maps/collision domains; v2 independently declared decode and convert operations; bounded source reads, work, evidence, cancellation and immutable results | Register a format adapter here. Do not add a map decoder registry or imply a native encoder merely because canonical conversion succeeds. |
| `src/services/project-store.js` | Schema 12; detached prepareLoad; guarded appendScene with a single Undo entry, rollback and committed UI warnings | Append recovered scene through this owner. Keep active runtime/audio/world settings and unrelated references intact. |
| `src/legacy/07-metatiles.js` | Scene-local 16×16 definitions with four CHR IDs, one palette and four collision quadrants; 240 cells; IDs 0–254 | Exact per-cell binary collision fits without a new persisted collision array. |
| `src/legacy/22-compiler-engine165.js` | Single-room 32×30 collision derives from tileProps then linked metatile overrides; executable collision accepts only Empty=0 and Solid=1 | Reuse the emitter. Refuse or explicitly adapt unsupported native semantics; do not merely assign editor property names. |
| `src/world/world-compiler.js` | Existing World maps reference metatile definitions; emits per-screen Empty/Solid collision | Available if the verified input requires multiple screens. This is not a reason to claim scrolling or topology recovery prematurely. |
| `src/services/build-services.js` | Detached compiler produces real ROMs; viewer is explicit opt-in; single-room and World have existing paths | Preview should compile the actual proposed standalone canonical project, with its declared backend. |
| `src/re/re-native-background.js` | Canonical graphics conversion plus detached staging, guard/hash and append import | Extract only the mechanical scene lifecycle needed by both A1 and A2; retain A1 outputs and wrapper API. |
| `src/re/re-native-background-ui.js` | Source generation/method/project guards, cancel, preview evidence, acknowledgement, import, project/evidence downloads | Reuse this implementation as a scene-conversion panel, with explicit conversion kind and existing background compatibility aliases. Do not copy the whole UI. |

## Concrete shared architecture recommendation

Use two resource-specific converters and one narrowly shared scene lifecycle. This is a refactor justified by two actual scene consumers, not an extensibility framework for hypothetical resources.

1. **REMethods remains the only profile registry.** Add the smallest explicit metadata needed to identify a scene-conversion operation and its background or map/collision kind. Do not use the `graphics` domain as an output type. Preserve all existing descriptors that omit the new optional field. There is no need to add a second map of game/profile IDs.
2. **Keep source decoders pure and bounded.** The native-format adapter supplies verified graphics/map/collision records, physical evidence, construction steps and unknowns. It does not create DOM nodes, change the project, run supplied ROM code, or implement its own build path.
3. **Keep canonical conversion resource-specific.** Background conversion continues producing its existing report and scene byte-for-byte. Map conversion produces its own strict versioned report and canonical scene; a small pure function materializes exact binary cell collision into existing tileProps/metatiles/metaMap. Do not make optional collision data silently expand the meaning of A1's background report.
4. **Extract A1's mechanical stage/import code into one native-scene helper.** It owns dispatch, cancellation boundaries, project guard, detached canonical validation, actual detached compile/hash, frozen stage ownership, and guarded appendScene. The existing RENativeBackground service delegates to this helper while retaining its public signatures, version and report validator. A map wrapper provides only its report validation, standalone project construction, expected backend and import intent. These are trusted application-code callbacks/constants, never registrations or executable configuration supplied by source ROMs. There should be no generic mutation callback and no new project mutation owner.
5. **Reuse the existing panel's state machine.** Its method list uses explicit scene-conversion metadata. Method kind chooses the small background/map presentation differences: label, limitations, collision summary/overlay, expected backend and download suffix. Source generation, cancellation, stale-project rejection, acknowledgement, import and saves remain one implementation. Retain current background element IDs and public service aliases where existing tests/callers rely on them. An explicit two-kind presentation switch is sufficient; a general plugin/component framework is unnecessary.
6. **Append the resource; keep a playable adaptation separate.** The imported map scene can remain excluded from the active project's build, as A1 does. A separate standalone project may contain a disclosed authored validation player and ordinary single-room or World settings, compiled through the existing owner. If original actors/physics are not decoded, neither the scene import nor the standalone project should label the authored actor or movement as recovered native behavior. Source evidence JSON and editable project JSON remain distinct.

Do not migrate old Native Room or physical CHR paths merely to make every historical workflow conform. Their preservation contract can remain unchanged. Do not generalize unrelated audio conversion into this scene helper.

## Smallest map/collision resource contract

Decide dimensions from verified input rather than assuming every map is one nametable. For an initial one-room subset, require an explicitly identified 256×240 region, a complete 32×30 collision grid and a declared coordinate mapping from native cells to 8×8 Forge cells.

Required data should include stable source-bound key/label, exact region dimensions and origin, native map/graphics data, decoded Empty/Solid cell values, known coverage, native collision-code meanings, bounded construction/provenance mapping, limitations and unknowns. A known cell with value zero must be distinguishable from an unknown cell. No unknown collision cell should be silently converted to Empty. Native compressed/metatile streams must explain how native records generate each region and collision property; decompression alone does not establish collision semantics.

Canonical materialization:

- When every occurrence of a CHR tile has the same collision meaning, use tileProps so ordinary Collision-tab editing remains authoritative.
- When the same graphic tile has different per-cell collision meanings, use a linked 16×16 metatile override for those cells. Its structural identity includes all four CHR IDs, palette and all four collision values.
- Bound materialization to at most 255 definitions; a single 16×15 region needs at most 240, but multi-region/world libraries can exceed the limit.
- Compare the final prepared/serialized canonical collision grid against decoded expected cells. The canonical normalizers clamp malformed values; decoder validation must reject unsupported source values before normalization.
- Preserve metadata identifying the source region and any omitted region/topology. A crop is an adaptation, not recovery of the complete native map.

## Compatibility risks identified

1. **A1's UI currently over-selects conversion profiles.** It includes every profile with `domains` containing `graphics` and a `convert` operation, then requires `NESForgeNativeBackgroundRecovery` and backend `packed`. Adding a graphics+maps+collision profile without explicit output metadata would route it into an incompatible panel.
2. **A1 container parsing is deliberately narrow.** RENativeBackground.parseNrom requires physical 8 KiB CHR-ROM and rejects CHR-RAM. If DABG uses CHR-RAM, independently decode the verified upload/decompression in the new adapter. Do not globally relax A1's profiles or pretend CHR-RAM is physical CHR-ROM.
3. **Linked collision wins.** Editing tileProps does not alter collision of linked metatile cells. UI guidance and useful-edit evidence must exercise the appropriate native canonical owner.
4. **Raw graphic/attribute edits can detach metatile links.** Existing reconciliation preserves visual consistency by detaching definitions that no longer match. A detached cell then uses tileProps; tests must cover this honestly rather than hide it with a parallel collision grid.
5. **Editor properties are broader than executable semantics.** Platform/Ladder/Hazard/Water/Slope labels exist, but the supported room and World collision compilers execute only Empty/Solid. Mapping a native platform or trigger to a similarly named editor property does not establish runtime support.
6. **Room/World topology is different from graphics placement.** Native scrolling, screens, spawn coordinates and exits require evidence. Do not infer them from a static picture or create World links just to make a conversion compile.
7. **Sprite/actor support is a separate proof.** A canonical standalone playable project needs valid player/animation assets and spawn bounds. Authored proxy assets must be labeled as such; they cannot become recovered fields by convenience.
8. **A2 report validity must survive its actual workflow.** Existing ProjectStore preserves captureMeta as scene metadata; it does not automatically call each recovery-report validator on every project open. Validate report/source/scene relationships at stage and evidence-export boundaries, without treating reopened external project metadata as a trusted live stage.
9. **A2 must not inherit A1's runtime disclaimer unchanged.** A1 correctly says collision is not recovered and backend is a static viewer. A2 needs scoped collision claims and a playable backend where it claims rebuilt collision behavior.

## Existing tests to retain and use as patterns

- `tests/re-methods200.cjs`: v2 operation declaration, bounds, malformed data, source identity, read provenance, work budget, cancellation, freeze and no editing during discovery.
- `tests/re-native-background.cjs`, construction/nametable suites and `tests/re-native-background-ui.cjs`: detached production bundle staging, original/native graphics explanation, valid variants, runtime output, guard/cancel, import and persistence; old 76 A1 cases must continue unchanged.
- `tests/project-scene-transaction.cjs`: append atomicity, stale/reentrant edits, snapshot acceptance, history rollback, live mirrors and committed UI warnings.
- `tests/re-bridge-model.cjs`: exact collision representation, inconsistent graphic reuse, rejection and save/reopen. Retained Bridge Room evidence is a control only.
- `tests/re-bridge-runtime.cjs`: useful shape for independently specified original wall behavior, canonical collision equality, rebuilt blocked movement, collision edit and actual generated 6502 traversal. Do not copy its fixture-specific expected values or engine allowlist as the A2 contract.
- `tests/gameplay165.cjs`, `tests/engine165.cjs`, World runtime suites, `tests/mashup-gameplay200.cjs`: binary collision, spawn validation, linked overrides/reconciliation, ordinary compiler and runtime preservation.

Meaningful new A2 proof should use independently derived native records and original program execution, test exact per-cell canonical materialization including ambiguous graphic reuse, a useful wall/traversal edit, save/reopen, generated 6502 behavior, valid structural/data variants, truncation/bad pointers/unsupported semantics, and unknown-engine inspection. Retain full-gate, browser-blocked and owner acceptance distinctions.
