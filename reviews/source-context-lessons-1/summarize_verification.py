"""Bind the final editor workflow evidence to the tested standalone outputs."""
from pathlib import Path
import json
import hashlib

root = Path(__file__).resolve().parents[2]
here = Path(__file__).resolve().parent
load = lambda name: json.loads((here / name).read_text())
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
native = sha(root / 'nes-forge.html')
hosted = sha(root / 'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html')
run = load('Run_Status.json')
assert run['status'] == 'passed' and all(item['passed'] for item in run['results'])
assert run['htmlHashes'] == {str(root / 'nes-forge.html'): native,
    str(root / 'experiments/hosted-worlds/v17.1/NES_Forge_3x_v17_Hosted_Link_Actions_Experimental.html'): hosted}
results = {}
for name, count, label in [
    ('Workflow_DOM.json', 40, 'sourceContextLessonsDom'),
    ('Workflow_Browser.json', 42, 'sourceContextLessonsBrowser'),
    ('Preview_DOM_Verification.json', 29, 'previewDiagnosticsDom'),
    ('Preview_Browser_Verification.json', 32, 'previewDiagnosticsBrowser'),
    ('Resume_DOM_Verification.json', 22, 'resumeDom'),
    ('Connected_Workflow_DOM.json', 20, 'connectedResourceDom'),
    ('Capabilities_DOM_Verification.json', 12, 'capabilityLifecycleDom'),
]:
    report = load(name)
    assert report['status'] == 'passed' and report['htmlSha256'] == native, name
    assert len(report['checks']) == count and all(item['passed'] for item in report['checks']), name
    assert not report.get('errors') and not report.get('externalRequests'), name
    results[label] = {'passed': count, 'total': count}
report = load('Resume_Browser_Verification.json')
assert report['status'] == 'passed' and report['htmlSha256'] == native
assert sum(len(item['checks']) for item in report['results']) == 36
assert all(all(item['checks'].values()) and not item['errors'] for item in report['results'])
results['resumeBrowser'] = {'passed': 36, 'total': 36}
for label, identity, directory in [('Native', native, 'gate'), ('Hosted', hosted, 'gate-hosted')]:
    report = load('Startup_' + label + '.json')
    assert report['status'] == 'passed' and report['htmlSha256'] == identity and report['passed'] == 10
    results['startup' + label] = {'passed': 10, 'total': 10}
    report = load(directory + '/Summary.json')
    assert report['status'] == 'passed' and report['htmlSha256'] == identity
    assert report['passed'] == report['total'] == 104 and len(report['suites']) == 9
    assert all(item['status'] == 'passed' and item['passed'] == item['total'] for item in report['suites'])
    results['public' + label] = {'passed': 104, 'total': 104, 'suites': 9}
report = load('Hosted_Acceptance.json')
assert report['passed_suites'] == report['total_suites'] == 12 and all(item['ok'] for item in report['results'])
assert report['passed_boolean_checks'] == report['total_boolean_checks'] == 138
results['hostedAcceptance'] = {'passed': 138, 'total': 138, 'suites': 12}
candidate = json.loads((root / 'CANDIDATE.json').read_text())
assert candidate['htmlSha256'] == native and candidate['hostedHtmlSha256'] == hosted
assert candidate['verification']['sourceContextLessonsDomChecks'] == 40
assert candidate['verification']['sourceContextLessonsBrowserChecks'] == 42
assert candidate['verification']['hostedAcceptanceChecks'] == 138
source = load('Source_Convergence.json')
assert source['status'] == 'passed' and source['nativeHtmlSha256'] == native and source['hostedHtmlSha256'] == hosted
concurrent = load('Concurrent_Integration.json')
assert concurrent['status'] == 'passed' and concurrent['runtimeAndExistingRegressionCommandsUnchanged']
assert concurrent['integratedParent'] == candidate['sourceParent'] == source['baseCommit']
assert all(item['preserved'] and sha(root / item['path']) == item['sha256'] for item in concurrent['onlyIncomingChanges'])
assert source['nativeInputs'] == 194 and source['hostedInputs'] == 205
assert source['hostedGameplayAndDesignWorkUnchanged'] and source['hostedExtensionsUnchanged']
report = load('Documentation_Verification.json')
assert report['status'] == 'passed' and report['htmlSha256'] == native and report['inAppChaptersIncludingExercise'] == 16
for item in report['files']:
    assert sha(root / 'app/docs' / item['file']) == item['sha256']
summary = {
    'status': 'passed', 'nativeHtmlSha256': native, 'hostedHtmlSha256': hosted,
    'checks': results, 'sourceConvergence': 'Source_Convergence.json',
    'documentation': 'Documentation_Verification.json', 'concurrentIntegration': 'Concurrent_Integration.json',
    'scope': 'Forge app source roles, visible stale-session invalidation, explicit Audio source routes and contextual offline lessons. Existing canonical owners, native behavior/codecs and multiplayer gameplay retained.',
    'limits': [
        'DOM canvas/layout/timers are stubbed; actual Chromium controls, native file intake and 390px layout are checked separately.',
        'The new workflow browser probe uses real file inputs and import/open controls. Retained older browser suites keep their documented factory-input limits.',
        'Source identity labels and reading lessons grant no build/write capability; native guards and bounded writers retain ownership.',
        'No new Punch-Out native behavior or writer. Knockdown, referee-count and round-transition recovery remains next.',
        'No full-fight, listening/controller/hardware, independent emulator, exhaustive native-use or public hosting acceptance. The historical full gate remains unavailable.',
    ],
}
(here / 'Verification_Summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
