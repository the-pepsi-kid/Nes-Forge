"""One worker, frozen application: retained checks, startup and native journeys.

Pass optional private Punch-Out ROM folder, then Zelda II ROM path. NODE_PATH
must provide jsdom 30.1.3. No private bytes are copied into the reports.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

review = Path(__file__).resolve().parent
root = review.parents[1]
html = root / 'nes-forge.html'
identity = hashlib.sha256(html.read_bytes()).hexdigest()
tasks = [('public-checks', ['python3', str(review / 'run_checks.py')]),
         ('startup-dom', ['node', str(root / 'app/tests/workstation-startup-dom.cjs'), str(html), str(review / 'Startup_DOM_Verification.json')]),
         ('capabilities-dom', ['node', str(review / 'verify_capabilities_dom.cjs'), *sys.argv[1:3]])]
if len(sys.argv) > 1:
    tasks.append(('artwork-dom', ['node', str(review / 'verify_artwork_dom.cjs'), sys.argv[1]]))
results = []
for name, command in tasks:
    print('START ' + name, flush=True)
    with (review / (name + '.log')).open('w') as log:
        process = subprocess.run(command, cwd=root, stdout=log, stderr=subprocess.STDOUT)
    assert hashlib.sha256(html.read_bytes()).hexdigest() == identity, 'Frozen application changed'
    results.append({'name': name, 'exitCode': process.returncode})
    print(('PASS ' if process.returncode == 0 else 'FAIL ') + name, flush=True)
    if process.returncode:
        print((review / (name + '.log')).read_text()[-4000:], flush=True)
        break
status = 'passed' if len(results) == len(tasks) and all(r['exitCode'] == 0 for r in results) else 'failed'
(review / 'Verification_Summary.json').write_text(json.dumps({'status': status, 'htmlSha256': identity, 'workers': 1, 'tasks': results}, indent=2) + '\n')
raise SystemExit(0 if status == 'passed' else 1)
