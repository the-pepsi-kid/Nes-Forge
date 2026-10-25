# Retro Workstation adoption and Punch-Out native workflows

The owner resumed the paused work and supplied Retro Workstation v0.5 for adoption. This checkpoint ports the supplied UI into authoritative modular source and completes the bounded native artwork and Glass Joe experiments below. It does not promote a release or claim complete game recovery. No new public Git push is authorized by this turn.

## Current application

`app/mainline/NES_Forge_2.0.0-alpha.11.html`, also delivered as `NES_Forge_Retro_Punch_Out_Native_Workflows.html`.

SHA-256: `cf5825b600fc8f8c028e9df0def70cc1cac483408ad49b8327715b02a4598e08`.

The prior paused checkpoint remains local `9263dd5`, public `cf92b17536a49fa26d0caddb615a600ec1a98a83` on `review/punch-out-workflow-wip-2026-10-24`. The historical pause file remains a record of that earlier state; this handoff supersedes its unfinished-work status for the specific items verified here.

## Adopted UI, with existing owners retained

Five new source inputs under `app/src/ui/` port the supplied Resources explorer, Connected Workspace, guarded metasprite context, scoped Retro Workstation styling and appearance controls. The exact supplied appearance script/CSS are retained. The original opt-in/off fallback, Compact/Comfortable choices and local appearance preferences remain outside project serialization.

Three existing source modules receive the exact supplied code ports: the optional metasprite context refresh, Area Library native-overworld/matching-source route and native World scope/error guidance. The supplied v0.4.1 base can be mechanically reproduced from the provided v0.5 by subtracting the skin. This is source adoption, not replacement of the application with an older generated HTML.

`Source_Preservation.json` records all 174 predecessor manifest inputs: 170 byte-identical, original order retained, four changed and seven additions. The fourth change is the native artwork factory correction. The previously paused native identity/field-mask seams remain present and now have lifecycle, compatibility and retained regression evidence.

## Native artwork

The original post-selection signature failure came from the dedicated art Scene's `tileProps` being null until selection installed the ordinary zero array. The factory now initializes the same canonical zero array before signing. No signature check was loosened and no unsupported change was re-signed.

Recovered content → Native artwork · CHR banks and fight palettes opens dedicated ordinary Scene views for physical 4 KiB CHR banks and native fight-palette tables. Only explicitly supported fields/spans are written. Color edits preserve native upper flag bits; universal color aliases must agree. Existing reference copies remain source snapshots, while new fight previews and native playback use current encoded output.

Both source revisions cover all 32 CHR banks and 14 palette tables in roundtrip checks, UI/lifecycle, unchanged output, pixel/color changes, Undo/Redo, save/reopen, derivative recognition/reimport, native arena composition and 84 Audio entries. The exported-art playback report separately executes reimported output through the actual original opening/sequence, checks live PPU pattern data and palette color and compares frame hashes. These are representative edits, not certification of all possible artwork or all gameplay contexts.

## Glass Joe replay and experiments

`services/punch-out-replay.js` uses EmulatorBridge and the existing EmulatorTimeline. `re/punch-out-replay-ui.js` adds explicit controls in the emulator plus a Recovered content shortcut. It does not create another CPU, state store or native writer, and does not enable MMC2 runtime Scene capture.

- Reset/input-only opening, body punch, right dodge and return to stance.
- Explicitly seeded opponent knockdown, referee counts 1–4 and native get-up.
- Explicitly seeded Mac knockdown, counts 1–10 and native count-out/loss phase.
- Explicitly seeded 2:59 round boundary, native break/continuation and an active second round.

Both PRG0 and PRG1 complete all four cases. The real native opponent, HUD, scroll/banks, PPU and APU execute concurrently. The source count selector is `$C1`; `$C2` is the referee's X coordinate in this context. The old exploratory probe's coordinate/count confusion is corrected. Evidence records the exact RAM interventions; they are not passed off as normal-play input recordings.

Stop/session-change guards, invalid recipe/options rejection, physical checkpoint restoration and unchanged project serialization are checked. Named checkpoints remain owned by Timeline. The API supports source-guarded reuse of the ready checkpoint for repeat experiments; the default UI Run loads the current build from reset. Evidence records whether a ready checkpoint was reused.

## Evidence and reproduction

- `Workstation_Verification.json`: actual headless UI/service routes, appearance/project separation, all relevant tabs, Resources/Connected Workspace and blocked preference storage. Starter output retains the supplied 24,592-byte SHA-256.
- `Z2_Route_Verification.json`: exact supplied US source, unchanged native World output, Connected Workspace/Area Library routes and terrain-edit save/reopen. This is a fresh service/transaction check, not a new real-mouse/browser-layout check.
- `Art_Verification.json`, `Art_Playback_Verification.json`, `Compatibility_Verification.json`: dedicated writer lifecycle, exported/reimported native execution, palette flag preservation and previous-reader safe build refusal.
- `Replay_Verification.json`, `Replay_Guards.json`: both revisions' four bounded cases, restoration, original source preservation, APU activity and cancellation/session guards.
- `gate/Summary.json`: the available retained 104/104 public checks plus the synthetic tutorial exercise. The missing historical full release gate remains unclaimed.

```bash
python3 app/tools/bundle.py --check
node reviews/punch-out-native-workflows-1/verify_workstation.cjs
node reviews/punch-out-native-workflows-1/verify_art.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_replay.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_art_playback.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_replay_guards.cjs /path/to/private-roms
node reviews/punch-out-native-workflows-1/verify_z2_routes.cjs /path/to/Zelda-II-US.nes
node reviews/punch-out-native-workflows-1/verify_compat.cjs /path/to/private-roms /path/to/previous-verified.html
python3 reviews/punch-out-native-workflows-1/run_checks.py
```

The public artifact includes source, tutorial and evidence, not ROMs, source-bearing saved projects, private emulator snapshots or game frames. Private inputs must be supplied locally for the corresponding checks. Earlier dated reports continue to certify their recorded hashes only.

## Remaining limits and next decisions

The newly integrated HTML has no fresh browser layout/mobile/controller/listening or external-emulator/hardware acceptance in this environment. The supplied v0.5 browser results remain evidence for that supplied file. Source preservation and current headless semantics are recorded separately. MMC2 CPU/PPU timing remains approximate.

These source-specific native art writers do not add native OAM/pose/animation/AI/collision/Audio writers, a whole-game authored conversion or complete fight coverage. Broader titles, unknown revisions and missing native domains remain separate work. Continue updating each title's tutorial with its actual method and retain the compact retro workstation and all advanced controls.
