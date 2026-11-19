#!/usr/bin/env python3
"""Compare local model reliability on tiny *original* evidence tasks, without ROM bytes.
No agent tools executed; benchmark tests outputs against fixed, unambiguous answer keys.
"""
import argparse
import json
import time
from urllib import parse, request

TASKS = [
    {'id': '6502-evidence', 'input':
      'An observed byte sequence contains A9 03 8D 06 20. This could disassemble as LDA #$03, STA $2006. '
      'A static scan has not established whether the CPU executes it. '
      'Return JSON exactly with booleans {"possible_ppu_register_write":boolean,"execution_proven":boolean}.',
     'expected': {'possible_ppu_register_write': True, 'execution_proven': False}},
    {'id': 'chr-ram', 'input':
      'An NES iNES header has CHR ROM size zero. This does not establish that the game lacks graphics; '
      'it may populate CHR RAM at runtime. Return JSON exactly with booleans '
      '{"chr_rom_present":boolean,"graphics_absent_proven":boolean}.',
     'expected': {'chr_rom_present': False, 'graphics_absent_proven': False}},
    {'id': 'parity', 'input':
      '24 raw PRG/CHR banks passed SHA-256 integrity checks; no gameplay screenshots were compared. '
      'Return JSON exactly with booleans {"raw_integrity_verified":boolean,"pixel_parity_verified":boolean}.',
     'expected': {'raw_integrity_verified': True, 'pixel_parity_verified': False}},
]


def call(base, model, content):
    body = json.dumps({'model': model, 'stream': False, 'temperature': 0, 'max_tokens': 128,
                       'messages': [{'role': 'user', 'content': content}]}).encode()
    req = request.Request(base.rstrip('/')+'/chat/completions', body,
                          headers={'Content-Type': 'application/json'})
    with request.urlopen(req, timeout=90) as resp:
        msg = json.load(resp)['choices'][0]['message']['content'].strip()
    if msg.startswith('```'):
        msg = msg.split('\n', 1)[-1].removesuffix('```').strip()
    return json.loads(msg)


def main():
    p = argparse.ArgumentParser(description='Local-model evidence-discipline benchmark; no source data sent')
    p.add_argument('--api', default='http://127.0.0.1:1337/v1')
    p.add_argument('--model', required=True, help='Model ID from Atomic Chat /v1/models')
    p.add_argument('--out', help='Optional local JSON report output')
    args = p.parse_args()
    u = parse.urlparse(args.api)
    if u.scheme != 'http' or u.hostname not in ('127.0.0.1', 'localhost', '::1'):
        p.error('Only a loopback API is permitted.')
    results = []
    for task in TASKS:
        start = time.perf_counter()
        try:
            answer = call(args.api, args.model, task['input'])
            valid = isinstance(answer, dict)
            passed = valid and all(type(answer.get(k)) is bool and answer[k] == v for k,v in task['expected'].items())
            results.append({'task': task['id'], 'json_valid': valid, 'passed': passed,
                            'response_seconds': round(time.perf_counter()-start, 3)})
        except Exception as e:
            results.append({'task': task['id'], 'json_valid': False, 'passed': False,
                            'error_type': type(e).__name__})
    report = {'schema': 'NESForgeLocalModelBenchmark/v0.1', 'model': args.model,
              'correct': sum(r['passed'] for r in results), 'total': len(results), 'results': results,
              'note': 'Three simple evidence-discipline tasks; not a general coding benchmark.'}
    print(json.dumps(report, indent=2))
    if args.out:
        from pathlib import Path
        Path(args.out).write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    return 0 if report['correct'] == report['total'] else 2

if __name__ == '__main__':
    raise SystemExit(main())
