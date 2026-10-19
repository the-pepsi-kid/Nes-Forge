# Discover recovery methods

Open **RE / DISASM → General ROM Analysis**, choose a ROM or binary, and select **Open for analysis**. In the analysis workspace, **Available recovery methods → Discover recovery methods** checks the installed methods against that exact original file. The report shows its filename, byte length and SHA-256 identity.

Discovery reads source bytes. It does not import assets, replace scenes, change project history, run a ROM, reset the emulator, or reset native Audio edits. It also does not establish that the entire ROM is understood.

## Reading the results

- **supported**: this method recognizes the relevant structure. Each later operation still checks its own requirements.
- **unknown**: the bounded check could not establish this profile.
- **unsupported**: a declared requirement is outside this method's capabilities.
- **ambiguous**: the available evidence does not select one safe interpretation.
- **invalid**: the method's required structure is malformed or inconsistent.

Read the reason, operation list and limits for each result. In particular, recognizing the supported FamiTone2 driver does **not** prove that every subsong or excerpt can become an editable AUDIO score. Preview the chosen excerpt to see its conversion support, tuning, timing and envelope differences.

The initial shared catalog contains physical CHR-ROM recovery and the supported FamiTone2 native Audio profile. It is a shared discovery interface for those existing methods; it adds no universal map, collision, gameplay, compressed graphics or audio-engine decoder. General physical-byte analysis remains available when no recovery method recognizes the source.

The included `examples/RE_Bridge_Room/Bridge_Room.nes` is a physical-CHR example. The included `examples/RE_Native_Audio/HonkeyPong-reproduced.nes` is a native-Audio example: its supported FamiTone2 structure is recognized, while physical-CHR recovery is unsupported because General Analysis does not trust its nonzero reserved header byte. These are independent method decisions, not a whole-ROM supported/unsupported label.

## Open the appropriate tools

**Open tile recovery tools** expands the existing Raw CHR section and focuses **Preview native tile import**. Press that preview control separately. Importing the preview creates a new editable tile sheet only after you select **Import as new tile sheet**. The source palette, scene layout, collision and bank visibility remain unknown.

**Open native Audio tools** reveals the existing native Audio inspector. It does not press **Analyze current ROM**. If you already have an edited native ROM copy, it remains intact. Export that copy before choosing **Analyze current ROM** again: analysis starts a new native session from the original file opened for general analysis.

**Open AUDIO transcription tools** reveals the existing transcription section. First analyze the native source and select a subsong, then choose **Preview import to AUDIO**. With an existing current native session, transcription uses that session's current edited ROM bytes. Discovery always describes the original opened source; the native-copy notice and transcription preview identify the edited copy separately. Conversion remains an explicit preview and confirmation step.

## Source changes, cancellation and evidence

Selecting another file invalidates the discovery results immediately, even before it is opened. Complete **Open for analysis**, then discover again. A source change during discovery prevents its older results from appearing. **Cancel discovery** prevents pending results from being published; trusted synchronous probes finish their bounded current step before cancellation can take effect.

**Download method evidence** uses the existing Save As workflow. It exports the original-source identity, method recognition results, declared capabilities, evidence and limits. The JSON is a historical inspection report; it is not an importable project, saved native edit session, or guarantee that an asset will convert. It contains no ROM image or project snapshot. Save cancellation or a busy Save As dialog leaves the current results available.

Keyboard input remains owned by these controls. Discovery and routing are distinct from emulator controls, including touch and connected gamepads.
