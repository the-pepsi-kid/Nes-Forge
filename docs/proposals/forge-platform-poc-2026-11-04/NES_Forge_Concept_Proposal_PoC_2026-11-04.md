# NES Forge — Unified Platform, Hardware Bridge & ForgeNet
## Concept Proposal and Proof-of-Concept Charter

**Version:** 0.1 — evaluation draft  
**Prepared:** November 4, 2026  
**Decision sought:** Approve a staged, bounded proof of concept after core readiness gates; do **not** approve a public release, GitHub push, cryptocurrency issuance, or purchases by accepting this proposal.  
**Evidence basis:** NES Forge RC2 Build 5 and project audit Revision 2; audio/image/release review; owner discussions on physical carts, NES HUB, portable cyberdeck, 6502-native cryptography, hosted worlds, and Stellar-issued per-game tokens.

> **The concept in one sentence:** NES Forge should become one reliable environment for studying and authoring native NES software, deploying the resulting ROM to both emulators and original hardware, and optionally connecting NES games to secure modern services through a small, documented 6502-compatible interface.

## 1. Executive summary

NES Forge began as a browser-based NES editing and emulation environment and evolved into several overlapping initiatives: original game authoring, reverse engineering and narrow native ROM writing, a Zelda II-style hosted multiplayer prototype, and educational examples. The recent discussions add three experimental ambitions: a software-to-physical-cartridge bridge, a portable development cyberdeck, and game-specific assets on the Stellar network (with 6502 programs optionally participating in a cryptographic protocol).

This is a compelling long-term direction **only if we protect the original editor's fundamentals**. Today RC2 Build 5 is an internally coherent local review candidate, not a fully accepted editor. The stored recovery ledger covers 22 titles and 28 source revisions, with 17 partial and 11 unresolved; **zero complete recovered games**. Packaging integrity was checked, but the full original-game and user-journey acceptance cases remain open. The present work therefore splits into a stabilization program and an isolated experimental PoC.

**Recommended PoC:** use one rights-clear, newly authored Forge NES game to demonstrate a complete authoring/build/reopen lifecycle; run its identical game binary in the Forge emulator and on an original NES with an ordinary flash cartridge; simulate a simple `ACHIEVEMENT` protocol through an emulator bridge; have a modern companion service validate a deterministic challenge, issue a strictly controlled reward on Stellar Testnet, and return a verified result to the game. A real NES hardware link and 6502-native verification are subsequent gated extensions, **not unproven claims built into the initial demo**.

**Why this order:** a basic NES cartridge cannot automatically access the internet; the NES HUB is a useful expansion breakout/controller accessory but not an off-the-shelf general-purpose NES networking bridge; and Stellar tokens can be separate game assets without running a blockchain per game. A shared protocol allows future cartridge hardware, emulators, and a cyberdeck to speak to one modern service implementation.

### Concept-level success criteria

1. **Reliable Forge:** an independently runnable NES ROM and native project, with editor save/reopen and deterministic rebuild evidence.
2. **One binary, two execution targets:** the same supported `.nes` file runs in an independent emulator and on an original NES via a compatible flash cartridge; record hardware/mapper limitations.
3. **No magic network capability:** an explicit adapter boundary separates 6502 local game logic from bridge transport, authoritative event verification, and Stellar transaction processing.
4. **One safe ledger demonstration:** one approved, replay-resistant simulated achievement causes no more than one testnet asset transfer/issuance; the result can be queried and displayed; wallet signing remains off-console.
5. **Truthful release evidence:** test outcomes identify exact source/build hash and device; unsupported functions say *unverified*, not *complete*.

## 2. What NES Forge is — and is not

### 2.1 Core product definition

**Forge Studio** is a browser-centered NES development environment with resource editors (CHR/tiles, palettes, metatiles, Scenes, World, sprites/metasprites, animations, entities, collision, audio, assembly/code), project persistence, a ROM compiler, emulator and debugger. Its foundation is a versioned, canonical project/resource graph. Every editor tab must change the resource that actually reaches the saved project and built game, or clearly label itself as observational/preview-only.

**Forge Recovery** is a set of optional ROM-specific research adapters. It reads exact original-source identities, static/dynamic CPU/PPU/APU evidence, and partially recovered resources. It may expose *bounded native writers* only when source revision, offsets, invariants and affected bytes have been verified. ROM recognition is not equivalent to complete reconstruction.

**Hosted Worlds** is a separate experimental service consuming games' local mechanics and exposing networked rooms, wallet/identity pathways, authoritative state, server-side combat and persistence. Existing Zelda II work is valuable as a reference but does not certify original Zelda II game parity. Rev 8 remains a frozen comparison fixture, not the current live server.

**Forge Hardware Bridge** is a proposed transport and deployment layer, not presently shipped as a supported interface. It connects supported ROM files, approved flash/programmer hardware, an optional real NES-cartridge data interface, and modern companion services.

**ForgeNet** is a proposed optional service contract for identity, verified achievements, progression receipts, multiplayer status, inventory and game-specific ledger assets. Stellar is a candidate back end; games should not need to implement Stellar transactions directly.

**Forge Cyberdeck** is the proposed portable packaging of Studio, emulator, server/client tools, cartridge programming, network interfaces and securely separated crypto services. Initially it can be an ordinary Linux mini-PC; a custom enclosure or integrated NES is future research.

### 2.2 Explicit non-goals for the initial PoC

- No complete Zelda II, Castlevania or Punch-Out!! recovery; no promise of a universal writer for 700 ROMs.
- No commercial-game ROMs, music, decoded CHR, or unauthorized intellectual property in a distributable demonstration.
- No real-money value, exchange listing, mainnet token issuance, sale of NFTs, or public minting.
- No private key or seed phrase stored in ROM, cartridge RAM, emulator project files, Git history or server logs.
- No claim that an unmodified NES can independently run a current Stellar validator/full node.
- No claim that NES HUB's ESP32 automatically gives the NES an internet-capable memory-mapped register interface.
- No automatic merge of the three proposed DPCM/FX snippets or unverified image importer patch.

## 3. Evidence-based current baseline — November 4, 2026

| Dimension | RC2 Build 5 finding | Evidence classification | Implication |
|---|---|---|---|
| Release identity | `forge-consolidated-rc2`; integration tip `91d9f767a8e944ff4138790e47b87faafe41aeeb` | Checked against `RELEASE.json` | Frozen comparison candidate, not approved public release |
| Public repository reference | Main recorded as `6d07f1875074f1b3388cd647ff6177423d45acc7` | Recorded by package; do not assume latest remote state | Never conflate public/main with RC2 branch |
| Editor | `NES_Forge.html`; SHA-256 `556d50459c31bfd28da012ec3f0a0c062896637d7d6c327c287f9680755ff7b6`; 214 bundled modules | Independently checked in audit | Single canonical editor path and manifests required |
| Archive | 46,302,037 bytes, SHA-256 `94b5533936851b0307ecc13dd16d08165c1618ab173ee574e9b629fc8228df5c` | Independently checked in audit | Distribution-scanner outer ZIP mismatch still requires reconciliation |
| Scope of source intake | 22 titles, 28 registered exact revisions; 17 partial, 11 unresolved, zero full | Recovery ledger, checked | Native recovery is per-domain, not complete game importing |
| Authoring | CHR, World, Scenes, sprites, animation, audio, build flow present | Source/retained tests | End-to-end real-browser/core lifecycle acceptance still open |
| Castlevania | Two US revisions; captured courtyard pages, CHR transfers, APU observations and bounded audio cue support | Source-backed research and retained execution reports | Native stages, complete actor/collision/audio writer remain incomplete |
| Punch-Out!! | Glass Joe recovery and narrow original-data edit flow | Retained source and tests | Complete arena/fight behavior and state parity unresolved |
| Zelda II host | Separate experimental world service, current host differs from Rev 8 reference | Compared by audit | Preserve baseline and independently test resumed worlds, input and movement |
| Image upload | Current importer stretches source; proposed higher-quality module available | Current source checked; patch smoke-tested | Core UX upgrade candidate, gated browser/ROM tests only |
| Audio DPCM | Authored runtime uses 4 generated synthesis channels; proposed DPCM patch incomplete | Current source checked; design review | Implement sample placement/APU protocol in isolation later |
| User acceptance | Some exact-hash test reports fresh; others retained; cold-boot physical tests not independently performed | Mixed | No unqualified "everything passes" claim |

**Scope note:** The package holds thousands of archival/recovery/test entries, not thousands of separate features. The RC2 release also includes derived commercial graphics in private recovery evidence, making the original consolidated ZIP unsuitable for unrestricted public redistribution.

### 3.1 ROM portfolio already tracked

The 22 recorded title groups are: **1943; Adventures of Lolo; Battletoads; Castlevania; Castlevania II; Contra; Double Dragon; Final Fantasy; Gun.Smoke; Hudson's Adventure Island; Kid Niki; Kirby's Adventure; Kung Fu; Mega Man; Mega Man 2; Metroid; Mike Tyson's Punch-Out!!; Ninja Gaiden; River City Ransom; Shadowgate; Teenage Mutant Ninja Turtles; Zelda II.** These are reference/research entries, not promises that all complete games import or export.

### 3.2 Preserve, stabilize, investigate, defer

| Lane | Contents | Decision |
|---|---|---|
| **Preserve** | RC2 ZIP/hash, public alpha, Pepsi archive, six recovery refs, private ROM identities and saves, Rev 8 comparator, source-linked trace evidence | Never rewrite history casually; keep restricted files private |
| **Stabilize** | Release identity, editor canonical resources, project lifecycle, sound, graphics, emulator, native supported writer refusal | Entry criteria to new features |
| **Investigate** | Image import candidate, DPCM redesign, hardware bridge, 6502-native cryptography, Stellar Testnet | Independent branches/prototypes, no silent promotion |
| **Defer** | New game-specific recovery volume, anthology/Stacys demos, public game economy, public hosted MMO, custom NES HUB firmware, custom cyberdeck enclosure | Resume only against a proven platform need |

## 4. Unified product architecture

```text
  +-------------------------------------------------------------+
  |                  NES FORGE STUDIO                            |
  | Project/Resources  Editors  Build  Debug  Emulator           |
  +---------------------------+---------------------------------+
                              |
                 canonical versioned resource graph
                              |
         +--------------------+-------------------+
         |                                        |
  +------+-----------------+           +----------+-------------+
  | ROM RECOVERY ADAPTERS  |           | ROM BUILD / EXPORT     |
  | source IDs & traces    |           | mapper, PRG/CHR, audio |
  | typed evidence/resources|          | checks, manifest      |
  +------------------------+           +----------+-------------+
                                                 |
                     +---------------------------+----------------+
                     |                           |                |
                Emulator                  Flash cartridge    Programmed cart
                     |                           |                |
             Emulated bridge         Original NES/bridge (optional device)
                     +---------------------------+----------------+
                                                 |
                                      Versioned ForgeNet protocol
                                                 |
                              +------------------+------------------+
                              | Modern companion / cyberdeck service |
                              | transport, session, auth, validation |
                              +------------------+------------------+
                                                 |
                              +------------------+------------------+
                              | Off-chain game authority / audit log |
                              +------------------+------------------+
                                                 |
                              +------------------+------------------+
                              | Stellar Testnet integration adapter  |
                              | issuer/distributor, asset, receipts |
                              +-------------------------------------+
```

### 4.1 One source of truth per concern

- **Project source of truth:** versioned Forge project graph; Resources/World/CHR/Audio/Animation panels use stable IDs and explicit transforms.
- **Native ROM source of truth:** immutable original ROM hash plus an evidence ledger; no inferred data silently promoted to original behavior.
- **Build source of truth:** one manifest, one generated editor identity, one compiler input and one target hardware/mapper profile.
- **Runtime gameplay source of truth:** NES CPU for standalone local rules; a clearly specified authoritative server for networked state or economically meaningful rewards.
- **Economic source of truth:** Stellar asset balances/transactions, but only for *settled* rewards; moment-to-moment movement, lives, XP, combat and local game progression remain off-chain.
- **Secret source of truth:** external wallet/key storage or security module; never NES ROM bytes.

### 4.2 Modularization priorities

Retain deterministic bundling but reduce identity confusion: one supported HTML output, clear build-version label, test provenance and optional extension manifests. Decompose orchestration gradually around stable resource and protocol contracts; do not attempt a wholesale rewrite just for aesthetics. Hosted Worlds, hardware and chain integrations can ship independently of Studio.

## 5. The hardware bridge: physical NES without replacing NES software

### 5.1 Three deployment pathways

**Path A — Emulator:** any supported `.nes` runs in Forge's emulator and a separate reference emulator. The initial protocol can be mediated by an emulator-specific bridge that observes explicit game requests through a designed interface; a plugin or emulator change is needed—no current bridge is assumed.

**Path B — Flash cartridge:** the same mapper-compatible ROM is loaded on an ordinary NES-001 via a flash cartridge. This validates native execution and graphics/audio/input fidelity. A flash cartridge does **not** automatically provide a gameplay networking API merely because it offers USB for development.

**Path C — Programmable physical cart:** a compatible development board receives verified PRG/CHR data through an appropriate programmer/dumper. Some boards are flashable and some are not; the mapper, board wiring, memory profile, write protection and cartridge voltage must match. Cartridge reading and writing are separate hardware operations requiring device-specific validation.

### 5.2 NES HUB: real capabilities versus research ideas

The RetroTime NES HUB for the NES-001 expansion port offers BlueRetro-powered Bluetooth controller support for up to four players, selectable expansion audio paths, and Mini DisplayPort-style breakout connectors for controller/expansion/CPU signals. This makes it a promising **hardware research interface**. The published feature list does **not** establish a built-in network protocol, directly usable CPU memory-mapped mailboxes, wallet processing, unrestricted cartridge-bus reading, or a programmer. A custom electrical and firmware design would be needed for those uses. [S4]

The physical-cartridge Wi-Fi example *Super Tilt Bro.* demonstrates that an ESP8266/FPGA-equipped NES cartridge can run online play, proving a connected NES cartridge is possible while also demonstrating that special hardware and game-specific netcode are required. [S5]

### 5.3 Portable Forge Cyberdeck — first, practical form

| Module | First viable form | Research/production form |
|---|---|---|
| Compute | Existing Linux x86 laptop/mini-PC or capable SBC | Self-contained cyberdeck mainboard |
| Development | Forge Studio/browser, compiler, CLI, logs | Integrated graphical dev workflow |
| Local play | NES emulator and wired controls | Custom controller/embedded display |
| Cartridge use | Off-the-shelf mapper-compatible flash cart and optional programmer | Cartridge slot with shielded power and supported read/write circuits |
| Networking | Wi-Fi/LAN and local service | Optional portable hotspot/offline-first queue |
| Server | Companion service and small local host | Full hosted-world service where resources permit |
| Crypto | Testnet adapter with external wallet/key handling | Secure element or audited custody model if ever required |
| Expansion | USB serial/microcontroller prototype | Validated NES HUB/cartridge hardware protocol |

The cyberdeck should first be a **portable deployment of known software**, not a new console motherboard. A working toolchain and repeatable cartridge programming process are more valuable than a custom enclosure in the first PoC.

## 6. How much cryptography can 6502 assembly do?

A 6502-family processor can compute CRCs, checksums, hashes and—in principle—more sophisticated cryptographic primitives. The NES CPU has only 2 KB of onboard RAM; cartridge expansion can help, but cycle budget, code footprint and latency remain serious constraints. [S1]

**Proposed layering:**

1. **NES local protocol:** fixed-size messages, sequence numbers, game-generated event data and a CRC for accidental transport errors. CRC is *not* a security signature.
2. **Optional native 6502 crypto lab:** benchmark a small digest or commitment verification routine with exact CPU cycles, memory usage and deterministic test vectors. A SHA-256 implementation is a research candidate, not an accepted feature.
3. **Companion device:** holds session credentials and securely communicates with a server; may validate signed receipts for the NES and provide compact confirmation.
4. **Server:** verifies authentic game state or accepted game-event evidence, blocks replay and enforces reward rules. A bare cartridge hash does not prove an honest playthrough.
5. **Stellar adapter:** builds and submits only authorized transactions; records results and exposes idempotent status.

No game ROM should contain an actual signing private key. A 6502-created digest can prove data consistency under a known protocol, not by itself the identity of the player, the legitimacy of the hardware, or the fairness of a run.

## 7. Stellar design: separate game assets, not separate chains

**Proposed choice:** one shared Stellar network with distinct per-game assets, rather than a chain per NES title. In Stellar, a classic issued asset is identified by both its asset code **and issuer account**; the native fee/reserve asset is **XLM**, not the game's custom token. Recipients ordinarily establish a trustline before holding an issued asset, and sponsorship may reduce end-user reserve friction. [S6][S7]

| Concept | Proposed PoC treatment | Later possibility |
|---|---|---|
| Game reward asset | One synthetic **`FORGEDEMO`** classic Stellar asset on **Testnet**; issuer explicitly recorded | Distinct issuer/code pairs for original, authorized games |
| Separate Zelda II-style game asset | **Design example only**, e.g., `Z2TEST`; not issued | Rights-cleared game-specific token system |
| Castlevania-style game asset | **Design example only**, e.g., `CVTEST`; not issued | Rights-cleared game-specific token system |
| Game progression | Off-chain, deterministic, versioned | Server-authoritative shared worlds |
| Token issuance/transfer | Companion service; issuer/distributor separation; caps and duplicate-event controls | Managed contract minting, exchange policy, audits |
| Smart contract | Not required to transfer a classic test asset | Soroban contract for scarce collectibles/rights if demonstrably needed |
| Player identity | Test identity plus opt-in test wallet; no required live mainnet signing | Noncustodial wallet/linking service with clear consent |
| NES console | Displays status/ownership only through bridge response | Compact light verification if benchmark and threat model justify it |

Stellar Testnet can be reset, so treat it as disposable infrastructure and keep a separate local test ledger of event IDs and expected issuance state. A local Stellar Quickstart network is also an option for fully offline development before shared Testnet. [S8][S9]

**Important separation:** an original game's XP, Attack/Magic/Life or other gameplay rules should not automatically equal transferable tokens. Tradeable rewards are a different system. A blockchain records a reward after validation; it does not itself determine whether a boss died or a level was completed honestly.

**Risk boundaries:** no mainnet wallet prompt for a localhost demo, no private keys inside ROM, no public sale or market valuation in PoC, no transferability promise, no use of commercial game names/art to promote tokens without a legal review, and no characterization as investment products. Regulations, taxes, custody and age-appropriate onboarding must be reviewed before public token issuance.

## 8. ForgeNet protocol — an intentionally small contract

### 8.1 Goals

- A ROM does not need to know HTTP, Wi-Fi, Stellar RPC or wallet interfaces.
- Identical logical requests operate through an emulated transport and a separately implemented physical transport.
- Communication is optional: offline game logic still runs wherever feasible.
- Every packet is bounded; unsupported versions or commands return explicit errors.
- Only the server can authorize financially meaningful asset events.

### 8.2 Proposed version-0 wire envelope (**not implemented**)

| Field | Type | Meaning |
|---|---|---|
| `magic` | 2 bytes | Protocol marker (example `FG`) |
| `version` | uint8 | Protocol revision = 0 |
| `type` | uint8 | Request/response command |
| `seq` | uint8 | Per-session request sequence |
| `length` | uint16 little-endian | Payload size; bounded by negotiated transport limit |
| `payload` | bytes | Command-specific data |
| `crc16` | uint16 | Accidental corruption detection only |

This wire envelope is **a proposal**, not a claim that `$5000` or any other CPU addresses already exist on the NES HUB. A memory-mapped cartridge bridge would need a separate, tested hardware register specification with flow control and bus collision avoidance; an emulator bridge would need a compatible virtual device.

### 8.3 Minimum commands

| Command | Request | Response | Security rule |
|---|---|---|---|
| `HELLO` | protocol version, game build hash, mapper, capabilities | protocol/version/capabilities | Reject incompatible adapters |
| `PING` | nonce | echo/status | No game authority |
| `AUTH_STATUS` | session reference | authenticated/guest/capability bits | Signing outside NES |
| `SUBMIT_EVENT` | event ID, type, session, state digest, optional signed run evidence | accepted/pending/rejected | Server verifies; client claims never sufficient |
| `GET_REWARD` | event ID | pending/settled/rejected + opaque receipt | Receipt bound to game/session/asset |
| `GET_BALANCE` | game asset namespace | compact display balance + source timestamp | Display-only unless independently verified |
| `GET_WORLD_STATE` | room and cursor | bounded state update | Server authoritative for shared play |

For the PoC, only `HELLO`, `PING`, `SUBMIT_EVENT`, and `GET_REWARD` are necessary. `GET_BALANCE`, wallet binding, and multiplayer are optional extensions.

### 8.4 Replay and failure controls

A reward event is keyed by `(network, gameId, buildHash, sessionId, eventId, rewardRuleVersion)` with a unique constraint. Server sessions use unpredictable challenges, expiration, per-device/user rate limits, and idempotent reward processing. A repeated packet returns the same status, never a second reward. Network errors show pending/unknown; they do **not** award tokens locally. Test data can be fully reset without affecting unrelated Forge projects. Wallet keys and personal identifiers are excluded from logs and trace exports.

## 9. Proof-of-concept charter — the recommended experiment

**PoC name:** `Forge Bridge 0.1 — One ROM, Two Targets, One Verified Reward`  
**Test content:** original, synthetic NES game developed in Forge; no Nintendo-derived assets or original commercial ROMs.  
**Primary question:** Can a supported Forge-built ROM preserve gameplay across emulator and physical NES, while the same simple event protocol safely connects an emulated gameplay event to a modern Stellar Testnet reward service?

### 9.1 Track A — Core readiness (a mandatory entry gate)

- Freeze RC2 Build 5 and record full ZIP/editor SHA-256.
- Fix release-truth and distribution layout **on a separate candidate**, not by rewriting the historical ZIP.
- Create a small fresh game in Forge (two screens, collision, one player/metasprite, animation and one four-channel authored SFX), save and reopen native project, build `.nes`, cold boot in Forge and independent emulator, and compare behavior.
- Record image uploader as current legacy capability; the improved image patch may be qualified separately, but is **not** a condition for this PoC.
- Evidence: complete project JSON, derived ROM built from rights-clear resources, build hash, test recording/screen captures, signed acceptance checklist and compiler profile.

**Exit:** If Track A fails, pause hardware/ledger demonstrations; diagnose core ownership/build defects first.

### 9.2 Track B — Deploy the ROM to original NES hardware

- Identify a specifically tested NES console revision, region and mapper profile supported by the Forge compiler and available flash cartridge.
- Cold boot the *same binary* on an independent emulator and on original NES hardware; log mapper, flash cart firmware/version, A/V chain and controls.
- Run scripted movement/audio/scene transitions and compare observed results; record differences honestly.
- If cartridge programming tools are present, perform read/flash/readback **only on a compatible rights-clear development board**; this is optional for initial demo.

**Exit:** An original NES running a verified identical ROM is achieved; this **does not** prove live network connectivity on the physical console.

### 9.3 Track C — Emulator-side ForgeNet protocol proof

- Implement a test harness or virtual device that exposes versioned command messages to the original ROM; require explicit game opt-in and feature negotiation.
- Demonstrate `HELLO`, `PING` and one deterministic `SUBMIT_EVENT` scenario from the same test game; include an invalid message and simulated loss of connection.
- Build a companion service with a local authoritative challenge and an append-only test audit trail. The proof of gameplay should come from server-observed deterministic state or a constrained replay, **not merely from a client-provided `boss_defeated: true` flag**.
- Use fixed test vectors so every message can be reproduced byte-for-byte and decoded outside the emulator.

**Exit:** The ROM-emulator bridge and the server agree on one event under success, rejection, duplicate and offline conditions.

### 9.4 Track D — Stellar Testnet asset proof

- Create issuer/distributor and test-recipient accounts strictly on **Stellar Testnet** (or first on local Quickstart). Use a clearly documented synthetic asset code such as `FORGEDEMO`; record issuer address, network passphrase and asset metadata in test-only configuration.
- Establish/verify trustline with opt-in test recipient; use reserve sponsorship only if needed and verified.
- On exactly one accepted event, transfer a small, fixed quantity of the synthetic test asset. Record transaction hash, ledger time and idempotency key. A rejected or duplicate event must produce **no new transfer**.
- Return only a compact, nonsecret receipt/status to the NES; display `PENDING`, `AWARDED`, `REJECTED` or `OFFLINE` as appropriate.
- If Testnet resets, reinitialize without treating network disappearance as a historical project data loss or double reward.

**Exit:** Game event → authorized bridge event → testnet transaction → returned game-visible status, with negative tests.

### 9.5 Track E — Real NES network bridge (**next PoC, not implied by Track B**)

- Select either a compatible **network-enabled cartridge** or a **designed and electrically reviewed NES HUB accessory** with actual CPU-visible registers.
- Produce schematic, memory map, bus timing, power/level shifting, signal safety and firmware build; do not short or assume behavior of breakout pins.
- Implement `HELLO` / `PING` on physical NES and validate buffering, timeouts and errors with a logic analyzer.
- Integrate Track C `SUBMIT_EVENT` only after device protocol passes stress tests.

**Exit:** Only after a physical read/write protocol is proven may we call a real NES a *connected ForgeNet participant*.

### 9.6 Track F — Cyberdeck packaging (**future integration**)

Start with a conventional portable Linux host, not a custom PCB. Confirm it can open Forge, compile, launch an emulator, run the companion service, and operate a supported cartridge programming interface. Make hardware inventory and repeatable setup scripts before designing an enclosure. Hosting full multiplayer or blockchain validation nodes is optional and requires resource measurements.

## 10. Acceptance matrix for the PoC

| ID | Test | Evidence | Pass condition |
|---|---|---|---|
| CORE-01 | Blank original project → save → reopen | project, screen capture, activity log | No missing/changing resource IDs |
| CORE-02 | Build ROM twice from identical inputs | compiler receipts + binary hashes | Deterministic output within declared environment |
| CORE-03 | Emulate independently | emulator logs, capture | Game starts and scripted play works |
| HW-01 | Load same ROM on original NES | real hardware video + ROM SHA | Identical PRG/CHR artifact executed; functions checked |
| HW-02 | Program/readback a supported cart (optional) | hardware log, original/test hashes | Exact readback or explained platform-specific normalization |
| NET-01 | Protocol HELLO/PING | byte-vector captures | Version agreed, nonce round-trips, invalid frame rejected |
| NET-02 | Accepted event | server replay trace | Authorized event leads to one reward intent |
| NET-03 | Duplicate/replayed event | database and transport test | No second reward intent/transaction |
| NET-04 | Network offline | emulator UI and logs | Game remains playable; reward pending or rejected safely |
| XLM-01 | Testnet issued asset setup | account/issuer/recipient/asset records | Correct network, trustline and asset issuer verified |
| XLM-02 | Settle one approved event | transaction ID + receipt | One verified testnet transfer linked to event ID |
| XLM-03 | Reject forged event | server and ledger check | No transfer, clear failure reason |
| SEC-01 | Secret isolation | static scan and logging inspection | No seed/private key in ROM, JS bundle, ZIP or logs |
| REL-01 | Traceable artifact | release manifest | Build, source, tests and device versions link unambiguously |
| IP-01 | Distributable rights-clear fixture | inventory and scan | No unlicensed commercial ROM/audio/CHR in public PoC |
| P-HW-01 | Physical bridge packets (Track E only) | logic-analyzer trace | Physical `HELLO`/`PING` passed on real NES |

**Do not label a demo “hardware-connected crypto NES” if only Tracks B–D separately passed.** The complete physical connected demonstration requires Track E.

## 11. Experimental hardware capability matrix

| Hardware / software | Established capability | Assumption to test | PoC role |
|---|---|---|---|
| Forge RC2 | Original ROM building and emulator infrastructure exists | Exact authored game lifecycle meets current acceptance | Studio baseline |
| NES-001 | Runs compatible original NES software | Specific console works with selected flash hardware | Real hardware execution |
| EverDrive N8 Pro (example) | Broad mapper support and USB development connector documented | Whether its USB interface supports our **specific** live game protocol | ROM playback first; not automatically our network link |
| INLretro-compatible programmer (example) | Supports mapper-dependent reading/programming on supported boards | Selected board + firmware/adapter matches our cart | Optional programmed cart/readback |
| RetroTime NES HUB | BlueRetro and expansion signals exposed | Ability to make an electrically safe CPU-visible data path | Research candidate, not PoC prerequisite |
| Networked custom cart | Demonstrated by Super Tilt Bro.-style architecture | Protocol, board, firmware, game port and cost | Next PoC physical network path |
| Linux cyberdeck | Can host ordinary workstation software if capable | Browser/compilers/drivers and thermal/power profile | Portable toolchain integration |
| Stellar Testnet | Shared token network and APIs | Account/trustline, transactions, resets and latency under our flow | Experimental reward ledger |

**Purchasing decision:** None approved here. Select hardware based on the compiler's actual mapper output and available device compatibility, not on attractive photographs alone.

## 12. Safety, security and legal guardrails

**Hardware:** Only connect expansion connectors with verified signal pinout, direction, electrical levels, power rails, bus timing and protection. Mini DisplayPort-shaped connectors on NES HUB are signal breakout connectors—not evidence that ordinary DisplayPort equipment is safe or compatible.

**Crypto:** Keep all real and test credentials outside ROMs. Separate game authority from token settlement. Bind event receipts to game build, session and validator decision. Run every economic path against replay/rollback/reorg-like network failure scenarios; use Testnet only. A full Stellar node is a modern machine role, not a 6502 ROM feature.

**Wallet UX:** Make local guest/test identity available without requiring a mainnet Ethereum wallet signature. Any external signing prompt must identify chain/network, requested operation, and consent. Testnet account creation must not be silently promoted to mainnet.

**Copyright and IP:** Use original art/audio/game logic in distributable PoC. Owner-held classic ROMs may remain in private research; extracted commercial CHR, music, scene JSON and derived artwork should not be published without adequate rights. Avoid issuing branded assets associated with commercial franchises without permission.

**Release:** Retain a private full-forensics artifact, a clean distributable editor/PoC artifact, and a separate developer source/Git bundle. No GitHub push, merge, external publication, network minting or hardware purchase is authorized by this proposal.

**Quality:** Every acceptance item must state `not run`, `pass`, `fail`, or `blocked`, with exact candidate SHA, date, environment, tester and supporting files. Retained old tests cannot count as current fresh passes.

## 13. Risks, dependencies and mitigation

| Risk | Likelihood / consequence | Mitigation / stop trigger |
|---|---|---|
| Forge core lifecycle fails | High / blocks all subsequent claims | Complete core gates first; do not disguise with sample binaries |
| Physical target mapper mismatch | Moderate / game won't boot | Build hardware profile; test exact ROM and cart configuration |
| Real NES bridge cannot access chosen registers | High / connected hardware track blocked | Isolate link as Track E; require schematic and logic-analyzer proof |
| Client forges an achievement | High / invalid token awards | Server-verified deterministic replay; invalid event test; idempotency |
| Testnet instability / resets | Moderate / data disappears | Disposable Testnet assets, local event log, explicit network separation |
| Unauthorized copyrighted content in demo ZIP | High / distribution risk | Rights-clear PoC, automated asset scan, separate private evidence |
| Wallet keys leak | Critical / financial loss | External key storage, no keys in ROM, static package scan |
| Conflicting Forge build identities | High / audit impossible | Canonical current release manifest and exact source hashes |
| Audio DPCM patch breaks working music | Moderate / ROM regressions | Reject as-is, isolated proof and APU assertions before merge |
| Cyberdeck design expands beyond software proof | High / stalled schedule | Ordinary computer first; custom enclosure explicitly deferred |
| Token economy changes original game balance | Moderate / lost authenticity | XP and gameplay remain separate from transferable assets |
| Regulatory or consumer-protection exposure | Potentially high / external release blocker | Testnet non-value demo only; counsel review before real assets |

## 14. Sequencing and decision gates

**Gate 0 — Freeze and inventory:** approve exactly one canonical baseline, preserve source/ROM evidence, current audit and test classification. No production changes.

**Gate 1 — Core acceptance:** complete authoring/build/save/reopen and independent emulator cold boot with a rights-clear sample; owner records failures and greenlight.

**Gate 2 — Hardware execution:** one ROM boots on real NES through a tested flash cart. This proves deployment, not networking.

**Gate 3 — Protocol and authority:** emulator virtual link with deterministic events, replay protection and offline behavior. No chain required yet.

**Gate 4 — Stellar Testnet:** one synthetic issued asset and one validated reward; negative cases and receipts. Mainnet forbidden.

**Gate 5 — Physical network interface:** separate electrically reviewed, CPU-visible cartridge/expansion board prototype. Only here can physical NES act as a network participant.

**Gate 6 — Cyberdeck packaging:** portable workstation and cartridge I/O integration after the above repeatable paths; enclosure and production PCB deferred.

At each gate, publish a **bounded result**, not a new monolithic release. If the PoC stops after Gate 4, the honest result is: “A native NES ROM ran on real hardware, and an emulator variant demonstrated a secure testnet rewards link. Physical networking remains future work.”

## 15. Core stabilization work retained from the existing audit

This proposal **does not replace** Project Audit Revision 2's core findings. Its next engineering baseline must still address: source-of-truth/reference version drift; stale documentation and build names; browser startup and canonical project state; CHR/World/Scene/Resources identity; audio compile, actual listening and DPCM gap; image-upload importer candidate testing; exact-title recovery grades; correct unsupported native writer refusal; separate hosted world preservation and input/authority tests; commercial asset separation; test provenance.

**Specific existing technical decisions:**

- **Image upload:** treat as core background Scene import. Proposed aspect/palette/tile-budget module passed a bounded conversion smoke test but still requires browser UI, undo/save and ROM output tests. Sprite/metasprite/collision import is separate scope.
- **DPCM/FX:** supplied compiler/6502 snippets are **not ready to merge**. Their 5-/6-byte event inconsistency, absent sample-data placement, wrong DMC register encoding, missing trigger and incomplete effects require a new ABI and hardware tests. DMC `$4012` encodes sample start in 64-byte units above `$C000`; `$4013` encodes `(length-1)/16`; `$4011` is DAC output level. [S2][S3]
- **Native recovery:** treat Castlevania courtyard and audio evidence, Punch-Out!! narrow native writers, and Zelda II original room/movement trace work as partially complete research with explicit provenance. Do not equate source observations with perfect 1:1 gameplay.
- **Hosted Worlds:** preserve original Rev 8 separately; compare current host changes; prevent first-time setup from rewriting edited worlds; use opt-in wallets and clearly label pilot combat switches; independently investigate reported origin/locking behavior.
- **Version/distribution:** correct outer ZIP receipt mismatch, retain one canonical editor file and an explicit release/version document; keep commercial derivatives private.

## 16. Deliverables expected from the next PoC effort

| Deliverable | Description |
|---|---|
| Rights-clear Forge project | Native `.nesforge.json` plus original art/audio/source and license |
| Built NES ROM | Exact SHA and mapper/PRG/CHR header report; no hidden commercial assets |
| Emulator test kit | Deterministic scripted play and independent emulator capture |
| Physical test record | NES model/revision, cartridge model/firmware, setup photos or video, pass/fail matrix |
| Protocol specification | Version-0 wire envelope, commands, host-side tests and negative vectors |
| Emulator bridge | Test harness/virtual device with explicit integration API |
| Companion service | Configured for local-only/loopback by default; test challenge and event ledger |
| Stellar adapter | Testnet-only sample asset issuer/distributor/recipient setup; no exported secrets |
| Test report | Current exact-binary evidence, failures, limitations and owner acceptance |
| Updated audit & current release record | What the prototype changed, what it did **not** prove, and next proposed gate |

## 17. Governance and owner decisions requested

1. **Confirm a research-only ForgeNet/Hardware Bridge track** while the core remains frozen until Gate 1 passes.
2. **Accept Stellar Testnet as the provisional chain**, rather than separate blockchains per game. Asset names remain illustrative; no issuance is authorized.
3. **Choose an original, rights-clear demonstration game** as the PoC fixture, with original mechanical progression independent of tradeable assets.
4. **Confirm physical hardware availability** (NES model, flash cartridge, programmer, cyberdeck machine) before scheduling Gate 2; avoid implied purchasing commitments.
5. **Choose which gate defines the first demo:** minimal credible recommendation is Gates 1–4 with Gate 5 separately named as physical connectivity research.
6. **Preserve the owner authorization policy:** do not push Git or issue assets until explicitly approved.

## 18. Closing concept

NES Forge does not need a new NES blockchain, a custom cartridge, a cyberdeck enclosure and a fully recovered Zelda II game to prove the central idea. It needs one trustworthy NES authoring lifecycle, one hardware-compatible game binary, one deliberate protocol boundary, and one small controlled example of a legacy 6502 program participating in a modern verified service.

If those are reproducible, hardware-adapter support, programmatic cartridge creation, richer 6502 cryptography, portable cyberdeck integration and distinct Stellar assets for future rights-clear games become extensions of a coherent platform rather than disconnected experiments.

---

## Appendix A — Source and evidence register

**Internal project artifacts, November 4, 2026:**

- `NES_Forge_Consolidated_RC2_Build_5.zip` — `RELEASE.json`, `CANDIDATE.json`, `app/source-manifest.json`, `docs/recovery/extraction-coverage.json`, `docs/recovery/rc2-results/summary.json`, `START_HERE.md`, `docs/recovery/STATE.md`.
- `NES_Forge_Project_Audit_2026-11-04_Rev2.md` — baseline audit, counts and release/graphics/audio findings.
- `NES_Forge_Audio_Image_Release_Review_2026-11-04.md` — DPCM patch and image-import/release review.
- Owner-supplied DPCM compiler, 6502 emitter, native transcriber snippets and external review feedback; `files (imageupload).zip` image-import candidate.
- Discussion record: NES HUB, NES flash and programmed carts, original-hardware deployment, portable cyberdeck, 6502 cryptography and Stellar game-specific assets.

**External references (accessed November 4, 2026):**

- [S1] NESdev CPU memory map: https://www.nesdev.org/wiki/CPU_memory_map
- [S2] NESdev APU register reference: https://www.nesdev.org/wiki/APU_registers
- [S3] NESdev APU DMC: https://www.nesdev.org/wiki/APU_DMC
- [S4] RetroTime NES HUB official GitHub: https://github.com/time2retro/NES-Hub
- [S5] *Super Tilt Bro.* hardware/software overview: https://super-tilt-bro.com/about.html
- [S6] Stellar official developer portal (asset issuance and protocol overview): https://developers.stellar.org/
- [S7] Stellar classic asset identification and trustline behavior: https://developers.stellar.org/launch/usdt0
- [S8] Stellar Quickstart local network: https://developers.stellar.org/docs/tools/quickstart/advanced-usage/run-command-examples
- [S9] Stellar development/testing tools: https://developers.stellar.org/docs/tools/lab/quickstart-with-lab
- [S10] EverDrive N8 Pro official manual (USB/dev and mapper support): https://krikzz.com/pub/support/everdrive-n8/pro-series/n8-pro-manual.pdf
- [S11] INLretro programmer/dumper open-source interface: https://github.com/BrokeStudio/INLretro-CLI-GUI

## Appendix B — Definitions

- **ROM:** NES cartridge image encoding program/graphics data and mapper metadata.
- **Native writer:** validated mechanism that changes original ROM data for a known source revision; not the same as making a brand-new ROM.
- **Mapper:** cartridge hardware implementing bank switching and/or additional memory or peripherals.
- **ForgeNet node:** informally a device participating in the game network; **not** a Stellar consensus validator. Avoid misleading “full node” language.
- **Lightweight client:** a participant that verifies a defined subset of cryptographic state/proofs, not merely trusts server claims.
- **Stellar asset:** custom code plus issuer identity on Stellar; distinct from native XLM.
- **Testnet:** disposable development network; not production or proof of economic/security readiness.
- **PoC:** reproducible, bounded technical demonstration, with defined omissions and stop gates.

## Appendix C — Change-control boundary

This proposal is documentation only. It modifies no existing NES Forge release, code, branch, user ROM, saved multiplayer world, wallet or blockchain state. Its concepts are proposed tasks subject to owner review, not commitments or completed functionality.