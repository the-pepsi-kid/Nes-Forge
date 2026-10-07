# NES Forge — Audio adaptive editing review candidate

2.0.0-alpha.5 / audio-adaptive-1, schema 12. Direct phone tracker keyboard entry is preserved from alpha.4; touch/pen paints existing envelopes and Audio panels adapt around viewport changes. The added device-width viewport declaration activates existing narrow layouts across tabs and requires device review.

Open app/mainline/NES_Forge_2.0.0-alpha.5.html and follow app/docs/AUDIO_ADAPTIVE_CHECKLIST.txt. The app tree exactly matches the delivered candidate ZIP. Fresh verified extraction: 990/990 cases across 45 suites, including all 964 predecessor cases. Browser reports and physical-device acceptance remain separate. No promotion or publication.

Current roadmap and plan are under planning/. Five predecessor branches plus this candidate branch and the annotated reference/re-runtime-1 tag are preserved. REFERENCE.json describes the frozen older main branch; CANDIDATE.json identifies this branch's current app. Run python3 tools/verify_reference.py to verify the current delivered tree; --full-gate runs tests in a disposable copy. License remains UNDECIDED.
