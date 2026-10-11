# Altered research variant: LevelFinal empty run

This patch is a plainly marked research alteration of NovaSquirrel’s Double Action Blaster Guys at commit `5ecc60b6af3f726851bfeb1c2555388c5953e0c0`. It is not an original upstream release. All original licensing notices remain applicable and are retained with the unchanged source and license inventory in the parent checkpoint.

The corresponding source is the complete unchanged `source/DABG/` tree plus `DABG_LevelFinal_Empty_Run_Research_Variant.patch`. The sole source edit changes `levels.s` line 497 from `LVL_HSOLID+13` to `LVL_HEMPTY+13`. Both commands affect the same 14-cell run; one writes solid metatiles and the other empty metatiles.

Apply the patch to a separate copy of the original source, using `patch -p1 < /path/to/DABG_LevelFinal_Empty_Run_Research_Variant.patch`, then assemble `dabg.s` and link with `nrom256.x` using the pinned cc65 toolchain provided in the parent checkpoint. The exact commands appear in `Source_Rebuild_Verification.json`. Do not patch the retained original source tree.

The source rebuild exactly reproduces `runtime/DABG_LevelFinal_Empty_Run_Research_Variant.nes`. The cartridge differs from the original at precisely one ROM file byte: offset `0x3FF4`, value `0x2D` changed to `0x3D`. Native CPU tests in the parent runtime evidence show the resulting collision and player movement change.

This establishes an upstream source rebuild and does not claim canonical NES Forge import or rebuild acceptance.
