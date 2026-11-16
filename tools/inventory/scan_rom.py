#!/usr/bin/env python3
"""Universal (container-level) NES ROM inventory, entirely offline; Python stdlib only.

This NEVER publishes to a host, edits a Forge project, or assumes it recovered
collision, named sprites, animation, or game-specific layouts.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from universal_inventory import MAX_ROM_SIZE, write_inventory, validate_inventory

HERE=Path(__file__).resolve().parent
TEMPLATE=HERE/'inventory_viewer_template.html'


def inventory_path(root:Path,rom:Path,data:bytes)->Path:
    safe=re.sub(r'[^a-zA-Z0-9_.-]','_',rom.stem)[:48].strip('._-') or 'ROM'
    return root/(safe+'_'+hashlib.sha256(data).hexdigest()[:12])


def make_report(out:Path,inv:dict)->None:
    script_json=json.dumps(inv,ensure_ascii=True).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    template=TEMPLATE.read_text(encoding='utf-8')
    (out/'OPEN_REPORT.html').write_text(template.replace('__ROM_INVENTORY__',script_json),encoding='utf-8')


def scan(rom:Path,root:Path,format_hint:str='auto')->Path:
    if not rom.is_file():raise ValueError('ROM file not found: '+str(rom))
    if rom.stat().st_size>MAX_ROM_SIZE:raise ValueError('ROM exceeds the 256 MiB safety limit')
    data=rom.read_bytes()
    out=inventory_path(root,rom,data)
    inv=write_inventory(data,out,format_hint)
    problems=validate_inventory(inv,out)
    if problems:raise ValueError('Internal validation failed: '+'; '.join(problems))
    make_report(out,inv)
    print('SUCCESS: '+rom.name)
    print('Container: '+inv['source']['container']+'; '+str(inv['source']['bytes'])+' bytes; '+str(len(inv['sections']))+' segments')
    print('CHR preview sheets: '+str(len(inv['previews'])))
    print('Gameplay authority: NONE; collision, enemies, animations: UNKNOWN')
    print('Inventory: '+str(out/'inventory.json'))
    print('Open report: '+str(out/'OPEN_REPORT.html'))
    for warning in inv['warnings']:print('NOTE: '+warning)
    return out


def scan_directory(directory:Path,root:Path,format_hint:str='auto')->tuple[dict,Path]:
    """Inventory ROM collection; preserve per-ROM provenance, isolate failures."""
    if not directory.is_dir():raise ValueError('ROM directory not found: '+str(directory))
    suffixes={'.nes','.unf','.unif','.fds'}
    source=directory.resolve()
    output=root.resolve()
    files=sorted((f for f in directory.rglob('*') if f.is_file() and not f.is_symlink()
                  and f.suffix.lower() in suffixes and output not in f.resolve().parents),
                 key=lambda f:str(f).lower())
    if not files:raise ValueError('No supported NES ROM files found in directory')
    results=[]
    for item in files:
        try:
            target=scan(item,root,format_hint)
            results.append({'rom':str(item.relative_to(directory)),'status':'inventory-created',
                            'report':str((target/'OPEN_REPORT.html').resolve())})
        except (OSError,ValueError,UnicodeError) as e:
            print('SKIPPED '+str(item.name)+': '+str(e),file=sys.stderr)
            results.append({'rom':str(item.relative_to(directory)),'status':'failed','reason':str(e)})
    passed=sum(1 for r in results if r['status']=='inventory-created')
    summary={'format':'nesforge.batch-rom-inventory','version':1,'authority':'research-only',
             'scanned':len(results),'passed':passed,'failed':len(results)-passed,
             'results':results}
    root.mkdir(parents=True,exist_ok=True)
    dest=root/'BATCH_REPORT.json'
    dest.write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(f'BATCH: {passed}/{len(results)} ROMs inventoried; report: {dest}')
    return summary,dest


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    group=p.add_mutually_exclusive_group(required=True)
    group.add_argument('--rom',type=Path,help='Any supported NES-family ROM file')
    group.add_argument('--rom-dir',type=Path,help='Scan a folder of NES-family ROMs recursively')
    group.add_argument('--verify',type=Path,help='Validate an existing local inventory.json and previews')
    p.add_argument('--out-root',type=Path,default=HERE/'private_results',help='Output base folder, ignored by git')
    p.add_argument('--format',choices=('auto','fds'),default='auto',help='Use fds for headerless FDS raw side dump')
    p.add_argument('--against-rom',type=Path,help='When verifying, compare inventory hashes against the original local ROM')
    args=p.parse_args(argv)
    try:
        if args.verify:
            data=json.loads(args.verify.read_text(encoding='utf-8'))
            original=args.against_rom.read_bytes() if args.against_rom else None
            issues=validate_inventory(data,args.verify.parent,original)
            if issues:raise ValueError('; '.join(issues))
            print('VALID read-only inventory: '+str(len(data['sections']))+' segments; '+str(len(data['previews']))+' preview sheets')
        elif args.rom_dir:
            summary,_=scan_directory(args.rom_dir,args.out_root,args.format)
            return 0 if summary['failed']==0 else 2
        else:scan(args.rom,args.out_root,args.format)
        return 0
    except (OSError,ValueError,UnicodeError,json.JSONDecodeError) as e:
        print('FAILED: '+str(e),file=sys.stderr)
        print('No live Forge gameplay, ROM, or multiplayer data was changed.',file=sys.stderr)
        return 1

if __name__=='__main__':raise SystemExit(main())
