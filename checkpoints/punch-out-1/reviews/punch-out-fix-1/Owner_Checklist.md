# Check the replacement HTML

1. Open NES_Forge_Punch_Out_Fixed.html and use Import ROM on the original supplied PRG0 or PRG1 source. Preparation pauses after a bounded native run; the first Scene should show the completed frame, including portrait/sprites.
2. Open Audio: expect the recognized US driver and 84 entries. Audition Music 12, an SQ1 effect, DPCM, and Startup PCM + native bell. Startup PCM needs 199 or more updates; the default 256 is sufficient.
3. Save Project As, reopen it, and confirm the same Scene and Audio catalog. Existing older captures are retained as saved; re-import the original ROM to get the corrected capture.
4. Capture Runtime Scene and Hybrid Capture now use the same pixel-validated renderer trace. Unsupported dynamic OAM geometry refuses explicitly.
5. Captured-frame edits save, but do not have a native game writer. Source-template native brush edits remain separately bounded; Audio/sample writing and whole-game acceptance remain unfinished.
