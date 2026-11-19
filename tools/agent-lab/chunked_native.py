#!/usr/bin/env python3
"""Resume-safe local native NES resource extraction in bounded room windows.

Requires Node.js, an owner-supplied NES ROM, matching Forge HTML + QA harness,
and NES_Forge_Native_Chunked_Extractor.cjs. Source ROMs and derived assets stay
in the output directory, which must not be a Git checkout.

This verifies source identity and chunk receipts only. No claim of gameplay,
pixel, audio, native writeback or original-hardware parity is made.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def safe_workdir(path, inputs):
    p = path.expanduser().resolve()
    if any((up / '.git').exists() for up in (p, *p.parents)):
        raise ValueError('Private extraction output must be outside Git repositories')
    if any(p == source or p in source.parents for source in inputs):
        raise ValueError('Private output cannot contain or replace a source file')
    return p


def verified_chunk(folder, sha, start, chunk_size):
    report = folder / 'resources_report.json'
    if not report.is_file() or not (folder/'resources.html').is_file():
        return None
    try:
        r = json.loads(report.read_text(encoding='utf-8'))
        s = r['selection']; stats = r['stats']
        expected = min(chunk_size, int(stats['listed']) - start)
        if (r.get('format') != 'NESForgeNativeResourceExtraction'
                or r.get('rom', {}).get('sha256') != sha
                or r.get('status') not in ('PASS', 'PARTIAL')
                or s.get('start') != start or s.get('selected') != expected
                or s.get('end_exclusive') != start + expected
                or not isinstance(stats.get('listed'), int) or expected <= 0
                or stats.get('failed') != 0 or stats.get('unavailable') != 0
                or stats.get('rooms') != expected
                or stats.get('pages', 0) < expected):
            return None
        return {'start':start, 'end_exclusive':start+expected,
                'listed':stats['listed'],'rooms':stats['rooms'],'pages':stats['pages'],
                'status':r['status'],'report':str(report)}
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None


def run(args):
    rom = Path(args.rom).expanduser().resolve()
    forge = Path(args.forge).expanduser().resolve()
    harness = Path(args.harness).expanduser().resolve()
    tool = Path(args.extractor).expanduser().resolve()
    for src in (rom,forge,harness,tool):
        if not src.is_file():raise ValueError(f'File not found: {src}')
    if rom.suffix.lower() != '.nes':raise ValueError('Input must be a .nes ROM')
    if args.chunk_size < 1 or args.chunk_size > 100:raise ValueError('Chunk size must be 1..100')
    if args.max_chunks is not None and args.max_chunks < 1:raise ValueError('--max-chunks must be positive')
    if not 20 <= args.timeout <= 3600:raise ValueError('Timeout must be 20..3600 seconds')
    out = safe_workdir(Path(args.output), (rom,forge,harness,tool)); out.mkdir(parents=True,exist_ok=True)
    sha = sha256(rom)
    ident = {'schema':'NESForgeChunkedNativeRecovery/v1','rom_sha256':sha,'forge_sha256':sha256(forge),
             'harness_sha256':sha256(harness),'extractor_sha256':sha256(tool),
             'chunk_size':args.chunk_size,'source_format':'NES'}
    manifest = out/'run_identity.json'
    if manifest.exists():
        if json.loads(manifest.read_text()) != ident:
            raise ValueError('Input/editor/extractor identity changed. Use a fresh output directory; existing results are preserved.')
    else:
        manifest.write_text(json.dumps(ident,indent=2)+'\n')
    total=None; started=0; entries=[]; idx=0; problems=[]
    while True:
        if total is not None and idx >= total:break
        if total is None:
            # If a previously completed first chunk exists, verify it and recover total.
            f=out/f'chunk-{idx:04d}'
            probe=f/'resources_report.json'
            if probe.exists():
                try:total=int(json.loads(probe.read_text())['stats']['listed'])
                except (KeyError,TypeError,ValueError,json.JSONDecodeError):pass
        folder=out/f'chunk-{idx:04d}'
        valid=verified_chunk(folder,sha,idx,args.chunk_size)
        if valid and (total is None or valid['listed']==total):
            total=valid['listed']; entries.append(valid)
            print(f'REUSE: {idx}..{valid["end_exclusive"]} ({valid["pages"]} pages)',flush=True)
            idx=valid['end_exclusive'];continue
        if args.max_chunks is not None and started>=args.max_chunks:break
        folder.mkdir(parents=True,exist_ok=True)
        cmd=['node',str(tool),str(rom),str(folder),'--forge',str(forge),'--harness',str(harness),
             '--start-room',str(idx),'--max-rooms',str(args.chunk_size)]
        print(f'EXTRACT: resource index {idx}, at most {args.chunk_size} rooms',flush=True)
        try:
            proc=subprocess.run(cmd,capture_output=True,text=True,timeout=args.timeout)
            (folder/'command.stdout.txt').write_text(proc.stdout)
            (folder/'command.stderr.txt').write_text(proc.stderr)
            if proc.returncode:raise ValueError(f'Native tool exit {proc.returncode}')
        except (subprocess.TimeoutExpired,ValueError) as e:
            problems.append({'start':idx,'reason':str(e)[:250]});print('FAILED:',str(e)[:250],flush=True);break
        valid=verified_chunk(folder,sha,idx,args.chunk_size)
        if not valid or (total is not None and valid['listed'] != total):
            problems.append({'start':idx,'reason':'Generated chunk receipt failed independent validation'});break
        total=valid['listed'];entries.append(valid);started+=1
        print(f'PASS: {idx}..{valid["end_exclusive"]} ({valid["pages"]} pages)',flush=True)
        idx=valid['end_exclusive']
    complete=(total is not None and idx==total and not problems and sum(e['rooms'] for e in entries)==total)
    receipt={'schema':ident['schema'],'source_sha256':sha,'editor_sha256':ident['forge_sha256'],
             'extractor_sha256':ident['extractor_sha256'],'catalogued_resources':total,
             'extracted_resources':sum(e['rooms'] for e in entries),'extracted_pages':sum(e['pages'] for e in entries),
             'completed':complete,'chunks':entries,'failures':problems,
             'limitations':['Chunk receipts prove source-local extraction, not independent emulator pixel parity',
                            'No assertion of enemy AI, original ROM writeback, or unmodified NES compatibility']}
    (out/'checkpoint_summary.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print('SUMMARY: ',receipt['extracted_resources'],'/',total,'resources,',receipt['extracted_pages'],'pages, completed=',complete)
    print('Checkpoint:',out/'checkpoint_summary.json')
    return 0 if not problems else 2


def main():
    a=argparse.ArgumentParser(description=__doc__)
    for key,helptext in [('rom','Original local .nes ROM'),('forge','Matching NES_Forge.html'),
                         ('harness','Matching Forge QA harness.cjs'),('extractor','Chunked native extractor .cjs'),
                         ('output','Dedicated private output directory')]:
        a.add_argument('--'+key,required=True,help=helptext)
    a.add_argument('--chunk-size',type=int,default=8)
    a.add_argument('--max-chunks',type=int,help='Stop after N new chunks; resume with same command later')
    a.add_argument('--timeout',type=int,default=90)
    args=a.parse_args()
    try:return run(args)
    except (OSError,ValueError,KeyError,json.JSONDecodeError) as exc:
        print('STOP:',str(exc),file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())
