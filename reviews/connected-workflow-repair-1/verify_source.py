"""Compare current runtime inputs with the pinned reviewed parent, without Git."""
from pathlib import Path
import hashlib
import json

review = Path(__file__).resolve().parent
root = review.parents[1]
before = json.loads((review / 'Source_Parent_Build_Inputs.json').read_text())
after = json.loads((root / 'app/build-inputs.json').read_text())
a = {v['path']: v for v in after['inputs']}
b = {v['path']: v for v in before['inputs']}
protected = ['src/services/project-store.js', 'src/services/asset-registry.js', 'src/services/stage-context.js',
             'src/services/emulator-bridge.js', 'src/services/mmc2-emulator.js', 'src/re/mmc2.js',
             'src/re/punch-out-pose.js', 'src/re/punch-out-art.js', 'src/re/punch-out-arena-encoder.js',
             'src/re/native-punch-out-resources.js', 'src/audio/audio-compiler.js']
changed = [p for p in b if b[p]['sha256'] != a[p]['sha256']]
html = (root / 'nes-forge.html').read_bytes()
report = {'status': 'passed', 'baselineCommit': 'f0d2c31', 'htmlSha256': after['sha256'],
          'beforeInputs': len(b), 'afterInputs': len(a), 'changedInputs': changed,
          'addedInputs': [p for p in a if p not in b], 'identicalInputs': len(b)-len(changed),
          'oldInputOrderRetained': [p for p in a if p in b] == list(b),
          'protectedInputsUnchanged': {p: a[p]['sha256'] == b[p]['sha256'] for p in protected},
          'sourceConcatenationMatches': b''.join((root / 'app' / v['path']).read_bytes() for v in after['inputs']) == html,
          'rootAndGeneratedMatch': (root / 'app' / after['output']).read_bytes() == html,
          'originalPepsiArchiveSha256': hashlib.sha256((root / 'archive/original-pepsi.html').read_bytes()).hexdigest()}
assert hashlib.sha256(html).hexdigest() == after['sha256']
assert all(report['protectedInputsUnchanged'].values()) and report['oldInputOrderRetained'] and report['sourceConcatenationMatches'] and report['rootAndGeneratedMatch']
for p, v in a.items():
    data = (root / 'app' / p).read_bytes()
    assert hashlib.sha256(data).hexdigest() == v['sha256'] and len(data) == v['bytes'], p
(review / 'Source_Preservation.json').write_text(json.dumps(report, indent=2) + '\n')
print('PASS source inputs and protected owners')
