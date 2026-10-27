#!/usr/bin/env python3
"""Independent bounded NES Forge hosted alpha acceptance; no private ROM required.

Checks focus on bundled editor parity, protocol, host, multiplayer and fidelity
labelling; full original Zelda II ROM parity is not asserted by this runner.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SUITES=(
    ('bundle_consistency', ['../../../app/tools/bundle.py','--manifest','hosted-source-manifest.json','--check']),
    ('protocol13_world_load', ['tests/test_v17_world_load_compatibility.py']),
    ('hosted_actions', ['tests/test_v17_hosted_stabs.py']),
    ('localhost_persistence', ['tests/test_localhost_server.py']),
    ('shared_sideview', ['tests/test_shared_sideview.py']),
    ('authenticity_policy', ['tests/test_authenticity_guards.py']),
    ('live_patch', ['tests/test_live_patch.py']),
    ('progression', ['tests/test_progression_gameplay.py']),
    ('hosted_defeat_xp_retention', ['tests/test_hosted_defeat_xp_retention.py']),
    ('pvp_gate', ['tests/test_v10_pvp.py']),
    ('room_camera', ['tests/test_v12_two_player_room_camera.py']),
)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--json-out', help='Optional local report path; do not commit reports containing private data')
    a=ap.parse_args()
    results=[]
    for label,args in SUITES:
        proc=subprocess.run([sys.executable,*args],cwd=ROOT,capture_output=True,text=True,timeout=90)
        output=(proc.stdout or '') + ('\n'+proc.stderr if proc.stderr else '')
        passed=None
        check_total=None
        parsed=None
        try:
            parsed=json.loads(proc.stdout)
        except json.JSONDecodeError:
            parsed=None
        if isinstance(parsed,dict):
            checks=parsed.get('checks', parsed)
            if isinstance(checks,dict):
                flags=[v for v in checks.values() if type(v) is bool]
                if flags:
                    passed=sum(flags)
                    check_total=len(flags)
        okay=proc.returncode==0 and (passed is None or passed==check_total)
        result={'suite':label,'ok':okay,'passed_boolean_checks':passed,'total_boolean_checks':check_total}
        if not result['ok']:result['error_tail']=output[-1600:]
        results.append(result)
        print(f"{'PASS' if result['ok'] else 'FAIL'} {label} {passed if passed is not None else ''}",flush=True)
    report={'release':'3.0.0-alpha.1 review candidate','protocol':13,'passed_suites':sum(r['ok'] for r in results),'total_suites':len(results),'passed_boolean_checks':sum(r['passed_boolean_checks'] or 0 for r in results),'total_boolean_checks':sum(r['total_boolean_checks'] or 0 for r in results),'results':results,'limitations':['No original Zelda II ROM used','No assertion of native gameplay parity','No public network security validation']}
    if a.json_out:Path(a.json_out).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    return 0 if all(r['ok'] for r in results) else 1
if __name__=='__main__':sys.exit(main())
