# NES Forge — Movement Rules review candidate

2.0.0-alpha.11 / movement-rules-1, schema 12. Open app/mainline/NES_Forge_2.0.0-alpha.11.html and follow app/docs/MOVEMENT_RULES.md plus app/docs/MOVEMENT_RULES_CHECKLIST.txt. SCENE → Movement rules varies the current project's existing generated movement settings through presets, intensity, seed and four field locks, with exact preview, guarded Apply/Undo and source-bound recipe replay.

The current candidate passed **1,504/1,504 checks across 68 suites**, retaining all **65 alpha.10 suites / 1,430 cases**, from a fresh extraction with 3,716 staging payload checksums verified. CANDIDATE.json, candidate Summary and clean-extraction proof record the exact identities and interval. Ten current-hash browser runners are blocked with zero checks because Chromium is unavailable; listening, mobile performance, controller and hardware acceptance remain unverified.

Only active generated World or generated single-room move/jump/gravity/fall values can change; existing runtime emitters, inactive configuration, all other project fields and mashup-v1 behavior remain preserved. Viewer/custom-ASM projects are refused. This does not add friction, knockback, death/timer rules or new raw-ROM recovery. Valid compilation does not guarantee level solvability.

**Known recipe compatibility boundary:** alpha.10 mashup recipes are refused by the alpha.11 UI because ordinary opening changes foundation metadata and therefore the canonical base hash. Replay with the included alpha.10 application and original sources, save the resulting project, then open that result in alpha.11. Already-saved result projects open normally. The raw v1 algorithm remains reproducible; this is not cross-release UI recipe compatibility. Add explicit recipe migration before a later release bump.

Next address explicit cross-release recipe migration before a further release bump, then resume A1 shared native-background recovery/import, then suitable A2 native map/collision work, additional Audio/migration/gameplay/runtime dependencies and later integrated Hosted/networking/wallet/deck requirements. The complete roadmap and comprehensive manual/PDF update remain unfinished. No promotion or publication is recorded; license UNDECIDED.

CANDIDATE.json records current evidence. REFERENCE.json retains the frozen older reference. Run python3 tools/verify_reference.py for exact delivered-app verification; --full-gate reproduces in a disposable copy. tools/package_source.py preserves the committed tree and portable Git history.

## Preserved alpha.10 source-handoff summary

---

# NES Forge — Seeded Mashup review candidate

2.0.0-alpha.10 / seeded-mashup-1, schema 12. Open app/mainline/NES_Forge_2.0.0-alpha.10.html and follow app/docs/SEEDED_MASHUP.md plus app/docs/SEEDED_MASHUP_CHECKLIST.txt. SCENE → Seeded mashup combines compatible canonical assets from the current project and Forge project JSON donors using a reproducible seed. Preview, locks, explicit application, project Undo and recipe/candidate downloads make the result reviewable and editable.

The current candidate passed **1,430/1,430 checks across 65 suites**, preserving all **61 alpha.9 suites / 1,330 cases**, from a fresh extraction with all 3,191 staging payload checksums verified. CANDIDATE.json, candidate Summary and clean-extraction proof record the exact identities and interval. Nine current-hash browser runners are blocked with zero checks because Chromium is unavailable; listening, mobile performance, controller and hardware acceptance remain unverified.

The owner specifically requested mashup implementation at this point. This bounded canonical authoring checkpoint precedes the next A1 native-recovery item. It preserves the target project's scenes, World and collision structure; it does not decode new raw ROM formats or combine arbitrary games' original code. The complete roadmap remains unfinished. Next work remains cross-engine native graphics/maps/collision, further supported Audio and source-migration/gameplay dependencies before integrated Hosted Worlds, wallets and physical decks. The full manual/PDF is not comprehensively current; the supplied guides are supplements. No promotion or publication is recorded.

CANDIDATE.json records the current deliverable and measured evidence. REFERENCE.json retains the frozen older reference. Run python3 tools/verify_reference.py to verify the exact delivered app; --full-gate makes a disposable reproduction. tools/package_source.py archives the committed tree and portable Git history. Prior branches and frozen references remain preserved; license UNDECIDED.
