"""Record measured outcomes only after complete, unchanged mandatory coverage."""
from pathlib import Path
import hashlib, json, subprocess

root = Path(__file__).resolve().parents[2]
review = Path(__file__).resolve().parent
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
app = root / 'app/mainline/NES_Forge_2.0.0-alpha.11.html'
digest = sha(app)
summary = read(review / 'full-gate/Summary.json')
assert summary['status'] == 'passed'
assert summary['sha256'] == digest and summary['unchangedCandidate']
assert summary['suiteCount'] == 118 and summary['passed'] == summary['total'] == 2061
assert summary['executionMode'] == 'durable-bounded-workers'
for item in summary['provenance']:
    assert sha(root / 'app' / item['path']) == item['sha256'], item['path']
for item in summary['suites']:
    assert item['passed'] == item['total'] > 0 and item['failed'] == 0
    assert sha(root / 'app' / item['script']) == item['scriptSha256']
    assert sha(root / 'app' / item['report']) == item['reportSha256']
    report = read(root / 'app' / item['report'])
    cases = report.get('results', report.get('tests'))
    assert len(cases) == item['total'] and all(c.get('passed') is True for c in cases)

browser = []
for name in ['Browser_Verification.json', 'Native_Context_Verification.json', 'Kit_Browser_Verification.json']:
    data = read(review / name)
    assert data['status'] == 'PASS' and data['appSha256'] == digest
    assert data['passed'] == len(data['checks']) > 0
    assert all(c.get('passed') is True or c.get('result') == 'PASS' for c in data['checks'])
    browser.append({'report': name, 'passed': data['passed'], 'sha256': sha(review / name)})
assert sum(d['passed'] for d in browser) == 28
governance = read(review / 'Governance_Verification.json')
assert governance['status'] == 'PASS' and governance['passed'] == 10
examples = read(review / 'Example_Receipt_Verification.json')
assert examples['status'] == 'passed' and examples['htmlSha256'] == digest
assert examples['passed'] == 14 and examples['changedProjects'] == examples['changedRecipes'] == examples['changedRoms'] == 0
orchestration = read(review / 'Gate_Orchestration_Verification.json')
assert orchestration['status'] == 'passed' and len(orchestration['checks']) == 4

verification = {
    'format': 'NESForgeContextCleanupVerification', 'status': 'PASS',
    'candidate': 'context-cleanup-1', 'appSha256': digest,
    'sourceParentCommit': '697a998e744c7794fae5d1063748e8d83d5ffe57',
    'sourceImplementationCommit': 'ce7548d2f06c31b56b539979003e86b78eabfb5d',
    'automated': {'mode': summary['executionMode'], 'passed': summary['passed'], 'total': summary['total'],
                  'suiteCount': summary['suiteCount'], 'retainedCases': 2046, 'retainedSuites': 116,
                  'newCases': 15, 'newSuites': 2, 'freshStandardSuitesRevalidated': summary['recoveredMeasuredSuites'],
                  'priorFailures': summary['priorFailures'], 'executionRuns': summary['executionRuns'],
                  'summary': 'full-gate/Summary.json', 'summarySha256': sha(review / 'full-gate/Summary.json'),
                  'scope': 'Every mandatory case is measured on unchanged final inputs. Not an uninterrupted standard-runner pass; recorded VM deadline failures and unchanged isolated retries are retained.'},
    'browser': {'passed': 28, 'reports': browser, 'parentKitChecksSeparate': 8},
    'governanceHistoriesPreserved': 10, 'unchangedSavedExampleRoms': 14,
    'supervisorIntegrityChecks': 4,
    'sourceBundle': 'Source_Bundle_Verification.json',
    'publication': {'status': 'pending-owner-approval', 'branch': 'implementation/context-cleanup-2026-10-20',
                    'reason': 'Automatic approval review rejected the GitHub push because this turn did not explicitly authorize publication.'},
    'remaining': ['Full source Stage/Scene context and complete shared-asset dependency editing',
                  'Scene/event-to-music/SFX bindings and additional native encoders',
                  'Windows/native dialogs, physical phones/controllers, listening, hardware and owner acceptance'],
    'scope': 'Bounded canonical resource navigation and documentation cleanup; ordinary schema 12 and native schema 13 retain their prior meanings. No release promotion.'}
(review / 'Verification.json').write_text(json.dumps(verification, indent=2) + '\n')
candidate = read(root / 'CANDIDATE.json')
candidate['status'] = 'review-candidate'
candidate['htmlSha256'] = digest
candidate['sourceImplementationCommit'] = verification['sourceImplementationCommit']
candidate['automatedResult'] = {**verification['automated'], 'status': 'passed', 'summary': 'reviews/context-cleanup-1/full-gate/Summary.json'}
candidate['browserEvidence'] = [{'report': 'reviews/context-cleanup-1/' + r['report'], 'passed': r['passed'], 'htmlSha256': digest} for r in browser]
candidate['sourceBundle'] = 'Included in the documented kit under Developer; source restoration measured separately.'
(root / 'CANDIDATE.json').write_text(json.dumps(candidate, indent=2) + '\n')
print(json.dumps({'status': 'PASS', 'passed': summary['passed'], 'suites': summary['suiteCount'], 'browserChecks': 28, 'appSha256': digest}))
