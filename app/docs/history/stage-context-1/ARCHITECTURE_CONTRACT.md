# Current architecture contract

Current candidate: **2.0.0-alpha.11 / context-cleanup-1**, an unpromoted development checkpoint based on `697a998e744c7794fae5d1063748e8d83d5ffe57`. Ordinary projects write schema **12**; projects containing `nativeGame` write schema **13**. See [CURRENT_STATUS.md](CURRENT_STATUS.md) for current identity, evidence and scope.

ProjectStore owns project lifecycle, serialization and mutations. Existing asset IDs/references remain authoritative. `SceneContext.describe` reads scene/World/metasprite/animation relationships and existing recovery receipts; navigation uses the existing scene, World, pose, animation and Entity Studio entry points. It owns no parallel asset registry, persisted Stage model, compiler, emulator or audio model.

`SceneContextUI` refreshes through the existing scene-selector and ProjectStore lifecycle presentation hooks. It never changes audio orders, timing, runtime enablement or gameplay bindings. Shared assets remain shared. Invalid IDs and unmatched source hashes refuse source navigation. Source receipts are provenance, not authentication.

`NativeRecords` remains source-independent; `NativeEngineFormat` remains the revision-bound Zelda II adapter. NativeEngineProject owns native validation/encoding, ProjectStore owns transactions and BuildGraph/RuntimeCompiler own dispatch. Ordinary schema 12 and native schema 13 retain their meanings. No native encoder coverage expands.

[Preserved architecture contracts](docs/history/context-cleanup-1/ARCHITECTURE_CONTRACT.md) continue to govern protected behavior; older candidate/schema headings describe their historical checkpoint.
