# Architecture status — 1.9.0

The 1.6.7 service/lifecycle foundation, 1.7 World Runtime and 1.8 Audio Runtime remain in place. 1.9.0 adds Gameplay Core through explicit model/compiler/engine/UI modules without changing protected emulator, Runtime Capture, Save As or CHR ownership.

| Operation | Current owner and route |
| --- | --- |
| Project capture/load/save/recovery | ProjectStore; schema 12 owns `gameplayCore` |
| Canonical gameplay data | GameplayModel: definitions, instances, components/parameters, state tables and scoped variables |
| Gameplay dependency planning | GameplayCompiler: detached typed-operand/profile validation, retained-Player compatibility binding, placements, runtime slots and stable persistent keys |
| Generated gameplay | GameplayEngine emits the bounded evaluator into single-room and World engines |
| Gameplay authoring | GameplayUI provides template and table-oriented editing over canonical records |
| Audio | Existing AudioConfig/Compiler/Engine/Import/UI pipeline remains canonical |
| Build/output | BuildGraph/RuntimeCompiler include `gameplay-core-link` and still publish one artifact |
| World source/open | WorldRom retains layout 4/WG17 v1 and validates schema 10, 11 or 12 source |
| Emulation/live editing | EmulatorBridge remains thin; LiveLink remains inactive |

Definitions, placements, runtime slots and persistent records remain distinct. Runtime slot generations make stale handles invalid. Reconstruction resets transient working state while declared Room/World values remain in-session. Unknown operations and canonical operations unsupported by the selected profile reject before ROM emission. Persistent RAM is bounded to 64 one-byte values and cannot overlap actor arrays. GameplayUI provides bounded typed-table authoring for every 1.9.0 record family and explicit Scene/World/Room placement.

Gameplay Core is opt-in. When it is unused, the five immutable legacy ROMs remain byte-identical. The frozen 1.8 application rejects schema 12 before mutation. Capacity and unsupported-operation failures publish no artifact.

The authoritative clean-extraction total and HTML hash are recorded in `../CURRENT_BASELINE.md` and `../test-results/candidate/Summary.json`; historical 639/639 evidence belongs only to the superseded pre-audit candidate. Browser UI, native pickers, audible output and independent hardware timing remain unverified in `BROWSER_QA.md`.
