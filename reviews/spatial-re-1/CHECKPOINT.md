# Spatial RE — verified checkpoint

Parent: `d1f3ef5dd3be5150431d74b478fb9a38db300f6e` (Mega Man 2 Audio). Branch: `implementation/spatial-re-2026-10-19`.

Application SHA-256: `b5f73734aa43356067e8fc0b0a9f45c7cbe434b4a38dfbedde827f1d534c0945`.

The actual bundled app adds **RE / DISASM → Open spatial RE workbench**. All four supplied revisions produce source-scoped spatial evidence: Mega Man 2's 616 stage-context views across 352 physical screen slots; 48 Ninja Gaiden rooms and 13 player scripts; four Zelda II overworld terrain maps; 79 Castlevania II layout entries and raw tile categories. File input, cell/source inspection, native sprite-piece preview and selected JSON export are connected in the shipped app.

This is read-only evidence, not native scene import or a playable reconstruction. Zelda side-view collision, Castlevania conditional collision, enemy/actor catalogs, hitboxes, transitions, original physics and non-Ninja animation scripts remain open. Native semantics are not reduced to guessed binary collision.

Measured verification:

- **1,970 / 1,970 cases across 107 suites**, against one unchanged final HTML and frozen input inventory. All 105 parent suites and 1,958 cases retain their counts/order; the two retained release identity expectations are explicitly reversed to their exact parent bytes.
- **47 current browser checks**: 13 spatial, 10 Mega Man 2 Audio, 14 earlier native-library and 10 discovery checks. Actual file chooser/download workflows; no page errors.
- Original unpatched native routines: **157,696** Mega Man 2 collision queries, **37,056** Ninja ground cells, **13** player scripts / **199** native update ticks / **35** poses / **182** sprite pieces, **3,201** Zelda terrain runs, and **20,224** Castlevania raw-classifier queries. The isolated bus is not a hardware/whole-game oracle.
- Six retained example families regenerated independently: **52 / 58 files byte-identical**, six receipt files changing only `htmlSha256`. Generated project and ROM payloads are unchanged.
- Exact parent HTML and all **282** protected parent files restore before the earlier preservation chain. CPU/emulator/native-audio implementation bytes are unchanged. Older native-audio PCM/catalog oracles remain historical at their original hash; their current browser paths were rerun.

Review kit: `NF_Spatial_RE.zip`, **8,509,417 bytes**, SHA-256 `9818b48449a4176f43e4d7139d90adbb3ff062dfa710df11ea332e29e47f79fd`. Contains the actual app and guides, **366 files**, with **365** inventoried payloads. Fresh extraction verifies every hash, all **164 original RC3 files** byte-for-byte, and **694** active documentation links with zero broken links. The extracted START page launches the actual app, loads 48 Ninja rooms/13 scripts, animates Walk, then loads the retained 67-selector MM2 audio catalog and plays a native excerpt.

ZIP names are checked for conservative Windows path limits and case collisions. Extract to a short path such as `C:\NF`. Physical Windows Explorer/mobile/NES hardware and listening acceptance are not claimed. Supplied commercial ROMs, decoded map/sprite payloads and native PCM are excluded.

After a workspace reset, the published source was restored exactly from GitHub. The app checksum is unchanged. ZIP timestamps are now fixed; two rebuilt ZIPs are byte-identical, every extracted payload verifies, and the full payload inventory is retained. The original 47 browser checks and fresh-package launch were performed before reset; a second browser run after reset was unavailable.
