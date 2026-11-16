# NES Forge · Integrated Review 2

**November 15, 2026 · Private owner candidate**

The owner confirmed that the placement screenshot used a different ROM revision. That report is closed as an input-revision mismatch. The source fingerprint remains the basis for choosing a decoder.

This build completes two shared workflow repairs found while investigating that report. It continues the whole-product baseline from Integrated Review 1. It includes the same editor, authoring compiler, embedded emulator, cartridge workshop, lessons, native recovery tools and local hosted-world service through **NES_Forge.html**.

## Changes

| Observed problem | Result |
|---|---|
| Physical CHR sheets appeared as canonical Scenes and offered empty collision/sprite panels. | Resources classifies these inspection sheets as CHR, explains the generated tile order and colors, and opens the existing CHR editor. Authored Scenes retain their layout preview and tools. Scene storage IDs and native output remain intact. |
| The main Open command rejected 11 of the 14 newer archives because it understood only the earlier room/map extraction report. | The same archive workflow accepts native resource reports and audio-only reports. It lists background previews, the supplied native resource project and audio projects. Embedded HTML is not executed. |
| A native project could otherwise be selected without comparing it to its enclosing report. | The selected project must pass ProjectStore validation and match the report's source hash. Multiple extraction roots, damaged CRCs, unsafe archive paths and stale intake receipts remain refused. |

These changes do not extend a native decoder or its write spans. Native project schema remains 16. Existing authored project schemas are preserved.

## Verification on the packaged editor

**34 of 35 suite jobs passed.** The desktop/touch browser job remains unverified because Chromium cannot start in this environment. The bundled Chromium installation is absent; the available system Chromium exits with an operation-permission error before rendering. Its host did return the exact editor hash. Both attempts are recorded.

| Area | Fresh evidence |
|---|---|
| Retained regression checks | All 159 checks across the 13 retained suites passed, including DigiGhosts, Resources navigation, AI controls, native art/audio and MMC2. |
| Whole-product authoring | Nine platform workflows, six domain workflows and three cartridge traversal routes passed. All five example projects still build, save, reopen and rebuild deterministically. |
| Placement feedback | Four focused checks passed: raw CHR classification/navigation, retained authored Scene previews, wrong-source project refusal and multiple-root refusal. The raw-CHR fixture is synthetic; it is not the alternate Ninja Gaiden ROM from the screenshot. |
| Archive intake | All 18 supplied ZIPs opened through the actual main picker. Validated 1,490 map records, 354 room records, 935 native resource records, 354 editable room projects, 9 native projects, 579 audio projects and 12 audio reports. All 2,779 associated PNG members passed integrity/signature checks. These counts include repeated title revisions and older/newer pack copies. |
| Project controls | A room project, native project or audio project was opened through the displayed selector for every archive supplying that category. |
| Native preservation | All 9 supplied native project documents compiled to their declared original ROM hash, survived a portable save/reopen and rebuilt identically. This establishes preservation without edits. The existing constrained Punch-Out and Zelda II writer tests also passed. |
| Source intake and playback | Fourteen original cartridge byte streams passed the recorded intake and short embedded-emulator checks. Eight were the earlier original cartridges; six were recovered directly from the supplied projects' preserved source bytes. All 18 archives matched a held source exactly or through their explicitly documented header substitution. Short execution does not establish full game accuracy. |
| Local hosted target | All eleven host suites passed, including signatures, two-client state, restart, progression and Rev 8 presentation. Original-world testing with two human wallet profiles remains open. |
| Reproducibility | The same manifest regenerates the one shipped editor from 218 parts. SHA-256: `c247b499fe1ab13f307009c42ffc4b4e5c8342653cea37f360598af927ef2115`. |

## Open and use

1. Extract the entire ZIP and open **NES_Forge.html**.
2. Use **Open ROM / project / ZIP** to choose one of your extraction archives. The commercial source ZIPs are separate inputs.
3. For a resource pack, preview **Native background layouts**, then choose **Editable native resource project → Open selected project**. Use **Area library** inside Forge to select other recovered pages. The native adapter controls available edits and build support.
4. For Ninja Gaiden or Zelda II room packs, choose **Editable rooms**. For an audio-only pack, choose **Editable audio projects**.
5. Use **Check original ROM** to compare a local ROM with the archive source fingerprint. A physical CHR sheet supplies source tiles; the generated atlas does not establish recovered level placement.

## Remaining release gates

Desktop and phone interaction, audible output/latency, independent visual acceptance, physical NES playback and the original two-wallet hosted world remain open. The revision ledger still records partial or unresolved recovery for all 28 commercial revisions. The broader scene, actor, collision, animation, audio and native-writing gaps from Review 1 remain applicable.

The kit remains a private candidate. It retains the owner's embedded recovery catalogs and has no new public distribution decision. No repository push or publication occurred.

The preceding whole-product review is preserved at **docs/reviews/Integrated_Review_1.md**, with its receipts at **Evidence/Review1**. Current receipts live directly under **Evidence**; **Evidence/index.json** lists all 35 jobs. **README.md** contains the rebuild and QA commands.
