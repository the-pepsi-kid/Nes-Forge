# Punch-Out source-state excerpts

The preceding content build remains the baseline. All 160 preceding application inputs are byte-identical; three added modules trace native state code, recover timed assets and extend the existing content panel. There is no importer, CPU/APU, native writer, schema, gameplay-runtime or prior recovery replacement. Original source ownership and ordinary schema 12/read ceiling 16 remain.

## Use

Open the saved Punch-Out native project, choose **Recovered content**, select a fighter, and expand **State animation excerpts**. Choose a source state and 1–600 native updates (default 240). Choose **Trace state**, then scrub the frame slider. **Open recovered animation** creates linked source-art Scenes, metasprites and a non-looping Animation excerpt, switches to Animation, and makes one Undo entry. The source catalog remains browsable independently of the 64 Scene / 256 metasprite / 256 animation working limits. A capacity failure leaves the project untouched; use a shorter excerpt.

Matched source Audio requests appear in the request selector. **Inspect linked sound** selects the exact native cue in the existing Audio library; use its native audition controls. Requests without an installed cue (including some stop/control values) remain explicit evidence. No guessed notes, labels or automatic sound/actor/event runtime bindings are generated.

## Source contract

The tracer seeds original full pose 0, source fight configuration/palette and zeroed scratch RAM. It executes original primary-state and shape routines with preserved RAM/OAM, native 8/16-pixel size, original tile stride and CHR bank results. Incremental poses retain preceding tiles. It does not run concurrent Little Mac/referee, game-clock or input systems. Durations count opponent-state updates; game freezes/lag can change wall-clock timing. Requested windows, external conditions and state boundaries are explicit stops. Excerpts remain non-looping; a repeated display does not prove a native loop. Palette/bank changes create separate linked canonical sprite sources. Long frame holds are split at 255 ticks without losing updates.

The 240-update matrix has 365 available primary state entries per supplied revision, 65,534 observed updates, 3,028 timed frame records, 1,168 incremental-pose frame occurrences and 119 size-changing excerpts. Those counts include each fight configuration/path, not unique physical animations. 81 of the preceding 176 contextual full-pose entries occur in established state traces. The isolated normal-pose picker still refuses them without a state context. The other 95 contextual entries, delta states not witnessed here and all unobserved branches remain open. The three normal-pose null slots are not invented assets.

Every update's entire 2 KiB RAM matches the preceding native isolated machine running the same original subroutines. This cross-check uses separate buses/call paths with the unchanged shared CPU implementation; it is not independent hardware or cycle-accurate video validation. All 90 retained public checks pass on the final HTML. Both supplied revisions pass source UI recovery into a mixed-size animation, source cue selection/inspection, Undo/Redo, save/reopen, Audio catalog restoration and byte-identical native output. An unsupported timing edit blocks native output and cannot be accepted as a fresh source baseline.

## Remaining work

Recover concurrent Little Mac/referee state, further context/delta poses, menus/overlays/transitions, conditional branches and native collision/AI/event relationships. Add bounded sprite-layout, CHR/palette and Audio writers and verify edit/build/derivative reimport. Current native output still uses only the preceding supported background substitutions. Animation edits remain savable but are not native ROM patches. Whole fights, browser listening, controllers, hardware and the historical full release gate remain open. Check Audio on every project.

Original ROMs, recovered commercial pixel/score/sample payloads, screenshots and source-bearing projects are private and excluded from distribution. Saved source projects contain their owner's source bytes as before.

Reproduce: `python3 app/tools/bundle.py --check`, `python3 reviews/punch-out-states-1/run_checks.py`, and `node reviews/punch-out-states-1/verify_states.cjs /path/to/private-roms`.
