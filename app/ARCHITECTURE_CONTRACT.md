# Current architecture contract

**2.0.0-alpha.11 / stage-context-1 · unpromoted development checkpoint**

StageContext derives native area/table membership only from explicit adapter fields. It validates and describes detached catalog snapshots stored in existing nativeAssets receipts. Source SHA-256, native profile and context ID partition groups; conflicting snapshots disable Stage/room navigation. Missing/unavailable native members are counted without guessing imports or routes.

GameREAssets owns detached conversion and remaps optional spriteSceneId and world.worldId with the same canonical scene/World ID maps. GameREWorlds records exact segment ownership at conversion. These are provenance/reference fields, not executable declarations or authentication.

SceneContext reads those relationships. Scene selection uses switchScene; World selection uses Forge161.worlds.select and its presentation state. A reentrancy guard coordinates existing selector entry points. The view may pan a selected World to a referenced page, but never changes its tileset reference, art, geometry, Audio or runtime. Shared sprites remain on their explicit canonical owner. Ambiguous legacy World uses are presented rather than silently rebound.

GameRE inspection remains detached and read-only. Use inspected room explicitly navigates only to an existing project scene with matching source hash, native profile and native scene ID. It imports nothing. Project lifecycle changes reconstruct context from receipts and clear stale selections.

ProjectStore, NativeEngineProject, NativeEngineFormat and the shared CPU/APU/PPU retain their previous ownership and validation. Ordinary projects write schema **12**. Native source/recipe projects write schema **13**; supported read ceiling remains 13. Native encoding still supports only the four verified Zelda II location fields. Five gameplay templates, 12 actor slots and 64 persistent bytes retain their existing contracts.

[Previous architecture contract](docs/history/stage-context-1/ARCHITECTURE_CONTRACT.md).
