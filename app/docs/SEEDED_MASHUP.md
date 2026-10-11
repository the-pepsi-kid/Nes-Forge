# NES Forge seeded mashups

**Current: 2.0.0-alpha.11 · compatibility-stabilization-1 · schema 12**

The alpha.10 workflow and raw v1 recipes remain. When opening original alpha.10 sources changes only reviewed foundation metadata, the current UI verifies the original recipe exactly and offers a migrated preview plus reissued current-source recipe. Read `COMPATIBILITY_STABILIZATION.md`; changed project content or donors still refuse.

Open **SCENE → Seeded mashup**. This combines editable Forge content into your current project: background tile banks, sprite tile banks, palettes and compatible music. You can also vary supported existing patrol speeds and shuffle compatible existing enemy/pickup slots. A seed and a saved recipe reproduce the same choices from the same original source content.

The current project supplies the scenes, collision, World links, player, gameplay templates and runtime settings. To choose a different base, use ordinary **Open Project** first. The mashup does not recover unknown game structures or combine arbitrary ROM engines. Use supported recovery, captures or authoring to obtain editable Forge projects before adding them as donors.

## Try the supplied projects

1. Save your current work. Open `examples/Seeded_Mashup_2.0.0-alpha.10/Scout_Base.nesforge.json` through ordinary **Open Project**.
2. Expand **SCENE → Seeded mashup**, then choose **Use current project**. This captures a detached source snapshot without loading or playing anything.
3. Under **Add donor Forge project JSON files (up to eight)**, select `Copper_Orchard_Donor.nesforge.json` and `Moonlit_Circuit_Donor.nesforge.json` from the same examples folder. **Source identities** shows each source and its SHA-256 identity.
4. Choose the **Target scene** and enter a **Seed**, such as `review-1`. Text and numbers are accepted. Choose **Random source (preview checks fit)**, **Keep current**, or a specific source for each of Background tiles, Sprite tiles, Palettes and Music.
5. Choose **Preview mashup**. Read the source choices, compatibility findings and warnings. The small canvas previews the target background only; it does not run gameplay, sprites or Audio.
6. For an obvious two-donor combination, choose Copper Orchard for Background tiles and Palettes, and Moonlit Circuit for Sprite tiles and Music. Preview again with the locks off.
7. Choose **Apply mashup** and accept the confirmation. This creates one ordinary project Undo entry. Continue editing in the normal Forge tools, or use Undo to restore the entire prior project.
8. Save the edited project with **Save Project As**. Use the existing **Build .NES ROM** or **Build & Run** when ready. Mashup preview and Apply do not start a game or Audio. The base runtime settings decide whether music and gameplay compile into the ROM.

Changing a graphic bank keeps the target's existing tile numbers. A technically compatible result can therefore look mismatched or suggest collision that the base does not have. Inspect the graphics and play the generated ROM. Preflight checks do not prove level solvability, difficulty, artistic quality or audible equivalence.

## Keep a choice while shuffling

After a successful preview, check a domain's **Lock** box and choose **Shuffle unlocked**. The displayed seed advances and unlocked dropdowns return to Random and their domains are selected again; the locked domain retains its previous chosen source. Different seeds may choose the same item from a small pool.

A lock refers to the prior successful preview. Changing a locked dropdown does not override that prior choice until you unlock it. Before your first preview, you may explicitly select a source and lock it; a random graphics/music lock establishes its choice on the first successful preview. **Lock gameplay choices from the previous preview** requires an existing gameplay preview.

**Keep current** retains that domain from the captured base. If every selected domain and gameplay option results in unchanged data, the status reads **No effective changes** and Apply is disabled. The unchanged candidate and its recipe remain downloadable.

## Gameplay options

- **Vary patrol speed (1–4, within authored bounds)** changes supported existing canonical patrol instance parameters. It retains the authored bounds and mechanics.
- **Shuffle compatible existing enemy/pickup slots** permutes existing placements only within compatible ownership, screen, role, collider and patrol-bound groups. Slots must have known-clear collision and remain inside their relevant map or Room.

These options do not create enemies, change player/start positions, add item values, change health/damage or invent mechanics. Player, switch and door identities, persistent bindings, collision data and World links remain. Unsupported behavior, absent compatible slots or unsafe geometry produce explicit findings. Door physical blocking remains deferred.

The preview lists each supported change or unavailable reason. Keep these options off when you only want a visual/music mashup. Lock gameplay only after previewing the desired choices.

## Save and reproduce a result

**Download candidate project** saves the previewed editable Forge project without applying it to your open project. Ordinary **Open Project** can open that candidate later. It contains the generated project, not the entire mashup source-pool session.

**Download recipe** saves the seed, choices, locks, source identities, bounded gameplay decisions and result identity. A recipe contains no donor projects or original ROM bytes. Keep separate unchanged copies of the original base and all donor projects, including donors that were not selected by a particular random draw.

To replay:

1. Open the original, unchanged base project and choose **Use current project**.
2. Add the same original donor projects. File names may differ; canonical content identities must match.
3. Use **Open saved mashup recipe (exact original sources required)** to select the recipe JSON.
4. Forge verifies every source and reproduces a detached preview. Review it before choosing Apply or downloading the candidate.

Opening an already-applied mashup as the base will not reproduce its original recipe: its source content has changed. Source SHA-256 values identify canonical editable project content; they are not necessarily the raw file-byte checksum. A recipe is versioned and is not a promise that later Forge versions will silently reinterpret it.

Candidate and recipe downloads use the existing Save As service. A busy, cancelled or failed save is reported honestly and does not partly apply a mashup. A successful candidate download does not mean your active project has been saved or that an isolated native-ROM editing session has been saved.

## Compatibility and bounds

The source pool accepts up to nine canonical schema-12 projects: the captured base and eight donor files. Each source is limited to 8 MiB of canonical JSON, and the pool to 32 MiB. Recipes are limited to 64 KiB. Save older projects from the current editor before using them. Raw ROMs, ZIPs, recipes and inspection reports are not donor projects.

The base must use generated Forge code and mapper 0. Donor assembly is not executed. Invalid data, unresolved references, unsupported Audio shapes and capacity conflicts are refused before applying anything. Global Audio tempo/speed changes can change existing SFX timing, even though their definitions and source patterns remain.

Compatible donor music is appended with rebased pattern/instrument references, replacing the current music order and tempo/speed. Audio Runtime and autoplay settings remain as the base configured them. Generated World projects receive a detached build check; other backends have the stated structural checks and need the ordinary Build workflow to verify full cartridge capacity. The preview's compatibility report states which check was actually performed.

## When a preview becomes stale

Editing or reopening the active project after capture makes the captured base stale. Choose **Use current project** again, retaining the loaded donors, then preview again. Changing a seed, source choice or option invalidates the old Apply action. Donor batches are staged together: if one file fails, the prior pool is retained. **Clear donors** removes all donor snapshots from the mashup session, without editing the project.

Apply replays and validates the candidate, asks for confirmation, then checks the full project again. It writes only the selected scene banks/palettes, changed Audio fields and supported actor variations. It does not load/reset the emulator, original ROM or native analysis session. A display refresh failure after a successful Apply leaves the edit marked modified and reports that the data was committed; save and reopen the project if needed.

Use `docs/SEEDED_MASHUP_CHECKLIST.txt` for M1–M9 review. Automated handler/model checks are separate from real browser layout, phone keyboard/file picker, listening, controller and hardware acceptance. This guide supplements the manual; it does not claim that the complete manual or printable PDF has been updated.
