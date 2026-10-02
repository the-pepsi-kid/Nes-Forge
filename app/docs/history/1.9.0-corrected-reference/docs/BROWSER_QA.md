# Real-browser acceptance — unverified

The 1.7 Cloud Browser attempt was rejected by URL security policy before UI inspection and remains recorded in `../checkpoints/1.7-browser-attempt.json`. No 1.8 browser or audible-output pass is claimed.

| Acceptance item | Status | Required observation in a permitted browser |
| --- | --- | --- |
| Blank startup | Unverified | Blank viewer; World/Audio off; no starter or false identity |
| Recovery banner | Unverified | Checking, Restore/Dismiss and delayed/invalid reads preserve correct state |
| Save | Unverified | Correct schema-12 bytes/identity; delayed completion cannot clean a later edit |
| Save As | Unverified | Native picker/download, gesture context, bytes and cancellation |
| Project/ROM opening | Unverified | JSON/ZIP, legacy playable and schema-10/11 World ROMs; invalid input atomic |
| Build & Run | Unverified | Explicit backend/audio choices; failed builds never play stale output |
| Run Original | Unverified | Retained original bytes play independently of current edits |
| Runtime capture | Unverified | Completed-frame/provenance and scene-aware CHR/palettes remain editable |
| Audio Studio layout | Unverified | Runtime/SFX/import controls remain usable at normal editor sizes and keyboard focus is correct |
| MIDI/MusicXML pickers | Unverified | Real local selection, confirmation/cancel, successful import and errors |
| Audible output | Unverified | Viewer, single-room and World music/SFX are audible; mute/resume and tab changes behave correctly |
| Gameplay Core tables | Unverified | Typed add/edit/remove controls cover definitions, instances, parameters, components, states, transitions, conditions/actions, variables and bindings without JSON editing |
| Room-scoped World authoring | Unverified | Place an Actor in an authored Room, create/bind a Room variable, leave/re-enter, observe persistence and reconstructed transient state |

Record exact browser, OS, version and final candidate hash. Include World controls, screen transitions, Audio enable/disable, tracker preview versus generated playback, frame-entry SFX, imported-song undo, recovery reloads and picker cancellations.

VM handlers, controlled storage, source guards, whole-ROM comparison and bundled-emulator APU register execution are separate automated evidence. They do not prove layout, native file-picker behavior, speaker output, browser scheduling or independent NES hardware timing. Never infer a browser pass or bypass the security boundary.

Completing browser acceptance closes only the 1.9.0 candidate evidence gap; it does not authorize 1.9.1 or any later tranche.
