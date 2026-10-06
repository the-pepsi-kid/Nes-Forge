# Mobile Keyboard — 2.0.0-alpha.4 / mobile-keyboard-1

Add or select an instrument in **AUDIO** first; note entry requires an instrument, as on PC. Tap an ordinary note cell to request the phone's keyboard. Enter the same piano keys shown in the tracker on PC. The tapped cell remains selected; notes do not advance the row automatically. There is no separate editor form or Apply button.

| Key | Note / action |
| --- | --- |
| Z | C3 |
| X | D3 |
| Q | C4 |
| 2 | C#4 |
| S, D, G, H, J | Lower-row sharps on the existing PC keymap |
| 3, 5, 6, 7 | Upper-row sharps on the existing PC keymap |
| Space | Existing Audio preview play/stop |
| Backspace | Existing tracker cut action |
| Delete | Existing tracker clear action, when the keyboard provides it |
| Arrow keys | Move the existing tracker cursor, when available |
| Enter / Done | Finish the current keyboard interaction |
| Escape | Leave keyboard entry, when available |

Use one piano key at a time. If the phone keyboard keeps that letter underlined or otherwise composing, commit it with **Done/Enter** before changing cells. Do not type a note name such as “C3”: the tracker uses piano keys, as on PC. Multiword text, paste, autocomplete and autofill are not a note-import interface and are ignored. A mobile keyboard may need its number/symbol page for upper-row sharps. Keyboard layout and exact Done/Enter behavior remain device review items.

Only committed input may edit the current canonical tracker cell. Provisional composition is cancelled when leaving the Audio tab, losing focus or replacing the project; it must not reappear in a different cell. Scrolls and multi-touch gestures must not be treated as note-entry taps. The input bridge belongs to Audio only and must not drive the emulator or other site controls. Existing Undo, Redo and Save remain the same canonical actions; Ctrl/Cmd shortcuts, where provided, retain that routing.

Instrument selection and the original envelope painting workflow remain unchanged. Alpha.3's separate note/octave/instrument/volume forms and envelope step editor were withdrawn by the owner under D055. This correction restores the requested direct tracker workflow; it does not add a new touch envelope editor, audio model, compiler or playback engine.

Use `MOBILE_KEYBOARD_CHECKLIST.txt` for the short phone and desktop review. The actual target reported by the owner is Cricket Dream 5G with Chrome. Native keyboard opening, visible layout, speakers and physical controllers remain unverified until performed on a real device. VM event tests establish event/model behavior only. The full candidate Summary and clean-extraction proof must match `build-inputs.json`; three browser reports separately identify passed or blocked execution. Old or lost intermediate results are not current evidence.

The alpha.2 gameplay/audio-performance review remains separate in `MOBILE_PLAYBACK_CHECKLIST.txt`. Passing note entry does not establish faster or smoother emulation.
