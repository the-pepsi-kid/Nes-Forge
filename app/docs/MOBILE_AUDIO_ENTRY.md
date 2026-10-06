# Mobile Audio Entry — 2.0.0-alpha.3 / mobile-audio-entry-1

The reported failure was an input-path gap: the tracker is a canvas, and its old tap action selected a cell without providing a native keyboard or note picker. Physical keyboard piano keys were the only note-insertion path. Volume/arpeggio envelope drawing also used mouse drag events. The native controls below make these existing authoring actions available on touch devices.

## Enter notes

Open **AUDIO**. Add or select an instrument in **Instruments**, then find **Tracker cell** in the Audio options panel. On a narrow display, scroll to the options panel; the numeric navigation controls let you choose a cell without accurately tapping the small canvas rows.

1. Set **Order**, **Channel** and **Row**. These use the existing pattern selected by that order/channel; the location line identifies it. Row/order indices start at zero.
2. Choose **Note**, **Octave** and **Instrument**. Notes span C0–B7 in the existing tracker numbering. **Previous / default** retains the existing instrument-selection semantics; select a named instrument for a predictable first note.
3. Set optional **Volume** from 0–15, or leave it blank to keep the previous volume. Choose **Apply**. The action writes one canonical cell without advancing the selected row and briefly auditions the note where browser audio is available.
4. Choose another row and repeat. **Clear note** removes note/instrument values; **Cut note** writes the existing cut marker (`===`). Existing volume and effect fields are preserved by those two actions. Apply preserves effect fields too.

Changing row/order/channel selects a different existing cell; apply your draft before navigating. Invalid or uncommitted target values cannot silently redirect an edit to the old cell. Invalid note, octave, instrument or volume values leave project data and undo unchanged. Successful edits use the existing undo and project-dirty paths.

DPCM remains unavailable. A pitched note needs an existing instrument. Native editing controls are disabled while Audio preview is playing; use **Stop** to edit a stable row. This is separate from Emulator playback.

## Edit instrument envelope values

Select the instrument in the **Instruments** list. Its **Envelope value** controls edit that selected instrument, not the instrument dropdown in Tracker cell. Choose **Volume** (0–15) or **Arpeggio** (−12–12), choose an existing zero-based **Step**, enter **Value**, then choose **Apply envelope value**.

These controls edit existing steps only. They do not add envelope length/loop features or change pitch/duty semantics. Mouse envelope drawing remains available on desktop. Envelope edits also use existing undo/save behavior and are locked during Audio preview.

## Preserved behavior and evidence

No schema change or second Audio model is introduced. Cells still belong to `S.patterns`; envelope arrays belong to `S.instruments`. Existing imports, generated Audio/Gameplay compilers, preview synthesis, emulator scheduling/buffering, frame history and captures remain protected. The only production scope is the Audio UI and shell controls plus release identity.

The alpha.2 reference HTML SHA-256 is `27c436d1b7356fc8d2ce4c22396a0b768c4c2f3e6b2754f1be14e5db00389782`. Its source/reports remain preserved. The new `mobile-audio-entry200` suite covers actual bundled native controls and event handlers, canonical edits, target validation, undo/save representation, input isolation and retained keyboard behavior. The complete 44-suite gate retains all 940 earlier cases. Actual counts and source identity belong to `test-results/candidate/Summary.json` and `checkpoints/mobile-audio-entry-1-clean-extraction/Reproduction.json`.

The VM harness does not open a real Android keyboard or native picker and does not measure visible layout or speaker output. Read the fresh browser reports and perform `MOBILE_AUDIO_ENTRY_CHECKLIST.txt` on the reported Cricket Dream 5G / Chrome. The prior mobile gameplay/audio-performance review remains separate and pending; this UI correction does not certify its speed or listening quality.
