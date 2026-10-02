# 1.6.6 Visual Workspace handoff

Canonical HTML: `mainline/NES_Forge_1.6.6_No_Code_Workflow.html`. The title now reads VISUAL WORKSPACE. The filename is retained for continuity; the popup Workflow is removed.

**User decision:** The existing editor environment must be sufficient to create the demonstrated ROM. Do not add a wizard, guided popup, or template-based alternative as the primary authoring path. Integrate missing capabilities into the existing tabs and ordinary project controls. Examples remain normal editable project files.

| Layer | Responsibility |
| --- | --- |
| `project166.js` | Blank project creation, clean checked Forge-ROM reopening, undoable replacement, accurate append/capture messages. The internal Scout fixture API is retained for regressions; no starter button is exposed. |
| `placement166.js` | Bound actor art/selection at authored origins and facing; selected player's movement body and feet. |
| `ui166.js` | Ordinary project-bar New Project/Open Forge ROM/Gameplay controls; gameplay settings in SCENE; adjacent entity-binding guidance. No popup/checklist and no builder replacement. |
| `release166.js` | Version identity and current in-app guide. |

The frozen 1.6.5 baseline SHA-256 is `aae0002a5b991d21260612177619ca696d4baef8ca00e08affc25cd193618bb8`. Four layers append without modifying protected source blocks. Project schema remains v8; ROM formats and the 1.6.5 gameplay engine remain unchanged. `work/CONTRACT.md` documents runtime APIs.

The first 1.6.6 release overbuilt the UI: a separate starter confirmation below the popup could be skipped by Build & Play, which built the old default project and discarded the pending selection. That behavior was reproduced and tested, then superseded by the user's request to remove the entire popup. Native project actions now resolve confirmation before replacement; ordinary Build & Run builds the current project.

Clean ROM opening remains necessary. Append import can retain the default room, duplicate global assets and unrelated assembly; excluding the old room alone is insufficient because the linker traverses all global assets. Open Forge ROM replaces the project cleanly while preserving original bytes and providing Undo. Other ROMs retain capture/disassembly; unknown game logic is not automatically recovered.

Native authoring evidence must come from the existing control handlers, starting with a blank project, without assigning a scripted project fixture as the positive creation path. Automated DOM/control and real-emulator tests are distinct from manual browser layout/input/save-dialog verification. Browser access remains blocked; retain that limitation in claims.

Keep the RE branch separate. Future gameplay features should bring usable authoring controls in the established tabs, together with example data and reproducible checks.
