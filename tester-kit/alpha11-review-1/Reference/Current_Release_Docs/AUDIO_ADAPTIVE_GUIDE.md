# Audio adaptive editing — alpha.5 review guide

Candidate: 2.0.0-alpha.5 / audio-adaptive-1, schema 12. This is a bounded Audio UI candidate based on the phone keyboard interaction you tested in alpha.4.

Open `mainline/NES_Forge_2.0.0-alpha.5.html` and choose **AUDIO**. Add an instrument if your blank project has none. Tap a tracker cell and type the same PC piano keys: Z = C3, X = D3, Q = C4, 2 = C#4. Entry remains in the selected cell; Done/Enter closes the keyboard. Native tempo, speed, row count and instrument fields remain directly editable.

On a narrow screen, scroll the tracker horizontally to reach the other channels and vertically to reach later rows. Selecting a different cell or resizing the viewport reveals the selected cell inside the tracker. Re-rendering the same selection does not snap manual scrolling back. Playback does not force follow-scrolling. The Audio controls below the tracker remain available by scrolling the workspace.

Select an instrument and drag on the original **Volume Envelope** or **Arpeggio Envelope** with touch or pen. Volume is 0–15; arpeggio is −12–12. A stroke edits only the current instrument's existing envelope and creates one undo step when values change. Cancellation ends the stroke; already painted points remain undoable. A second pointer, tab change, window focus loss or hidden page stops further writes. Use space outside the envelope to scroll the panel. Desktop mouse painting keeps its original handler.

The envelope canvas is enlarged in compact/coarse-input layouts without changing its canonical points. This candidate adds no new note form, Apply action, envelope text form, DPCM playback, channel/effect types or import formats.

The new device-width viewport declaration enables the application's existing narrow-screen layouts on phones, including other tabs. Review Scene, CHR, Code, RE and Emulator reachability; this metadata change is broader than Audio's scoped CSS. Audio-specific styles and viewport-height handling are released on leaving Audio.

Use `AUDIO_ADAPTIVE_CHECKLIST.txt` for the short device review. Automated gesture tests and modeled geometry do not prove actual keyboard presentation, browser rendering, audible output or phone performance. Chromium runners must either execute checks or report an unavailable browser with zero checks. No physical-device pass is inferred from them.

Next, complete the supported Audio author/import/edit/build/listen/save/reopen workshop. MIDI and MusicXML remain the existing supported import routes. For compiled playback enable **Compile Audio Runtime** in AUDIO, then use the top-level **Build .NES ROM** or **Build & Run** action. Preview output, compiled ROM behavior and RE audio observations must be evaluated separately. The older manual has not been fully revised or converted to a visually checked printable PDF by this UI pass.

Two editable music/SFX review projects and their built ROMs are under `examples/Audio_Correction_2.0.0-alpha.5/`. Their build report specifies expected notes and timing; generated examples are review inputs, not listening acceptance. The current Gameplay Core example is `examples/Scout_Gameplay_Core_2.0.0-alpha.5.nesforge.json`; older example files remain preserved.
