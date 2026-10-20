# Audio Runtime and Studio — 1.8

Audio Runtime turns the existing AUDIO tracker into generated NES APU code. It does not add another song, instrument or event representation.

## Author and build

1. Add instruments and edit their pulse duty, volume envelope, arpeggio envelope and loop points.
2. Enter notes in pulse 1, pulse 2, triangle or noise patterns and arrange them in Pattern Order.
3. In **NES Runtime**, enable **Compile Audio Runtime**. Keep **Autoplay tracker order as music** enabled for background music, or turn it off for SFX-only builds.
4. Build a generated scene viewer, First Playable Room or World Runtime ROM. Audio-enabled authored custom assembly is rejected because generated code cannot be inserted safely into the author program.

Audio Runtime is off when an older project is first opened. Enabling it is an explicit saved choice. DPCM notes and tracker effect commands fail when referenced by executable music instead of disappearing from the ROM.

## Sound effects and animation events

An SFX names one tracker pattern, one hardware channel and an inclusive start/end row range. Its ID is the stable reference. In ANIM, add a `sound` event to a frame and set its value to the SFX ID; an unambiguous name also resolves for convenience.

The event starts once when the generated runtime enters that animation frame. One SFX plays at a time. It temporarily takes over its selected channel and restores that channel's music state on completion. Another request received while an SFX is active is ignored. The scene viewer has no animation executor, so it only autoplays music; player/target frames in First Playable Room and player frames in World Runtime execute sound events.

## MIDI and MusicXML import

Import is deliberately downstream of working runtime playback. Both adapters append ordinary patterns and instruments, keep existing SFX pattern indices, and replace only the music order. Import is one undoable edit and does not enable Audio Runtime automatically.

- MIDI: Standard MIDI format 0 or 1 with pulses-per-quarter timing. Pitch, velocity, initial tempo, track and program information map into tracker notes, volumes and instruments. MIDI channel 10 uses noise. Format 2 and SMPTE timing reject.
- MusicXML: Uncompressed `score-partwise` XML with divisions, note/rest/chord duration, backup/forward timing and initial tempo. Compressed `.mxl` is not supported.
- Both quantize notes to sixteenth-note rows. The current tracker has one tempo, so later tempo changes flatten to the initial tempo with a warning.
- More than three simultaneous pitched voices or overlapping percussion/noise voices reject instead of being discarded.

Sheet-music image recognition, tablature transcription and a separate score editor are not included. Any later transcription must produce this same tracker/instrument representation.

## Runtime limits

- Mapper 0 and existing 16/32 KB PRG plus 8 KB CHR profiles only.
- Pulse 1, pulse 2, triangle and noise; no DPCM sample data.
- At most 255 order rows, 255 instruments and 255 named SFX in the runtime plan; actual PRG capacity is usually lower.
- Pattern cells may change note, instrument and volume. Effect/parameter bytes have no 1.8 runtime meaning.
- Volume and arpeggio envelopes are tick-based. A nonlooping volume envelope becomes silent after its final value.
- Generated runtime playback is verified in the bundled emulator. Real-browser audible output and independent NES hardware timing remain separate acceptance work.
