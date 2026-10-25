# River City Ransom · street and Audio review

This is partial recovery for the supplied US revision. It adds 36 native street segments across 13 locations, native tile substitutions and the native Audio catalog. The other 22 locations use a different compressed interior/special-screen path and remain explicitly unavailable. No whole-game recovery is claimed.

## Try it

1. Open the updated NES_Forge.html. Open ROM / project → your original River City Ransom ROM → Prepare recovered resources (partial) → Import as new project.
2. In Area library → Investigated source, select an available street segment and open it. The catalog has 36 available segments and 22 unavailable special-location entries. Labels use native location/segment IDs; route order and location names are not guessed.
3. Scene shows the native 20-row street background: game tile rows 4–23 appear at Scene rows 0–19. This is a crop, not a full gameplay screen. HUD, actors, sprites and other margins are excluded. Each segment has its original native CHR and palette state.
4. In NATIVE SCREEN BLOCKS, choose a different original 8×8 tile index and replace a cell, or enable the canvas brush. For an initial test, use column 0, row 0 and a tile different from the current one. Attributes/palette ownership stay intact. Thirty-two physical bytes that alias protected metadata refuse editing.
5. Undo/Redo, Save Project As, reopen and Build & Run. Reimporting the rebuilt ROM preserves the supported native edit. Verify the change in actual gameplay or another emulator.
6. Physical tile bytes are shared across native rows/segments. An edit affects every native alias of that byte; resident views update together. This preserves the original source ownership rather than inventing isolated copies. Only one physical byte changes for a cell substitution.
7. Open Audio → ROM Audio Library. It should list 63 entries: 19 music requests (18 unique music headers), 43 SFX and one silence/stop control. Music 02 is selected initially. Inspect and Play native; listen to representative music and SFX in your browser.
8. Preview editable score, review its conversion limits and import into the tracker. Test Undo/Redo and save/reopen. For a single-channel SFX example, choose SFX 20, 16 native updates and Single-channel SFX.

## What stays unfinished

The 22 interior/special locations, HUD, scrolling-event relationships, actors, moving sprites, animation, collision-rule editing, entrances/exits, shops, text and quest state are not recovered editable assets in this checkpoint. Existing source bytes are retained. A picture of a street is not proof of complete level recovery.

Native Audio preview executes the original driver with fixed MMC3 PRG pairs 5 and 7, including its generated RAM APU writer. Mapper writes remain refused in isolated playback. Music/SFX labels are native indices; request 12 aliases request 2. The structural command catalog is not a timed score. Browser listening, physical controllers and hardware equivalence remain unverified.

Editable Audio import is a finite frame-end adaptation. Original envelopes, command flow, sub-frame articulation and phase are not retained in the canonical score. No River City native audio writer is installed. Importing tracker edits into a source-backed project preserves those edits but blocks a native ROM build; Undo the Audio import to resume native street rebuilding.

Scene recognition protects the exact original source except for declared writable tile bytes. Audio independently checks the original header and complete audio/fixed PRG banks, so a street rebuild still detects its driver. Audio-only identity does not establish another part of a modified game's recovery; the actual full source hash is always retained.

## Verification

Street_Verification.json compares every available segment with original CPU/PPU execution, including palette/CHR state, and checks a representative one-byte native rebuild in each segment. It also covers mapped brush coordinates, shared aliases, Undo/Redo, save/reopen, derivative reimport, metadata protection, unsupported edits and actual old-reader refusal.

Audio_Verification.json checks every sounding native cue, physical command evidence, independent live MMC3 register-sequence parity, Audio-tab loading/reopening, music/SFX conversion, persistence and combined street/audio preservation. gate/Summary.json defines the focused compatibility scope. Retained Lolo and Metroid results apply to this checkpoint's exact HTML hash. These are not a full release gate, browser listening or complete gameplay acceptance.

Every supplied project must follow ../PROJECT_VERIFICATION.md, including its Audio driver checks before closing a verification checkpoint.

## Research provenance

The earlier exact-revision metadata lead is [saltquix/barf at e69b05d](https://github.com/saltquix/barf/tree/e69b05d8df1accc857ad89659ba864682909f934). The street decoder was independently interpreted from the supplied native C230/C41C/C599 renderer tables and E692 palette path, then compared against original execution. Audio was independently interpreted from its physical bank-5 dispatch/update tables. No source ROM, recovered score, sample payload, screenshots or source-bearing game project is published.
