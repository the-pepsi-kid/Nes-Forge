# Native RE research annotations

`src/re/game-re-index.js` contains only symbolic source names, physical addresses, source filenames/lines and contextual RAM labels. It does not contain the original game program, levels, graphics, sound or dialogue.

Ninja Gaiden reference annotations are from Akop Karapetyan's [NinjaGaidenNES](https://github.com/0xe1f/NinjaGaidenNES), commit `32459fdf903679ce07bb372762291be3cf0d91b3`, copyright 2026 Akop Karapetyan, licensed under the Apache License, Version 2.0. A copy of that license accompanies this notice as `NinjaGaidenNES_Apache_2.0.txt`. The reference notice distinguishes the original Tecmo game from the author's annotation/tool work.

Zelda II reference annotations are from Trax's original disassembly as maintained by [FiendsOfTheElements/z2disassembly](https://github.com/FiendsOfTheElements/z2disassembly), commit `c4c3a4c7d4156b41f54f726dc40644d45812ad29`. That repository declares CC0 for its work. The original Nintendo game is not included or relicensed by this notice.

The generated index is a filtered address/label catalog, with Zelda address-byte mismatches excluded. It is not a copy of either disassembly's program/data or a warranty that all symbolic interpretations are correct. Its regeneration script and measured verification report live under `reviews/ninja-zelda-re-1`.
