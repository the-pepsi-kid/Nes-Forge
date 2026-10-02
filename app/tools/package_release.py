"""Package the reproducibly bundled and clean-tested 1.9.0 integrated read-only runtime-investigation alpha candidate."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path)
parser.add_argument('--stage', action='store_true', help='Create an unmeasured input archive for clean-extraction testing; requires an explicit staging output name.')
args = parser.parse_args()
if args.stage:
    assert args.output and 'staging' in args.output.name.lower(), 'Staging requires an explicit staging archive name'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run(['python3', str(root/'tools/bundle.py'), '--check'], cwd=root, check=True)
manifest = json.loads((root/'source-manifest.json').read_text())
html = root/manifest['output']
summary = None
browser = None
if not args.stage:
    summary = json.loads((root/'test-results/candidate/Summary.json').read_text())
    assert summary['status'] == 'passed' and summary['failed'] == 0
    assert summary['release'] == '1.9.0'
    assert summary['passed'] == summary['total'] and summary['suiteCount'] == 41
    mobile_names = {'emulator-input-mobile', 'emulator-play-ui-mobile'}
    re_names = {'re-bridge-model', 're-bridge-ui', 're-bridge-runtime', 're-report-import'}
    navigation_names = {'emulator-timeline', 'emulator-timeline-ui', 'emulator-timeline-runtime'}
    analysis_names = {'re-analysis-model', 're-analysis-ui', 're-analysis-integration'}
    runtime_names = {'re-runtime', 're-runtime-ui', 're-runtime-integration'}
    retained = [suite for suite in summary['suites'] if suite['name'] not in mobile_names | re_names | navigation_names | analysis_names | runtime_names]
    assert len(retained) == 26 and sum(suite['total'] for suite in retained) == 658, 'Retained regression floor changed'
    mobile = [suite for suite in summary['suites'] if suite['name'] in mobile_names]
    assert {suite['name'] for suite in mobile} == mobile_names and all(suite['total'] > 0 for suite in mobile), 'Mobile suites missing'
    assert digest(html) == summary['sha256'], 'HTML differs from the tested candidate'
    for item in summary['provenance']:
        assert digest(root/item['path']) == item['sha256'], 'Changed test input: '+item['path']
    for suite in summary['suites']:
        assert suite['passed'] == suite['total'] and suite['failed'] == 0
        assert digest(root/suite['report']) == suite['reportSha256'], 'Changed measured report'
    assert sum(suite['total'] for suite in summary['suites'] if suite['name'] not in re_names | navigation_names | analysis_names | runtime_names) == 708, 'Retained mobile-play-2 regression floor changed'
    re_suites = [suite for suite in summary['suites'] if suite['name'] in re_names]
    assert {suite['name'] for suite in re_suites} == re_names and all(suite['total'] > 0 for suite in re_suites), 'RE suites missing'
    navigation_suites = [suite for suite in summary['suites'] if suite['name'] in navigation_names]
    assert {suite['name'] for suite in navigation_suites} == navigation_names and all(suite['total'] > 0 for suite in navigation_suites), 'Navigation suites missing'
    analysis_suites = [suite for suite in summary['suites'] if suite['name'] in analysis_names]
    assert {suite['name'] for suite in analysis_suites} == analysis_names and all(suite['total'] > 0 for suite in analysis_suites), 'Analysis suites missing'
    assert sum(suite['total'] for suite in summary['suites'] if suite['name'] not in analysis_names | runtime_names) == 788, 'Retained navigation regression floor changed'
    runtime_suites = [suite for suite in summary['suites'] if suite['name'] in runtime_names]
    assert {suite['name'] for suite in runtime_suites} == runtime_names and all(suite['total'] > 0 for suite in runtime_suites), 'Runtime suites missing'
    assert sum(suite['total'] for suite in summary['suites'] if suite['name'] not in runtime_names) == 846, 'Retained analysis-1a regression floor changed'
    reproduction = json.loads((root/'checkpoints/re-runtime-1-clean-extraction/Reproduction.json').read_text())
    assert reproduction['status'] == 'passed' and reproduction['htmlSha256'] == summary['sha256']
    assert reproduction['summarySha256'] == digest(root/'test-results/candidate/Summary.json')
    analysis_browser = json.loads((root/'test-results/browser-re-analysis/Report.json').read_text())
    assert analysis_browser['sha256'] == summary['sha256'] and analysis_browser['status'] in {'passed', 'blocked'}, 'Analysis browser evidence failed or stale'
    if analysis_browser['status'] == 'blocked':
        assert analysis_browser['passed'] == 0 and analysis_browser['failed'] == 0 and analysis_browser['checks'] == [], 'Blocked analysis browser run cannot claim checks'
    runtime_browser = json.loads((root/'test-results/browser-re-runtime/Report.json').read_text())
    assert runtime_browser['sha256'] == summary['sha256'] and runtime_browser['status'] in {'passed', 'blocked'}, 'Runtime browser evidence failed or stale'
    if runtime_browser['status'] == 'blocked':
        assert runtime_browser['passed'] == 0 and runtime_browser['failed'] == 0 and runtime_browser['checks'] == [], 'Blocked runtime browser run cannot claim checks'
    browser = json.loads((root/'test-results/browser-mobile/Report.json').read_text())
    assert browser['sha256'] == summary['sha256'], 'Browser record belongs to another candidate'
    assert browser['status'] in {'passed', 'blocked'}, 'Browser failures must be resolved before packaging'
    if browser['status'] == 'blocked':
        assert browser['passed'] == 0 and browser['failed'] == 0 and browser['checks'] == [], 'Blocked browser run cannot claim executed checks'

names = ['README.md', 'PROJECT_CHARTER.md', 'ARCHITECTURE_CONTRACT.md', 'DECISION_LOG.md',
         'ROADMAP.md', 'CURRENT_BASELINE.md', 'TEST_POLICY.md', 'HANDOFF.md',
         'package.json', 'source-manifest.json', 'build-inputs.json', manifest['output']]
files = {root/name for name in names}
directories = ['src', 'tools', 'tests', 'stabilization', 'baseline', 'examples', 'docs', 'checkpoints']
if not args.stage:
    directories.extend(['test-results/candidate', 'test-results/browser-mobile', 'test-results/browser-re-analysis', 'test-results/browser-re-runtime'])
for name in directories:
    folder = root/name
    assert folder.is_dir(), 'Required directory missing: '+name
    for file in folder.rglob('*'):
        if file.is_file() and '__pycache__' not in file.parts and file.suffix not in {'.pyc', '.rgba'}:
            files.add(file)
for file in files:
    assert file.is_file() and file.resolve().is_relative_to(root), 'Invalid package input: '+str(file)
files = sorted(files, key=lambda p: p.relative_to(root).as_posix())
checksums = root/'SHA256SUMS.txt'
checksums.write_text(''.join(digest(p)+'  '+p.relative_to(root).as_posix()+'\n' for p in files))
target = (args.output or root.parent/'NES_Forge_1.9.0_RE_Runtime_Candidate.zip').resolve()
assert not target.is_relative_to(root), 'Write the archive outside its source tree'
target.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for file in files+[checksums]:
        entry = zipfile.ZipInfo('NES_Forge_1.9.0/'+file.relative_to(root).as_posix(), (2026, 10, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        z.writestr(entry, file.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    for file in files:
        assert hashlib.sha256(z.read('NES_Forge_1.9.0/'+file.relative_to(root).as_posix())).hexdigest() == digest(file)
print(json.dumps({'archive': str(target), 'archiveSha256': digest(target), 'files': len(files)+1,
                  'htmlSha256': digest(html), 'stagingOnly': args.stage,
                  'browserStatus': browser['status'] if browser else None,
                  'passed': summary['passed'] if summary else None, 'total': summary['total'] if summary else None}, indent=2))
