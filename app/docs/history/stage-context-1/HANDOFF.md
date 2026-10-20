# Development handoff

Current candidate: **2.0.0-alpha.11 / context-cleanup-1**, an unpromoted development checkpoint based on `697a998e744c7794fae5d1063748e8d83d5ffe57`. Ordinary projects write schema **12**; projects containing `nativeGame` write schema **13**. See [CURRENT_STATUS.md](CURRENT_STATUS.md) for current identity, evidence and scope.

1. Read current status and `docs/SCENE_CONTEXT.md`. Use source parts plus `tools/bundle.py`; do not patch the generated HTML alone.
2. Review `../reviews/context-cleanup-1/Verification.json` for measured results and remaining blockers. Parent results retain their original identity.
3. Preserve schema 12 for ordinary projects, schema 13 for source-bearing native projects, existing encoders, shared CPU/APU/PPU and whole-ROM goldens.
4. Next extend the shared context through explicit source adapter mappings and verified scene/event-to-audio relationships. Native context names are not universally equivalent to stages. Missing links must remain explicit.
5. Complete actual browser/owner/manual acceptance where evidence remains open. Source-bearing projects and original ROMs remain private.

The kit retains the original tutorial/manual/PDFs and has a separate current navigator guide. Git branch work is a checkpoint; a prerelease requires its own verified tag and assets.

[Historical handoffs](docs/history/context-cleanup-1/HANDOFF.md).
