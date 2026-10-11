# Movement rules — NES Forge 2.0.0-alpha.11

Current candidate: compatibility-stabilization-1. The versioned recipe adapter can verify and reissue a recipe when the only source difference is reviewed alpha.10/alpha.11 foundation metadata. All other source content remains exact. See `COMPATIBILITY_STABILIZATION.md`.

Movement rules turns the current project's existing player movement settings into repeatable variations. Open **SCENE → Movement rules**. The panel is separate from Seeded mashup and starts at **Keep current**.

This edition supports run speed, initial jump speed, gravity and maximum falling speed in a compatible, enabled generated World or single-room runtime. The selected runtime, player body dimensions, scene layouts, actor definitions, audio, imported ROM and native analysis session stay as authored. Changes become part of a generated NES ROM when you use the ordinary build controls.

## First variation

1. Open a compatible editable Forge project using the ordinary **Open Project** command. An enabled generated World or single-room runtime is required; this panel does not enable one for you.
2. Open **SCENE → Movement rules** and choose **Use current project**. The captured project is the exact base for previews and recipes. Its displayed SHA-256 identifies canonical project content; it is not a checksum of the original JSON file's whitespace or key order.
3. Choose a **Movement preset** and **Intensity**. Enter a text or number **Seed** with 1–128 characters. Start with **High jump**, intensity **3**, for a visible jump-speed change from the common default of 9 to 12.
4. Choose **Preview rules**. Review the full **Before / After** table, runtime backend and validation notices. Preview does not apply settings, start the emulator or play audio.
5. Choose **Apply rules**, review its exact values and confirm. This makes one Undo entry. Continue editing, use **Save Project As**, then build and play through the normal workflow.
6. Use **Undo** to restore the pre-Apply project, or **Redo** to return to the variation. After any change to the project, choose **Use current project** again before generating another variation.

If the settings are already the preset's values, preview reports **No effective changes** and disables Apply. Candidate and recipe downloads remain available.

## Presets and intensity

Numbers are absolute targets for the named fields; other fields retain their captured base values unless a previous preview has locked them. A larger preset intensity is a stronger named effect, not a promise that every game becomes harder.

| Preset | Intensity 1 | Intensity 2 | Intensity 3 |
| --- | --- | --- | --- |
| Keep current | Base values | Base values | Base values |
| Sprint | Run speed 2 | Run speed 3 | Run speed 4 |
| High jump | Jump speed 10, gravity 1 | Jump speed 11, gravity 1 | Jump speed 12, gravity 1 |
| Slow fall | Maximum fall speed 4, gravity 1 | Maximum fall speed 2, gravity 1 | Maximum fall speed 1, gravity 1 |
| Heavy fall | Gravity 2, maximum fall speed 6 | Gravity 2, maximum fall speed 7 | Gravity 3, maximum fall speed 8 |
| Seeded mix | Choose within ±1 of each base value, bounded by the supported limits | Choose within ±2 of each base value, bounded by the supported limits | Choose across the full supported range |

Supported integer ranges are run speed **1–4**, jump speed **1–12**, gravity **1–3**, and maximum fall speed **1–8**. Speeds are pixels per game frame; gravity is the downward speed change per game frame. Initial jump speed is upward. Runtime collision and velocity processing affect the resulting trajectory, so the table is a settings comparison rather than a simulated jump-height chart. Wall-clock speed follows the emulator or hardware frame rate.

## Seeds, locks and shuffle

The same exact base project, seed, preset, intensity and lock history reproduce the same candidate. Preview once, then lock any combination of **run speed**, **jump speed**, **gravity** and **maximum fall speed**. Locks retain the selected values from that successful preview, including when you change presets or intensity.

**Shuffle unlocked** selects **Seeded mix** and advances the seed with a numbered suffix. Locked values stay fixed. Independent random selection can produce the same values on some shuffles; a new seed does not guarantee a change. Unlock a field to let a new preview choose its value again. **Use current project** discards the old preview and clears all four locks because their previous selection belonged to the earlier capture.

A lock before the first successful preview is refused. **Keep current** restores the captured base values only for unlocked fields.

## Candidate projects and movement recipes

**Download candidate project** saves an ordinary editable Forge JSON containing the previewed values without applying them to the active editor. Open it normally to edit or build. Downloads use Forge's existing Save As workflow; cancelling leaves the candidate and active project intact.

**Download recipe** saves a `NESForgeMovementRecipe` JSON. It records its exact base identity, seed, preset, intensity, locks and verified decisions. It does not contain the base project's graphics, scenes or audio.

To replay:

1. Open the exact original base project used before that recipe's Apply.
2. Choose **Use current project** in Movement rules.
3. Use **Open saved movement recipe** and select the recipe JSON.
4. Review its restored preview, then choose Apply or download explicitly.

The source project must fit within **8 MiB** and pass canonical Forge schema-12 validation. Recipes are limited to **64 KiB**. Wrong-source, malformed, modified or unsupported recipes are refused. A previously applied candidate is a different project and is not the original base for replaying its recipe.

The panel checks the complete serialized active project and its load epoch before and after asynchronous work and confirmation. Editing or reloading the project makes a captured preview stale, even if the movement fields were not the ones edited. Recapture and preview again.

## Combining assets and movement

Seeded mashup continues to use its own version-1 recipe format and controls. To combine both features:

1. Preview and **Apply mashup** in Seeded mashup.
2. Save that intermediate project if you want to replay a movement recipe later.
3. In Movement rules, choose **Use current project** to capture the newly combined assets.
4. Preview and **Apply rules**.

These are two explicit edits with separate Undo entries. One Undo after step 4 restores the asset mashup with its prior movement settings. A second Undo restores the original project. Each recipe requires its own exact base: the mashup recipe's original sources, and the movement recipe's intermediate project. The recipe formats are not interchangeable.

## What to test in play

Try a flat run, jump from rest, jump while running, ceiling contact, wall contact, landing on a thin platform and a room or World transition. Check whether previously reachable paths still work. Large changes can make a room frustrating or impossible even when its ROM compiles successfully.

Both World and single-room previews compile a complete detached generated ROM, including emitted capacity checks. Preview reports the compiled ROM identity and size; it does not publish or play that ROM. Use the ordinary Build action after Apply to produce the active project ROM. A valid preview or compile does not certify solvability, audio/video timing, browser layout or physical hardware behavior.

This edition uses the existing runtime's movement parameters. It does not add friction or ice physics, knockback, one-hit rules, timed escape, survival mode, larger actor limits, arbitrary original-engine code mixing or automatic recovery of gameplay mechanics from unknown ROMs. Source migration and further native asset recovery remain separate roadmap work.

For review steps and reporting, use `MOVEMENT_RULES_CHECKLIST.txt`. Automated evidence covers specified contracts; browser walkthroughs, listening, mobile and physical controller/hardware acceptance must be reported separately.
