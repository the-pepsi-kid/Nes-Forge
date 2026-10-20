# Current roadmap position

**2.0.0-alpha.11 / stage-context-1 · unpromoted development checkpoint**

The bounded Stage → Scene slice now preserves explicit source area/table membership through imported room/page context, World selection and shared sprite references. Missing rooms, unavailable slots and source conflicts remain visible; this is not complete playable-stage topology.

Next dependencies:

1. Recover and verify scene/event-to-music/SFX bindings while preserving the canonical Audio model; Audio remains project-wide until then.
2. Expand explicit Stage/route topology, entrance/exit conditions and shared-asset uses with verified source evidence. Older room-only receipts need explicit verified mapping rather than guessed migration.
3. Add native art/Audio/scene/behavior encoders in bounded increments with change-span and runtime evidence.
4. Establish a real route's condition/destination/spawn/camera/movement/audio/return-state contract and reusable components, exercised without the original ROM.
5. Complete finite RE and device/manual acceptance gates before promotion.

Hosted Worlds, inventory, wallet/items and portable platform work retain their later dependency order. Ordinary projects write schema **12**. Native source/recipe projects write schema **13**; supported read ceiling remains 13. Native encoding still supports only the four verified Zelda II location fields. Five gameplay templates, 12 actor slots and 64 persistent bytes retain their existing contracts.

[Current status](CURRENT_STATUS.md) · [previous roadmap](docs/history/stage-context-1/ROADMAP.md).
