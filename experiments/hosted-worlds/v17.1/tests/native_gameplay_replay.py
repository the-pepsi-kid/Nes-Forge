#!/usr/bin/env python3
"""Replay actual NES inputs in Forge's original-ROM emulator.

Read-only observability: no modification of emulator RAM/ROM, and no simulated
quests, abilities, or native-engine claims. Source ROM is supplied privately.
"""
import argparse
import base64
import hashlib
import json
import shutil
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

PRESSED = {"A": "KeyZ", "B": "KeyX", "Start": "Enter", "Select": "ShiftLeft", "Up": "ArrowUp", "Down": "ArrowDown", "Left": "ArrowLeft", "Right": "ArrowRight"}


def read_scenario(path):
    data=json.loads(path.read_text())
    assert data['schema']=='nesforge.native-replay/1'
    assert isinstance(data.get('watch'), dict) and len(data['watch']) <= 64
    for address in data['watch'].values():
        assert type(address)==int and 0 <= address < 0x800
    assert isinstance(data.get('actions'),list) and 1<=len(data['actions'])<=2000
    for step in data['actions']:
        assert set(step).issubset({'name','frames','held','capture','expect'})
        assert isinstance(step['name'],str) and len(step['name'])<=100
        assert type(step['frames'])==int and 1<=step['frames']<=1200
        assert isinstance(step['held'],list) and len(step['held'])<=8 and all(v in PRESSED for v in step['held'])
        assert isinstance(step.get('expect',{}),dict)
        for label,value in step.get('expect',{}).items():
            assert label in data['watch'] and type(value)==int
    return data


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--rom',type=Path,required=True)
    ap.add_argument('--html',type=Path,required=True)
    ap.add_argument('--scenario',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--chromium',default=shutil.which('chromium'))
    args=ap.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    source=args.rom.read_bytes();case=read_scenario(args.scenario)
    if source[:4]!=b'NES\x1a':raise SystemExit('Not an iNES ROM')
    rom_hash=hashlib.sha256(source).hexdigest()
    report={'format':'nesforge.native-replay-report','version':1,'case':case['name'], 'romSha256':rom_hash,
            'romHeader':{'prgBanks16KiB':source[4],'chrBanks8KiB':source[5]},
            'source':str(args.scenario.name),'observed':[],'passed':True,
            'limits':['Native execution observations only','Does not prove NPC/dialogue/physics parity','Private ROM not included']}
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path=args.chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                page=browser.new_page()
                page.set_content(args.html.read_text(),wait_until='load',timeout=120000)
                load=page.evaluate("r=>{switchTab('emu');return emuLoadRomData(new Uint8Array(r),'private-replay',0)}",list(source))
                if not load:raise RuntimeError('Original ROM rejected by Forge emulator')
                for idx,step in enumerate(case['actions']):
                    keys=[PRESSED[k] for k in step['held']]
                    # Stable per-step memory observations; smaller batches leave the
                    # browser event loop a chance to process pending paint/input.
                    n=step['frames'];state=None
                    for part in range(0,n,60):
                        segment=min(60,n-part)
                        state=page.evaluate('''o=>{for(const k of Object.keys(emuKeys))delete emuKeys[k];
                            for(const k of o.keys)emuKeys[k]=true;
                            for(let i=0;i<o.frames;i++)emuRunFrame();
                            const r=emu.ram,watch={};for(const [name,addr] of Object.entries(o.watch))watch[name]=r[addr];
                            return {frame:emu.frameCount,watch};}''',{'keys':keys,'frames':segment,'watch':case['watch']})
                    good=all(state['watch'].get(k)==v for k,v in step.get('expect',{}).items())
                    record={'step':idx,'name':step['name'],'held':step['held'],'frames':step['frames'],**state,'pass':good}
                    if step.get('capture'):
                        fname=f'{idx:03}_{step["capture"]}.png'
                        encoded=page.evaluate("()=>{renderEmu();return document.getElementById('emuCanvas').toDataURL('image/png')}")
                        (args.out/fname).write_bytes(base64.b64decode(encoded.split(',',1)[1]))
                        record['screenshot']=fname
                    report['observed'].append(record)
                    print(('PASS' if good else 'FAIL')+f' [{idx:02d}] {step["name"]}: frame {state["frame"]} {state["watch"]}',flush=True)
                    if not good:report['passed']=False
            finally:browser.close()
    except Exception as error:
        report['passed']=False
        report['runtimeError']=str(error)
    finally:
        (args.out/'replay_report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('Result:', 'PASS' if report['passed'] else 'FAIL', 'checkpoints:',len(report['observed']))
    return 0 if report['passed'] else 1

if __name__=='__main__':sys.exit(main())
