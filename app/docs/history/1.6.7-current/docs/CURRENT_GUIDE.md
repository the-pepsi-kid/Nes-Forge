# Current editor guide — 1.6.7

NES Forge 1.6.7 is an architecture release. Work in the existing editor tabs; no wizard or automatically loaded Scout example is part of startup.

## Project actions

| Action/state | Meaning |
| --- | --- |
| Fresh startup | One blank viewer scene, blank art, no imported original ROM or project save identity |
| Recovery check | Existing stored recovery is checked before autosave can replace it |
| Recovery banner | Restore or Dismiss the available recovery explicitly; invalid/unsupported recovery is retained on rejection |
| New Project | Established blank single-room configuration; replacement is undoable |
| Open Project | Validated full project load; ordinary project opening clears history and preserves authored assembly |
| Save | Save the current project's captured data to its intended browser save identity; a late result must not bind a different project |
| Save Project As/Export | Existing authoring-backup/save-context behavior; project schema 9 is used in current project output |
| Open Forge ROM | Checked clean replacement for a supported Forge playable ROM; preserves original bytes and offers Undo |
| Import ROM | Existing append/reconstruction/capture operation, distinct from clean replacement |

The CHR SHEET edits pixels; SCENE paints tiles and places entities; COLLISION assigns tile behavior; METASPRITES composes poses; ANIM edits frames, contact boxes and events; ENTITY STUDIO binds animation states. Gameplay settings remain in the SCENE sidebar. Assembly is optional.

## Build and playback actions

| Action | Result |
| --- | --- |
| Preflight | Diagnostics for the current selection/configuration and existing NROM limits |
| Build .NES ROM | Current project compiled by the selected existing backend and saved through the established export path |
| Build & Run | Successful current project artifact loaded into the existing emulator; failure must not play an old build |
| Run Original | Retained original imported ROM bytes played by the existing emulator |
| Runtime capture | Existing provenance/capture APIs, kept separate from project creation and clean ROM opening |

Viewer/custom mode and the single-room proof of concept have different capacities and behavior. The single-room backend remains one player, one optional stationary training target and existing movement/jump/solid collision/animation behavior. Worlds, audio tracker data and general actor/event authoring are preserved where they are not executed. The current release does not implement world execution, music compilation, a new mapper target or Live Edit.

Open the external Scout example with Open Project to inspect that slice. An unedited blank viewer project builds the blank scene; merely opening the editor does not load the example. `SCOUT_REFERENCE.md` lists editable example parameters.

## Status and compatibility

Current identity is **1.6.7 — Architecture Convergence**. Project schema is **9**, separate from the release number. Unsupported schema/format inputs must reject before replacing the project. Unresolved references remain available for repair, with build diagnostics instead of silent deletion. Files cannot be safely downgraded by changing a number in JSON.

The source may retain historical strings inside exact-preservation blocks. They are not the current Tech Docs renderer or an additional feature contract. Historical guide snapshots are under `history/1.6.6/`.

Browser status remains explicit: all eight requested browser acceptance actions are unverified because Cloud Browser URL policy rejected the standalone file. See `BROWSER_QA.md`; automated harness outcomes are not native-browser acceptance.
