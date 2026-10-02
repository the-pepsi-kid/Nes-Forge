# NES Forge — Authoritative Roadmap
**Revision date:** 2026-09-30 (America/Denver), audio / RE / hosted-items / tech-deck revision  
**Status:** Current planning sequence and product-scope authority; later implementation remains separately bounded

**September 30 continuation:** The owner said “Ok, let's continue” after the immediate mobile-stabilization plan. A bounded presentation follow-up, **mobile-play-2**, is prepared for review: HTML SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`. It defers hidden editor-sidebar work during expanded Play and avoids unchanged canvas sizing work. Its exact automated evidence belongs to its own `test-results/candidate/Summary.json`, not the older totals below. CPU/PPU/APU, timing and audio buffering are unchanged. Device-level lag improvement and owner acceptance are still unverified.

**September 30 review reference:** The preserved prior application is **1.9.0 Alpha / mobile-play-1**, SHA-256 `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`. Its September 28 suite passed **702/702 cases across 28 suites**. The owner reported working mobile touch, mobile audio/video lag, a successful guided tutorial through steps 1–9, and playback of that tutorial ROM in another emulator. The independent emulator's name/version, ROM hash and device details were not supplied; this is an owner-reported project result, not a general compatibility certificate. Physical controllers remain untested; physical NES-console testing is a separate unverified track.

**Documentation:** The expanded manual, tutorial and operator-reference PDFs were delivered after rendering and visual checks. Review-kit revision 2 corrects the tutorial's tab locations, separate World fields, palette explanation and Player selection; adds an editable feedback form and portable reproduction instructions; and records the completed owner walkthrough. The original application/source ZIP remains unchanged. Historical statements below about pending documentation are superseded by this update.

**September 30 owner direction:** Put audio and reverse engineering before the connected platform. The long-term goal now explicitly includes developer-hosted custom Worlds, server-sold and gameplay-earned mintable items, wallet ownership, opted-in loss of eligible loot in combat, and a physical tech deck that can develop/deploy, play as a client, or host a server. Wi-Fi and cellular are the primary internet paths; Meshtastic is an optional transport investigation. Solana is the preferred initial low-fee candidate, subject to review of the existing crypto project and measured total costs.

**Latest September 30 priority:** The owner then instructed that RE needs to start now because the authoring environment is in a good state. Bring forward **RE Entry A: branch intake and evidence-backed ROM inspection**, in parallel with remaining mobile closeout. Do not require 1.9.1, 1.9.2, 1.9.3, GitHub setup or every proposed 2.0 linker capability to finish before that bounded read-only work. This supersedes the earlier strictly sequential placement of all RE after Audio Studio completion.

**Proceed by dependency:** Finish packaging the bounded mobile correction and begin RE Entry A now. Keep planned gameplay/behavior improvements and Audio Studio completion as separately scoped work; integrate deeper RE adapters as their resource/profile contracts become ready. Audio and the finite supported-RE gate still precede hosted Worlds and wallet implementation. Establish authoritative hosted Worlds and inventories before mintable ownership and consented loot loss. Prove portable server/client/development roles on existing hardware before a custom tech deck. Repeating the owner's whole tutorial is not a new gate.

The initial roadmap request was planning authority. The later continuation and RE-start instructions authorize the bounded work recorded above, not wholesale integration or release promotion. Existing implementation authorization remains in force for its bounded scope. Assembly-source export is not an established current capability. Milestone numbers below are planning identifiers, not delivery dates.

| Priority | Milestone | Milestone outcome / dependency |
| --- | --- | --- |
| 1 | 1.9.0 Alpha stabilization | Reproduce/profile mobile A/V lag, document input isolation and physical-controller/device results, review the exact candidate and unresolved limits for acceptance. |
| Now, parallel | RE Entry A — intake and inspection | Audit the existing RE branch; establish ROM identity, safe physical addressing and evidence-backed inspection without changing the active project. |
| Foundation | GitHub setup after stabilization, before substantial RE integration | Recommended private source repository, frozen reference tags, issue tracking and reproducible checks. Initial local RE intake need not wait. Public release follows an explicit licensing/contribution decision; no repository has been created. |
| 2 | 1.9.1 Gameplay Expansion | Deliver bounded gameplay capabilities, including Door traversal semantics, exercised in a small original playable game. |
| 3 | 1.9.2 Behavior UX | Author and diagnose the same canonical behaviors through a visual graph; retain table parity. |
| 4 | 1.9.3 Audio workflow verification and completion | Demonstrate author/import → edit → build → audible ROM playback → save/reopen for the declared supported audio scope. |
| 5 | 2.x Resource foundation and supported RE | Inspect, decode, edit and rebuild a declared set of assets and an audio-driver example with provenance; unknowns remain explicit. Pass the finite RE readiness gate below. |
| 6 | 3.0, 3.2–3.3 Hosted gameplay foundation | Two clients use a server-authoritative World with durable inventory and reconnect recovery. 3.1 traditional netplay is a separate optional branch. |
| 7 | 3.4.1–3.4.4 Economy and wallet items | Prove ordinary inventories and earned loot, audit the existing crypto project, validate minting on a test network, then validate consented loss settlement. |
| 8 | 4.0–4.3 Portable platform and tech deck | Branch after hosted foundations; real-value wallet launch is not a prerequisite. Prove develop/build/deploy, client and server roles on existing hardware; measure mesh feasibility; then validate a physical prototype. |

Large matches, voice, and collaborative creation remain 3.x extensions. Their milestone numbers do not make every extension a prerequisite for a tech-deck prototype. Continuous RE knowledge expansion also continues alongside later work after the bounded readiness gate passes.

**Immediate next work:** record the phone/OS/browser, affected ROM and reproducible steps for mobile lag; separate simulation speed, rendering, input latency and audio behavior; compare against the existing desktop reference before selecting any correction. Record physical-controller results when devices are available. These are host playback/input checks, not a restart of the accepted 1.8 Audio Runtime work. No arbitrary-ROM or NES-console compatibility claim follows from the successful tutorial ROM.

**September 28 implementation authority:** After the September 28 roadmap update, the owner instructed **“ok let's begin.”** This authorizes the bounded Mobile Play & Controller Support follow-up only, recorded in D046. Deliver **1.9.0 Gameplay Core — Alpha**, candidate **`mobile-play-1`**, with its own hash and verification. Acceptance/promotion and 1.9.1/1.9.2 or later work are not authorized by that instruction. Historical corrected-reference evidence below remains tied to its original artifact.

**September 28 update:** Record NES Forge's current maturity as a functional alpha and insert a bounded Mobile Play & Controller Support follow-up before Gameplay Expansion. Reconcile 1.9.0 status with the corrected candidate and September 17 re-audit, including its September 24 review correction. This roadmap edit records scope and priority; it does not claim implementation, build acceptance, or release promotion. The existing 1.9.1, 1.9.2, 2.x, and 3.x milestone assignments remain in place. The filename retains its original date to preserve this document's identity; the revision date above is current.

---

# 1. Product vision

NES Forge is an **8-bit NES / 6502-class game-development, runtime, reverse-engineering, and hosted-world environment**.

Its purpose is to let developers:

- create original NES games from scratch;
- author CHR, metatiles, Worlds, sprites/metasprites, animation, gameplay, audio, and runtime behavior;
- compile those projects into real NES-compatible ROMs;
- run, inspect, debug, and eventually live-edit those ROMs;
- reverse engineer user-supplied NES ROMs into canonical NES Forge concepts;
- accumulate reusable knowledge about historical NES development methods;
- eventually connect NES games into multiplayer and persistent Hosted Worlds;
- let developers define server inventories, earned items, optional wallet ownership and explicit loot-loss rules;
- eventually develop, build, deploy, play and host from a portable tech deck.

The game target remains intentionally constrained to the NES class of hardware and presentation.

## Accessible NES/6502 developer tools

Owner direction, September 30: aim to provide the tools the NES/6502 developer community needs, including capabilities developers struggle to access because of cost, fragmented workflows or stalled development. This is a product objective, not a claim that every competing tool is paid or incomplete, or that Forge already provides every capability.

Evaluate the complete workflow: graphics and World creation; assembler/build/link/export paths; audio composition and interchange; bank-aware disassembly; breakpoints/watchpoints; CPU/PPU/APU inspection; tracing/coverage/profiling; asset and audio recovery; controlled live editing; reproducible examples and extensibility. Map each request to an existing capability, a verified gap or a separately scoped proposal. Broad community interest does not expand the game target beyond NES/8-bit/6502.

Use actual developer interviews, issue reports and reproducible examples to prioritize gaps. Track requested behavior, available alternatives, access/licensing barriers, effort/dependencies and acceptance evidence. Favor portable projects, documented formats, usable export and reproducible builds so developers can retain their work. Affordability and access are design requirements; final licensing, source-publication policy and pricing remain explicit owner decisions, not implicit commitments in this revision.

## Source control and community sequence

Recommend establishing a **private GitHub repository after this stabilization round and before substantial RE integration**, rather than waiting for RE completion. The owner's subsequent RE-start instruction allows initial local intake/inspection now; GitHub account setup is not a blocker for it. Keep the standalone HTML deliverable; source control supports its development.

The initial setup should preserve the exact source, build/test commands, frozen references and release evidence; add a documented branch/review process, regression CI and an issue backlog organized by milestone. Select the owner/organization and repository name when setup begins. Review what belongs in source versus release assets and exclude credentials and unrelated user files.

Public community access is a later publication decision with an explicit license, contribution guide, issue templates, supported-scope documentation and reproducible starter workflows. Check distribution rights for bundled dependencies and ROM fixtures before public publication. Private repository setup does not commit to a paid service, particular license or immediate public launch. No GitHub repository or remote publication has been created by this update.

---

# 2. Hard platform-scope rule

## NES Forge stays NES

NES Forge targets:

- Nintendo Entertainment System / Famicom-class runtime behavior;
- 8-bit game presentation;
- Ricoh 2A03 / 2A07 6502-derived CPU semantics;
- NES PPU graphics concepts;
- CHR / tiles / metatiles;
- NES sprites / metasprites;
- NES palette limitations;
- NES APU-style audio;
- NES-compatible mapper/runtime architectures;
- NES-style controller/input concepts;
- generated 6502-class game logic.

Modern host infrastructure may be used for:

- development tooling;
- build services;
- multiplayer transport;
- Hosted World persistence;
- matchmaking;
- account/session services;
- collaboration;
- voice/text communication;
- reverse-engineering analysis;
- Method Registry / knowledge sharing;
- testing and automation;
- wallet authentication, item issuance and ownership settlement;
- portable server/client/development hosts and deployment management;
- internet and optional constrained-mesh transport adapters.

However, those services **must not change the canonical game target into a modern engine, 3D engine, 16-bit runtime, or non-NES presentation model**.

## Explicitly out of product scope

NES Forge must not drift into:

- 3D game engines;
- modern GPU/scene-graph runtimes;
- 16-bit console output;
- SNES/65C816 runtime assumptions;
- Unity/Unreal-style client runtimes;
- “NES-looking” games that are actually modern native games under the hood.

If a future 16-bit environment is ever created, it should be a **separate product/environment** such as a future “SNES Forge,” with its own architecture, hardware model, compiler, runtime, and compatibility contract.

NES Forge itself remains 8-bit NES / 6502-class.

---

# 3. Core architecture model

NES Forge follows a **domain-oriented modular-monolith architecture**.

Major problem areas are treated as domains / bounded contexts with explicit ownership.

Current and future domains include:

- CHR / Graphics
- Metatiles
- World
- Metasprites
- Animation
- Gameplay
- Audio
- Raster / time-dependent rendering behavior
- Reverse Engineering
- Method Registry / Knowledge Base
- Hosted Session / Networking
- Hosted World persistence
- Inventory / Crafting / Economy
- Wallet / Asset Ownership integration
- Deployment / Portable Host
- Social / Voice
- Collaboration

Each domain owns its:

- canonical data model;
- validation;
- authoring behavior;
- compilation semantics;
- domain-specific tests.

Cross-domain interaction should occur through:

- stable IDs;
- typed references;
- declared dependencies;
- versioned contracts;
- events;
- explicit adapters/conversion bridges.

No domain should depend directly on another domain's private implementation.

---

# 4. Lifecycle and capability-path rules

## Domains own concepts

Example:

- Audio owns Songs/SFX/Instrument semantics.
- World owns Rooms/Entrances/Map structure.
- Gameplay owns Actors/Behaviors/Persistence semantics.
- RE owns evidence/provenance and decoding.
- Networking owns transport/session synchronization.

## Object lifecycles must be explicit

Example Actor lifecycle:

Actor Definition
→ Actor Instance
→ compiled runtime representation
→ Runtime Actor
→ transient runtime state
→ explicit persistent Room/World state
→ despawn/reconstruction

## End-to-end capability paths matter

A feature is not complete merely because an editor exists.

Example Audio capability path:

MusicXML / MIDI / manual authoring
→ NES Forge Audio
→ validation
→ AudioCompiler
→ ROM
→ NES APU runtime
→ reimport / inspection

Example World capability path:

CHR
→ Metatile
→ World placement
→ BuildGraph
→ compiled resource
→ runtime traversal/collision
→ ROM reimport

## Vertical slices prove paths

A vertical slice may span multiple domains and infrastructure layers, but must not erase domain ownership boundaries.

---

# 5. Standing architecture principles

1. **Preserve verified behavior first; simplify architecture second.**
2. **Interesting ideas are not authorization.**
3. **Do not advance later milestones automatically.**
4. **Unknown/unsupported behavior must not be silently approximated.**
5. **Forward authoring and reverse engineering converge on the same canonical NES Forge representations.**
6. **Canonical representations must eventually cover static assets and time-dependent NES behavior.**
7. **Prefer capability-based canonical abstractions over hard-coded role-specific implementations.**
8. **RE may map concrete ROM techniques upward into canonical abstractions, but must preserve implementation provenance.**
9. **Major canonical objects should have explicit supported lifecycles and end-to-end capability paths.**
10. **Cross-domain dependencies should be explicit and acyclic wherever practical.**
11. **BuildGraph coordinates dependencies; it does not own domain semantics.**
12. **Modern hosting/networking infrastructure may extend the NES experience but must not replace the NES runtime target.**

---

# 6. Current milestone status

## Product maturity — Functional alpha

NES Forge has a working create/edit → build NES ROM → run/test workflow. The owner reported a successful mobile-browser demonstration on September 28. That is useful qualitative feedback, not a substitute for a recorded device/browser acceptance matrix.

Use **NES Forge 1.9.0 — Alpha** as the current product-maturity description. The presentation follow-up mobile-play-2 remains pending acceptance; mobile-play-1 is its preserved comparison reference. This wording does not promote a release.

Beta readiness should be judged by reliable, repeatable create → build → play → save → reopen workflows for new users, completion of the intended beta feature scope, accurate instructions, and documented coverage on supported browsers. Neither the alpha label nor a version increment automatically satisfies those criteria.

Application acceptance, documentation delivery, and independent NES hardware evidence remain separate status tracks.

---

## 1.7 — World Runtime
Completed baseline / closeout.

Established:

- executable World data;
- multi-screen traversal;
- World transitions;
- collision;
- player runtime;
- generated 6502 World runtime;
- editable ROM/project round-trip.

Screen-transition behavior is current. Smooth scrolling is deferred to future runtime profiles.

---

## 1.8 — Audio Runtime
Accepted baseline before 1.9.

Established:

- runtime NES music;
- runtime SFX;
- animation `sound` events;
- Pulse 1 / Pulse 2 / Triangle / Noise playback;
- MIDI import;
- MusicXML import.

### Audio interchange policy

**NES Forge Audio remains canonical.**

**MusicXML is the preferred notation-level interchange format.**

MIDI remains supported as a performance/event interchange format.

Future RE audio decoding should produce:

ROM audio
→ NES Forge Audio
→ MusicXML / MIDI / native editable project representation

NES-specific implementation details that MusicXML cannot preserve losslessly remain in native NES Forge Audio.

---

# 7. 1.9 — General Gameplay Systems

Goal:

> Turn the current playable World runtime into a generalized visual NES gameplay system.

Do not grow a privileged Player/Target model into a catalog of hard-coded roles.

Use:

- Actor Definitions;
- Actor Instances;
- Runtime Actors;
- explicit persistent state records;
- typed components;
- canonical state-table behaviors;
- capability composition.

## 1.9.0 — Gameplay Core

Current status:
**Functional alpha; presentation follow-up mobile-play-2 is under review, with remaining browser/device closeout and owner acceptance still pending.**

Current evidence:

- Presentation follow-up: **mobile-play-2**, SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`; read its packaged current test report for measured totals and its review note for remaining device checks.
- Prior comparison application: **1.9.0 Alpha / mobile-play-1**, SHA-256 `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12`; September 28 clean-extraction suite **702/702 cases across 28 suites**. These results are retained evidence, not certification of new application bytes.
- Historical corrected reference: SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08`; September 17 clean-extraction audit **658/658 cases across 26 suites**, zero failures or skips.
- The corrected reference addressed reachable destination-World actors, invalid component-value emission, disabled Behavior execution, and opposite-edge overlap. The mobile candidate inherits that correction coverage.
- Native-browser layout/input, project lifecycle, file dialogs, and audible output still need documented closeout. The owner's mobile demonstration does not close that full checklist.
- Expanded printable documentation was completed September 30; revision 2 incorporates the owner walkthrough findings. Documentation completion is separate from application acceptance.
- Independent NES hardware timing/compatibility remains unverified. This roadmap update does not introduce a new physical-console acceptance gate.

Keep schema 12, the five-template limit, the 12-executable-actor plan limit, and the 64-persistent-byte limit. Retain the documented single-room partial editable recovery and one-way `syncActiveFromPersistent` contract. Native JSON/ZIP remains the complete project-backup path; generated-ROM recovery depends on its profile.

The September 24 audit correction withdrew the duplicate-`metaStats` finding; it is not an outstanding defect. Generic actor canvas placement and a generic animation/metasprite bridge remain proposals outside the approved 1.9.0 core and outside the mobile-play follow-up.

Approved core:

- Actor Definitions;
- Actor Instances;
- ephemeral Runtime Actor identity;
- typed components;
- typed parameters;
- canonical state-table behaviors;
- deterministic transition evaluation;
- explicit Room/World variables;
- legacy Player compatibility binding;
- table-oriented authoring;
- single-room + World integration;
- schema 12.

Exactly five templates:

1. Sideview Player
2. Ground Patrol Enemy
3. Stationary Contact Hazard
4. Collectible Pickup
5. Switch + Door

### Switch + Door policy

The 1.9.0 Door is an **alpha gameplay template** proving:

- stable identity;
- persistent linked state;
- switch control;
- active/inactive behavior;
- visual state.

It is **not yet a finalized traversal/collision contract**.

Physical blocking and richer configurable Door effects are deferred to 1.9.1.

This preserves abstraction so future Doors may support:

- solid-until-open;
- key locks;
- timed opening;
- destructibility;
- damage barriers;
- one-way traversal;
- room transitions;
- collision-group filtering;
- other NES-appropriate behaviors.

---

## 1.9.0 alpha follow-up — Mobile Play & Controller Support

**Roadmap status:** implementation authorized September 28 after the roadmap update; bounded usability work before 1.9.1. This scope label does not introduce a numbered release. The resulting candidate is `mobile-play-1`, with 702/702 automated cases and owner-reported touch/tutorial results recorded above; remaining device/browser evidence and separate owner acceptance are still open. The corrected candidate remains the historical reference. See D046 and `CURRENT_BASELINE.md`.

**Purpose:** let someone open NES Forge on a phone, run a built or loaded ROM, and control it immediately. This lives inside the **Emulator tab**. The manual and workshop explain and exercise it; they are not a separate emulator environment.

### Delivery order

1. Touch controls plus an expanded Play view and native-fullscreen support where available.
2. One-player physical-controller support through the browser Gamepad API, with controller status and basic remapping.
3. Device/browser verification, desktop regression checks, instructions, and a reviewable candidate package.

### Bounded feature scope

- Retain desktop keyboard controls. Map keyboard, touch, and one selected gamepad to the same NES A/B/Select/Start/directional input semantics.
- Provide touch D-pad, B/A, Select, and Start controls with simultaneous movement/action and A+B input. Track fingers independently, allow D-pad sliding, and release canceled or lost touches. Prevent page scrolling only over the play controls.
- Support compatible USB-C/wired and Bluetooth gamepads recognized by the device's operating system and browser. Pairing stays in OS settings; NES Forge reads the Gamepad API. Show connection state, a press-a-button detection prompt, standard mappings, and basic remapping. Publish tested combinations rather than promising every device.
- Expand the existing emulator canvas and controls together. Request native fullscreen from an explicit user action when available; use a viewport-filling Play view when unavailable or denied. The fallback may retain browser chrome and must not be described as true fullscreen.
- Fit portrait and landscape layouts, preserve aspect ratio and the 256×240 canvas backing size, respect screen safe areas, and keep Pause, Sound, and Exit/Return to editor reachable. Fullscreen and orientation lock must not be prerequisites for play.
- Preserve the loaded/running ROM and project when entering or leaving Play view. Apply the same controls to Build & Run, loaded ROMs, and Run Original ROM.
- Suspend/release input on focus loss, hidden documents, modal interruption, leaving play mode, reset, ROM replacement, and controller disconnection. Clear sources independently and require release to neutral before accepting held controller input after an interruption. Do not let polling recreate stuck input.

### Architecture and scope boundary

Use a small local host input/presentation layer for one NES controller port and a narrowly scoped connection to the existing controller reader. Physical-controller support is part of the deliverable; using it is optional for the player. Keep the existing simulation loop, controller latch semantics, CPU/PPU/APU behavior, and capture pipeline. Do not create a second emulator loop or replace the canvas used by capture.

This follow-up does not add templates, change schema or generated-ROM semantics, expand the compiler/mapper/raster/audio runtime, activate LiveLink, or start RE, multiplayer assignment, recording/replay, emulator snapshots, Hosted Worlds, controller-driven editor navigation, or a general mobile editor redesign. Preserve Save As, CHR rendering, undo, and legacy compatibility. Any intended input-hook changes must be explicit in the implementation review; protected-source checks must not be broadly disabled.

### Acceptance evidence

- Verify equivalent NES button states from keyboard, touch, and gamepad; simultaneous inputs; stick dead zones; and a documented opposite-direction policy.
- Verify no stuck input after canceled touches, app switching, focus loss, pause/resume, reset, ROM replacement, controller disconnect/reconnect, or leaving the Emulator tab. Verify controller selection remains correct if a disconnected device's index is reused.
- Verify Play/fullscreen entry, denial/fallback, rotation, and exit without ROM restart, project loss, distorted output, missing controls, or duplicate animation loops.
- Record real-device touch/play/audio results for iPhone Safari and Android Chrome, in portrait and landscape, including interruption/resume. Record actual controller model, connection type, OS, and browser for wired and Bluetooth tests. Untested combinations remain unverified.
- Preserve desktop keyboard, Build & Run/Run Original, screenshot/runtime capture, and generated-ROM output. Run the inherited full clean-extraction gate plus focused input/presentation regressions on the changed candidate; historical 658/658 evidence cannot certify new bytes.
- Package the exact candidate, hashes, changes, automated results, device observations, and remaining limitations for owner acceptance.

Native fullscreen availability must be detected at runtime. Current platform references for implementation planning: [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API), [Fullscreen API requirements](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen), and [WebKit's iPhone fullscreen issue](https://bugs.webkit.org/show_bug.cgi?id=206854). These references inform the fallback; they do not replace tests of the delivered build.

### Parallel documentation and closeout

The September 30 manual, tutorial and operator-reference PDFs have been rendered and visually checked; the revised review kit has been packaged and saved. Keep those documentation results separate from browser/owner application acceptance. Further UI or control changes must update the corresponding instructions. The kit contains a dated roadmap snapshot; this standalone roadmap is the current planning authority and will be incorporated in the next kit revision.

The workshop remains a documented learning path carried out inside the normal NES Forge environment. Embedding a new workshop interface or wizard is outside this follow-up.

---

## 1.9.1 — Gameplay Expansion

Requires separate authorization.

Planned:

- Projectile;
- Moving Platform;
- Checkpoint;
- NPC/basic dialogue interaction;
- ladders;
- one-way platforms;
- richer hitbox/hurtbox combat;
- richer traversal;
- typed gameplay/animation events;
- configurable Door/traversal behavior.

### Checkpoint policy

In-session only at first.

No battery-backed save implication.

### Dialogue policy

Minimal bounded interaction/display/reference behavior first.

No branching dialogue language/system unless separately authorized.

### Projectile policy

Minimum source/self-hit/collision-group semantics only.

No faction/team/reputation system unless separately authorized.

---

## 1.9.2 — Behavior UX

Requires separate authorization.

Planned:

- visual state graph;
- better template authoring;
- behavior diagnostics;
- reference navigation.

The visual graph must edit the exact same canonical state/transition model.

No competing behavior representation.

---

## 1.9.3 — Audio Workflow Verification & Completion

New planned milestone, before the 2.x RE readiness gate and all hosted/wallet implementation. Implementation requires a bounded scope based on the current Audio Studio audit.

**Starting point:** 1.8 already established runtime music, SFX, animation sound events, Pulse 1 / Pulse 2 / Triangle / Noise playback, MIDI import and MusicXML import. Preserve that baseline. First determine which authoring, import, export, editing or playback paths are incomplete; implement demonstrated gaps rather than rebuilding working services.

Planned capability path:

- author and edit a short song, instruments and SFX in canonical NES Forge Audio;
- import a small MIDI and MusicXML example with clear mapping and unsupported-feature diagnostics;
- compile to a generated ROM and verify audible music, SFX and gameplay-triggered sound, including channel contention and interruption/resume;
- save/reopen the complete native project with audio references intact;
- define supported notation/performance export before claiming interchange round-trip; preserve NES-only detail in native data and report lossy conversion;
- provide a repeatable audio workshop and reference project.

**Exit evidence:** exact app/ROM hashes, declared supported channels and import/export subset, reference inputs and expected events, automated regressions, and recorded listening results in Forge plus an independent emulator. Test physical-console audio separately and report it only when performed. Manual authoring and both existing import paths must survive save/reopen without silent changes.

Mobile emulator A/V lag belongs to 1.9.0 stabilization. ROM audio-driver decoding and decoded-audio export belong to supported 2.x RE adapters. Scanned sheet music, photographic tablature, direct FL Studio project import, DPCM and expansion audio are later proposals requiring their own scope; none is implied by MIDI/MusicXML support.

---

# 8. 2.0 — Resource Linker, Runtime Profiles, Raster Model, Live Foundation

This is the next major architecture era.

Deliver the minimum resource/address identity, mapper/profile declaration, source mapping and time-dependent evidence contracts needed for a first supported RE path. Do not wait for every mapper, scrolling profile or LiveLink operation before beginning the bounded RE bridge. Add each runtime/compiler capability behind explicit validation; unsupported captures must not be silently flattened into NROM.

## 2.0.1 — Mapper-aware Resource Linker

Introduce:

- mapper abstraction;
- PRG bank allocation;
- CHR bank allocation;
- relocatable runtime resources;
- stable runtime asset identities;
- dependency-driven packing;
- streaming support;
- mapper-aware validation.

Move beyond assuming one NROM/32 KB execution envelope.

---

## 2.0.2 — Debug/Edit ROM vs Release ROM

Debug/Edit ROM may retain:

- project metadata;
- diagnostic data;
- stable resource identity;
- source mappings;
- LiveLink metadata.

Release ROM should eventually contain only what execution requires.

Distinguish authoring metadata recovery, generated assembly source, disassembly and reconstructed source. Current ROM generation does not establish an editable assembly-export workflow. Decide and scope any such export explicitly; decoded arbitrary-ROM code is not automatically the original source.

---

## 2.0.3 — Runtime Profiles

Potential profiles:

- fixed-screen;
- screen-transition;
- horizontal scrolling;
- vertical scrolling;
- top-down scrolling;
- mixed room/scroll;
- mapper-specific profiles.

All remain NES-class runtime profiles.

---

## 2.0.4 — Canonical Raster Event Model

NES Forge must represent time-dependent NES rendering behavior.

Examples:

- `$2005` scroll changes;
- `$2006` PPU-address changes;
- palette changes;
- CHR bank switching;
- nametable/mirroring changes;
- PPU mask changes;
- mapper writes;
- sprite-0 splits;
- timed raster splits;
- MMC3/mapper IRQ effects;
- HUD/playfield separation.

Three claims remain distinct:

1. Captured
2. Represented
3. Compilable

---

## 2.0.5 — Live Play Foundation

Authoring asset
→ stable resource ID
→ compiler
→ bank/address
→ EmulatorBridge
→ running resource

Then:

- incremental compilation;
- change detection;
- controlled runtime replacement;
- initial LiveLink operations.

---

# 9. 2.1 — RE Bridge + Evidence Model

## RE Entry A — brought forward September 30

This bounded inspection track starts now, alongside mobile closeout. The existing separate RE branch is an input to audit and selectively adapt, not a replacement for the current editor. It does not change the current project schema, generated-ROM formats or release number.

First deliverables:

- recover and identify the exact existing RE branch, notes, fixtures and test evidence;
- establish immutable input-ROM identity and validated header/PRG/CHR/trainer boundaries;
- distinguish physical file/bank offsets from CPU addresses; begin with an explicitly supported mapping such as NROM and label unsupported/dynamic mappings;
- expose reproducible inspection results, vectors/disassembly candidates and raw CHR data with source offsets, mapper context and evidence state;
- keep notes and analysis separate from the active authored project; loading or inspecting a ROM must not silently alter it;
- define an explicit reviewed bridge for later asset conversion, leaving unknown code/data and unsupported audio formats intact.

An early inspector does not require full live editing, general mapper linking, complete audio-driver recovery or a broad graphics/World reconstruction claim. Its exit proof is a small declared fixture corpus, deterministic evidence records, bounds/mapping rejection cases and unchanged active-project/ROM data. The larger 2.x readiness gate still applies before hosted development.

## Full bridge scope

Begin deliberate integration of the separate RE branch.

Do not wholesale-merge it.

Evidence states:

- Observed
- Inferred
- Decoded
- Round-trip validated
- Converted

Unknown remains valid.

Explicit bridges may include:

- Send CHR to Project
- Send Palette to Project
- Create Metatile Library
- Create Scene
- Create World
- Create Metasprite
- Create Animation
- Create Entity data
- Import collision structures
- Send music/SFX to Audio Studio
- Export decoded music to MusicXML/MIDI
- Create Raster Schedule
- create labels/xrefs

Start with identified formats and a small declared corpus. Use Forge-generated ROMs to validate plumbing, then include a permitted independent ROM without embedded Forge source so metadata recovery is not mistaken for reverse engineering. Integrate the separate RE branch through reviewed adapters rather than adopting its current state as trusted.

---

# 10. 2.2 — Method Registry / Forge Knowledge Base

Long-term goal:

> Build a reusable library of NES development methods and techniques, not distributed third-party assets.

Potential method families:

- Mapper Methods
- CHR Methods
- Palette Methods
- Metatile Methods
- World/Map Methods
- Compression Methods
- Metasprite Methods
- Animation Methods
- Entity/Spawn Methods
- Collision Methods
- Audio Driver Methods
- Text Methods
- Raster Methods
- Runtime/state-machine Methods

Ideal method structure:

signature
→ evidence
→ decoder
→ canonical NES Forge representation
→ encoder
→ validation
→ provenance/confidence

Gold-standard validation where possible:

original binary
→ decode
→ canonical representation
→ encode
→ original representation

---

# 11. 2.3 — Integrated RE Workspace

Planned:

- bank-aware disassembly;
- code/data classification;
- labels/xrefs;
- execution coverage;
- mapper state;
- pointer discovery;
- compression tracing;
- CHR/palette provenance;
- OAM/metasprite inspection;
- animation tracing;
- entity/spawn analysis;
- audio-driver analysis;
- World/map analysis;
- raster timeline;
- PPU/IRQ inspection;
- Method Registry matching;
- evidence/confidence visualization.

---

# 12. 2.4 — Live RE / Debugger / Hot Patch

Potential:

- runtime asset selection;
- RAM watches/freeze;
- breakpoints/watchpoints;
- mapper-aware addresses;
- PPU/APU/OAM inspection;
- CHR/palette hot replacement;
- map/metatile edits;
- entity parameter edits;
- music sequence replacement;
- Raster Schedule edits;
- bank-aware ROM shadow patches.

---

# 13. 2.5+ — Continuous Knowledge Expansion

RE is not considered “finished.”

Each ROM may:

- match existing techniques;
- reveal variants;
- introduce new methods;
- improve signatures;
- add validated decoders;
- add validated encoders.

The Method Registry should make later ROMs progressively easier to understand.

## Finite audio / RE readiness gate before 3.x

Audio and reverse engineering precede hosted/wallet work, but universal ROM recovery is not a completion requirement. Before starting 3.x implementation:

1. Accept the 1.9.3 authoring/audio workflow for its declared scope.
2. Declare supported mapper/runtime profiles and freeze a small reference corpus, including an independent source-free input; record hashes and provenance.
3. Prove inspection → decoded canonical data → edit → rebuild → runtime verification for a bounded graphics/World example and at least one supported music/SFX driver example. MusicXML/MIDI export must identify supported semantics and preserve the full NES representation natively.
4. Keep Observed, Inferred, Decoded, Round-trip validated and Converted claims distinct. Preserve unknown data and refuse unsupported executable reconstruction.
5. Demonstrate the inspection/debugging tools required to diagnose those examples, plus regression evidence for original project creation, save/reopen and ROM output.
6. Record unresolved limits and obtain acceptance of that supported slice.

Bit-for-bit re-encoding and behavioral equivalence are different claims and need different evidence. Broad mapper coverage, every proposed 2.4 hot-patch tool and continuing 2.5 decoder discovery may expand after this gate; they are not infinite prerequisites for hosted work.

---

# 14. 3.x — Hosted Worlds & Networked NES Games

**Entry condition:** pass the finite audio / RE readiness gate above. Define the hosted client/server contract before adding wallet-backed ownership. A wallet connection alone is neither gameplay authority nor permission to transfer assets.

## Product intent

3.x does **not** turn NES Forge into a modern 3D/MMO engine.

It allows real NES-class 6502 games to participate in:

- persistent Hosted Worlds;
- multiplayer sessions;
- server-authoritative state;
- resource gathering;
- progression;
- crafting;
- construction;
- combat;
- economy;
- social features;
- collaborative building.

The player experience remains NES / 8-bit / 6502-class.

The host infrastructure can be modern.

Maintain an explicit compatibility distinction: ordinary exported ROMs retain their declared standalone NES profile; connected Worlds require a supported host bridge and may have unavailable features offline. A stock NES does not acquire internet or wallet capabilities from a ROM alone. Any physical-console network adapter is a separate hardware/runtime profile, not a compatibility claim inherited from emulator-based hosting.

---

## Hosted World model

Conceptually:

Hosted World
→ authoritative persistent state
→ interest/proximity projection
→ NES-compatible local state
→ 6502 runtime

A huge hosted World may contain far more data than one NES client can hold.

Each NES client receives only the local slice it needs:

- nearby map/chunks;
- relevant actors;
- inventory;
- local structures;
- combat state;
- nearby players/resources.

The NES remains the game client.

The host owns large-scale persistence/session state.

Define the boundary precisely: the 6502 runtime executes the local game representation; the server validates authoritative World actions and outcomes; the host bridge maps bounded, typed events and state into the declared NES runtime profile. Budget projected actors, memory and resources explicitly. Do not silently replace 6502 gameplay with a modern visual game engine.

---

## 3.0 — Hosted Session / Network Foundation

The earlier one-player local input adapter is a usability foundation only. This milestone remains separately scoped for generalized player assignment, networking, replay, and synchronization; local gamepad support does not start 3.x.

Establish:

- generalized InputSource abstraction;
- P1/P2/P3/P4/local controller assignment;
- deterministic simulation contract where applicable;
- emulator snapshots;
- input recording/replay;
- state hashes;
- session identity;
- player identity;
- authoritative vs peer state concepts;
- canonical network event envelopes.

No Hosted World game genre is hard-coded here.

Begin with a small declared player count. Any P3/P4 assignment needs an explicit supported controller/peripheral profile. Freeze replay/state-hash assumptions for the selected deterministic runtime; do not assume every arbitrary ROM or host timing configuration is interchangeable.

---

## 3.1 — Traditional Netplay

For conventional NES multiplayer:

- synchronized controller input;
- peer/server sessions;
- rollback where appropriate;
- reconnect;
- spectators;
- lobbies/matchmaking;
- compatibility with suitable existing ROMs.

The ROM itself does not need Internet protocol code.

This is a separate compatibility/netplay branch after 3.0. Completion of rollback for legacy ROMs is not a prerequisite for the authoritative 3.2–3.3 Hosted World path.

---

## 3.2 — Hosted Network Runtime

Introduce server-facing canonical gameplay events.

Examples:

Client-side intents:

- move/input;
- interact;
- attack;
- pickup;
- craft;
- world modification;
- inventory action.

Server-side results:

- actor spawn/despawn;
- actor state;
- world delta;
- persistent state change;
- inventory update;
- match/session event.

Gameplay owns meaning.

Networking owns transport.

---

## 3.3 — Persistent Hosted Worlds

Introduce:

- server-side World persistence;
- streamed/chunked NES-compatible local projections;
- player-owned persistent state;
- structures;
- resources;
- construction/destruction;
- authoritative inventories;
- reconnectable sessions;
- persistent bases/settlements.

This is the foundation for NES-style survival/building/RPG experiences.

**First hosted demonstration:** two clients join one small World, interact with one authoritative item, disconnect/reconnect and recover consistent World and inventory state. Retry, stale-client and simultaneous-pickup cases must not duplicate items. Restart and restore the server without losing accepted outcomes. Prove this with ordinary game items before attaching blockchain settlement.

---

## 3.4 — Economy, Crafting & Construction Services

Potential canonical hosted capabilities:

- inventories;
- currencies;
- resources;
- recipes;
- crafting;
- equipment;
- spells/abilities;
- structures;
- building materials;
- vendors/trading;
- progression/XP.

These must remain domain abstractions.

Networking must not own their gameplay semantics.

### 3.4.1 — Canonical Items, Issuance & Earned Loot

Establish stable item-instance identity, issuing-world identity, item-definition version, quantities, owners and inventory location. Define crafting/drop rules, supply policy and unique claim IDs. Support both owner-operated vendors and gameplay-earned items through the same authoritative issuance rules.

Prove earn → equip/use → trade/store → save/reconnect without duplicates. Keep game properties in a versioned canonical item model; a wallet asset is an ownership reference, not executable NES code. Receiving Worlds explicitly choose accepted issuers, allowed items, stat mappings and balance rules. Cross-world acceptance is optional.

### 3.4.2 — Existing Crypto Project Audit & Solana Test Integration

Inspect the user's current crypto-project source, tests, deployment state, custody model and wallet/asset contracts before choosing reusable components. Its current safety and integration readiness are not established by this roadmap. Keep chain-specific behavior behind an adapter; do not wholesale-merge the project or create a new currency merely to enable items.

Solana is the preferred first candidate, not a locked dependency. Use local/test-network assets initially. Define wallet authentication separately from asset-transfer authorization; normal game login must not grant blanket spending power. Keep secrets out of ROMs, project files and game servers that do not need them.

Compare unique and stackable asset representations, metadata/storage needs, account costs, priority fees, infrastructure and indexing costs. Evaluate fee sponsorship with quotas and explicit transaction validation [R2]. Show total measured user/platform cost per mint and transfer; low base fees are not the complete mint cost.

### 3.4.3 — Mint, Hold, Withdraw & Reconcile

First connected-item demonstration:

connect wallet → earn a server-verified item → claim/mint an eligible instance → confirm ownership → reconnect and use its supported game representation.

Players may keep earned items in ordinary inventory and mint eligible items under declared rules. Reserve each eligible claim so it cannot be minted twice, and define how a minted asset replaces or references the original inventory record. Handle transfers outside the game, burns, failed/delayed transactions, retries and chain confirmation before granting final ownership effects. Distinguish pending, usable and settled states.

Publish issuer identity, supply/mint rules, metadata policy and server trust assumptions. Wallet possession does not guarantee resale value, permanent server availability or use in every World.

### 3.4.4 — Consented Loot Loss & Ownership Settlement

Introduce combat loss after authoritative combat, durable inventories and test-network minting work independently. Define which items are at risk, who can receive them, the applicable World/rules version, the encounter start/end boundary, and disconnect/cancellation behavior before a player opts in.

Choose and review an enforceable custody/escrow or narrowly delegated-transfer design. The current design preference is explicitly committed encounter loot; unrelated wallet assets remain outside it. Prevent transferring the same item away while it is committed. A client or server merely announcing a win cannot by itself authorize an arbitrary wallet transfer.

Use one durable encounter result and idempotent settlement so an item has one recognized owner through retries, server crashes and network interruptions. Test double claims, replayed results, collusion/cheating assumptions, invalid issuers, withdrawals, cancellation and recovery. Explain which outcomes still require trust in a server operator; blockchain ownership does not prove that combat was fair.

**Real-value readiness gate:** a demonstrated test-network loop, independently reviewed authority/issuance/settlement design, measured fees, operational recovery and an explicit launch decision. Only then consider items with monetary value. No guaranteed liquidity, token price or earnings are promised.

---

## 3.5 — Large Match / Competitive Systems

Potential:

- battle-royale style matches;
- teams;
- match rules;
- shrinking/controlled zones;
- elimination;
- spectator mode;
- scoring;
- rankings;
- match history.

The client remains NES-class.

---

## 3.6 — Social / Voice

Separate bounded context.

Potential:

- parties;
- friends/invites;
- text chat;
- voice chat;
- mute/block;
- lobby presence;
- team/positional voice where appropriate.

Voice must remain outside deterministic NES simulation state.

A voice failure must not alter the game simulation.

---

## 3.7 — Collaborative Hosted Creation

Potential:

- shared project sessions;
- presence;
- domain-aware synchronization;
- collaborative World editing;
- concurrent work across different domains;
- change history/conflict handling;
- collaborative Build & Run;
- shared LiveLink testing;
- voice/text collaboration.

Long-term possibility:

players can build and test NES Worlds together while staying inside the NES/8-bit product model.

3.5–3.7 are optional expansion branches after their relevant hosted foundations. A physical tech-deck prototype does not need large matches, voice and collaborative editing to be complete first.

---

# 15. Hosted persistence scopes

Current gameplay scopes remain:

- Transient
- Room
- World

3.x may deliberately introduce additional scopes such as:

- Session
- Player
- Hosted World
- Account

These must not be pulled forward into 1.x/2.x prematurely.

Current explicit persistence architecture should remain backend-neutral so later Hosted World storage can reuse canonical semantics rather than redesign Gameplay.

---

# 16. Networking-domain rule

Networking must not become gameplay.

Example:

Gameplay says:

`door.stateChanged(open=true)`

Networking may transport that event.

Networking does **not** decide:

- why the Door opened;
- whether it used a key;
- how its collision works;
- what animation plays;
- what persistence variable controls it.

Likewise:

- Inventory owns item meaning.
- Crafting owns recipes.
- Economy owns trading/currency.
- World owns spatial structure.
- Gameplay owns actor behavior.
- Networking owns synchronization/transport.
- Hosted persistence owns durable remote storage.
- Asset Ownership owns wallet/chain adapters and settlement state, not combat truth.
- Deployment owns host roles and installed project versions, not item issuance rules.
- Voice owns communication transport.

---

# 17. Long-term eras

## 1.x — CREATE

Build complete original NES games visually.

## 2.x — UNDERSTAND & MANIPULATE

Link, inspect, reverse engineer, catalog techniques, debug, and live-edit NES software.

## 3.x — CONNECT

Connect NES games into multiplayer sessions, persistent Hosted Worlds, developer-defined economies and optional wallet-owned items; add social systems and collaborative creation as scoped extensions.

## 4.x — DEPLOY & CARRY

Run the development environment, player client and server on a portable host; build and deploy from the device itself. Add internet connectivity and a separately validated constrained-mesh option, then integrate physical hardware.

All four eras remain under the same hard product rule:

> **NES Forge is an NES / 8-bit / 6502-class environment.**

---

# 18. 4.x — Portable Host & Physical Tech Deck

The tech deck is a modern host for NES development, emulation, deployment and services. A physical device running an emulator is not automatically a physical NES cartridge development or flashing kit. Cartridge-programming or console-interface hardware needs a separate supported interface and acceptance scope.

The dependency for this track is a working editor/build pipeline and the accepted hosted server/client contract. A software-only role/deployment prototype may proceed after those foundations without waiting for every 3.x extension or real-value wallet launch. Custom hardware integration follows measured software requirements.

## 4.0 — Prove the Three Roles on Existing Hardware

Use ordinary supported hardware first; select no custom board or enclosure yet.

| Role | Minimum proof |
| --- | --- |
| Development kit | Create/edit assets and audio, inspect supported ROMs, build a ROM and versioned server package, test, then deploy locally or to an authorized remote host from the device. |
| Client | Join a supported World, play with verified controls/audio, recover from disconnect and handle optional wallet actions through the host. |
| Server | Start a declared World, admit clients, persist state, back up/restore, apply a reviewed update and roll back safely. |

Declare whether each role runs independently or concurrently. Measure CPU, memory, storage, power, thermal behavior and bandwidth with a stated client count; do not promise all roles simultaneously on unknown hardware.

## 4.1 — Deploy From the Device; Wi-Fi & Cellular

Provide reproducible install/update packages, versioned project/server configuration, explicit local/remote deployment targets, logs, recovery and backup controls. Distinguish deployment of a ROM from deployment of a hosted World service. Keep signing/admin authority outside distributable game content and make deployment permissions explicit.

Verify Wi-Fi and cellular paths, including tethering or a supported modem as chosen during hardware evaluation. Test connection changes, interruptions and remote reachability; document any relay or outbound-connection requirement instead of assuming a device on cellular can accept unsolicited inbound clients. Finalize item settlement only when the authoritative services are reachable and their confirmation policy is satisfied.

## 4.2 — Meshtastic Feasibility & Optional Mesh Mode

Run this investigation alongside the portable-host prototype, before committing to radio hardware. Use a compatible LoRa radio; a phone, Wi-Fi adapter or cellular modem alone is not a Meshtastic radio.

Start with compact messages, discovery, asynchronous encounters or small delayed World updates. Establish a packet and airtime budget; measure latency, losses, duplicate/reordered delivery and reconciliation under the selected devices and radio settings. Meshtastic documents low data rates and overhead from headers, hops and retries [R1].

The initial mesh proposal excludes streaming ROM/assets, voice and frame-by-frame action synchronization. Reconsider individual capabilities only with measured evidence. Offline mesh messages may record pending intents; they must not independently finalize spendable wallet ownership or create duplicate loot. A later connection to authoritative services must validate and reconcile them. The ordinary Wi-Fi/cellular experience must remain usable without mesh.

## 4.3 — Physical Prototype & Hardware Validation

Choose hardware from measured requirements: compute board, display, controls, audio, storage, battery/power, cooling, Wi-Fi, cellular option and optional LoRa radio. Validate assembly, suspend/resume, power loss, recovery, field connectivity and sustained use for each advertised role. Establish a bill of materials and cost target before custom-board work.

**Exit demonstration:** create or edit a small project on the deck, build it, deploy its hosted service from the deck, connect a second client, complete a gameplay session, and recover cleanly after interruption. Demonstrate optional mesh separately within its declared message budget. Run the deck as a server only up to the measured capacity; offer a remote server deployment path for larger Worlds.

No purchase, hardware manufacturing, mainnet deployment or service publication is authorized by this roadmap edit.

---

# 19. Future platform policy

A future 16-bit product is not ruled out.

However:

- it must not be implemented by weakening NES Forge's hardware boundaries;
- SNES support belongs in a separate environment/product;
- its canonical models may reuse conceptual lessons, but not silently reuse incompatible runtime assumptions;
- NES Forge must remain stable, authentic, and focused on 8-bit NES/6502 development.

---

# 20. Final scope statement

NES Forge may use modern infrastructure around the game.

NES Forge may provide modern tooling to understand the game.

NES Forge may host persistent online Worlds around the game.

NES Forge may support modern collaboration and voice around the game.

NES Forge may connect canonical game items to wallet ownership and explicit, consented loss rules through host services.

NES Forge may run on a portable device that develops, deploys, plays and hosts NES experiences.

But the **game itself remains NES**:

- 8-bit;
- NES-class graphics;
- NES-class audio;
- 6502-derived runtime logic;
- NES-compatible resources and cartridge/runtime profiles.

That boundary is intentional and authoritative.

---

# 21. Planning references and change record

External references inform feasibility, not proof that Forge has implemented a feature. Consulted September 30, 2026, America/Denver:

- **[R1]** [Meshtastic radio settings and data rates](https://meshtastic.org/docs/overview/radio-settings/). Supports a separately budgeted low-throughput mesh mode; quoted data-rate maxima exclude headers, hops and retransmissions.
- **[R2]** [Solana fee abstraction](https://solana.com/docs/payments/send-payments/payment-processing/fee-abstraction). Supports evaluating a separate transaction fee payer; sponsorship still needs funding, limits and transaction validation. No fixed mint-price claim is made here.

This revision preserves the completed 1.7/1.8 record, historical 1.9.0 evidence, five-template/schema-12 limits and protected behavior. It retains the 1.9.1/1.9.2 assignments; adds 1.9.3 audio workflow completion, a finite 2.x RE gate, ordered 3.4 item/wallet/loot stages and a 4.x portable platform track. It records accessible developer tooling and recommended private GitHub setup before RE. It corrects stale PDF-closeout wording and distinguishes the separately prepared mobile-play-2 follow-up from earlier evidence. The delivered review kit remains a dated mobile-play-1 snapshot; the new candidate is supplied separately. The existing roadmap filename is retained to preserve its identity.
