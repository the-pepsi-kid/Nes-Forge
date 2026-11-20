#!/usr/bin/env python3
"""Library inventory: every resource an extraction pack holds, by kind, with what is known about it.

    python3 -I tools/audit/library_inventory.py --packs <folder of extraction ZIPs> --out <folder>

Packs are read as data only (no code from them runs). Each file is sorted into the kinds the editor's intake uses
(app/src/services/extraction-pack.js); files the intake does not recognise are counted separately, by folder and
extension, because the editor never shows them. Per kind it reports how many entries there are, whether each has a
preview image beside it, and whether its JSON carries ROM evidence: a file offset, a CPU address, a bank, a PPU
address. It also says whether entries of that kind load into a project or are browsable only while the pack is open.
Writes <out>/LIBRARY_INVENTORY.md and library_inventory.json: counts only, no game data.
"""
import argparse, collections, json, re, zipfile
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('--packs', required=True)
ap.add_argument('--out', required=True)
args = ap.parse_args()

PROJECT_KINDS = {'project', 'animationProject', 'nativeProject', 'audioProject'}
REPORTS = {'audit', 'audioReport'}
EVIDENCE = {
    'fileOffset': re.compile(r'(file_?offset|rom_?offset|prg_bank\d_(file|prg)_offset|^offset$|FileOffset$)', re.I),
    'cpu': re.compile(r'(^cpu$|cpuHex|cpuAddress|romAddress|listAddress|^address$|Cpu$)', re.I),
    'bank': re.compile(r'(bank16KiB|bank8KiB|bank8k|^bank$|bank4KiB|physicalBank|tableBank)', re.I),
    'ppu': re.compile(r'(ppu|chr_pt\d|nametable|vram)', re.I),
}


def classify(local, kinds_seen, mario, captured, native_project, captured_audio):
    """The intake's own sorting rules (extraction-pack.js), in the same order."""
    if re.match(r'^maps/.+\.json$', local, re.I): return 'map'
    if re.match(r'^rooms/.+\.json$', local, re.I): return 'room'
    if mario and re.match(r'^(areas|levels)/.+_objects\.json$', local, re.I): return 'object'
    if re.match(r'^(objects_report|placement_audit|collision_check_against_game|mm2_report|stage_art_report)\.json$', local, re.I): return 'audit'
    if re.match(r'^resources/.+\.json$', local, re.I): return 'resource'
    if re.match(r'^sprites/.+\.nesforge\.json$', local, re.I): return 'animationProject'
    if re.match(r'^sprites/.+\.json$', local, re.I): return 'pose'
    if re.match(r'^(actors|poses|animations|locations|ram)\.json$', local, re.I): return 'catalog'
    if captured and re.match(r'^screens/.+/state\.json$', local, re.I): return 'capture'
    if local == captured_audio: return 'audioProject'
    if captured and re.search(r'\.nesforge\.json$', local, re.I): return 'project'
    if re.match(r'^projects/.+\.nesforge\.json$', local, re.I): return 'project'
    if local == native_project: return 'nativeProject'
    if re.match(r'^audio/.+\.nesforge\.json$', local, re.I): return 'audioProject'
    if re.match(r'^audio/audio_report\.json$', local, re.I): return 'audioReport'
    return None


def evidence_of(data):
    found = set()
    def walk(v, depth=0):
        if depth > 8 or len(found) == len(EVIDENCE): return
        if isinstance(v, dict):
            for k, x in v.items():
                for name, rx in EVIDENCE.items():
                    if name not in found and rx.search(k) and isinstance(x, (int, str)) and str(x) != '': found.add(name)
                walk(x, depth + 1)
        elif isinstance(v, list):
            for x in v[:64]: walk(x, depth + 1)
    walk(data)
    return found


packs = []
for zp in sorted(Path(args.packs).glob('*.zip')):
    z = zipfile.ZipFile(zp)
    names = [n for n in z.namelist() if not n.endswith('/')]
    roots = collections.Counter(n.split('/')[0] for n in names if '/' in n)
    root = roots.most_common(1)[0][0] + '/' if roots else ''
    locals_ = {n: n[len(root):] if n.startswith(root) else n for n in names}
    report, report_name = None, None
    for n, l in locals_.items():
        if '/' not in l and l.endswith('.json') and re.search(r'report', l, re.I):
            try:
                d = json.loads(z.read(n))
            except Exception:
                continue
            if isinstance(d, dict) and isinstance(d.get('rom'), dict):
                report, report_name = d, l
                break
    mario = bool(report and str(report.get('format', '')).startswith('NESForgeSMB'))
    captured = any(l.startswith('screens/') for l in locals_.values())
    native_project = report.get('project') if report else None
    audio_reports = [l for l in locals_.values() if re.search(r'audio_report\.json$', l, re.I)]
    captured_audio = None
    if captured and audio_reports:
        captured_audio = next((l for l in locals_.values() if l.startswith(audio_reports[0].rsplit('/', 1)[0] + '/') and l.endswith('.nesforge.json')), None)
    kinds = collections.defaultdict(lambda: {'entries': 0, 'withPreview': 0, 'bytes': 0, **{e: 0 for e in EVIDENCE}})
    unrecognised = collections.Counter()
    pngs = {l for l in locals_.values() if l.lower().endswith('.png')}
    used_png = set()
    for n, l in locals_.items():
        if l.lower().endswith('.png'): continue
        kind = classify(l, kinds, mario, captured, native_project, captured_audio)
        if not kind:
            if l != report_name: unrecognised[(l.split('/')[0] if '/' in l else '(root)') + ' · ' + (l.rsplit('.', 1)[-1].lower() if '.' in l else '?')] += 1
            continue
        k = kinds[kind]; k['entries'] += 1; k['bytes'] += z.getinfo(n).file_size
        base = re.sub(r'(\.nesforge)?\.json$', '', l, flags=re.I)
        for cand in (base + '.png', re.sub(r'_objects$', '', base) + '.png', base.rsplit('/', 1)[0] + '/screen.png'):
            if cand in pngs: k['withPreview'] += 1; used_png.add(cand); break
        if l.lower().endswith('.json'):
            try:
                for e in evidence_of(json.loads(z.read(n))): k[e] += 1
            except Exception:
                pass
    # collision previews are their own entries in the intake
    coll = [p for p in pngs if p.endswith('_collision.png') and re.match(r'^(rooms|resources)/', p)]
    if coll:
        kinds['collision']['entries'] += len(coll); kinds['collision']['withPreview'] += len(coll); used_png.update(coll)
    loose_png = len(pngs - used_png)
    packs.append({'pack': zp.name, 'romSha256': (report or {}).get('rom', {}).get('sha256'), 'format': (report or {}).get('format'),
                  'kinds': {k: {**v, 'loads': k in PROJECT_KINDS, 'report': k in REPORTS} for k, v in sorted(kinds.items())},
                  'unrecognised': dict(unrecognised.most_common()), 'unlinkedImages': loose_png, 'files': len(names)})

out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
(out / 'library_inventory.json').write_text(json.dumps(packs, indent=1) + '\n')
md = ['# Library inventory — extraction packs', '',
      'Every file in each pack, sorted by the intake\'s own rules. **Loads** means entries of that kind can be opened as '
      'projects. The other kinds are browsable only while the pack is open (pack-only). Evidence columns count entries '
      'whose JSON names a file offset, a CPU address, a bank or a PPU address; a count does not mean every record inside '
      'the entry is located.', '',
      '| Pack | Kind | Entries | Loads | Preview | File offset | CPU address | Bank | PPU | Data |', '|---|---|---|---|---|---|---|---|---|---|']
for p in packs:
    for k, v in p['kinds'].items():
        md.append(f"| {p['pack']} | {k} | {v['entries']} | {'yes' if v['loads'] else ('report' if v['report'] else 'no')} | {v['withPreview']} | {v['fileOffset']} | {v['cpu']} | {v['bank']} | {v['ppu']} | {v['bytes'] // 1024} KiB |")
md += ['', '## Files the intake does not recognise', '', 'The editor never shows these. Images that do not belong to a listed entry are counted separately.', '',
       '| Pack | Folder · type | Files |', '|---|---|---|']
for p in packs:
    for k, v in p['unrecognised'].items(): md.append(f"| {p['pack']} | {k} | {v} |")
    if p['unlinkedImages']: md.append(f"| {p['pack']} | images not linked to an entry | {p['unlinkedImages']} |")
tot = collections.Counter(); po = collections.Counter(); unr = 0
for p in packs:
    for k, v in p['kinds'].items():
        tot[k] += v['entries']
        if not v['loads'] and not v['report']: po[k] += v['entries']
    unr += sum(p['unrecognised'].values())
md += ['', '## Totals', '', f"{sum(tot.values())} recognised entries; {sum(po.values())} of them pack-only; {unr} files not recognised by the intake.", '',
       '| Kind | Entries | Pack-only |', '|---|---|---|', *[f'| {k} | {v} | {po.get(k, 0)} |' for k, v in tot.most_common()]]
(out / 'LIBRARY_INVENTORY.md').write_text('\n'.join(md) + '\n')
print(f"{len(packs)} packs, {sum(tot.values())} recognised entries ({sum(po.values())} pack-only), {unr} unrecognised files")
