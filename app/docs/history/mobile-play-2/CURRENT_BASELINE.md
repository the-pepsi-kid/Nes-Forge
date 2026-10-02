# Current baseline and candidate evidence

## Active candidate

| Item | Status |
| --- | --- |
| Release | NES Forge 1.9.0 — Gameplay Core |
| Maturity / candidate | Alpha / `mobile-play-2` |
| Application | `mainline/NES_Forge_1.9.0_Gameplay_Core.html` |
| Source | Ordered `source-manifest.json`; build with `python3 tools/bundle.py` |
| Authority | September 30, 2026 “Ok, let's continue” after the immediate mobile stabilization plan; D047 retains D046 |
| Scope | Bounded Play presentation overhead reduction; existing touch, keyboard, fullscreen and one-port controller contract preserved |
| Current HTML identity | SHA-256 `4fc607a6cbdbdfed027db10df138c64f8bfe5fa95fc7a46063041313cb63ad62`; verify against `build-inputs.json` |
| Automated suite evidence | `test-results/candidate/Summary.json` for this candidate's actual hash, totals, failures/skips and environment |
| Browser automation evidence | `test-results/browser-mobile/Report.json`; scope and simulated inputs must be stated explicitly |
| Clean-extraction reproduction | `checkpoints/1.9.0-clean-extraction/Reproduction.json` |
| Physical mobile/controller acceptance | Pending for this exact candidate; prior owner touch success and audio/video lag remain reported observations, not a completed device matrix |
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
| 1.9.0 Alpha `mobile-play-1` | 702/702 across 28 suites; HTML SHA-256 `e7c75ccd43007c46b5e0336105f6551f4b6183cc39730802cd1fba226eb7fe12` | Prior Mobile Play candidate; not a pass for changed bytes |

The exact corrected HTML is retained at `baseline/NES_Forge_1.9.0_Corrected_Reference.html`. Prior governing documents are preserved in `docs/history/1.9.0-corrected-reference/`. The D045 correction report and previous checkpoints describe their own artifacts. Historical totals are not added to or inherited by `mobile-play-2`. Its preceding active documents are archived under `docs/history/mobile-play-1/`; D046 remains historical and D047 governs this bounded follow-up.

## Governance and parallel work

Deliver and review this bounded alpha candidate before owner acceptance. The new production differences are limited to `src/services/emulator-play-ui.js` and `src/services/release-info.js`; all other 53 production source files are byte-identical to the prior candidate. The sidebar is deferred only in expanded Play and refreshed once when leaving; event/observer sizing caches equal dimensions, with a periodic fallback when the observer is unavailable. Call-count reductions are documented in `docs/MOBILE_PERFORMANCE_REVIEW.md` and do not prove the phone lag is resolved. No RE code is added to this candidate. The owner’s subsequent instruction brings a separate bounded RE intake/inspection track forward now, in parallel with mobile closeout: inspect ROMs and evidence-backed assets/addresses before audio-driver decoding. Broad RE integration, 1.9.1/1.9.2 implementation, Audio expansion, mapper/raster/linker work, LiveLink and 3.x/4.x implementation remain separately gated. The local one-port input adapter does not bring forward generalized InputSource/player assignment, snapshots, replay or networking.

The workshop remains documentation followed inside the existing environment. The expanded manual PDFs and revised Alpha Review Kit were completed September 30 as separate documentation deliverables. The owner reports completing tutorial steps 1–9 with guidance and running its ROM in another emulator; emulator identity/version, ROM hash and device details were not recorded. This supports the prior tutorial workflow but does not certify this changed application. Mobile touch works by owner report; mobile audio/video lag remains open and unmeasured, and physical controllers remain untested.

The roadmap places 1.9.3 Audio completion and a finite 2.x RE acceptance gate before hosted worlds/wallet items, with a 4.x tech deck track. Preserve community accessibility and the standalone workflow. A private GitHub repository is recommended after stabilization and before substantive RE development; read-only RE intake need not wait and no repository has been created.
