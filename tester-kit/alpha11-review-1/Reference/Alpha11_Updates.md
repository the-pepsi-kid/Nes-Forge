> **Current instructions:** Start with the [current user guide](../Guide.html) and its five workspace chapters. They cover the included audio-tool-import-1 application and take precedence over preserved historical chapters, control rows and version claims below. Use them for composing from scratch, current imports, save formats and supported recovery.

# Alpha.11 usage updates

**Current application: 2.0.0-alpha.11 / audio-tool-import-1 · project schema 12**

This page supplies the current layer for the restored 1.9.0 manual and its control tables. The full original chapters remain available for workshop detail, diagrams and established editor concepts. Their September 2026 version statements, screenshots, historical test totals and roadmap promises are historical. They are not alpha.11 acceptance results.

Start with [Tutorial](../Tutorial.html). Use [Manual](../Manual.html) for the longer workshop and [Operator Reference](Operator_Reference.html) for established controls. Report a mismatch with [Feedback_Template.txt](../Feedback_Template.txt).

## Save the right thing

| Work you want to keep | Save action | Boundary |
| --- | --- | --- |
| Editable scenes, World, Gameplay Core and native Audio | **Save Project As** or the normal project ZIP export | Native schema-12 authoring backup. Keep this even after building a ROM. |
| Files in **CODE → Open source workspace** | **Save source workspace**; optionally **Export source ZIP** | The isolated `.nesforge-source.json` workspace is separate from ordinary project JSON. |
| Source diagnostic evidence | **Export intake report JSON** | A report is neither editable source nor a project backup. |
| Native ROM-copy edits or analysis evidence | The explicit save/export action in that analysis workflow | Do not assume the native analysis session is saved by ordinary project Save As. |
| Mashup or movement recipe | **Download recipe**, plus unchanged copies of its exact base/donors | A recipe does not contain its source projects. |

## Current Audio creation and FamiStudio import

Follow the [Audio tutorial](../Guides/Audio.md) to compose a four-note melody from New Project, save/reopen it, and build a music-playing viewer ROM. Audio is part of the regular Forge project; there is no dedicated New Sound Project yet. **Import FamiStudio…** previews and converts a supported FamiStudio 4.5 text export. Native `.fms` files are not accepted. Keep project JSON for the editable conversion and use **Download source + report** for the original export. The current instrument sidebar paints existing envelope points but has no loop-point or length controls.

## Audio: author, import, export and listen

**AUDIO → Export Score Data** now offers **Export MIDI** and **Export MusicXML**. Any old sentence saying MusicXML export is unavailable applies only to the preserved 1.9.0 edition.

Export follows one ordered pass of the four-channel score. It does not export full NES timbre, instrument envelopes, SFX, gameplay triggers, pattern identities or indefinite looping. Save the native project to preserve those. Read the conversion warning before confirming, and check exported notes and timing in the receiving tool. Unsupported effects or other unsupported content receive an error. MusicXML import accepts uncompressed supported score-partwise XML; a compressed `.mxl` file is not the same input.

On a phone, add/select an instrument, tap a tracker note cell and type the existing piano keys: **Z = C3, X = D3, Q = C4, 2 = C#4**. Commit composition with Done/Enter. Do not type a note name such as `C3`. Horizontal/vertical tracker scrolling and touch/pen envelope painting are supported UI workflows and still need verification on the actual device. Enable **Compile Audio Runtime** for ROM playback; browser tracker preview is a separate check.

Read the exact snapshots: [Audio interchange](Current_Release_Docs/AUDIO_INTERCHANGE.md), [phone keyboard entry](Current_Release_Docs/MOBILE_KEYBOARD.md), and [adaptive Audio editing](Current_Release_Docs/AUDIO_ADAPTIVE_GUIDE.md).

## Source workspace builds are real, bounded builds

Open **CODE → Open source workspace**. **Open multi-file example** supplies a small self-contained source tree. Select the entry and mapper-0 build settings, then choose **Build source ROM**. The `forge-6502-v1` profile assembles supported 6502 source with bounded `.include` and `.incbin` handling into a 16/32 KiB PRG NROM cartridge, using CHR RAM or one 8 KiB CHR file.

Download the source ROM and load it explicitly in EMULATOR to test it. The built-in source example intentionally has no graphics: its reset routine reads data byte `70` into RAM `$0000` and loops. A blank screen for that example does not by itself mean assembly failed.

This build is separate from the authored Forge project. It does not automatically insert generated World, Gameplay Core or Audio code, replace the active project, or load/run the emulator. Foreign ca65/NESASM/NESmaker scripts or Lua are not translated by selecting the Forge dialect.

Save with **Save source workspace** before closing. Ordinary project JSON does not back up this isolated workspace. **Export source ZIP** includes the workspace JSON and current/original file trees; extract it and open its workspace JSON to restore it. Direct ZIP import is outside this initial profile.

## Source intake is a separate inspection step

Inside that source workspace, select the source's actual dialect and choose **Analyze source**. Review inventory, literal dependencies, unresolved paths and unsupported constructs. **Export intake report JSON** saves the evidence. Its result is not proof of successful assembly, linking, original-game behavior or migration.

A report marked incomplete has reached a declared bound. Declaring a foreign dialect prevents **Build source ROM** in that UI; declaring Forge does not translate foreign constructs. Editing files/settings or replacing the workspace invalidates old analysis. Dialect/engine declarations are report/session metadata; choose them again after reopening a saved workspace.

Read [Source workspace](Current_Release_Docs/SOURCE_WORKSPACE.md) and [Source intake](Current_Release_Docs/SOURCE_INTAKE.md).

## Seeded mashups and movement variations

**SCENE → Seeded mashup** previews compatible editable-project graphics, palettes, music and bounded existing patrol/placement variations. Capture **Use current project**, add donor Forge JSON files, preview, then explicitly apply. Save the exact unchanged base and donor projects alongside a recipe. It does not mix arbitrary ROM engines or recover unknown gameplay.

**SCENE → Movement rules** separately previews run speed, jump speed, gravity and maximum falling speed for an already enabled compatible generated runtime. Choose **Use current project**, preset/intensity/seed, **Preview rules**, then **Apply rules**. Applying creates one Undo entry. Preview/compilation does not prove every room remains solvable.

Read [Seeded mashup](Current_Release_Docs/SEEDED_MASHUP.md), [Movement rules](Current_Release_Docs/MOVEMENT_RULES.md), and [recipe compatibility](Current_Release_Docs/COMPATIBILITY_STABILIZATION.md).

## Reverse engineering has explicit supported subsets

General analysis can inspect ROM/raw bytes independently of an editable Forge project. Use **Discover recovery methods** to see supported routes. Runtime investigation and frame history are additional tools; frame advance is not an automatic command to jump to a chosen game stage.

Native background, map/collision, music and sound-effect workflows each declare the representation and subset they can convert. Preview evidence, read unknowns/refusals, and acknowledge the conversion before importing. A recovered background is not the original game's actor, collision, sound or logic system. An imported map test player is an authored adaptation. Native SFX import currently requires the declared single-pulse subset and compatible project tempo/speed; it does not add original gameplay triggers automatically.

After importing editable data, use ordinary **Save Project As**. Downloaded conversion evidence describes the source/preview and does not authenticate your later edits. Native ROM-copy editing/export and canonical editable-project conversion are distinct workflows.

Read [Recovery methods](Current_Release_Docs/RECOVERY_METHODS.md), [Native background](Current_Release_Docs/NATIVE_BACKGROUND_RECOVERY.md), [Native map/collision](Current_Release_Docs/NATIVE_MAP_RECOVERY.md), [Native music import](Current_Release_Docs/NATIVE_AUDIO_IMPORT.md), and [Native SFX](Current_Release_Docs/NATIVE_SFX_IMPORT.md).

## Mobile performance and current review

The later playback changes add diagnostics visible in expanded Play. Record FPS, frame time, queued audio, gaps/resyncs, backlog and timing discards when investigating a symptom. Queued audio is not measured speaker latency; mute does not stop emulated Audio processing. The older manual's 10 ms scheduling description and hidden-status-line workaround are historical implementation details.

Use the current [Mobile Performance Triage](Mobile_Performance_Triage.html) and [Reviewer Checklist](Reviewer_Checklist.html). Hardware controllers, speaker behavior and device/browser combinations need actual observations. Existing automated checks do not establish that the tutorial has been completed by a new tester or that every hardware route works.

The [439-row control index](Control_Index.csv) and two editor illustrations are explicitly the restored 1.9.0 baseline. The [Alpha11 control supplement](Alpha11_Controls.csv) covers selected additions described above; it is not a certified exhaustive inventory of the current application.
