# Per-project tutorial documentation checkpoint

Owner request: each imported game needs instructions for its own methods, including the standalone workflows already documented for NES Forge. This pass establishes the continuing requirement and completes the current Punch-Out playbook. It does not implement the next concurrent fight sequence.

## Deliverables

- `app/docs/projects/README.md`: current title methods, existing tutorial/evidence pointers and the explicit older-lesson expansion backlog.
- `app/docs/projects/PROJECT_TUTORIAL_TEMPLATE.md`: reproducible import/edit/build, per-asset ownership, format lessons, Audio, independent RE/assembly/hex, HTML connections, authored-game conversion and acceptance requirements.
- `app/docs/projects/PUNCH_OUT.md`: current revision-bound lesson with actual controls, arena and staging native writers, opponent pose/state copies, Mac/referee/HUD references, Audio, independent inspection, exact arena bank/offset example and standalone output distinctions.
- `app/docs/PROJECT_HANDBOOK.html`: offline book containing all three documents, the full existing general guide, earlier available Metroid/Lolo/River City/Shadowgate steps, per-project verification requirements and the full synthetic codec source. No remote dependencies or source-bearing game data.
- `app/tools/render_project_tutorials.py`: deterministic documentation renderer using optional Python markdown2. No application build dependency is added.

README, application handoff and `reviews/PROJECT_VERIFICATION.md` point to the requirement. The general guide is included unchanged in the book. Existing dated title notes retain their original limits and are not represented as freshly verified.

## Validation and continuation

See `Verification.json` for the current checks: complete application-source preservation, bundle identity, deterministic documentation output, internal/Markdown link integrity, example execution on both private originals and the existing synthetic lesson. Browser layout, listening, device acceptance and all-title native verification are not claimed by this documentation pass.

The application remains the Glass Joe fight-context checkpoint, SHA-256 `aceb8cdd70e0839b4649bc56daa39519204b660bbbae100209ad9e66bb03b89a`. Existing implementation evidence remains in `reviews/punch-out-fight-context-1/`. The next implementation task is the declared short concurrent fight sequence; full fight phases and native art/color/Audio writers remain open.

The pending public 38-file payload is frozen at implementation commit `e2d94cbad861783fabde4e52d647e3701f78b487`. This documentation checkpoint is separate and has not been added to that exact-payload manifest. If later publishing that frozen payload, read its bytes from that commit rather than the subsequently edited working files. No public push is attempted in this pass.
