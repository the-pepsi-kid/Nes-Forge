# Owner verification

- Open the standalone HTML and import either supplied US Punch-Out revision. Check each of the five native background contexts, source brush previews and shared literal edits. These views omit fighter sprites and dynamic overlays.
- Save/reopen and build an unchanged source, then a bounded Scene edit. Confirm the edited native background and retained music/effects.
- In Audio, inspect the 84-entry catalog. Audition Startup PCM + native bell, music 12, SQ1/SQ2 effects and DPCM requests, then save/reopen and confirm Audio still loads. Empty/stop entries must not audition as sounds.
- Preview/import a finite music excerpt and a short one-channel SFX. Check Undo/Redo. Native output must refuse unsupported tracker edits; Undo restores native Scene rebuilding.
- Listen in the actual browser. Automated PCM checks do not substitute for this step. Test controllers/gameplay separately; MMC2 scanline timing is approximate and runtime capture is unavailable.
- Bank-6 startup PCM is available as Startup PCM + native bell. Audition it with at least 199 updates and confirm completion; shorter windows report truncation. PCM tracker editing remains unavailable. Native Audio writing and full-game recovery remain unfinished.
