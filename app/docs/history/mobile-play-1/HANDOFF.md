# NES Forge 1.9.0 Alpha — mobile-play-1 handoff

## Current scope

The owner authorized the bounded **Mobile Play & Controller Support** follow-up on September 28, 2026 by saying **“ok let's begin”** after the roadmap update. D046 records that authority. This candidate remains **1.9.0 — Gameplay Core**, maturity **Alpha**, candidate **`mobile-play-1`**. The corrected candidate is the preserved input reference; this follow-up requires its own hashes, tests and acceptance.

Deliver touch controls, expanded/native-fullscreen play and one local OS-recognized gamepad with button mapping inside the existing Emulator tab. Retain keyboard controls and the existing Build & Run / Run Original / capture paths. Implementation authorization does not imply promotion or permission for 1.9.1, 1.9.2 or any later work.

Entry points:

- application: `mainline/NES_Forge_1.9.0_Gameplay_Core.html`;
- authoritative sources: `source-manifest.json` and `src/`;
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

Forward authoring and reverse engineering must converge on the same canonical NES Forge representations. Those representations must eventually cover assets and time-dependent NES behavior. Canonical Raster Events, runtime profiles and mapper/resource linking begin at 2.0; RE provenance follows at 2.1; Raster Methods at 2.2; integrated analysis at 2.3; live timing-sensitive edits at 2.4. Captured, Represented and Compilable are separate claims.

## Hard product boundary and future eras

NES Forge remains an **NES / 8-bit / 6502-class environment**. Its canonical client/game target is NES/Famicom-class CPU, PPU, APU, resources, input and mapper/runtime behavior. Modern infrastructure may surround that client for builds, RE, hosting, networking, persistence, matchmaking, collaboration and communication, but must not replace it with a modern native engine, 3D runtime, 16-bit target or cosmetic “NES-looking” client. A future SNES/65C816 environment would be a separate product.

The authoritative roadmap eras are:

- **1.x — Create:** visually build complete original NES games. The 1.9.0 Mobile Play follow-up is authorized; 1.9.1 follows it in order but is unauthorized.
- **2.x — Understand & Manipulate:** mapper/resource linking, runtime profiles and Raster Events, then deliberate RE/evidence, Method Registry, integrated analysis and controlled live manipulation. No 2.x work is authorized.
- **3.x — Connect:** Hosted Session/Network Foundation, traditional netplay, hosted runtime events, persistent Hosted Worlds, economy/crafting/construction services, large matches, social/voice and collaborative creation. No 3.x work is authorized.

A large Hosted World may retain state far beyond one NES instance, but each client receives only an interest/proximity-filtered NES-compatible local projection. The NES remains the game client. Networking transports typed domain events and does not own Gameplay, World, Inventory, Economy, Audio or Voice semantics. Future Session, Player, Hosted World and Account persistence scopes wait for 3.x and must not alter current Transient/Room/World semantics prematurely.

The five-template limit remains unchanged. Switch + Door is an alpha proof of identity, linked persistence, switch control, active/inactive behavior and visual state—not a finalized blocking/traversal contract. Configurable physical Door behavior remains candidate 1.9.1 scope and is not authorized.

## Explicitly outside this candidate

- 1.9.1: projectiles, moving platforms, in-session checkpoints, NPC/basic dialogue interaction, ladders, one-way platforms and richer combat/traversal/events;
- 1.9.2: visual state graph and expanded behavior/template UX;
- Game/Global persistence, actor snapshots, SRAM/password/save slots or other save backends;
- mapper/runtime profiles, smooth scrolling, Raster Events, incremental compilation, LiveLink or hot reload;
- Audio expansion, RE integration, Method Registry and later milestones;
- Hosted Worlds, networking/netplay, remote persistence, economy/crafting/construction, large matches, social/voice and collaborative creation;
- SNES/65C816, 16-bit, 3D or modern-engine game targets;
- protected-system rewrites.

After this bounded follow-up and acceptance review, the next numbered tranche awaiting authorization is **1.9.1 — Gameplay Expansion**. Its first dialogue behavior remains minimal display/reference/acknowledgement with no branching language; checkpoints remain in-session; projectile ownership uses only minimum generation-safe source/collision filtering and introduces no faction/team/reputation system.

## Mobile follow-up boundaries

`docs/MOBILE_PLAY.md` documents the user-facing input and play-view contract. Additive adapters and explicit wrappers may read local input, release it on lifecycle events, pause safely, and change the surrounding presentation. Existing protected emulator/capture/Save As/CHR source remains intact; do not replace protection hashes to excuse source changes. The one-port adapter is not a generalized networking input or multi-player assignment system.

No gameplay schema, template, generated-ROM behavior, CPU/PPU/APU implementation, capture format, save transport, mapper, raster, LiveLink or hosted feature change is authorized. Preserve schema 12, the five-template limit, 12-actor plan and 64 persistent-byte profile.

## Evidence and next operator action

Read `build-inputs.json` for the current HTML identity, `test-results/candidate/Summary.json` for the full automated gate, `test-results/browser-mobile/Report.json` for the exact browser-automation coverage and limitations, and `checkpoints/1.9.0-clean-extraction/Reproduction.json` for package reproduction. All must identify the delivered candidate; missing/stale reports are not a pass. No current total is inferred from an earlier build.

The corrected input is retained at `baseline/NES_Forge_1.9.0_Corrected_Reference.html`. Its reference was SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08` and measured 658/658 across 26 suites. That result, the D045 correction report, and `docs/history/1.9.0-corrected-reference/` remain historical reference evidence only.

Next: review the new reports and changes, complete actual-device checks in `docs/BROWSER_QA.md`, record residual limitations, and request owner acceptance of this exact candidate. Automated browser/VM results do not establish physical iPhone/Android behavior, USB/Bluetooth interoperability, native file-picker behavior, audible speaker output or independent NES hardware timing. No physical-device pass is claimed.

The workshop is still instructions performed in the existing environment. Expanded manual PDF editions and the combined final documentation ZIP remain separate unfinished work; do not present this application package as their completion.
