# Native Game RE review kit

Download `NF_Ninja_Zelda_RE.zip`, extract the entire archive to `C:\NF\Ninja_Zelda_RE`, and open `START_HERE.html` → **Open NES Forge**. The complete standalone app is included as `NES_Forge.html`.

Use **RE / DISASM → Open spatial RE workbench** with your investigated Ninja Gaiden or Zelda II ROM. The guide covers scenes, original art, object records, actor tables, scripts/poses, CHR, source annotations and evidence export. The Zelda II title-screen ground/tree rendering defect is corrected.

ZIP SHA-256: `ce805607abf5fcb95169678077f25a6b7ef1d54d513d5aa7ceb73b646b576686`.

Application SHA-256: `f12c1cac282bd081c60d25e1b62a99ddce3e578d82573ecca5e930d95af5c233`.

Measured evidence: 1,989/1,989 automated cases in 110 suites on Node 22.23.3, 67 current browser workflow checks plus three fresh-package browser checks, and private native-routine comparisons. The ZIP has 454 files, with all 366 predecessor files preserved unchanged or archived byte-exact. The 164 original RC3 files remain byte-identical. Read `reviews/ninja-zelda-re-1` for reports, failed attempts and limits.

This is a development review checkpoint. Full collision response, physics, AI, quest state, animation bindings and playable reconstruction remain incomplete. Commercial ROMs are excluded. Physical Windows/mobile and NES hardware acceptance remain open.
