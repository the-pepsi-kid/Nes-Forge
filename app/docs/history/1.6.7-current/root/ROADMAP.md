# NES Forge roadmap

The roadmap records intended direction. Only **1.6.7 — Architecture Convergence** is authorized in the current task. Every later milestone requires new explicit user authorization; do not begin it automatically after packaging 1.6.7.

| Milestone | Intended scope | Authorization |
| --- | --- | --- |
| 1.6.6 — Visual Workspace | Frozen behavioral reference; existing editor, capture and single-room Player/Target proof of concept | Reference only; do not modify |
| 1.6.7 — Architecture Convergence | Blank startup/recovery, external examples, deliberate schema compatibility, ProjectStore lifecycle/serialization, BuildGraph/RuntimeCompiler dispatch, current docs, thin service boundaries, reproducible release | Authorized; stop after candidate and handoff |
| 1.7 — World Runtime | Consume World/Room/Spawn/Entrance/Camera/Metatile data; begin mapper-ready resource linking | Deferred; requires authorization |
| 1.8 — Audio Runtime / Studio | Compile existing tracker music/SFX, connect sound events, then MIDI/MusicXML import | Deferred; requires authorization |
| 1.9 — General Gameplay Systems | Generic actors, collisions, hazards, ladders, moving platforms, pickups, triggers, dialogue and projectiles | Deferred; requires authorization |
| 2.0 — Runtime/Linker + Live Play foundation | Mapper-backed resource allocation, stable runtime asset IDs, incremental compilation and editor/emulator synchronization | Deferred; requires authorization |

The existing single-room Player/Target slice validates current authoring and compiler behavior. It must not become a growing collection of Scout-specific gameplay exceptions. Existing authored world/audio data remain preserved even where the ROM runtime does not execute them.

1.6.7's BuildGraph does not implement a new mapper target. AssetRegistry does not establish persistent runtime IDs. EmulatorBridge does not implement hot reload. LiveLink declares an inactive boundary. Existing ROM capture/disassembly do not imply generalized reconstruction of a game's original logic.

Potential improvements discovered during convergence go into handoff/deferred notes. **No autonomous scope expansion, new milestone implementation, or feature release is permitted by this roadmap.**
