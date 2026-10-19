# Mega Man 2: native audio inside Forge

**2.0.0-alpha.11 / megaman2-audio-1 · schema 12**

The supplied US revision now fills **AUDIO → ROM Audio Library → Native Cue** automatically. This is a new validated revision decoder. Audio Discovery scans alone do not create a catalog for another game.

## Try it

1. Extract the complete review ZIP to a short Windows path such as `C:\NF\MM2`. Open `START_HERE.html`, then **Open NES Forge**.
2. Open **AUDIO → ROM Audio Library → Open NES ROM…** and choose your own `Mega Man 2 (USA).nes`. The title becomes **Mega Man 2**, with **67 cue / control entries**, **31 envelope entries**, and **0 DPCM descriptors**. No Windows export or external tool is required.
3. Select **Music $00** or an **Effect**. IDs are native selectors, not verified song names. Choose **Inspect cue** to read commands and physical source addresses.
4. Set **Native updates**, initially 256 (about 4.3 seconds at one update per NTSC frame), then **Play native**. The existing Forge APU renders the original driver in an isolated machine; the live game and project remain untouched.
5. Click the timeline for exact channel state and writes at an update. Choose **APU writes**, **View writer source**, or **Driver & banks** for supporting evidence.
6. Choose **Preview editable score**. Keep **Music excerpt** for ordinary excerpts, including multi-channel effects. Review omissions and tempo changes before **Import into tracker**. One Undo restores the earlier project.
7. Choose **Tracker** to edit; **Save Project As…** preserves the editable project. Investigation JSON is evidence, not an editable project or cue database.

## Catalog and format

| Item | Recovered structure | Meaning |
| --- | --- | --- |
| Music | `$00–$20`: 33 selectors, 24 distinct headers | Includes short jingles. `$18–$20` alias `$0F`. These are not 33 distinct full songs. |
| Effects | `$21–$42`: 34 selectors | A shared effect command stream is routed to each header's channel mask. Many effects use several voices. |
| Channel streams | Four pointers per music header; zero means absent | Pulse 1, Pulse 2, Triangle, Noise. Commands retain bank, CPU address, file offset, parameters and branches. |
| Modulation | 31 distinct referenced four-byte records | Pitch/amplitude modulation parameters, not complete original tracker instruments. Inline commands also control pitch, volume and duty. |
| DPCM | No descriptors in this cue format | The decoded driver routes four base voices; this does not classify every dormant ROM byte. |
| Controls | `$FC–$FF` | Update repetition, fade, stop effects, stop music. Documented separately; excluded from playable cues. |

The first table pointer targets the byte immediately after the 67-entry pointer table. All headers and streams are read from your current source. Native dispatch has no general bounds check; Forge refuses selectors outside the recovered table.

## Evidence views and controls

**Native commands** shows structural operations. Music includes duration scale, signed pitch delta, duty, volume/control, counted branches, pitch-table selection, dotted notes, volume envelopes, modulation presets, holds, extra half-steps and stops. Effects have separate delay, pitch/control, branch, inline modulation and timer-period encoding. They do not share the music note format. Traversal ends at a native stop or repeated parser control state; these records are not fully timed scores or acoustic loop measurements.

**Envelopes** lists referenced modulation parameters and cue/index relationships; its inherited metric label counts those records here. **DPCM** is empty for this format. **Driver & banks** shows dispatch `$8003`, update `$8000`, table `$8A50`, the game's queue, and physical bank **12** at `$8000–$BFFF` / bank **15** at `$C000–$FFFF`. **Live mapper snapshot** separately shows the running game's current banks.

**Native updates** bounds audition/conversion to 1–1024 updates. **Stop** stops playing audio; **Cancel operation** cancels pending rendering/conversion. Longer songs can exceed the finite window.

## Fidelity and revision limits

Native preview starts from cleared RAM and an explicit cue dispatch, updating once per 29,780 NTSC CPU cycles. It uses Forge's existing APU model. It is not natural gameplay, hardware/listening acceptance or a characterization of all cross-cue fade/priority interactions. The gameplay channel-suppression mask starts cleared.

Editable conversion retains the existing frame-end APU adaptation: nearest canonical tonal pitches, volume rows and simple duty instruments. Original command flow, exact envelopes, sub-frame articulation, retriggers and native loops are not reconstructed as original tracker data. DPCM and short-mode noise are omitted. Multi-channel effects require **Music excerpt**; **Single-channel SFX** requires one representable voice and a window shorter than one pattern. Silent or unsupported windows are refused with details.

Identification requires SHA-256 `49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf`. Renaming a different revision cannot authorize it. Unknown revisions retain Audio Discovery; writer rankings do not silently grant decoding. Native Cue now explains missing decoder support instead of displaying a blank list.
