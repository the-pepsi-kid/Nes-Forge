# NES Forge development integration board — 2026-11-18

| Workstream | Evidence / status | Next acceptance |
|---|---|---|
| Canonical editor | Integrated Review 5 public build, 219 modular inputs; editor unchanged by this update | Repeat existing suite on any changed editor output |
| Agent Lab v0.3 | Read-only scripts, independent bank hashes, unified per-ROM inventory, existing GameRENative catalog | Public-editor real-ROM smoke run, Windows path verification |
| Ninja Gaiden source index | User-local original revision matched 48 contexts, 202 poses, 83 timed scripts in investigated catalog | Match a selected room to original pixels and map editable schema |
| Audio | Existing native audio profiles can be tested optionally | Capture full timing, song boundaries and independent audio parity |
| Collision & physics | Role defined, no automated recovery gate | Native terrain/contact trace and validated hitboxes |
| Enemy AI / behavior | Role defined, no automated recovery gate | Repeatable state transition and trigger evidence |
| Native writeback | No verified Ninja Gaiden writer | Edit one source-bound resource, rebuild original ROM, demonstrate parity outside changed range |
| Crypto cartridges | Research proposal only; no deployed contracts | Original asset bytes on EVM testnet and SHA-256 readback |

**Change management:** develop on a branch, keep private ROM/captures off GitHub, verify build/test receipts, and require explicit owner review before production promotion. Separate planning documentation from implemented or tested features. Preserve `CANDIDATE.json` and current release artifacts until a new accepted editor build exists.
