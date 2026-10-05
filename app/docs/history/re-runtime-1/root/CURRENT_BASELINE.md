# Current baseline and candidate evidence

## Active candidate

| Item | Status |
| --- | --- |
| Release | NES Forge 1.9.0 — Gameplay Core |
| Maturity / candidate | Alpha / `re-runtime-1` |
| Application | `mainline/NES_Forge_1.9.0_Gameplay_Core.html` |
| Source | Ordered `source-manifest.json`; build with `python3 tools/bundle.py` |
| Authority | October 1, 2026 owner approval to continue investigation tools inside Forge; D051 retains D046–D050 |
| Scope | Integrated bounded read-only runtime investigation plus static analysis; retains navigation, supported native-ROM recovery and authoring/mobile contracts |
| Current HTML identity | Read the exact delivered hash in `build-inputs.json`; verify it against the application and current reports |
| Automated suite evidence | `test-results/candidate/Summary.json` for this candidate's actual hash, totals, failures/skips and environment |
| Browser automation evidence | `test-results/browser-mobile/Report.json`, `test-results/browser-re-analysis/Report.json`, `test-results/browser-re-runtime/Report.json`; walkthrough remains pending, Chromium unavailable; scope and simulated inputs must be stated explicitly |
| Clean-extraction reproduction | `checkpoints/re-runtime-1-clean-extraction/Reproduction.json` |
| Physical mobile/controller acceptance | Pending for this exact candidate; prior owner touch success and audio/video lag remain reported observations, not a completed device matrix |
| Owner acceptance / promotion | Pending; implementation authorization is not acceptance |

Evidence files certify this candidate only if their HTML hash matches the supplied application. Missing, stale, incomplete or failed reports do not establish a pass. Browser automation is separate from physical iPhone/Android, wired/Bluetooth, native picker, speaker-output and independent NES hardware observations.

The prior re-analysis-1a picker repair passed 846/846 automated checks across 38 suites for HTML SHA-256 `e3dc4b0911e491d36b0cab4e18708510614d2d306a39092c506f807452375f96`. The owner reported T1–T5 successful and explicitly confirmed T6 on October 1: opening the ROM for general analysis left the imported JSON project in Scene unchanged. T4 established Bridge Room-only editable recovery, not recovery of other engines. Browser/device versions were not recorded. These are historical results, not acceptance of re-runtime-1.

The uploaded Pepsi ROM is 24,592 bytes, SHA-256 `8fb961353e9f626bcc62b85896550ec0108addff1fb82eaf7df7aafbf9b6462a`. Its earlier external investigation is a baseline for expected findings, not a current UI pass. New integrated evidence must come from this candidate's own model, UI and bundled-emulator tests plus the owner's new walkthrough.

D051 brings runtime coverage, writes, RAM comparisons and watches into Forge. Stage/health/enemy commands and general native scene/collision/music reconstruction remain absent. Static intake remains available independently of playback. Runtime observation requires a ROM the bundled emulator can execute; it does not increase emulator/mapper compatibility.

## Preserved product contract

NES / 8-bit / 6502-class remains the target. Project schema remains 12 with actual frozen-1.8 atomic rejection. Exactly five recipes remain: Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door. The executable mapper-0 plan permits 12 actors including the compatibility Player and 64 one-byte explicit Room/World persistent values. The recovery adapter produces ordinary schema-12 records. General analysis uses separate session evidence and does not introduce an authoring schema, gameplay template, compiler capability or new emulated platform.

The canonical gameplay model, deterministic behavior tables, typed validation, reachable-World planning, disabled-Behavior inertness and unsigned overlap corrections remain. Generated single-room and World behavior and five legacy whole-ROM oracles remain release gates. The retained RE follow-up adds a native-format decoder and explicit project-transfer UI; ProjectStore only adds a format-specific report rejection. The retained navigation services wrap existing emulator lifecycle entry points. D051 adds opt-in observational hooks and a runtime-investigation UI; static file inspection still requires neither emulator loading nor a recognized recovery profile. CPU/PPU/APU algorithms, renderer, capture implementation, Save As, CHR and generated-ROM systems remain authoritative.

Single-room layout-3/GP16 reopening remains partial and excludes Gameplay Core source; native JSON/ZIP is the complete authoring backup. WG17 recovery retains its checked embedded source, excluding a prior imported-ROM backup. `syncActiveFromPersistent` remains one-way until reconstruction. Door physical blocking remains deferred under Option B. Reset/power-cycle returns persistent variables to authored defaults; no cross-session save backend exists.

## Frozen and historical references

| Release / artifact | Measured historical evidence | Role |
| --- | --- | --- |
| 1.6.6 Visual Workspace | 479/479 across 17 suites | Frozen historical baseline |
| 1.6.7 Architecture Convergence | 559/559 across 23 suites | Frozen historical baseline |
| 1.7 World Runtime | 606/606 across 24 suites | Completed runtime reference |
| 1.8 Audio Runtime | 623/623 across 25 suites; HTML SHA-256 `a4aa41d622d9379feac9580d3c6e612e5dbd198801717309ba630ed3bcc93875` | Frozen pre-1.9 reference |
| Corrected 1.9.0 candidate | 658/658 across 26 suites; HTML SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08`; 1,074,708 bytes | Reference input for Mobile Play, not evidence for changed bytes |
| 1.9.0 Alpha `mobile-play-1` | 702/702 across 28 suites; HTML SHA-256 `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12` | Prior Mobile Play candidate; not a pass for changed bytes |
| 1.9.0 Alpha `mobile-play-2` | 708/708 across 28 suites; HTML SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62` | Input reference for integrated RE; not a pass for changed bytes |
| 1.9.0 Alpha `re-bridge-1` | 750/750 across 32 suites; HTML SHA-256 `7e7c0e53509d31cee4a17bca8f4a8c051fa41e074a5865e46160dd3ceba1106c` | Prior editable-recovery candidate; not a pass for changed bytes |
| 1.9.0 Alpha `re-navigation-1` | 788/788 across 35 suites; HTML SHA-256 `e4ac5e66dcd49aa965dab7c1c678399b47ef31ff579aa6c5d83a859855af3e16` | Frozen input for general analysis; not a pass for changed bytes |

The exact corrected HTML is retained at `baseline/NES_Forge_1.9.0_Corrected_Reference.html`. Previous checkpoints and decisions describe their own artifacts. Historical totals are not added to or inherited by `re-runtime-1`. D046–D049 remain historical decisions for their own input/output artifacts. D050 governs static analysis; D051 governs the current integrated runtime observation. Earlier reports are not inherited by changed application bytes.

## General analysis scope

General binary analysis is independent of both `emuLoadRomData` and the Native Room v1 recovery fingerprint. It exposes original-file identity, container diagnostics where recognized, raw bytes, physical CHR patterns where a container identifies them, bounded 6502 instruction interpretation, byte search and session annotations. Unknown engines and unsupported emulation cannot block this layer. Unrecognized or malformed container structures keep a raw-analysis route, with diagnostics rather than invented banks, vectors or assets.

Every location retains its physical file offset. A CPU address appears only under an applicable, stated mapping; user mappings are assumptions, not observed execution. Static disassembly cannot decide code versus data or reconstruct names and routines by itself. Evidence/report export remains separate from project JSON and leaves canonical authoring, original ROM bytes and emulator execution untouched. Exact controls and implemented limits are documented in `docs/RE_ANALYSIS.md`.

This is a bounded static-analysis foundation, not completed comprehensive RE. Runtime memory comparisons and named RAM-write watches are included in D051. Breakpoints, input replay, bookmarks, verified health/stage/enemy actions, broader recovery decoders and source migration remain future work. Opening another 6502 platform's binary does not emulate that platform or change the NES game target.

## Integrated runtime investigation

The loaded emulator ROM can explicitly populate general analysis without a second file selection or game reset. Runtime tracing is off by default and records executed code plus PPU/APU writes and selected RAM writes, with physical file offsets only when known. Two RAM snapshots support Changed, Unchanged, Increased, Decreased and After equals comparisons; up to eight named write watches help relate a changed address to executing code. Trace from reset is a visibly separate game-reset action.

Limits: 8,192 event records, 4,096 executed-PC records and 2,000,000 instructions per trace. Exports carry ROM identity and evidence limits. PPU resources are observed memory bytes with coverage masks, not engine-native scenes or collision. APU writes are activity, not automatically recovered songs. See `docs/RE_RUNTIME.md`.

## Emulator navigation scope

History is opt-in and starts off. The timeline stores complete machine/APU, capture-trace and completed-frame state for the active loaded ROM, including the data needed for resumed execution and corresponding capture/readouts. Back/Forward navigate one frame; batch actions navigate up to 60. Recorded future is restored without executing the CPU. At the live edge, forward executes real muted frames with neutral input and leaves playback paused; it also works with recording off.

The buffer retains at most 300 states and at most 32 MiB of serialized stored data, evicting older states as necessary. Actual duration is displayed and varies with state size. Run or ordinary frame execution after restoring the past creates a new branch and discards the old future. New load, reset, CPU Trace and unload invalidate/reseed history. Batch work yields for cancellation. This is frame-level emulator-state navigation, not a reverse 6502 instruction engine or continuous 2× playback. It adds no persistent gameplay save scope or project schema.

## Integrated RE scope

The current decoder recognizes the independently authored Native Room v1 engine used by `examples/RE_Bridge_Room/Bridge_Room.nes`: standard iNES mapper 0, 32 KiB PRG, 8 KiB CHR, horizontal mirroring, checked engine fingerprint and vectors. It reads native CHR, nametable/attributes, palettes, per-cell collision, spawn and constant Pulse 1 timer records. The input has no Forge project JSON. The result is one editable native project plus a separate evidence report. Unsupported recovery headers, engines, collision values or audio semantics reject before project import. They do not prevent the separate general-analysis workflow.

Collision preserves 960 decoded Empty/Solid cells through tile properties where consistent and linked metatile quadrant overrides where needed. The 16-row song uses 12 frames per row in the supplied example; no SFX is recovered. The original engine moves left/right only. Rebuilds use the existing Forge sideview player and add default jump/attack animation states, with no damage hitboxes; no original-gameplay or byte-identical reconstruction claim is made. Original ROM bytes remain available unchanged. The RE / DISASM workflow and tutorial are in `docs/RE_BRIDGE.md`.

## Governance and remaining work

Deliver and review this bounded alpha candidate before owner acceptance. Retain all 35 prior suites and run the new general-analysis suites; the current runner and matching candidate report define the full required suite list and measured outcomes. Browser walkthrough remains pending because Chromium is missing. Phone A/V lag remains unmeasured, and controller/browser/hardware acceptance is separate.

D050 brings engine-independent binary inspection into the integrated application. Comprehensive RE remains the long-term goal: runtime tracing, state discovery, supported engine/audio decoders, source migration and controlled edit/build workflows still require implementation. This slice does not authorize a wholesale old-branch merge, ASM/Lua adapters, Method Registry, mapper/raster/linker work, LiveLink, gameplay expansion or hosted/wallet/hardware implementation. Existing artifacts remain frozen; no current pass or acceptance is inferred from them.

The workshop remains documentation followed inside the existing environment. The expanded manual PDFs and revised Alpha Review Kit were completed September 30 as separate documentation deliverables. The owner reports completing tutorial steps 1–9 with guidance and running its ROM in another emulator; emulator identity/version, ROM hash and device details were not recorded. This supports the prior tutorial workflow but does not certify this changed application. Mobile touch works by owner report; mobile audio/video lag remains open and unmeasured, and physical controllers remain untested.

The roadmap places 1.9.3 Audio completion and a finite 2.x RE acceptance gate before hosted worlds/wallet items, with a 4.x tech deck track. Preserve community accessibility and the standalone workflow. A private GitHub repository is recommended after stabilization and before substantive RE development; the authorized integrated example need not wait and no repository has been created.
