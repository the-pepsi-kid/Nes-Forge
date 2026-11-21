"""Run the project-wide suite on ONE editor. Supply --extractions DIR for private packs."""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import threading
import time
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
parser.add_argument('--timeout', action='append', default=[], metavar='SUITE=SECONDS',
                    help='Time limit for one suite (repeatable); overrides the defaults below')
parser.add_argument('--timeout-scale', type=float, default=1.0,
                    help='Multiply every time limit, e.g. 2 on a slow or shared machine')
parser.add_argument('--idle-timeout', type=int, default=300,
                    help='Hang detection: stop a suite that prints nothing for this many seconds')
args = parser.parse_args()
# Time limits. Most suites finish well inside the default. The slow ones are measured (alone, 4-core container):
#   extraction         ~600 s: every record of all 18 packs through the real intake, which also registers each pack
#                      in the resource library (about half the time)
#   ninja-stage-table  ~330 s: decodes the catalog, then plays the game's own time-over restart for 22 areas
#   library-workflow   ~420 s: plays three stages in Chromium, then the whole library workflow, restart included
#   native-corpus, library-locations: several minutes with every cartridge
# Each limit leaves room for a loaded machine; hang detection (--idle-timeout) still stops a silent suite early.
DEFAULT_TIMEOUT = 420
TIMEOUTS = {'extraction': 1200, 'ninja-stage-table': 900, 'library-workflow': 1500, 'library-locations': 900, 'native-corpus': 900}
for item in args.timeout:
    suite, _, seconds = item.partition('=')
    if not suite or not seconds.isdigit():
        parser.error('--timeout needs SUITE=SECONDS, got ' + item)
    TIMEOUTS[suite] = int(seconds)
def limit_for(name):
    return max(1, int(TIMEOUTS.get(name, DEFAULT_TIMEOUT) * args.timeout_scale))
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
env = dict(os.environ)
env['PYTHONDONTWRITEBYTECODE'] = '1'
env['NODE_PATH'] = os.pathsep.join(filter(None,[str(QA/'node_modules'),env.get('NODE_PATH')]))
digest = hashlib.sha256(EDITOR.read_bytes()).hexdigest()
args_idle = args.idle_timeout
index = {'editorSha256':digest,'results':[],'limits':{'default':limit_for('default-suite'),'suites':{k:limit_for(k) for k in TIMEOUTS},'idle':args.idle_timeout}}

def execute(command, limit, idle):
    """Run one suite. Stops it when it exceeds its time limit, or prints nothing for `idle` seconds (a hang)."""
    proc = subprocess.Popen([str(arg) for arg in command], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding='utf-8', errors='replace', bufsize=1)
    lines, last = [], [time.monotonic()]
    def pump():
        for line in proc.stdout:
            lines.append(line)
            last[0] = time.monotonic()
    reader = threading.Thread(target=pump, daemon=True)
    reader.start()
    start, stopped = time.monotonic(), None
    while proc.poll() is None:
        time.sleep(0.25)
        now = time.monotonic()
        if now - start > limit:
            stopped = 'exceeded its time limit of %d s' % limit
        elif now - last[0] > idle:
            stopped = 'printed nothing for %d s (possible hang)' % idle
        if stopped:
            proc.kill()
            break
    proc.wait()
    reader.join(5)
    return proc.returncode, ''.join(lines), stopped, time.monotonic() - start

def run(name, args, receipt=None):
    limit = limit_for(name)
    try:
        if receipt:
            receipt.unlink(missing_ok=True)
        code, log, stopped, seconds = execute(args, limit, args_idle)
        (output/(name+'.log')).write_text(log.strip()+'\n',encoding='utf-8')
        row = {'suite':name,'passed':code==0 and not stopped,'exitCode':code,'seconds':round(seconds,1),'limit':limit}
        if stopped:
            row['reason']='Stopped: '+stopped+'. See '+name+'.log (output so far).'
            raise StopIteration
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
    except StopIteration:
        pass
    except (OSError,ValueError) as err:
        row={'suite':name,'passed':False,'reason':str(err),'limit':limit}
    print(('PASS ' if row['passed'] else 'FAIL ')+name+(' (%.0f s)' % row['seconds'] if 'seconds' in row else '')+('' if row['passed'] else ' · '+row.get('reason','')),flush=True)
    return row

def editor_suite(case):
    name,script=case
    receipt=output/(name+'.json')
    return run(name,['node',script,EDITOR,receipt],receipt)

def record(row):
    index['results'].append(row)

record(run('bundle',[sys.executable,ROOT/'app/tools/bundle.py','--check']))
cases = [('DG-runtime',QA/'t/recover.cjs'),('editor',QA/'t/editor.cjs'),('zip-limits',QA/'t/zip-limits.cjs'),('pack-check',QA/'t/pack-check.cjs'),('command-core',QA/'t/command-core.cjs'),('resource-library',QA/'t/resource-library.cjs'),('rom-audit',QA/'t/rom-audit.cjs'),('release-migration',QA/'t/release-migration.cjs'),('pose-streams',QA/'t/pose-streams.cjs'),('cnrom-world',QA/'t/cnrom-world.cjs'),('world-stairs',QA/'t/world-stairs.cjs'),('world-enemies',QA/'t/world-enemies.cjs'),('ai-controls',QA/'t/ai-controls.cjs'),
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
    receipt=output/'punch-out-pose-geometry.json'
    record(run('punch-out-pose-geometry',['node',QA/'punch-out-pose-geometry.cjs',EDITOR,receipt,args.cartridges.resolve()],receipt))
    receipt=output/'ninja-stage-table.json'
    record(run('ninja-stage-table',['node',QA/'ninja-stage-table.cjs',EDITOR,receipt,args.cartridges.resolve()],receipt))
    if args.browser:
        receipt=output/'catalog-persistence.json'
        record(run('catalog-persistence',['node',QA/'catalog-persistence.cjs',EDITOR,receipt,args.cartridges.resolve()],receipt))
        receipt=output/'library-locations.json'
        record(run('library-locations',['node',QA/'library-locations.cjs',EDITOR,receipt,args.cartridges.resolve()]+([str(args.extractions.resolve())] if args.extractions else []),receipt))
        receipt=output/'library-workflow.json'
        record(run('library-workflow',['node',QA/'library-workflow.cjs',EDITOR,receipt,args.cartridges.resolve()],receipt))
    receipt=output/'native-corpus.json'
    raw_args=['node',QA/'native-corpus.cjs',EDITOR,receipt,args.cartridges.resolve()]
    if args.extractions:
        raw_args.append(args.extractions.resolve())
    record(run('native-corpus',raw_args,receipt))
if args.browser:
    receipt=output/'browser.json'
    record(run('browser',[sys.executable,QA/'browser_review.py','--output',receipt],receipt))
    receipt=output/'library-persistence.json'
    lib_args=['node',QA/'library-persistence.cjs',EDITOR,receipt]+([str(args.extractions.resolve())] if args.extractions else [])
    record(run('library-persistence',lib_args,receipt))
    receipt=output/'library-explorer.json'
    ng_pack=args.extractions.resolve()/'Ninja_Gaiden_U.zip' if args.extractions else None
    record(run('library-explorer',['node',QA/'library-explorer.cjs',EDITOR,receipt]+([str(ng_pack)] if ng_pack and ng_pack.exists() else []),receipt))
index['passed']=all(row['passed'] for row in index['results'])
index['requested']={'privateExtractions':bool(args.extractions),'realBrowser':bool(args.browser),'originalCartridges':bool(args.cartridges)}
(output/'index.json').write_text(json.dumps(index,indent=2)+'\n',encoding='utf-8')
print(str(output/'index.json'))
sys.exit(0 if index['passed'] else 1)
