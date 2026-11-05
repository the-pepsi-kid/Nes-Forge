# NES Forge — Audio, Image, Release, Hardware & Stellar Review · Revision 2

**Date:** November 4, 2026  
**Companion:** `NES_Forge_Project_Audit_2026-11-04_Rev3.md` and `NES_Forge_Concept_Proposal_PoC_2026-11-04.md`  
**Status:** Decisions for scope and testing; **not** implementation approval. Development remains paused.

## Reviewed inputs

1. Owner-provided Patch 1 (audio compiler), Patch 2 (6502 audio driver), and Patch 3 (native audio transcription), supplied as code snippets. **Not applied**.
2. Saved RC2 Build 5 and its actual `app/src/audio/audio-compiler.js`, `audio-engine.js` and `app/src/re/native-audio-recovery.js`.
3. The separate uploaded image-import ZIP: `image-import.patch`, `image-to-nes.js`, `image-conversion.cjs`, `IMAGE_IMPORT_REPORT.md`, and `before_after.png`. This ZIP contains **no audio patch**.
4. Owner-provided external feedback on archive identity, documentation, retained tests, host safety, package weight, and derived commercial artwork.
5. Hardware specification: [NESdev APU registers](https://www.nesdev.org/wiki/APU_registers), [DMC](https://www.nesdev.org/wiki/APU_DMC) and [CPU memory map](https://www.nesdev.org/wiki/CPU_memory_map).

## Decision record

| Item | Recommendation | Rationale | Preconditions to change status |
|---|---|---|---|
| Image upload improvement | **Core priority, candidate only** | Existing action stretches to 256x240 and sacrifices late tiles at budget limit; patch adds aspect/palette/quality selection and better tile budgeting | Real browser, persistence, undo, ROM, and unchanged frame-capture tests on an isolated candidate |
| Supplied DPCM compiler and emitter | **Do not merge** | No sample data layout; event size inconsistency, no trigger, wrong APU registers, regression in missing-SFX validation | Typed DPCM resource, mapper allocator, event ABI, 6502/APU assertions, independent playback |
| Supplied transcription | **Retain as research notes** | `sampleId=0` based on DMC activity is not proof of a recoverable encoded sample; frame snapshots cannot recover native timing | Recover original source bytes and descriptors, preserve provenance, disclose adaptation fidelity |
| Release feedback | **Audit blocker where verified** | Multiple version identities, inconsistent scan receipt, retained tests, and derived art in release archive | Correct current release record, public/private distribution split, fresh owner/browser tests |
| Host-specific review | **Separate investigative track** | Review says frozen Rev 8 differs from current host; other concurrency/wallet claims require targeted tests | Reproduction and risk-led fixes; do not gate standalone NES editor on hosted MMO pilot |

## Specific audio block list

- **Event ABI:** proposed compiler estimates 5 bytes/event, emitter writes 6 bytes/event, scanning advances by 5 bytes and the effects/sample bytes are not consistently parsed.
- **Samples:** no aligned samples are actually emitted into CPU-visible ROM; DMC cannot read placeholder descriptors.
- **Registers:** `$4011` is DAC level (not loop), `$4012` is `($address-$C000)/64`, `$4013` is `(length-1)/16`, and `$4015` must not disable other channels.
- **Dispatch:** `dpcmActive` never receives a trigger; sample-table offsets are wrongly doubled.
- **Validation:** rate index 0 is incorrectly defaulted by `||`; typed byte and length validation is missing; missing SFX IDs silently fall back instead of failing.
- **Transcription:** DMC activity is metadata, not a serialized DPCM audio asset; sample index 0 is unsupported without extracted bytes.

## Image-import acceptance checklist

- [ ] Desktop Chrome/Edge PNG, JPEG, transparent PNG through Upload Image and drag/drop.
- [ ] Keep aspect, fill/crop, stretch; Current/Auto palettes; compare output to source at each setting.
- [ ] Validate 960-tile nametable entries, 64-byte attribute table and <=256 unique background tiles in exported CHR, including exact-limit and over-budget inputs.
- [ ] Verify scene source dimensions/options are retained as provenance without hiding original byte copies.
- [ ] Undo/Redo, project save/reopen and deterministic ROM build/play preserve imported visual state.
- [ ] Emulator screenshot/capture still produces its prior quantization result.
- [ ] Compare representative text, pixel art and photographs using visual inspection and reproducible image metrics. Report's A/B helper scripts are not present in the supplied five-file ZIP; request or recreate them before treating F1/RMSE as independently reproduced.

## Release and host acceptance checklist

- [ ] One current release document and one primary HTML distribution path, with a stable commit/hash/version identity.
- [ ] Differentiate tested-source, package-validation and release-tip commits in metadata; reconcile actual outer ZIP digest against distribution scan.
- [ ] Publish fresh, retained, simulated and owner-run tests as separate categories; avoid summary `passed: true` meaning complete editor certification.
- [ ] Keep derived copyrighted graphics/scene data in private evidence unless distribution rights permit.
- [ ] Split public editor, private evidence and developer Git bundle into distinct artifacts.
- [ ] Compare live hosted code against frozen Rev 8 by diff and replay; use local identity by default, explicit demo cheats, and preserve saved worlds.
- [ ] Reproduce purported host origin, lock and slow-socket issues using isolated tests before calling them confirmed vulnerabilities.

## Prioritization and freeze statement

**P0:** Truthful release identity, distribution boundary, current-user baseline, blank-project lifecycle with actual executable output.

**P1:** Image upload candidate validation and integration **after** baseline acceptance; DPCM/FX redesign as an isolated hardware-contract effort, not a quick patch.

**Separate:** Native game recovery and hosted Zelda II pilot each require their own evidence and acceptance.

**Deferred:** New title counts, Stacys, anthology, marketplace/economy, and other new feature explorations.

Nothing in this review modifies the working Forge source or approves a push or release.


---

## Hardware & ForgeNet proposal review — Revision 2

**Evidence boundary:** The discussion proposes functionality. The current RC2 code has **no verified physical cartridge data bridge, NES HUB protocol, Stellar network adapter or cyberdeck release**. These concepts have been added to the audit and proposal with distinct gates; they are not feature-completeness fixes.

| Proposal | Supported statement | Unsafe inference / open requirement | Review decision |
|---|---|---|---|
| NES flash-cartridge deployment | A compatible `.nes` file can run on original NES hardware via a mapper-compatible flash cartridge | Flash cartridge's USB connector is not necessarily live in-game networking | PoC Track B; log same-ROM hash and hardware profile |
| NES HUB peripheral | BlueRetro Bluetooth controller support, four-player emulation, expansion audio and CPU/controller breakout pins are documented | No documented Forge-compatible memory-mapped network interface | Research only; validate pinout, bus direction and electrical safety |
| NES networking | Special purpose Wi-Fi/FPGA cartridge architecture is demonstrably feasible (e.g., Super Tilt Bro.) | Cannot assume existing cartridge or HUB is plug-and-play with Forge | Future physical protocol Track E |
| NES as blockchain node | Hardware+bridge can be a game-network participant; 6502 can perform bounded protocol checks | Not an independent Stellar validator/full node and cannot securely hold a wallet key | Use "participant/client" terminology |
| Native 6502 hashing | Feasible in principle | Hash does not prove an unmodified cartridge or fair gameplay; CPU cycles and RAM unbenchmarked | Future assembly benchmark, no claims in PoC |
| Per-game Stellar assets | Classic assets distinguished by code+issuer; XLM for network fee/reserve | Wallet/trustline/reserve and anti-replay setup remain necessary | Synthetic asset on Testnet only |
| Cyberdeck | Conventional portable Linux platform could run Studio, emulator, companion and tools | Actual device drivers, power/thermal and physical cart I/O unverified | Last integration track, no enclosure-first work |

### Stellar-specific security and economic rules

- Use one shared Stellar network with **distinct classic game assets**, rather than a validator chain per game. Do not call an issued asset "XLM" or imply XLM is minted by a game.
- PoC asset name `FORGEDEMO` is hypothetical and only suitable for disposable **Stellar Testnet** demonstration. `Z2TEST`/`CVTEST` are **examples only**, not permission to use third-party IP.
- Recipient trustline, issuer identity, distributor, network passphrase, keys, limits, idempotent reward issuance and Testnet reset handling are mandatory acceptance items.
- An accepted reward must be based on server-validated gameplay or trusted replay evidence; simply hashing a client event does not prevent tampering.
- Keep gameplay XP, level stats and combat state off-chain; token settlement happens after authoritative validation.
- Wallet signing and private keys remain off the NES and out of distributed bundles. A mainnet wallet prompt is not a default local-host sign-in method.
- No Stellar transaction, account creation, asset issuance, token purchase or Git change was performed for this review.

### New acceptance checklist (research track only)

- [ ] New original rights-clear Forge test project passes full author/build/save/reopen life cycle in exact review candidate.
- [ ] Same `.nes` binary boots in independent emulator and on owner-supplied real NES with known mapper/flash-cart firmware.
- [ ] Emulated ForgeNet `HELLO`, `PING`, and `SUBMIT_EVENT` pass byte-vector, version refusal and offline tests.
- [ ] Companion service refuses a forged achievement and duplicate/replay event before sending a transaction.
- [ ] One synthetic accepted achievement results in exactly one validated Stellar Testnet transfer, correctly connected to issuer/code/recipient trustline.
- [ ] Network outage and Testnet reset do not issue duplicate reward records, silently award gameplay state, or lose essential off-chain evidence.
- [ ] No private signing keys appear in emitted `.nes`, generated HTML, project JSON, ZIP or logs.
- [ ] Hardware-connected NES game event claims are withheld until a CPU-visible physical transport passes electrical/logic-analyzer tests.
- [ ] Portable cyberdeck packaging is deferred until ordinary-host toolchain is proven and cart driver compatibility is documented.

### Additional external references

- https://github.com/time2retro/NES-Hub — actual HUB features/pinout research
- https://super-tilt-bro.com/about.html — documented connected NES cartridge precedent
- https://www.nesdev.org/wiki/CPU_memory_map — CPU bus and cartridge space
- https://developers.stellar.org/ — native custom assets, accounts, fees and Stellar contracts
- https://developers.stellar.org/docs/tools/quickstart/advanced-usage/run-command-examples — local/test network setup
- https://krikzz.com/pub/support/everdrive-n8/pro-series/n8-pro-manual.pdf — real USB development feature, no presumed game API
- https://github.com/BrokeStudio/INLretro-CLI-GUI — programmer/dumper compatibility boundaries

**Outcome:** Approved as documented *concepts* with a PoC charter, not as implemented Forge features or new release requirements. The original audio and image findings above remain unchanged. This document and the revised audit are documentation-only; RC2 code and Git remain untouched.