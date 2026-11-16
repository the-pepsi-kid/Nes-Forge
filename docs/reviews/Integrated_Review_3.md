# NES Forge · Integrated Review 3

**November 15, 2026 · Private owner candidate**

Open **NES_Forge.html** for the integrated editor. Open **ASSET_STATUS.html** for the searchable per-ROM inventory; **ASSET_STATUS.md** and **docs/asset-status.json** contain the same dated evidence in plain text and structured form.

The inventory covers **22 tracked titles and 28 revisions**. Fourteen titles have partial native recovery, Battletoads supplies observed asset copies, and seven titles have no game-specific native recovery. None has complete accepted native game reconstruction. Request counts, aliases, repeated table views and old/new archive copies are kept distinct.

## Changes in this review

| Area | Result |
|---|---|
| Battletoads capture archive | The main picker accepts its observed audio report, two runtime snapshots, editable two-Scene intro project and finite title-audio project. It labels their observed scope. This adds no Battletoads native level decoder or native writer. |
| Exported collision references | The same archive browser lists and previews 258 Zelda II, 282 Mega Man and 70 Contra reference grids. Grid dimensions and values are checked; malformed grids refuse. This preview leaves project physics untouched. |
| Zelda II collision-enriched copies | All 258 supplied room projects contain nonzero tile properties. The report records 75,901 marked solid cells and 51 split tile variants. These are supplied authored copies; original collision response, enemy AI and game rules remain incomplete. |
| Mega Man / Contra boundary | Their new collision grids are separate exported evidence. The supplied native project documents retain unassigned tile properties. Grid previews do not claim an installed native collision writer. |
| Source identity | Wrong-source runtime snapshots refuse. Original source verification is reported as not run when only a capture archive and its declared fingerprint are available. |
| Per-ROM coverage | Maps/Scenes, CHR/palettes/poses, actors/objects, collision, audio, native output, exact revision fingerprints and evidence boundaries are documented for every tracked title. The native decoder ledger remains the authority for installed native capabilities. |

## Verification on this exact editor

**34 of 35 suite jobs passed**, including all 159 retained checks, the platform/domain/traversal suites, six focused intake/placement checks, extractor/inventory tests and all eleven host suites. The desktop/touch browser job remains unverified because the expected Chromium executable is absent. It did verify that the host serves the exact editor bytes. No desktop/mobile interaction result is inferred from DOM checks.

| Input / workflow | Result |
|---|---|
| Archive intake | All 22 supplied archives passed the actual main file picker path. These include older/newer copies of the same title. |
| Evidence / project validation | Validated 1,494 map records, 612 room records, 1,343 native background records, two runtime snapshots, 610 collision references and 1,264 project documents (613 Scene/room, 11 native, 640 audio). |
| Preview integrity | All 4,061 associated PNG members passed archive integrity and PNG-signature checks. These checks do not prove visual parity with independent gameplay. |
| Native preservation | All 11 supplied native project documents saved/reopened and compiled to their declared original source bytes. Several documents repeat the same source revision. |
| Held original sources | All 14 original byte streams passed the recorded intake and short emulator checks. Twenty-one archives matched a held original exactly or through their documented header substitution. |
| Battletoads source gap | Its original ROM was not available, so its declared fingerprint and gameplay behavior were not independently verified here. The supplied README reports black/silent gameplay after the intro; that remains a pack-author observation. |
| Authoring baseline | The five authored examples and retained DigiGhosts/AI/audio/editor regressions passed. The owner-confirmed ROM mismatch from the earlier placement screenshot remains closed. |
| Report | Parsed HTML, search, coverage filters, all 22 title rows and selected-ROM detail rendering passed DOM checks. The report adds no native edit permission. |

Editor SHA-256: `9ba3b15cba01e9c700111643bc7f44cc63480b7bd7671b0cb7254fcd3d9bb5da`. One manifest regenerates it from 218 parts. Project schemas, native decoder algorithms and native write spans are unchanged in this review.

## Remaining release gates

Desktop/phone interaction, audible output and latency, independent visual acceptance, physical NES playback and two human wallet profiles in the original Zelda II hosted world remain open. DG-01 close-contact visual acceptance and Beacon Island's previously documented visual discrepancy remain open. Original AI, full native collision responses, animation rules, room transitions, menus/events and audio writeback remain title-specific gaps in the asset report.

The private editor still includes the owner's embedded recovery catalogs. Public distribution qualification and the project license decision remain open. Nothing was pushed or published.

Current receipts are in **Evidence/index.json**. Prior review reports and their receipts are preserved under **docs/reviews** and **Evidence/Review1**, **Evidence/Review2**. The updated inventory is a report over current code and supplied assets; it does not relabel captured copies as a recovered original game.
