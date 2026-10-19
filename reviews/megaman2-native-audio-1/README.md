# Mega Man 2 Native Audio

The uploaded US revision now automatically populates Native Cue in the existing ROM Audio Library. The Audio workflow can inspect its native command/data structures, audition a cue through the original driver and preview/import a finite editable adaptation. Previously this source only produced Audio Discovery writer leads.

The exact parent is Audio Discovery commit `819838b3920987c7a47677fd40552bf5a57d5e38`, HTML SHA-256 `1ffaf54d1d25e5988cfac324018711d29fee51336ac9722b9375d413d61ea1c6`. Source identity is `49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf`. The source ROM is supplied separately and is never committed or packaged.

## Findings and implementation

| Relationship | Evidence / implementation |
| --- | --- |
| Native dispatcher / update | Physical PRG bank 12, CPU `$8003` / `$8000`. Fixed-bank code selects bank 12 before calling these entries. |
| Cue table | `$8A50–$8AD5`, 67 little-endian pointers; first header begins at `$8AD6`. Driver lacks a general selector bound; Forge only admits the recovered table. |
| Music / effects | Music `$00–$20`: 33 selectors, 24 distinct headers; effects `$21–$42`: 34 selectors. `$18–$20` alias `$0F`. No unverified human song names. |
| Stream model | Four music pointers, zero for absent voices; each effect has one shared stream plus routing mask. 124 source stream/channel combinations, traversed to stop or repeated parser control state. |
| Modulation / samples | 31 distinct referenced four-byte pitch/amplitude modulation records. No DPCM descriptor format in this driver catalog. Inline modulation remains explicit. |
| Native playback | Same original shared CPU and APU, with isolated fixed physical bank 12 below bank 15. Header-derived last-bank mapping replaces the old hardcoded bank 7 in the isolated machine only. Live emulator and compiler sources are byte-identical. |
| Canonical conversion | Existing bounded frame-end adaptation and guarded stage/commit/Undo lifecycle. No new canonical model or native encoder. |
| Unknown sources | Still unknown; Native Cue now displays an unavailable-decoder explanation instead of an empty list. Audio Discovery is preserved. |

`app/src/re/megaman2-audio.js` reads current source bytes behind an exact SHA guard and independently verifies handler/table anchors. It records music and effect command formats separately. Structural traversal bounds repeated branches without claiming acoustic loop duration. Special controls `$FC–$FF`, the game's queue and channel state are documented separately from playable entries.

## Reproduce

From the repository root, with Node.js and Python installed:

```sh
python3 app/tools/bundle.py --check
FORGE_TEST_WORKERS=4 node app/tests/run_candidate.cjs
NES_FORGE_ROM_DIR=/path/to/your/roms node reviews/megaman2-native-audio-1/verify-rom.cjs
NES_FORGE_ROM_DIR=/path/to/your/roms node reviews/megaman2-native-audio-1/verify-browser.cjs
```

The browser script uses Playwright/Chromium. Set `FORGE_CHROMIUM` if needed. `verify-rom.cjs` requires this repository's parent Git object and the separately supplied ROM; its reports retain addresses, counts and hashes, excluding original source bytes and PCM. The parent oracle is the unmodified parent bundle; instrumentation observes source reads and APU writes. It does not inject the new decoder or machine implementation into the reference.

Current measured results belong to `ROM_Verification.json`, `browser/Report.json`, the root `CANDIDATE.json` and `app/test-results/candidate/Summary.json`. Earlier review directories are historical except where an explicit current HTML hash identifies a rerun. Retained examples are regenerated in a disposable copy so the candidate gate's inputs remain fixed.

## Limits

This is exact-revision recovery, not automatic family recognition for arbitrary ROMs. All cue selectors are tested in finite controlled windows; complete song duration, natural-game trigger coverage, all priority/fade interactions and hardware/listening equivalence are unverified. Native playback and editable transcription have different fidelity. Original instruments/loops, DPCM and short-mode noise are not fully represented by editable conversion. See `app/docs/MEGAMAN2_AUDIO.md` for the user tutorial.
