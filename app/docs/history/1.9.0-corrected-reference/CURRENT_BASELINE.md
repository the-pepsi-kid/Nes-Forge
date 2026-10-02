# Current baseline and candidate evidence

## Frozen references

| Release | Measured evidence | Role |
| --- | --- | --- |
| 1.6.6 Visual Workspace | 479/479 across 17 suites | Frozen historical baseline |
| 1.6.7 Architecture Convergence | 559/559 across 23 suites | Frozen historical baseline |
| 1.7 World Runtime | 606/606 across 24 suites | Completed runtime baseline |
| 1.8 Audio Runtime | 623/623 across 25 suites | Frozen immediate baseline; HTML SHA-256 `a4aa41d622d9379feac9580d3c6e612e5dbd198801717309ba630ed3bcc93875` |

Historical results belong only to their artifacts and are not added to the 1.9.0 total.

## 1.9.0 candidate

| Item | Status |
| --- | --- |
| Release | NES Forge 1.9.0 — Gameplay Core |
| Application | `mainline/NES_Forge_1.9.0_Gameplay_Core.html` |
| Source | Ordered `source-manifest.json`; build with `python3 tools/bundle.py` |
| Project schema | 12; actual frozen-1.8 atomic rejection required and tested |
| Gameplay model | Actor Definition, Actor Instance, Runtime Actor and Persistent State Record identities; typed components/parameters; canonical state tables |
| Persistence | Explicit in-session Room/World variables; transient Runtime Actor state resets on reconstruction; 64 one-byte profile limit; reset/power-cycle returns to authored defaults |
| Runtime | Generated single-room and World integration on the existing mapper-0 profile; unsupported canonical operations reject before emission |
| Authoring | Typed table controls cover every 1.9.0 core record family and explicit Scene/World/Room placement without external JSON editing |
| Templates | Sideview Player; Ground Patrol Enemy; Stationary Contact Hazard; Collectible Pickup; Switch + Door |
| Legacy compatibility | Canonical Sideview binding uses retained Player executor; no full generic-runtime Player unification; five legacy whole-ROM outputs remain byte-identical when Gameplay Core is unused |
| Corrected candidate HTML SHA-256 | `472c4eaa427c466e204a07f0c0c30d3ecfc24c318b5ee1566dddaa2bb4903e08` (1,074,708 bytes) |
| Required runner | **658/658 across 26 suites**; 0 failures/skips; exit 0 |
| Real-browser/hardware acceptance | Unverified |

The 35-case Gameplay Core suite covers Definition/Instance isolation, generation-safe Runtime Actor slot reuse, transient reset with Room persistence, World-variable communication across Rooms, missing/cross-owner rejection, explicit operation and component schemas, malformed/type/reference rejection, canonical/generated-profile parity, exact 64/max+1 persistence capacity, unknown-operation preservation with executable rejection, deterministic transition ordering, complete table authoring, UI-authored Room reconstruction, execution of all five template contracts, reachable destination-World planning/execution, unreachable-record diagnostics, 12/13 actor-plan capacity, disabled-Behavior inertness/re-enable behavior, boundary-safe generated overlap in both runtime paths, honest single-room partial recovery, one-way `syncActiveFromPersistent` semantics, five legacy ROM oracles and atomic schema-12 rejection by the actual frozen 1.8 application.

The supplied `examples/Scout_Gameplay_Core_1.9.0.nesforge.json` is an ordinary editable World project using exactly the five approved template recipes. Its matching ROM and build record are included.

The full release gate comprises the 623 retained 1.8 cases plus 35 Gameplay Core cases. Evidence is in `test-results/candidate/Summary.json` and `checkpoints/1.9.0-clean-extraction/Reproduction.json`.

## Governance state

1.9.0 is the current corrected candidate awaiting independent audit and manual browser closeout; it is not automatically promoted. The bounded correction is authorized only against the preserved audited input candidate identified in D045. The 2026-09-15 roadmap/charter clarification changes no milestone authorization.

The next exact tranche awaiting possible authorization is **1.9.1 — Gameplay Expansion**. It includes Projectile, Moving Platform, in-session Checkpoint, NPC/basic dialogue interaction, ladders, one-way platforms, richer combat/traversal/events and configurable Door traversal/collision behavior. It is **not authorized**. **1.9.2 — Behavior UX** remains separately gated.

Audio expansion, mapper/resource-linker work, Raster Events/runtime profiles, RE integration, Method Registry, LiveLink, save backends and every later milestone remain outside 1.9.0. Forward authoring and RE must converge on canonical NES Forge representations, eventually covering both static assets and time-dependent NES behavior. Captured, Represented and Compilable remain distinct claims.

NES Forge's hard product boundary is NES / 8-bit / 6502-class. Modern hosting, networking, persistent-World, matchmaking, social/voice and collaboration infrastructure may surround a future NES client but cannot replace it with a modern, 3D or 16-bit runtime. Any future SNES/65C816 environment is a separate product.

The future eras are ordered as **1.x Create**, **2.x Understand & Manipulate**, and **3.x Connect**. The 3.x theme is **Hosted Worlds & Networked NES Games**, ordered from 3.0 Hosted Session/Network Foundation through netplay, hosted runtime events, persistent Worlds, economy/crafting/construction, large-match systems, social/voice and collaborative creation. Each NES client receives a bounded local projection of authoritative hosted state. All 2.x and 3.x milestones remain unauthorized and separately gated.
