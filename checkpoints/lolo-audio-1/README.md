# NES Forge · Lolo Scene + Audio review

This source snapshot corrects Lolo’s missing native Audio driver: 10 music cues, 24 SFX, bounded native playback and finite editable tracker import. All 50 native room backgrounds and bounded terrain/heart writing remain retained.

Every project must now verify Audio as well as Scene. Read reviews/PROJECT_VERIFICATION.md, reviews/lolo-audio-1/LOLO_AUDIO.md and its Owner_Checklist.md.

Build/check: python3 app/tools/bundle.py --check. Public checks: node app/tests/lolo-audio.cjs and node app/tests/native-audio-library.cjs. Current evidence is under reviews/lolo-audio-1. Its full focused runner requires the recovered full historical test tree; this snapshot provides the public decoder/UI checks and the current buildable app. Prior evidence is historical.

Native audio writing remains unsupported: imported tracker edits are preserved but block native ROM output. Undo restores native room rebuilding. Actors, animation, browser listening, physical devices and whole-game acceptance remain partial/unverified. No full alpha promotion is claimed.

No commercial ROM, recovered score, sample payload or source-bearing project is included. Main and preceding checkpoints are preserved.
