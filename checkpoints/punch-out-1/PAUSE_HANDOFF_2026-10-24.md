# Paused at owner request — 2026-10-24

Owner asked to stop at usage limits, write down the resume point, and push to GitHub. Implementation/research processes are stopped. This checkpoint contains unfinished source; it is not a release or acceptance pass.

## Last verified application and tutorials

- Last verified implementation: local `e2d94cbad861783fabde4e52d647e3701f78b487`; app SHA-256 `aceb8cdd70e0839b4649bc56daa39519204b660bbbae100209ad9e66bb03b89a`.
- Last verified documentation/source checkpoint: local `fff36b0` (same application bytes). Includes the offline project tutorial handbook, Punch-Out playbook and continuing per-title tutorial requirement.
- Existing Glass Joe setup/player/referee reference work and its 104-check retained gate remain documented in `reviews/punch-out-fight-context-1/`. Those reports certify their recorded HTML hash, not the new WIP executable.
- The downloaded `NES_Forge_Punch_Out_Fight_Context.html` remains the last verified app. The current source-generated `app/mainline/NES_Forge_2.0.0-alpha.11.html` is WIP; do not recommend it as the finished next build.

## Authorized remaining scope

1. Verify a concurrent original-engine Glass Joe opening → punch → dodge → return to stance sequence.
2. Extend to knockdowns, correctly decoded referee counts, and round transitions/next-round resumption.
3. Finish native physical CHR and fight-palette editing, including export/reimport and actual original-engine graphics checks.
4. Retain all earlier workflows and Audio verification; update the per-title tutorial alongside each finished capability.

## Work in progress: native artwork

New pure codec `app/src/re/punch-out-art.js`; project/writer `app/src/services/punch-out-art-project.js`; UI `app/src/re/punch-out-art-ui.js`. Added to manifest. Dedicated canonical Scenes represent physical 4 KiB CHR banks or 32-byte fight palette tables. Existing recovered reference copies remain snapshots. Existing ProjectStore/native build owners remain authoritative; no native descriptor/schema extension is introduced.

Two shared seams changed: `native-resource-project.js` admits declared art derivative identities and optional bounded registered Scene fields (`chr`, `sprChr`, `pal`, `sprPal`, `bgColor` as well as existing layout fields); `native-punch-out-resources.js` adds revision-bound artwork masks while retaining protected code/pointer identity and palette alias checks. Changes require review and regression verification before acceptance.

Important format discovery: native palette bytes include high flag bits (for example `$8F`). Color writing must preserve the upper two source bits and change only the six color bits. Derivative identity masks likewise clear only those six bits. Universal background-color aliases must agree. The WIP codec implements these rules, but the complete UI/build workflow does not pass yet.

**Known failing check:**

```bash
node reviews/punch-out-native-workflows-1/verify_art.cjs /path/to/private-roms
```

The PRG0 run reaches line 14, then an unchanged build immediately after `PunchOutArtUI.open('chr', 0)` fails with `Native resource project: An asset or runtime setting changed without a native encoder. Unsupported work remains savable.` Opening/preparing the art resource succeeds, but the post-commit/capture signature differs. Diagnose normalization/selection/working-buffer capture versus the prepared Scene before editing pixels. Do not loosen signatures or re-sign unknown differences. Later lifecycle/alias/derivative/Audio assertions and PRG1 have not passed. No `Art_Verification.json` is produced.

The last WIP app was deterministically bundled (SHA-256 `1ff7d01f2580ab070046bd246fe7a60549e5d7adf17ed69146e3119a7926dce4`); a current release/regression pass is not claimed.

## Research observations: original-engine sequence

No replay service/UI has been implemented yet. The existing `EmulatorTimeline.runScript` already supplies bounded real controller input (max 1800 frames per call), physical checkpoints, explicit reversible RAM experiments, cancellation and paused results. Reuse it with EmulatorBridge; do not invent a second emulator/state owner or claim MMC2 runtime capture is supported.

Private PRG0 research from reset used the existing actual CPU/mapper/PPU/APU path. Controller masks here use Forge's serial order: A=1, B=2, Start=8, Up=16, Right=128. The original game requires stable input on consecutive polls; one-frame button pulses often do not become a new press.

- Probe: neutral from reset; four-frame Start holds beginning at zero-based frames 600, 750, 900, 1050, 1200, 1350, 1500 and 1650. The configured Glass Joe opening starts around frame 1230. Native Mac/opponent idle states appear at frame 2104 (state byte `$81`, then `$01`).
- From that first idle: A held four frames starting five updates later produced Mac body-punch state 9, opponent reaction states 11/7, then idle again. Right held 12 frames starting 65 updates later produced Mac dodge state 3 and return to idle by frame 2207. The sampled HUD/clock and opponent positions advanced concurrently, and `opsMissed` remained zero. These are preliminary observations, not both-revision or browser acceptance.
- A later saved active state at frame 2255 was used for seeded experiments. Writing target opponent HP `$0398=0` alone did not establish a knockdown; an actual subsequent hit/transition is needed.
- Seeded opponent experiment: target HP `$0398=1`; clock `$0302=0`, `$0304=3`, `$0305=9`, fractional `$0306=90`, `$0307=0`; then four-frame Up+A pulses every 40 updates after update 30. Native knockdown flag 1 and opponent fight-KD counter 1 were observed around frame 2308. **The probe's `COUNT4` marker is invalid:** it used a naive `count >= $9D` comparison and falsely accepted `$E3`, which includes flags. Referee counting remains unverified and must be decoded correctly.
- Seeded Mac experiment: target HP `$0391=0`, then neutral. A subsequent native opponent hit produced knockdown flag 2/Mac fight-KD increment. The sampled referee byte stayed `$80` and eventually reached a loss phase. Counts/get-up behavior remain unresolved.
- Seeded round boundary: `$0302=2`, `$0304=5`, `$0305=9`, fractional `$0306=$7F`, `$0307=$FF`. Original engine entered Mac round-over state 66, advanced through round end/break and set round number 2 after about 208 updates. Resuming an active second round is still unverified.

These RAM-seeded cases are explicit experiments, separate from the reset/input-only sequence. They are not normal-play recordings or complete fight recovery. Before acceptance, reproduce on both revisions, compare current encoded art/layout and original-engine output, retain Audio, test stop/restore/stale-session behavior and record exact limits in the tutorial.

## Private local research, excluded from Git

In this workspace, `/workspace/scratch/8d515298c062/research/glass-joe-sequence/` contains `probe.cjs`, `probe2.cjs`, `resume.cjs`, `scenarios.cjs`, `scenarios2.cjs` and logs. It also contains private ROM-bearing emulator snapshots and rendered source frames. **Do not upload the `.bin`, `.ppm`, ROMs, decoded graphics or source-bearing projects.** Scripts/logs there are exploratory and include the bad referee-count predicate noted above. Recreate them from these recorded inputs if scratch is unavailable.

The untracked fixture temporary file `app/tests/fixtures/.shadowgate-predecessor.html.1qk7dp` was already present at task start and is left untouched/excluded. Resume with the known art lifecycle failure; preserve the last verified build and do not mark this WIP complete.
