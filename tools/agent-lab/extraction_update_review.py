#!/usr/bin/env python3
"""Offline source-bound extraction ZIP review and Qwen retry-workorder generator.

Verifies ZIP CRCs and manifest linkage. Never equates exporter claims with
independently established pixel/runtime/native-writeback parity. Does not
unpack copyrighted assets, execute code, modify ROMs or use GitHub/network.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import html
import json
from pathlib import Path, PurePosixPath
import re
import zipfile

HEX = re.compile(r'^[a-f0-9]{64}$')
ROOTS = {'NESForgeNativeExtraction', 'NESForgeNativeResourceExtraction',
         'NESForgeNativeAudioExtraction','NESForgeAudioCapture',
         'NESForgeSMB1Extraction','NESForgeSMB2Extraction','NESForgeSMB3Extraction'}
AUDITS = ('objects_report.json','placement_audit.json','collision_check_against_game.json')


def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')


def safe_archive_members(z):
    files=[]
    for name in z.namelist():
        if name.endswith('/'):
            continue
        p=PurePosixPath(name)
        if name.startswith('/') or '\\' in name or '\x00' in name or ':' in p.parts[0] or any(x in ('.','..','') for x in p.parts):
            raise ValueError('Unsafe ZIP member path')
        if z.getinfo(name).file_size>64*1024*1024:
            raise ValueError('Extraction member >64 MiB; manual check required')
        files.append(name)
    if len(files)>30000:
        raise ValueError('Extraction pack contains >30000 files')
    return files


def census_index(path):
    if path is None:
        return {}
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        result={}
        for row in csv.DictReader(f):
            sha=row.get('sha256','').lower()
            if HEX.fullmatch(sha):
                result[sha]={'name':row.get('rom',''),'archive':row.get('archive',''),
                             'mapper':row.get('mapper',''),'header_status':row.get('header_status','')}
        return result


def inspect_archive(path,corpus):
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    with zipfile.ZipFile(path) as z:
        names=safe_archive_members(z)
        bad=z.testzip()
        if bad:
            raise ValueError('CRC mismatch: '+bad)
        root_candidates=[x for x in names if x.rsplit('/',1)[-1] in ('native_report.json','resources_report.json')]
        if not root_candidates:
            root_candidates=[x for x in names if x.rsplit('/',1)[-1] in ('smb1_report.json','smb2_report.json','smb3_report.json')]
        if not root_candidates:
            root_candidates=[x for x in names if x.rsplit('/',1)[-1]=='audio_report.json']
        if len(root_candidates)!=1:
            raise ValueError('Zero or multiple extraction root reports')
        root=root_candidates[0]
        report=json.loads(z.read(root))
        if not isinstance(report,dict) or report.get('format') not in ROOTS:
            raise ValueError('Unsupported report format')
        rom=report.get('rom') or {}
        sha=rom.get('sha256','').lower()
        if not HEX.fullmatch(sha):
            raise ValueError('Report does not identify original ROM by SHA-256')
        checks={'zip_crc':'passed','rom_sha256_in_report':True,
                'original_rom_in_census':sha in corpus if corpus else None,
                'original_rom_bytes_checked_in_this_run':False}
        relative=root.split('/')[0]+'/'
        groups={'scenes':0,'objects':0,'editable_projects':0,'audio_projects':0,'audit_reports':0,'runtime_images':0}
        for name in names:
            if not name.startswith(relative): continue
            local=name[len(relative):]
            if local.startswith(('rooms/','maps/','levels/','areas/')) and local.endswith('.json') and not local.endswith('_objects.json'):
                groups['scenes']+=1
            if local.endswith('_objects.json'): groups['objects']+=1
            if '/projects/' in name and name.endswith('.nesforge.json'): groups['editable_projects']+=1
            if '/audio/' in name and name.endswith('.nesforge.json') or '/title_audio/' in name and name.endswith('.nesforge.json'):
                groups['audio_projects']+=1
            if local.rsplit('/',1)[-1] in AUDITS:groups['audit_reports']+=1
            if local.endswith('.png'):groups['runtime_images']+=1
        audit_info={}
        for name in names:
            if not name.startswith(relative) or name.rsplit('/',1)[-1] not in AUDITS:continue
            v=json.loads(z.read(name))
            if name.endswith('objects_report.json'):
                audit_info['objects_report']={k:v[k] for k in ('format','objects','enemiesConfirmedInGame','levelsWithAllObjectsInside') if k in v}
                if isinstance(v.get('levels'),list):
                    audit_info['objects_report']['out_of_bounds_levels']=[x.get('id') for x in v['levels'] if x.get('allInsideLevel') is False][:40]
            elif name.endswith('placement_audit.json'):
                audit_info['placement_audit']={k:v[k] for k in ('label','method','distinct_game_screens','screens_found_in_decoded_rooms') if k in v}
        errors=report.get('problems',[])
        if not isinstance(errors,list):errors=[]
        errors=[str(e)[:350] for e in errors[:200]]
        stats={key:report[key] for key in ('rooms','maps','sprites','stats','areas','uniqueLevels') if key in report and key!='areas'}
        # This is summary-only evidence; no decoded tiles, note data or ROM bytes.
        if isinstance(stats.get('rooms'),dict): stats['rooms']={k:v for k,v in stats['rooms'].items() if isinstance(v,(int,str,bool))}
        if isinstance(stats.get('sprites'),dict):stats['sprites']={k:v for k,v in stats['sprites'].items() if isinstance(v,(int,str,bool))}
        if isinstance(stats.get('maps'),dict):stats['maps']={k:v for k,v in stats['maps'].items() if isinstance(v,(int,str,bool))}
        if isinstance(stats.get('stats'),dict):stats['stats']={k:v for k,v in stats['stats'].items() if isinstance(v,(int,str,bool))}
        return {'archive':path.name,'archive_sha256':digest,'rom_sha256':sha,
                'source_rom':corpus.get(sha), 'format':report['format'],'reported_status':report.get('status','not_reported'),
                'groups':groups,'report_counts':stats,'audits':audit_info,
                'report_problems':errors,'checks':checks,'report_source_file':root,
                'limits':['ZIP CRC does not prove extraction parity','Exporter PASS is not independently reproduced','No native ROM writer assumed']}


def tasks(item,round_number):
    out=[]
    def add(category,priority,description,acceptance):
        out.append({'id':item['rom_sha256'][:12]+'-'+category+'-r'+str(round_number),
                    'rom_sha256':item['rom_sha256'],'source_archive':item['archive'],
                    'category':category,'priority':priority,'round':round_number,
                    'state':'pending_review_not_executed','instruction':description,'acceptance':acceptance})
    identity=item['rom_sha256'][:12]
    add('source_binding','P0','Confirm exact source ROM SHA-256 '+item['rom_sha256']+' and physical mapper/bank information; do not use filename or mapper guesses.',
        'Independent original-ROM bank hashes and exact revision match; no raw game bytes in public reports')
    add('placement','P0','Use supplied placement reports and original emulator traces to compare room tile/palette/scroll state, enemy/object placement and scene transitions for this exact revision. Identify mismatches and missing dynamic contexts.',
        'Matching original and reconstructed frame-state with byte/source references, scene/actor coordinates and explicit failures')
    if item['report_problems']:
        add('known_failures','P0','Investigate only these exporter failures: '+'; '.join(item['report_problems'][:8])[:1400],
            'Resolve specific missing script/object/codec with source evidence; rerun independent regression tests')
    bad=item['audits'].get('objects_report',{}).get('out_of_bounds_levels',[])
    if bad:
        add('object_bounds','P0','Analyze object placements outside the expected level bounds at '+', '.join(map(str,bad[:20]))+'. Check screen transforms, command interpretation and dynamic objects.',
            'Source-backed object coordinate mapping, game trace validation, zero unexplained bounds mismatches')
    if item['groups']['audio_projects']:
        add('audio','P1','Check original NES driver timing, loops, channel envelopes, DPCM and SFX triggers against these finite exported Audio projects. Do not assert full song completion.',
            'Source loop reconstruction, APU trace comparison, accurate audition, editor save/reopen and compatible writer when available')
    add('native_writer','P1','Determine whether supported edits can be encoded into the original engine, preserving mapper constraints, input SHA and untouched source bytes.',
        'Verified changed-ROM output with independent emulator comparison; no promise of real NES hardware support absent matching cartridge verification')
    return out


def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--archives',nargs='*',default=[],help='Extraction update ZIPs (not source-ROM archives)')
    a.add_argument('--archive-dir',help='Folder of extraction updates; skips the Qwen tools ZIP and ROM corpus archives explicitly')
    a.add_argument('--census',help='Optional owner-generated ROM census CSV for SHA identity cross-check')
    a.add_argument('--output',required=True,help='Private review folder, preferably outside Git')
    a.add_argument('--round',type=int,default=3)
    args=a.parse_args()
    if args.round<1:raise SystemExit('--round must be positive')
    out=Path(args.output).expanduser().resolve()
    if any((p/'.git').exists() for p in (out,*out.parents)):
        raise SystemExit('Private output must be outside any Git checkout')
    out.mkdir(parents=True,exist_ok=True)
    (out/'.gitignore').write_text('*\n')
    corpus=census_index(args.census)
    files = [Path(x) for x in args.archives]
    skipped=[]
    if args.archive_dir:
        files += sorted(Path(args.archive_dir).expanduser().resolve().glob('*.zip'))
    files = list(dict.fromkeys(p.resolve() for p in files))
    if not files:
        raise SystemExit('Supply --archives ZIP... or --archive-dir PATH')
    reports=[];refusals=[]
    for p in files:
        if args.archive_dir and (p.name.startswith('NES_Forge_Qwen_Package') or p.name in ('1.zip','2.zip','3.zip')):
            reason='Research tool package, not ROM extraction' if 'Qwen' in p.name else 'Source ROM corpus, not extraction report'
            skipped.append({'archive':p.name,'reason':reason})
            print('SKIP',p.name,reason)
            continue
        try:
            r=inspect_archive(p,corpus)
            reports.append(r)
            print('PASS',p.name,r['format'],r['rom_sha256'][:12],r['groups'])
        except (OSError,ValueError,KeyError,zipfile.BadZipFile,json.JSONDecodeError) as exc:
            refusals.append({'archive':p.name,'reason':str(exc)[:300]})
            print('REJECTED',p.name,str(exc)[:180])
    all_tasks=[t for r in reports for t in tasks(r,args.round)]
    review={'schema':'NESForgeExtractionUpdateReview/v1','round':args.round,'archives_reviewed':len(reports),
            'originals_matched_in_census':sum(bool(r['checks']['original_rom_in_census']) for r in reports),
            'scope':'Local ZIP and report validation only. Original game parity/writeback not asserted.',
            'reports':reports,'refusals':refusals,'skipped_non_extractions':skipped}
    write(out/'intake.json',review)
    write(out/'QWEN_NEXT_WORKORDERS.json',{'schema':'NESForgeAgentWorkorders/v1','round':args.round,
         'owner_approval_required':True,'allow_shell_execution':False,'allow_network_upload':False,
         'allow_modify_rom':False,'allow_modify_forge':False,'tasks':all_tasks})
    with (out/'QWEN_NEXT_WORKORDERS.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=['id','rom_sha256','source_archive','category','priority','round','state','instruction','acceptance'])
        w.writeheader();w.writerows(all_tasks)
    rows='\n'.join('<tr><td>'+html.escape(r['archive'])+'</td><td>'+html.escape(r['rom_sha256'][:12])+'</td><td>'+str(sum(r['groups'].values()))+'</td><td>'+str(len(r['report_problems']))+'</td></tr>' for r in reports)
    (out/'index.html').write_text('<!doctype html><html><head><meta charset="utf-8"><title>Forge extraction reviews</title><style>body{font:16px system-ui;max-width:1000px;margin:30px auto;background:#101a25;color:#e9f3fc}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #334455;text-align:left}</style></head><body><h1>NES Forge extraction round '+str(args.round)+'</h1><p>Local evidence intake, not verified game parity. '+str(len(reports))+' archives; '+str(len(all_tasks))+' Qwen work orders.</p><table><tr><th>Extraction update</th><th>ROM SHA</th><th>Evidence items</th><th>Exporter problems</th></tr>'+rows+'</table><p>Review <code>intake.json</code> and <code>QWEN_NEXT_WORKORDERS.json</code> locally. No code or ROMs were changed.</p></body></html>',encoding='utf-8')
    print('SUMMARY',len(reports),'archives,',len(all_tasks),'review tasks,',len(refusals),'refused,',len(skipped),'skipped; output',out)
    return 0 if not refusals else 2

if __name__=='__main__':
    raise SystemExit(main())
