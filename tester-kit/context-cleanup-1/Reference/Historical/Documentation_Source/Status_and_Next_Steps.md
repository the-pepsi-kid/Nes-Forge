# NES Forge 1.9.0 Alpha - current status and next steps

**Review-kit edition: September 30, 2026. Application: `mobile-play-1`.**

NES Forge is ready for a small, guided alpha review. The create/build/play foundation is substantial enough for other people to use, but mobile performance and real-device compatibility still need measured closeout. The useful next milestone is a repeatable first-user experience: create a small game, play it, save it, reopen it, and explain any remaining limits accurately.

## What we know now

| Area | Current evidence | What it does not establish |
| --- | --- | --- |
| Application regression coverage | The unchanged supplied HTML passed 702/702 automated cases across 28 suites on September 28. | A general usability pass, real-browser rendering, physical controllers or console hardware. |
| Mobile touch controls | On September 30 the owner reported that touch controls work on mobile. | A pass for every button combination, interruption, browser, orientation or device. Device/browser/ROM details were not supplied. |
| Mobile audio/video performance | The owner reported lag in the emulator. This is an open issue. | A reproduced defect, measured FPS/audio latency, a proven root cause or a completed fix. |
| Physical controllers | The owner says hardware has not been tested. Wired/USB-C and Bluetooth controller combinations remain untested. | Pairing or a visible controller listing does not prove game input works. |
| Physical NES console | Independent console timing/compatibility remains unverified. | Controller testing and physical NES-console testing are separate activities. |
| Browser automation | The September 28 browser attempt was blocked by a missing browser executable; zero browser checks ran. | The successful VM/ROM suite must not be described as a browser pass. |
| Application acceptance | Alpha candidate available; owner acceptance/promotion remains pending. | The alpha label is a maturity description, not a release approval. |

## What is in this kit

- `NES_Forge.html`: the exact mobile-play-1 application, unchanged.
- `Tutorial.html` and `Tutorial.pdf`: a guided first session from a blank project to a playable World.
- `Manual.html` and `Manual.pdf`: the expanded workshop, Gameplay Core/Audio chapters and full control reference.
- `Reference/Operator_Reference.html` and `.pdf`: the control reference on its own; `Reference/Control_Index.csv` is its searchable table.
- `Reference/Reviewer_Checklist.html`: a repeatable review procedure and issue-report form.
- `Reference/Mobile_Performance_Triage.html`: observations, bounded comparisons and profiling hypotheses for the lag report.
- `Evidence/`: app test summary, browser block record, preservation/checkpoint information and this kit's document verification record.
- `Developer/NES_Forge_1.9.0_Alpha_Mobile_Play_Candidate.zip`: the original source/review package, preserved unchanged. Its September 28 documents are a historical snapshot; this kit records the later owner observations.

The HTML and PDF manuals describe the same application. The workshop is performed in normal NES Forge; it is not a separate app or an in-editor wizard. Begin with the shorter tutorial, then use the full manual as the reference beside it.

## Recommended order of work

1. **Complete the owner's blank-project tutorial.** Author on a desktop browser for the first pass. Record the exact step where a label, coordinate, expected result or save action is confusing. Save native project checkpoints as instructed. Test the resulting ROM on the phone afterwards.
2. **Run a small guided review.** Give reviewers this exact kit, a clear first task and the report form. Ask them to record observations before receiving help. Keep first-run usability, generated-game correctness, mobile performance and controller compatibility as separate findings.
3. **Reproduce and profile mobile lag.** Record device, OS, browser, delivery method and ROM first. Compare the corrected reference and current candidate on the same device/ROM, then compare inline and expanded play. A muted emulator still processes audio; muting alone is not an audio-cost measurement. See the triage guide for the bounded test matrix.
4. **Test physical controllers.** Record actual controller/adapter, connection type, OS and browser. Verify all eight NES actions, remapping, simultaneous input, disconnect/reconnect and safe release after interruption.
5. **Fix only reproduced issues within a bounded stabilization pass.** Preserve the executable reference and the emulator/compiler/capture/save contracts. Rerun affected regressions and the required complete gate for any changed application candidate, then repeat the relevant device checks.
6. **Review acceptance before feature expansion.** Resume 1.9.1 Gameplay Expansion only after separate owner authorization. A visual behavior graph, reverse engineering, LiveLink and hosted/networked work remain later scope.

## Open review items

| ID | Item | Priority / status | Closure evidence |
| --- | --- | --- | --- |
| MP-01 | Mobile audio/video lag | High; owner-reported, open | Repeatable device/ROM case, measurements or trace, bounded correction if needed, same-case retest. |
| MP-02 | Physical controller compatibility | High; untested | Recorded wired and Bluetooth combinations with input/remapping/interruption results. |
| UX-01 | First blank-project tutorial | High; awaiting owner/reviewer walkthrough | A reviewer reaches Build & Run, saves and reopens their own project without undocumented help. |
| BR-01 | Real-browser closeout | Pending | Browser/device results for layout, file dialogs, audio, capture and lifecycle, tied to the exact candidate. |
| REL-01 | Owner acceptance | Pending | Explicit acceptance of the candidate, evidence and remaining limitations. |

No application fix is included in this documentation package. In particular, the reported mobile lag has not been corrected or assigned a proven cause.

## How to describe the project to reviewers

NES Forge is a functional alpha for visually creating real NES games, with an integrated ROM builder and emulator. Touch play has a positive owner observation. Mobile performance and physical-controller compatibility remain under review. Feedback should help make the existing workflow reliable and understandable before the next feature milestone.
