# NES Forge user guide

**2.0.0-alpha.11 · audio-tool-import-1 · User guide edition 1 · 19 October 2026**

Use this guide with the included [NES Forge application](NES_Forge.html). It explains the current workspaces, controls, save formats, and supported workflows. Each chapter includes tasks to try, the result to expect, and what to check when that result does not appear.

The [nine-step first-game tutorial](Tutorial.html) starts from a blank project. For music, start with [Make a sound project in Forge](Guides/Audio.md). You can compose now inside a normal Forge project; a separate **New Sound Project** command and dedicated sound-project format are not implemented.

## Choose what you want to do

| Goal | Start here | What you will make or learn |
| --- | --- | --- |
| Open Forge and keep your work | [Projects and play](Guides/Projects_and_Play.md) | Navigation, JSON/ZIP, browser saves, recovery, Undo, builds and troubleshooting |
| Make your first playable game | [First-game tutorial](Tutorial.html) | Draw terrain and a character, make a two-screen World, build, save and reopen |
| Draw or import art | [Art and scenes](Guides/Art_and_Scenes.md) | CHR pixels, palettes, attributes, collision, metatiles, sprites, poses and animation |
| Make levels and behavior | [Gameplay and World](Guides/Gameplay_and_World.md) | Player setup, Worlds, rooms, entrances, links, Gameplay Core, mashups and movement rules |
| Compose music or sound effects | [Audio](Guides/Audio.md) | Notes, instruments, envelopes, order, SFX, preview, ROM playback and portable saves |
| Bring in music from another tool | [Audio import and export](Guides/Audio.md) | FamiStudio text, MIDI, MusicXML, conversion limits and original-source receipts |
| Investigate or recover ROM assets | [RE and code](Guides/RE_and_Code.md) | Hex/disassembly, mappings, traces, experiments and explicitly supported recovery methods |
| Write or import assembly source | [RE and code](Guides/RE_and_Code.md) | CODE, separate source workspace, source analysis and supported source ROM builds |
| Play on a phone or controller | [Projects and play](Guides/Projects_and_Play.md) | Touch controls, Play view, mapping, interruptions and performance readings |
| Work through larger workshops | [Extended manual](Manual.html) | Preserved detailed workshops with current corrections at the front |

## How to use the reference

Open a chapter and use its Contents list or your browser's **Ctrl+F** to find the visible label. Control tables explain what changes, what is only a preview, and what must be saved separately. Instructions assume the named tab is open; scroll its sidebar and expand the named section if it is below the visible area. Commit text/number edits with Tab or a click outside the field.

The current chapters take precedence over the preserved 1.9.0 manual, older feature-guide headings, and older in-app help text. Some retained help still describes features as planned even though current services implement them. The [operator reference](Reference/Operator_Reference.html) and all 439 original control-index rows remain available for detail; they are historical reference material, not a claim that every current dialog or device has been tested.

## Keep the right file

| Work | Keep this | Important distinction |
| --- | --- | --- |
| Game or composed sound project | **Save Project As…** native JSON; optionally a project ZIP from **Export** | Keeps the editable Forge project, including Audio. A generated ROM is not a complete backup. |
| Imported FamiStudio score | Native project JSON **and** **Download source + report** | Project JSON keeps the conversion. The receipt preserves the original text separately. |
| Multi-file assembly work | **Save source workspace**; optionally **Export source ZIP** | Separate from the main editor project and its saves. |
| Analysis findings | The corresponding analysis/report export; save modified ROM copies separately | Reports describe evidence. They are not editable project backups or emulator save states. |
| Mashup or movement recipe | Recipe plus the exact base/donor projects | A recipe references its inputs; it does not contain those projects. |
| Runtime checkpoints | Treat as temporary emulator-session work | Reset or ROM replacement can clear them. |

Confirm that a downloaded file actually exists. Reopen an important checkpoint before relying on it. See [Projects and play](Guides/Projects_and_Play.md) for JSON versus ZIP import and browser-local recovery.

## What is implemented, and what remains unfinished

Forge can author NES graphics, scenes, supported gameplay and four-channel Audio; build supported mapper-0 ROMs; run supported cartridges in its emulator; inspect ROMs; and convert specific native formats into editable assets. Those are distinct workflows. Importing a file does not imply that every source feature can be edited, reproduced or compiled.

| Area | Current boundary |
| --- | --- |
| Sound projects | Music and SFX are stored in a regular Forge project. No dedicated New Sound Project, named multi-song library, audio-only project save, WAV/NSF export or FamiStudio project export. |
| FamiStudio | Bounded FamiStudio 4.5 text-export conversion. Native `.fms` files and unsupported expansion/effect features are not imported. Preview before applying. |
| Native recovery | Documented structural profiles only. Raw inspection can remain useful when recovery is refused. No generic ROM-to-source/game recreation. |
| Audio recognition research | Routine comparisons are research evidence, not a new recovery command. No new driver families are enabled by similarity. |
| Gameplay | Selected generated profiles and budgets apply. Authoring a canonical record does not guarantee that the selected runtime executes it. |
| Source | Source intake is diagnosis. Source ROM builds accept the declared Forge assembler profile; they do not translate arbitrary foreign toolchains or merge external code into generated gameplay. |
| Hosted experiment | A separate local-server developer experiment exists in the full source checkout. It is not part of this offline test-kit workflow or a cartridge networking feature. |

Read [known limitations](KNOWN_LIMITS.html) for additional export and device caveats. The current app's existing automated evidence covers 1,872 cases in 97 suites plus a separate ten-check audio-import browser review. Those results do not mean every tutorial, native OS dialog, sound device or physical controller has been accepted. Documentation verification has its own record in the source repository.

## Where to find deeper detail

- [Current feature-guide index](Reference/Current_Feature_Guides.md): detailed feature contracts retained from the source checkout, with their historical scope identified.
- [Optional next steps](NEXT_STEPS.html): expand your first character and inspect the included Scout project.
- [Feedback template](Feedback_Template.txt): record exact control, input, expected result, actual result and browser version.
- [Build record](SOURCE_RECORD.json): exact included application and example identities.

For a reproducible report, include the project or a small example that shows the problem. Keep your last working backup. If a guide and the actual app disagree, report the label and step rather than assuming your project is broken.
