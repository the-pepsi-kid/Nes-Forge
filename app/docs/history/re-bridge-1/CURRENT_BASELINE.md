# Current baseline and candidate evidence

## Active candidate

| Item | Status |
| --- | --- |
| Release | NES Forge 1.9.0 — Gameplay Core |
| Maturity / candidate | Alpha / `re-bridge-1` |
| Application | `mainline/NES_Forge_1.9.0_Gameplay_Core.html` |
| Source | Ordered `source-manifest.json`; build with `python3 tools/bundle.py` |
| Authority | September 30, 2026 “Alright, let's see what that looks like then” after the integrated supported-ROM recovery proposal; D048 retains D046/D047 |
| Scope | One supported native homebrew ROM → decoded assets/collision/music → editable project → existing Forge build; mobile and protected contracts preserved |
| Current HTML identity | Read the exact delivered hash in `build-inputs.json`; verify it against the application and current reports |
| Automated suite evidence | `test-results/candidate/Summary.json` for this candidate's actual hash, totals, failures/skips and environment |
| Browser automation evidence | `test-results/browser-mobile/Report.json`; walkthrough remains pending, Chromium unavailable; scope and simulated inputs must be stated explicitly |
| Clean-extraction reproduction | `checkpoints/re-bridge-1-clean-extraction/Reproduction.json` |
| Physical mobile/controller acceptance | Pending for this exact candidate; prior owner touch success and audio/video lag remain reported observations, not a completed device matrix |
| Owner acceptance / promotion | Pending; implementation authorization is not acceptance |

Evidence files certify this candidate only if their HTML hash matches the supplied application. Missing, stale, incomplete or failed reports do not establish a pass. Browser automation is separate from physical iPhone/Android, wired/Bluetooth, native picker, speaker-output and independent NES hardware observations.

## Preserved product contract

NES / 8-bit / 6502-class remains the target. Project schema remains 12 with actual frozen-1.8 atomic rejection. Exactly five recipes remain: Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door. The executable mapper-0 plan permits 12 actors including the compatibility Player and 64 one-byte explicit Room/World persistent values. The RE adapter produces ordinary schema-12 records; no new authoring schema, gameplay template or compiler capability is introduced.

The canonical gameplay model, deterministic behavior tables, typed validation, reachable-World planning, disabled-Behavior inertness and unsigned overlap corrections remain. Generated single-room and World behavior and five legacy whole-ROM oracles remain release gates. The RE follow-up adds a detached native-format decoder and explicit project-transfer UI. It does not rewrite CPU/PPU/APU, capture, Save As, CHR or generated-ROM systems. ProjectStore only adds a format-specific rejection for inspection reports used as projects.

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

The exact corrected HTML is retained at `baseline/NES_Forge_1.9.0_Corrected_Reference.html`. Previous checkpoints and decisions describe their own artifacts. Historical totals are not added to or inherited by `re-bridge-1`. The preceding active documents are archived under `docs/history/mobile-play-2/`; D046 and D047 remain unchanged historical evidence, and D048 governs this bounded bridge.

## Integrated RE scope

The current decoder recognizes the independently authored Native Room v1 engine used by `examples/RE_Bridge_Room/Bridge_Room.nes`: standard iNES mapper 0, 32 KiB PRG, 8 KiB CHR, horizontal mirroring, checked engine fingerprint and vectors. It reads native CHR, nametable/attributes, palettes, per-cell collision, spawn and constant Pulse 1 timer records. The input has no Forge project JSON. The result is one editable native project plus a separate evidence report. Unsupported headers, engines, collision values or audio semantics reject before import.

Collision preserves 960 decoded Empty/Solid cells through tile properties where consistent and linked metatile quadrant overrides where needed. The 16-row song uses 12 frames per row in the supplied example; no SFX is recovered. The original engine moves left/right only. Rebuilds use the existing Forge sideview player and add default jump/attack animation states, with no damage hitboxes; no original-gameplay or byte-identical reconstruction claim is made. Original ROM bytes remain available unchanged. The RE / DISASM workflow and tutorial are in `docs/RE_BRIDGE.md`.

## Governance and remaining work

Deliver and review this bounded alpha candidate before owner acceptance. Retain the complete 28-suite gate and add the four model, UI, runtime and report-import suites; actual measured outcomes belong in the candidate report. Browser walkthrough remains pending because Chromium is missing. Phone A/V lag remains unmeasured, and controller/browser/hardware acceptance is separate.

D048 supersedes the earlier intake-only boundary for this one supported example. It does not authorize a wholesale old-branch merge, arbitrary game/engine recovery, ASM/Lua adapters, Method Registry, mapper/raster/linker work, LiveLink, gameplay expansion or hosted/wallet/hardware implementation. Proposed source migration remains roadmap work. The source decoder and UI are additive; the mobile-play-2 artifact itself remains frozen.

The workshop remains documentation followed inside the existing environment. The expanded manual PDFs and revised Alpha Review Kit were completed September 30 as separate documentation deliverables. The owner reports completing tutorial steps 1–9 with guidance and running its ROM in another emulator; emulator identity/version, ROM hash and device details were not recorded. This supports the prior tutorial workflow but does not certify this changed application. Mobile touch works by owner report; mobile audio/video lag remains open and unmeasured, and physical controllers remain untested.

The roadmap places 1.9.3 Audio completion and a finite 2.x RE acceptance gate before hosted worlds/wallet items, with a 4.x tech deck track. Preserve community accessibility and the standalone workflow. A private GitHub repository is recommended after stabilization and before substantive RE development; the authorized integrated example need not wait and no repository has been created.
