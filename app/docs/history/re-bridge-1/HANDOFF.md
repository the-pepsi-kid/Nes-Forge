# NES Forge 1.9.0 Alpha — re-bridge-1 handoff

## Current scope

The owner authorized the supported-ROM integrated recovery example on September 30 by saying **“Alright, let's see what that looks like then.”** D048 records that scope and supersedes the earlier intake-only boundary for this slice. Candidate **`re-bridge-1`** remains **1.9.0 — Gameplay Core — Alpha**, schema **12**. Read its exact HTML hash from `build-inputs.json` and matching test reports. Input reference `mobile-play-2` measured 708/708 across 28 suites at SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`; changed bytes require their own complete gate and acceptance.

The integrated RE / DISASM panel analyzes the independently authored `Bridge_Room.nes`, previews decoded assets/collision/music and explicitly imports a native editable project. It reads native ROM tables without Forge JSON metadata. Recovery supports this engine profile only; other engines reject. Original ROM bytes are retained, import is undoable, and the evidence report is distinguished from the downloadable Forge project JSON.

The original game moves left/right only. Imported art, collision, spawn and pulse music feed the existing Forge sideview runtime; rebuilding adds jump/attack animation states and does not reproduce the original game engine or ROM bytes. No SFX is present or recovered. The mobile input and presentation contract is retained, and reported phone lag remains open. Implementation authorization does not imply acceptance, promotion or permission for unrelated milestones.

Entry points:

- application: `mainline/NES_Forge_1.9.0_Gameplay_Core.html`;
- authoritative sources: `source-manifest.json` and `src/`;
- RE decoder/UI: `src/re/re-bridge.js`, `src/re/re-ui.js`;
- independent native example: `examples/RE_Bridge_Room/Bridge_Room.nes` with source builder/specification;
- recovery walkthrough and limits: `docs/RE_BRIDGE.md`;
- gameplay model/compiler/runtime/UI: `src/gameplay/`;
- ProjectStore and dispatch: `src/services/project-store.js`, `src/services/build-services.js`;
- controlling contract: `docs/GAMEPLAY_SYSTEMS_1.9_PLAN.md`;
- editable example: `examples/Scout_Gameplay_Core_1.9.0.nesforge.json` and matching `.nes`;
- mobile controls and device checklist: `docs/MOBILE_PLAY.md`, `docs/BROWSER_QA.md`;
- release verification: `python3 tools/bundle.py --check` and `node tests/run_all.cjs`.

## Implemented contract

Schema 12 owns `gameplayCore`. Supported older projects load with Gameplay Core disabled. The actual frozen 1.8 standalone rejects schema 12 atomically; downgrade export is unsupported.

The canonical identities are distinct:

- **Actor Definition:** reusable authored archetype with typed parameters/components and a behavior reference.
- **Actor Instance:** stable authored Scene/Room/World placement/reference with overrides and explicit persistence bindings.
- **Runtime Actor:** ephemeral execution slot with a generation value and transient state.
- **Persistent State Record:** one explicitly declared Room/World variable keyed by stable authored owner/variable identity; never a Runtime Actor snapshot.

The structured state table is authoritative. States and transitions use stable IDs and ordered typed operations. At most one transition commits per tick, chosen by priority then authored order. Templates are authoring recipes that create these records. Every condition/action has an explicit operand schema; invalid operands fail before code generation. Unknown operations survive authoring but reject executable builds. Each runtime profile enumerates its executable operations, and unsupported canonical operations fail before ROM emission rather than becoming no-ops.

The only templates are Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door. The compatibility adapter leaves legacy Player/Target authoring intact. Its canonical Sideview Player binding explicitly delegates movement, collision and animation to the retained Player executor; 1.9.0 does not claim full generic-runtime Player unification. With Gameplay Core unused, the five pinned legacy ROMs remain byte-identical.

Generated single-room and World runtimes execute the bounded generic actor evaluator, in-session persistent variables, pickups, switches/doors, contact hazards and patrol movement. The mapper-0 profile permits 64 one-byte persistent values at `$0380`–`$03BF`; max+1 rejects before emission and cannot overlap actor health at `$03C0`. Reconstruction resets Runtime Actor working state and increments slot generations while preserving declared Room/World values. Reset/power-cycle returns persistence to authored defaults because no save backend exists.

The corrected executable path includes generic Actor Instances from every World reachable through authored links, not only the starting World. WorldCompiler owns that reachability set; GameplayCompiler retains unreachable records as authoring data with diagnostics. The 12 executable slots cover the whole plan, including the compatibility Player. Overflow rejects; actor streaming is not part of 1.9.0.

GameplayModel's component schema is consumed by GameplayUI and GameplayCompiler. Invalid known fields reject before emission, including after supported defaults/overrides. Behavior-action ContactDamage operands and Actor Instance persistence bindings are authoritative; component mirrors cannot silently compete. Disabled Behavior is fully inert at initialization, update and reconstruction while the Actor and supported rendering remain intact. Generated overlap uses unsigned axis distances, preserving strict threshold and World screen-isolation semantics.

Gameplay Core provides typed table controls to create, edit and remove Actor Definitions, Actor Instances, components, parameters, states, transitions, conditions/actions, Room/World variables and bindings. Instance placement exposes applicable Scene, World and Room owners. Raw JSON is not required for core authoring.

## Preserved architecture

1.8 Audio remains canonical and unchanged: tracker/instruments/SFX feed AudioCompiler and NES playback; MIDI and MusicXML are boundary formats into the same representation. 1.7 World traversal remains on mapper 0 with whole-screen transitions. ProjectStore, BuildGraph/RuntimeCompiler, emulator, Runtime Capture, Save As and CHR ownership remain protected.

Forward authoring and reverse engineering converge on canonical NES Forge representations. This bridge normalizes one supported static room and pulse driver into existing scene, collision and Audio records. It carries source hashes/byte spans in a separate report and makes project transfer explicit. Future canonical Raster Events, runtime profiles, mapper/resource linking, Method Registry, integrated tracing and live edits remain separately gated. Captured, Represented and Compilable are separate claims.

## Hard product boundary and future eras

NES Forge remains an **NES / 8-bit / 6502-class environment**. Its canonical client/game target is NES/Famicom-class CPU, PPU, APU, resources, input and mapper/runtime behavior. Modern infrastructure may surround that client for builds, RE, hosting, networking, persistence, matchmaking, collaboration and communication, but must not replace it with a modern native engine, 3D runtime, 16-bit target or cosmetic “NES-looking” client. A future SNES/65C816 environment would be a separate product.

The authoritative roadmap eras are:

- **1.x — Create:** stabilize 1.9.0, then separately authorize 1.9.1 gameplay, 1.9.2 behavior UX and 1.9.3 Audio completion. Preserve the delivered 1.8 Audio capabilities and prove the complete authoring/import-to-ROM-and-reopen workflow.
- **2.x — Understand & Manipulate:** mapper/resource linking, runtime profiles and Raster Events, then deliberate RE/evidence, Method Registry, integrated analysis and controlled live manipulation. A finite supported-example RE acceptance gate precedes hosted worlds/wallet integration; broader compatibility can continue later. D048 brings one supported native-ROM decode/import/edit/build example into the current candidate ahead of the larger 2.x implementation. Full engine coverage, runtime/linker foundations, Method Registry and live integration remain separately gated.
- **3.x — Connect:** authoritative hosted sessions/worlds and inventories, gameplay-earned items, then test-network minting, wallet ownership and explicitly consented loot-loss settlement, alongside separately scoped networking/social features. Audio/RE completion gates precede this era; no 3.x implementation is authorized.
- **4.x — Tech deck:** prove development/deployment, client and server roles on existing hardware, then a physical prototype using Wi-Fi/cellular with a separately constrained optional mesh mode. Hardware investigation may branch once hosted foundations work; no 4.x implementation is authorized.

A large Hosted World may retain state far beyond one NES instance, but each client receives only an interest/proximity-filtered NES-compatible local projection. The NES remains the game client. Networking transports typed domain events and does not own Gameplay, World, Inventory, Economy, Audio or Voice semantics. Future Session, Player, Hosted World and Account persistence scopes wait for 3.x and must not alter current Transient/Room/World semantics prematurely.

The five-template limit remains unchanged. Switch + Door is an alpha proof of identity, linked persistence, switch control, active/inactive behavior and visual state—not a finalized blocking/traversal contract. Configurable physical Door behavior remains candidate 1.9.1 scope and is not authorized.

## Explicitly outside this candidate

- 1.9.1: projectiles, moving platforms, in-session checkpoints, NPC/basic dialogue interaction, ladders, one-way platforms and richer combat/traversal/events;
- 1.9.2: visual state graph and expanded behavior/template UX;
- 1.9.3: Audio completion and end-to-end acceptance;
- Game/Global persistence, actor snapshots, SRAM/password/save slots or other save backends;
- mapper/runtime profiles, smooth scrolling, Raster Events, incremental compilation, LiveLink or hot reload;
- Audio expansion, RE beyond the D048 native-room profile, Method Registry and later milestones;
- NESmaker/other ASM project migration, Lua script APIs or other language adapters;
- Hosted Worlds, networking/netplay, remote persistence, economy/crafting/construction, large matches, social/voice and collaborative creation;
- SNES/65C816, 16-bit, 3D or modern-engine game targets;
- wallet/minting/loot-loss services, physical tech-deck development or Meshtastic integration;
- protected-system rewrites.

The integrated slice must remain tied to its supported engine and must not turn the first example into a claim of arbitrary game recovery. The next numbered gameplay tranche awaiting authorization remains **1.9.1 — Gameplay Expansion**. Its first dialogue behavior remains minimal display/reference/acknowledgement with no branching language; checkpoints remain in-session; projectile ownership adds no faction/team/reputation system.

## RE bridge boundaries

`Forge.services.REBridge.analyze(bytes, name)` copies ROM bytes before asynchronous hashing and returns frozen evidence plus a detached native-project export. It checks the iNES profile, engine fingerprint/vectors, decoded collision, palette normalization and supported pulse timers before exposing import. `Forge.services.REBridge.importProject(analysis)` revalidates and uses `Forge166.project.replaceProject` for the existing undoable replacement path. Scene/collision/Audio models and compilers stay authoritative; the bridge does not patch original machine code or introduce a parallel asset store.

ProjectStore's bounded change rejects known inspection-report formats with actionable guidance before checking project scenes. Invalid reports must leave project, history, identity and playback unchanged. The evidence report is not a Forge project. `Download Forge project JSON` is a real portable schema-12 authoring document.

The recovered collision representation uses native 0/1 cell data, not visual inference. The supplied 16-row Pulse 1 song has a constant-volume instrument and 12 frames per row. No original source, general sound driver, SFX or executable behavior model is reconstructed. Preserve the separate original ROM for direct comparison.

## Mobile follow-up boundaries

`docs/MOBILE_PLAY.md` documents the user-facing input and play-view contract. Additive adapters and explicit wrappers may read local input, release it on lifecycle events, pause safely, and change the surrounding presentation. Existing protected emulator/capture/Save As/CHR source remains intact; do not replace protection hashes to excuse source changes. The one-port adapter is not a generalized networking input or multi-player assignment system.

No gameplay schema, template, generated-ROM engine, CPU/PPU/APU implementation, capture format, save transport, mapper, raster, LiveLink or hosted feature change is part of this bridge candidate. Preserve schema 12, the five-template limit, 12-actor plan and 64 persistent-byte profile.

## Evidence and next operator action

Read `docs/RE_BRIDGE.md` for the current supported recovery and user walkthrough. The new candidate reports include `re-bridge-model.json`, `re-bridge-ui.json`, `re-bridge-runtime.json` and `re-report-import.json` under `test-results/candidate/`, alongside all retained suites. Read `docs/MOBILE_PERFORMANCE_REVIEW.md` for historical presentation-call evidence. Read `build-inputs.json` for the current HTML identity, `test-results/candidate/Summary.json` for the full automated gate, `test-results/browser-mobile/Report.json` for the exact browser-automation coverage and limitations, and `checkpoints/re-bridge-1-clean-extraction/Reproduction.json` for package reproduction. All must identify the delivered candidate; missing/stale reports are not a pass. No current total is inferred from an earlier build.

The corrected input is retained at `baseline/NES_Forge_1.9.0_Corrected_Reference.html`. Its reference was SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08` and measured 658/658 across 26 suites. That result, the D045 correction report, and `docs/history/1.9.0-corrected-reference/` remain historical reference evidence only.

Next: review the new reports and changes, perform the supported-ROM walkthrough in `docs/RE_BRIDGE.md`, complete actual-device checks in `docs/BROWSER_QA.md`, record residual limitations, and request owner acceptance of this exact candidate. Automated browser/VM results do not establish physical iPhone/Android behavior, USB/Bluetooth interoperability, native file-picker behavior, audible speaker output or independent NES hardware timing. No physical-device pass is claimed. Browser walkthrough remains pending: the available Chromium executable is missing.

The workshop is still instructions performed in the existing environment. Expanded manual PDF editions and the revised Alpha Review Kit were completed September 30 as separate deliverables. The owner completed tutorial steps 1–9 with guidance and reports its ROM running in another emulator; those prior-build observations do not certify this candidate. Preserve clear accessible community workflows. Recommend a private GitHub repository after stabilization and before substantive RE development; this bounded integrated example need not wait, and no repository has been created or publication authorized.
