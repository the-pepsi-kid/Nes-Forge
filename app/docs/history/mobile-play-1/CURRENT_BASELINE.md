# Current baseline and candidate evidence

## Active candidate

| Item | Status |
| --- | --- |
| Release | NES Forge 1.9.0 — Gameplay Core |
| Maturity / candidate | Alpha / `mobile-play-1` |
| Application | `mainline/NES_Forge_1.9.0_Gameplay_Core.html` |
| Source | Ordered `source-manifest.json`; build with `python3 tools/bundle.py` |
| Authority | September 28, 2026 owner instruction “ok let's begin” after the Mobile Play roadmap update; D046 |
| Scope | Touch NES controls, expanded/native-fullscreen play, one local OS-recognized gamepad and button mapping; existing keyboard behavior preserved |
| Current HTML identity | Read `build-inputs.json`; do not reuse the corrected-reference hash |
| Automated suite evidence | `test-results/candidate/Summary.json` for this candidate's actual hash, totals, failures/skips and environment |
| Browser automation evidence | `test-results/browser-mobile/Report.json`; scope and simulated inputs must be stated explicitly |
| Clean-extraction reproduction | `checkpoints/1.9.0-clean-extraction/Reproduction.json` |
| Physical mobile/controller acceptance | Pending; see `docs/BROWSER_QA.md` |
| Owner acceptance / promotion | Pending; implementation authorization is not acceptance |

Evidence files certify this candidate only if their HTML hash matches the supplied application. Missing, stale, incomplete or failed reports do not establish a pass. Browser automation is separate from physical iPhone/Android, wired/Bluetooth, native picker, speaker-output and independent NES hardware observations.

## Preserved product contract

NES / 8-bit / 6502-class remains the target. Project schema remains 12 with actual frozen-1.8 atomic rejection. Exactly five recipes remain: Sideview Player, Ground Patrol Enemy, Stationary Contact Hazard, Collectible Pickup and Switch + Door. The executable mapper-0 plan permits 12 actors including the compatibility Player and 64 one-byte explicit Room/World persistent values. No new project input schema or gameplay/compiler capability is introduced.

The canonical gameplay model, deterministic behavior tables, typed validation, reachable-World planning, disabled-Behavior inertness and unsigned overlap corrections remain. Generated single-room and World behavior and five legacy whole-ROM oracles remain release gates. The mobile follow-up adds local emulator input/presentation adapters; it does not rewrite CPU/PPU/APU, capture, Save As, CHR or generated-ROM systems.

Single-room layout-3/GP16 reopening remains partial and excludes Gameplay Core source; native JSON/ZIP is the complete authoring backup. WG17 recovery retains its checked embedded source, excluding a prior imported-ROM backup. `syncActiveFromPersistent` remains one-way until reconstruction. Door physical blocking remains deferred under Option B. Reset/power-cycle returns persistent variables to authored defaults; no cross-session save backend exists.

## Frozen and historical references

| Release / artifact | Measured historical evidence | Role |
| --- | --- | --- |
| 1.6.6 Visual Workspace | 479/479 across 17 suites | Frozen historical baseline |
| 1.6.7 Architecture Convergence | 559/559 across 23 suites | Frozen historical baseline |
| 1.7 World Runtime | 606/606 across 24 suites | Completed runtime reference |
| 1.8 Audio Runtime | 623/623 across 25 suites; HTML SHA-256 `a4aa41d622d9379feac9580d3c6e612e5dbd198801717309ba630ed3bcc93875` | Frozen pre-1.9 reference |
| Corrected 1.9.0 candidate | 658/658 across 26 suites; HTML SHA-256 `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08`; 1,074,708 bytes | Reference input for Mobile Play, not evidence for changed bytes |

The exact corrected HTML is retained at `baseline/NES_Forge_1.9.0_Corrected_Reference.html`. Prior governing documents are preserved in `docs/history/1.9.0-corrected-reference/`. The D045 correction report and previous checkpoints describe their own artifacts. Historical totals are not added to or inherited by `mobile-play-1`.

## Governance and parallel work

Deliver and review this bounded alpha candidate before owner acceptance. 1.9.1 Gameplay Expansion, 1.9.2 Behavior UX, Audio expansion, RE, mapper/raster/linker work, LiveLink and all 2.x/3.x work remain unauthorized. The local one-port input adapter does not bring forward generalized InputSource/player assignment, snapshots, replay or networking.

The workshop remains documentation followed inside the existing environment. The expanded manual's printable PDF editions and combined final documentation ZIP remain a separate unfinished deliverable; this candidate package is not that completion. The user-reported mobile demonstration is useful qualitative evidence, not a measured device-acceptance record.
