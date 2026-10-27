# v0.17.1 — WORLD Live / Host Protocol Alignment

- Fixes v0.17 editor's accidental v0.12 protocol requirement (host API is protocol 13).
- Rejects older/incompatible hosts with an accurate message, and reports protocol 13 in the localhost test status.
- Guided setup now treats an incompatible responding host as NOT healthy.
- Full kit retained; host protocol/database/ROM unchanged. v0.17.1 adds `tests/test_v17_world_load_compatibility.py` (14/14 synthetic browser + host checks passed).
- Regression tests also passed: `test_v17_hosted_stabs.py`, `test_v10_pvp.py`, `test_v12_two_player_room_camera.py`, `test_shared_sideview.py`, `test_localhost_server.py`, `test_live_patch.py`, `test_progression_gameplay.py`, `test_wallet_crypto.py`.
- Full native original ROM recovery verification was not run because no Zelda II ROM was supplied. Historical `test_stage_frame_v07.py` has a stale shape assertion (expects 4 stage metadata fields; current host includes width/provenance), and `test_authenticity_guards.py` refers to a pre-existing unbundled guardrails JSON; neither was introduced by this fix. Other ROM-dependent tests are out of scope.

---

# v0.17 — Multiplayer Link Attack Translation (Experimental)

## Scope delivered

- Connected the **already recovered** original Zelda II upward stab / downward stab OAM pose selectors **8/9** to the localhost hosted player renderer. This explicitly reuses v0.13 `HostedPlayerPoses`; original-ROM bytes and art are not added to the ZIP.
- Exposed jumping, forward sword, upward stab and downward stab keyboard+button inputs in each wallet client. Side-view user action is validated and recorded by the server, and the action pose and jump offset are sent to all clients in the same authoritative state snapshots.
- Added a small **server-owned prototype** vertical player offset and hit test to make jump/downward stab demonstrations interactive. Upward stab can hit a player above, downward stab a player below, forward sword a player in front (test geometry; 8 test HP and no XP). Strict payload, cooldown, player-room and source-art checks. Action and jump states are short-lived; no player DB schema reset.
- Retained legacy `pvp_test_attack` and original single-room camera behavior. Updated existing WORLD Live setup guide, no changes to Forge native ROM compilation or project storage.

## Verification

- `test_v17_hosted_stabs.py`: **17/17** tests; source-pose precondition, invalid clients, both pose selectors, vertical and cross-room hit restrictions, cooldown, no XP, audit provenance.
- `test_v17_client_stabs.py`: **16/16** tests with actual uploaded Zelda II ROM; original 30-pose atlas, two independent player views, original source pixels, proof that source-selector changes alter rendered pixels, buttons and keyboard dispatch, no JS errors.
- `test_v10_pvp.py`: **10/10** old combat transport tests passed.
- `test_v12_two_player_room_camera.py`: **10/10** two-client room-camera tests passed.
- `test_shared_sideview.py`: **15/15** 20-wallet live-session and persistence checks passed.
- `forge-source/app/tools/bundle.py --check` passed deterministic source-HTML bundle verification.

## Explicit NON-parity

The source-derived DISPLAY poses are genuine ROM-derived OAM data, but **hosted jump physics, attack timing, sword collision, HP damage, shield deflection, terrain/platform collision and actual ability acquisition are not validated from original Zelda II code**. The newly added hit tests are opt-in to the hosted experimental player gameplay, do not award XP, and do not claim 1:1 equivalence. Original game-native up/down-stab animation timing and hitbox recovery remain future work.

No source ROM, credentials or hosted database distributed. No Git changes or public deployment.
