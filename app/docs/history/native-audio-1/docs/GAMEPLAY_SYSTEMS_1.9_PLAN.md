# NES Forge 1.9 — General Gameplay Systems plan

**Status:** canonical architecture approved; **1.9.0 Gameplay Core implemented as the current candidate**. 1.9.1 and 1.9.2 remain unauthorized.

## Delivery boundaries at a glance

This sequence remains authoritative. The application is now the bounded 1.9.0 Gameplay Core candidate built on the retained 1.8 Audio Runtime baseline.

| Tranche | Included | Deliberately deferred |
| --- | --- | --- |
| **1.9.0 — Gameplay Core** | Actor Definitions, Actor Instances and Runtime Actor identity; typed components/parameters; canonical state tables and deterministic evaluator; explicit Room/World variables and bindings; legacy Player/Target adapter; table authoring; single-room + World compiler/runtime integration; schema 12/downgrade protection; exactly the five templates below | All 1.9.1 expansion capabilities and 1.9.2 UX |
| **1.9.1 — Gameplay Expansion** | Projectile, Moving Platform, in-session Checkpoint, NPC/basic dialogue interaction, ladders, one-way platforms and richer combat/traversal/events | Visual graph; save backends; branching dialogue/language; broad faction/team/reputation systems |
| **1.9.2 — Behavior UX** | Visual state graph over the same canonical state-table records/IDs; improved template/behavior authoring and diagnostics | Any competing behavior representation or graph-only runtime semantics |

The **only initial templates** are Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door. Later tranches require separate authorization; none begins automatically.

## Product direction

1. Preset behavior templates provide immediate usability and onboarding.
2. A structured state table is the canonical serialized and compiled behavior representation.
3. A future visual state graph may edit and display that same state-table model, but must never become a parallel representation.
4. Persistence is explicitly authored through Transient/Actor-local, Room and World scopes. Automatic actor snapshots are not the gameplay persistence model.
5. The legacy Player/Target workflow is preserved through a compatibility adapter first. In 1.9.0, its canonical Sideview Player binding delegates movement/collision/animation to the retained Player executor; it is not full generic-runtime unification. Existing projects are not silently rewritten.

## Canonical actor model

### Actor definitions

An actor definition is a reusable asset with a stable ID and contains:

- display name and optional category/tags;
- metasprite/animation references;
- a typed component list;
- a canonical behavior-definition reference;
- typed default gameplay parameters;
- explicit persistent-variable bindings, when needed.

Components provide data and bounded runtime capabilities; they do not encode role names such as enemy, boss or NPC. The 1.9.0 component floor is Transform/Spawn, Render/Animation, Physics, Collider, Input, Health, ContactDamage, Behavior, Pickup, Switch/Door and PersistenceBinding. Projectile, MovingPlatform, Ladder/OneWay, Checkpoint and DialogueInteraction capabilities wait for 1.9.1. Richer hitbox/hurtbox combat also waits for 1.9.1.

### Actor instances

A placed actor instance is a persistent authored placement/reference in a Scene, Room or World. It has a stable ID, actor-definition reference, authored placement, position/facing, optional parameter overrides, explicit spawn/despawn rule and optional persistent bindings. Here “persistent authored” means saved project data, not saved Runtime Actor memory. Instances do not copy the entire runtime state into the project. Scene placement does not introduce a Scene or implicit Game/Global persistence scope; persistent bindings must still resolve an explicitly declared Room or World owner.

### Runtime state

Runtime-only state includes current behavior state, velocity, timers, cooldowns, active animation frame, temporary invulnerability, transient collision contacts and other reconstructed working values. It is separate from authored persistent variables and resets when the actor/room is reconstructed unless behavior explicitly restores values from a scoped persistent variable.

### Identity boundaries

| Identity | Lifetime | Owns | Must not own |
| --- | --- | --- | --- |
| Actor Definition | Reusable authored archetype with a stable project-wide ID | Component defaults, behavior reference, visuals and typed parameters | Placement, current behavior state, runtime slot or saved variable values |
| Actor Instance | Persistent authored placement/reference with a stable project-wide instance ID | Definition reference, Scene/Room/World location, authored transform, overrides, spawn rule and persistent bindings | Current velocity/timers/collision contacts or a copy of the definition |
| Runtime Actor | Ephemeral generated-runtime handle/slot, with a generation value if slots are reused | Mutable component state, current state, timers, position, contacts and a reference to its source definition/optional source instance | Project identity authority or automatic persistence |
| Persistent State Record | Runtime/session value keyed by declared scope owner plus persistent-variable ID, and instance binding only when explicitly authored | The current value of one declared Room/World variable | Actor definition data, whole actor snapshots, behavior stacks or arbitrary component memory |

Actor Definition IDs and Actor Instance IDs are durable authoring identities. Runtime Actor handles are ephemeral and cannot be stored as persistent references. A Persistent State Record uses stable authored keys, never runtime slot numbers. Programmatically spawned Runtime Actors may have a definition ID without an Actor Instance ID; they persist only through explicit variable bindings and spawn rules.

These gameplay identity boundaries do not bring forward the mapper-backed resource identity, relocation or live-patching foundation scheduled for 2.0.

## Canonical behavior representation

Each behavior definition contains:

- stable `id`, display `name` and representation `version`;
- typed authoring `parameters` with defaults and bounds;
- one `initialStateId`;
- ordered `states` with stable IDs and typed entry/tick/exit action lists;
- ordered `transitions` with stable IDs, source state, priority, typed conditions, optional transition actions and destination state;
- explicit references to components, animation IDs, actor definitions and persistent-variable IDs.

The canonical state table is equivalent to these serialized records:

| Record | Required fields |
| --- | --- |
| State | `id`, `name`, ordered `onEnter`, `onTick`, `onExit` actions |
| Transition | `id`, `fromStateId`, `priority`, ordered conditions, ordered actions, `toStateId` |
| Condition | stable type plus validated typed operands |
| Action | stable type plus validated typed operands |

Transition evaluation is deterministic: priority first, then authored order. At most one state transition commits per actor tick unless a later approved action explicitly defines a bounded chain. Unknown condition/action types remain preserved authoring data where possible but fail executable builds; they are never silently ignored.

The canonical 1.9 model defines a broader typed operation vocabulary, but executable support is profile-specific. The 1.9.0 mapper-0 generated profile executes `always`, `inputHeld`, `inputEdge`, `timerDone`, `overlapPlayer` and `persistentCompare` conditions, and `persistentSet`, `despawn`, `setTimer`, `moveWithinBounds`, `contactDamage` and `syncActiveFromPersistent` actions. Other known canonical operations—including facing, velocity, acceleration, animation selection and trigger emission—must reject this profile before ROM emission; they may not compile as no-ops.

Every condition/action has an explicit operand schema. Missing, malformed, out-of-range, unknown, invalid-reference and type-incompatible operands fail executable validation before code generation. Unknown operation types remain preserved authoring data where possible but reject executable builds. Projectile-specific ownership/collision, moving-platform/rider, ladder/one-way, dialogue and checkpoint actions wait for 1.9.1. Arbitrary scripting is not part of 1.9.

### Templates

Templates are versioned authoring recipes that instantiate ordinary actor definitions, components and canonical state-table records. After creation, the generated records are normal editable project data. The runtime compiler consumes only canonical actor/behavior data and has no separate template engine.

The 1.9.0 Gameplay Core template set is:

1. **Sideview Player:** an explicit canonical compatibility binding to the retained Player executor, which continues to own movement, collision, animation and its established attack behavior. This proves a non-destructive adapter boundary, not full generic-evaluator unification, and does not authorize richer combat, projectiles or a new hitbox/hurtbox subsystem.
2. **Ground Patrol Enemy:** patrol/turn/contact/hurt/dead states using shared physics, collision, health and ContactDamage primitives.
3. **Stationary Contact Hazard:** active/inactive contact damage with optional scoped enable flag.
4. **Collectible Pickup:** available/collected states with explicit Room or World persistence.
5. **Switch + Door:** trigger-controlled state pair backed by an explicit Room or World variable.

The 1.9.1 Gameplay Expansion template set adds Projectile, Moving Platform, Checkpoint and NPC Interaction. Ladders and one-way platforms are added there as environment/collision components rather than special actor roles.

## Persistence model

Persistent gameplay data is defined separately from actor runtime state.

| Scope | Lifetime and examples |
| --- | --- |
| Transient / Actor-local | Runtime-only; resets when the actor or Room is reconstructed. Current state, timers, velocity and cooldowns live here. |
| Room | Persists while revisiting one Room: defeated actors, opened containers, local switches and destructible objects. |
| World | Shared across Rooms in one World: progression flags, unlocked routes, boss-state variables and keys. |
| Game / Global | Reserved for a future requirement; absent from the first 1.9 schema/runtime. |

Each persistent-variable definition has a stable ID, display name, Room or World owner, bounded type, default value and optional authoring description. The first types are Boolean, bounded unsigned integer and Enum. Components, conditions and actions refer to variables by stable ID and declared scope. Missing, duplicate, cross-owner or type-incompatible references fail validation.

The runtime stores only declared persistent variables. It does not serialize actor memory, behavior stacks, physics contacts or arbitrary component internals. The model must be deterministic, serializable, versionable and testable, and must remain backend-neutral so a later SRAM, password or save-system implementation can persist the same declared variables without redesigning behaviors.

For 1.9.0, Room/World persistence lasts for the generated play session and normal Room/World reconstruction. A runtime reset or power-cycle starts again from authored project defaults. Battery-backed SRAM, password encoding, checkpoints and general cross-session save UI are not included. The 1.9.1 checkpoint contract below still remains in-session only.

The 1.9.0 mapper-0 runtime stores at most 64 one-byte persistent values at `$0380`–`$03BF`. A 65th declaration fails profile validation before code generation; valid projects cannot overlap Runtime Actor health storage beginning at `$03C0`.

## Corrected 1.9.0 executable-profile contract

- WorldCompiler supplies GameplayCompiler with the complete reachable-World set. Actor Instances in any linked destination World/Room enter one bounded executable plan, have their graphics linked, and execute after transition. Unreachable instances remain authored with explicit diagnostics and do not consume the 12 executable slots.
- The 12-actor limit covers the complete executable plan, including the Sideview Player compatibility binding. Overflow rejects before emission; there is no actor streaming in 1.9.0.
- GameplayModel owns the canonical per-component field schema used by both table controls and compiler validation. Invalid known values reject before byte emission rather than being coerced, clamped or masked.
- Only enabled components form executable capabilities. A disabled Behavior component is inert while its Actor remains placed and may remain rendered. Re-enabling the component restores the same canonical behavior data.
- Behavior-action `contactDamage` operands are authoritative. Actor Instance persistence bindings are authoritative. Existing component mirrors are preserved only when consistent and are displayed as mirrors rather than editable competing runtime sources.
- Generated overlap uses unsigned, boundary-safe axis distance. Exact thresholds retain the existing non-overlap contract, and World screen identity is checked before actor evaluation.
- Single-room GP16/layout-3 ROM reopening is partial: Gameplay Core source is not recovered, original bytes remain available to Run Original, and JSON/ZIP is required for complete schema-12 authoring recovery. WG17 World reopening remains lossless for checked embedded source.
- `syncActiveFromPersistent` is one-way until reconstruction because inactive actors do not evaluate. It is an alpha/profile limitation, not physical Door blocking or a reversible gate contract.

## Legacy compatibility adapter

The existing 1.7/1.8 Player/Target fields and editor workflow remain readable and editable. At build time, the 1.9.0 adapter produces a canonical Sideview Player binding and explicit compatibility metadata without rewriting saved legacy records. The binding is consumed as a retained-runtime executor choice: legacy Player movement, collision and animation do not execute through the generic actor evaluator in this tranche. Documentation and plans must not describe this as full runtime unification. Generalized gameplay remains opt-in, and legacy builds with it unused must retain their verified behavior and pinned whole-ROM bytes.

The first tranche does not expose an automatic destructive migration command. A later explicit conversion can be considered after canonical actors have proven stable and round-trip behavior can be demonstrated.

Schema 12 owns actor definitions, behavior tables and scoped persistent variables because schema 11 cannot preserve them. The actual frozen 1.8 application rejects schema-12 projects atomically. Supported older projects load through the adapter with generalized gameplay disabled. Legacy layout families remain compatible and byte-identical when Gameplay Core is unused.

## Internal 1.9 sequence

### 1.9.0 — Gameplay Core

This architecture-proving implementation includes only:

1. Schema-12 ProjectStore ownership and actual frozen-1.8 downgrade rejection.
2. Stable Actor Definition and Actor Instance identities plus ephemeral Runtime Actor identity.
3. Typed component framework and bounded parameter definitions/overrides.
4. Canonical structured state-table behaviors and deterministic evaluation.
5. Explicit Room/World persistent-variable definitions, bindings and in-session state records.
6. Build-time compatibility adapters for existing Player/Target data, with unchanged legacy output when generalized gameplay is unused.
7. Complete bounded table-oriented authoring to create/edit/remove definitions, instances, components, parameters, states, transitions, conditions, actions, Room/World variables and bindings, with explicit Scene/World/Room placement and no external JSON requirement.
8. Detached compiler/link validation and generated-runtime integration in applicable single-room and World paths.
9. Exactly five templates: Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door.
10. Editable examples, schema/migration/identity/evaluator/persistence tests, emulator behavior tests, preserved legacy/World/Audio regression evidence and a clean release package.

### 1.9.1 — Gameplay Expansion

After 1.9.0 is separately accepted, a later authorization may add:

- Projectile component/actions and Projectile template;
- MovingPlatform/rider behavior and Moving Platform template;
- in-session Checkpoint behavior and Checkpoint template;
- minimal DialogueInteraction behavior and NPC Interaction template;
- ladder and one-way-platform collision modes;
- richer hitbox/hurtbox combat, traversal and typed animation events.

#### Minimal dialogue action contract

Dialogue begins in **1.9.1**, not 1.9.0. Its first implementation is minimal interaction/display/reference behavior: an authored interaction invokes a bounded display operation referencing a stable text/dialogue asset; acknowledgement/completion returns control to the invoking behavior. A simple ordered-page display may advance on new confirm presses and report a typed completion event. Exact operation names and panel presentation remain 1.9.1 implementation details, not a new dialogue-language contract.

The dialogue action itself does not branch, run scripts, mutate progression implicitly, select arbitrary actors, start cutscenes or persist conversation history. Portrait systems, choices, localization, branching dialogue graphs, cinematic timelines and general text scripting remain later work. There is no branching dialogue system or dialogue-language subsystem in 1.9.0, nor in this minimal 1.9.1 contract.

#### Checkpoint contract

A 1.9.1 checkpoint records only an in-session respawn location using stable authored World/Room/Spawn-or-Entrance references. Ordinary death/respawn within that session may use this location while declared Room/World variables retain their current values in the same explicit persistence store. Checkpoint activation does not copy or roll back those values and never snapshots Runtime Actor memory.

**Runtime reset or power-cycle clears the checkpoint and returns all session gameplay state to authored project defaults.** Closing/reloading the ROM or starting a newly built ROM also starts a new session. An in-session death/respawn is not a runtime reset. Cross-session persistence remains unavailable until a future save backend is explicitly authorized.

Checkpoint does not imply battery-backed SRAM, save slots, password encoding, cross-session progress or automatic actor snapshots. Later save backends must persist the same explicit variable/state contract rather than redesign actor behavior.

#### Projectile ownership and collision contract

A projectile Runtime Actor holds a transient source/owner Runtime Actor reference, generation-safe if runtime slots are reused, used only for self-hit exclusion and required damage filtering. Collision eligibility uses only the minimum bounded collision-group/mask semantics needed to select compatible damage recipients. These are low-level collision filters, not actor allegiances or inferred relationships. Richer hitbox/hurtbox behavior remains within the separately authorized 1.9.1 combat work.

No faction, team, allegiance, reputation or relationship graph is introduced. No persistent record stores a Runtime Actor handle. If the owner despawns, the projectile either continues with its authored lifetime/masks or despawns according to an explicit parameter; ownership is not rebound.

### 1.9.2 — Behavior UX

After the canonical table/runtime is accepted, a separately authorized UI tranche may add:

- visual state graph over the same canonical state and transition records/IDs;
- improved template selection/configuration;
- transition diagnostics, reference navigation and behavior validation views.

The graph edits through the same commands and serialization as the table. No graph-only metadata may affect runtime behavior; optional node coordinates are editor-only presentation data.

## Explicitly outside 1.9.0

- Projectiles, moving platforms, checkpoints, dialogue/NPC interaction, ladders, one-way platforms and richer combat/traversal/events; these wait for 1.9.1.
- Visual state-graph editing and expanded behavior UX; these wait for 1.9.2.
- Arbitrary scripting, user-supplied gameplay bytecode or an unbounded expression language.
- Automatic actor-memory snapshots as canonical persistence.
- Game/Global persistent scope, battery-backed SRAM, password systems, save-slot UI or cloud saves.
- Destructive automatic conversion of legacy Player/Target project data.
- Role-specific `enemy1`, `enemy2`, `boss` or similar `worldRuntime` fields.
- Advanced navigation/pathfinding, procedural AI planners, cutscene timelines, branching dialogue systems or a boss-specific runtime.
- Mapper/resource-linker expansion, smooth scrolling, Raster Events, runtime profiles, incremental compilation, LiveLink or hot reload.
- RE integration, Raster Methods, Method Registry, integrated RE or live reverse-engineering work.
- Additional Audio Studio/import/transcription work, DPCM runtime expansion or parallel audio representations.
- Rewrites of protected emulator, Runtime Capture, Save As or CHR systems.

## Release gate

Stop after the tested, reproducible **1.9.0 Gameplay Core candidate** and handoff for independent audit. Do not begin 1.9.1, 1.9.2, save backends, mapper/raster work, Audio expansion, RE work, Method Registry work, LiveLink or later numbered milestones without explicit authorization.
