"""Run the project-wide suite on ONE editor. Supply --extractions DIR for private packs."""
import argparse
import hashlib
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDITOR = ROOT / 'NES_Forge.html'
QA = ROOT / 'QA'
APP_TESTS = ROOT / 'app' / 'tests'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT/'Review-Results')
parser.add_argument('--extractions', type=Path, help='Folder containing native extraction ZIPs to check')
parser.add_argument('--cartridges', type=Path, help='Folder containing original .nes files for intake, playback and revision-specific writer checks')
parser.add_argument('--browser', action='store_true', help='Also run the separate real-browser smoke test')
parser.add_argument('--jobs', type=int, choices=range(1, 4), default=3,
                    help='Concurrent editor suites; use 1 on shared or slower machines')
args = parser.parse_args()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
env = dict(os.environ)
env['PYTHONDONTWRITEBYTECODE'] = '1'
env['NODE_PATH'] = os.pathsep.join(filter(None,[str(QA/'node_modules'),env.get('NODE_PATH')]))
digest = hashlib.sha256(EDITOR.read_bytes()).hexdigest()
index = {'editorSha256':digest,'results':[]}

def run(name, args, receipt=None):
    try:
        if receipt:
            receipt.unlink(missing_ok=True)
        proc = subprocess.run([str(arg) for arg in args], cwd=ROOT, env=env, capture_output=True,
                              text=True, encoding='utf-8', errors='replace', timeout=420)
        log = (proc.stdout+'\n'+proc.stderr).strip()
        (output/(name+'.log')).write_text(log+'\n',encoding='utf-8')
        row = {'suite':name,'passed':proc.returncode==0,'exitCode':proc.returncode}
        if receipt:
            if not receipt.exists():
                raise ValueError('The suite did not write its evidence file.')
            data = json.loads(receipt.read_text(encoding='utf-8'))
            candidate = data.get('editorSha256',data.get('htmlSha256'))
            if candidate != digest:
                raise ValueError('The evidence file does not identify the tested editor.')
            row.update({key:data[key] for key in ('total','ok') if key in data})
            if isinstance(data.get('passed'),bool):
                row['passed'] = row['passed'] and data['passed']
            elif isinstance(data.get('passed'),int):
                row['checksPassed'] = data['passed']
                row['total'] = data.get('total',len(data.get('checks',[])))
                row['passed'] = row['passed'] and row['checksPassed']==row['total']
            if data.get('ok') is False:
                row['passed'] = False
        if not row['passed']:
            row['reason']='See '+name+'.log and any corresponding JSON receipt.'
    except (OSError,ValueError,subprocess.TimeoutExpired) as err:
        row={'suite':name,'passed':False,'reason':str(err)}
    print(('PASS ' if row['passed'] else 'FAIL ')+name,flush=True)
    return row

def editor_suite(case):
    name,script=case
    receipt=output/(name+'.json')
    return run(name,['node',script,EDITOR,receipt],receipt)

def record(row):
    index['results'].append(row)

record(run('bundle',[sys.executable,ROOT/'app/tools/bundle.py','--check']))
cases = [('DG-runtime',QA/'t/recover.cjs'),('editor',QA/'t/editor.cjs'),('zip-limits',QA/'t/zip-limits.cjs'),('ai-controls',QA/'t/ai-controls.cjs'),
         ('mmc2',QA/'t/u/mmc2-prefetch.cjs'),('audio-library',QA/'t/u/native-audio-library.cjs')]
for name in ['native-lolo-resources','native-metroid-resources','punch-out','river-city','shadowgate','lolo-audio','metroid-audio','workstation-startup-dom']:
    cases.append((name,APP_TESTS/(name+'.cjs')))
cases.extend([('platform',QA/'platform-review.cjs'),('domains',QA/'domain-review.cjs'),('stage-route',QA/'stage-route.cjs'),('placement',QA/'placement-review.cjs')])
with ThreadPoolExecutor(max_workers=args.jobs) as pool:
    for result in pool.map(editor_suite,cases):
        record(result)
record(run('physical-extractor',['node',ROOT/'tools/extract-cartridge.cjs','--self-test']))
record(run('inventory',[sys.executable,'-m','unittest','discover','-s',ROOT/'tools/inventory/tests','-v']))
# Several suites use the actual default TCP port. Keep them sequential.
for name in ['wallet_crypto','siwe_format','localhost_server','authenticity_guards','rev8_frame_presentation',
             'hosted_defeat_xp_retention','progression_gameplay','native_thrust_controls','pvp_feedback_protocol',
             'shared_sideview','rc2_host_lifecycle']:
    record(run('host-'+name,[sys.executable,ROOT/'tests'/('test_'+name+'.py')]))
if args.extractions:
    receipt=output/'extraction.json'
    record(run('extraction',['node',QA/'extraction-review.cjs',args.extractions.resolve(),receipt,EDITOR],receipt))
    receipt=output/'native-pack-roundtrip.json'
    record(run('native-pack-roundtrip',['node',QA/'native-pack-roundtrip.cjs',EDITOR,receipt,args.extractions.resolve()],receipt))
    receipt=output/'animation-pack.json'
    record(run('animation-pack',['node',QA/'animation-pack-review.cjs',EDITOR,receipt,args.extractions.resolve()],receipt))
if args.cartridges:
    receipt=output/'investigated-library.json'
    record(run('investigated-library',['node',QA/'investigated-library.cjs',EDITOR,receipt,args.cartridges.resolve()],receipt))
    receipt=output/'native-corpus.json'
    raw_args=['node',QA/'native-corpus.cjs',EDITOR,receipt,args.cartridges.resolve()]
    if args.extractions:
        raw_args.append(args.extractions.resolve())
    record(run('native-corpus',raw_args,receipt))
if args.browser:
    receipt=output/'browser.json'
    record(run('browser',[sys.executable,QA/'browser_review.py','--output',receipt],receipt))
index['passed']=all(row['passed'] for row in index['results'])
index['requested']={'privateExtractions':bool(args.extractions),'realBrowser':bool(args.browser),'originalCartridges':bool(args.cartridges)}
(output/'index.json').write_text(json.dumps(index,indent=2)+'\n',encoding='utf-8')
print(str(output/'index.json'))
sys.exit(0 if index['passed'] else 1)
