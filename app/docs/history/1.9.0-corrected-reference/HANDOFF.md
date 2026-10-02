# NES Forge 1.9.0 Gameplay Core handoff

## Current scope

The user explicitly authorized **1.9.0 — Gameplay Core only**, then authorized the bounded D045 correction against audited candidate SHA-256 `4d4da4547c641d71e685cd688ea421158460605f9ec3b0f201c4eba56227f6a1`. This package is the resulting corrected candidate for independent audit and manual browser closeout; it is not an automatic baseline promotion. The 2026-09-15 governance update adds future product/architecture direction only. Do not begin 1.9.1, 1.9.2 or any later milestone without explicit authorization.

Entry points:

- application: `mainline/NES_Forge_1.9.0_Gameplay_Core.html`;
- authoritative sources: `source-manifest.json` and `src/`;
- gameplay model/compiler/runtime/UI: `src/gameplay/`;
- ProjectStore and dispatch: `src/services/project-store.js`, `src/services/build-services.js`;
- controlling contract: `docs/GAMEPLAY_SYSTEMS_1.9_PLAN.md`;
- editable example: `examples/Scout_Gameplay_Core_1.9.0.nesforge.json` and matching `.nes`;
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

- **1.x — Create:** visually build complete original NES games. 1.9.0 remains the current candidate; 1.9.1 is next in order but unauthorized.
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

The next exact tranche awaiting authorization is **1.9.1 — Gameplay Expansion**. Its first dialogue behavior remains minimal display/reference/acknowledgement with no branching language; checkpoints remain in-session; projectile ownership uses only minimum generation-safe source/collision filtering and introduces no faction/team/reputation system.

## Evidence

The corrected standalone HTML is SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08` (1,074,708 bytes). `CURRENT_BASELINE.md`, `docs/1.9.0_CORRECTION_REPORT.md`, `test-results/candidate/Summary.json` and `checkpoints/1.9.0-clean-extraction/Reproduction.json` record the clean-extraction result: **658/658 checks across 26 suites**, with 0 failures/skips. The dedicated 35-case Gameplay Core suite includes the four reproduced contract regressions plus the stronger owner-approved boundaries. All five legacy whole-ROM oracles remain byte-identical. Automated VM and bundled-emulator evidence does not establish real-browser layout/native picker acceptance, audible speaker output or independent hardware accuracy.
