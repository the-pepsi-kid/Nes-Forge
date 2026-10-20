"""Publish measured review records only after every current-candidate gate passes."""
from pathlib import Path
import hashlib, json, subprocess, sys

folder = Path(__file__).resolve().parent
root = folder.parents[1]
read = lambda p: json.loads(p.read_text())
build = read(root / 'app/build-inputs.json')
html = root / 'app' / build['output']
digest = hashlib.sha256(html.read_bytes()).hexdigest()
assert digest == build['sha256']
gate_file = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else folder / 'standard-gate/Summary.json'
gate = read(gate_file)
assert gate['status'] == 'passed' and gate['sha256'] == digest
assert gate['suiteCount'] == 120 and gate['total'] == gate['passed'] == 2087
assert len(gate['suites']) == 120 and len({s['name'] for s in gate['suites']}) == 120
delta = read(root / 'app/tests/fixtures/stage-context-source-delta.json')
assert list(delta['retainedCounts']) == [s['name'] for s in gate['suites'][:118]]
assert sum(delta['retainedCounts'].values()) == 2061 and len(delta['protectedFiles']) == 318
for suite in gate['suites'][:118]:
    assert suite['passed'] == suite['total'] == delta['retainedCounts'][suite['name']]
assert gate['suites'][-2]['total'] == 24 and gate['suites'][-1]['total'] == 2

browser = read(folder / 'Browser_Verification.json')
native = read(folder / 'Native_Browser_Verification.json')
examples = read(folder / 'Example_Receipt_Verification.json')
governance = read(folder / 'Governance_Verification.json')
for report, count in [(browser, 28), (native, 6), (examples, 14)]:
    assert report['status'].lower() == 'pass' or report['status'] == 'passed'
    assert report['htmlSha256'] == digest and report['passed'] == count
assert examples['changedProjects'] == examples['changedRecipes'] == examples['changedRoms'] == 0
assert governance['status'] == 'passed' and governance['preservedDocuments'] == 11
source_commit = subprocess.check_output(['git', 'log', '-1', '--format=%H', '--', 'app'], cwd=root, text=True).strip()
subprocess.run(['git', 'diff', '--exit-code', source_commit, '--', 'app'], cwd=root, check=True)

mode = gate.get('executionMode', 'standard-candidate-gate')
result = {
    'format': 'NESForgeStageContextVerification', 'status': 'passed', 'candidate': 'stage-context-1',
    'version': '2.0.0-alpha.11', 'promoted': False,
    'parentCommit': delta['parentCommit'], 'sourceCommit': source_commit,
    'html': str(html.relative_to(root)), 'htmlSha256': digest,
    'automated': {'passed': gate['passed'], 'total': gate['total'], 'suites': gate['suiteCount'],
                  'executionMode': mode, 'runtime': gate['runtime'], 'retainedCases': 2061,
                  'retainedSuites': 118, 'newCases': 26,
                  'summary': str(gate_file.relative_to(root)),
                  'priorFailures': gate.get('priorFailures', [])},
    'browser': {'passed': browser['passed'] + native['passed'], 'authoredDesktopAndNarrow': 28,
                'actualNativeSourceWorkflow': 6, 'reports': ['Browser_Verification.json', 'Native_Browser_Verification.json']},
    'examples': {'wholeRomByteIdentical': 14, 'changedProjects': 0, 'changedRecipes': 0, 'changedRoms': 0,
                 'updatedHtmlIdentityReceipts': 6},
    'preservation': {'exactParentHtmlReconstructed': True, 'protectedPredecessorFiles': 318,
                     'priorDocumentsPreservedByteForByte': 11},
    'scope': ['Explicit source area/table membership and visible unresolved coverage',
              'Imported room/page selection, existing World/Scene selectors and exact World page viewport',
              'Canonical shared sprite-owner references with collision-free repeated imports',
              'Save/reopen, Undo/Redo, explicit matching-source return and byte-identical unedited native rebuild'],
    'limits': ['Native area/table context is not complete playable-stage topology, ordering or reachability',
               'Audio remains project-wide; scene/event-to-cue bindings remain unresolved',
               'Older room-only receipts retain existing navigation without guessed context migration',
               'Native encoders still cover only four supported Zelda II location fields',
               'No listening, native dialogs, physical device/controller, owner tutorial or hardware acceptance'],
}
(folder / 'Verification.json').write_text(json.dumps(result, indent=2) + '\n')
candidate = read(root / 'CANDIDATE.json')
assert candidate['htmlSha256'] == digest
candidate['sourceCommit'] = source_commit
candidate['verification'].update({'status': 'passed', 'passed': gate['passed'], 'total': gate['total'],
                                  'suiteCount': gate['suiteCount'], 'browserChecks': 34,
                                  'wholeRomByteIdenticalExamples': 14, 'executionMode': mode})
(root / 'CANDIDATE.json').write_text(json.dumps(candidate, indent=2) + '\n')
(folder / 'README.md').write_text(f'''# Shared Stage context — stage-context-1

The Scene resources navigator now connects explicit native source area/table membership to imported rooms, canonical pages, exact World segments and shared sprite owners. Existing World and Scene selectors participate. Repeated imports preserve separate canonical references; missing rooms, unavailable native slots and conflicting receipts stay visible. Source inspection remains read-only, with an explicit return to an existing matching imported room.

Candidate: **2.0.0-alpha.11 / stage-context-1**, unpromoted. Source implementation `{source_commit}`; parent `{delta['parentCommit']}`. Current app SHA-256: `{digest}`.

Validation:

- **{gate['passed']}/{gate['total']} cases across {gate['suiteCount']} mandatory suites**, including every one of the 2,061 predecessor cases. Mode: `{mode}`, {gate['runtime']['workers']} worker(s). See [the complete gate](./{gate_file.parent.name}/Summary.json) for exact provenance and any prior failed attempts.
- **34 actual Chromium browser checks**: 28 authored-catalog checks at desktop/narrow widths, plus six supplied-source checks including byte-identical native rebuilding after navigation and reopening. [Browser](Browser_Verification.json) · [native](Native_Browser_Verification.json).
- **14 unchanged saved projects rebuild to byte-identical complete ROMs**. Only six current HTML identity receipts changed. [Example evidence](Example_Receipt_Verification.json).
- The outer source delta reconstructs the complete published parent HTML and all **318** protected predecessor files. Eleven prior primary documents are retained byte-for-byte. [Governance evidence](Governance_Verification.json).

[Measured summary](Verification.json) · [current status](../../app/CURRENT_STATUS.md) · [navigator guide](../../app/docs/SCENE_CONTEXT.md) · [source delta](../../app/tests/fixtures/stage-context-source-delta.json).

Native area/table contexts do not establish stage order, reachability or complete routes. Audio is still project-wide; native art/Audio/behavior encoders and scene/event cue bindings remain future work. Older receipts retain room navigation without guessed membership. Schema 12/13, five gameplay templates, 12 actors, 64 persistent bytes and existing CPU/APU/PPU/encoder behavior remain in force. No listening, native dialogs, physical devices/controllers, owner tutorial or hardware acceptance is claimed.

The `initial-checks` folder retains preliminary browser/example results with their original HTML hashes; they are not counted as current-candidate passes. The prior documented tester kit remains under `tester-kit/context-cleanup-1`. No original ROM or source-bearing project is included here.
''')
print(json.dumps({'status': 'passed', 'htmlSha256': digest, 'automatedCases': gate['passed'], 'mandatorySuites': 120, 'browserChecks': 34, 'identicalExampleRoms': 14}))
