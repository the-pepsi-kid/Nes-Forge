"""Retained checks against the fixed HTML, with this checkpoint's own reports."""
from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent / 'gate'
out.mkdir(exist_ok=True)
html = root / 'app/mainline/NES_Forge_2.0.0-alpha.11.html'
identity = hashlib.sha256(html.read_bytes()).hexdigest()
names = ['native-lolo-resources', 'native-metroid-resources', 'metroid-audio',
         'lolo-audio', 'river-city', 'shadowgate', 'native-audio-library',
         'punch-out', 'mmc2-prefetch']
subprocess.run(['node', str(root / 'app/docs/native-codec-exercise.cjs')], cwd=root, check=True)
results = []
for name in names:
    with (out / (name + '.log')).open('w') as log:
        process = subprocess.run(['node', str(root / 'app/tests' / (name + '.cjs')),
                                  str(html), str(out / (name + '.json'))],
                                 cwd=root, stdout=log, stderr=subprocess.STDOUT)
    data = json.loads((out / (name + '.json')).read_text()) if (out / (name + '.json')).exists() else {}
    assert hashlib.sha256(html.read_bytes()).hexdigest() == identity
    item = {'name': name, 'exitCode': process.returncode,
            'passed': data.get('passed', 0), 'total': data.get('total', 0)}
    item['status'] = 'passed' if (process.returncode == 0 and item['passed'] == item['total']
                                  and item['total'] > 0 and data.get('htmlSha256', identity) == identity) else 'failed'
    results.append(item)
    print(item, flush=True)
report = {'scope': 'Available retained public checks and synthetic tutorial exercise on the startup fix. Strict DOM startup/control evidence is separate; not the missing historical full release gate.',
          'htmlSha256': identity, 'status': 'passed' if all(x['status'] == 'passed' for x in results) else 'failed',
          'passed': sum(x['passed'] for x in results), 'total': sum(x['total'] for x in results), 'suites': results}
(out / 'Summary.json').write_text(json.dumps(report, indent=2) + '\n')
raise SystemExit(0 if report['status'] == 'passed' else 1)
