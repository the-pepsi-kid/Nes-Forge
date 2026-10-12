# Native SFX recovery contract — D066

This is the bounded A3 continuation after `native-map-1` at commit `5de81d48e67a0f076ce067fbf8ca3f1c3a89baf3`. Full roadmap implementation remains authorized one bounded slice at a time, with framework compatibility preserved.

The existing FamiTone2 structural profile and independently reproduced HonkeyPong input already identify native sound-effect records. Effects 0 and 1 each use one pulse channel for 12 audible frames; effect 2 uses multiple channels. These are test observations, not recognition keys.

The pure converter accepts only one fully known pulse channel, proven timer/control state, NTSC frame timing and a finite stream fitting one canonical pattern plus a terminal cut. It records native source ranges, command order, frame states and timer mappings. The final native EOF frame still mixes the retained buffer and must remain audible; canonical termination occurs on the following row. Other channels, unsupported controls, missing required state and excessive duration are explicit refusals.

Canonical output uses existing patterns, instruments and SFX definitions. Timer mapping uses existing Forge pitches, with quantization reported. Original pulse phase, per-stream volume arbitration, simultaneous effects and native gameplay calls are not reproduced. No changes to the Audio emitter, synthesis or project schema are authorized by this finite adaptation.

`REMethods` retains one native Audio profile and adds an explicit SFX resource selection to its existing conversion operation. Music conversion remains the default and its prior supported output stays exact. `RENativeAudioImport` owns shared stage/revalidation; `ProjectStore.applyAudioImport` owns mutation, stale guards, rollback and one Undo. Music retains its established finite-score order/tempo behavior. SFX imports append resources only, require the project already use tempo150/speed1, and preserve existing assets, music order, tempo/speed, settings and event bindings. Preview is detached; confirmation belongs to the UI.

Acceptance requires independent original/generated CPU/APU comparisons through the final frame and release, structurally valid data edits, canonical edits, Save As/reopen/rebuild, music interruption/resumption according to the existing Forge contract, retained music parity and failure/stale/cancel isolation. Preserve all 1,694 cases across 84 parent suites and append five new suites. Freeze source/docs/examples before a clean-extraction gate; current hashes and browser reports must bind to the delivered candidate.

The separate Scout examples deliberately choose compatible timing and bind B/attack after import. They are authored demonstrations, not reconstructed HonkeyPong gameplay. Listening, real browser, independent-emulator, device/controller and hardware acceptance remain separate. Candidate completion does not promote the release or complete the entire roadmap.
